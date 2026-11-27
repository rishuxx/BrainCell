"""Lyftr AI Chat - Chat endpoint."""

import asyncio
import logging
from typing import Optional
from weakref import WeakValueDictionary

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import JSONResponse

from ..config import settings
from ..auth import current_user_id
from ..database import (
    SessionAccessDenied,
    check_session_access,
    get_session_messages,
    get_session_system_prompt,
    save_message_pair,
)
from ..schemas import ChatRequest, ChatResponse, ResponseMetadata
from ..services.llm import AllKeysExhaustedError, llm_service

logger = logging.getLogger(__name__)

router = APIRouter()

# Per-session locks for serializing concurrent requests
_session_locks: WeakValueDictionary[str, asyncio.Lock] = WeakValueDictionary()


def _get_session_lock(session_id: str) -> asyncio.Lock:
    """Get or create a lock for a session."""
    lock = _session_locks.get(session_id)
    if lock is None:
        lock = asyncio.Lock()
        _session_locks[session_id] = lock
    return lock


@router.post("/chat")
async def chat(
    request: ChatRequest,
    x_simulate_failure: Optional[str] = Header(None, alias="X-Simulate-Failure"),
    user_id: str | None = Depends(current_user_id),
):
    """Process a chat message with LLM failover and caching."""

    session_id = request.session_id
    message = request.message
    if request.preferred_key_id and not any(
        option["key_id"] == request.preferred_key_id for option in llm_service.key_options()
    ):
        raise HTTPException(422, "unknown key slot")

    # Serialize requests for the same session
    lock = _get_session_lock(session_id)
    async with lock:
        try:
            check_session_access(session_id, user_id)
        except SessionAccessDenied:
            raise HTTPException(404, "session not found") from None
        # Handle system prompt
        effective_system_prompt = settings.default_system_prompt

        if request.system_prompt is not None:
            effective_system_prompt = request.system_prompt
        else:
            # Check for previously stored system prompt
            stored_prompt = get_session_system_prompt(session_id, user_id)
            if stored_prompt is not None:
                effective_system_prompt = stored_prompt

        # Load session history
        history = get_session_messages(session_id, user_id)

        # Build messages array: system + history + new message
        messages = [{"role": "system", "content": effective_system_prompt}]
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": message})

        # Call LLM service
        try:
            result = await llm_service.chat(
                messages=messages,
                simulate_failure=x_simulate_failure,
                preferred_key_id=request.preferred_key_id,
            )
        except AllKeysExhaustedError:
            return JSONResponse(
                status_code=503,
                content={"detail": "all providers unavailable"},
            )
        except Exception as e:
            logger.error("LLM request failed with %s", type(e).__name__)
            detail = "all providers unavailable"
            if request.preferred_key_id and getattr(e, "status_code", None) in {401, 403}:
                detail = "The provider rejected the selected key. Check that key's access and billing with its provider."
            return JSONResponse(
                status_code=503,
                content={"detail": detail},
            )

        # Persist successful user/assistant pair atomically
        metadata = {
            "resolution_source": result["resolution_source"],
            "model": result["model"],
            "latency_ms": result["latency_ms"],
            "input_tokens": result["input_tokens"],
            "output_tokens": result["output_tokens"],
            "key_id": result["key_id"],
            "fallback_attempts": result["fallback_attempts"],
        }

        try:
            save_message_pair(
                session_id=session_id,
                user_content=message,
                assistant_content=result["reply"],
                metadata=metadata,
                user_id=user_id,
                system_prompt=request.system_prompt,
            )
        except SessionAccessDenied:
            raise HTTPException(404, "session not found") from None
        except Exception:
            logger.error("Failed to persist messages")
            raise HTTPException(500, "could not save conversation") from None

        return ChatResponse(
            session_id=session_id,
            reply=result["reply"],
            metadata=ResponseMetadata(**metadata),
        )

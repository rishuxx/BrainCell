"""Lyftr AI Chat - Chat endpoint."""

import asyncio
import logging
from typing import Dict, Optional

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from ..config import settings
from ..database import (
    get_session_messages,
    get_session_system_prompt,
    save_message_pair,
    set_session_system_prompt,
)
from ..schemas import ChatRequest, ChatResponse, ResponseMetadata
from ..services.llm import AllKeysExhaustedError, llm_service

logger = logging.getLogger(__name__)

router = APIRouter()

# Per-session locks for serializing concurrent requests
_session_locks: Dict[str, asyncio.Lock] = {}


def _get_session_lock(session_id: str) -> asyncio.Lock:
    """Get or create a lock for a session."""
    if session_id not in _session_locks:
        _session_locks[session_id] = asyncio.Lock()
    return _session_locks[session_id]


@router.post("/chat")
async def chat(
    request: ChatRequest,
    x_simulate_failure: Optional[str] = Header(None, alias="X-Simulate-Failure"),
):
    """Process a chat message with LLM failover and caching."""

    session_id = request.session_id
    message = request.message

    # Serialize requests for the same session
    lock = _get_session_lock(session_id)
    async with lock:
        # Handle system prompt
        effective_system_prompt = settings.default_system_prompt

        if request.system_prompt is not None:
            # User provided a system prompt - persist it
            set_session_system_prompt(session_id, request.system_prompt)
            effective_system_prompt = request.system_prompt
        else:
            # Check for previously stored system prompt
            stored_prompt = get_session_system_prompt(session_id)
            if stored_prompt is not None:
                effective_system_prompt = stored_prompt

        # Load session history
        history = get_session_messages(session_id)

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
            )
        except AllKeysExhaustedError:
            return JSONResponse(
                status_code=503,
                content={"detail": "all providers unavailable"},
            )
        except Exception as e:
            logger.error(f"Unexpected LLM error: {e}", exc_info=True)
            return JSONResponse(
                status_code=503,
                content={"detail": "all providers unavailable"},
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
            )
        except Exception as e:
            logger.error(f"Failed to persist messages: {e}", exc_info=True)
            # Still return the response even if persistence fails

        return ChatResponse(
            session_id=session_id,
            reply=result["reply"],
            metadata=ResponseMetadata(**metadata),
        )

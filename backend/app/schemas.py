"""Lyftr AI Chat - Pydantic schemas."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, field_validator


class ChatRequest(BaseModel):
    """Request body for POST /chat."""

    session_id: str
    message: str
    system_prompt: Optional[str] = None

    @field_validator("session_id")
    @classmethod
    def validate_session_id(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("session_id must be a string")
        stripped = v.strip()
        if not stripped:
            raise ValueError("session_id must not be empty or whitespace-only")
        if len(stripped) > 128:
            raise ValueError("session_id must be at most 128 characters")
        return stripped

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("message must be a string")
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("message must not be empty after trimming")
        if len(trimmed) > 4000:
            raise ValueError("message must be at most 4000 characters after trimming")
        return trimmed


class ResponseMetadata(BaseModel):
    """Metadata for a chat response."""

    resolution_source: str  # LIVE_INFERENCE or LLM_CACHE
    model: str
    latency_ms: int
    input_tokens: int
    output_tokens: int
    key_id: Optional[str] = None
    fallback_attempts: int = 0


class ChatResponse(BaseModel):
    """Response body for POST /chat."""

    session_id: str
    reply: str
    metadata: ResponseMetadata


class HealthResponse(BaseModel):
    """Response body for GET /health."""

    status: str
    keys_configured: int
    cache_enabled: bool


class MessageItem(BaseModel):
    """A single message in session history."""

    role: str
    content: str
    metadata: Optional[Dict[str, Any]] = None


class SessionMessagesResponse(BaseModel):
    """Response body for GET /sessions/{session_id}/messages."""

    session_id: str
    messages: List[MessageItem]


class ErrorResponse(BaseModel):
    """Standard error response."""

    detail: str

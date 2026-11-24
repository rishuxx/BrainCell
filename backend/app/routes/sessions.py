"""Lyftr AI Chat - Sessions endpoint."""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ..database import get_session_messages, session_exists
from ..schemas import SessionMessagesResponse, MessageItem

router = APIRouter()


@router.get("/sessions/{session_id}/messages")
async def get_messages(session_id: str):
    """Get session history oldest first, without system prompt."""
    if not session_exists(session_id):
        return JSONResponse(
            status_code=404,
            content={"detail": "session not found"},
        )

    messages = get_session_messages(session_id)
    items = [MessageItem(**msg) for msg in messages]

    return SessionMessagesResponse(
        session_id=session_id,
        messages=items,
    )

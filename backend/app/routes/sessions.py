"""Lyftr AI Chat - Sessions endpoint."""

from fastapi import APIRouter, Depends, HTTPException, Response

from ..auth import current_user_id
from ..database import delete_account_chat, get_session_messages, list_account_chats
from ..schemas import SessionMessagesResponse, MessageItem

router = APIRouter()


@router.get("/sessions")
async def get_sessions(response: Response, user_id: str | None = Depends(current_user_id)):
    if user_id is None:
        raise HTTPException(401, "sign in required")
    response.headers["Cache-Control"] = "no-store"
    return {"sessions": list_account_chats(user_id)}


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(session_id: str, user_id: str | None = Depends(current_user_id)):
    if user_id is None:
        raise HTTPException(401, "sign in required")
    if not delete_account_chat(session_id, user_id):
        raise HTTPException(404, "session not found")
    return Response(status_code=204)


@router.get("/sessions/{session_id}/messages")
async def get_messages(session_id: str, response: Response, user_id: str | None = Depends(current_user_id)):
    """Get session history oldest first, without system prompt."""
    messages = get_session_messages(session_id, user_id)
    if not messages:
        raise HTTPException(404, "session not found") from None

    response.headers["Cache-Control"] = "no-store"
    items = [MessageItem(**msg) for msg in messages]

    return SessionMessagesResponse(
        session_id=session_id,
        messages=items,
    )

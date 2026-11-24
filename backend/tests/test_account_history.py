from unittest.mock import AsyncMock, patch

import pytest
from fastapi import Header, HTTPException

from app.auth import current_user_id
from tests.conftest import make_mock_response


@pytest.mark.asyncio
async def test_account_history_is_visible_and_writable_only_by_owner(client):
    from app.main import app

    async def account_fixture(authorization: str | None = Header(None)):
        if authorization is None:
            return None
        if authorization not in {"Bearer account-a", "Bearer account-b"}:
            raise HTTPException(401, "invalid access token")
        return authorization

    owner = {"Authorization": "Bearer account-a"}
    other = {"Authorization": "Bearer account-b"}
    invalid = {"Authorization": "Bearer invalid"}
    chat = {"session_id": "owned-chat", "message": "Owner's first message"}
    history_path = "/sessions/owned-chat/messages"
    app.dependency_overrides[current_user_id] = account_fixture
    try:
        with patch("litellm.acompletion", new_callable=AsyncMock, return_value=make_mock_response()) as inference:
            assert (await client.post("/chat", json=chat, headers=owner)).status_code == 200
            for headers in ({}, other):
                assert (await client.get(history_path, headers=headers)).status_code == 404
                assert (await client.post("/chat", json=chat, headers=headers)).status_code == 404
            assert (await client.get(history_path, headers=invalid)).status_code == 401
            assert (await client.post("/chat", json=chat, headers=invalid)).status_code == 401
            assert inference.await_count == 1

        assert (await client.get(history_path, headers=owner)).status_code == 200
        assert (await client.get("/sessions")).status_code == 401
        assert (await client.get("/sessions", headers=other)).json() == {"sessions": []}
        sessions = (await client.get("/sessions", headers=owner)).json()["sessions"]
        assert [(item["session_id"], item["title"]) for item in sessions] == [
            ("owned-chat", "Owner's first message")
        ]
        delete_path = "/sessions/owned-chat"
        assert (await client.delete(delete_path)).status_code == 401
        assert (await client.delete(delete_path, headers=other)).status_code == 404
        assert (await client.get(history_path, headers=owner)).status_code == 200
        assert (await client.delete(delete_path, headers=owner)).status_code == 204
        assert (await client.get("/sessions", headers=owner)).json() == {"sessions": []}
        assert (await client.get(history_path, headers=owner)).status_code == 404
        assert (await client.post("/chat", json=chat, headers=owner)).status_code == 404
        assert (await client.delete(delete_path, headers=owner)).status_code == 404
    finally:
        app.dependency_overrides.pop(current_user_id, None)


@pytest.mark.asyncio
async def test_existing_chat_with_no_ownership_cannot_be_read_or_claimed(client):
    from app.database import get_connection

    db = get_connection()
    db.execute(
        "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)",
        ("legacy-chat", "user", "Unassigned history", "2026-01-01T00:00:00Z"),
    )
    db.commit()

    assert (await client.get("/sessions/legacy-chat/messages")).status_code == 404
    assert (await client.post("/chat", json={"session_id": "legacy-chat", "message": "Continue"})).status_code == 404

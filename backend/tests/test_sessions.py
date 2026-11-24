"""Tests for GET /sessions/{session_id}/messages endpoint."""

import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient
from tests.conftest import make_mock_response


@pytest.mark.asyncio
async def test_unknown_session(client: AsyncClient):
    """Unknown session returns 404."""
    response = await client.get("/sessions/nonexistent/messages")
    assert response.status_code == 404
    assert response.json()["detail"] == "session not found"


@pytest.mark.asyncio
async def test_session_history_order(client: AsyncClient):
    """Messages returned oldest first."""
    mock_resp1 = make_mock_response("First reply")
    mock_resp2 = make_mock_response("Second reply")

    call_count = 0
    async def mock_completion(**kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return mock_resp1
        return mock_resp2

    with patch("litellm.acompletion", side_effect=mock_completion):
        await client.post("/chat", json={
            "session_id": "hist-order",
            "message": "First message"
        })
        await client.post("/chat", json={
            "session_id": "hist-order",
            "message": "Second message"
        })

    response = await client.get("/sessions/hist-order/messages")
    assert response.status_code == 200
    messages = response.json()["messages"]
    assert len(messages) == 4
    assert messages[0]["role"] == "user"
    assert messages[0]["content"] == "First message"
    assert messages[1]["role"] == "assistant"
    assert messages[1]["content"] == "First reply"
    assert messages[2]["role"] == "user"
    assert messages[2]["content"] == "Second message"
    assert messages[3]["role"] == "assistant"
    assert messages[3]["content"] == "Second reply"


@pytest.mark.asyncio
async def test_session_metadata_preserved(client: AsyncClient):
    """Assistant messages have metadata, user messages don't."""
    mock_resp = make_mock_response("Reply", model="gemini-2.0-flash",
                                   input_tokens=15, output_tokens=8)

    with patch("litellm.acompletion", new_callable=AsyncMock, return_value=mock_resp):
        await client.post("/chat", json={
            "session_id": "hist-meta",
            "message": "Hello"
        })

    response = await client.get("/sessions/hist-meta/messages")
    messages = response.json()["messages"]

    # User message: no metadata
    assert "metadata" not in messages[0] or messages[0]["metadata"] is None

    # Assistant message: has metadata
    meta = messages[1]["metadata"]
    assert meta["resolution_source"] == "LIVE_INFERENCE"
    assert meta["model"] == "gemini-2.0-flash"
    assert meta["input_tokens"] == 15
    assert meta["output_tokens"] == 8


@pytest.mark.asyncio
async def test_session_isolation(client: AsyncClient):
    """Different sessions don't leak history."""
    mock_resp = make_mock_response("Reply")

    with patch("litellm.acompletion", new_callable=AsyncMock, return_value=mock_resp):
        await client.post("/chat", json={
            "session_id": "iso-a",
            "message": "Session A message"
        })
        await client.post("/chat", json={
            "session_id": "iso-b",
            "message": "Session B message"
        })

    r_a = await client.get("/sessions/iso-a/messages")
    r_b = await client.get("/sessions/iso-b/messages")

    msgs_a = r_a.json()["messages"]
    msgs_b = r_b.json()["messages"]

    assert len(msgs_a) == 2
    assert len(msgs_b) == 2
    assert msgs_a[0]["content"] == "Session A message"
    assert msgs_b[0]["content"] == "Session B message"


@pytest.mark.asyncio
async def test_no_system_prompt_in_history(client: AsyncClient):
    """System prompt should not appear in history."""
    mock_resp = make_mock_response("Reply")

    with patch("litellm.acompletion", new_callable=AsyncMock, return_value=mock_resp):
        await client.post("/chat", json={
            "session_id": "hist-nosys",
            "message": "Hello",
            "system_prompt": "You are a pirate."
        })

    response = await client.get("/sessions/hist-nosys/messages")
    messages = response.json()["messages"]

    # No system role message in history
    for msg in messages:
        assert msg["role"] != "system"


@pytest.mark.asyncio
async def test_multi_turn_context(client: AsyncClient):
    """Follow-up questions include earlier context."""
    calls = []

    async def mock_completion(**kwargs):
        calls.append(kwargs)
        turn = len(calls)
        if turn == 1:
            return make_mock_response("My name is Alice.")
        return make_mock_response("Your name is Alice, as you told me.")

    with patch("litellm.acompletion", side_effect=mock_completion):
        await client.post("/chat", json={
            "session_id": "ctx-test",
            "message": "My name is Alice"
        })
        await client.post("/chat", json={
            "session_id": "ctx-test",
            "message": "What is my name?"
        })

    # Second call should include full history
    second_messages = calls[1]["messages"]
    assert second_messages[0]["role"] == "system"
    assert second_messages[1]["role"] == "user"
    assert second_messages[1]["content"] == "My name is Alice"
    assert second_messages[2]["role"] == "assistant"
    assert second_messages[2]["content"] == "My name is Alice."
    assert second_messages[3]["role"] == "user"
    assert second_messages[3]["content"] == "What is my name?"

"""Tests for POST /chat endpoint."""

import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient
from tests.conftest import make_mock_response


@pytest.mark.asyncio
async def test_chat_basic(client: AsyncClient):
    """Basic chat returns 200 with correct structure."""
    mock_resp = make_mock_response("Paris is the capital of France.")

    with patch("litellm.acompletion", new_callable=AsyncMock, return_value=mock_resp):
        response = await client.post("/chat", json={
            "session_id": "test-session-1",
            "message": "What is the capital of France?"
        })

    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "test-session-1"
    assert data["reply"] == "Paris is the capital of France."
    assert data["metadata"]["resolution_source"] == "LIVE_INFERENCE"
    assert data["metadata"]["model"] == "gemini-2.0-flash"
    assert data["metadata"]["latency_ms"] >= 0
    assert data["metadata"]["input_tokens"] == 10
    assert data["metadata"]["output_tokens"] == 5
    assert data["metadata"]["key_id"] == "key_1"
    assert data["metadata"]["fallback_attempts"] == 0


@pytest.mark.asyncio
async def test_chat_empty_session_id(client: AsyncClient):
    """Empty session_id returns 422."""
    response = await client.post("/chat", json={
        "session_id": "",
        "message": "Hello"
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_whitespace_session_id(client: AsyncClient):
    """Whitespace-only session_id returns 422."""
    response = await client.post("/chat", json={
        "session_id": "   ",
        "message": "Hello"
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_session_id_too_long(client: AsyncClient):
    """session_id > 128 chars returns 422."""
    response = await client.post("/chat", json={
        "session_id": "a" * 129,
        "message": "Hello"
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_session_id_max_length(client: AsyncClient):
    """session_id = 128 chars is accepted."""
    mock_resp = make_mock_response("OK")
    with patch("litellm.acompletion", new_callable=AsyncMock, return_value=mock_resp):
        response = await client.post("/chat", json={
            "session_id": "a" * 128,
            "message": "Hello"
        })
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_chat_empty_message(client: AsyncClient):
    """Empty message returns 422."""
    response = await client.post("/chat", json={
        "session_id": "s1",
        "message": ""
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_whitespace_message(client: AsyncClient):
    """Whitespace-only message returns 422."""
    response = await client.post("/chat", json={
        "session_id": "s1",
        "message": "   "
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_message_too_long(client: AsyncClient):
    """Message > 4000 chars after trimming returns 422."""
    response = await client.post("/chat", json={
        "session_id": "s1",
        "message": "a" * 4001
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_message_max_length(client: AsyncClient):
    """Message = 4000 chars is accepted."""
    mock_resp = make_mock_response("OK")
    with patch("litellm.acompletion", new_callable=AsyncMock, return_value=mock_resp):
        response = await client.post("/chat", json={
            "session_id": "s1",
            "message": "a" * 4000
        })
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_chat_message_min_length(client: AsyncClient):
    """Single char message is accepted."""
    mock_resp = make_mock_response("OK")
    with patch("litellm.acompletion", new_callable=AsyncMock, return_value=mock_resp):
        response = await client.post("/chat", json={
            "session_id": "s1",
            "message": "a"
        })
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_chat_missing_fields(client: AsyncClient):
    """Missing required fields returns 422."""
    response = await client.post("/chat", json={"session_id": "s1"})
    assert response.status_code == 422

    response = await client.post("/chat", json={"message": "hi"})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_malformed_json(client: AsyncClient):
    """Malformed JSON returns 422."""
    response = await client.post(
        "/chat",
        content="not json",
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_chat_no_history_on_error(client: AsyncClient):
    """Failed requests should not create history."""
    # First, send an invalid request
    response = await client.post("/chat", json={
        "session_id": "fail-session",
        "message": ""
    })
    assert response.status_code == 422

    # Check that no history was created
    response = await client.get("/sessions/fail-session/messages")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_chat_with_system_prompt(client: AsyncClient):
    """System prompt is included in LLM call."""
    mock_resp = make_mock_response("I am a pirate!")
    calls = []

    async def mock_completion(**kwargs):
        calls.append(kwargs)
        return mock_resp

    with patch("litellm.acompletion", side_effect=mock_completion):
        response = await client.post("/chat", json={
            "session_id": "sp-test",
            "message": "Hello",
            "system_prompt": "You are a pirate."
        })

    assert response.status_code == 200
    # Verify system prompt was passed
    assert calls[0]["messages"][0]["role"] == "system"
    assert calls[0]["messages"][0]["content"] == "You are a pirate."


@pytest.mark.asyncio
async def test_chat_system_prompt_persists(client: AsyncClient):
    """System prompt persists across turns."""
    mock_resp = make_mock_response("Response")
    calls = []

    async def mock_completion(**kwargs):
        calls.append(kwargs)
        return mock_resp

    with patch("litellm.acompletion", side_effect=mock_completion):
        # First turn with system prompt
        await client.post("/chat", json={
            "session_id": "sp-persist",
            "message": "Hello",
            "system_prompt": "You are a pirate."
        })
        # Second turn without system prompt - should retain
        await client.post("/chat", json={
            "session_id": "sp-persist",
            "message": "Tell me more"
        })

    assert calls[1]["messages"][0]["content"] == "You are a pirate."

"""Tests for LiteLLM caching behavior."""

import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient
from tests.conftest import make_mock_response


@pytest.mark.asyncio
async def test_cache_hit_detection(client: AsyncClient):
    """Identical messages in different sessions should cache-hit."""
    live_resp = make_mock_response("Paris", cache_hit=False)
    cached_resp = make_mock_response("Paris", cache_hit=True)

    call_count = 0

    async def mock_completion(**kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return live_resp
        return cached_resp

    with patch("litellm.acompletion", side_effect=mock_completion):
        # First call - live inference
        r1 = await client.post("/chat", json={
            "session_id": "cache-s1",
            "message": "What is the capital of France?"
        })
        assert r1.status_code == 200
        d1 = r1.json()
        assert d1["metadata"]["resolution_source"] == "LIVE_INFERENCE"
        assert d1["metadata"]["key_id"] == "key_1"

        # Second call - same message, different session
        r2 = await client.post("/chat", json={
            "session_id": "cache-s2",
            "message": "What is the capital of France?"
        })
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["metadata"]["resolution_source"] == "LLM_CACHE"
        assert d2["metadata"]["key_id"] is None
        assert d2["metadata"]["fallback_attempts"] == 0


@pytest.mark.asyncio
async def test_cache_different_messages(client: AsyncClient):
    """Different messages should not share cache."""
    resp1 = make_mock_response("Paris")
    resp2 = make_mock_response("Berlin")

    call_count = 0
    async def mock_completion(**kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return resp1
        return resp2

    with patch("litellm.acompletion", side_effect=mock_completion):
        r1 = await client.post("/chat", json={
            "session_id": "cache-diff-1",
            "message": "Capital of France?"
        })
        r2 = await client.post("/chat", json={
            "session_id": "cache-diff-2",
            "message": "Capital of Germany?"
        })

    assert r1.json()["reply"] == "Paris"
    assert r2.json()["reply"] == "Berlin"
    assert call_count == 2


@pytest.mark.asyncio
async def test_cache_hit_saved_to_history(client: AsyncClient):
    """Cache hits should be saved to session history."""
    cached_resp = make_mock_response("Paris", cache_hit=True)

    with patch("litellm.acompletion", new_callable=AsyncMock, return_value=cached_resp):
        await client.post("/chat", json={
            "session_id": "cache-hist",
            "message": "What is the capital of France?"
        })

    # Verify history was saved
    response = await client.get("/sessions/cache-hist/messages")
    assert response.status_code == 200
    messages = response.json()["messages"]
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"
    assert messages[1]["metadata"]["resolution_source"] == "LLM_CACHE"

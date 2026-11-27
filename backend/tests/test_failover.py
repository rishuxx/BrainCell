"""Tests for key failover and simulation."""

from unittest.mock import patch, AsyncMock

import litellm
import pytest
from httpx import AsyncClient
from tests.conftest import make_mock_response


@pytest.mark.asyncio
async def test_provider_rate_limit_falls_back_without_simulation(client):
    limit = litellm.RateLimitError("quota exhausted", "gemini", "fixture-model")
    with patch("litellm.acompletion", side_effect=[limit, make_mock_response()]) as complete:
        response = await client.post("/chat", json={
            "session_id": "provider-quota", "message": "Try the backup",
        })
    assert response.status_code == 200
    assert response.json()["metadata"]["key_id"] == "key_2"
    assert response.json()["metadata"]["fallback_attempts"] == 1
    assert [call.kwargs["api_key"] for call in complete.await_args_list] == ["test_key_1", "test_key_2"]


@pytest.mark.asyncio
async def test_bad_request_does_not_fall_back_when_text_mentions_429(client):
    error = litellm.BadRequestError("Invalid field in message 429", "fixture-model", "gemini")
    with patch("litellm.acompletion", side_effect=error) as complete:
        response = await client.post("/chat", json={
            "session_id": "provider-bad-request", "message": "Malformed at the provider",
        })
    assert response.status_code == 503
    complete.assert_awaited_once()


@pytest.mark.asyncio
async def test_missing_provider_usage_is_not_persisted_or_cached(client):
    response = make_mock_response(input_tokens=None)
    with patch("litellm.acompletion", return_value=response) as complete:
        failed = await client.post("/chat", json={
            "session_id": "missing-usage", "message": "This needs genuine usage",
        })
        assert failed.status_code == 503
        assert complete.await_count == 2
    assert (await client.get("/sessions/missing-usage/messages")).status_code == 404

    with patch("litellm.acompletion", return_value=make_mock_response()) as complete:
        retried = await client.post("/chat", json={
            "session_id": "missing-usage", "message": "This needs genuine usage",
        })
        assert retried.status_code == 200
        assert retried.json()["metadata"]["resolution_source"] == "LIVE_INFERENCE"
        complete.assert_awaited_once()


@pytest.mark.asyncio
async def test_preferred_key_uses_configured_model_and_selected_slot(client, monkeypatch):
    from app.services.llm import llm_service

    monkeypatch.setattr(llm_service, "_keys", ["fixture-primary", "fixture-secondary"])
    monkeypatch.setattr(llm_service, "_model", "openrouter/google/gemini-2.5-flash")
    options = (await client.get("/health")).json()["key_options"]
    assert options[1] == {"key_id": "key_2", "provider": "OpenRouter", "model": "google/gemini-2.5-flash"}
    with patch("litellm.acompletion", new_callable=AsyncMock, return_value=make_mock_response(model=options[1]["model"])) as complete:
        response = await client.post("/chat", json={
            "session_id": "manual-key", "message": "Hello", "preferred_key_id": "key_2",
        })
        assert response.status_code == 200
        assert response.json()["metadata"]["key_id"] == "key_2"
        assert response.json()["metadata"]["model"] == options[1]["model"]
        assert complete.await_count == 1
        assert complete.call_args.kwargs["api_key"] == "fixture-secondary"
        assert complete.call_args.kwargs["model"] == "openrouter/google/gemini-2.5-flash"
        assert complete.call_args.kwargs["cache"] == {"no-cache": True, "no-store": True}
        unknown = await client.post("/chat", json={
            "session_id": "unknown-key", "message": "Hello", "preferred_key_id": "key_99",
        })
        assert unknown.status_code == 422
        assert complete.await_count == 1

        denied = PermissionError("provider fixture")
        denied.status_code = 403
        complete.side_effect = denied
        rejected = await client.post("/chat", json={
            "session_id": "rejected-key", "message": "Hello", "preferred_key_id": "key_2",
        })
        assert rejected.status_code == 503
        assert "Check that key's access and billing" in rejected.json()["detail"]
        assert complete.await_count == 2


@pytest.mark.asyncio
async def test_primary_failure_fallback(client: AsyncClient):
    """When primary key fails, backup key succeeds."""
    mock_resp = make_mock_response("Fallback response")

    with patch("litellm.acompletion", new_callable=AsyncMock, return_value=mock_resp):
        response = await client.post(
            "/chat",
            json={"session_id": "fo-1", "message": "Hello"},
            headers={"X-Simulate-Failure": "key_1=429"}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["reply"] == "Fallback response"
    assert data["metadata"]["key_id"] == "key_2"
    assert data["metadata"]["fallback_attempts"] == 1


@pytest.mark.asyncio
async def test_primary_500_fallback(client: AsyncClient):
    """Primary 500 error triggers fallback."""
    mock_resp = make_mock_response("OK from backup")

    with patch("litellm.acompletion", new_callable=AsyncMock, return_value=mock_resp):
        response = await client.post(
            "/chat",
            json={"session_id": "fo-500", "message": "Test 500"},
            headers={"X-Simulate-Failure": "key_1=500"}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["metadata"]["key_id"] == "key_2"
    assert data["metadata"]["fallback_attempts"] == 1


@pytest.mark.asyncio
async def test_primary_502_fallback(client: AsyncClient):
    """Primary 502 error triggers fallback."""
    mock_resp = make_mock_response("OK from backup")

    with patch("litellm.acompletion", new_callable=AsyncMock, return_value=mock_resp):
        response = await client.post(
            "/chat",
            json={"session_id": "fo-502", "message": "Test 502"},
            headers={"X-Simulate-Failure": "key_1=502"}
        )

    assert response.status_code == 200
    assert response.json()["metadata"]["fallback_attempts"] == 1


@pytest.mark.asyncio
async def test_primary_503_fallback(client: AsyncClient):
    """Primary 503 error triggers fallback."""
    mock_resp = make_mock_response("OK from backup")

    with patch("litellm.acompletion", new_callable=AsyncMock, return_value=mock_resp):
        response = await client.post(
            "/chat",
            json={"session_id": "fo-503", "message": "Test 503"},
            headers={"X-Simulate-Failure": "key_1=503"}
        )

    assert response.status_code == 200
    assert response.json()["metadata"]["fallback_attempts"] == 1


@pytest.mark.asyncio
async def test_all_keys_fail(client: AsyncClient):
    """All keys failing returns 503."""
    response = await client.post(
        "/chat",
        json={"session_id": "fo-all", "message": "Test all fail"},
        headers={"X-Simulate-Failure": "key_1=429,key_2=500"}
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "all providers unavailable"


@pytest.mark.asyncio
async def test_wildcard_failure(client: AsyncClient):
    """Wildcard failure applies to all keys."""
    response = await client.post(
        "/chat",
        json={"session_id": "fo-wild", "message": "Test wildcard"},
        headers={"X-Simulate-Failure": "*=429"}
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "all providers unavailable"


@pytest.mark.asyncio
async def test_no_history_on_all_fail(client: AsyncClient):
    """Failed requests don't create history."""
    await client.post(
        "/chat",
        json={"session_id": "fo-nohist", "message": "Should not persist"},
        headers={"X-Simulate-Failure": "*=503"}
    )

    response = await client.get("/sessions/fo-nohist/messages")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_simulation_no_lasting_effect(client: AsyncClient):
    """Simulation failure does not affect subsequent normal requests."""
    mock_resp = make_mock_response("Normal response")

    with patch("litellm.acompletion", new_callable=AsyncMock, return_value=mock_resp):
        # First: simulated failure
        r1 = await client.post(
            "/chat",
            json={"session_id": "fo-lasting-1", "message": "Sim test"},
            headers={"X-Simulate-Failure": "*=429"}
        )
        assert r1.status_code == 503

        # Second: normal request (no simulation)
        r2 = await client.post(
            "/chat",
            json={"session_id": "fo-lasting-2", "message": "Normal test"}
        )
        assert r2.status_code == 200
        assert r2.json()["metadata"]["key_id"] == "key_1"
        assert r2.json()["metadata"]["fallback_attempts"] == 0

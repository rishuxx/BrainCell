"""Tests for key failover and simulation."""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import AsyncClient
from tests.conftest import make_mock_response


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

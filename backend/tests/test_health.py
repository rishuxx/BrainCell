"""Tests for GET /health endpoint."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_ok(client: AsyncClient):
    """Health returns 200 with correct key count and cache status."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["keys_configured"] == 2
    assert data["cache_enabled"] is True


@pytest.mark.asyncio
async def test_health_json_content_type(client: AsyncClient):
    """Health response is JSON."""
    response = await client.get("/health")
    assert "application/json" in response.headers["content-type"]

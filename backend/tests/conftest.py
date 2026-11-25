"""Shared test fixtures and utilities."""

import os
import sys
import tempfile
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient, ASGITransport

# Set environment before importing app
os.environ["LLM_API_KEYS"] = "test_key_1,test_key_2"
os.environ["LLM_MODEL"] = "gemini/gemini-2.0-flash"
os.environ["ENABLE_FAILURE_SIMULATION"] = "true"
os.environ["ALLOWED_ORIGINS"] = "http://localhost:3000"
os.environ["DEFAULT_SYSTEM_PROMPT"] = "You are a helpful AI assistant."


def make_mock_response(content="Test response", model="gemini-2.0-flash",
                       input_tokens=10, output_tokens=5):
    """Create a mock LiteLLM completion response."""
    response = MagicMock()
    response.choices = [MagicMock()]
    response.choices[0].message = MagicMock()
    response.choices[0].message.content = content

    response.usage = MagicMock()
    response.usage.prompt_tokens = input_tokens
    response.usage.completion_tokens = output_tokens

    response.model = model

    return response


@pytest.fixture(autouse=True)
def isolated_db(tmp_path):
    """Use an isolated SQLite database for each test."""
    db_path = str(tmp_path / "test.db")
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"

    # Reset the config and database modules
    from app.config import Settings
    import app.config
    app.config.settings = Settings()

    import app.database
    app.database._connection = None
    app.database.init_db()

    yield db_path

    app.database.close_db()


@pytest.fixture
def mock_llm_response():
    """Provide a function to create mock LLM responses."""
    return make_mock_response


@pytest.fixture
async def client():
    """Async HTTP test client."""
    from app.main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
def isolated_cache(isolated_db, monkeypatch):
    from litellm import Cache
    from app.services.llm import llm_service

    monkeypatch.setattr(llm_service, "_cache", Cache(type="local"))

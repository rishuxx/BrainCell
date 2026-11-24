"""Lyftr AI Chat - Configuration module."""

import os
from typing import List


class Settings:
    """Application settings loaded from environment variables."""

    def __init__(self):
        # LLM API Keys - comma-separated, minimum 2
        raw_keys = os.environ.get("LLM_API_KEYS", "")
        self.api_keys: List[str] = [k.strip() for k in raw_keys.split(",") if k.strip()]

        # LLM Model
        self.llm_model: str = os.environ.get("LLM_MODEL", "gemini/gemini-2.0-flash")

        # Database URL
        self.database_url: str = os.environ.get("DATABASE_URL", "sqlite:///./app.db")

        # CORS
        raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
        self.allowed_origins: List[str] = [o.strip() for o in raw_origins.split(",") if o.strip()]

        # Failure simulation
        self.enable_failure_simulation: bool = (
            os.environ.get("ENABLE_FAILURE_SIMULATION", "false").lower() == "true"
        )

        # Timeout
        self.llm_timeout: int = int(os.environ.get("LLM_TIMEOUT", "30"))

        # Default system prompt
        self.default_system_prompt: str = os.environ.get(
            "DEFAULT_SYSTEM_PROMPT", "You are a helpful AI assistant."
        )

    @property
    def db_path(self) -> str:
        """Extract the file path from the SQLite URL."""
        url = self.database_url
        if url.startswith("sqlite:////"):
            return url[len("sqlite:///"):]  # Absolute path
        elif url.startswith("sqlite:///"):
            return url[len("sqlite:///"):]  # Relative path
        return "./app.db"

    @property
    def key_count(self) -> int:
        return len(self.api_keys)

    def validate(self) -> List[str]:
        """Return list of validation errors."""
        errors = []
        if len(self.api_keys) < 2:
            errors.append(
                f"LLM_API_KEYS must contain at least 2 keys, got {len(self.api_keys)}"
            )
        if not self.llm_model:
            errors.append("LLM_MODEL must be set")
        return errors


settings = Settings()

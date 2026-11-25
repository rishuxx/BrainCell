"""Lyftr AI Chat - LLM service with LiteLLM integration, caching, and failover."""

import logging
import time
from typing import Any, Dict, List, Optional

import litellm
from litellm import Cache

from ..config import settings

logger = logging.getLogger(__name__)
MAX_TOKENS = 1000

# Suppress verbose LiteLLM logs
litellm.suppress_debug_info = True
logging.getLogger("LiteLLM").setLevel(logging.WARNING)


class LLMService:
    """LLM service with key failover and caching via LiteLLM."""

    def __init__(self):
        self._model = settings.llm_model
        self._timeout = settings.llm_timeout
        self._keys: List[str] = settings.api_keys
        self._cache: Cache | None = None

        # Initialize LiteLLM in-memory cache
        try:
            self._cache = Cache(type="local")
            logger.info("LiteLLM in-memory cache initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize LiteLLM cache: {e}")

    @property
    def cache_enabled(self) -> bool:
        return self._cache is not None

    @property
    def key_count(self) -> int:
        return len(self._keys)

    def _key_id(self, index: int) -> str:
        """Return safe key identifier like key_1, key_2, etc."""
        return f"key_{index + 1}"

    def key_options(self) -> list[dict[str, str]]:
        provider, _, model_name = self._model.partition("/")
        provider_label = {"openrouter": "OpenRouter", "gemini": "Google Gemini"}.get(provider, provider)
        return [
            {
                "key_id": self._key_id(index),
                "provider": provider_label,
                "model": model_name or self._model,
            }
            for index in range(len(self._keys))
        ]

    def _parse_simulation_header(self, header_value: Optional[str]) -> Dict[str, int]:
        """Parse X-Simulate-Failure header into {key_id: status_code} map.

        Format: comma-separated key_id=status pairs.
        Wildcard * applies to all keys.
        Supported statuses: 429, 500, 502, 503.
        """
        if not header_value or not settings.enable_failure_simulation:
            return {}

        simulations = {}
        allowed_statuses = {429, 500, 502, 503}
        parts = [p.strip() for p in header_value.split(",")]

        for part in parts:
            if "=" not in part:
                continue
            key_part, status_part = part.split("=", 1)
            key_part = key_part.strip()
            try:
                status = int(status_part.strip())
            except ValueError:
                continue
            if status not in allowed_statuses:
                continue
            simulations[key_part] = status

        # Expand wildcard
        if "*" in simulations:
            wildcard_status = simulations.pop("*")
            for i in range(len(self._keys)):
                kid = self._key_id(i)
                if kid not in simulations:
                    simulations[kid] = wildcard_status

        return simulations

    async def chat(
        self,
        messages: List[Dict[str, str]],
        simulate_failure: Optional[str] = None,
        preferred_key_id: str | None = None,
    ) -> Dict[str, Any]:
        """Send chat completion with failover and caching.

        Returns dict with: reply, resolution_source, model, latency_ms,
        input_tokens, output_tokens, key_id, fallback_attempts
        """
        simulations = self._parse_simulation_header(simulate_failure)
        is_simulation = bool(simulations)

        start_time = time.monotonic()
        fallback_attempts = 0
        last_error = None
        cache = self._cache if not (is_simulation or preferred_key_id) else None
        cache_input = {"model": self._model, "messages": messages, "max_tokens": MAX_TOKENS}
        if cache is not None:
            cached = cache.get_cache(**cache_input)
            if cached is not None:
                return {
                    **cached,
                    "resolution_source": "LLM_CACHE",
                    "latency_ms": int((time.monotonic() - start_time) * 1000),
                    "key_id": None,
                    "fallback_attempts": 0,
                }

        # Try each key in order
        for i, api_key in enumerate(self._keys):
            key_id = self._key_id(i)
            if preferred_key_id and key_id != preferred_key_id:
                continue

            # Check simulation
            if key_id in simulations:
                sim_status = simulations[key_id]
                fallback_attempts += 1
                logger.info(f"Simulated failure for {key_id}: {sim_status}")
                last_error = Exception(f"Simulated {sim_status} for {key_id}")
                continue

            try:
                response = await litellm.acompletion(
                    **cache_input,
                    api_key=api_key,
                    timeout=self._timeout,
                    num_retries=0,  # We handle retries ourselves at key level
                    cache={"no-cache": True, "no-store": True},
                )

                # Extract content
                reply = ""
                if response.choices and len(response.choices) > 0:
                    choice = response.choices[0]
                    if choice.message and choice.message.content:
                        reply = choice.message.content

                if not isinstance(reply, str) or not reply.strip():
                    raise Exception("Empty reply from provider")

                # Extract token usage
                input_tokens = 0
                output_tokens = 0
                if response.usage:
                    input_tokens = response.usage.prompt_tokens or 0
                    output_tokens = response.usage.completion_tokens or 0

                # Extract model
                actual_model = response.model or self._model

                completion = {
                    "reply": reply,
                    "model": actual_model,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                }
                if cache is not None:
                    cache.add_cache(completion, **cache_input)
                return {
                    **completion,
                    "resolution_source": "LIVE_INFERENCE",
                    "latency_ms": int((time.monotonic() - start_time) * 1000),
                    "key_id": key_id,
                    "fallback_attempts": fallback_attempts,
                }

            except Exception as e:
                error_str = str(e)
                # Check if it's a retryable provider error (429, 5xx)
                is_retryable = any(
                    code in error_str
                    for code in ["429", "500", "502", "503", "RateLimitError", "ServiceUnavailableError", "InternalServerError"]
                )

                if is_retryable or "Simulated" in error_str:
                    if "Simulated" not in error_str:
                        fallback_attempts += 1
                    last_error = e
                    logger.warning("Key %s failed with %s", key_id, type(e).__name__)
                    continue
                else:
                    # Non-retryable error (e.g., bad request) - don't try other keys
                    logger.warning("Key %s failed with %s", key_id, type(e).__name__)
                    raise

        # All keys exhausted
        raise AllKeysExhaustedError(
            f"all providers unavailable",
            last_error=last_error,
        )


class AllKeysExhaustedError(Exception):
    """Raised when all configured LLM keys have failed."""

    def __init__(self, message: str, last_error: Optional[Exception] = None):
        super().__init__(message)
        self.last_error = last_error


# Singleton instance
llm_service = LLMService()

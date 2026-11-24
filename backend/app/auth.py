"""Resolve an account from a Supabase-verified access token."""

import os
from pathlib import Path
from uuid import UUID

import httpx
from dotenv import dotenv_values
from fastapi import Header, HTTPException

local_config = dotenv_values(Path(__file__).resolve().parents[2] / ".env")


async def current_user_id(authorization: str | None = Header(default=None)) -> str | None:
    if authorization is None:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token or len(token) > 8192:
        raise HTTPException(401, "invalid access token")

    url = os.environ.get("SUPABASE_URL", local_config.get("SUPABASE_URL"))
    key = os.environ.get("SUPABASE_PUBLISHABLE_KEY", local_config.get("SUPABASE_PUBLISHABLE_KEY"))
    if not url or not key:
        raise HTTPException(503, "account verification unavailable")

    try:
        async with httpx.AsyncClient(timeout=5, trust_env=False) as client:
            response = await client.get(
                f"{url.rstrip('/')}/auth/v1/user",
                headers={"apikey": key, "Authorization": f"Bearer {token}"},
            )
        if response.status_code in {400, 401, 403, 404}:
            raise HTTPException(401, "invalid access token")
        response.raise_for_status()
        return str(UUID(response.json()["id"]))
    except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError):
        raise HTTPException(503, "account verification unavailable") from None

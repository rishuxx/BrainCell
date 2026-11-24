"""Lyftr AI Chat - FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .database import close_db, init_db
from .routes.chat import router as chat_router
from .routes.health import router as health_router
from .routes.sessions import router as sessions_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    # Startup
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized")

    errors = settings.validate()
    if errors:
        for e in errors:
            logger.warning(f"Configuration warning: {e}")

    logger.info(
        f"Keys configured: {settings.key_count}, "
        f"Model: {settings.llm_model}, "
        f"Simulation: {settings.enable_failure_simulation}"
    )

    yield

    # Shutdown
    close_db()
    logger.info("Database connection closed")


app = FastAPI(
    title="BrainCell AI",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None,  # Disable docs in production (3-endpoint constraint)
    redoc_url=None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Simulate-Failure"],
)

# Register routes (no /api prefix)
app.include_router(health_router)
app.include_router(chat_router)
app.include_router(sessions_router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all handler to sanitize unexpected errors."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "internal server error"},
    )

"""Lyftr AI Chat - SQLite database module."""

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .config import settings

_connection: Optional[sqlite3.Connection] = None


def get_db_path() -> str:
    """Get the resolved database file path."""
    return settings.db_path


def init_db():
    """Initialize the database: create directory, schema, and indexes."""
    global _connection
    db_path = get_db_path()

    # Create parent directory if needed
    parent_dir = os.path.dirname(db_path)
    if parent_dir:
        os.makedirs(parent_dir, exist_ok=True)

    _connection = sqlite3.connect(db_path, check_same_thread=False)
    _connection.row_factory = sqlite3.Row

    # Enable WAL mode and busy timeout
    _connection.execute("PRAGMA journal_mode=WAL")
    _connection.execute("PRAGMA busy_timeout=5000")

    # Create tables
    _connection.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            metadata TEXT,
            created_at TEXT NOT NULL
        )
    """)
    _connection.execute("""
        CREATE INDEX IF NOT EXISTS idx_messages_session_id
        ON messages(session_id, id)
    """)

    # Sessions table for system prompt persistence
    _connection.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            system_prompt TEXT,
            created_at TEXT NOT NULL
        )
    """)

    _connection.commit()


def get_connection() -> sqlite3.Connection:
    """Get the database connection."""
    global _connection
    if _connection is None:
        init_db()
    return _connection


def close_db():
    """Close the database connection."""
    global _connection
    if _connection:
        _connection.close()
        _connection = None


def is_db_reachable() -> bool:
    """Check if the database is reachable."""
    try:
        conn = get_connection()
        conn.execute("SELECT 1")
        return True
    except Exception:
        return False


def get_session_messages(session_id: str) -> List[Dict[str, Any]]:
    """Get all messages for a session, ordered by id ascending."""
    conn = get_connection()
    cursor = conn.execute(
        "SELECT role, content, metadata FROM messages WHERE session_id = ? ORDER BY id ASC",
        (session_id,),
    )
    rows = cursor.fetchall()
    messages = []
    for row in rows:
        msg: Dict[str, Any] = {"role": row["role"], "content": row["content"]}
        if row["metadata"]:
            msg["metadata"] = json.loads(row["metadata"])
        messages.append(msg)
    return messages


def session_exists(session_id: str) -> bool:
    """Check if a session has any messages."""
    conn = get_connection()
    cursor = conn.execute(
        "SELECT 1 FROM messages WHERE session_id = ? LIMIT 1",
        (session_id,),
    )
    return cursor.fetchone() is not None


def save_message_pair(
    session_id: str,
    user_content: str,
    assistant_content: str,
    metadata: Dict[str, Any],
):
    """Atomically save a user/assistant message pair."""
    conn = get_connection()
    now = datetime.now(timezone.utc).isoformat()
    metadata_json = json.dumps(metadata)

    conn.execute("BEGIN IMMEDIATE")
    try:
        conn.execute(
            "INSERT INTO messages (session_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?)",
            (session_id, "user", user_content, None, now),
        )
        conn.execute(
            "INSERT INTO messages (session_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?)",
            (session_id, "assistant", assistant_content, metadata_json, now),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def get_session_system_prompt(session_id: str) -> Optional[str]:
    """Get the stored system prompt for a session."""
    conn = get_connection()
    cursor = conn.execute(
        "SELECT system_prompt FROM sessions WHERE session_id = ?",
        (session_id,),
    )
    row = cursor.fetchone()
    if row:
        return row["system_prompt"]
    return None


def set_session_system_prompt(session_id: str, system_prompt: str):
    """Set or update the system prompt for a session."""
    conn = get_connection()
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        """INSERT INTO sessions (session_id, system_prompt, created_at)
           VALUES (?, ?, ?)
           ON CONFLICT(session_id) DO UPDATE SET system_prompt = ?""",
        (session_id, system_prompt, now, system_prompt),
    )
    conn.commit()

"""Lyftr AI Chat - SQLite database module."""

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .config import settings

_connection: Optional[sqlite3.Connection] = None


class SessionAccessDenied(Exception):
    """The requested session belongs to another identity or has unknown ownership."""


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

    _connection.execute("""
        CREATE TABLE IF NOT EXISTS chat_owners (
            session_id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    _connection.execute("""
        CREATE INDEX IF NOT EXISTS idx_chat_owners_user_activity
        ON chat_owners(user_id, updated_at DESC, session_id)
    """)
    _connection.execute("""
        CREATE TABLE IF NOT EXISTS deleted_chats (session_id TEXT PRIMARY KEY)
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


def get_session_messages(session_id: str, user_id: str | None) -> List[Dict[str, Any]]:
    """Get all messages for a session, ordered by id ascending."""
    conn = get_connection()
    cursor = conn.execute(
        """SELECT m.role, m.content, m.metadata FROM messages m
           JOIN chat_owners o ON o.session_id = m.session_id
           WHERE m.session_id = ? AND o.user_id IS ? ORDER BY m.id ASC""",
        (session_id, user_id),
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


def check_session_access(session_id: str, user_id: str | None) -> None:
    if get_connection().execute(
        "SELECT 1 FROM deleted_chats WHERE session_id = ?", (session_id,)
    ).fetchone():
        raise SessionAccessDenied()

    row = get_connection().execute(
        "SELECT user_id FROM chat_owners WHERE session_id = ?", (session_id,)
    ).fetchone()
    if row is None:
        if session_exists(session_id) or get_connection().execute(
            "SELECT 1 FROM sessions WHERE session_id = ?", (session_id,)
        ).fetchone():
            raise SessionAccessDenied()
    elif row["user_id"] != user_id:
        raise SessionAccessDenied()


def list_account_chats(user_id: str) -> list[dict]:
    rows = get_connection().execute(
        """SELECT session_id, title, updated_at FROM chat_owners
           WHERE user_id = ? ORDER BY updated_at DESC, session_id""",
        (user_id,),
    ).fetchall()
    return [dict(row) for row in rows]


def delete_account_chat(session_id: str, user_id: str) -> bool:
    """Remove the owned chat and prevent late requests from recreating it."""
    conn = get_connection()
    conn.execute("BEGIN IMMEDIATE")
    with conn:
        deleted = conn.execute(
            "DELETE FROM chat_owners WHERE session_id = ? AND user_id = ?",
            (session_id, user_id),
        )
        if deleted.rowcount == 0:
            return False
        conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        conn.execute("INSERT INTO deleted_chats (session_id) VALUES (?)", (session_id,))
    return True


def save_message_pair(
    session_id: str,
    user_content: str,
    assistant_content: str,
    metadata: Dict[str, Any],
    user_id: str | None = None,
    system_prompt: str | None = None,
):
    """Atomically save a user/assistant message pair."""
    conn = get_connection()
    now = datetime.now(timezone.utc).isoformat()
    metadata_json = json.dumps(metadata)

    conn.execute("BEGIN IMMEDIATE")
    try:
        check_session_access(session_id, user_id)
        conn.execute(
            """INSERT INTO chat_owners (session_id, user_id, title, updated_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(session_id) DO UPDATE SET updated_at = excluded.updated_at""",
            (session_id, user_id, " ".join(user_content.split())[:80], now),
        )
        if system_prompt is not None:
            conn.execute(
                """INSERT INTO sessions (session_id, system_prompt, created_at)
                   VALUES (?, ?, ?) ON CONFLICT(session_id)
                   DO UPDATE SET system_prompt = excluded.system_prompt""",
                (session_id, system_prompt, now),
            )
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


def get_session_system_prompt(session_id: str, user_id: str | None) -> Optional[str]:
    """Get the stored system prompt for a session."""
    conn = get_connection()
    cursor = conn.execute(
        """SELECT s.system_prompt FROM sessions s
           JOIN chat_owners o ON o.session_id = s.session_id
           WHERE s.session_id = ? AND o.user_id IS ?""",
        (session_id, user_id),
    )
    row = cursor.fetchone()
    if row:
        return row["system_prompt"]
    return None

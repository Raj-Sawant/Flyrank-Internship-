"""
database.py — Stage 0-3 storage layer
All SQL lives here. main.py (routes) never touches SQL directly.
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "tasks.db"


def _connect() -> sqlite3.Connection:
    """Open a connection with row_factory so rows come back as dicts."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ── Stage 0: initialise ──────────────────────────────────────────────────────

def init_db() -> None:
    """
    Create the tasks table if it doesn't exist, then seed three example tasks
    — but only when the table is empty (so restarts don't duplicate them).
    """
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id    INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT    NOT NULL,
                done  INTEGER NOT NULL DEFAULT 0
            )
        """)

        # Seed only on first run
        row = conn.execute("SELECT COUNT(*) AS cnt FROM tasks").fetchone()
        if row["cnt"] == 0:
            seeds = [
                ("Buy groceries", 0),
                ("Read the SQLite docs", 0),
                ("Finish Assignment A2", 0),
            ]
            conn.executemany(
                "INSERT INTO tasks (title, done) VALUES (?, ?)", seeds
            )
        conn.commit()


# ── Stage 1: read ────────────────────────────────────────────────────────────

def get_all_tasks() -> list[dict]:
    """SELECT * FROM tasks — returns every row as a list of dicts."""
    with _connect() as conn:
        rows = conn.execute("SELECT * FROM tasks").fetchall()
    return [_row_to_dict(r) for r in rows]


def get_task_by_id(task_id: int) -> dict | None:
    """SELECT one task by id; returns None if not found."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()
    return _row_to_dict(row) if row else None


# ── Stage 2: create ──────────────────────────────────────────────────────────

def create_task(title: str) -> dict:
    """INSERT a new task and return it with the database-assigned id."""
    with _connect() as conn:
        cursor = conn.execute(
            "INSERT INTO tasks (title, done) VALUES (?, ?)", (title, 0)
        )
        conn.commit()
        new_id = cursor.lastrowid
    return get_task_by_id(new_id)


# ── Stage 3: update & delete ─────────────────────────────────────────────────

def update_task(task_id: int, title: str, done: bool) -> dict | None:
    """UPDATE title and done for a task; returns None if id not found."""
    with _connect() as conn:
        cursor = conn.execute(
            "UPDATE tasks SET title = ?, done = ? WHERE id = ?",
            (title, 1 if done else 0, task_id),
        )
        conn.commit()
    if cursor.rowcount == 0:
        return None
    return get_task_by_id(task_id)


def delete_task(task_id: int) -> bool:
    """DELETE a task; returns True on success, False if id not found."""
    with _connect() as conn:
        cursor = conn.execute(
            "DELETE FROM tasks WHERE id = ?", (task_id,)
        )
        conn.commit()
    return cursor.rowcount > 0


# ── helpers ──────────────────────────────────────────────────────────────────

def _row_to_dict(row: sqlite3.Row) -> dict:
    """Convert a sqlite3.Row to a plain dict with done as a bool."""
    d = dict(row)
    d["done"] = bool(d["done"])
    return d

"""
FlyRank Internship · Backend Track · Week 3 · Assignment A2
Tasks API backed by SQLite — same endpoints as A1, data now survives restarts.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import database

app = FastAPI(title="Tasks API", description="CRUD API backed by SQLite")


# ── Pydantic models ──────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str


class TaskUpdate(BaseModel):
    title: str
    done: bool


# ── Startup: create DB / table / seed ────────────────────────────────────────

@app.on_event("startup")
def startup():
    database.init_db()


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/tasks")
def get_tasks():
    """Return all tasks from the database."""
    return database.get_all_tasks()


@app.get("/tasks/{task_id}")
def get_task(task_id: int):
    """Return a single task by id, or 404 if not found."""
    task = database.get_task_by_id(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.post("/tasks", status_code=201)
def create_task(body: TaskCreate):
    """Create a new task. Title must be non-empty."""
    if not body.title or not body.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    return database.create_task(body.title.strip())


@app.put("/tasks/{task_id}")
def update_task(task_id: int, body: TaskUpdate):
    """Update title and done status of an existing task."""
    if not body.title or not body.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    task = database.update_task(task_id, body.title.strip(), body.done)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int):
    """Delete a task by id. Returns 204 on success, 404 if not found."""
    found = database.delete_task(task_id)
    if not found:
        raise HTTPException(status_code=404, detail="Task not found")

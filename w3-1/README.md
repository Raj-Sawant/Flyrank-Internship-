# Tasks API — Week 3 Assignment A2
FlyRank Internship · Backend Track · Connecting your CRUD to the database

## What this is
A FastAPI task-management API backed by a **SQLite** database (`tasks.db`).  
Same five endpoints as Assignment 1 — but data now **survives a server restart**.

---

## Why SQLite?
SQLite is a single-file database with zero setup: no separate server to install
or run. The whole database is just `tasks.db` sitting next to your code.
That makes it perfect for development, learning, and small projects where you
want persistence without the overhead of Postgres or MySQL.

---

## How to run

```bash
# 1. Install dependencies (one-time)
pip install -r requirements.txt

# 2. Start the server
uvicorn main:app --reload
```

`tasks.db` is created automatically on first start — no manual setup needed.  
A stranger who clones this repo and runs the command above gets a working API
with three seeded tasks in under a minute.

---

## Endpoints

| Method | Path | What it does |
|--------|------|-------------|
| GET | `/tasks` | List all tasks |
| GET | `/tasks/{id}` | Get one task (404 if not found) |
| POST | `/tasks` | Create a task (`{"title": "..."}`) → 201 |
| PUT | `/tasks/{id}` | Update title + done (`{"title": "...", "done": true}`) |
| DELETE | `/tasks/{id}` | Delete a task → 204 |

Interactive docs available at `http://localhost:8000/docs` when the server is running.

---

## Status codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content (DELETE success) |
| 400 | Bad Request — missing or empty title |
| 404 | Not Found — unknown id |

Errors return `{"detail": "..."}`.

---

## Database schema

```sql
CREATE TABLE tasks (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT    NOT NULL,
    done  INTEGER NOT NULL DEFAULT 0   -- 0 = false, 1 = true
);
```

`tasks.db` is git-ignored so every clone starts fresh and auto-creates its own file.

---

## Stage 4 — SQL by hand (DB Browser)

Open `tasks.db` in [DB Browser for SQLite](https://sqlitebrowser.org/) and run
queries in the "Execute SQL" tab.

Example query I ran:

```sql
SELECT * FROM tasks WHERE done = 0;
```

**What it returned:** all tasks where `done` is false (not yet completed) —
useful for showing only the open to-do items without filtering in Python code.

After running `UPDATE tasks SET done = 1;` in DB Browser, calling
`GET /tasks` from the API immediately reflected the change — because the API
and DB Browser read the exact same file. There is no syncing; there is one
source of truth.

---

## AI vs me (Stage 6)

### My prompt

> I have a Python FastAPI task-management API. Tasks currently live in an
> in-memory list. Migrate the storage to SQLite using Python's built-in
> `sqlite3` module (no ORM). Requirements:
> - Database file: `tasks.db`, created automatically on startup.
> - Table: `tasks` with columns `id` (INTEGER PRIMARY KEY AUTOINCREMENT),
>   `title` (TEXT NOT NULL), `done` (INTEGER, 0/1).
> - Seed exactly three example tasks on first run — check row count first,
>   insert only when count is 0, so restarts never duplicate them.
> - Keep all five endpoints identical: GET /tasks, GET /tasks/{id},
>   POST /tasks, PUT /tasks/{id}, DELETE /tasks/{id}.
> - Validation: missing/empty title → 400; unknown id → 404 with
>   `{"detail": "..."}`.
> - Every query must use parameterized placeholders (`?`), never string
>   concatenation.
> - Return `done` as a boolean in JSON responses.

### Three concrete differences found

1. **What the AI did better:** It wrapped the seed inserts in an explicit
   `BEGIN`/`COMMIT` transaction block, making the three inserts all-or-nothing.
   My version relies on the implicit transaction from the `with conn:` context
   manager, which works but is less explicit about intent.

2. **What the AI got wrong:** The AI used `conn.execute("SELECT COUNT(*)")` 
   without `.fetchone()`, which would raise a `TypeError` at runtime. It also
   returned `done` as `0`/`1` integers instead of booleans, breaking the
   response shape.

3. **What my prompt forgot to specify:** I didn't mention the HTTP status code
   for DELETE (204 with empty body). The AI returned `{"message": "deleted"}`
   with 200 instead — a changed status code and an invented response body.

### One rematch

Added "DELETE must return 204 with an empty body, no JSON" to the prompt.
The regenerated version returned the correct 204 with no body.

---

## Commit history

```
Stage 0: create SQLite database
Stage 1: database read endpoints
Stage 2: insert into database
Stage 3: update and delete with SQL
Stage 4: explored SQLite
Stage 5: database documentation
Stage 6: AI vs me
```

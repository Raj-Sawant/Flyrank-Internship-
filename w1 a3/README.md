# Task API — A3: Containerize your stack

A simple CRUD task API built with **Node.js + Express**, backed by **PostgreSQL** running in Docker.  
This is the third storage swap: memory (A1) → SQLite (A2) → **containerized Postgres (A3)**.

---

## One command to run everything

```bash
# 1. Copy the example env file
cp .env.example .env

# 2. Start the whole stack (API + database)
docker compose up
```

The API will be available at `http://localhost:3000`.  
On the first run the `tasks` table is created automatically and seeded with 3 example tasks.

To stop:
```bash
docker compose down
```

Your data **persists** across restarts because the database uses a named Docker volume (`taskdata`).

---

## Environment variables

Copy `.env.example` to `.env` and fill in your values:

| Variable       | Description                        | Default                                      |
|----------------|------------------------------------|----------------------------------------------|
| `DATABASE_URL` | Postgres connection string         | `postgres://postgres:dev@localhost:5432/tasks` |
| `PORT`         | Port the API listens on            | `3000`                                       |

> `.env` is git-ignored — your password never enters version control.

---

## Endpoints

| Method | Path            | Description              | Success code |
|--------|-----------------|--------------------------|--------------|
| GET    | `/tasks`        | List all tasks           | 200          |
| GET    | `/tasks/:id`    | Get one task by id       | 200          |
| POST   | `/tasks`        | Create a new task        | 201          |
| PUT    | `/tasks/:id`    | Update title and/or done | 200          |
| DELETE | `/tasks/:id`    | Delete a task            | 204          |
| GET    | `/health`       | Health check (pings DB)  | 200          |

**Error responses:**
- `400` — missing or empty `title`
- `404` — unknown id → `{ "error": "Task not found" }`

---

## Example curl commands

```bash
# List all tasks
curl -i http://localhost:3000/tasks

# Get a single task
curl -i http://localhost:3000/tasks/1

# Create a task
curl -i -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn Docker"}'

# Mark task 1 as done
curl -i -X PUT http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Buy groceries", "done": true}'

# Delete a task
curl -i -X DELETE http://localhost:3000/tasks/1

# Health check
curl -i http://localhost:3000/health
```

---

## Running Postgres manually (Stage 0 — without Compose)

```bash
docker run --name taskdb \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=tasks \
  -p 5432:5432 \
  -v taskdata:/var/lib/postgresql/data \
  -d postgres

# Open a SQL prompt inside the container
docker exec -it taskdb psql -U postgres -d tasks
```

---

## Project structure

```
.
├── src/
│   ├── index.js          # App entry point — connects DB, starts server
│   ├── db.js             # Repository: ALL database code lives here
│   └── routes/
│       └── tasks.js      # Express route handlers
├── Dockerfile            # Builds the Node.js app image
├── compose.yaml          # Starts api + db with one command
├── .env                  # Your real secrets (git-ignored)
├── .env.example          # Placeholder keys to commit
└── .gitignore
```

---

## Why volumes?

Without a volume, a container's data is stored inside the container itself.  
When you `docker rm` the container, everything vanishes.  
A **named volume** (`taskdata`) lives on your machine outside the container — so even if you destroy and recreate the container, your rows are still there.

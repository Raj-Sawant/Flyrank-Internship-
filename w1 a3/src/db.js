// src/db.js — ALL database code lives here (repository layer)
// Routes never touch the DB directly; they call these functions.

require("dotenv").config();
const { Pool } = require("pg");

// Create a connection pool using the DATABASE_URL from .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ── Startup: create table + seed ────────────────────────────────────────────

async function initDb() {
  // Create the tasks table if it doesn't already exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id    SERIAL PRIMARY KEY,
      title TEXT    NOT NULL,
      done  BOOLEAN NOT NULL DEFAULT false
    )
  `);

  // Seed three example tasks — only on the very first run (table is empty)
  const { rowCount } = await pool.query("SELECT 1 FROM tasks LIMIT 1");
  if (rowCount === 0) {
    await pool.query(`
      INSERT INTO tasks (title, done) VALUES
        ('Buy groceries',   false),
        ('Read a book',     false),
        ('Go for a walk',   true)
    `);
    console.log("✅ Seeded 3 example tasks");
  }

  console.log("✅ Database ready");
}

// ── CRUD helpers ─────────────────────────────────────────────────────────────

// GET /tasks
async function getAllTasks() {
  const { rows } = await pool.query("SELECT * FROM tasks ORDER BY id");
  return rows;
}

// GET /tasks/:id
async function getTaskById(id) {
  // $1 is a parameterized placeholder — never glue user input into SQL
  const { rows } = await pool.query(
    "SELECT * FROM tasks WHERE id = $1",
    [id]
  );
  return rows[0] || null; // null means not found → 404
}

// POST /tasks
async function createTask(title) {
  // RETURNING * hands back the newly created row (id included)
  const { rows } = await pool.query(
    "INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING *",
    [title, false]
  );
  return rows[0];
}

// PUT /tasks/:id
async function updateTask(id, title, done) {
  const { rows } = await pool.query(
    "UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING *",
    [title, done, id]
  );
  return rows[0] || null; // null → 404
}

// DELETE /tasks/:id
async function deleteTask(id) {
  const { rowCount } = await pool.query(
    "DELETE FROM tasks WHERE id = $1",
    [id]
  );
  return rowCount > 0; // false → 404
}

module.exports = { initDb, getAllTasks, getTaskById, createTask, updateTask, deleteTask };

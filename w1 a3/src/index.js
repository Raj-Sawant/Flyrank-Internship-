// src/index.js — app entry point
require("dotenv").config();

const express = require("express");
const { initDb } = require("./db");
const tasksRouter = require("./routes/tasks");

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON request bodies
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/tasks", tasksRouter);

// Health check — also pings the database (stretch goal)
app.get("/health", async (req, res) => {
  try {
    const { Pool } = require("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query("SELECT 1");
    await pool.end();
    res.status(200).json({ status: "ok", db: "ok" });
  } catch {
    res.status(503).json({ status: "error", db: "unreachable" });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    // Connect to Postgres, create table, seed if empty
    await initDb();

    app.listen(PORT, () => {
      console.log(`🚀 Task API listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start:", err.message);
    process.exit(1);
  }
}

start();

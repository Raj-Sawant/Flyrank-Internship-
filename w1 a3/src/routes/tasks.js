// src/routes/tasks.js — Express route handlers
// These are identical in behaviour to A1/A2; only the storage engine changed.

const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /tasks — list all tasks
router.get("/", async (req, res) => {
  try {
    const tasks = await db.getAllTasks();
    res.status(200).json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /tasks/:id — get one task
router.get("/:id", async (req, res) => {
  try {
    const task = await db.getTaskById(Number(req.params.id));
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.status(200).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /tasks — create a task
router.post("/", async (req, res) => {
  try {
    const { title } = req.body;

    // Validation: title must be present and non-empty
    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "title is required" });
    }

    const task = await db.createTask(title.trim());
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /tasks/:id — update a task
router.put("/:id", async (req, res) => {
  try {
    const { title, done } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "title is required" });
    }

    const task = await db.updateTask(
      Number(req.params.id),
      title.trim(),
      Boolean(done)
    );
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.status(200).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /tasks/:id — delete a task
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await db.deleteTask(Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: "Task not found" });
    res.status(204).send(); // 204 No Content — empty body on success
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

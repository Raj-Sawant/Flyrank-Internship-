const express = require("express");
const router = express.Router();

let users = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "admin" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "user" },
  { id: 3, name: "Charlie Lee", email: "charlie@example.com", role: "user" },
];

let nextId = 4;

router.get("/", (req, res) => {
  res.json({
    success: true,
    count: users.length,
    data: users,
  });
});

router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: `User with id ${id} not found`,
    });
  }

  res.json({ success: true, data: user });
});

router.post("/", (req, res) => {
  const { name, email, role } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: "Please provide both 'name' and 'email'",
    });
  }

  const newUser = {
    id: nextId++,
    name,
    email,
    role: role || "user",
  };

  users.push(newUser);

  res.status(201).json({
    success: true,
    message: "User created successfully",
    data: newUser,
  });
});

router.put("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = users.findIndex((u) => u.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: `User with id ${id} not found`,
    });
  }

  users[index] = { ...users[index], ...req.body, id };

  res.json({
    success: true,
    message: "User updated successfully",
    data: users[index],
  });
});

router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = users.findIndex((u) => u.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: `User with id ${id} not found`,
    });
  }

  const deleted = users.splice(index, 1);

  res.json({
    success: true,
    message: "User deleted successfully",
    data: deleted[0],
  });
});

module.exports = router;

require('dotenv').config();
const express = require('express');
const { migrate } = require('./db');

const app = express();

// Body parsing with size limits (abuse protection)
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/', require('./routes/public'));         // GET /widget.js, GET /widgets/:id/config
app.use('/widgets', require('./routes/widgets')); // authenticated CRUD
app.use('/', require('./routes/submissions'));    // POST /submissions (public)
app.use('/dashboard', require('./dashboard/routes'));

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

try {
  migrate(); // synchronous with better-sqlite3
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
} catch (err) {
  console.error('Startup failed:', err);
  process.exit(1);
}

module.exports = app;

require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openApiSpec = require('./src/openapi.json');

const authRoutes      = require('./src/routes/auth');
const publicRoutes    = require('./src/routes/public');
const protectedRoutes = require('./src/routes/protected');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json()); // parse JSON request bodies

// ── Swagger UI at /docs ───────────────────────────────────────────────────────
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth',      authRoutes);
app.use('/public',    publicRoutes);
app.use('/protected', protectedRoutes);

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Swagger docs  → http://localhost:${PORT}/docs`);
  console.log('Connected to Supabase ✓');
});

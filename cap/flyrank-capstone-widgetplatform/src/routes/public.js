const express = require('express');
const path = require('path');
const { db } = require('../db');
const { publicCors } = require('../middleware/cors');

const router = express.Router();

// Widget JS bundle — long immutable cache
router.get('/widget.js', publicCors, (req, res) => {
  const version = process.env.WIDGET_VERSION || '1.0.0';
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Widget-Version', version);
  res.sendFile(path.join(__dirname, '../../widget/widget.js'));
});

// Widget config — short cache (5 min)
router.get('/widgets/:id/config', publicCors, (req, res) => {
  const row = db.prepare(
    'SELECT id, name, type, fields, button_text, display_options, version FROM widgets WHERE id = ?'
  ).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Widget not found' });
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({
    ...row,
    fields: JSON.parse(row.fields || '[]'),
    display_options: JSON.parse(row.display_options || '{}'),
  });
});

module.exports = router;

const express = require('express');
const { z } = require('zod');
const { db, randomUUID } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const widgetSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['signup', 'contact', 'cta']).default('signup'),
  fields: z.array(z.object({
    name: z.string(),
    label: z.string(),
    type: z.enum(['text', 'email', 'textarea']),
    required: z.boolean().default(false),
  })).default([]),
  button_text: z.string().default('Submit'),
  display_options: z.record(z.any()).default({}),
});

function parseWidget(row) {
  if (!row) return null;
  return {
    ...row,
    fields: JSON.parse(row.fields || '[]'),
    display_options: JSON.parse(row.display_options || '{}'),
  };
}

// List
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM widgets WHERE user_id = ? ORDER BY created_at DESC').all(req.user.userId);
    res.json(rows.map(parseWidget));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create
router.post('/', (req, res) => {
  const result = widgetSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: 'Validation failed', details: result.error.flatten() });

  const { name, description, type, fields, button_text, display_options } = result.data;
  const id = randomUUID();
  try {
    db.prepare(`
      INSERT INTO widgets (id, user_id, name, description, type, fields, button_text, display_options)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.userId, name, description || null, type,
        JSON.stringify(fields), button_text, JSON.stringify(display_options));
    const row = db.prepare('SELECT * FROM widgets WHERE id = ?').get(id);
    res.status(201).json(parseWidget(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get one
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM widgets WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
  if (!row) return res.status(404).json({ error: 'Widget not found' });
  res.json(parseWidget(row));
});

// Update
router.put('/:id', (req, res) => {
  const result = widgetSchema.partial().safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: 'Validation failed', details: result.error.flatten() });

  const existing = db.prepare('SELECT * FROM widgets WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
  if (!existing) return res.status(404).json({ error: 'Widget not found' });

  const d = result.data;
  const merged = {
    name: d.name ?? existing.name,
    description: d.description ?? existing.description,
    type: d.type ?? existing.type,
    fields: d.fields ? JSON.stringify(d.fields) : existing.fields,
    button_text: d.button_text ?? existing.button_text,
    display_options: d.display_options ? JSON.stringify(d.display_options) : existing.display_options,
  };

  try {
    db.prepare(`
      UPDATE widgets SET name=?, description=?, type=?, fields=?, button_text=?, display_options=?,
        version=version+1, updated_at=datetime('now')
      WHERE id=? AND user_id=?
    `).run(merged.name, merged.description, merged.type, merged.fields,
        merged.button_text, merged.display_options, req.params.id, req.user.userId);
    const updated = db.prepare('SELECT * FROM widgets WHERE id = ?').get(req.params.id);
    res.json(parseWidget(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM widgets WHERE id = ? AND user_id = ?').run(req.params.id, req.user.userId);
  if (!info.changes) return res.status(404).json({ error: 'Widget not found' });
  res.status(204).send();
});

// Embed snippet
router.get('/:id/snippet', (req, res) => {
  const row = db.prepare('SELECT id, version FROM widgets WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
  if (!row) return res.status(404).json({ error: 'Widget not found' });
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const v = process.env.WIDGET_VERSION || '1.0.0';
  const snippet = `<script src="${baseUrl}/widget.js?v=${v}" data-widget-id="${row.id}"></script>`;
  res.json({ snippet });
});

module.exports = router;

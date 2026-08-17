const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { db } = require('../db');
const { publicCors } = require('../middleware/cors');
const { getGeo } = require('../services/geo');
const { notify } = require('../services/notify');

const router = express.Router();

// Rate limit: 10 requests per IP per minute
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down' },
});

const submissionSchema = z.object({
  widgetId: z.string().min(1),
  data: z.record(z.string(), z.string().max(1000)).refine(
    obj => Object.keys(obj).length <= 20,
    { message: 'Too many fields' }
  ),
  honeypot: z.string().optional(),
});

// Preflight
router.options('/submissions', publicCors, (req, res) => res.sendStatus(204));

router.post('/submissions', publicCors, limiter, async (req, res) => {
  const result = submissionSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ error: 'Validation failed', details: result.error.flatten() });

  const { widgetId, data, honeypot } = result.data;

  // Honeypot — silently drop
  if (honeypot && honeypot.length > 0)
    return res.status(200).json({ ok: true });

  try {
    const widget = db.prepare('SELECT id, user_id FROM widgets WHERE id = ?').get(widgetId);
    if (!widget) return res.status(404).json({ error: 'Widget not found' });

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || '127.0.0.1';
    const geo = await getGeo(ip);

    const info = db.prepare(`
      INSERT INTO submissions (widget_id, user_id, data, ip, country, city)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(widgetId, widget.user_id, JSON.stringify(data), ip, geo.country || null, geo.city || null);

    // Safe side effect — fire and forget
    notify({ submissionId: info.lastInsertRowid, widgetId, data, geo }).catch(err => {
      console.error('Notify failed (non-critical):', err.message);
    });

    res.status(201).json({ ok: true, id: info.lastInsertRowid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

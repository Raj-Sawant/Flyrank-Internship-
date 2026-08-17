const express = require('express');
const { db } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// List submissions for the authenticated user
router.get('/submissions', (req, res) => {
  const { widgetId, limit = 50, offset = 0 } = req.query;
  try {
    let rows;
    if (widgetId) {
      rows = db.prepare(`
        SELECT s.* FROM submissions s
        JOIN widgets w ON w.id = s.widget_id
        WHERE w.user_id = ? AND s.widget_id = ?
        ORDER BY s.created_at DESC LIMIT ? OFFSET ?
      `).all(req.user.userId, widgetId, Number(limit), Number(offset));
    } else {
      rows = db.prepare(`
        SELECT s.* FROM submissions s
        JOIN widgets w ON w.id = s.widget_id
        WHERE w.user_id = ?
        ORDER BY s.created_at DESC LIMIT ? OFFSET ?
      `).all(req.user.userId, Number(limit), Number(offset));
    }
    res.json(rows.map(r => ({ ...r, data: JSON.parse(r.data || '{}') })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stats: per widget, per day, geo breakdown
router.get('/stats', (req, res) => {
  const uid = req.user.userId;
  try {
    const perWidget = db.prepare(`
      SELECT w.id, w.name, COUNT(s.id) as submission_count
      FROM widgets w
      LEFT JOIN submissions s ON s.widget_id = w.id
      WHERE w.user_id = ?
      GROUP BY w.id, w.name ORDER BY submission_count DESC
    `).all(uid);

    const perDay = db.prepare(`
      SELECT date(s.created_at) as day, COUNT(s.id) as count
      FROM submissions s
      JOIN widgets w ON w.id = s.widget_id
      WHERE w.user_id = ?
      GROUP BY day ORDER BY day DESC LIMIT 30
    `).all(uid);

    const geoBreakdown = db.prepare(`
      SELECT s.country, COUNT(s.id) as count
      FROM submissions s
      JOIN widgets w ON w.id = s.widget_id
      WHERE w.user_id = ? AND s.country IS NOT NULL
      GROUP BY s.country ORDER BY count DESC LIMIT 20
    `).all(uid);

    res.json({ per_widget: perWidget, per_day: perDay, geo_breakdown: geoBreakdown });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

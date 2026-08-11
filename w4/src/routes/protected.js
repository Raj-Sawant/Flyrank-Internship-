const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');

/**
 * GET /protected/profile
 * Returns the logged-in user's safe metadata.
 * Requires: Authorization: Bearer <token>
 */
router.get('/profile', authGuard, (req, res) => {
  const { id, email, created_at } = req.user;
  return res.status(200).json({
    id,
    email,
    created_at,
  });
});

/**
 * GET /protected/dashboard
 * A second protected route — uses the same authGuard middleware,
 * zero new auth code needed. This proves middleware reuse.
 */
router.get('/dashboard', authGuard, (req, res) => {
  return res.status(200).json({
    message: `Welcome to your dashboard, ${req.user.email}!`,
    user_id: req.user.id,
  });
});

module.exports = router;

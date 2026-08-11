const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const authGuard = require('../middleware/authGuard');

/**
 * POST /auth/signup
 * Creates a new user account via Supabase Auth.
 * Body: { email, password }
 */
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  // Validate — never trust the client
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({ user: data.user });
});

/**
 * POST /auth/login
 * Authenticates a user and returns a JWT access token.
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ error: 'Invalid login credentials' });
  }

  return res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: data.user,
  });
});

/**
 * POST /auth/logout
 * Ends the user's session. Requires a valid Bearer token.
 */
router.post('/logout', authGuard, async (req, res) => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(204).send();
});

module.exports = router;

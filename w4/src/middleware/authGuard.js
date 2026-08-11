const supabase = require('../supabaseClient');

/**
 * Auth middleware — extracts the Bearer token from the Authorization header,
 * verifies it with Supabase, and attaches the user to req.user.
 * Returns 401 if the token is missing, malformed, invalid, or expired.
 */
async function authGuard(req, res, next) {
  const authHeader = req.headers['authorization'];

  // Check header exists and starts with "Bearer "
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Ask Supabase if the token is real
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Attach user to request so route handlers can use it
  req.user = data.user;
  next();
}

module.exports = authGuard;

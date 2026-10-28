const crypto = require('crypto');
const db = require('./db');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Create a session row and return the raw token (only the hash is stored in the database).
async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const hours = Number(process.env.SESSION_HOURS || 24);
  await db.query(
    'INSERT INTO Sessions (user_id, session_token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))',
    [userId, sha256(token), hours]
  );
  return token;
}

// Middleware: requires "Authorization: Bearer <token>" with an unexpired session.
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Not logged in.' });
    const [rows] = await db.query(
      `SELECT u.user_id, u.first_name, u.last_name, u.email, u.role, u.verified, s.session_id
         FROM Sessions s JOIN Users u ON u.user_id = s.user_id
        WHERE s.session_token = ? AND s.expires_at > NOW()`,
      [sha256(token)]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Session expired. Please log in again.' });
    req.user = rows[0];
    next();
  } catch (e) { next(e); }
}

function requireRole(role) {
  return (req, res, next) => (req.user && req.user.role === role ? next() : res.status(403).json({ error: 'Forbidden.' }));
}

module.exports = { createSession, requireAuth, requireRole, sha256 };

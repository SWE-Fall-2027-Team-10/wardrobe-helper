const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { sendVerificationEmail } = require('./mailer');

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

// Middleware: put after requireAuth on routes that only verified accounts may use.
function requireVerified(req, res, next) {
  if (req.user && req.user.verified) {
    next();
  } else {
    res.status(403).json({ error: 'Account not verified.' });
  }
}

const VERIFY_CODE_MINUTES = 15;

// Makes a new 6-digit code for a user, stores only its bcrypt hash, and emails the code.
// Replaces any earlier code (one row per user) and resets the attempt counter and send time.
async function createVerificationCode(userId, email) {
  // crypto.randomInt is unpredictable, unlike Math.random. padStart keeps leading zeros ("004213").
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const hash = await bcrypt.hash(code, 10);
  await db.query(
    `INSERT INTO Verification (user_id, verification_code, attempts, created_at, expires_at)
     VALUES (?, ?, 0, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE))
     ON DUPLICATE KEY UPDATE verification_code = VALUES(verification_code), attempts = 0,
                             created_at = VALUES(created_at), expires_at = VALUES(expires_at)`,
    [userId, hash, VERIFY_CODE_MINUTES]
  );
  await sendVerificationEmail(email, code);
}

module.exports = { createSession, requireAuth, requireRole, requireVerified, createVerificationCode, sha256 };

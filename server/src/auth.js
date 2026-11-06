const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { sendCodeEmail } = require('./mailer');

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

// ---- One-time email codes ----
// The Verification table holds at most one pending code per user per purpose:
//   'verify_email'  confirm the address used at sign-up
//   'change_email'  confirm a new address before it replaces the old one (new_email holds it until then)
//   'reset_password' forgot-password code sent to the account's address
//   'login_2fa'     sign-in code for accounts with two-factor sign-in turned on
// Only the bcrypt hash of a code is stored; the code itself only ever exists in the email.
const CODE_MINUTES = 15;
const MAX_CODE_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

// Makes a new 6-digit code, stores its hash, and emails it to `email`.
// Replaces any earlier code for the same user + purpose, resetting attempts and the send time.
async function createCode(userId, email, purpose, newEmail = null) {
  // crypto.randomInt is unpredictable, unlike Math.random. padStart keeps leading zeros ("004213").
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const hash = await bcrypt.hash(code, 10);
  await db.query(
    `INSERT INTO Verification (user_id, purpose, verification_code, new_email, attempts, created_at, expires_at)
     VALUES (?, ?, ?, ?, 0, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE))
     ON DUPLICATE KEY UPDATE verification_code = VALUES(verification_code), new_email = VALUES(new_email),
                             attempts = 0, created_at = VALUES(created_at), expires_at = VALUES(expires_at)`,
    [userId, purpose, hash, newEmail, CODE_MINUTES]
  );
  await sendCodeEmail(email, code, purpose);
}

// Kept for the sign-up flow: a 'verify_email' code sent to the account's own address.
const createVerificationCode = (userId, email) => createCode(userId, email, 'verify_email');

// Seconds the user must still wait before another code of this purpose can be sent (0 = send now).
async function codeCooldown(userId, purpose) {
  const [rows] = await db.query(
    'SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS seconds_ago FROM Verification WHERE user_id = ? AND purpose = ?',
    [userId, purpose]
  );
  return rows.length ? Math.max(0, RESEND_COOLDOWN_SECONDS - rows[0].seconds_ago) : 0;
}

// Checks a typed code. Order matters: expiry and the attempt limit are checked BEFORE comparing,
// so a correct guess after the limit still fails. On success the code is used up (deleted).
// Returns { ok: true, row } or { ok: false, status, body } ready for res.status(status).json(body).
async function checkCode(userId, purpose, typed) {
  const where = 'WHERE user_id = ? AND purpose = ?';
  const key = [userId, purpose];
  const fail = (status, error, extra = {}) => ({ ok: false, status, body: { error, ...extra } });

  // Expiry is worked out in SQL because db.js returns dates as strings (dateStrings: true).
  const [rows] = await db.query(
    `SELECT verification_code, new_email, attempts, expires_at <= NOW() AS expired FROM Verification ${where}`,
    key
  );
  if (!rows.length) return fail(400, 'No active code. Please request a new one.');
  const row = rows[0];

  if (row.expired) {
    await db.query(`DELETE FROM Verification ${where}`, key);
    return fail(400, 'Code expired. Please request a new one.');
  }
  if (row.attempts >= MAX_CODE_ATTEMPTS) {
    await db.query(`DELETE FROM Verification ${where}`, key);
    return fail(429, 'Too many incorrect attempts. Please request a new code.');
  }

  if (!(await bcrypt.compare(String(typed), row.verification_code))) {
    // attempts = attempts + 1 lets the database do the math instead of trusting our copy.
    await db.query(`UPDATE Verification SET attempts = attempts + 1 ${where}`, key);
    const left = MAX_CODE_ATTEMPTS - (row.attempts + 1);
    if (left <= 0) {
      await db.query(`DELETE FROM Verification ${where}`, key);
      return fail(429, 'Too many incorrect attempts. Please request a new code.');
    }
    return fail(400, `Incorrect code. ${left} attempt(s) left.`, { attempts_left: left });
  }

  await db.query(`DELETE FROM Verification ${where}`, key);
  return { ok: true, row };
}

module.exports = {
  createSession, requireAuth, requireRole, requireVerified, sha256,
  createCode, createVerificationCode, codeCooldown, checkCode,
};

// UC-01 Registration, UC-02 Login, UC-03 Logout, UC-04 User Management
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { createSession, requireAuth, createCode, createVerificationCode, codeCooldown, checkCode } = require('../auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const publicUser = (u) => ({ user_id: u.user_id, first_name: u.first_name, last_name: u.last_name, email: u.email, role: u.role, verified: Boolean(u.verified), date_of_birth: u.date_of_birth });

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, date_of_birth } = req.body || {};
    if (!first_name || !last_name || !email || !password)
      return res.status(400).json({ error: 'First name, last name, email, and password are required.' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Invalid email address.' });
    if (password.length < MIN_PASSWORD_LENGTH) return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });

    const [dup] = await db.query('SELECT user_id FROM Users WHERE email = ?', [email.toLowerCase()]);
    if (dup.length) return res.status(409).json({ error: 'An account with that email already exists.' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO Users (first_name, last_name, email, password_hash, date_of_birth) VALUES (?, ?, ?, ?, ?)',
      [first_name.trim(), last_name.trim(), email.toLowerCase(), hash, date_of_birth || null]
    );
    await db.query('INSERT INTO User_Profile (user_id) VALUES (?)', [result.insertId]);

    // Send the first verification code. If the email fails, the account still exists and the
    // user can press "Resend" on the verification screen, so don't fail the whole registration.
    try {
      await createVerificationCode(result.insertId, email.toLowerCase());
    } catch (mailErr) {
      console.error('Could not send verification email:', mailErr);
    }
    res.status(201).json({ message: 'Account created. Check your email for a verification code.', user_id: result.insertId });
  } catch (e) { next(e); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const [rows] = await db.query('SELECT * FROM Users WHERE email = ?', [email.toLowerCase()]);
    const ok = rows.length && (await bcrypt.compare(password, rows[0].password_hash));
    if (!ok) return res.status(401).json({ error: 'Incorrect email or password.' });
    const token = await createSession(rows[0].user_id);
    res.json({ token, user: publicUser(rows[0]) });
  } catch (e) { next(e); }
});

// POST /api/auth/logout  (ends the current session)
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await db.query('DELETE FROM Sessions WHERE session_id = ?', [req.user.session_id]);
    res.json({ message: 'Logged out.' });
  } catch (e) { next(e); }
});

// GET /api/auth/me  (account + profile)
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT u.user_id, u.first_name, u.last_name, u.email, u.role, u.verified, u.date_of_birth,
              p.height, p.clothing_size, p.preferences, p.profile_image
         FROM Users u LEFT JOIN User_Profile p ON p.user_id = u.user_id WHERE u.user_id = ?`,
      [req.user.user_id]
    );
    res.json({ ...rows[0], verified: Boolean(rows[0].verified) }); // MySQL BOOLEAN comes back as 0/1
  } catch (e) { next(e); }
});

// PUT /api/auth/me  (update only the fields sent)
router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const b = req.body || {};
    const userFields = {}, profileFields = {};
    for (const k of ['first_name', 'last_name', 'date_of_birth']) if (b[k] !== undefined) userFields[k] = b[k];
    for (const k of ['height', 'clothing_size', 'preferences', 'profile_image']) if (b[k] !== undefined) profileFields[k] = b[k];
    if (b.height !== undefined && (isNaN(Number(b.height)) || Number(b.height) <= 0))
      return res.status(400).json({ error: 'Height must be a positive number.' });
    if (userFields.first_name === '' || userFields.last_name === '')
      return res.status(400).json({ error: 'Names cannot be empty.' });
    if (!Object.keys(userFields).length && !Object.keys(profileFields).length)
      return res.status(400).json({ error: 'No valid fields to update.' });

    const set = (o) => Object.keys(o).map((k) => `${k} = ?`).join(', ');
    if (Object.keys(userFields).length)
      await db.query(`UPDATE Users SET ${set(userFields)} WHERE user_id = ?`, [...Object.values(userFields), req.user.user_id]);
    if (Object.keys(profileFields).length)
      await db.query(`UPDATE User_Profile SET ${set(profileFields)} WHERE user_id = ?`, [...Object.values(profileFields), req.user.user_id]);
    res.json({ message: 'Account updated.' });
  } catch (e) { next(e); }
});

// POST /api/auth/verify  (protected)  body: { verification_code }
// Checks the sign-up code (expiry, attempt limit, bcrypt compare: see checkCode in src/auth.js).
// If it matches, marks the account as verified.
router.post('/verify', requireAuth, async (req, res, next) => {
  try {
    const { verification_code } = req.body || {};
    if (!verification_code) return res.status(400).json({ error: 'Verification code is required.' });
    if (req.user.verified) return res.status(400).json({ error: 'Account is already verified.' });

    const result = await checkCode(req.user.user_id, 'verify_email', verification_code);
    if (!result.ok) return res.status(result.status).json(result.body);

    await db.query('UPDATE Users SET verified = TRUE WHERE user_id = ?', [req.user.user_id]);
    res.json({ message: 'Account verified.' });
  } catch (e) { next(e); }
});

// Answers 429 with how long to wait if a code of this purpose was sent less than a minute ago.
// Returns true when it already answered, so callers can write `if (await tooSoon(...)) return;`.
async function tooSoon(res, userId, purpose) {
  const wait = await codeCooldown(userId, purpose);
  if (!wait) return false;
  res.status(429).json({ error: `Please wait ${wait} seconds before requesting a new code.`, retry_after: wait });
  return true;
}

// POST /api/auth/send-verification  (protected, no body)
// Emails the logged-in user a new code. The user comes from their session, never from the request body,
// so nobody can trigger emails to someone else's address. Limited to one request per minute.
router.post('/send-verification', requireAuth, async (req, res, next) => {
  try {
    if (req.user.verified) return res.status(400).json({ error: 'Account is already verified.' });
    if (await tooSoon(res, req.user.user_id, 'verify_email')) return;

    await createVerificationCode(req.user.user_id, req.user.email);
    res.json({ message: 'Verification email sent. Please check your inbox.' });
  } catch (e) { next(e); }
});

// POST /api/auth/email/change  (protected)  body: { current_password, new_email }
// Step 1 of changing email: checks the password, then emails a code to the NEW address.
// Nothing changes yet. The new address waits in Verification.new_email until it's confirmed,
// so a typo or someone else's address never becomes the account's email.
router.post('/email/change', requireAuth, async (req, res, next) => {
  try {
    const { current_password } = req.body || {};
    const new_email = String((req.body || {}).new_email || '').trim().toLowerCase();
    if (!current_password || !new_email)
      return res.status(400).json({ error: 'Current password and new email are required.' });
    if (!EMAIL_RE.test(new_email)) return res.status(400).json({ error: 'Invalid email address.' });
    if (new_email === req.user.email) return res.status(400).json({ error: 'That is already your email.' });

    const userId = req.user.user_id;
    const [rows] = await db.query('SELECT password_hash FROM Users WHERE user_id = ?', [userId]);
    if (!(await bcrypt.compare(String(current_password), rows[0].password_hash)))
      return res.status(400).json({ error: 'Current password is incorrect.' }); // 400, not 401: see PUT /password

    const [taken] = await db.query('SELECT user_id FROM Users WHERE email = ?', [new_email]);
    if (taken.length) return res.status(409).json({ error: 'An account with that email already exists.' });

    if (await tooSoon(res, userId, 'change_email')) return;
    await createCode(userId, new_email, 'change_email', new_email);
    res.json({ message: `We sent a code to ${new_email}.` });
  } catch (e) { next(e); }
});

// POST /api/auth/email/confirm  (protected)  body: { code }
// Step 2: if the code sent to the new address matches, that address becomes the account's email.
router.post('/email/confirm', requireAuth, async (req, res, next) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: 'Code is required.' });

    const result = await checkCode(req.user.user_id, 'change_email', code);
    if (!result.ok) return res.status(result.status).json(result.body);
    const newEmail = result.row.new_email;

    // Someone may have registered this address since the code was sent.
    const [taken] = await db.query('SELECT user_id FROM Users WHERE email = ?', [newEmail]);
    if (taken.length) return res.status(409).json({ error: 'An account with that email already exists.' });

    await db.query('UPDATE Users SET email = ? WHERE user_id = ?', [newEmail, req.user.user_id]);
    res.json({ message: 'Email updated.', email: newEmail });
  } catch (e) { next(e); }
});

// DELETE /api/auth/me  (protected)  body: { password }
// Permanently deletes the account after re-checking the password. Every table that references Users uses
// ON DELETE CASCADE, so the profile, sessions, codes, clothing, outfits, favorites and shares go with it.
router.delete('/me', requireAuth, async (req, res, next) => {
  try {
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'Password is required to delete your account.' });

    const [rows] = await db.query('SELECT password_hash FROM Users WHERE user_id = ?', [req.user.user_id]);
    if (!(await bcrypt.compare(String(password), rows[0].password_hash)))
      return res.status(400).json({ error: 'Password is incorrect.' }); // 400, not 401: see PUT /password

    await db.query('DELETE FROM Users WHERE user_id = ?', [req.user.user_id]);
    res.json({ message: 'Account deleted.' });
  } catch (e) { next(e); }
});

// PUT /api/auth/password  (protected)  body: { current_password, new_password }
// Changes the password after re-checking the current one, then signs out every OTHER device.
// A wrong current password answers 400, not 401: the app treats 401 as "session over" and would log the user out.
router.put('/password', requireAuth, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password)
      return res.status(400).json({ error: 'Current password and new password are required.' });
    if (typeof new_password !== 'string' || new_password.length < MIN_PASSWORD_LENGTH)
      return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    if (new_password === current_password)
      return res.status(400).json({ error: 'New password must be different from your current one.' });

    const userId = req.user.user_id;
    const [rows] = await db.query('SELECT password_hash FROM Users WHERE user_id = ?', [userId]);
    if (!(await bcrypt.compare(String(current_password), rows[0].password_hash)))
      return res.status(400).json({ error: 'Current password is incorrect.' });

    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE Users SET password_hash = ? WHERE user_id = ?', [hash, userId]);
    // Anyone else logged in as this user (maybe the reason for the change) loses access; this device stays logged in.
    await db.query('DELETE FROM Sessions WHERE user_id = ? AND session_id <> ?', [userId, req.user.session_id]);
    res.json({ message: 'Password updated.' });
  } catch (e) { next(e); }
});

// TODO: Implement password reset functionality (UC-05) and user management for admins (UC-06).

module.exports = router;

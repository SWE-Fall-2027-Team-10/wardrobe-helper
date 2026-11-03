// UC-01 Registration, UC-02 Login, UC-03 Logout, UC-04 User Management
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { createSession, requireAuth, createVerificationCode } = require('../auth');

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

const MAX_VERIFY_ATTEMPTS = 5;

// POST /api/auth/verify  (protected)  body: { verification_code }
// Checks the code against the stored bcrypt hash, and also checks expiry and attempts. If successful, marks the account as verified and deletes the code.
router.post('/verify', requireAuth, async (req, res, next) => {
  try {
    const { verification_code } = req.body || {};
    if (!verification_code) return res.status(400).json({ error: 'Verification code is required.' });
    if (req.user.verified) return res.status(400).json({ error: 'Account is already verified.' });

    const userId = req.user.user_id;

    // Look up by user only. The typed code is checked with bcrypt below, never in SQL.
    // Expiry is worked out in SQL because db.js returns dates as strings (dateStrings: true).
    const [rows] = await db.query(
      'SELECT verification_code, attempts, expires_at <= NOW() AS expired FROM Verification WHERE user_id = ?',
      [userId]
    );
    if (!rows.length) return res.status(400).json({ error: 'No active code. Please request a new one.' });
    const row = rows[0];

    // 1. Expired: remove it so it can never be used.
    if (row.expired) {
      await db.query('DELETE FROM Verification WHERE user_id = ?', [userId]);
      return res.status(400).json({ error: 'Code expired. Please request a new one.' });
    }

    // 2. Out of attempts: checked BEFORE comparing, so a correct guess after the limit still fails.
    if (row.attempts >= MAX_VERIFY_ATTEMPTS) {
      await db.query('DELETE FROM Verification WHERE user_id = ?', [userId]);
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
    }

    // 3. Compare the typed code against the stored bcrypt hash.
    const ok = await bcrypt.compare(String(verification_code), row.verification_code);
    if (!ok) {
      // attempts = attempts + 1 lets the database do the math instead of trusting our copy.
      await db.query('UPDATE Verification SET attempts = attempts + 1 WHERE user_id = ?', [userId]);
      const left = MAX_VERIFY_ATTEMPTS - (row.attempts + 1);
      if (left <= 0) {
        await db.query('DELETE FROM Verification WHERE user_id = ?', [userId]);
        return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
      }
      return res.status(400).json({ error: `Incorrect code. ${left} attempt(s) left.`, attempts_left: left });
    }

    // 4. Correct: verify the account and use up the code.
    await db.query('UPDATE Users SET verified = TRUE WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM Verification WHERE user_id = ?', [userId]);
    res.json({ message: 'Account verified.' });
  } catch (e) { next(e); }
});

const RESEND_COOLDOWN_SECONDS = 60;

// POST /api/auth/send-verification  (protected, no body)
// Emails the logged-in user a new code. The user comes from their session, never from the request body,
// so nobody can trigger emails to someone else's address. Limited to one request per minute.
router.post('/send-verification', requireAuth, async (req, res, next) => {
  try {
    if (req.user.verified) return res.status(400).json({ error: 'Account is already verified.' });

    const [rows] = await db.query(
      'SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS seconds_ago FROM Verification WHERE user_id = ?',
      [req.user.user_id]
    );
    if (rows.length && rows[0].seconds_ago < RESEND_COOLDOWN_SECONDS) {
      const wait = RESEND_COOLDOWN_SECONDS - rows[0].seconds_ago;
      return res.status(429).json({ error: `Please wait ${wait} seconds before requesting a new code.`, retry_after: wait });
    }

    await createVerificationCode(req.user.user_id, req.user.email);
    res.json({ message: 'Verification email sent. Please check your inbox.' });
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

router.put('/email', requireAuth, async (req, res, next) => {
  try {
    const { current_password, new_email } = req.body;
    const userId = req.user.user_id;

    const [rows] = await db.query('SELECT * FROM Users WHERE user_id = ?', [userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    const user = rows[0];

    const ok = await bcrypt.compare(current_password, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Current password is incorrect.' });

    await db.query('UPDATE Users SET email = ? WHERE user_id = ?', [new_email, userId]);
    res.json({ message: 'Email updated successfully.' });
  } catch (e) { next(e); }
});

module.exports = router;

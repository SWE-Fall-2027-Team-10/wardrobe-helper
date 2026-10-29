# Wardrobe Maker - Backend (Express + MySQL)

Team 10 - Sprint 2. Handles user management (register, login, logout, sessions, profile) and wardrobe clothing (add, search/filter, delete).

## Setup
Requirements: Node.js 18+ and MySQL 8 running locally.

```bash
cd server
npm install
cp .env.example .env      # then edit .env and put in your MySQL password
npm run db:setup          # creates the wardrobe_maker database and all tables (database/schema.sql)
npm start                 # API at http://localhost:3000
```
Check it works: open http://localhost:3000/api/health (should show `{"status":"ok"}`).

## Endpoints
All JSON. Protected routes need the header `Authorization: Bearer <token>` (the token comes from login).

| Method | Path | Use case | Body / query |
|---|---|---|---|
| POST | /api/auth/register | UC-01 Registration | first_name, last_name, email, password (8+ chars), date_of_birth (optional) |
| POST | /api/auth/login | UC-02 Login | email, password -> returns `token` and `user` |
| POST | /api/auth/logout | UC-03 Logout | (protected) ends the session |
| POST | /api/auth/verify | Email verification | (protected) verification_code -> marks the account verified. 5 tries, codes last 15 min |
| POST | /api/auth/send-verification | Email verification | (protected, no body) emails a new code; once per 60 s |
| GET | /api/auth/me | UC-04 User Management | (protected) account + profile |
| PUT | /api/auth/me | UC-04 User Management | (protected) any of first_name, last_name, date_of_birth, height, clothing_size, preferences, profile_image |
| POST | /api/clothing | UC-05 Upload Clothing | (protected) name, category required; color, size, brand, image_url |
| GET | /api/clothing | UC-06 Search/Filter | (protected) optional `q`, `category`, `color` |
| DELETE | /api/clothing/:id | Remove clothing | (protected) |

## How sessions work
Login creates a random token. The database stores only its SHA-256 hash in the `Sessions` table with an `expires_at` time (`SESSION_HOURS`, default 24). Logout deletes the row, and expired sessions are rejected.

## Connecting the Expo app
From the phone, `localhost` is the phone itself. Use your computer's local IP, e.g. `http://192.168.1.20:3000/api`, as the base URL in the app.

## Roles
`Users.role` is `'user'` by default. `requireRole('admin')` in `src/auth.js` is ready if an admin-only route is ever needed.

## Email verification
Registering emails a 6-digit code (also sent again by `/api/auth/send-verification`). Only its bcrypt hash is stored, in the `Verification` table. Until `/api/auth/verify` succeeds, `Users.verified` is false and the clothing, outfits, favorites and sharing routes answer 403 (`requireVerified` in `src/auth.js`).

In development, leave `SMTP_HOST` empty in `.env`: no real email is sent, and the server log prints the code and a link to view the email on Ethereal. Databases created before this feature need `database/add_verification.sql` run once.

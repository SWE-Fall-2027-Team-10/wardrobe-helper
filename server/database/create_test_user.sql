-- Creates (or re-creates) a verified test account for trying the app.
--   Email:    test@example.com
--   Password: password123
-- Run with:  mysql -u wardrobe -p wardrobe_maker < database/create_test_user.sql
-- Safe to run again: it deletes the old test account first (and, through ON DELETE CASCADE,
-- everything it owned), so you always start from a clean, verified account.
-- For local testing only. Never run this against a real database.

DELETE FROM Users WHERE email = 'test@example.com';

INSERT INTO Users (first_name, last_name, email, password_hash, verified)
VALUES (
  'Test', 'User', 'test@example.com',
  '$2a$10$OdNAjUi7saftfuLHaGaWwOY8sa.2Crdc47lUVMNp8xHWo4d06eziO',  -- bcrypt hash of "password123"
  TRUE
);

-- Registration also creates an empty profile row; profile edits (PUT /api/auth/me) need it.
INSERT INTO User_Profile (user_id) VALUES (LAST_INSERT_ID());

SELECT user_id, email, verified FROM Users WHERE email = 'test@example.com';

-- Run this ONCE on a database whose Verification table was made before codes had a purpose
-- (anything created by add_verification.sql or an older schema.sql). Fresh databases made with
-- the current schema.sql already have these columns.
-- Run with:  mysql -u wardrobe -p wardrobe_maker < database/add_code_purposes.sql

-- Existing codes are all sign-up verification codes, so they get purpose 'verify_email' from the default.
-- The primary key changes from (user_id) to (user_id, purpose): one pending code per user PER PURPOSE.
ALTER TABLE Verification
  ADD COLUMN purpose VARCHAR(20) NOT NULL DEFAULT 'verify_email' AFTER user_id,
  ADD COLUMN new_email VARCHAR(100) NULL AFTER verification_code,
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (user_id, purpose);

-- Run this ONCE on a database that was created before email verification existed.
-- schema.sql uses CREATE TABLE IF NOT EXISTS, so re-running it will NOT add the new column to an existing Users table.
-- Run with:  mysql -u wardrobe -p wardrobe_maker < database/add_verification.sql
-- (If it says "Duplicate column name 'verified'", your Users table already has it; the rest still ran fine if you run it again without the first statement.)

ALTER TABLE Users ADD COLUMN verified BOOLEAN NOT NULL DEFAULT FALSE;

-- One pending code per user (account verification only, for now).
CREATE TABLE IF NOT EXISTS Verification (
  user_id            INT NOT NULL PRIMARY KEY,
  verification_code  VARCHAR(255) NOT NULL,        -- bcrypt hash of the 6-digit code; the code itself is only ever in the email
  attempts           INT NOT NULL DEFAULT 0,       -- wrong guesses so far (max 5)
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- when the code was last sent; used for the 60 s resend cooldown
  expires_at         DATETIME NOT NULL,            -- 15 minutes after created_at
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Optional: mark accounts that existed before verification as verified, so test logins keep working.
-- UPDATE Users SET verified = TRUE;

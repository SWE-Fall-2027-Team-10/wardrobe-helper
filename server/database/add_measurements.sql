-- Run this ONCE on a database created before the profile page had body measurements.
-- Fresh databases made with the current schema.sql already have these columns.
-- Run with:  mysql -u wardrobe -p wardrobe_maker < database/add_measurements.sql
--
-- Every length (height, chest, waist, hips, inseam) is stored in CENTIMETERS, whatever unit the
-- user picks in the app. measurement_unit only decides how the app shows them ('imperial' = inches).
-- That way the AI and size-recommendation features never have to guess which unit a number is in.

ALTER TABLE User_Profile
  ADD COLUMN chest            DECIMAL(5,2) NULL AFTER height,
  ADD COLUMN waist            DECIMAL(5,2) NULL AFTER chest,
  ADD COLUMN hips             DECIMAL(5,2) NULL AFTER waist,
  ADD COLUMN inseam           DECIMAL(5,2) NULL AFTER hips,
  ADD COLUMN shoe_size        VARCHAR(10)  NULL AFTER inseam,
  ADD COLUMN fit_preference   VARCHAR(20)  NULL AFTER clothing_size,
  ADD COLUMN measurement_unit VARCHAR(10)  NOT NULL DEFAULT 'imperial' AFTER fit_preference;

-- Accounts made by an older create_test_user.sql (or by hand) may be missing their profile row.
INSERT INTO User_Profile (user_id)
SELECT u.user_id FROM Users u LEFT JOIN User_Profile p ON p.user_id = u.user_id WHERE p.user_id IS NULL;

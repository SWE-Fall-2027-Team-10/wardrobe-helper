-- Run this ONCE on a database created before two-factor sign-in existed.
-- Fresh databases made with the current schema.sql already have this column.
-- Run with:  mysql -u wardrobe -p wardrobe_maker < database/add_two_factor.sql
-- Sign-in codes use the existing Verification table (purpose 'login_2fa'), so nothing else changes.

ALTER TABLE Users ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;

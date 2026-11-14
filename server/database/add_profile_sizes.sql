-- Run this ONCE on databases created before category-specific clothing sizes existed.
-- The existing clothing_size column remains the default size for all clothing.
-- Run with: mysql -u wardrobe -p wardrobe_maker < database/add_profile_sizes.sql

ALTER TABLE User_Profile
  ADD COLUMN top_size VARCHAR(20) NULL AFTER clothing_size,
  ADD COLUMN bottom_size VARCHAR(20) NULL AFTER top_size;

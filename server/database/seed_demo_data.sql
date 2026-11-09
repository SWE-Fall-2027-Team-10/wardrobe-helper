-- Fills the database with demo data: accounts, profiles, clothing, favorites, outfits and shares.
-- Every demo account uses the password:  password123
-- Run with:  mysql -u wardrobe -p wardrobe_maker < database/seed_demo_data.sql
-- Safe to run again: it deletes the demo accounts first (and, through ON DELETE CASCADE,
-- everything they owned), then adds them back, so you always get the same clean set.
-- For local testing and screenshots only. Never run this against a real database.
--
-- Accounts it creates:
--   test@example.com          Test User      verified, has wardrobe + outfits (same login as create_test_user.sql)
--   maya.chen@example.com     Maya Chen      verified, biggest wardrobe
--   jordan.brooks@example.com Jordan Brooks  verified
--   priya.patel@example.com   Priya Patel    verified, 2FA ON (login emails a code)
--   marcus.lee@example.com    Marcus Lee     verified
--   sofia.ramirez@example.com Sofia Ramirez  verified
--   ethan.walker@example.com  Ethan Walker   NOT verified (app shows only the verification screen)
--   admin@example.com         Alex Admin     verified, role = 'admin'

DELETE FROM Users WHERE email IN (
  'test@example.com', 'maya.chen@example.com', 'jordan.brooks@example.com', 'priya.patel@example.com',
  'marcus.lee@example.com', 'sofia.ramirez@example.com', 'ethan.walker@example.com', 'admin@example.com'
);

-- bcrypt hash of "password123" (same one create_test_user.sql uses)
SET @pw = '$2a$10$OdNAjUi7saftfuLHaGaWwOY8sa.2Crdc47lUVMNp8xHWo4d06eziO';

-- ---------------------------------------------------------------- accounts
INSERT INTO Users (first_name, last_name, email, password_hash, date_of_birth, role, verified, two_factor_enabled, created_at) VALUES
  ('Test',   'User',    'test@example.com',          @pw, '2003-05-14', 'user',  TRUE,  FALSE, NOW() - INTERVAL 40 DAY),
  ('Maya',   'Chen',    'maya.chen@example.com',     @pw, '2002-11-02', 'user',  TRUE,  FALSE, NOW() - INTERVAL 35 DAY),
  ('Jordan', 'Brooks',  'jordan.brooks@example.com', @pw, '2001-07-23', 'user',  TRUE,  FALSE, NOW() - INTERVAL 30 DAY),
  ('Priya',  'Patel',   'priya.patel@example.com',   @pw, '2004-02-09', 'user',  TRUE,  TRUE,  NOW() - INTERVAL 28 DAY),
  ('Marcus', 'Lee',     'marcus.lee@example.com',    @pw, '2000-09-30', 'user',  TRUE,  FALSE, NOW() - INTERVAL 21 DAY),
  ('Sofia',  'Ramirez', 'sofia.ramirez@example.com', @pw, '2003-12-18', 'user',  TRUE,  FALSE, NOW() - INTERVAL 14 DAY),
  ('Ethan',  'Walker',  'ethan.walker@example.com',  @pw, NULL,         'user',  FALSE, FALSE, NOW() - INTERVAL 1 DAY),
  ('Alex',   'Admin',   'admin@example.com',         @pw, NULL,         'admin', TRUE,  FALSE, NOW() - INTERVAL 60 DAY);

SET @test   = (SELECT user_id FROM Users WHERE email = 'test@example.com');
SET @maya   = (SELECT user_id FROM Users WHERE email = 'maya.chen@example.com');
SET @jordan = (SELECT user_id FROM Users WHERE email = 'jordan.brooks@example.com');
SET @priya  = (SELECT user_id FROM Users WHERE email = 'priya.patel@example.com');
SET @marcus = (SELECT user_id FROM Users WHERE email = 'marcus.lee@example.com');
SET @sofia  = (SELECT user_id FROM Users WHERE email = 'sofia.ramirez@example.com');
SET @ethan  = (SELECT user_id FROM Users WHERE email = 'ethan.walker@example.com');
SET @admin  = (SELECT user_id FROM Users WHERE email = 'admin@example.com');

-- Registration creates a profile row for every account; profile edits (PUT /api/auth/me) need it.
INSERT INTO User_Profile (user_id, height, clothing_size, preferences) VALUES
  (@test,   175.00, 'M',  'Casual, neutral colors'),
  (@maya,   163.50, 'S',  'Streetwear, oversized fits, earth tones'),
  (@jordan, 185.00, 'L',  'Athleisure and sneakers'),
  (@priya,  158.00, 'XS', 'Business casual, pastels'),
  (@marcus, 180.25, 'M',  'Minimalist, black and white'),
  (@sofia,  168.00, 'S',  'Vintage, bold patterns'),
  (@ethan,  NULL,   NULL, NULL),
  (@admin,  NULL,   NULL, NULL);

-- ---------------------------------------------------------------- clothing
INSERT INTO Clothing (user_id, name, category, color, size, brand, created_at) VALUES
  (@test, 'White Oxford Shirt',     'Tops',        'White',      'M',  'Uniqlo',        NOW() - INTERVAL 38 DAY),
  (@test, 'Navy Crewneck Sweater',  'Tops',        'Navy',       'M',  'J.Crew',        NOW() - INTERVAL 37 DAY),
  (@test, 'Gray Graphic Tee',       'Tops',        'Gray',       'M',  'Champion',      NOW() - INTERVAL 36 DAY),
  (@test, 'Dark Wash Jeans',        'Bottoms',     'Blue',       '32', 'Levi''s',       NOW() - INTERVAL 36 DAY),
  (@test, 'Khaki Chinos',           'Bottoms',     'Khaki',      '32', 'Dockers',       NOW() - INTERVAL 35 DAY),
  (@test, 'Black Joggers',          'Bottoms',     'Black',      'M',  'Nike',          NOW() - INTERVAL 30 DAY),
  (@test, 'White Sneakers',         'Shoes',       'White',      '10', 'Adidas',        NOW() - INTERVAL 34 DAY),
  (@test, 'Brown Chelsea Boots',    'Shoes',       'Brown',      '10', 'Clarks',        NOW() - INTERVAL 25 DAY),
  (@test, 'Denim Jacket',           'Outerwear',   'Blue',       'M',  'Levi''s',       NOW() - INTERVAL 20 DAY),
  (@test, 'Black Puffer Jacket',    'Outerwear',   'Black',      'M',  'The North Face', NOW() - INTERVAL 10 DAY),
  (@test, 'Leather Belt',           'Accessories', 'Brown',      NULL, 'Fossil',        NOW() - INTERVAL 18 DAY),

  (@maya, 'Oversized Hoodie',       'Tops',        'Sage',       'L',  'Carhartt',      NOW() - INTERVAL 33 DAY),
  (@maya, 'Cropped Baby Tee',       'Tops',        'Cream',      'S',  'Urban Outfitters', NOW() - INTERVAL 32 DAY),
  (@maya, 'Striped Long Sleeve',    'Tops',        'Brown',      'S',  'Aritzia',       NOW() - INTERVAL 30 DAY),
  (@maya, 'Cargo Pants',            'Bottoms',     'Olive',      'S',  'Dickies',       NOW() - INTERVAL 31 DAY),
  (@maya, 'Wide Leg Jeans',         'Bottoms',     'Light Blue', '26', 'Levi''s',       NOW() - INTERVAL 29 DAY),
  (@maya, 'Pleated Mini Skirt',     'Bottoms',     'Black',      'S',  'Zara',          NOW() - INTERVAL 22 DAY),
  (@maya, 'Chunky Platform Sneakers', 'Shoes',     'White',      '7',  'New Balance',   NOW() - INTERVAL 28 DAY),
  (@maya, 'Combat Boots',           'Shoes',       'Black',      '7',  'Dr. Martens',   NOW() - INTERVAL 15 DAY),
  (@maya, 'Corduroy Jacket',        'Outerwear',   'Tan',        'M',  'Madewell',      NOW() - INTERVAL 12 DAY),
  (@maya, 'Beanie',                 'Accessories', 'Rust',       NULL, 'Carhartt',      NOW() - INTERVAL 9 DAY),
  (@maya, 'Canvas Tote Bag',        'Accessories', 'Natural',    NULL, NULL,            NOW() - INTERVAL 5 DAY),

  (@jordan, 'Dri-FIT Training Tee', 'Tops',        'Black',      'L',  'Nike',          NOW() - INTERVAL 29 DAY),
  (@jordan, 'Quarter Zip Pullover', 'Tops',        'Heather Gray', 'L', 'Lululemon',    NOW() - INTERVAL 27 DAY),
  (@jordan, 'Tech Fleece Joggers',  'Bottoms',     'Gray',       'L',  'Nike',          NOW() - INTERVAL 27 DAY),
  (@jordan, 'Running Shorts',       'Bottoms',     'Navy',       'L',  'Under Armour',  NOW() - INTERVAL 20 DAY),
  (@jordan, 'Air Max 90',           'Shoes',       'White/Red',  '12', 'Nike',          NOW() - INTERVAL 26 DAY),
  (@jordan, 'Windbreaker',          'Outerwear',   'Teal',       'L',  'Columbia',      NOW() - INTERVAL 11 DAY),
  (@jordan, 'Baseball Cap',         'Accessories', 'Black',      NULL, 'New Era',       NOW() - INTERVAL 8 DAY),

  (@priya, 'Silk Blouse',           'Tops',        'Blush',      'XS', 'Banana Republic', NOW() - INTERVAL 27 DAY),
  (@priya, 'Ribbed Knit Cardigan',  'Tops',        'Lavender',   'XS', 'Abercrombie',   NOW() - INTERVAL 24 DAY),
  (@priya, 'Tailored Trousers',     'Bottoms',     'Charcoal',   '0',  'Ann Taylor',    NOW() - INTERVAL 26 DAY),
  (@priya, 'Midi Skirt',            'Bottoms',     'Mint',       'XS', 'H&M',           NOW() - INTERVAL 19 DAY),
  (@priya, 'Pointed Flats',         'Shoes',       'Nude',       '6',  'Sam Edelman',   NOW() - INTERVAL 25 DAY),
  (@priya, 'Wool Coat',             'Outerwear',   'Camel',      'XS', 'Mango',         NOW() - INTERVAL 7 DAY),

  (@marcus, 'Black Turtleneck',     'Tops',        'Black',      'M',  'COS',           NOW() - INTERVAL 20 DAY),
  (@marcus, 'White Heavyweight Tee', 'Tops',       'White',      'M',  'Everlane',      NOW() - INTERVAL 19 DAY),
  (@marcus, 'Slim Black Jeans',     'Bottoms',     'Black',      '31', 'Acne Studios',  NOW() - INTERVAL 19 DAY),
  (@marcus, 'Leather Low Tops',     'Shoes',       'White',      '10', 'Common Projects', NOW() - INTERVAL 18 DAY),
  (@marcus, 'Wool Overcoat',        'Outerwear',   'Black',      'M',  'Uniqlo',        NOW() - INTERVAL 6 DAY),

  (@sofia, 'Floral Button Up',      'Tops',        'Multicolor', 'S',  'Thrifted',      NOW() - INTERVAL 13 DAY),
  (@sofia, 'High Waist Mom Jeans',  'Bottoms',     'Medium Blue', '27', 'Levi''s',      NOW() - INTERVAL 13 DAY),
  (@sofia, 'Plaid Mini Skirt',      'Bottoms',     'Red',        'S',  'Thrifted',      NOW() - INTERVAL 10 DAY),
  (@sofia, 'Mary Jane Shoes',       'Shoes',       'Burgundy',   '7',  'Dr. Martens',   NOW() - INTERVAL 9 DAY),
  (@sofia, 'Suede Fringe Jacket',   'Outerwear',   'Brown',      'S',  'Thrifted',      NOW() - INTERVAL 4 DAY);

-- ---------------------------------------------------------------- favorites
INSERT INTO Favorites (user_id, clothing_id)
  SELECT user_id, clothing_id FROM Clothing
  WHERE (user_id = @test   AND name IN ('Denim Jacket', 'White Sneakers', 'Navy Crewneck Sweater'))
     OR (user_id = @maya   AND name IN ('Oversized Hoodie', 'Cargo Pants', 'Combat Boots', 'Corduroy Jacket'))
     OR (user_id = @jordan AND name IN ('Air Max 90', 'Tech Fleece Joggers'))
     OR (user_id = @priya  AND name IN ('Wool Coat'))
     OR (user_id = @marcus AND name IN ('Black Turtleneck', 'Wool Overcoat'))
     OR (user_id = @sofia  AND name IN ('Suede Fringe Jacket', 'Floral Button Up'));

-- ---------------------------------------------------------------- outfits
-- Each outfit: insert it, grab its id, then link the owner's items by name.
INSERT INTO Outfits (user_id, outfit_name, description) VALUES (@test, 'Weekend Casual', 'Easy outfit for running errands');
SET @o = LAST_INSERT_ID();
INSERT INTO Outfit_Items (outfit_id, clothing_id) SELECT @o, clothing_id FROM Clothing
  WHERE user_id = @test AND name IN ('Gray Graphic Tee', 'Dark Wash Jeans', 'White Sneakers', 'Denim Jacket');

INSERT INTO Outfits (user_id, outfit_name, description) VALUES (@test, 'Class Presentation', 'Smart casual for presenting in class');
SET @o = LAST_INSERT_ID();
INSERT INTO Outfit_Items (outfit_id, clothing_id) SELECT @o, clothing_id FROM Clothing
  WHERE user_id = @test AND name IN ('White Oxford Shirt', 'Navy Crewneck Sweater', 'Khaki Chinos', 'Brown Chelsea Boots', 'Leather Belt');

INSERT INTO Outfits (user_id, outfit_name, description) VALUES (@test, 'Cold Morning', 'Layered up for early winter');
SET @o = LAST_INSERT_ID();
INSERT INTO Outfit_Items (outfit_id, clothing_id) SELECT @o, clothing_id FROM Clothing
  WHERE user_id = @test AND name IN ('Navy Crewneck Sweater', 'Black Joggers', 'White Sneakers', 'Black Puffer Jacket');

INSERT INTO Outfits (user_id, outfit_name, description) VALUES (@maya, 'Coffee Shop Fit', 'Comfy layers for studying');
SET @o = LAST_INSERT_ID();
INSERT INTO Outfit_Items (outfit_id, clothing_id) SELECT @o, clothing_id FROM Clothing
  WHERE user_id = @maya AND name IN ('Oversized Hoodie', 'Wide Leg Jeans', 'Chunky Platform Sneakers', 'Canvas Tote Bag');

INSERT INTO Outfits (user_id, outfit_name, description) VALUES (@maya, 'Concert Night', NULL);
SET @o = LAST_INSERT_ID();
INSERT INTO Outfit_Items (outfit_id, clothing_id) SELECT @o, clothing_id FROM Clothing
  WHERE user_id = @maya AND name IN ('Cropped Baby Tee', 'Pleated Mini Skirt', 'Combat Boots', 'Corduroy Jacket');

INSERT INTO Outfits (user_id, outfit_name, description) VALUES (@maya, 'Fall Walk', 'Earth tones for the park');
SET @o = LAST_INSERT_ID();
INSERT INTO Outfit_Items (outfit_id, clothing_id) SELECT @o, clothing_id FROM Clothing
  WHERE user_id = @maya AND name IN ('Striped Long Sleeve', 'Cargo Pants', 'Combat Boots', 'Beanie');

INSERT INTO Outfits (user_id, outfit_name, description) VALUES (@jordan, 'Gym Day', 'Training session outfit');
SET @o = LAST_INSERT_ID();
INSERT INTO Outfit_Items (outfit_id, clothing_id) SELECT @o, clothing_id FROM Clothing
  WHERE user_id = @jordan AND name IN ('Dri-FIT Training Tee', 'Running Shorts', 'Air Max 90');

INSERT INTO Outfits (user_id, outfit_name, description) VALUES (@jordan, 'Game Day', 'Watching the game with friends');
SET @o = LAST_INSERT_ID();
INSERT INTO Outfit_Items (outfit_id, clothing_id) SELECT @o, clothing_id FROM Clothing
  WHERE user_id = @jordan AND name IN ('Quarter Zip Pullover', 'Tech Fleece Joggers', 'Air Max 90', 'Baseball Cap');

INSERT INTO Outfits (user_id, outfit_name, description) VALUES (@priya, 'Interview Ready', 'Polished business casual');
SET @o = LAST_INSERT_ID();
INSERT INTO Outfit_Items (outfit_id, clothing_id) SELECT @o, clothing_id FROM Clothing
  WHERE user_id = @priya AND name IN ('Silk Blouse', 'Tailored Trousers', 'Pointed Flats', 'Wool Coat');

INSERT INTO Outfits (user_id, outfit_name, description) VALUES (@marcus, 'All Black', 'Monochrome evening look');
SET @o = LAST_INSERT_ID();
INSERT INTO Outfit_Items (outfit_id, clothing_id) SELECT @o, clothing_id FROM Clothing
  WHERE user_id = @marcus AND name IN ('Black Turtleneck', 'Slim Black Jeans', 'Leather Low Tops', 'Wool Overcoat');

INSERT INTO Outfits (user_id, outfit_name, description) VALUES (@sofia, 'Thrift Haul Debut', 'Showing off this week''s finds');
SET @o = LAST_INSERT_ID();
INSERT INTO Outfit_Items (outfit_id, clothing_id) SELECT @o, clothing_id FROM Clothing
  WHERE user_id = @sofia AND name IN ('Floral Button Up', 'High Waist Mom Jeans', 'Mary Jane Shoes', 'Suede Fringe Jacket');

-- ---------------------------------------------------------------- shared outfits
-- visibility must be 'public' or 'private' (routes/sharing.js); one share per outfit per user.
INSERT INTO Shared_Outfits (outfit_id, user_id, visibility)
  SELECT outfit_id, user_id, 'public' FROM Outfits
  WHERE (user_id = @test   AND outfit_name = 'Weekend Casual')
     OR (user_id = @maya   AND outfit_name IN ('Coffee Shop Fit', 'Fall Walk'))
     OR (user_id = @jordan AND outfit_name = 'Game Day')
     OR (user_id = @sofia  AND outfit_name = 'Thrift Haul Debut');

INSERT INTO Shared_Outfits (outfit_id, user_id, visibility)
  SELECT outfit_id, user_id, 'private' FROM Outfits
  WHERE (user_id = @test  AND outfit_name = 'Class Presentation')
     OR (user_id = @maya  AND outfit_name = 'Concert Night');

-- ---------------------------------------------------------------- summary
SELECT u.email, u.verified, u.two_factor_enabled AS twofa, u.role,
       (SELECT COUNT(*) FROM Clothing c  WHERE c.user_id = u.user_id) AS clothing,
       (SELECT COUNT(*) FROM Favorites f WHERE f.user_id = u.user_id) AS favorites,
       (SELECT COUNT(*) FROM Outfits o   WHERE o.user_id = u.user_id) AS outfits
FROM Users u
WHERE u.email LIKE '%@example.com'
ORDER BY u.user_id;

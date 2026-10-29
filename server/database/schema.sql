-- Wardrobe Maker - Sprint 2 database schema (MySQL 8 / MariaDB)
-- Run with:  mysql -u root -p < database/schema.sql
-- or:        npm run db:setup

CREATE DATABASE IF NOT EXISTS wardrobe_maker;
USE wardrobe_maker;

CREATE TABLE IF NOT EXISTS Users (
  user_id        INT AUTO_INCREMENT PRIMARY KEY,
  first_name     VARCHAR(50)  NOT NULL,
  last_name      VARCHAR(50)  NOT NULL,
  email          VARCHAR(100) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  date_of_birth  DATE,
  role           VARCHAR(20)  NOT NULL DEFAULT 'user',   -- 'user' or 'admin'
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  verified        BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS User_Profile (
  profile_id     INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT NOT NULL UNIQUE,
  height         DECIMAL(5,2),
  clothing_size  VARCHAR(20),
  preferences    TEXT,
  profile_image  VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Sessions (
  session_id     INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT NOT NULL,
  session_token  VARCHAR(255) NOT NULL UNIQUE,            -- SHA-256 hash of the token given to the app
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at     DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- One pending email-verification code per user (account verification only, for now).
-- Existing databases: run database/add_verification.sql instead of re-running this file.
CREATE TABLE IF NOT EXISTS Verification (
  user_id            INT NOT NULL PRIMARY KEY,
  verification_code  VARCHAR(255) NOT NULL,        -- bcrypt hash of the 6-digit code; the code itself is only ever in the email
  attempts           INT NOT NULL DEFAULT 0,       -- wrong guesses so far (max 5)
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- when the code was last sent; used for the 60 s resend cooldown
  expires_at         DATETIME NOT NULL,            -- 15 minutes after created_at
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Clothing (
  clothing_id    INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT NOT NULL,
  name           VARCHAR(100) NOT NULL,
  category       VARCHAR(50),
  color          VARCHAR(50),
  size           VARCHAR(20),
  brand          VARCHAR(100),
  image_url      VARCHAR(255),
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Favorites (
  favorite_id    INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT NOT NULL,
  clothing_id    INT NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES Users(user_id)       ON DELETE CASCADE,
  FOREIGN KEY (clothing_id) REFERENCES Clothing(clothing_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Outfits (
  outfit_id      INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT NOT NULL,
  outfit_name    VARCHAR(100) NOT NULL,
  description    TEXT,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Outfit_Items (
  outfit_item_id INT AUTO_INCREMENT PRIMARY KEY,
  outfit_id      INT NOT NULL,
  clothing_id    INT NOT NULL,
  FOREIGN KEY (outfit_id)   REFERENCES Outfits(outfit_id)    ON DELETE CASCADE,
  FOREIGN KEY (clothing_id) REFERENCES Clothing(clothing_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Shared_Outfits (
  share_id       INT AUTO_INCREMENT PRIMARY KEY,
  outfit_id      INT NOT NULL,
  user_id        INT NOT NULL,
  shared_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  visibility     VARCHAR(20) NOT NULL DEFAULT 'public',
  FOREIGN KEY (outfit_id) REFERENCES Outfits(outfit_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES Users(user_id)     ON DELETE CASCADE
);

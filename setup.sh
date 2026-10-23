#!/usr/bin/env bash
# Installs frontend and backend dependencies and creates server/.env if it does not exist.
# Usage (from the repository root):  bash setup.sh
set -e

echo "Installing frontend dependencies..."
npm install

echo "Installing backend dependencies..."
(cd server && npm install)

if [ ! -f server/.env ]; then
  touch server/.env
  cp server/.env.example server/.env
  echo "Created server/.env. Open it and set DB_USER and DB_PASSWORD."
fi

echo ""
echo "Next steps:"
echo "  1. Make sure MySQL is running and server/.env has your database login."
echo "  2. cd server && npm run db:setup   (creates the tables)"
echo "  3. npm start                       (starts the API on port 3000)"
echo "  4. In a second terminal, from the repository root: npm start   (Expo app)"

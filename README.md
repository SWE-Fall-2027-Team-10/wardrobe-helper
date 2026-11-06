# Wardrobe Maker

**Software Engineering Project, Georgia State University, Fall 2026 (Team 10)**

Wardrobe Maker is a mobile app that gives users one place to catalog the clothes they own, build and save outfits, search for new pieces, share outfits with others, and get AI styling help.

## Team

| Member | Main responsibilities |
|---|---|
| O'Neal Madom Madom | Sprint 2 coordinator, requirements, user management, database integration |
| Andrew Jenkins | User auth, SQL Schema design, App Customization |
| Amaaz Lakhani | Backend development, database, API development |
| Ezekiel Babara | Activity diagrams, frontend development, testing |
| Japroz Singh Saini | Context diagram, database design, documentation, Clothing upload and Outfit creation |

Guide: Dr. Tushara Sadasivuni

## Tech stack

| Layer | Technology |
|---|---|
| Mobile frontend | React Native with Expo (TypeScript), React Navigation |
| Backend | Node.js with Express (JavaScript) |
| Database | MySQL 8 (MariaDB also works) |
| API style | REST, JSON, token-based sessions |
| Version control | Git and GitHub |

## Project status (Sprint 2)

| Feature | Status |
|---|---|
| User registration, login, logout, session handling (UC-01 to UC-03) | Working in the backend API |
| Account and profile management (UC-04) | Working in the backend API |
| Upload clothing, search and filter clothing (UC-05, UC-06) | Working in the backend API |
| Database schema (8 tables) | Created by `schema.sql` |
| Mobile screens for registration, login, and wardrobe | In progress |
| Favorites, outfits, sharing, AI Wardrobe Advice (UC-07 to UC-10) | Designed, planned for later sprints |

## Repository layout

```
wardrobe-app/
├── App.tsx, index.ts, app.json   Expo app entry and configuration
├── assets/                       App images and icons
├── package.json                  Frontend dependencies and scripts
├── setup.sh                      One-step install script
└── server/                       Backend
    ├── database/schema.sql       All table definitions
    ├── src/index.js              Express app
    ├── src/auth.js               Session creation and login checks
    ├── src/db.js                 MySQL connection pool
    ├── src/setupDb.js            Runs schema.sql (npm run db:setup)
    ├── src/routes/auth.js        Register, login, logout, account
    ├── src/routes/clothing.js    Clothing upload, search, delete
    └── .env.example              Database settings template
```

## How to compile and run

No IDE is needed. Everything runs from a terminal. Pick the section for your operating system, then continue with **Running the mobile app** and **Troubleshooting** below.

### What you need installed

| | Linux | macOS | Windows |
|---|---|---|---|
| Node.js 18+ | `nodejs.org` or your package manager | `brew install node` | LTS installer from `nodejs.org` |
| MySQL 8 (or MariaDB) | see below | `brew install mysql` | MySQL Installer from `dev.mysql.com` (choose MySQL Server 8.0, optionally Workbench) |
| Git | package manager | `brew install git` | Git for Windows from `git-scm.com` |

Check Node with `node -v`. It must print 18 or higher.

### Linux and macOS

**1. Get the code and install dependencies**

```bash
git clone https://github.com/thatguy-aj/wardrobe-app.git
cd wardrobe-app
bash setup.sh          # installs frontend and backend dependencies, creates server/.env
```

Without the script, run `npm install`, then `cd server && npm install && cp .env.example .env`.

**2. Start MySQL**

- Fedora: `sudo dnf install mariadb-server` then `sudo systemctl enable --now mariadb`
- Ubuntu or Debian: `sudo apt install mariadb-server` then `sudo systemctl enable --now mariadb`
- macOS: `brew services start mysql`

**3. Create a database account**

Open an admin session with `sudo mysql` (Linux) or `mysql -u root` (macOS, empty root password by default). If your root account has a password, use `mysql -u root -p`. Then run:

```sql
CREATE USER 'wardrobe'@'localhost' IDENTIFIED BY 'choose_a_password';
GRANT ALL PRIVILEGES ON wardrobe_maker.* TO 'wardrobe'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**4. Configure the server**

Edit `server/.env` (created by `setup.sh`, or by `cp env.example .env`) and set:

```
DB_USER=wardrobe
DB_PASSWORD=choose_a_password
```

The `.env` file is ignored by Git and must never be committed.

**5. Create the tables and start the API**

```bash
cd server
npm run db:setup       # creates the wardrobe_maker database and 8 tables from database/schema.sql
npm start              # API on http://localhost:3000
```

### Windows

Use **PowerShell** (or Git Bash, where the Linux and macOS commands above also work).

**1. Get the code and install dependencies**

```powershell
git clone https://github.com/thatguy-aj/wardrobe-app.git
cd wardrobe-app
npm install
cd server
npm install
copy .env.example .env
```

`setup.sh` is a bash script, so on Windows either run it from Git Bash or use the commands above.

**2. Make sure MySQL is running**

The MySQL Installer sets MySQL up as a Windows service that starts automatically. To check, open the Start menu, type `Services`, and look for `MySQL80` with status Running.

**3. Create a database account**

The `mysql` command is usually not on the Windows PATH. Open **MySQL 8.0 Command Line Client** from the Start menu and enter the root password you chose during installation (or use MySQL Workbench and run the statements in a query tab). Then run:

```sql
CREATE USER 'wardrobe'@'localhost' IDENTIFIED BY 'choose_a_password';
GRANT ALL PRIVILEGES ON wardrobe_maker.* TO 'wardrobe'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**4. Configure the server**

Open `server\.env` in Notepad (`notepad .env` from the `server` folder) and set:

```
DB_USER=wardrobe
DB_PASSWORD=choose_a_password
```

Use letters and numbers in the password, because characters such as `#` or quotes can break the `.env` file. Never commit `.env`.

**5. Create the tables and start the API**

```powershell
npm run db:setup
npm start
```

If Windows Firewall asks about Node.js the first time, click **Allow access**. This is needed for a phone to reach the API.

### Check that the API works

On any system, open http://localhost:3000/api/health in a browser. It should show `{"status":"ok"}`.

### Running the mobile app

Leave the API running, open a second terminal in the repository root, and run:

```bash
npm start
```

Open the app with Expo Go on a phone or with an emulator from the Expo prompt. A phone cannot reach `localhost` on your computer, so when the app calls the API use your computer's local IP address as the base URL, for example `http://192.168.1.20:3000/api`, with both devices on the same Wi-Fi network. Find the IP with `hostname -I` (Linux), `ipconfig getifaddr en0` (macOS), or `ipconfig` (Windows, look for IPv4 Address).

### Troubleshooting

| Problem | Fix |
|---|---|
| `ECONNREFUSED` during `npm run db:setup` | MySQL is not running. Start it (step 2) and retry. |
| `Access denied for user` | The `DB_USER` or `DB_PASSWORD` in `server/.env` does not match the account you created. |
| Windows: `running scripts is disabled on this system` | In PowerShell run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, then retry. |
| Windows: `mysql` is not recognized | Use MySQL 8.0 Command Line Client or MySQL Workbench instead of the plain terminal. |
| Port 3000 already in use | Stop the other program, or set `PORT=3001` in `server/.env`. |
| Phone cannot reach the API | Use the computer's local IP, not `localhost`, and allow Node.js through the firewall. |

## API reference

All requests and responses are JSON. Protected routes need the header `Authorization: Bearer <token>`, where the token comes from login.

| Method | Path | Description | Body or query |
|---|---|---|---|
| POST | `/api/auth/register` | Create an account | `first_name`, `last_name`, `email`, `password` (8+ characters), optional `date_of_birth` |
| POST | `/api/auth/login` | Log in, returns `token` | `email`, `password` |
| POST | `/api/auth/logout` | End the current session (protected) | none |
| GET | `/api/auth/me` | Account and profile (protected) | none |
| PUT | `/api/auth/me` | Update account or profile (protected) | any of `first_name`, `last_name`, `date_of_birth`, `height`, `clothing_size`, `preferences`, `profile_image` |
| POST | `/api/clothing` | Add a clothing item (protected) | `name`, `category` required; `color`, `size`, `brand`, `image_url` |
| GET | `/api/clothing` | List, search, filter your clothing (protected) | optional `q`, `category`, `color` |
| DELETE | `/api/clothing/:id` | Remove a clothing item (protected) | none |

### Quick test from the terminal

**Linux, macOS, or Git Bash**

```bash
B=http://localhost:3000/api
H='Content-Type: application/json'

# Register, then log in and save the token
curl -s -X POST $B/auth/register -H "$H" -d '{"first_name":"Demo","last_name":"User","email":"demo@example.com","password":"password123"}'
TOKEN=$(curl -s -X POST $B/auth/login -H "$H" -d '{"email":"demo@example.com","password":"password123"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')

# Add and search clothing
curl -s -X POST $B/clothing -H "Authorization: Bearer $TOKEN" -H "$H" -d '{"name":"Blue Hoodie","category":"Tops","color":"blue"}'
curl -s "$B/clothing?q=hood" -H "Authorization: Bearer $TOKEN"

# Log out
curl -s -X POST $B/auth/logout -H "Authorization: Bearer $TOKEN"
```

**Windows PowerShell**

```powershell
$B = "http://localhost:3000/api"

# Register, then log in and save the token
Invoke-RestMethod -Method Post -Uri "$B/auth/register" -ContentType "application/json" -Body '{"first_name":"Demo","last_name":"User","email":"demo@example.com","password":"password123"}'
$login = Invoke-RestMethod -Method Post -Uri "$B/auth/login" -ContentType "application/json" -Body '{"email":"demo@example.com","password":"password123"}'
$auth = @{ Authorization = "Bearer $($login.token)" }

# Add and search clothing
Invoke-RestMethod -Method Post -Uri "$B/clothing" -Headers $auth -ContentType "application/json" -Body '{"name":"Blue Hoodie","category":"Tops","color":"blue"}'
Invoke-RestMethod -Uri "$B/clothing?q=hood" -Headers $auth

# Log out
Invoke-RestMethod -Method Post -Uri "$B/auth/logout" -Headers $auth
```

Postman or Thunder Client (VS Code) also work on every system.

## Database

MySQL with eight tables: `Users`, `User_Profile`, `Sessions`, `Clothing`, `Favorites`, `Outfits`, `Outfit_Items`, and `Shared_Outfits`. Primary and foreign keys are defined in `server/database/schema.sql`, and deleting a user removes their related rows.

## Security notes

- Passwords are stored as bcrypt hashes, never as plain text.
- Only a SHA-256 hash of each session token is stored in the `Sessions` table. Sessions expire after `SESSION_HOURS` (default 24) and are deleted at logout.
- Each user can only see and change their own clothing.

## Documentation

The full Sprint 2 report covers the revised problem statement, context and activity diagrams, use cases, requirements, use case diagram, database design, and screenshots.

## License

MIT. See [LICENSE](LICENSE).

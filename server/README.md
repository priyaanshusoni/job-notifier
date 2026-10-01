# Job Notifier — Server

Express + Prisma + Gemini AI backend that scrapes jobs, scores them with AI, and delivers alerts via Telegram.

## Prerequisites

- Node.js >= 18
- PostgreSQL database (local or hosted, e.g. [Neon](https://neon.tech))
- [JSearch API key](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) (RapidAPI)
- [Gemini API key](https://ai.google.dev/)
- Telegram bot token (via [@BotFather](https://t.me/BotFather))

## Setup

### 1. Install dependencies

```bash
cd server
npm install
```

### 2. Configure environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env.development
```

| Variable         | Description                              |
| ---------------- | ---------------------------------------- |
| `PORT`           | Server port (default `3000`)             |
| `DATABASE_URL`   | PostgreSQL connection string             |
| `JWT_SECRET`     | Secret for signing auth tokens (min 32 chars) |
| `ENCRYPTION_KEY` | 32-char key for AES-256 Telegram token encryption |
| `JSEARCH_API_KEY`| RapidAPI key for JSearch                 |
| `GEMINI_API_KEY` | Google Gemini API key                    |

The server loads `.env.{NODE_ENV}` automatically — `.env.development` for dev, `.env.production` for prod.

### 3. Setup database

```bash
npx prisma migrate dev
```

To seed with sample data (optional):

```bash
npx prisma db seed
```

### 4. Start dev server

```bash
npm run dev
```

Server runs at `http://localhost:3000` with hot-reload via `tsx watch`.

## Scripts

| Command           | Description                                        |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Start dev server with hot-reload (uses `.env.development`) |
| `npm run build`   | Generate Prisma client + compile TypeScript         |
| `npm start`       | Run migrations + start production server (uses `.env.production`) |
| `npm run dev:debug` | Dev server with Express debug logging             |

## API Endpoints

### Public

| Method | Path            | Description                                          |
| ------ | --------------- | ---------------------------------------------------- |
| GET    | `/health`       | Health check (verifies DB)                           |
| POST   | `/auth/signup`  | Create account (no session — sign in afterwards)     |
| POST   | `/auth/login`   | Issues 1-day access + 7-day refresh httpOnly cookies |
| POST   | `/auth/refresh` | Exchanges refresh cookie for a fresh access token    |
| POST   | `/auth/logout`  | Revokes the refresh token and clears cookies         |

Auth tokens are httpOnly cookies. Access tokens live 1 day; refresh tokens live
7 days and are stored hashed in the DB, so the server can revoke sessions.
After 7 days the user must log in again.

### Protected (requires `Authorization: Bearer <token>`)

| Method | Path                        | Description                                    |
| ------ | --------------------------- | ---------------------------------------------- |
| GET    | `/auth/me`                  | Current user (restores session on page load)  |
| PATCH  | `/auth/complete-onboarding` | Mark user as onboarded                         |
| GET    | `/preferences`              | Get user preferences                           |
| POST   | `/preferences`              | Create/update preferences (validated)          |
| GET    | `/telegram/config`          | Get Telegram config (token masked)             |
| POST   | `/telegram/config`          | Save Telegram bot token + chat ID              |
| POST   | `/telegram/test`            | Send a real test message                       |
| POST   | `/jobs/trigger`             | Manually run the job pipeline (rate limited)   |
| GET    | `/jobs/history`             | Job history with filters (`minScore`, `status`, `source`, `decision`) |
| PATCH  | `/jobs/:id/status`          | Feedback: `saved` / `dismissed` / `applied` / `not_relevant` |
| GET    | `/jobs/pipeline/status`     | Last run stats + next scheduled run            |
| POST   | `/jobs/:id/explain`         | AI fit analysis (pros/cons/missing skills)     |
| POST   | `/ai/search-profile`        | Search copilot: plain text → structured prefs  |
| GET/POST/DELETE | `/ai/resume`       | Resume-aware ranking (encrypted at rest)       |

## Job Pipeline Flow

1. **Search** — Query is built from each user's preferences (roles, locations, recency); identical profiles are fetched once per run
2. **Deduplicate** — Canonical `Job` records are shared; per-user `UserJob` rows track what each user has been evaluated on
3. **Pre-filter** — Deterministic rules (excluded keywords/companies, location, must-have skills, salary) reject jobs before any AI spend
4. **Score** — Gemini scores each surviving job 0–100 against a rubric (role 40 / skills 30 / location 15 / salary 10 / experience 5), anchored by job ID
5. **Notify** — Jobs at or above the user's threshold are saved first, then delivered (digest or per-job); failed sends retry on the next run

The pipeline runs via cron at **12:00 PM IST daily** (guarded by a DB lock against concurrent runs) and can be triggered manually from the dashboard.

## Project Structure

```
server/
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── migrations/          # Migration history
│   └── seed.ts              # Seed script
├── src/
│   ├── config/              # Env loading + config provider
│   ├── lib/                 # Prisma client, crypto utils
│   ├── middlewares/         # Auth, error handler, rate limiting
│   └── modules/
│       ├── auth/            # Signup, login, onboarding
│       ├── preferences/     # Job preference CRUD
│       ├── telegram/        # Telegram config CRUD
│       ├── scrapers/        # JSearch API integration
│       ├── matcher/         # Gemini AI job scoring
│       ├── notifier/        # Telegram message sender
│       └── scheduler/       # Cron + pipeline orchestration
├── prisma.config.ts
├── tsconfig.json
└── package.json
```

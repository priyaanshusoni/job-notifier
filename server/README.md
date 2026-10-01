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

| Method | Path      | Description    |
| ------ | --------- | -------------- |
| GET    | `/health` | Health check   |
| POST   | `/auth/signup` | Register  |
| POST   | `/auth/login`  | Login     |

### Protected (requires `Authorization: Bearer <token>`)

| Method | Path                      | Description                     |
| ------ | ------------------------- | ------------------------------- |
| PATCH  | `/auth/complete-onboarding` | Mark user as onboarded        |
| GET    | `/preferences`            | Get user preferences            |
| POST   | `/preferences`            | Create/update preferences       |
| GET    | `/telegram/config`        | Get Telegram config             |
| POST   | `/telegram/config`        | Save Telegram bot token + chat ID |
| GET    | `/jobs/trigger`           | Manually run the job pipeline   |
| GET    | `/jobs/history`           | Get matched job history (last 50) |

## Job Pipeline Flow

1. **Scrape** — Fetches jobs from JSearch API based on user's preferred roles and locations
2. **Deduplicate** — Filters out jobs the user has already seen (stored in `SeenJob` table)
3. **Score** — Sends new jobs + user preferences to Gemini AI, scores each 0–100
4. **Notify** — Jobs scoring >= 75 are sent as Telegram messages and saved to history

The pipeline runs automatically via cron at **12:00 PM IST daily** and can also be triggered manually from the dashboard.

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

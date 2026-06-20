# OBD2 Data Logger

Node.js + Express backend and web dashboard for logging real-time OBD2 data from
a Ford Focus 2011. An Android app POSTs sensor readings over cellular; this server
stores them in MySQL and serves an editorial light-themed dashboard (vanilla JS + Chart.js).

## Run locally

```bash
npm install
cp .env.example .env   # edit DB creds + DASHBOARD_PIN
npm start
```

Open http://localhost:3000 and enter the PIN.

## Environment

| Var | Notes |
|---|---|
| `DATABASE_URL` | MySQL connection string. Takes priority (Railway sets this). |
| `MYSQL_HOST/PORT/USER/PASSWORD/DATABASE` | Fallback when `DATABASE_URL` is unset. |
| `DASHBOARD_PIN` | Shared PIN for dashboard access. |
| `PORT` | Server port (Railway assigns automatically). |

The `readings` table is created automatically on startup (`CREATE TABLE IF NOT EXISTS`).

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | no | Health check. |
| POST | `/data` | no | Ingest one reading packet from the Android app. |
| POST | `/auth/login` | no | Set PIN cookie. |
| GET | `/api/trips` | PIN | All trips with aggregates, newest first. |
| GET | `/api/trips/:id` | PIN | Time series for one trip (`?fields=rpm,speed_kmh`). |
| GET | `/api/live` | PIN | Latest reading + `is_live`. |
| GET | `/api/stats` | PIN | Overall stats. |

### POST /data
Flat JSON with an ISO `timestamp` plus any whitelisted PID keys. Unknown keys are
ignored; the server assigns `trip_id` (new trip after a 120s gap). Returns
`{ "received": true }`.

## Deploy to Railway
1. Create a service from this repo and add the **MySQL** plugin (`DATABASE_URL` is injected).
2. Set `DASHBOARD_PIN`.
3. Railway runs `npm start` and health-checks `/health`. No manual migration needed.

## Security notes
- All `POST /data` keys are validated against a hardcoded column whitelist
  (`utils/columnWhitelist.js`); every query is parameterized.
- Dashboard + `/api/*` are gated by a PIN cookie (sha256, httpOnly, 30 days).
- `POST /data` and `/health` are intentionally unauthenticated for the Android app.

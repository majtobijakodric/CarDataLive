# CarDataLive — OBD-II Telemetry

Node.js + Express backend and web dashboard for logging real-time OBD-II data from
a **Ford Focus 2011 (1.6 Ti-VCT)**. An Android app POSTs sensor readings over
cellular; this server stores them in MySQL/MariaDB and serves an editorial
light-themed dashboard (vanilla JS + Chart.js — no build step, no framework).

- **Live** — latest reading with hero speed/RPM, sparklines, and a filterable grid
  of every reported PID, grouped by system.
- **Trips** — every recorded trip with aggregates; click one for a multi-PID,
  dual-axis time-series chart.
- **Stats** — overall totals plus avg-speed-per-trip and fuel-rate-trend charts.

---

## Table of contents

- [Architecture](#architecture)
- [Quick start (production-style)](#quick-start-production-style)
- [Local development](#local-development)
  - [Option A — system MySQL/MariaDB](#option-a--system-mysqlmariadb)
  - [Option B — userspace MariaDB (no root)](#option-b--userspace-mariadb-no-root)
  - [Running the server](#running-the-server)
  - [Seeding demo data](#seeding-demo-data)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [How trip detection works](#how-trip-detection-works)
- [Deploy to Railway](#deploy-to-railway)
- [Security notes](#security-notes)
- [Project layout](#project-layout)

---

## Architecture

```
Android app ──POST /data──▶  Express server ──▶  MySQL/MariaDB (readings table)
                                   │
   Browser ◀──dashboard + /api──────┘   (PIN-cookie protected)
```

- **One table, `readings`** — one row per reading packet, ~120 nullable PID columns.
  Created automatically on startup (`CREATE TABLE IF NOT EXISTS`); there are no
  migrations.
- **The server assigns `trip_id`** — the Android app does not send one. A gap of
  more than 120 s between consecutive readings starts a new trip
  (see [How trip detection works](#how-trip-detection-works)).
- **The dashboard is static** — plain HTML/CSS/JS under `public/`, served by
  Express. Chart.js is loaded from a CDN. There is nothing to compile.

---

## Quick start (production-style)

This mirrors how the app runs on Railway, where the platform injects environment
variables (so no `.env` file is read — see [Local development](#local-development)
for the `.env` workflow).

```bash
npm install

# Provide config via real environment variables, then:
MYSQL_HOST=localhost MYSQL_USER=root MYSQL_PASSWORD=secret \
MYSQL_DATABASE=obd2logger DASHBOARD_PIN=7429 \
npm start
```

Open <http://localhost:3000> and enter the PIN.

> **Note:** `npm start` runs `node server.js` and does **not** load a `.env` file —
> the app has no `dotenv` dependency on purpose (Railway provides env vars
> directly). For local work, use `npm run dev`, which loads `.env` for you.

---

## Local development

You need a MySQL-compatible database and Node **20.6+** (for the `--env-file`
flag used by `npm run dev`).

First, create your local config file:

```bash
cp .env.example .env
```

Then pick **one** of the two database options below and point `.env` at it.

### Option A — system MySQL/MariaDB

Use this if you already run MySQL/MariaDB as a system service and have admin
access to it.

```bash
# Create the database and a dedicated app user (run as a DB admin):
mysql -u root -p <<'SQL'
CREATE DATABASE IF NOT EXISTS obd2logger CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS 'obd'@'127.0.0.1' IDENTIFIED BY 'obdpass';
GRANT ALL PRIVILEGES ON obd2logger.* TO 'obd'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
```

`.env`:

```ini
DATABASE_URL=mysql://obd:obdpass@127.0.0.1:3306/obd2logger
DASHBOARD_PIN=7429
PORT=3000
```

The `readings` table is created automatically the first time the server starts.

### Option B — userspace MariaDB (no root)

Use this when MariaDB is installed but its system service is root-only (e.g. Arch/
Manjaro default `unix_socket` auth, where only the OS root user can log in as the
DB `root`). This runs a **second, self-contained MariaDB instance** as your normal
user — its own data directory, its own port (**3307**), no `sudo` required. It does
not touch the system instance on 3306.

```bash
# 1. Initialise a private data directory (one time)
DBDIR=~/.local/share/cardatalive-db
mkdir -p "$DBDIR"
mariadb-install-db --no-defaults \
  --datadir="$DBDIR/data" \
  --auth-root-authentication-method=normal \
  --skip-test-db

# 2. Start the instance on port 3307 (leave this running, or use nohup/&)
mariadbd --no-defaults \
  --datadir="$DBDIR/data" \
  --socket="$DBDIR/mysql.sock" \
  --port=3307 \
  --bind-address=127.0.0.1 \
  --pid-file="$DBDIR/mysql.pid" &

# 3. Create the database and app user (connects over the local socket)
mariadb --no-defaults -u root --socket="$DBDIR/mysql.sock" <<'SQL'
CREATE DATABASE IF NOT EXISTS obd2logger CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS 'obd'@'127.0.0.1' IDENTIFIED BY 'obdpass';
GRANT ALL PRIVILEGES ON obd2logger.* TO 'obd'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
```

`.env` (note port **3307**):

```ini
DATABASE_URL=mysql://obd:obdpass@127.0.0.1:3307/obd2logger
DASHBOARD_PIN=7429
PORT=3000
```

**Stopping the userspace instance:**

```bash
mariadb-admin --no-defaults -u root \
  --socket=$HOME/.local/share/cardatalive-db/mysql.sock shutdown
```

The data persists in `~/.local/share/cardatalive-db`, so on later sessions you only
repeat **step 2** (start it again) — skip the one-time init and database creation.

### Running the server

```bash
npm run dev      # node --env-file=.env server.js  → loads .env, then starts
```

You should see:

```
[db] schema ready
OBD2 server listening on port 3000
```

Open <http://localhost:3000> and enter your `DASHBOARD_PIN`. A successful login
sets an httpOnly cookie and redirects to the dashboard.

> If the server logs `EADDRINUSE: address already in use :::3000`, another process
> already holds the port — stop it, or set a different `PORT` in `.env`.

### Seeding demo data

A fresh database shows an empty dashboard. To see it populated, feed readings
through the **real** ingestion endpoint (`POST /data`) — the same path the Android
app uses, so `trip_id` assignment and aggregates behave exactly as in production.

Minimal example — one live reading:

```bash
curl -X POST http://localhost:3000/data \
  -H 'Content-Type: application/json' \
  -d "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",\"speed_kmh\":64,\"rpm\":2100,\"engine_load_pct\":41.2,\"coolant_temp_c\":88,\"throttle_pct\":18}"
```

A reading whose `timestamp` is within the last 10 s makes the Live tab show as
**live** (`is_live: true`); older readings show as offline. To populate trips and
stats, POST a series of readings with timestamps spaced **more than 120 s apart
between trips** and close together within a trip. POSTing a fresh reading every
second produces a continuously "live" dashboard for demos.

> Only keys present in `utils/columnWhitelist.js` are stored; any others are
> silently ignored. `timestamp` is required and must be a valid ISO date.

---

## Environment variables

The database can be configured **either** with a single connection string **or**
with individual variables. A connection string wins when present.

| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | — | MySQL connection string `mysql://user:pass@host:port/db`. Takes priority. Railway's MySQL plugin sets this automatically. |
| `MYSQL_URL` | — | Alternative connection-string variable, also honoured. |
| `MYSQL_HOST` / `MYSQL_PORT` | — | Fallback host/port when no connection string is set (defaults `localhost` / `3306`). `MYSQLHOST` / `MYSQLPORT` (Railway's names) also accepted. |
| `MYSQL_USER` / `MYSQL_PASSWORD` | — | Fallback credentials (defaults `root` / empty). `MYSQLUSER` / `MYSQLPASSWORD` also accepted. |
| `MYSQL_DATABASE` | — | Fallback database name (default `obd2logger`). `MYSQLDATABASE` also accepted. |
| `DASHBOARD_PIN` | **yes** | Shared PIN for dashboard/API access. |
| `PORT` | — | Server port (default `3000`; Railway assigns automatically). |

See `.env.example` for a copy-paste template.

---

## API reference

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | none | Health check (`{ "status": "ok" }`). |
| POST | `/data` | none | Ingest one reading packet from the Android app. |
| POST | `/auth/login` | none | Validate PIN, set the auth cookie. |
| POST | `/auth/logout` | none | Clear the auth cookie. |
| GET | `/api/live` | PIN | Latest reading + `is_live` flag. |
| GET | `/api/trips` | PIN | All trips with aggregates, newest first. |
| GET | `/api/trips/:id` | PIN | Full time series for one trip (`?fields=rpm,speed_kmh` to limit columns). |
| GET | `/api/stats` | PIN | Overall stats across all trips. |

### `POST /data`

Flat JSON with an ISO `timestamp` plus any whitelisted PID keys. Unknown keys are
ignored; empty strings become `NULL`. The server assigns `trip_id`. Returns
`{ "received": true }`.

```jsonc
{
  "timestamp": "2026-06-20T21:42:10.227Z",
  "speed_kmh": 79,
  "rpm": 2084,
  "engine_load_pct": 73.4,
  "coolant_temp_c": 88
  // …any other keys in utils/columnWhitelist.js
}
```

### Auth model

`POST /auth/login` hashes the submitted PIN (sha256) and, if it matches
`DASHBOARD_PIN`, sets an httpOnly cookie (`obd2_auth`, 30-day expiry). All `/api/*`
routes and the dashboard pages require that cookie; `POST /data` and `/health` are
intentionally open so the Android app can post without it.

---

## How trip detection works

The Android app sends no trip identifier. `utils/tripManager.js` assigns one:

- State is kept in memory: the current `trip_id` and the timestamp of the last
  accepted reading.
- If the new reading is more than **120 s** after the previous one (per the
  reading's own `timestamp`), a fresh `trip_id` (UUID v4) is generated; otherwise
  the current one continues.
- A server restart clears this state, which naturally ends the current trip — the
  intended behaviour.

This is why seeding multiple trips works by spacing reading timestamps: blocks of
readings within 120 s of each other become one trip; a gap larger than that splits
them.

---

## Deploy to Railway

1. Create a service from this repo and add the **MySQL** plugin (`DATABASE_URL` is
   injected automatically).
2. Set `DASHBOARD_PIN` in the service variables.
3. Railway runs `npm start` and health-checks `/health`. The `readings` table is
   created on startup — no manual migration needed.

---

## Security notes

- Every `POST /data` key is validated against a hardcoded column whitelist
  (`utils/columnWhitelist.js`) before building the dynamic `INSERT`; this is the
  single source of truth that prevents SQL injection via dynamic keys. All queries
  are parameterized.
- The dashboard and `/api/*` are gated by a PIN cookie (sha256, httpOnly, 30 days).
- `POST /data` and `/health` are intentionally unauthenticated for the Android app
  and platform health checks.
- The CSS/JS under `public/` are not sensitive and are served statically; the data
  behind them is protected at the API layer.

---

## Project layout

```
server.js                 Express app: routes, middleware, boot
db/
  connection.js           Pool config (URL or MYSQL_* vars) + schema init
  schema.sql              The single `readings` table
routes/
  data.js                 POST /data ingestion
  api.js                  GET /api/{live,trips,trips/:id,stats}
  auth.js                 POST /auth/{login,logout}
middleware/
  auth.js                 PIN-cookie guards (API + page)
utils/
  columnWhitelist.js      Allowed PID columns (injection guard)
  tripManager.js          120 s-gap trip detection
public/
  index.html              Dashboard shell (Live / Trips / Stats)
  login.html              PIN keypad
  css/style.css           Editorial light theme
  js/
    chartConfig.js        PID metadata, formatters, Chart.js theme
    liveView.js           Live tab (hero, sparklines, filterable grid)
    tripsView.js          Trips list + detail chart
    statsView.js          Overview cards + charts
    app.js                Tab navigation / lifecycle
```

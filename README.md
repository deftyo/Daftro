# Daftro

Self-hosted daily retrospective dashboard. Point it at your daily work files and browse them as a visual plan-vs-actual report with trend charts.

## What it does

- **Reports view** — per-day plan-vs-actual, unplanned work table, carry-forward list, incident/gap flags
- **Trends dashboard** — completion rate, unplanned time, day length, incident frequency, carry-forward count charted over time with daily/weekly/monthly toggle
- **Day editor** — create and edit days directly in the UI; no text files required
- **Live file watching** — drop a tasklist or report file and the app picks it up automatically (polling-based for WSL↔Windows reliability)
- **REST API** — structured JSON API for programmatic writes (see [Automation](#automation))

## Prerequisites

- **Docker** + **Docker Compose**
- **Node.js 20+** — for local development only

**Windows users:** run from WSL2, not Docker Desktop for Windows. Keep the project in the WSL filesystem (`~/projects/daftro`, not `/mnt/c/…`) — inotify doesn't fire for Windows filesystem paths from WSL. Install Node inside WSL via nvm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
# open a new terminal, then:
nvm install --lts
```

## Getting started

```bash
docker run -d \
  --name daftro \
  -p 3000:3000 \
  -e TASKLISTS_DIR=/tasklists \
  -e REPORTS_DIR=/reports \
  -v /path/to/your/tasklists:/tasklists \
  -v /path/to/your/reports:/reports \
  ghcr.io/deftyo/daftro:latest
```

Open `http://localhost:3000`. After the first run, `docker start daftro` is all you need.

**Windows users:** run from WSL2. Use `/mnt/c/...` paths for the volume mounts.

## Running (Docker Compose)

Clone the repo, copy the example env file and set your paths:

```bash
git clone https://github.com/deftyo/Daftro.git daftro
cd daftro
cp .env.example .env
# edit .env — set TASKLISTS_DIR and REPORTS_DIR to your local paths
docker compose up
```

Open `http://localhost:3000`.

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TASKLISTS_DIR` | `./reports` | Directory containing `Tasklist-*.txt` files |
| `REPORTS_DIR` | `./reports` | Directory containing `Report-*.md` files |
| `PORT` | `3000` | Port the server listens on |

If tasklists and reports live in the same directory, set only `REPORTS_DIR`.

## Development (without Docker)

```bash
cd server
npm test              # full Jest suite (77 tests)
npm run test:watch    # watch mode
```

To run the full stack locally:

```bash
# Terminal 1 — backend
cd server && node index.js

# Terminal 2 — frontend dev server
cd client && npm install && npm run dev
```

## File format

Two files per day, paired by date string `M-DD-YYYY` (month is **not** zero-padded):

| File | Example |
|------|---------|
| `Tasklist-M-DD-YYYY.txt` | `Tasklist-7-10-2026.txt` |
| `Report-M-DD-YYYY.md` | `Report-7-10-2026.md` |

A day appears in the app as soon as either file exists. Metrics on the Trends charts require a matching Report file.

### Tasklist sections

```
Date: M/D/YYYY
Planned Task List for today:

Day plan:
HH:MM-HH:MM - Description
HH:MM-HH:MM - [OPEN] - to plan

Note: ...

Priorities for today:
Carried forward from {date}:
Routine:
Blocked:
Notes:
What got accomplished:
```

`FILL IN` in any block is flagged as a gap. `[OPEN]` marks unscheduled placeholder slots.

### Report sections

The parser handles multiple format generations. The current canonical format is:

```markdown
# End-of-Day Review — ...

## Plan vs Actual          ← H3 per block; 2-col table (Planned / Actual / Status)
## Unplanned Work          ← table: Item | Duration | Tag
## Completed Work          ← bullet list
## Totals Summary          ← table: Metric | Value  ← metrics extracted from here
## Outstanding / Not Completed Today
## Carry Forward           ← H3 subsections: Blocked / Planned / Watch
## Notes
```

Older formats (bullet-list Totals, flat plan tables, numbered carry-forward lists) are also supported.

## Automation

Daftro exposes a REST API that external tools can use to push data directly, bypassing file parsing entirely.

### Claude scheduled task integration (optional)

If you use Claude Code scheduled tasks for daily planning, you can wire them up to push to Daftro automatically:

**End-of-day task** — after generating the plan-vs-actual report, PUT the structured day data to the API and POST a carry-forward skeleton for tomorrow:

```
PUT  http://localhost:3000/api/days/:date   ← today's complete data
POST http://localhost:3000/api/days          ← tomorrow's skeleton (carry-forwards pre-populated)
```

**Morning task** — instead of reading the `.txt` file, GET today's plan from Daftro:

```
GET  http://localhost:3000/api/days/:date   ← use tasklist.dayPlan for calendar events
```

This makes Daftro the source of truth: the EOD task writes the plan for tomorrow, you flesh it out in the Day Editor UI overnight, and the morning task reads it back to schedule Google Calendar events. The file-based flow remains active as a fallback — if Daftro is unavailable the tasks revert to reading/writing `.txt`/`.md` files as before.

### API reference

All dates use `M-D-YYYY` format (no leading zeros, e.g. `7-21-2026`).

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/days` | List all days (summary) |
| `GET`  | `/api/days/:date` | Get a single day (full data) |
| `POST` | `/api/days` | Create a new day (409 if exists) |
| `PUT`  | `/api/days/:date` | Upsert a day |
| `DELETE` | `/api/days/:date` | Delete a day |
| `GET`  | `/api/trends/daily` | Per-day metrics from DB |
| `GET`  | `/api/trends/weekly` | Week-aggregated metrics |
| `GET`  | `/api/trends/monthly` | Month-aggregated metrics |

### Future: server-side queue

The current integration relies on the Claude scheduled task making the HTTP call directly. A natural extension would be a lightweight server-side queue — for example a Laravel-style queued job or a simple webhook receiver — so that any external system (CI pipeline, mobile app, another service) can push events to Daftro without needing direct API access. This would also allow retry logic, rate limiting, and an audit log of incoming writes without coupling the client to Daftro's uptime.

## Tech stack

| Layer | Tech |
|-------|------|
| Backend | Node.js + Express, chokidar file watcher, Postgres + Prisma |
| Frontend | React + Vite + Tailwind CSS + Recharts |
| Container | Docker + Docker Compose |
| Tests | Jest (77 tests, parsers only) |

## Project status

- [x] Phase 1 — Parsers + unit tests (77 tests)
- [x] Phase 2 — In-memory store + chokidar watcher + REST API
- [x] Phase 3 — React frontend (report list + detail view)
- [x] Phase 4 — Trends dashboard (completion rate, unplanned time, day length, incidents, carry-forward)
- [x] Phase 5 — Postgres + Prisma (persist parsed data; import existing files)
- [x] Phase 6 — Actions pipeline (GitHub Actions CI: test, lint, build on PR)
- [x] Phase 7 — Timelog UI (replace text file editing with in-app direct input)
- [x] Phase 8 — UI refresh (Google-esque light theme; white/grey surfaces, blue accent, card shadows)
- [x] Phase 9 — Trends on DB data (richer queries, week/month aggregation; daily/weekly/monthly toggle)
- [x] Phase 10 — Cowork API integration (Claude scheduled tasks push structured data to Daftro's API; morning task reads plan from Daftro; file-based flow remains as fallback)
- [ ] Phase 11 — Deployment (containerised deploy to cloud)

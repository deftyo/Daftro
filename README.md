# Daftro

Self-hosted daily retrospective dashboard. Plan your day, log actuals, and review trends — entirely through the UI or automated via the REST API. Text file import is supported as an optional fallback.

## What it does

- **Reports view** — per-day plan-vs-actual, unplanned work table, incident/gap flags
- **Trends dashboard** — completion rate, unplanned time, day length, incident frequency, meeting time, and dev capacity charted over time with daily/weekly/monthly toggle
- **Day editor** — create and edit days directly in the UI; no text files required
- **Live file watching** — drop a tasklist or report file and the app picks it up automatically (polling-based for WSL↔Windows reliability)
- **REST API** — structured JSON API for programmatic writes (see [Automation](#automation))
- **Web Push notifications** — browser push alerts when the day hasn't been marked complete (fires every 15 minutes from 16:00, weekdays)

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
git clone https://github.com/deftyo/Daftro.git daftro
cd daftro
cp .env.example .env
# edit .env — set VAPID keys (see Web Push setup below)
docker compose up -d
```

Open `http://localhost:3000`.

## Running (Docker Compose)

```bash
docker compose up -d        # start (builds image on first run)
docker compose down         # stop
docker compose up --build -d  # rebuild after code changes
```

### Environment variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the server listens on |
| `VAPID_PUBLIC_KEY` | — | Web Push VAPID public key (required for push notifications) |
| `VAPID_PRIVATE_KEY` | — | Web Push VAPID private key (required for push notifications) |
| `VAPID_EMAIL` | — | `mailto:` contact for the push server (e.g. `mailto:you@example.com`) |

`DATABASE_URL` is set automatically by Docker Compose and does not need to be in `.env`.

### Web Push setup

Generate a VAPID key pair once and add them to `.env`:

```bash
npx web-push generate-vapid-keys
```

Add the output to `.env`:

```
VAPID_PUBLIC_KEY=BG33BiC...
VAPID_PRIVATE_KEY=<private key>
VAPID_EMAIL=mailto:you@example.com
```

The private key is gitignored and must never be committed. The public key is safe to publish — it's embedded in the browser subscription.

On first load, the browser prompts for notification permission. Once granted, the service worker registers a push subscription. If the day isn't marked complete by 16:00 on a weekday, Daftro sends a push reminder every 15 minutes until it is.

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

## File format (optional)

Text files are no longer required — days can be created and edited entirely through the UI or API. File watching remains active as a fallback for importing existing files or for users who prefer a text-based workflow.

Two files per day, paired by date string `M-DD-YYYY` (month is **not** zero-padded):

| File | Example |
|------|---------|
| `Tasklist-M-DD-YYYY.txt` | `Tasklist-7-10-2026.txt` |
| `Report-M-DD-YYYY.md` | `Report-7-10-2026.md` |

A day appears in the app as soon as either file exists. If both files are present, metrics are extracted from the Report file and merged with the Tasklist.

### Tasklist sections

```
Date: M/D/YYYY
Planned Task List for today:

Day plan:
HH:MM-HH:MM - Description
HH:MM-HH:MM - [OPEN] - to plan

Note: ...

Priorities for today:
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
## Notes
```

Older formats (bullet-list Totals, flat plan tables) are also supported.

## Automation

Daftro exposes a REST API that external tools can use to push data directly, bypassing file parsing entirely.

### Standalone (no automation)

The Day Editor covers the full loop without any scheduled tasks:

1. Create tomorrow's day via **+ New Day**, add priorities and a day plan
2. Log actuals in the **EOD Review** tab during or at the end of the day
3. The Trends page and day reports update immediately from the DB

### Built-in scheduled jobs

Daftro runs two cron jobs internally (weekdays only, Europe/London timezone):

| Job | Time | What |
|-----|------|------|
| Morning | 08:52 | Creates an empty day entry for today if one doesn't exist |
| Evening | Every 15 min, 16:00–20:59 | If today isn't marked complete, sends a Web Push reminder. Once complete, creates tomorrow's empty skeleton. |

### Claude scheduled task integration (optional)

If you use Claude Code scheduled tasks, wire them up to automate the loop:

**End-of-day task** — reads today's day from Daftro, builds a plan-vs-actual analysis from the plan + logged actuals, writes the completed day back, and POSTs tomorrow's skeleton:

```
GET  http://localhost:3000/api/days/:date   ← read today's plan + actuals
PUT  http://localhost:3000/api/days/:date   ← write completed day + analysis
POST http://localhost:3000/api/days          ← create tomorrow's skeleton
```

**Morning task** — reads today's plan from Daftro and provides a daily summary (priorities, flagged gaps):

```
GET  http://localhost:3000/api/days/:date   ← read today's plan for summary / gap flags
```

Calendar sync happens passively via the iCal feed — subscribe once in your calendar app and events appear automatically. See [Calendar setup](docs/calendar-setup.md).

The full loop: evening job creates tomorrow's skeleton → you flesh it out in the Day Editor → iCal feed syncs to your calendar overnight → you log actuals in the Day Editor → evening job pushes a reminder if you forget to mark it complete.

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
| `GET`  | `/api/trends/weekly` | Week-aggregated metrics (includes `meetingMinutes`, `devCapacityHours`) |
| `GET`  | `/api/trends/monthly` | Month-aggregated metrics |
| `GET`  | `/api/calendar/feed.ics` | iCal feed — subscribe in any calendar app (see [Calendar setup](docs/calendar-setup.md)) |
| `GET`  | `/api/push/vapid-public-key` | Returns the VAPID public key for client subscription |
| `POST` | `/api/push/subscribe` | Register or update a push subscription |
| `DELETE` | `/api/push/subscribe` | Remove a push subscription |

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
- [x] Phase 4 — Trends dashboard (completion rate, unplanned time, day length, incidents)
- [x] Phase 5 — Postgres + Prisma (persist parsed data; import existing files)
- [x] Phase 6 — Actions pipeline (GitHub Actions CI: test, lint, build on PR)
- [x] Phase 7 — Timelog UI (replace text file editing with in-app direct input)
- [x] Phase 8 — UI refresh (Google-esque light theme; white/grey surfaces, blue accent, card shadows)
- [x] Phase 9 — Trends on DB data (richer queries, week/month aggregation; daily/weekly/monthly toggle)
- [x] Phase 10 — Cowork API integration (EOD skill reads plan from Daftro, builds analysis, writes back as completed day, and creates next day's skeleton; morning skill reads from Daftro for calendar events; file-based flow remains as fallback throughout)
- [x] Phase 11 — Calendar integration (live iCal feed at `/api/calendar/feed.ics`; subscribe once in any calendar app — Google Calendar, Outlook, Apple Calendar — and day plan events sync automatically)
- [x] Phase 12 — Inline day editor (merged DayDetail + DayEditor into a single DayPage with collapsible Morning Plan and EOD Review sections; plan-vs-actual annotation inline)
- [x] Phase 13 — Web Push notifications (VAPID-based browser push; service worker + `usePushSubscription` hook; evening job sends reminder if day not marked complete; 410 cleanup on stale subscriptions)
- [x] Phase 14 — Meeting time + dev capacity (detect meeting blocks from plan descriptions; daily/weekly/monthly meeting time charts; weekly dev capacity = 37.5h − meeting hours; removed carry-forward tracking)

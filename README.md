# Daftro

Self-hosted daily retrospective dashboard. Point it at your daily work files and browse them as a visual plan-vs-actual report with trend charts — no cloud, no database, just your files.

## What it does

- **Reports view** — per-day plan-vs-actual, unplanned work table, carry-forward list, incident/gap flags
- **Trends dashboard** — completion rate, unplanned time, day length, incident frequency, carry-forward count charted over time
- **Live file watching** — drop a new file and the app picks it up automatically (polling-based for WSL↔Windows reliability)
- Handles multiple report format generations automatically

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
cd server && npm install && cd ..
npm test       # 77 tests — confirms parsers are working
```

*(Windows: run inside WSL)*

## Running (Docker)

Edit `docker-compose.yml` to point the two volume mounts at your file directories:

```yaml
volumes:
  - /mnt/c/Users/YourName/TaskList/archive:/tasklists   # Tasklist-*.txt files
  - /mnt/c/Users/YourName/TaskList/reports:/reports      # Report-*.md files
```

Then:

```bash
docker compose up --build
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

## Tech stack

| Layer | Tech |
|-------|------|
| Backend | Node.js + Express, chokidar file watcher, in-memory store |
| Frontend | React + Vite + Tailwind CSS + Recharts |
| Container | Docker + Docker Compose |
| Tests | Jest (77 tests, parsers only) |

## Project status

- [x] Phase 1 — Parsers + unit tests (77 tests)
- [x] Phase 2 — In-memory store + chokidar watcher + REST API
- [x] Phase 3 — React frontend (report list + detail view)
- [x] Phase 4 — Trends dashboard (completion rate, unplanned time, day length, incidents, carry-forward)
- [ ] Phase 5 — Postgres + Prisma (persist parsed data; import existing files)
- [ ] Phase 6 — Actions pipeline (GitHub Actions CI: test, lint, build on PR)
- [ ] Phase 7 — Deployment (containerised deploy to a self-hosted or cloud target)
- [ ] Phase 8 — Timelog UI (replace text file editing)
- [ ] Phase 9 — Trends on DB data (richer queries, week/month aggregation)

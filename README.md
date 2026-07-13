# Daftro

Self-hosted daily retrospective dashboard. Point it at a directory of daily work files and browse them as a visual plan-vs-actual report — no database, no cloud, just your files.

## Prerequisites

- **Docker** + **Docker Compose**
- **Node.js 20+** — for local development only

**Windows users:** run this from WSL2 rather than Docker Desktop for Windows. Keep the project in the WSL filesystem (`~/projects/daftro`, not `/mnt/c/…`) — file watching won't work reliably from the Windows filesystem. Install Node inside WSL via nvm:

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
npm test               # 70 tests — confirms parsers are working
```

*(Windows: run the above inside WSL)*

## Running (Docker)

```bash
docker compose up
```

Place your daily files in `./reports/` and open `http://localhost:3000`.

To use a different reports directory:

```bash
REPORTS_DIR=/path/to/your/files docker compose up
```

## Development (without Docker)

Phase 2+ will add a dev server. For now:

```bash
cd server
npm test               # run the full Jest suite
npm run test:watch     # watch mode
```

## File format

Two files per day, paired by date. The date format is `M-DD-YYYY` — month is **not** zero-padded:

| File | Example |
|------|---------|
| `Tasklist-M-DD-YYYY.txt` | `Tasklist-7-10-2026.txt` |
| `Report-M-DD-YYYY.md` | `Report-7-10-2026.md` |

Example files are in [`reports/example/`](reports/example/).

### Tasklist sections

```
Date: M/D/YYYY
Planned Task List for today:

Day plan:
HH:MM-HH:MM - Description (FIXED)
HH:MM-HH:MM - [OPEN] - to plan

Note: single-line note

Priorities for today:
Carried forward from {date}:
Resolved on {date} (no carry needed):
Watch / monitoring:
Routine:
Blocked:
Notes:
What got accomplished:
```

Supported tags on time blocks: `(FIXED)`, `(PROTECT)`. `[OPEN]` marks unscheduled placeholder slots. `FILL IN` in any time block is flagged as a gap.

### Report sections

```markdown
# End-of-Day Review — ...

## Plan vs Actual          ← H3 per block; Planned/Actual/Status fields
## Unplanned Work          ← table: Time | Item | Duration | Tag
## Completed Work          ← bullet list, ✅ prefix
## Totals Summary          ← table: Metric | Value (metrics are extracted from here)
## Outstanding / Not Completed Today
## Carry Forward to Tomorrow
## Notes
```

Status indicators: `✅` = done, `⚠️` = shifted/warning, plain text = partial.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REPORTS_DIR` | `./reports` | Directory of daily files to watch |
| `PORT` | `3000` | Port the server listens on |

## Project status

- [x] Phase 1 — Parsers + unit tests (70 tests)
- [ ] Phase 2 — In-memory store + chokidar watcher + REST API
- [ ] Phase 3 — React frontend (report list + detail view)
- [ ] Phase 4 — Trends dashboard (Recharts — completion rate, heatmap, streaks)
- [ ] Phase 5 — PDF export
- [ ] Phase 6 — AI insights (heuristic flags; optional Claude API weekly digest via `ANTHROPIC_API_KEY`)

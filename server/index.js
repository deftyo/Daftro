'use strict';

const express = require('express');
const path    = require('path');
const store   = require('./store');
const watcher = require('./watcher');
const daysRouter = require('./routes/days');

const app        = express();
const PORT       = process.env.PORT || 3000;
const CLIENT_DIR = path.join(__dirname, '..', 'client', 'dist');
const DEFAULT_DIR    = path.join(__dirname, '..', 'reports');
const TASKLISTS_DIR  = process.env.TASKLISTS_DIR || process.env.REPORTS_DIR || DEFAULT_DIR;
const REPORTS_DIR    = process.env.REPORTS_DIR   || DEFAULT_DIR;

app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/days', daysRouter);

// Serve the Vite build; fall back to index.html for client-side routing
app.use(express.static(CLIENT_DIR));
app.get('*', (_req, res) => res.sendFile(path.join(CLIENT_DIR, 'index.html')));

async function main() {
  await store.init(TASKLISTS_DIR, REPORTS_DIR);
  watcher.start(TASKLISTS_DIR, REPORTS_DIR);
  app.listen(PORT, () => {
    console.log(`Daftro listening on http://localhost:${PORT}`);
    console.log(`Tasklists: ${TASKLISTS_DIR}`);
    console.log(`Reports:   ${REPORTS_DIR}`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });

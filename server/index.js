'use strict';

const express  = require('express');
const path     = require('path');
const cron     = require('node-cron');
const { runMorningJob } = require('./jobs/morning');
const { runEveningJob } = require('./jobs/evening');
const daysRouter     = require('./routes/days');
const trendsRouter   = require('./routes/trends');
const calendarRouter = require('./routes/calendar');

const app        = express();
const PORT       = process.env.PORT || 3000;
const CLIENT_DIR = path.join(__dirname, '..', 'client', 'dist');

app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/days',     daysRouter);
app.use('/api/trends',   trendsRouter);
app.use('/api/calendar', calendarRouter);

// Serve the Vite build; fall back to index.html for client-side routing
app.use(express.static(CLIENT_DIR));
app.get('*', (_req, res) => res.sendFile(path.join(CLIENT_DIR, 'index.html')));

async function main() {
  await require('./scripts/db-init')();

  const TZ = { timezone: 'Europe/London' };
  cron.schedule('52 8 * * 1-5',      () => runMorningJob().catch(console.error), TZ);
  cron.schedule('*/15 16-20 * * 1-5', () => runEveningJob().catch(console.error), TZ);

  app.listen(PORT, () => console.log(`Daftro listening on http://localhost:${PORT}`));
}

main().catch(err => { console.error(err); process.exit(1); });

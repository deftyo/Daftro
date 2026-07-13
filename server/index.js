'use strict';

const express = require('express');
const path    = require('path');

const app        = express();
const PORT       = process.env.PORT || 3000;
const CLIENT_DIR = path.join(__dirname, '..', 'client', 'dist');

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Serve the Vite build; fall back to index.html for client-side routing
app.use(express.static(CLIENT_DIR));
app.get('*', (_req, res) => res.sendFile(path.join(CLIENT_DIR, 'index.html')));

app.listen(PORT, () => {
  console.log(`Daftro listening on http://localhost:${PORT}`);
});

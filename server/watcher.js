'use strict';

const chokidar = require('chokidar');
const store    = require('./store');

const FILE_RE = /^(Tasklist|Report)-\d+-\d+-\d+\.(txt|md)$/i;

function start(tasklistsDir, reportsDir = tasklistsDir) {
  const dirs = tasklistsDir === reportsDir ? [tasklistsDir] : [tasklistsDir, reportsDir];
  const watcher = chokidar.watch(dirs, {
    ignored:        /(^|[/\\])\../,  // ignore dotfiles
    persistent:     true,
    ignoreInitial:  true,            // store.init() handles the initial scan
    usePolling:     true,            // required for cross-filesystem watching (WSL ↔ Windows)
    interval:       5000,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 200 },
  });

  watcher
    .on('add',    p => { if (FILE_RE.test(require('path').basename(p))) store.refreshFile(p); })
    .on('change', p => { if (FILE_RE.test(require('path').basename(p))) store.refreshFile(p); })
    .on('unlink', p => { if (FILE_RE.test(require('path').basename(p))) store.removeFile(p); });

  return watcher;
}

module.exports = { start };

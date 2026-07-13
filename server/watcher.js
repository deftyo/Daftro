'use strict';

const chokidar = require('chokidar');
const store    = require('./store');

const FILE_RE = /^(Tasklist|Report)-\d+-\d+-\d+\.(txt|md)$/i;

function start(reportsDir) {
  const watcher = chokidar.watch(reportsDir, {
    ignored:        /(^|[/\\])\../,  // ignore dotfiles
    persistent:     true,
    ignoreInitial:  true,            // store.init() handles the initial scan
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  watcher
    .on('add',    p => { if (FILE_RE.test(require('path').basename(p))) store.refreshFile(p); })
    .on('change', p => { if (FILE_RE.test(require('path').basename(p))) store.refreshFile(p); })
    .on('unlink', p => { if (FILE_RE.test(require('path').basename(p))) store.removeFile(p); });

  return watcher;
}

module.exports = { start };

'use strict';

const { scanDirectory, buildDay } = require('./parsers/index');

let _days = [];
let _byDate = {};
let _tasklistsDir = null;
let _reportsDir   = null;

function init(tasklistsDir, reportsDir = tasklistsDir) {
  _tasklistsDir = tasklistsDir;
  _reportsDir   = reportsDir;
  _reload();
}

function _reload() {
  _days   = scanDirectory(_tasklistsDir, _reportsDir);
  _byDate = Object.fromEntries(_days.map(d => [d.date, d]));
}

function refreshFile(filePath) {
  const { TASKLIST_RE, REPORT_RE } = _patterns();
  const basename = require('path').basename(filePath);

  const tm = basename.match(TASKLIST_RE);
  const rm = basename.match(REPORT_RE);
  const dateStr = tm ? tm[1] : rm ? rm[1] : null;
  if (!dateStr) return;

  const path = require('path');
  const tasklistPath = path.join(_tasklistsDir, `Tasklist-${dateStr}.txt`);
  const reportPath   = path.join(_reportsDir,   `Report-${dateStr}.md`);
  const fs = require('fs');
  const tExists = fs.existsSync(tasklistPath);
  const rExists = fs.existsSync(reportPath);

  const updated = buildDay(dateStr, tExists ? tasklistPath : null, rExists ? reportPath : null);

  _byDate[dateStr] = updated;
  const idx = _days.findIndex(d => d.date === dateStr);
  if (idx === -1) {
    _days.push(updated);
    _days.sort((a, b) => {
      if (!a.parsedDate) return 1;
      if (!b.parsedDate) return -1;
      return b.parsedDate - a.parsedDate;
    });
  } else {
    _days[idx] = updated;
  }
}

function removeFile(filePath) {
  _reload();
}

function getAll()     { return _days; }
function getByDate(d) { return _byDate[d] ?? null; }

function _patterns() {
  return {
    TASKLIST_RE: /^Tasklist-(\d+-\d+-\d+)\.txt$/i,
    REPORT_RE:   /^Report-(\d+-\d+-\d+)\.md$/i,
  };
}

module.exports = { init, refreshFile, removeFile, getAll, getByDate };

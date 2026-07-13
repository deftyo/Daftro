'use strict';

const fs   = require('fs');
const path = require('path');
const { parseTasklist } = require('./tasklist');
const { parseReport }   = require('./report');

const TASKLIST_RE = /^Tasklist-(\d+-\d+-\d+)\.txt$/i;
const REPORT_RE   = /^Report-(\d+-\d+-\d+)\.md$/i;

// Converts M-DD-YYYY filename date string to a JS Date.
function parseDate(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const nums = parts.map(Number);
  if (nums.some(n => !Number.isInteger(n) || n <= 0)) return null;
  const [month, day, year] = nums;
  return new Date(year, month - 1, day);
}

function buildDay(dateStr, tasklistPath, reportPath) {
  const day = {
    date: dateStr,
    parsedDate: parseDate(dateStr),
    isComplete: !!(tasklistPath && reportPath),
    tasklist: null,
    report: null,
    gaps: [],
    tasklistError: null,
    reportError: null,
  };

  if (tasklistPath) {
    try {
      day.tasklist = parseTasklist(tasklistPath);
    } catch (err) {
      day.tasklistError = err.message;
    }
  }

  if (reportPath) {
    try {
      day.report = parseReport(reportPath);
      day.report.date = dateStr;
    } catch (err) {
      day.reportError = err.message;
    }
  }

  if (day.tasklist) day.gaps.push(...(day.tasklist.gaps || []));
  if (day.report)   day.gaps.push(...(day.report.gaps   || []));

  return day;
}

// Scans directories for paired Tasklist/Report files and returns sorted day objects.
// reportsDir defaults to tasklistsDir when tasklists and reports share one location.
function scanDirectory(tasklistsDir, reportsDir = tasklistsDir) {
  const tasklists = {};
  const reports   = {};

  for (const file of fs.readdirSync(tasklistsDir)) {
    const tm = file.match(TASKLIST_RE);
    if (tm) tasklists[tm[1]] = path.join(tasklistsDir, file);
  }

  for (const file of fs.readdirSync(reportsDir)) {
    const rm = file.match(REPORT_RE);
    if (rm) reports[rm[1]] = path.join(reportsDir, file);
  }

  const dates = new Set([...Object.keys(tasklists), ...Object.keys(reports)]);
  const days  = Array.from(dates).map(d => buildDay(d, tasklists[d] ?? null, reports[d] ?? null));

  // Most recent first
  days.sort((a, b) => {
    if (!a.parsedDate) return 1;
    if (!b.parsedDate) return -1;
    return b.parsedDate - a.parsedDate;
  });

  return days;
}

module.exports = { scanDirectory, buildDay, parseDate };

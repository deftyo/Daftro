'use strict';

const path = require('path');
const fs   = require('fs');
const { PrismaClient } = require('@prisma/client');
const { scanDirectory, buildDay } = require('./parsers/index');

const prisma = new PrismaClient();

const TASKLIST_RE = /^Tasklist-(\d+-\d+-\d+)\.txt$/i;
const REPORT_RE   = /^Report-(\d+-\d+-\d+)\.md$/i;

let _tasklistsDir = null;
let _reportsDir   = null;

async function init(tasklistsDir, reportsDir = tasklistsDir) {
  _tasklistsDir = tasklistsDir;
  _reportsDir   = reportsDir;
  const days = scanDirectory(tasklistsDir, reportsDir);
  await Promise.all(days.map(d => _upsert(d)));
}

async function refreshFile(filePath) {
  const basename = path.basename(filePath);
  const tm = basename.match(TASKLIST_RE);
  const rm = basename.match(REPORT_RE);
  const dateStr = tm ? tm[1] : rm ? rm[1] : null;
  if (!dateStr) return;

  const tasklistPath = path.join(_tasklistsDir, `Tasklist-${dateStr}.txt`);
  const reportPath   = path.join(_reportsDir,   `Report-${dateStr}.md`);
  const day = buildDay(
    dateStr,
    fs.existsSync(tasklistPath) ? tasklistPath : null,
    fs.existsSync(reportPath)   ? reportPath   : null,
  );
  await _upsert(day);
}

async function removeFile(filePath) {
  const basename = path.basename(filePath);
  const tm = basename.match(TASKLIST_RE);
  const rm = basename.match(REPORT_RE);
  const dateStr = tm ? tm[1] : rm ? rm[1] : null;
  if (!dateStr) return;

  const tasklistPath = path.join(_tasklistsDir, `Tasklist-${dateStr}.txt`);
  const reportPath   = path.join(_reportsDir,   `Report-${dateStr}.md`);
  const tExists = fs.existsSync(tasklistPath);
  const rExists = fs.existsSync(reportPath);

  if (!tExists && !rExists) {
    await prisma.day.deleteMany({ where: { date: dateStr } });
  } else {
    const day = buildDay(dateStr, tExists ? tasklistPath : null, rExists ? reportPath : null);
    await _upsert(day);
  }
}

async function getAll() {
  const rows = await prisma.day.findMany({ orderBy: { parsedDate: 'desc' } });
  return rows.map(_rowToDay);
}

async function getByDate(dateStr) {
  const row = await prisma.day.findUnique({ where: { date: dateStr } });
  return row ? _rowToDay(row) : null;
}

// ── helpers ─────────────────────────────────────────────────────────────────

async function _upsert(day) {
  const m = day.report?.metrics ?? {};
  await prisma.day.upsert({
    where:  { date: day.date },
    update: _fields(day, m),
    create: { date: day.date, ..._fields(day, m) },
  });
}

function _fields(day, m) {
  return {
    parsedDate:       day.parsedDate ?? null,
    isComplete:       day.isComplete ?? false,
    hasGap:           (day.gaps?.length ?? 0) > 0,
    tasklistMissing:  !!day.tasklistError,
    reportMissing:    !!day.reportError,
    dayStart:         m.dayStart         ?? null,
    dayEnd:           m.dayEnd           ?? null,
    plannedCompleted: m.plannedCompleted ?? null,
    plannedTotal:     m.plannedTotal     ?? null,
    slippedCount:     m.slippedCount     ?? null,
    unplannedPercent: m.unplannedPercent ?? null,
    unplannedMinutes: m.unplannedMinutes ?? null,
    carryForwardCount:m.carryForwardCount?? null,
    incidentCount:    m.incidentCount    ?? null,
    tasklistData:     day.tasklist       ?? null,
    reportData:       day.report         ?? null,
  };
}

function _rowToDay(row) {
  return {
    date:          row.date,
    parsedDate:    row.parsedDate,
    isComplete:    row.isComplete,
    gaps:          row.hasGap ? ['gap'] : [],
    tasklistError: row.tasklistMissing ? 'missing' : null,
    reportError:   row.reportMissing   ? 'missing' : null,
    tasklist:      row.tasklistData,
    report:        row.reportData,
  };
}

module.exports = { init, refreshFile, removeFile, getAll, getByDate };

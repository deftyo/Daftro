'use strict';

const prisma = require('./lib/db');
const { mergeGaps } = require('./parsers/index');



async function getAll() {
  const rows = await prisma.day.findMany({ orderBy: { parsedDate: 'desc' } });
  return rows.map(_rowToDay);
}

async function getByDate(dateStr) {
  const row = await prisma.day.findUnique({ where: { date: dateStr } });
  return row ? _rowToDay(row) : null;
}

async function upsertDay(dateStr, { tasklist = null, report = null, isComplete = false }) {
  const m = report?.metrics ?? {};
  const cf = report?.carryForward ?? null;
  const parts = dateStr.split('-').map(Number);
  let parsedDate = null;
  if (parts.length === 3) {
    const [month, day, year] = parts;
    parsedDate = new Date(Date.UTC(year, month - 1, day));
  }
  const fields = {
    parsedDate,
    isComplete,
    hasGap:           mergeGaps(tasklist, report).length > 0,
    tasklistMissing:  false,
    reportMissing:    false,
    dayStart:         m.dayStart         ?? null,
    dayEnd:           m.dayEnd           ?? null,
    plannedCompleted: m.plannedCompleted ?? null,
    plannedTotal:     m.plannedTotal     ?? null,
    slippedCount:     m.slippedCount     ?? null,
    unplannedPercent: m.unplannedPercent ?? null,
    unplannedMinutes: m.unplannedMinutes ?? null,
    carryForwardCount: cf
      ? (cf.blocked?.length ?? 0) + (cf.planned?.length ?? 0)
      : null,
    incidentCount:    m.incidentCount    ?? null,
    tasklistData:     tasklist,
    reportData:       report,
  };
  await prisma.day.upsert({
    where:  { date: dateStr },
    update: fields,
    create: { date: dateStr, ...fields },
  });
}

async function deleteDay(dateStr) {
  await prisma.day.deleteMany({ where: { date: dateStr } });
}


function _rowToDay(row) {
  return {
    date:          row.date,
    parsedDate:    row.parsedDate,
    isComplete:    row.isComplete,
    gaps:          mergeGaps(row.tasklistData, row.reportData),
    tasklistError: row.tasklistMissing ? 'missing' : null,
    reportError:   row.reportMissing   ? 'missing' : null,
    tasklist:      row.tasklistData,
    report:        row.reportData,
  };
}

module.exports = { getAll, getByDate, upsertDay, deleteDay };

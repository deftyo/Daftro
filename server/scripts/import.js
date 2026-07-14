'use strict';

/**
 * One-shot import: reads all existing tasklist + report files and upserts them
 * into the database. Safe to run multiple times (upsert is idempotent).
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node server/scripts/import.js
 */

const path = require('path');
const { scanDirectory } = require('../parsers/index');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TASKLISTS_DIR = process.env.TASKLISTS_DIR || process.env.REPORTS_DIR || path.join(__dirname, '../../reports');
const REPORTS_DIR   = process.env.REPORTS_DIR   || TASKLISTS_DIR;

async function main() {
  console.log(`Scanning tasklists: ${TASKLISTS_DIR}`);
  console.log(`Scanning reports:   ${REPORTS_DIR}`);

  const days = scanDirectory(TASKLISTS_DIR, REPORTS_DIR);
  console.log(`Found ${days.length} days`);

  let imported = 0;
  for (const day of days) {
    const m = day.report?.metrics ?? {};
    await prisma.day.upsert({
      where:  { date: day.date },
      update: _fields(day, m),
      create: { date: day.date, ..._fields(day, m) },
    });
    console.log(`  ✓ ${day.date}`);
    imported++;
  }

  console.log(`\nImported ${imported} days.`);
}

function _fields(day, m) {
  return {
    parsedDate:        day.parsedDate ?? null,
    isComplete:        day.isComplete ?? false,
    hasGap:            (day.gaps?.length ?? 0) > 0,
    tasklistMissing:   !!day.tasklistError,
    reportMissing:     !!day.reportError,
    dayStart:          m.dayStart          ?? null,
    dayEnd:            m.dayEnd            ?? null,
    plannedCompleted:  m.plannedCompleted  ?? null,
    plannedTotal:      m.plannedTotal      ?? null,
    slippedCount:      m.slippedCount      ?? null,
    unplannedPercent:  m.unplannedPercent  ?? null,
    unplannedMinutes:  m.unplannedMinutes  ?? null,
    carryForwardCount: m.carryForwardCount ?? null,
    incidentCount:     m.incidentCount     ?? null,
    tasklistData:      day.tasklist        ?? null,
    reportData:        day.report          ?? null,
  };
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());

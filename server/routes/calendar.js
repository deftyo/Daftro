'use strict';

const { Router }      = require('express');
const { PrismaClient } = require('@prisma/client');

const router = Router();
const prisma  = new PrismaClient();

function pad(n) { return String(n).padStart(2, '0'); }

function formatDt(parsedDate, time) {
  const y  = parsedDate.getUTCFullYear();
  const mo = pad(parsedDate.getUTCMonth() + 1);
  const d  = pad(parsedDate.getUTCDate());
  const [hh, mm] = time.split(':');
  return `${y}${mo}${d}T${pad(Number(hh))}${pad(Number(mm))}00`;
}

function escapeIcal(str) {
  return (str ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function dtstamp() {
  return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

router.get('/feed.ics', async (_req, res) => {
  try {
    const days = await prisma.day.findMany({
      where:   { parsedDate: { not: null } },
      select:  { date: true, parsedDate: true, tasklist: true },
      orderBy: { parsedDate: 'asc' },
    });

    const stamp = dtstamp();
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Daftro//Daily Plan//EN',
      'CALSCALE:GREGORIAN',
      'X-WR-CALNAME:Daftro Day Plan',
      'X-WR-TIMEZONE:Europe/London',
    ];

    for (const day of days) {
      const plan = day.tasklist?.dayPlan;
      if (!Array.isArray(plan)) continue;

      plan.forEach((entry, i) => {
        if (entry.isOpen || !entry.start || !entry.end) return;
        lines.push(
          'BEGIN:VEVENT',
          `UID:daftro-${day.date}-${i}@daftro`,
          `DTSTART;TZID=Europe/London:${formatDt(day.parsedDate, entry.start)}`,
          `DTEND;TZID=Europe/London:${formatDt(day.parsedDate, entry.end)}`,
          `SUMMARY:${escapeIcal(entry.description)}`,
          `DTSTAMP:${stamp}`,
          'END:VEVENT',
        );
      });
    }

    lines.push('END:VCALENDAR');

    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Cache-Control', 'no-cache');
    res.send(lines.join('\r\n'));
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;

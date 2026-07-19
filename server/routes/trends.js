'use strict';

const { Router }      = require('express');
const { PrismaClient } = require('@prisma/client');

const router = Router();
const prisma  = new PrismaClient();

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function toHours(start, end) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 6) / 10;
}

function completionRate(completed, total) {
  if (completed == null || !total) return null;
  return Math.round(completed / total * 100);
}

function avg(arr) {
  const valid = arr.filter(v => v != null);
  return valid.length ? Math.round(valid.reduce((s, v) => s + v, 0) / valid.length) : null;
}

function avgF(arr, dp = 1) {
  const valid = arr.filter(v => v != null);
  if (!valid.length) return null;
  const mean = valid.reduce((s, v) => s + v, 0) / valid.length;
  return Math.round(mean * 10 ** dp) / 10 ** dp;
}

function sum(arr) {
  return arr.filter(v => v != null).reduce((s, v) => s + v, 0);
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return {
    week: Math.ceil((((d - yearStart) / 86400000) + 1) / 7),
    year: d.getUTCFullYear(),
  };
}

// ── DB fetch ──────────────────────────────────────────────────────────────────

async function getCompleteDays() {
  return prisma.day.findMany({
    where: { isComplete: true, parsedDate: { not: null } },
    orderBy: { parsedDate: 'asc' },
    select: {
      date: true, parsedDate: true,
      plannedCompleted: true, plannedTotal: true,
      unplannedMinutes: true,
      dayStart: true, dayEnd: true,
      incidentCount: true, carryForwardCount: true,
    },
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.get('/daily', async (_req, res) => {
  try {
    const days = await getCompleteDays();
    const data = days.map(d => {
      const pd = d.parsedDate;
      return {
        label:            pd ? `${pd.getUTCDate()} ${MONTHS[pd.getUTCMonth()]}` : d.date,
        date:             d.date,
        completionRate:   completionRate(d.plannedCompleted, d.plannedTotal),
        plannedCompleted: d.plannedCompleted,
        plannedTotal:     d.plannedTotal,
        unplannedMinutes: d.unplannedMinutes,
        dayLengthHours:   toHours(d.dayStart, d.dayEnd),
        dayStart:         d.dayStart,
        dayEnd:           d.dayEnd,
        incidentCount:    d.incidentCount ?? 0,
        carryForwardCount: d.carryForwardCount ?? 0,
      };
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/weekly', async (_req, res) => {
  try {
    const days = await getCompleteDays();
    const groups = new Map();

    for (const d of days) {
      const { week, year } = isoWeek(d.parsedDate);
      const key = `${year}-W${String(week).padStart(2, '0')}`;
      if (!groups.has(key)) groups.set(key, { key, year, week, days: [] });
      groups.get(key).days.push(d);
    }

    const data = [...groups.values()].map(({ year, week, days }) => {
      const rates = days.map(d => completionRate(d.plannedCompleted, d.plannedTotal));
      return {
        label:            `W${week} '${String(year).slice(2)}`,
        days:             days.length,
        completionRate:   avg(rates),
        plannedCompleted: sum(days.map(d => d.plannedCompleted)),
        plannedTotal:     sum(days.map(d => d.plannedTotal)),
        unplannedMinutes: avg(days.map(d => d.unplannedMinutes)),
        dayLengthHours:   avgF(days.map(d => toHours(d.dayStart, d.dayEnd))),
        incidentCount:    sum(days.map(d => d.incidentCount ?? 0)),
        carryForwardCount: avg(days.map(d => d.carryForwardCount)),
      };
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/monthly', async (_req, res) => {
  try {
    const days = await getCompleteDays();
    const groups = new Map();

    for (const d of days) {
      const year  = d.parsedDate.getUTCFullYear();
      const month = d.parsedDate.getUTCMonth();
      const key   = `${year}-${String(month + 1).padStart(2, '0')}`;
      if (!groups.has(key)) groups.set(key, { key, year, month, days: [] });
      groups.get(key).days.push(d);
    }

    const data = [...groups.values()].map(({ year, month, days }) => {
      const rates = days.map(d => completionRate(d.plannedCompleted, d.plannedTotal));
      return {
        label:            `${MONTHS[month]} '${String(year).slice(2)}`,
        days:             days.length,
        completionRate:   avg(rates),
        plannedCompleted: sum(days.map(d => d.plannedCompleted)),
        plannedTotal:     sum(days.map(d => d.plannedTotal)),
        unplannedMinutes: avg(days.map(d => d.unplannedMinutes)),
        dayLengthHours:   avgF(days.map(d => toHours(d.dayStart, d.dayEnd))),
        incidentCount:    sum(days.map(d => d.incidentCount ?? 0)),
        carryForwardCount: avg(days.map(d => d.carryForwardCount)),
      };
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

'use strict';

const prisma = require('../lib/db');

const { Router }       = require('express');
const {
  toHours, completionRate, avg, avgF, sum,
  meetingMinutes, overheadMinutes, devMinutes,
  categoryBreakdown, mergeCategoryBreakdowns, overtimeHours,
  computeCompleteness,
} = require('../lib/trends');

const router = Router();

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Helpers ───────────────────────────────────────────────────────────────────

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
      incidentCount: true,
      tasklistData: true,
    },
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.get('/completeness', async (_req, res) => {
  try {
    const days = await prisma.day.findMany({
      where:  { parsedDate: { not: null } },
      select: { parsedDate: true, isComplete: true },
    });
    res.json(computeCompleteness(days));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/daily', async (_req, res) => {
  try {
    const days = await getCompleteDays();
    const data = days.map(d => {
      const pd = d.parsedDate;
      return {
        label:             pd ? `${pd.getUTCDate()} ${MONTHS[pd.getUTCMonth()]}` : d.date,
        date:              d.date,
        completionRate:    completionRate(d.plannedCompleted, d.plannedTotal),
        plannedCompleted:  d.plannedCompleted,
        plannedTotal:      d.plannedTotal,
        unplannedMinutes:  d.unplannedMinutes,
        dayLengthHours:    toHours(d.dayStart, d.dayEnd),
        dayStart:          d.dayStart,
        dayEnd:            d.dayEnd,
        incidentCount:     d.incidentCount ?? 0,
        meetingMinutes:    meetingMinutes(d),
        overheadMinutes:   overheadMinutes(d),
        devMinutes:        devMinutes(d),
        overtimeHours:     overtimeHours(d),
        categoryBreakdown: categoryBreakdown(d),
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
      const rates            = days.map(d => completionRate(d.plannedCompleted, d.plannedTotal));
      const totalMeetingMins = sum(days.map(d => meetingMinutes(d)));
      const totalOverheadMins= sum(days.map(d => overheadMinutes(d)));
      const totalDevMins     = sum(days.map(d => devMinutes(d)));
      const totalOvertimeHrs = avgF(days.map(d => overtimeHours(d)));
      return {
        label:                `W${week} '${String(year).slice(2)}`,
        days:                 days.length,
        completionRate:       avg(rates),
        plannedCompleted:     sum(days.map(d => d.plannedCompleted)),
        plannedTotal:         sum(days.map(d => d.plannedTotal)),
        unplannedMinutes:     avg(days.map(d => d.unplannedMinutes)),
        dayLengthHours:       avgF(days.map(d => toHours(d.dayStart, d.dayEnd))),
        incidentCount:        sum(days.map(d => d.incidentCount ?? 0)),
        meetingMinutes:       totalMeetingMins,
        avgDailyMeetingMins:  Math.round(totalMeetingMins / days.length),
        overheadMinutes:      totalOverheadMins,
        avgDailyOverheadMins: Math.round(totalOverheadMins / days.length),
        devMinutes:           totalDevMins,
        avgDailyDevMins:      Math.round(totalDevMins / days.length),
        avgOvertimeHours:     totalOvertimeHrs,
        devCapacityHours:     Math.round((37.5 - totalOverheadMins / 60) * 10) / 10,
        categoryBreakdown:    mergeCategoryBreakdowns(days.map(d => categoryBreakdown(d))),
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
      const key   = `${year}-${String(month + 1).padStart(2, '00')}`;
      if (!groups.has(key)) groups.set(key, { key, year, month, days: [] });
      groups.get(key).days.push(d);
    }

    const data = [...groups.values()].map(({ year, month, days }) => {
      const rates            = days.map(d => completionRate(d.plannedCompleted, d.plannedTotal));
      const totalMeetingMins = sum(days.map(d => meetingMinutes(d)));
      const totalOverheadMins= sum(days.map(d => overheadMinutes(d)));
      const totalDevMins     = sum(days.map(d => devMinutes(d)));
      return {
        label:                `${MONTHS[month]} '${String(year).slice(2)}`,
        days:                 days.length,
        completionRate:       avg(rates),
        plannedCompleted:     sum(days.map(d => d.plannedCompleted)),
        plannedTotal:         sum(days.map(d => d.plannedTotal)),
        unplannedMinutes:     avg(days.map(d => d.unplannedMinutes)),
        dayLengthHours:       avgF(days.map(d => toHours(d.dayStart, d.dayEnd))),
        incidentCount:        sum(days.map(d => d.incidentCount ?? 0)),
        meetingMinutes:       totalMeetingMins,
        avgDailyMeetingMins:  Math.round(totalMeetingMins / days.length),
        overheadMinutes:      totalOverheadMins,
        avgDailyOverheadMins: Math.round(totalOverheadMins / days.length),
        devMinutes:           totalDevMins,
        avgDailyDevMins:      Math.round(totalDevMins / days.length),
        avgOvertimeHours:     avgF(days.map(d => overtimeHours(d))),
        categoryBreakdown:    mergeCategoryBreakdowns(days.map(d => categoryBreakdown(d))),
      };
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

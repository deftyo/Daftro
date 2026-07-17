'use strict';

const { Router } = require('express');
const store      = require('../store');

const router = Router();

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatLabel(dateStr) {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return dateStr;
  const [month, day] = parts;
  return `${day} ${MONTHS[month - 1]}`;
}

router.get('/', async (_req, res) => {
  try {
    const days = (await store.getAll()).map(d => ({
      date:          d.date,
      label:         formatLabel(d.date),
      parsedDate:    d.parsedDate,
      isComplete:    d.isComplete,
      gaps:          d.gaps,
      tasklistError: d.tasklistError,
      reportError:   d.reportError,
      metrics:       d.report?.metrics ?? null,
      priorities:    d.tasklist?.priorities ?? null,
    }));
    res.json(days);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:date', async (req, res) => {
  try {
    const day = await store.getByDate(req.params.date);
    if (!day) return res.status(404).json({ error: 'Day not found', date: req.params.date });
    res.json(day);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const DATE_RE = /^\d{1,2}-\d{1,2}-\d{4}$/;

router.post('/', async (req, res) => {
  try {
    const { date, tasklist, report, isComplete } = req.body ?? {};
    if (!date || !DATE_RE.test(date)) {
      return res.status(400).json({ error: 'date is required (format: M-D-YYYY)' });
    }
    const existing = await store.getByDate(date);
    if (existing) return res.status(409).json({ error: 'Day already exists', date });
    await store.upsertDay(date, { tasklist, report, isComplete: !!isComplete });
    const day = await store.getByDate(date);
    res.status(201).json(day);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:date', async (req, res) => {
  try {
    const dateStr = req.params.date;
    if (!DATE_RE.test(dateStr)) {
      return res.status(400).json({ error: 'Invalid date format (expected M-D-YYYY)' });
    }
    const { tasklist, report, isComplete } = req.body ?? {};
    await store.upsertDay(dateStr, { tasklist, report, isComplete: !!isComplete });
    const day = await store.getByDate(dateStr);
    res.json(day);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:date', async (req, res) => {
  try {
    const dateStr = req.params.date;
    const existing = await store.getByDate(dateStr);
    if (!existing) return res.status(404).json({ error: 'Day not found' });
    await store.deleteDay(dateStr);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

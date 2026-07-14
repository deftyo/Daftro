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

module.exports = router;

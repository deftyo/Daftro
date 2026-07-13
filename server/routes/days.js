'use strict';

const { Router } = require('express');
const store      = require('../store');

const router = Router();

// GET /api/days — list all days (summary, no full parse bodies)
router.get('/', (_req, res) => {
  const days = store.getAll().map(d => ({
    date:       d.date,
    parsedDate: d.parsedDate,
    isComplete: d.isComplete,
    gaps:       d.gaps,
    tasklistError: d.tasklistError,
    reportError:   d.reportError,
    // Surface top-level metrics without sending the full parsed objects
    metrics:    d.report?.metrics ?? null,
    priorities: d.tasklist?.priorities ?? null,
  }));
  res.json(days);
});

// GET /api/days/:date — full day object for a single date (M-DD-YYYY)
router.get('/:date', (req, res) => {
  const day = store.getByDate(req.params.date);
  if (!day) return res.status(404).json({ error: 'Day not found', date: req.params.date });
  res.json(day);
});

module.exports = router;

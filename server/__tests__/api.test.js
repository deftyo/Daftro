'use strict';

const path    = require('path');
const request = require('supertest');
const express = require('express');

// Point store at the example fixtures before requiring the app modules
process.env.REPORTS_DIR = path.join(__dirname, '../../reports/example');

const store      = require('../store');
const daysRouter = require('../routes/days');

let app;
beforeAll(() => {
  store.init(process.env.REPORTS_DIR);
  app = express();
  app.use(express.json());
  app.use('/api/days', daysRouter);
});

describe('GET /api/days', () => {
  test('returns 200 with an array', async () => {
    const res = await request(app).get('/api/days');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('contains the example day', async () => {
    const res = await request(app).get('/api/days');
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].date).toBe('7-10-2026');
  });

  test('summary includes isComplete, gaps, metrics, priorities', async () => {
    const res = await request(app).get('/api/days');
    const day = res.body[0];
    expect(day).toHaveProperty('isComplete', true);
    expect(day).toHaveProperty('gaps');
    expect(day).toHaveProperty('metrics');
    expect(day).toHaveProperty('priorities');
  });

  test('does not include full tasklist/report bodies in list', async () => {
    const res = await request(app).get('/api/days');
    const day = res.body[0];
    expect(day.tasklist).toBeUndefined();
    expect(day.report).toBeUndefined();
  });
});

describe('GET /api/days/:date', () => {
  test('returns full day object for valid date', async () => {
    const res = await request(app).get('/api/days/7-10-2026');
    expect(res.status).toBe(200);
    expect(res.body.date).toBe('7-10-2026');
    expect(res.body.isComplete).toBe(true);
  });

  test('includes full tasklist and report on detail', async () => {
    const res = await request(app).get('/api/days/7-10-2026');
    expect(res.body.tasklist).toBeDefined();
    expect(res.body.report).toBeDefined();
  });

  test('returns 404 for unknown date', async () => {
    const res = await request(app).get('/api/days/1-01-2000');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

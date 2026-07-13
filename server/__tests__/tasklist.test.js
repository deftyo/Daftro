'use strict';

const path = require('path');
const { parseTasklist } = require('../parsers/tasklist');

const FIXTURE = path.join(__dirname, '../../reports/example/Tasklist-7-10-2026.txt');

describe('Tasklist parser — Tasklist-7-10-2026.txt', () => {
  let tl;
  beforeAll(() => { tl = parseTasklist(FIXTURE); });

  // ── Date ──────────────────────────────────────────────────────────────────

  test('extracts date in M-DD-YYYY format', () => {
    expect(tl.date).toBe('7-10-2026');
  });

  test('preserves rawDate as written in file', () => {
    expect(tl.rawDate).toBe('7/10/2026');
  });

  // ── Day plan ──────────────────────────────────────────────────────────────

  test('parses all 12 day plan time blocks', () => {
    expect(tl.dayPlan).toHaveLength(12);
  });

  test('first day plan block has correct times and description', () => {
    expect(tl.dayPlan[0]).toMatchObject({
      start: '08:30',
      end: '08:40',
      description: 'Cowork, plan generation',
      tags: [],
      isOpen: false,
      hasFillIn: false,
    });
  });

  test('extracts PROTECT tag from Lunch block', () => {
    const lunch = tl.dayPlan.find(b => b.description.includes('Lunch'));
    expect(lunch).toBeDefined();
    expect(lunch.tags).toContain('PROTECT');
  });

  test('extracts FIXED tag from line-manager meeting block', () => {
    const mtg = tl.dayPlan.find(b => b.description.includes('Line-manager'));
    expect(mtg).toBeDefined();
    expect(mtg.tags).toContain('FIXED');
  });

  test('marks [OPEN] blocks correctly', () => {
    const open = tl.dayPlan.filter(b => b.isOpen);
    expect(open).toHaveLength(3);
    expect(open.every(b => b.isOpen)).toBe(true);
  });

  test('no FILL IN blocks in day plan', () => {
    expect(tl.dayPlan.filter(b => b.hasFillIn)).toHaveLength(0);
  });

  // ── Note ─────────────────────────────────────────────────────────────────

  test('extracts inline note after day plan', () => {
    expect(tl.note).toMatch(/Friday/);
    expect(tl.note).toMatch(/line-manager meeting/);
    expect(tl.note).toMatch(/top priority/);
  });

  // ── Priorities ────────────────────────────────────────────────────────────

  test('parses 4 priorities', () => {
    expect(tl.priorities).toHaveLength(4);
  });

  test('first priority references AB#197', () => {
    expect(tl.priorities[0]).toMatch(/AB#197/);
  });

  // ── Carried forward ───────────────────────────────────────────────────────

  test('extracts carried-forward source date', () => {
    expect(tl.carriedForward.fromDate).toBe('7/9');
  });

  test('parses 5 carried-forward items', () => {
    expect(tl.carriedForward.items).toHaveLength(5);
  });

  test('first carried-forward item references AB#197', () => {
    expect(tl.carriedForward.items[0]).toMatch(/AB#197/);
  });

  // ── Resolved ─────────────────────────────────────────────────────────────

  test('extracts resolved-on date', () => {
    expect(tl.resolved.onDate).toBe('7/9');
  });

  test('parses 2 resolved items', () => {
    expect(tl.resolved.items).toHaveLength(2);
  });

  test('first resolved item references AB#196', () => {
    expect(tl.resolved.items[0]).toMatch(/AB#196/);
  });

  // ── Watch ─────────────────────────────────────────────────────────────────

  test('parses 3 watch items', () => {
    expect(tl.watch).toHaveLength(3);
  });

  test('first watch item references AB#173', () => {
    expect(tl.watch[0]).toMatch(/AB#173/);
  });

  // ── Blocked ───────────────────────────────────────────────────────────────

  test('parses 3 blocked items', () => {
    expect(tl.blocked).toHaveLength(3);
  });

  test('first blocked item references AB#115', () => {
    expect(tl.blocked[0]).toMatch(/AB#115/);
  });

  // ── Notes section ─────────────────────────────────────────────────────────

  test('parses 5 notes', () => {
    expect(tl.notes).toHaveLength(5);
  });

  test('first note mentions the company acquisition', () => {
    expect(tl.notes[0]).toMatch(/acquisition/);
  });

  // ── Accomplished ─────────────────────────────────────────────────────────

  test('parses all 13 accomplished time blocks', () => {
    expect(tl.accomplished).toHaveLength(13);
  });

  test('first accomplished block is the morning email check', () => {
    expect(tl.accomplished[0]).toMatchObject({ start: '08:40', end: '08:50' });
  });

  // ── Gaps (FILL IN) ────────────────────────────────────────────────────────

  test('detects exactly 1 FILL IN gap', () => {
    expect(tl.gaps).toHaveLength(1);
  });

  test('gap is in the accomplished section at 10:30–11:00', () => {
    const gap = tl.gaps[0];
    expect(gap.location).toBe('accomplished');
    expect(gap.start).toBe('10:30');
    expect(gap.end).toBe('11:00');
    expect(gap.hasFillIn).toBe(true);
  });
});

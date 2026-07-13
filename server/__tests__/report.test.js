'use strict';

const path = require('path');
const { parseReport } = require('../parsers/report');

const FIXTURE = path.join(__dirname, '../../reports/example/Report-7-10-2026.md');

describe('Report parser — Report-7-10-2026.md', () => {
  let r;
  beforeAll(() => { r = parseReport(FIXTURE); });

  // ── Title ─────────────────────────────────────────────────────────────────

  test('extracts title from H1', () => {
    expect(r.title).toMatch(/End-of-Day Review/);
    expect(r.title).toMatch(/10 July 2026/);
  });

  // ── Plan vs Actual ────────────────────────────────────────────────────────

  test('parses all plan-vs-actual blocks', () => {
    expect(r.planVsActual.length).toBeGreaterThan(0);
  });

  test('first block is Cowork block with correct planned time', () => {
    const cowork = r.planVsActual.find(b => b.heading.includes('Cowork'));
    expect(cowork).toBeDefined();
    expect(cowork.planned).toMatch(/08:30/);
    expect(cowork.status).toMatch(/Done/);
  });

  test('AB#197 block is marked done (✅)', () => {
    const ab197 = r.planVsActual.find(b => b.heading.includes('AB#197'));
    expect(ab197).toBeDefined();
    expect(ab197.statusIndicator).toBe('done');
  });

  test('at least one block has a warning indicator (⚠️)', () => {
    const warnings = r.planVsActual.filter(b => b.statusIndicator === 'warning');
    expect(warnings.length).toBeGreaterThan(0);
  });

  // ── Unplanned Work ────────────────────────────────────────────────────────

  test('parses unplanned work table rows', () => {
    expect(r.unplannedWork.length).toBeGreaterThan(0);
  });

  test('AppSrv2 incident row is present', () => {
    const vm2 = r.unplannedWork.find(row => row.item && row.item.includes('AppSrv2'));
    expect(vm2).toBeDefined();
    expect(vm2.tag).toMatch(/incident/);
  });

  test('FILL IN row is present in unplanned work', () => {
    const fillIn = r.unplannedWork.find(row => row.item && /FILL IN/i.test(row.item));
    expect(fillIn).toBeDefined();
    expect(fillIn.time).toMatch(/10:30/);
    expect(fillIn.duration).toBe('30 min');
  });

  // ── Completed Work ────────────────────────────────────────────────────────

  test('parses completed work list', () => {
    expect(r.completedWork.length).toBeGreaterThan(0);
  });

  test('AB#197 appears in completed work', () => {
    expect(r.completedWork.some(item => item.includes('AB#197'))).toBe(true);
  });

  test('v1.9.0 release appears in completed work', () => {
    expect(r.completedWork.some(item => item.includes('v1.9.0'))).toBe(true);
  });

  // ── Totals Summary ────────────────────────────────────────────────────────

  test('totals summary table is parsed', () => {
    expect(r.totalsSummary.length).toBeGreaterThan(0);
  });

  // ── Metrics ───────────────────────────────────────────────────────────────

  test('extracts day start time', () => {
    expect(r.metrics.dayStart).toBe('08:40');
  });

  test('extracts day end time', () => {
    expect(r.metrics.dayEnd).toBe('17:00');
  });

  test('extracts unplanned minutes', () => {
    expect(r.metrics.unplannedMinutes).toBe(90);
  });

  test('extracts unplanned percentage range', () => {
    expect(r.metrics.unplannedPercent).toMatch(/\d+/);
  });

  test('extracts planned items completed count', () => {
    expect(r.metrics.plannedCompleted).toBe(7);
    expect(r.metrics.plannedTotal).toBe(8);
  });

  test('slipped count is at least 1', () => {
    expect(r.metrics.slippedCount).toBeGreaterThanOrEqual(1);
  });

  test('incident count is 1', () => {
    expect(r.metrics.incidentCount).toBe(1);
  });

  test('gap count (FILL IN occurrences) is > 0', () => {
    expect(r.metrics.gapCount).toBeGreaterThan(0);
  });

  test('carry-forward count covers blocked + planned items', () => {
    expect(r.metrics.carryForwardCount).toBeGreaterThan(0);
  });

  // ── Carry Forward ─────────────────────────────────────────────────────────

  test('parses carry-forward blocked items', () => {
    expect(r.carryForward.blocked.length).toBeGreaterThanOrEqual(3);
  });

  test('carry-forward blocked includes AB#115', () => {
    const ab115 = r.carryForward.blocked.find(row => row.item && row.item.includes('AB#115'));
    expect(ab115).toBeDefined();
  });

  test('parses carry-forward planned items', () => {
    expect(r.carryForward.planned.length).toBeGreaterThanOrEqual(4);
  });

  test('parses carry-forward watch items', () => {
    expect(r.carryForward.watch.length).toBeGreaterThan(0);
  });

  // ── Outstanding ───────────────────────────────────────────────────────────

  test('parses outstanding items', () => {
    expect(r.outstanding.length).toBeGreaterThan(0);
  });

  // ── Notes ─────────────────────────────────────────────────────────────────

  test('parses notes section', () => {
    expect(r.notes.length).toBeGreaterThanOrEqual(2);
  });

  test('notes mention big wins', () => {
    expect(r.notes.some(n => n.includes('AB#197'))).toBe(true);
  });

  // ── Gaps ─────────────────────────────────────────────────────────────────

  test('surfaces FILL IN as an explicit gap', () => {
    expect(r.gaps.length).toBeGreaterThan(0);
    expect(r.gaps[0].location).toBe('unplannedWork');
  });
});

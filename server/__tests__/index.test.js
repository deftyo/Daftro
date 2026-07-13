'use strict';

const path = require('path');
const { scanDirectory, buildDay, parseDate } = require('../parsers/index');

const EXAMPLE_DIR  = path.join(__dirname, '../../reports/example');
const TASKLIST_PATH = path.join(EXAMPLE_DIR, 'Tasklist-7-10-2026.txt');

describe('parseDate', () => {
  test('parses M-DD-YYYY into correct JS Date', () => {
    const d = parseDate('7-10-2026');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);  // July = 6 (0-indexed)
    expect(d.getDate()).toBe(10);
  });

  test('returns null for malformed date string', () => {
    expect(parseDate('not-a-date')).toBeNull();
  });

  test('handles single-digit month without zero-padding', () => {
    const d = parseDate('1-05-2026');
    expect(d.getMonth()).toBe(0); // January
    expect(d.getDate()).toBe(5);
  });
});

describe('scanDirectory — example dir', () => {
  let days;
  beforeAll(() => { days = scanDirectory(EXAMPLE_DIR); });

  test('finds exactly one day', () => {
    expect(days).toHaveLength(1);
  });

  test('date string is 7-10-2026', () => {
    expect(days[0].date).toBe('7-10-2026');
  });

  test('day is marked complete (both files found)', () => {
    expect(days[0].isComplete).toBe(true);
  });

  test('tasklist is parsed', () => {
    expect(days[0].tasklist).not.toBeNull();
    expect(days[0].tasklist.date).toBe('7-10-2026');
  });

  test('report is parsed and date is set from filename', () => {
    expect(days[0].report).not.toBeNull();
    expect(days[0].report.date).toBe('7-10-2026');
  });

  test('gaps are aggregated from both files', () => {
    // tasklist has 1 FILL IN; report surfaces the same via unplannedWork
    expect(days[0].gaps.length).toBeGreaterThan(0);
  });

  test('no parse errors', () => {
    expect(days[0].tasklistError).toBeNull();
    expect(days[0].reportError).toBeNull();
  });
});

describe('buildDay — partial day (tasklist only)', () => {
  let day;
  beforeAll(() => { day = buildDay('7-10-2026', TASKLIST_PATH, null); });

  test('isComplete is false', () => {
    expect(day.isComplete).toBe(false);
  });

  test('tasklist is populated', () => {
    expect(day.tasklist).not.toBeNull();
  });

  test('report is null', () => {
    expect(day.report).toBeNull();
  });

  test('reportError is null (no attempt made)', () => {
    expect(day.reportError).toBeNull();
  });
});

'use strict';

jest.mock('../lib/db', () => ({
  day: {
    findUnique: jest.fn(),
    findMany:   jest.fn(),
    upsert:     jest.fn(),
    deleteMany: jest.fn(),
  },
}));

const prisma = require('../lib/db');
const store  = require('../store');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('upsertDay — hasGap', () => {
  test('sets hasGap: true when the tasklist has gaps', async () => {
    const tasklist = { gaps: [{ location: 'dayPlan', start: '09:00', end: '10:00' }] };
    await store.upsertDay('7-10-2026', { tasklist, report: null, isComplete: false });

    const fields = prisma.day.upsert.mock.calls[0][0].update;
    expect(fields.hasGap).toBe(true);
  });

  test('sets hasGap: true when the report has gaps', async () => {
    const report = { gaps: [{ location: 'unplannedWork', item: 'FILL IN' }], metrics: {} };
    await store.upsertDay('7-10-2026', { tasklist: null, report, isComplete: false });

    const fields = prisma.day.upsert.mock.calls[0][0].update;
    expect(fields.hasGap).toBe(true);
  });

  test('sets hasGap: false when neither tasklist nor report has gaps', async () => {
    const tasklist = { gaps: [] };
    const report    = { gaps: [], metrics: {} };
    await store.upsertDay('7-10-2026', { tasklist, report, isComplete: false });

    const fields = prisma.day.upsert.mock.calls[0][0].update;
    expect(fields.hasGap).toBe(false);
  });

  test('sets hasGap: false when tasklist and report are both null', async () => {
    await store.upsertDay('7-10-2026', { tasklist: null, report: null, isComplete: false });

    const fields = prisma.day.upsert.mock.calls[0][0].update;
    expect(fields.hasGap).toBe(false);
  });
});

describe('getByDate — gaps', () => {
  test('returns real gap objects merged from tasklistData and reportData', async () => {
    const tasklistGap = { location: 'dayPlan', start: '09:00', end: '10:00', hasFillIn: true };
    const reportGap    = { location: 'unplannedWork', item: 'FILL IN' };

    prisma.day.findUnique.mockResolvedValue({
      date: '7-10-2026',
      parsedDate: new Date('2026-07-10T00:00:00.000Z'),
      isComplete: true,
      hasGap: true,
      tasklistMissing: false,
      reportMissing: false,
      tasklistData: { gaps: [tasklistGap] },
      reportData:   { gaps: [reportGap] },
    });

    const day = await store.getByDate('7-10-2026');

    expect(day.gaps).toHaveLength(2);
    expect(day.gaps).toContainEqual(tasklistGap);
    expect(day.gaps).toContainEqual(reportGap);
    // Must be real objects, not the old string-array placeholder.
    expect(day.gaps.every(g => typeof g === 'object')).toBe(true);
  });

  test('returns an empty gaps array when tasklistData/reportData have no gaps', async () => {
    prisma.day.findUnique.mockResolvedValue({
      date: '7-11-2026',
      parsedDate: new Date('2026-07-11T00:00:00.000Z'),
      isComplete: true,
      hasGap: false,
      tasklistMissing: false,
      reportMissing: false,
      tasklistData: { gaps: [] },
      reportData:   { gaps: [] },
    });

    const day = await store.getByDate('7-11-2026');
    expect(day.gaps).toEqual([]);
  });
});

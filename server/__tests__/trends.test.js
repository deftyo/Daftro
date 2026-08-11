'use strict';

const {
  blockDuration,
  isMeeting,
  isOverhead,
  meetingMinutes,
  overheadMinutes,
  devMinutes,
  categoryBreakdown,
  mergeCategoryBreakdowns,
  toHours,
  overtimeHours,
  completionRate,
  avg,
  avgF,
  sum,
  isWeekday,
  listWeekdays,
  computeCompleteness,
} = require('../lib/trends');

// ── blockDuration ────────────────────────────────────────────────────────────

describe('blockDuration', () => {
  test('calculates minutes between start and end', () => {
    expect(blockDuration({ start: '09:00', end: '10:30' })).toBe(90);
  });

  test('returns 0 for same start and end', () => {
    expect(blockDuration({ start: '10:00', end: '10:00' })).toBe(0);
  });

  test('returns 0 for negative duration', () => {
    expect(blockDuration({ start: '11:00', end: '09:00' })).toBe(0);
  });

  test('returns 0 when start is missing', () => {
    expect(blockDuration({ end: '10:00' })).toBe(0);
  });

  test('returns 0 when end is missing', () => {
    expect(blockDuration({ start: '09:00' })).toBe(0);
  });

  test('handles minute-precision correctly', () => {
    expect(blockDuration({ start: '09:15', end: '09:45' })).toBe(30);
  });
});

// ── isMeeting ────────────────────────────────────────────────────────────────

describe('isMeeting', () => {
  test('returns true for category=meeting', () => {
    expect(isMeeting({ category: 'meeting' })).toBe(true);
  });

  test('returns true for description containing "meeting" (case-insensitive)', () => {
    expect(isMeeting({ description: 'Line-manager Meeting' })).toBe(true);
    expect(isMeeting({ description: 'franchisee meeting' })).toBe(true);
  });

  test('returns false for unrelated category', () => {
    expect(isMeeting({ category: 'development' })).toBe(false);
  });

  test('returns false for unrelated description', () => {
    expect(isMeeting({ description: 'Write tests' })).toBe(false);
  });

  test('category takes precedence — category=admin is not a meeting', () => {
    expect(isMeeting({ category: 'admin', description: 'Meeting notes doc' })).toBe(false);
  });
});

// ── isOverhead ───────────────────────────────────────────────────────────────

describe('isOverhead', () => {
  test('returns true for meeting, admin, support, other categories', () => {
    for (const cat of ['meeting', 'admin', 'support', 'other']) {
      expect(isOverhead({ category: cat })).toBe(true);
    }
  });

  test('returns false for development and planning categories', () => {
    expect(isOverhead({ category: 'development' })).toBe(false);
    expect(isOverhead({ category: 'planning'    })).toBe(false);
  });

  test('falls back to meeting regex when no category set', () => {
    expect(isOverhead({ description: 'Standup meeting' })).toBe(true);
    expect(isOverhead({ description: 'Write code' })).toBe(false);
  });

  test('respects category even when description says meeting', () => {
    expect(isOverhead({ category: 'development', description: 'meeting notes' })).toBe(false);
  });
});

// ── meetingMinutes ───────────────────────────────────────────────────────────

describe('meetingMinutes', () => {
  test('sums blocks with category=meeting', () => {
    const day = { tasklistData: { plan: [
      { category: 'meeting', start: '09:00', end: '09:30' },
      { category: 'meeting', start: '14:00', end: '15:00' },
      { category: 'development', start: '10:00', end: '12:00' },
    ] } };
    expect(meetingMinutes(day)).toBe(90);
  });

  test('counts legacy blocks matched by description regex', () => {
    const day = { tasklistData: { plan: [
      { description: 'Franchisee meeting', start: '10:00', end: '11:00' },
      { description: 'Write feature', start: '11:00', end: '12:00' },
    ] } };
    expect(meetingMinutes(day)).toBe(60);
  });

  test('returns 0 when no plan', () => {
    expect(meetingMinutes({ tasklistData: {} })).toBe(0);
    expect(meetingMinutes({})).toBe(0);
  });

  test('skips blocks with missing times', () => {
    const day = { tasklistData: { plan: [
      { category: 'meeting', start: '09:00' },  // no end
      { category: 'meeting', start: '10:00', end: '11:00' },
    ] } };
    expect(meetingMinutes(day)).toBe(60);
  });
});

// ── overheadMinutes ──────────────────────────────────────────────────────────

describe('overheadMinutes', () => {
  test('sums meeting + admin + support + other but not development or planning', () => {
    const day = { tasklistData: { plan: [
      { category: 'meeting',     start: '09:00', end: '09:30' },  // 30
      { category: 'admin',       start: '09:30', end: '10:00' },  // 30
      { category: 'support',     start: '10:00', end: '10:15' },  // 15
      { category: 'other',       start: '10:15', end: '10:30' },  // 15
      { category: 'development', start: '10:30', end: '12:00' },  // not counted
      { category: 'planning',    start: '12:00', end: '12:30' },  // not counted
    ] } };
    expect(overheadMinutes(day)).toBe(90);
  });

  test('excludes planning from overhead', () => {
    const day = { tasklistData: { plan: [
      { category: 'planning', start: '09:00', end: '10:00' },
    ] } };
    expect(overheadMinutes(day)).toBe(0);
  });
});

// ── devMinutes ───────────────────────────────────────────────────────────────

describe('devMinutes', () => {
  test('sums only development category blocks', () => {
    const day = { tasklistData: { plan: [
      { category: 'development', start: '09:00', end: '11:00' },  // 120
      { category: 'development', start: '13:00', end: '14:00' },  // 60
      { category: 'planning',    start: '11:00', end: '12:00' },  // not counted
      { category: 'meeting',     start: '12:00', end: '13:00' },  // not counted
    ] } };
    expect(devMinutes(day)).toBe(180);
  });

  test('returns 0 when no development blocks', () => {
    const day = { tasklistData: { plan: [
      { category: 'meeting', start: '09:00', end: '10:00' },
    ] } };
    expect(devMinutes(day)).toBe(0);
  });
});

// ── categoryBreakdown ────────────────────────────────────────────────────────

describe('categoryBreakdown', () => {
  test('returns minutes grouped by category', () => {
    const day = { tasklistData: { plan: [
      { category: 'development', start: '09:00', end: '11:00' },  // 120
      { category: 'meeting',     start: '11:00', end: '11:30' },  // 30
      { category: 'development', start: '13:00', end: '14:00' },  // 60
    ] } };
    expect(categoryBreakdown(day)).toEqual({ development: 180, meeting: 30 });
  });

  test('ignores blocks with no category', () => {
    const day = { tasklistData: { plan: [
      { description: 'Something', start: '09:00', end: '10:00' },
    ] } };
    expect(categoryBreakdown(day)).toEqual({});
  });

  test('ignores blocks with zero or negative duration', () => {
    const day = { tasklistData: { plan: [
      { category: 'development', start: '09:00', end: '09:00' },
    ] } };
    expect(categoryBreakdown(day)).toEqual({});
  });
});

// ── mergeCategoryBreakdowns ──────────────────────────────────────────────────

describe('mergeCategoryBreakdowns', () => {
  test('merges multiple breakdowns', () => {
    const result = mergeCategoryBreakdowns([
      { development: 120, meeting: 30 },
      { development: 60,  admin: 45 },
    ]);
    expect(result).toEqual({ development: 180, meeting: 30, admin: 45 });
  });

  test('handles empty array', () => {
    expect(mergeCategoryBreakdowns([])).toEqual({});
  });
});

// ── toHours ──────────────────────────────────────────────────────────────────

describe('toHours', () => {
  test('converts 09:00 to 17:00 as 8.0', () => {
    expect(toHours('09:00', '17:00')).toBe(8.0);
  });

  test('converts 08:30 to 16:00 as 7.5', () => {
    expect(toHours('08:30', '16:00')).toBe(7.5);
  });

  test('returns null when start is missing', () => {
    expect(toHours(null, '17:00')).toBeNull();
  });

  test('returns null when end is missing', () => {
    expect(toHours('09:00', null)).toBeNull();
  });
});

// ── overtimeHours ────────────────────────────────────────────────────────────

describe('overtimeHours', () => {
  test('returns overtime above 7.5h standard', () => {
    const day = { dayStart: '09:00', dayEnd: '17:00' };  // 8h = 0.5h OT
    expect(overtimeHours(day)).toBe(0.5);
  });

  test('returns 0 for exactly 7.5 hours', () => {
    const day = { dayStart: '09:00', dayEnd: '16:30' };  // exactly 7.5h
    expect(overtimeHours(day)).toBe(0);
  });

  test('returns 0 for short days (no negative overtime)', () => {
    const day = { dayStart: '10:00', dayEnd: '15:00' };  // 5h
    expect(overtimeHours(day)).toBe(0);
  });

  test('returns null when times are missing', () => {
    expect(overtimeHours({ dayStart: null, dayEnd: null })).toBeNull();
  });

  test('respects custom standard hours', () => {
    const day = { dayStart: '09:00', dayEnd: '17:00' };  // 8h
    expect(overtimeHours(day, 8)).toBe(0);
    expect(overtimeHours(day, 7)).toBe(1.0);
  });
});

// ── completionRate ───────────────────────────────────────────────────────────

describe('completionRate', () => {
  test('calculates percentage correctly', () => {
    expect(completionRate(3, 4)).toBe(75);
  });

  test('returns null when completed is null', () => {
    expect(completionRate(null, 4)).toBeNull();
  });

  test('returns null when total is 0', () => {
    expect(completionRate(0, 0)).toBeNull();
  });

  test('rounds to nearest integer', () => {
    expect(completionRate(1, 3)).toBe(33);
  });
});

// ── avg / avgF / sum ──────────────────────────────────────────────────────────

describe('avg', () => {
  test('averages numbers, ignoring nulls', () => {
    expect(avg([10, null, 20])).toBe(15);
  });

  test('returns null for empty/all-null array', () => {
    expect(avg([])).toBeNull();
    expect(avg([null, null])).toBeNull();
  });
});

describe('avgF', () => {
  test('averages with 1 decimal place by default', () => {
    expect(avgF([1, 2])).toBe(1.5);
  });

  test('rounds to specified decimal places', () => {
    expect(avgF([1, 2, 3], 2)).toBe(2.0);
  });
});

describe('sum', () => {
  test('sums values ignoring nulls', () => {
    expect(sum([1, null, 2, 3])).toBe(6);
  });

  test('returns 0 for empty array', () => {
    expect(sum([])).toBe(0);
  });
});

// ── isWeekday / listWeekdays ─────────────────────────────────────────────────

describe('isWeekday', () => {
  test('Mon–Fri are weekdays', () => {
    // 2026-01-05 is a Monday
    for (let d = 5; d <= 9; d++) {
      expect(isWeekday(new Date(Date.UTC(2026, 0, d)))).toBe(true);
    }
  });

  test('Sat/Sun are not weekdays', () => {
    expect(isWeekday(new Date(Date.UTC(2026, 0, 10)))).toBe(false); // Sat
    expect(isWeekday(new Date(Date.UTC(2026, 0, 11)))).toBe(false); // Sun
  });
});

describe('listWeekdays', () => {
  test('returns only weekdays in an inclusive range spanning a weekend', () => {
    const days = listWeekdays(
      new Date(Date.UTC(2026, 0, 5)),   // Mon
      new Date(Date.UTC(2026, 0, 12)),  // next Mon
    );
    expect(days).toHaveLength(6); // Mon-Fri + following Mon
    expect(days[0].getUTCDate()).toBe(5);
    expect(days[days.length - 1].getUTCDate()).toBe(12);
  });

  test('returns empty array when start is after end', () => {
    const days = listWeekdays(new Date(Date.UTC(2026, 0, 12)), new Date(Date.UTC(2026, 0, 5)));
    expect(days).toEqual([]);
  });
});

// ── computeCompleteness ──────────────────────────────────────────────────────

describe('computeCompleteness', () => {
  test('returns all-null/zero result for no days', () => {
    const result = computeCompleteness([]);
    expect(result).toEqual({
      rangeStart: null,
      rangeEnd:   null,
      expectedWeekdays: 0,
      complete:   0,
      incomplete: 0,
      missing:    0,
      completenessPercent: null,
      missingDates:    [],
      incompleteDates: [],
    });
  });

  test('mixes complete, incomplete, and missing days correctly', () => {
    // Expected weekdays: Jan 5,6,7,8,9,12 2026 (Mon-Fri, then next Mon; weekend skipped)
    const days = [
      { parsedDate: new Date(Date.UTC(2026, 0, 5)),  isComplete: true },  // complete
      { parsedDate: new Date(Date.UTC(2026, 0, 6)),  isComplete: true },  // complete
      // Jan 7 — no row → missing
      { parsedDate: new Date(Date.UTC(2026, 0, 8)),  isComplete: false }, // incomplete
      { parsedDate: new Date(Date.UTC(2026, 0, 9)),  isComplete: true },  // complete
      // Jan 12 — no row → missing
    ];
    const today = new Date(Date.UTC(2026, 0, 13)); // Tuesday — last completed weekday is Mon Jan 12

    const result = computeCompleteness(days, { today });

    expect(result.rangeStart).toBe('2026-01-05');
    expect(result.rangeEnd).toBe('2026-01-12');
    expect(result.expectedWeekdays).toBe(6);
    expect(result.complete).toBe(3);
    expect(result.incomplete).toBe(1);
    expect(result.missing).toBe(2);
    expect(result.completenessPercent).toBe(50);
    expect(result.incompleteDates).toEqual([{ date: '2026-01-08', label: '8 Jan' }]);
    expect(result.missingDates).toEqual([
      { date: '2026-01-12', label: '12 Jan' },
      { date: '2026-01-07', label: '7 Jan' },
    ]);
  });

  test('returns 100% coverage with no missing/incomplete dates when every weekday is complete', () => {
    const days = [
      { parsedDate: new Date(Date.UTC(2026, 0, 5)), isComplete: true },
      { parsedDate: new Date(Date.UTC(2026, 0, 6)), isComplete: true },
    ];
    const today = new Date(Date.UTC(2026, 0, 7)); // Wed — last completed weekday is Tue Jan 6

    const result = computeCompleteness(days, { today });
    expect(result.expectedWeekdays).toBe(2);
    expect(result.complete).toBe(2);
    expect(result.completenessPercent).toBe(100);
    expect(result.missingDates).toEqual([]);
    expect(result.incompleteDates).toEqual([]);
  });

  test('excludes today from the range even when it has a row', () => {
    const days = [{ parsedDate: new Date(Date.UTC(2026, 0, 8)), isComplete: true }]; // Thu
    const today = new Date(Date.UTC(2026, 0, 8, 9)); // same Thursday

    const result = computeCompleteness(days, { today });
    expect(result.expectedWeekdays).toBe(0);
    expect(result.completenessPercent).toBeNull();
  });

  test('ignores days with no parsedDate', () => {
    const days = [
      { parsedDate: null, isComplete: false },
      { parsedDate: new Date(Date.UTC(2026, 0, 5)), isComplete: true },
    ];
    const today = new Date(Date.UTC(2026, 0, 6));
    const result = computeCompleteness(days, { today });
    expect(result.expectedWeekdays).toBe(1);
    expect(result.complete).toBe(1);
  });
});

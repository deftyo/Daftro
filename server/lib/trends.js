'use strict';

const OVERHEAD_CATS = new Set(['meeting', 'admin', 'support', 'other']);

// ── Block-level helpers ───────────────────────────────────────────────────────

function blockDuration(block) {
  if (!block.start || !block.end) return 0;
  const [sh, sm] = block.start.split(':').map(Number);
  const [eh, em] = block.end.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  return mins > 0 ? mins : 0;
}

function isMeeting(block) {
  if (block.category) return block.category === 'meeting';
  return !!(block.description && /meeting/i.test(block.description));
}

function isOverhead(block) {
  if (block.category) return OVERHEAD_CATS.has(block.category);
  // legacy: no category — fall back to meeting detection only
  return !!(block.description && /meeting/i.test(block.description));
}

// ── Day-level aggregates ──────────────────────────────────────────────────────

function planBlocks(day) {
  const plan = day.tasklistData?.plan;
  return Array.isArray(plan) ? plan : [];
}

function meetingMinutes(day) {
  return planBlocks(day).reduce((total, b) => total + (isMeeting(b) ? blockDuration(b) : 0), 0);
}

function overheadMinutes(day) {
  return planBlocks(day).reduce((total, b) => total + (isOverhead(b) ? blockDuration(b) : 0), 0);
}

function devMinutes(day) {
  return planBlocks(day).reduce((total, b) =>
    total + (b.category === 'development' ? blockDuration(b) : 0), 0);
}

function categoryBreakdown(day) {
  const result = {};
  for (const b of planBlocks(day)) {
    const cat = b.category || null;
    if (!cat) continue;
    const dur = blockDuration(b);
    if (dur > 0) result[cat] = (result[cat] ?? 0) + dur;
  }
  return result;
}

function mergeCategoryBreakdowns(breakdowns) {
  const merged = {};
  for (const bd of breakdowns) {
    for (const [cat, mins] of Object.entries(bd)) {
      merged[cat] = (merged[cat] ?? 0) + mins;
    }
  }
  return merged;
}

// ── Time / statistical helpers ────────────────────────────────────────────────

function toHours(start, end) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 6) / 10;
}

// Returns hours of overtime (day length beyond standard), or 0, or null if no times
function overtimeHours(day, standardHours = 7.5) {
  const length = toHours(day.dayStart, day.dayEnd);
  if (length == null) return null;
  const ot = length - standardHours;
  return Math.round(Math.max(0, ot) * 10) / 10;
}

function completionRate(completed, total) {
  if (completed == null || !total) return null;
  return Math.round(completed / total * 100);
}

function avg(arr) {
  const valid = arr.filter(v => v != null);
  return valid.length ? Math.round(valid.reduce((s, v) => s + v, 0) / valid.length) : null;
}

function avgF(arr, dp = 1) {
  const valid = arr.filter(v => v != null);
  if (!valid.length) return null;
  const mean = valid.reduce((s, v) => s + v, 0) / valid.length;
  return Math.round(mean * 10 ** dp) / 10 ** dp;
}

function sum(arr) {
  return arr.filter(v => v != null).reduce((s, v) => s + v, 0);
}

module.exports = {
  OVERHEAD_CATS,
  blockDuration,
  isMeeting,
  isOverhead,
  planBlocks,
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
};

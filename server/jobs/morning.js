'use strict';

const store = require('../store');

function prevWeekday() {
  const d = new Date();
  do { d.setDate(d.getDate() - 1); } while (d.getDay() === 0 || d.getDay() === 6);
  return d;
}

function toApiDate(d) {
  return `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
}

async function runMorningJob() {
  const todayStr = toApiDate(new Date());
  const prevStr  = toApiDate(prevWeekday());

  const existing = await store.getByDate(todayStr);
  if (existing) {
    console.log(`[morning] ${todayStr} already exists — skipping`);
    return;
  }

  const prev = await store.getByDate(prevStr);
  const cf   = prev?.report?.carryForward ?? {};
  const carriedForward = [
    ...(cf.blocked ?? []).map(x => x.item ?? x),
    ...(cf.planned ?? []).map(x => x.item ?? x),
  ].filter(Boolean);

  await store.upsertDay(todayStr, {
    tasklist: { source: 'direct', carriedForward, priorities: [], plan: [] },
    report:   { source: 'direct' },
    isComplete: false,
  });

  console.log(`[morning] Created ${todayStr} with ${carriedForward.length} carry-forward(s) from ${prevStr}`);
}

module.exports = { runMorningJob };

'use strict';

const store = require('../store');

function nextWeekday() {
  const d = new Date();
  do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
  return d;
}

function toApiDate(d) {
  return `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
}

async function runEveningJob() {
  const todayStr    = toApiDate(new Date());
  const tomorrowStr = toApiDate(nextWeekday());

  const today = await store.getByDate(todayStr);
  if (!today) {
    console.log(`[evening] No entry found for ${todayStr} — skipping`);
    return;
  }

  if (!today.isComplete) {
    console.log(`[evening] ${todayStr} not marked complete — skipping tomorrow skeleton`);
    return;
  }

  const existing = await store.getByDate(tomorrowStr);
  if (existing) {
    console.log(`[evening] ${tomorrowStr} already exists — skipping`);
    return;
  }

  await store.upsertDay(tomorrowStr, {
    tasklist: { source: 'direct', priorities: [], plan: [] },
    report:   { source: 'direct' },
    isComplete: false,
  });

  console.log(`[evening] Created ${tomorrowStr}`);
}

module.exports = { runEveningJob };

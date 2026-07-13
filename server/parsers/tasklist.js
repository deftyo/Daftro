'use strict';

const fs = require('fs');

// Parses "HH:MM-HH:MM - description (TAG)" into a structured block object.
function parseTimeBlock(line) {
  const match = line.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s*-\s*(.+)$/);
  if (!match) return null;

  const [, start, end, description] = match;
  const tags = [];
  if (/\(FIXED\)/i.test(description)) tags.push('FIXED');
  if (/\(PROTECT\)/i.test(description)) tags.push('PROTECT');

  return {
    start,
    end,
    description: description.trim(),
    tags,
    isOpen: /^\[OPEN\]/.test(description.trim()),
    hasFillIn: /FILL IN/i.test(description),
  };
}

function parseBulletList(lines) {
  return lines
    .map(l => l.trim())
    .filter(l => l.startsWith('- '))
    .map(l => l.slice(2));
}

function parseTasklistContent(content) {
  const lines = content.split(/\r?\n/).map(l => l.trimEnd());

  const result = {
    date: null,
    rawDate: null,
    dayPlan: [],
    note: null,
    priorities: [],
    carriedForward: { fromDate: null, items: [] },
    resolved: { onDate: null, items: [] },
    watch: [],
    routine: [],
    blocked: [],
    notes: [],
    accomplished: [],
    gaps: [],
  };

  let section = null;

  for (const line of lines) {
    const t = line.trim();

    // --- Header / section detection (checked before switch) ---

    if (t.startsWith('Date:')) {
      result.rawDate = t.replace('Date:', '').trim();
      const parts = result.rawDate.split('/');
      if (parts.length === 3) result.date = `${parts[0]}-${parts[1]}-${parts[2]}`;
      section = null;
      continue;
    }

    if (t === 'Planned Task List for today:') continue;
    if (t === 'Day plan:') { section = 'dayPlan'; continue; }

    // Note: (singular, inline value) must be checked before Notes: (section heading)
    if (t.startsWith('Note:') && !t.startsWith('Notes:')) {
      result.note = t.replace(/^Note:\s*/, '');
      section = null;
      continue;
    }

    if (t === 'Priorities for today:') { section = 'priorities'; continue; }

    if (t.startsWith('Carried forward from')) {
      section = 'carriedForward';
      const m = t.match(/^Carried forward from (.+?):/);
      if (m) result.carriedForward.fromDate = m[1].trim();
      continue;
    }

    if (t.startsWith('Resolved on')) {
      section = 'resolved';
      // "Resolved on 7/9 (no carry needed):" — stop before space or paren
      const m = t.match(/^Resolved on (.+?)[\s(]/);
      if (m) result.resolved.onDate = m[1].trim();
      continue;
    }

    if (t === 'Watch / monitoring:') { section = 'watch'; continue; }
    if (t === 'Routine:') { section = 'routine'; continue; }
    if (t === 'Blocked:') { section = 'blocked'; continue; }
    if (t === 'Notes:') { section = 'notes'; continue; }
    if (t === 'What got accomplished:') { section = 'accomplished'; continue; }

    if (!t || !section) continue;

    // --- Section content ---

    switch (section) {
      case 'dayPlan': {
        const block = parseTimeBlock(t);
        if (block) {
          result.dayPlan.push(block);
          if (block.hasFillIn) result.gaps.push({ location: 'dayPlan', ...block });
        }
        break;
      }
      case 'accomplished': {
        const block = parseTimeBlock(t);
        if (block) {
          result.accomplished.push(block);
          if (block.hasFillIn) result.gaps.push({ location: 'accomplished', ...block });
        }
        break;
      }
      case 'priorities':
        if (t.startsWith('- ')) result.priorities.push(t.slice(2));
        break;
      case 'carriedForward':
        if (t.startsWith('- ')) result.carriedForward.items.push(t.slice(2));
        break;
      case 'resolved':
        if (t.startsWith('- ')) result.resolved.items.push(t.slice(2));
        break;
      case 'watch':
        if (t.startsWith('- ')) result.watch.push(t.slice(2));
        break;
      case 'routine':
        if (t.startsWith('- ')) result.routine.push(t.slice(2));
        break;
      case 'blocked':
        if (t.startsWith('- ')) result.blocked.push(t.slice(2));
        break;
      case 'notes':
        if (t.startsWith('- ')) result.notes.push(t.slice(2));
        break;
    }
  }

  return result;
}

function parseTasklist(filePath) {
  return parseTasklistContent(fs.readFileSync(filePath, 'utf8'));
}

module.exports = { parseTasklist, parseTasklistContent, parseTimeBlock };

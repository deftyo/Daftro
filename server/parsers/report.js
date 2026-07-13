'use strict';

const fs = require('fs');

// ── Markdown table helpers ────────────────────────────────────────────────────

function parseTableRow(line) {
  return line
    .split('|')
    .slice(1, -1)
    .map(cell => cell.trim());
}

function headerKey(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim()
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase());
}

function parseMarkdownTable(lines) {
  const tableLines = lines.filter(l => l.trim().startsWith('|'));
  if (tableLines.length < 3) return [];

  const headers = parseTableRow(tableLines[0]).map(headerKey);
  const rows = [];

  for (let i = 2; i < tableLines.length; i++) {
    if (/^[\s|:-]+$/.test(tableLines[i])) continue;
    const values = parseTableRow(tableLines[i]);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = values[idx] ?? ''; });
    rows.push(obj);
  }

  return rows;
}

// ── Section splitting ─────────────────────────────────────────────────────────

function splitByH2(lines) {
  const sections = [];
  let current = null;
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { heading: line.slice(3).trim(), contentLines: [] };
    } else if (current) {
      current.contentLines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

function splitByH3(lines) {
  const sections = [];
  let current = null;
  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (current) sections.push(current);
      current = { heading: line.slice(4).trim(), contentLines: [] };
    } else if (current) {
      current.contentLines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

// ── Plan vs Actual ────────────────────────────────────────────────────────────

// Handles both formats:
//   Bullet format (example):  - **Planned:** 08:30–08:40
//   Table format (real logs): | **Planned** | 08:30–08:40 |
function parsePlanVsActualBlock(contentLines) {
  const block = { planned: null, actual: null, status: null, statusIndicator: null, notes: [] };
  const hasTable = contentLines.some(l => l.trim().startsWith('|'));

  if (hasTable) {
    for (const line of contentLines) {
      const t = line.trim();
      if (!t.startsWith('|')) continue;
      const cells = t.split('|').map(s => s.replace(/\*\*/g, '').trim()).filter(Boolean);
      if (cells.length < 2) continue;
      const k = cells[0].toLowerCase();
      const v = cells.slice(1).join(' | ');
      if (k === 'planned')                   { block.planned = v; }
      else if (k === 'actual')               { block.actual  = v; }
      else if (k === 'status' || k === 'outcome') {
        block.status = v;
        if (/✅/.test(v) || /^done/i.test(v))                     block.statusIndicator = 'done';
        else if (/⚠️|partial|late|not done|not started/i.test(v)) block.statusIndicator = 'warning';
        else                                                         block.statusIndicator = 'partial';
      } else if (k === 'variance' || k === 'note') {
        if (v) block.notes.push(v);
      }
    }
  } else {
    for (const line of contentLines) {
      const t = line.trim();
      const plannedM = t.match(/^- \*\*Planned:\*\*\s*(.+)$/);
      const actualM  = t.match(/^- \*\*Actual:\*\*\s*(.+)$/);
      const statusM  = t.match(/^- \*\*Status:\*\*\s*(.+)$/);
      const noteM    = t.match(/^- \*\*Note:\*\*\s*(.+)$/);
      if (plannedM) { block.planned = plannedM[1].trim(); continue; }
      if (actualM)  { block.actual  = actualM[1].trim();  continue; }
      if (statusM) {
        const raw = statusM[1].trim();
        block.status = raw;
        if (raw.includes('✅'))      block.statusIndicator = 'done';
        else if (raw.includes('⚠️')) block.statusIndicator = 'warning';
        else                          block.statusIndicator = 'partial';
        continue;
      }
      if (noteM) { block.notes.push(noteM[1].trim()); continue; }
      if (t.startsWith('- ') && !t.startsWith('- **')) block.notes.push(t.slice(2));
    }
  }

  return block;
}

function parsePlanVsActual(lines) {
  return splitByH3(lines).map(({ heading, contentLines }) => ({
    heading,
    ...parsePlanVsActualBlock(contentLines),
  }));
}

// ── Other section parsers ─────────────────────────────────────────────────────

function parseCompletedWork(lines) {
  return lines
    .map(l => l.trim())
    .filter(l => l.startsWith('- '))
    .map(l => l.slice(2));
}

function parseTextSection(lines) {
  return lines
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('---') && !l.startsWith('|') && !l.match(/^[-:]+$/))
    .map(l => (l.startsWith('- ') ? l.slice(2) : l));
}

function parseCarryForward(lines) {
  const result = { blocked: [], planned: [], watch: [] };
  let subSection = null;
  let subLines = [];

  const flush = () => {
    if (!subSection) return;
    if (subSection === 'blocked') result.blocked = parseMarkdownTable(subLines);
    else if (subSection === 'planned') {
      result.planned.push(...parseMarkdownTable(subLines));
    } else if (subSection === 'watch') {
      result.watch.push(
        ...subLines
          .map(l => l.trim())
          .filter(l => l.startsWith('- '))
          .map(l => l.slice(2))
      );
    }
    subLines = [];
  };

  for (const line of lines) {
    if (line.startsWith('### ')) {
      flush();
      const h = line.slice(4).toLowerCase();
      if (h.includes('blocked'))                                         subSection = 'blocked';
      else if (h.includes('planned') || h.includes('not completed') ||
               h.includes('incomplete') || h.includes('in-progress') ||
               h.includes('carried'))                                    subSection = 'planned';
      else if (h.includes('watch') || h.includes('monitor'))            subSection = 'watch';
      else subSection = null;
    } else {
      subLines.push(line);
    }
  }
  flush();

  return result;
}

// ── Metrics extraction ────────────────────────────────────────────────────────

function extractMetrics(tableRows) {
  const m = {
    dayStart: null, dayEnd: null,
    unplannedMinutes: null, unplannedPercent: null,
    plannedCompleted: null, plannedTotal: null,
    slippedCount: null,
    carryForwardCount: null,
    incidentCount: null,
    gapCount: null,
  };

  for (const row of tableRows) {
    const key   = (row.metric || '').toLowerCase();
    const value = row.value  || '';

    // Day start/end
    // Example: "day start → end"       → "08:40–17:00 ≈ **8 h 20 min** logged"
    // Real:    "approx. hours logged"   → "~7.5h (08:10–16:00+, minus 30 min lunch)"
    if (key.includes('day start') || key.includes('hours logged')) {
      const times = value.match(/(\d{1,2}:\d{2})[–\-](\d{1,2}:\d{2})/);
      if (times) { m.dayStart = times[1]; m.dayEnd = times[2]; }
    }

    // Unplanned time — example format only (real format uses bold line, handled in root parser)
    if (key.includes('unplanned time')) {
      const hm   = value.match(/~?(\d+)h\s*(\d+)?\s*min/i);
      const mins = value.match(/~?(\d+)\s*min/i);
      if (hm)   m.unplannedMinutes = parseInt(hm[1]) * 60 + (parseInt(hm[2]) || 0);
      else if (mins) m.unplannedMinutes = parseInt(mins[1], 10);
    }

    // Unplanned share/percent — both formats
    if (key.includes('unplanned share') || key.includes('unplanned time')) {
      const pct = value.match(/~?(\d+)[–\-]?(\d+)?%/);
      if (pct) m.unplannedPercent = pct[2] ? `${pct[1]}-${pct[2]}%` : `${pct[1]}%`;
    }

    // Planned items completed
    // Example: "7 of ~8 discrete items"
    // Real:    "Vlad ✓, AB#196 PR ✓, ADO admin ✓, lunch (late) ✓"
    if (key.includes('planned items completed')) {
      const counts = value.match(/(\d+)\s+of\s+~?(\d+)/);
      if (counts) {
        m.plannedCompleted = parseInt(counts[1], 10);
        m.plannedTotal     = parseInt(counts[2], 10);
      } else {
        const ticks = (value.match(/✓/g) || []).length;
        if (ticks > 0) m.plannedCompleted = ticks;
      }
    }

    // Slipped count
    // Example: separated by ";"     → "ADO (partial); after-lunch email (not logged)"
    // Real:    separated by ","     → "AB#156 Webpush, day-end review (in progress)"
    if (key.includes('slipped') || key.includes('partial')) {
      if (value && !/none/i.test(value)) {
        const parts = value.split(/[;,]/).map(s => s.trim()).filter(Boolean);
        if (parts.length) m.slippedCount = parts.length;
      }
    }
  }

  // Derive plannedTotal from completed + slipped when only tick-count was available
  if (m.plannedCompleted != null && m.plannedTotal == null && m.slippedCount != null) {
    m.plannedTotal = m.plannedCompleted + m.slippedCount;
  }

  return m;
}

// ── Root parser ───────────────────────────────────────────────────────────────

function parseReportContent(content) {
  const lines = content.split(/\r?\n/);

  const result = {
    date: null,
    title: null,
    planVsActual: [],
    unplannedWork: [],
    completedWork: [],
    totalsSummary: [],
    outstanding: [],
    carryForward: { blocked: [], planned: [], watch: [] },
    notes: [],
    metrics: {},
    gaps: [],
  };

  const h1 = lines.find(l => l.startsWith('# '));
  if (h1) result.title = h1.slice(2).trim();

  let unplannedSectionLines = [];

  for (const { heading, contentLines } of splitByH2(lines)) {
    const h = heading.toLowerCase();

    if (h.includes('plan vs actual')) {
      result.planVsActual = parsePlanVsActual(contentLines);
    } else if (h.includes('unplanned work')) {
      unplannedSectionLines = contentLines;
      result.unplannedWork = parseMarkdownTable(contentLines);
    } else if (h.includes('completed work')) {
      result.completedWork = parseCompletedWork(contentLines);
    } else if (h === 'priority items' || h.includes('priorities')) {
      // Real format uses "Priority Items" instead of "Completed Work"
      if (result.completedWork.length === 0) {
        result.completedWork = parseMarkdownTable(contentLines)
          .map(r => [r.priority, r.status].filter(Boolean).join(' — '))
          .filter(Boolean);
      }
    } else if (h.includes('totals summary')) {
      result.totalsSummary = parseMarkdownTable(contentLines);
      result.metrics = extractMetrics(result.totalsSummary);
    } else if (h.includes('outstanding') || h.includes('not completed today')) {
      result.outstanding = parseTextSection(contentLines);
    } else if (h.includes('carry forward')) {
      result.carryForward = parseCarryForward(contentLines);
    } else if (h === 'notes') {
      result.notes = parseTextSection(contentLines);
    }
  }

  // Real format: extract unplanned minutes from bold estimated-total line if
  // it wasn't found in the Totals Summary table.
  if (!result.metrics.unplannedMinutes) {
    const boldLine = unplannedSectionLines
      .map(l => l.trim())
      .find(l => /estimated unplanned|unplanned total/i.test(l));
    if (boldLine) {
      const hm   = boldLine.match(/~?(\d+)h\s*(\d+)?\s*min/i);
      const mins = boldLine.match(/~?(\d+)\s*min/i);
      if (hm)   result.metrics.unplannedMinutes = parseInt(hm[1]) * 60 + (parseInt(hm[2]) || 0);
      else if (mins) result.metrics.unplannedMinutes = parseInt(mins[1], 10);

      if (!result.metrics.unplannedPercent) {
        const pct = boldLine.match(/≈\s*~?(\d+)%/);
        if (pct) result.metrics.unplannedPercent = `${pct[1]}%`;
      }
    }
  }

  // Incident count: check tag column (example) or item text (real format)
  result.metrics.incidentCount = result.unplannedWork.filter(row =>
    (row.tag  && row.tag.toLowerCase().includes('incident')) ||
    (row.item && row.item.toLowerCase().includes('incident') && !/fill in/i.test(row.item))
  ).length;

  result.metrics.gapCount = (content.match(/FILL IN/g) || []).length;

  result.metrics.carryForwardCount =
    result.carryForward.blocked.length + result.carryForward.planned.length;

  for (const row of result.unplannedWork) {
    if (row.item && /FILL IN/i.test(row.item)) {
      result.gaps.push({ location: 'unplannedWork', ...row });
    }
  }

  return result;
}

function parseReport(filePath) {
  return parseReportContent(fs.readFileSync(filePath, 'utf8'));
}

module.exports = { parseReport, parseReportContent, parseMarkdownTable, headerKey };

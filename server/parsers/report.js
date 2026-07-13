'use strict';

const fs = require('fs');

// ── Markdown table helpers ────────────────────────────────────────────────────

function parseTableRow(line) {
  return line
    .split('|')
    .slice(1, -1) // strip leading/trailing empty cells from `| ... |`
    .map(cell => cell.trim());
}

// Converts a table header string to a camelCase key.
// "Reason / Impact" → "reasonImpact"
function headerKey(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim()
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase());
}

function parseMarkdownTable(lines) {
  const tableLines = lines.filter(l => l.trim().startsWith('|'));
  if (tableLines.length < 3) return []; // header + separator + at least one row

  const headers = parseTableRow(tableLines[0]).map(headerKey);
  const rows = [];

  for (let i = 2; i < tableLines.length; i++) {
    // Skip separator-only rows (---|---|---)
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

// ── Section parsers ───────────────────────────────────────────────────────────

function parsePlanVsActual(lines) {
  return splitByH3(lines).map(({ heading, contentLines }) => {
    const block = {
      heading,
      planned: null,
      actual: null,
      status: null,
      statusIndicator: null,
      notes: [],
    };

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
      // Catch any remaining `- ` lines as supplementary notes
      if (t.startsWith('- ') && !t.startsWith('- **')) block.notes.push(t.slice(2));
    }

    return block;
  });
}

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
    else if (subSection === 'planned') result.planned = parseMarkdownTable(subLines);
    else if (subSection === 'watch') {
      result.watch = subLines
        .map(l => l.trim())
        .filter(l => l.startsWith('- '))
        .map(l => l.slice(2));
    }
    subLines = [];
  };

  for (const line of lines) {
    if (line.startsWith('### ')) {
      flush();
      const h = line.slice(4).toLowerCase();
      if (h.includes('blocked'))          subSection = 'blocked';
      else if (h.includes('planned') || h.includes('not completed')) subSection = 'planned';
      else if (h.includes('watch') || h.includes('monitor'))         subSection = 'watch';
      else subSection = null;
    } else {
      subLines.push(line);
    }
  }
  flush();

  return result;
}

// ── Metric extraction from Totals Summary table ───────────────────────────────

function extractMetrics(tableRows) {
  const m = {
    dayStart: null,
    dayEnd: null,
    unplannedMinutes: null,
    unplannedPercent: null,
    plannedCompleted: null,
    plannedTotal: null,
    slippedCount: null,
    carryForwardCount: null, // populated later from carryForward section
    incidentCount: null,     // populated later from unplannedWork
    gapCount: null,          // populated later from raw content scan
  };

  for (const row of tableRows) {
    const key   = (row.metric || '').toLowerCase();
    const value = row.value || '';

    if (key.includes('day start')) {
      // "08:40–17:00 ≈ **8 h 20 min** logged"
      const times = value.match(/(\d{1,2}:\d{2})[–\-](\d{1,2}:\d{2})/);
      if (times) { m.dayStart = times[1]; m.dayEnd = times[2]; }
    }

    if (key.includes('unplanned time')) {
      const mins = value.match(/~?(\d+)\s*min/);
      if (mins) m.unplannedMinutes = parseInt(mins[1], 10);
    }

    if (key.includes('unplanned share')) {
      const pct = value.match(/~?(\d+)[–\-]?(\d+)?%/);
      if (pct) m.unplannedPercent = pct[2] ? `${pct[1]}-${pct[2]}%` : `${pct[1]}%`;
    }

    if (key.includes('planned items completed')) {
      const counts = value.match(/(\d+)\s+of\s+~?(\d+)/);
      if (counts) {
        m.plannedCompleted = parseInt(counts[1], 10);
        m.plannedTotal     = parseInt(counts[2], 10);
      }
    }

    if (key.includes('items slipped')) {
      const parts = value.split(';').map(s => s.trim()).filter(Boolean);
      if (parts.length) m.slippedCount = parts.length;
    }
  }

  return m;
}

// ── Root parser ───────────────────────────────────────────────────────────────

function parseReportContent(content) {
  const lines = content.split(/\r?\n/);

  const result = {
    date: null, // set by index.js from filename
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

  // Title from H1
  const h1 = lines.find(l => l.startsWith('# '));
  if (h1) result.title = h1.slice(2).trim();

  for (const { heading, contentLines } of splitByH2(lines)) {
    const h = heading.toLowerCase();

    if (h.includes('plan vs actual')) {
      result.planVsActual = parsePlanVsActual(contentLines);
    } else if (h.includes('unplanned work')) {
      result.unplannedWork = parseMarkdownTable(contentLines);
    } else if (h.includes('completed work')) {
      result.completedWork = parseCompletedWork(contentLines);
    } else if (h.includes('totals summary')) {
      result.totalsSummary = parseMarkdownTable(contentLines);
      result.metrics = extractMetrics(result.totalsSummary);
    } else if (h.includes('outstanding') || h.includes('not completed')) {
      result.outstanding = parseTextSection(contentLines);
    } else if (h.includes('carry forward')) {
      result.carryForward = parseCarryForward(contentLines);
    } else if (h === 'notes') {
      result.notes = parseTextSection(contentLines);
    }
  }

  // Derived metrics
  result.metrics.incidentCount = result.unplannedWork.filter(
    row => row.tag && row.tag.toLowerCase().includes('incident')
  ).length;

  result.metrics.gapCount = (content.match(/FILL IN/g) || []).length;

  result.metrics.carryForwardCount =
    result.carryForward.blocked.length + result.carryForward.planned.length;

  // Surface FILL IN rows as explicit gaps
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

module.exports = { parseReport, parseReportContent };

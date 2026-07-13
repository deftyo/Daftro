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

  // ── H3 subsections (July 9-10 format, July 8 format) ─────────────────────
  if (lines.some(l => l.startsWith('### '))) {
    let subSection = null;
    let subLines = [];

    const flush = () => {
      if (!subSection) return;
      if (subSection === 'blocked') {
        const rows = parseMarkdownTable(subLines);
        result.blocked = rows.length
          ? rows
          : subLines.filter(l => l.trim().startsWith('- ')).map(l => ({ item: l.trim().slice(2) }));
      } else if (subSection === 'planned') {
        const rows = parseMarkdownTable(subLines);
        const items = rows.length
          ? rows
          : subLines.filter(l => l.trim().startsWith('- ')).map(l => ({ item: l.trim().slice(2) }));
        result.planned.push(...items);
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
                 h.includes('carried') || h.includes('slipped'))           subSection = 'planned';
        else if (h.includes('watch') || h.includes('monitor'))             subSection = 'watch';
        else subSection = null;
      } else {
        subLines.push(line);
      }
    }
    flush();
    return result;
  }

  // ── Bold-header subsections (July 1, 7 format: **Section:**) ─────────────
  const hasBoldHeader = lines.some(l => /^\*\*[^*]+\*\*:?\s*$/.test(l.trim()));

  if (hasBoldHeader) {
    let subSection = null;
    for (const line of lines) {
      const t = line.trim();
      const boldMatch = t.match(/^\*\*([^*]+)\*\*:?\s*$/);
      if (boldMatch) {
        const h = boldMatch[1].toLowerCase();
        if (h.includes('blocked'))                                              subSection = 'blocked';
        else if (h.includes('planned') || h.includes('not completed') ||
                 h.includes('slipped') || h.includes('incomplete') ||
                 h.includes('active'))                                          subSection = 'planned';
        else if (h.includes('watch') || h.includes('monitor') ||
                 h.includes('reminder') || h.includes('standing'))              subSection = 'watch';
        else if (h.includes('closed') || h.includes('resolved') ||
                 h.includes('done') || h.includes('completed'))                 subSection = null;
        else subSection = null;
        continue;
      }
      // Handle both "- item" and "1. item" numbered list entries
      const isBullet = t.startsWith('- ') || /^\d+\.\s/.test(t);
      if (isBullet && subSection) {
        const item = t.replace(/^-\s+|^\d+\.\s+/, '').replace(/\*\*/g, '').trim();
        if (subSection === 'blocked')       result.blocked.push({ item });
        else if (subSection === 'planned')  result.planned.push({ item });
        else if (subSection === 'watch')    result.watch.push(item);
      }
    }
    return result;
  }

  // ── Fallback: flat numbered list (June format) ────────────────────────────
  const items = lines
    .map(l => l.trim())
    .filter(l => /^\d+\./.test(l))
    .map(l => l.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim())
    .filter(l => l && !/^\(_?all today/i.test(l) && !/^\(_?none/i.test(l));
  result.planned = items.map(item => ({ item }));

  return result;
}

// ── Metrics extraction ────────────────────────────────────────────────────────

// For bullet-list Totals sections (June, July 1–7 format — many label variants)
function extractMetricsFromBullets(lines) {
  const m = {
    dayStart: null, dayEnd: null,
    unplannedMinutes: null, unplannedPercent: null,
    plannedCompleted: null, plannedTotal: null,
    slippedCount: null,
    carryForwardCount: null,
    incidentCount: null,
    gapCount: null,
  };

  for (const line of lines) {
    // Strip bold markers, italic, bullet prefix
    const t = line.trim().replace(/\*\*/g, '').replace(/^[-*]\s+/, '').replace(/^_|_$/g, '');
    if (!t) continue;

    // Day start/end — any line mentioning logged/productive/worked/elapsed that has a time range
    if (/\b(?:logged|productive|worked|elapsed|hours?)\b/i.test(t)) {
      const times = t.match(/(\d{1,2}:\d{2})[–\-—](\d{1,2}:\d{2})/);
      if (times && !m.dayStart) { m.dayStart = times[1]; m.dayEnd = times[2]; }
    }

    // Unplanned share — "Unplanned share: ~32%", "Unplanned/incident share: ~31%"
    if (/unplanned[/\w]*\s*(?:share|%)/i.test(t) || (/unplanned/i.test(t) && /%/.test(t))) {
      if (!m.unplannedPercent) {
        const pct = t.match(/[≈~]?\s*(\d+)[–\-]?(\d+)?%/);
        if (pct) m.unplannedPercent = pct[2] ? `${pct[1]}-${pct[2]}%` : `${pct[1]}%`;
      }
    }

    // Planned completion — multiple label variants:
    //   "Planned items completed: 8 of 10"  "Planned items completed: 8"
    //   "Planned items: ~5 completed ... vs ~3 slipped"
    //   "Planned items: 5 done ... 1 slipped"   "Planned items: ~7 of 11 completed"
    //   "Planned priorities: 1 of 3"
    if (/planned (?:items?|priorities?)[: ]/i.test(t) && m.plannedCompleted == null) {
      // "X of Y" or "~X of ~Y"
      const ofN    = t.match(/~?(\d+)\s+of\s+(?:the\s+)?~?(\d+)/);
      // "X/Y" fraction  — skip if preceded by non-digit (e.g. "MD/AB#114")
      const slash  = t.match(/(?<!\w)(\d+)\/(\d+)/);
      // "~X completed" or "X done" or "X progressed"
      const doneN  = t.match(/~?(\d+)\s+(?:completed|done|progressed)/i);
      // "N slipped" with up to 4 intervening words (e.g. "3 key dev items slipped")
      const slipN  = t.match(/\b~?(\d+)\b(?:\s+\w+){0,4}\s+(?:slipped|not\s+done|not\s+completed)\b/i);
      // Bare number right after colon — "Planned items completed: 8 (detail...)"
      const colonN = ofN || slash || doneN ? null : t.match(/:\s*~?(\d+)\s*(?:\(|,|$)/);

      if (ofN) {
        m.plannedCompleted = parseInt(ofN[1], 10);
        m.plannedTotal     = parseInt(ofN[2], 10);
      } else if (slash) {
        m.plannedCompleted = parseInt(slash[1], 10);
        m.plannedTotal     = parseInt(slash[2], 10);
      } else if (doneN) {
        m.plannedCompleted = parseInt(doneN[1], 10);
      } else if (colonN) {
        m.plannedCompleted = parseInt(colonN[1], 10);
      }

      if (slipN && m.slippedCount == null) m.slippedCount = parseInt(slipN[1], 10);
    }

    // Standalone "Slipped/not done: 3 (...)"
    if (/^slipped[^:]*:/i.test(t)) {
      const n = t.match(/:\s*(\d+)/);
      if (n && m.slippedCount == null) m.slippedCount = parseInt(n[1], 10);
    }

    // Unplanned minutes from Totals bullets — "~4h on unplanned", "~2h40m unplanned", "~2h15m (~24%)"
    if (!m.unplannedMinutes && /unplanned/i.test(t)) {
      const hm    = t.match(/~?(\d+)h\s*(\d+)\s*m(?:in)?\b/i);
      const honly = t.match(/~?(\d+(?:\.\d+)?)h\b/i);
      if (hm)    m.unplannedMinutes = parseInt(hm[1]) * 60 + parseInt(hm[2]);
      else if (honly) m.unplannedMinutes = Math.round(parseFloat(honly[1]) * 60);
    }
  }

  if (m.plannedCompleted != null && m.plannedTotal == null && m.slippedCount != null) {
    m.plannedTotal = m.plannedCompleted + m.slippedCount;
  }

  // Last resort: first line with a HH:MM–HH:MM range (covers "~9h logged (07:55–17:00)" etc.)
  if (!m.dayStart) {
    for (const line of lines) {
      const t = line.trim().replace(/\*\*/g, '');
      const times = t.match(/(\d{1,2}:\d{2})[–\-—](\d{1,2}:\d{2})/);
      if (times) { m.dayStart = times[1]; m.dayEnd = times[2]; break; }
    }
  }

  return m;
}

// For table-based ## Totals Summary sections (July 8-10 format)
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
    // Example:  "day start → end"      → "08:40–17:00 ≈ **8 h 20 min** logged"
    // July 8:   "day span"             → "08:30–17:00 (8.5h; ~8h working after lunch)"
    // Real:     "approx. hours logged" → "~7.5h (08:10–16:00+, minus 30 min lunch)"
    if (key.includes('day start') || key.includes('hours logged') || key.includes('day span')) {
      const times = value.match(/(\d{1,2}:\d{2})[–\-](\d{1,2}:\d{2})/);
      if (times) { m.dayStart = times[1]; m.dayEnd = times[2]; }
    }

    // Unplanned time — example format only (real format uses bold line, handled in root parser)
    if (key.includes('unplanned time') && !key.includes('share')) {
      const hm   = value.match(/~?(\d+)h\s*(\d+)?\s*min/i);
      const mins = value.match(/~?(\d+)\s*m(?:in)?\b/i);
      if (hm)   m.unplannedMinutes = parseInt(hm[1]) * 60 + (parseInt(hm[2]) || 0);
      else if (mins) m.unplannedMinutes = parseInt(mins[1], 10);
    }

    // Unplanned share/percent — all formats
    if (key.includes('unplanned share') || key.includes('unplanned time')) {
      const pct = value.replace(/\*\*/g, '').match(/[≈~]?\s*(\d+)[–\-]?(\d+)?%/);
      if (pct) m.unplannedPercent = pct[2] ? `${pct[1]}-${pct[2]}%` : `${pct[1]}%`;
    }

    // Planned items completed
    // Example:  "7 of ~8 discrete items"
    // July 8:   "4/5 concrete tasks (AB#176 ✓, ...)"
    // Real:     "Vlad ✓, AB#196 PR ✓, ADO admin ✓, lunch (late) ✓"
    if (key.includes('planned items completed')) {
      const fraction = value.match(/(\d+)\/(\d+)/);
      const counts   = value.match(/(\d+)\s+of\s+~?(\d+)/);
      if (fraction) {
        m.plannedCompleted = parseInt(fraction[1], 10);
        m.plannedTotal     = parseInt(fraction[2], 10);
      } else if (counts) {
        m.plannedCompleted = parseInt(counts[1], 10);
        m.plannedTotal     = parseInt(counts[2], 10);
      } else {
        const ticks = (value.match(/✓/g) || []).length;
        if (ticks > 0) m.plannedCompleted = ticks;
      }
    }

    // Slipped count
    // Example:  separated by ";"  → "ADO (partial); after-lunch email (not logged)"
    // Real:     separated by ","  → "AB#156 Webpush, day-end review (in progress)"
    // July 8:   "1 (RG feature branch merge)"
    if (key.includes('planned items slipped') || key.includes('slipped') || key.includes('partial')) {
      if (value && !/none/i.test(value)) {
        // First try a bare number
        const bare = value.match(/^(\d+)\s*(?:\(|$)/);
        if (bare) {
          m.slippedCount = parseInt(bare[1], 10);
        } else {
          const parts = value.split(/[;,]/).map(s => s.trim()).filter(Boolean);
          if (parts.length) m.slippedCount = parts.length;
        }
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
    metrics: {
      dayStart: null, dayEnd: null,
      unplannedMinutes: null, unplannedPercent: null,
      plannedCompleted: null, plannedTotal: null,
      slippedCount: null, carryForwardCount: null,
      incidentCount: null, gapCount: null,
    },
    gaps: [],
  };

  const h1 = lines.find(l => l.startsWith('# '));
  if (h1) result.title = h1.slice(2).trim();

  let unplannedSectionLines = [];

  for (const { heading, contentLines } of splitByH2(lines)) {
    const h = heading.toLowerCase();

    if (h.includes('plan vs actual') || h.includes('plan vs. actual')) {
      result.planVsActual = parsePlanVsActual(contentLines);

    } else if (h.includes('unplanned work') || h.includes('off-plan') ||
               h.includes('displacement') || h.includes('unplanned')) {
      unplannedSectionLines = contentLines;
      result.unplannedWork = parseMarkdownTable(contentLines);

    } else if (h.includes('completed work') || h.includes('what got done')) {
      result.completedWork = parseCompletedWork(contentLines);

    } else if (h === 'priority items' || h.includes('priorities')) {
      if (result.completedWork.length === 0) {
        result.completedWork = parseMarkdownTable(contentLines)
          .map(r => [r.priority, r.status].filter(Boolean).join(' — '))
          .filter(Boolean);
      }

    } else if (h.includes('totals summary')) {
      result.totalsSummary = parseMarkdownTable(contentLines);
      result.metrics = result.totalsSummary.length > 0
        ? extractMetrics(result.totalsSummary)
        : extractMetricsFromBullets(contentLines);

    } else if (h.startsWith('totals') && !h.includes('summary')) {
      // Bullet-list Totals section (June, July 1, 7 format — heading may have suffix like "(approx)")
      result.metrics = extractMetricsFromBullets(contentLines);

    } else if (h.includes('outstanding') || h.includes('not completed today') ||
               h.includes('not done') || h.includes('not completed') ||
               h.includes('slipped')) {
      result.outstanding = parseTextSection(contentLines);

    } else if (h.includes('carry forward') || h.includes('to carry forward')) {
      result.carryForward = parseCarryForward(contentLines);

    } else if (h === 'notes' || h === 'summary' || h === 'headline') {
      result.notes = parseTextSection(contentLines);
    }
  }

  // ── Unplanned minutes fallback ────────────────────────────────────────────
  // 1) Check for a bold total line in the unplanned section
  if (!result.metrics.unplannedMinutes) {
    const boldLine = unplannedSectionLines
      .map(l => l.trim())
      .find(l =>
        /estimated unplanned|unplanned total|total unplanned|combined unplanned/i.test(l) ||
        (/unplanned[^:]*time[^:]*:|combined.*unplanned/i.test(l) && /\d+h|\d+\s*m(?:in)?\b/i.test(l))
      );
    if (boldLine) {
      const hm   = boldLine.match(/~?(\d+)h\s*(\d+)?\s*min/i);
      const mins = boldLine.match(/~?(\d+)\s*m(?:in)?\b/i);
      if (hm)        result.metrics.unplannedMinutes = parseInt(hm[1]) * 60 + (parseInt(hm[2]) || 0);
      else if (mins) result.metrics.unplannedMinutes = parseInt(mins[1], 10);

      if (!result.metrics.unplannedPercent) {
        const pct = boldLine.match(/[≈~]\s*(\d+)%/);
        if (pct) result.metrics.unplannedPercent = `${pct[1]}%`;
      }
    }
  }

  // 2) Sum columns from the unplanned work table as a last resort
  if (!result.metrics.unplannedMinutes && result.unplannedWork.length > 0) {
    let total = 0;
    let found = false;
    for (const row of result.unplannedWork) {
      // June format: numeric 'mins' column
      if (row.mins && /^\d+$/.test(row.mins.trim())) {
        total += parseInt(row.mins, 10);
        found = true;
      // July 8 format: 'duration' column like "~70 min"
      } else if (row.duration) {
        const hm = row.duration.match(/~?(\d+)h\s*(\d+)?/i);
        const m  = row.duration.match(/~?(\d+)\s*m(?:in)?\b/i);
        if (hm) { total += parseInt(hm[1]) * 60 + (parseInt(hm[2]) || 0); found = true; }
        else if (m) { total += parseInt(m[1], 10); found = true; }
      // July 7 format: 'time' column like "(20m)" or "~5h45"
      } else if (row.time) {
        const paren = row.time.match(/\((\d+)m\)/);
        const hm    = row.time.match(/~(\d+)h(\d+)/);
        if (paren) { total += parseInt(paren[1], 10); found = true; }
        else if (hm) { total += parseInt(hm[1]) * 60 + parseInt(hm[2]); found = true; }
      }
    }
    if (found && total > 0) result.metrics.unplannedMinutes = total;
  }

  // ── Incident count ────────────────────────────────────────────────────────
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

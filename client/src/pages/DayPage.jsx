import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

// ── Utilities ──────────────────────────────────────────────────────────────────

// ── Shared styles ──────────────────────────────────────────────────────────────

const inputCls = 'bg-white border border-brand-8 text-gray-900 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-1/20 focus:border-brand-1 placeholder-gray-400 w-full';
const btnCls   = 'rounded-md px-3 py-1.5 text-xs font-medium transition-colors';
const selCls   = 'bg-white border border-brand-8 text-gray-900 rounded px-1 py-2 text-sm font-mono focus:outline-none focus:border-brand-1';

// ── Primitive UI ───────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-3">{children}</p>;
}

function AddButton({ onClick, label = 'Add' }) {
  return (
    <button type="button" onClick={onClick}
      className={`${btnCls} border border-brand-8 bg-white text-brand-3 hover:text-gray-700 hover:border-brand-1 mt-2`}>
      + {label}
    </button>
  );
}

function RemoveButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="Remove"
      className="text-gray-400 hover:text-red-500 transition-colors px-1.5 py-1 text-sm leading-none shrink-0">
      ×
    </button>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINS  = ['00','05','10','15','20','25','30','35','40','45','50','55'];

function TimeInput({ value, onChange }) {
  const [h, m] = value ? value.split(':') : ['', ''];
  const emit = (nh, nm) => onChange(nh && nm ? `${nh}:${nm}` : '');
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <select value={h || ''} onChange={e => emit(e.target.value, m || '00')} className={selCls}>
        <option value="">--</option>
        {HOURS.map(hr => <option key={hr} value={hr}>{hr}</option>)}
      </select>
      <span className="text-brand-3 text-xs px-0.5">:</span>
      <select value={m || ''} onChange={e => emit(h || '00', e.target.value)} className={selCls}>
        <option value="">--</option>
        {MINS.map(mn => <option key={mn} value={mn}>{mn}</option>)}
      </select>
    </div>
  );
}

function Pill({ children, colour = 'default' }) {
  const colours = {
    default: 'bg-gray-100 border-gray-200 text-gray-600',
    teal:    'bg-blue-50 border-blue-200 text-blue-700',
    amber:   'bg-amber-50 border-amber-200 text-amber-700',
    magenta: 'bg-red-50 border-red-200 text-red-700',
  };
  return <span className={`rounded border px-2 py-0.5 text-xs font-medium ${colours[colour]}`}>{children}</span>;
}

// ── Data model ─────────────────────────────────────────────────────────────────

function emptyPlan() {
  return { priorities: [], plan: [], carriedForward: [], notes: '' };
}

function emptyReview() {
  return {
    dayStart: '', dayEnd: '',
    planVsActual: {},
    unplanned: [],
    carryForward: { blocked: [], planned: [], watch: [] },
    incidentCount: '',
    notes: '',
  };
}

function dayToForms(day) {
  const tl = day?.tasklist ?? {};
  const rp = day?.report   ?? {};
  const m  = rp.metrics    ?? {};

  const rawPlan = Array.isArray(tl.plan) ? tl.plan : (Array.isArray(tl.dayPlan) ? tl.dayPlan : []);
  const rawCf   = Array.isArray(tl.carriedForward)
    ? tl.carriedForward
    : (Array.isArray(tl.carriedForward?.items) ? tl.carriedForward.items : []);

  const plan = {
    priorities:    Array.isArray(tl.priorities) ? tl.priorities : [],
    plan:          rawPlan.map(b => ({
      start:       b.start       ?? '',
      end:         b.end         ?? '',
      description: b.description ?? '',
      open:        !!(b.open ?? b.isOpen),
    })),
    carriedForward: rawCf,
    notes:          Array.isArray(tl.notes) ? tl.notes.join('\n') : (tl.notes ?? ''),
  };

  const rawPvaArr = Array.isArray(rp.planVsActual) ? rp.planVsActual : [];
  const pvaMap = {};
  rawPlan.filter(b => !(b.open ?? b.isOpen) && b.description).forEach((_, idx) => {
    const e = rawPvaArr[idx];
    if (e) pvaMap[idx] = {
      actualStart: e.actualStart ?? '',
      actualEnd:   e.actualEnd   ?? '',
      status:      e.statusIndicator ?? '',
      notes:       Array.isArray(e.notes) ? e.notes.join('\n') : (e.notes ?? ''),
    };
  });

  const review = {
    dayStart: m.dayStart ?? '',
    dayEnd:   m.dayEnd   ?? '',
    planVsActual: pvaMap,
    unplanned: (Array.isArray(rp.unplannedWork) ? rp.unplannedWork : []).map(r => ({
      time:     r.time     ?? '',
      item:     r.item     ?? '',
      duration: r.duration ?? '',
      tag:      r.tag      ?? '',
    })),
    carryForward: {
      blocked: Array.isArray(rp.carryForward?.blocked) ? rp.carryForward.blocked.map(x => x.item ?? x) : [],
      planned: Array.isArray(rp.carryForward?.planned) ? rp.carryForward.planned.map(x => x.item ?? x) : [],
      watch:   Array.isArray(rp.carryForward?.watch)   ? rp.carryForward.watch : [],
    },
    incidentCount: m.incidentCount != null ? String(m.incidentCount) : '',
    notes: Array.isArray(rp.notes) ? rp.notes.join('\n') : (rp.notes ?? ''),
  };

  return { plan, review };
}

function formsToPayload(dateStr, plan, review, isComplete) {
  const num = v => (v === '' || v == null) ? null : Number(v);

  const unplannedMinutes = review.unplanned.reduce((acc, r) => {
    const m = parseInt(r.duration, 10);
    return acc + (isNaN(m) ? 0 : m);
  }, 0);

  const timedItems   = plan.plan.filter(b => !b.open && b.description);
  const planVsActual = timedItems.map((b, idx) => {
    const ann = review.planVsActual?.[idx] ?? {};
    return {
      heading:         b.description,
      planned:         b.start && b.end ? `${b.start}–${b.end}` : '',
      actualStart:     ann.actualStart || null,
      actualEnd:       ann.actualEnd   || null,
      statusIndicator: ann.status      || null,
      notes:           ann.notes ? [ann.notes] : [],
    };
  });

  const pvaStatused   = planVsActual.filter(p => p.statusIndicator);
  const useDerivation = pvaStatused.length > 0;
  const derivedTotal  = timedItems.length;
  const derivedDone   = planVsActual.filter(p => p.statusIndicator === 'done').length;
  const completedWork = planVsActual.filter(p => p.statusIndicator === 'done').map(p => p.heading);

  return {
    date: dateStr,
    isComplete,
    tasklist: {
      source:         'direct',
      priorities:     plan.priorities.filter(Boolean),
      plan:           plan.plan.filter(b => b.description || b.start),
      carriedForward: plan.carriedForward.filter(Boolean),
      notes:          plan.notes || null,
    },
    report: {
      source: 'direct',
      title:  `End-of-Day Review — ${dateStr}`,
      metrics: {
        dayStart:         review.dayStart || null,
        dayEnd:           review.dayEnd   || null,
        plannedCompleted: useDerivation ? derivedDone  : null,
        plannedTotal:     useDerivation ? derivedTotal : null,
        unplannedMinutes: unplannedMinutes || null,
        incidentCount:    num(review.incidentCount),
        gapCount:         0,
      },
      planVsActual,
      unplannedWork: review.unplanned.filter(r => r.item),
      completedWork,
      carryForward: {
        blocked: review.carryForward.blocked.filter(Boolean).map(item => ({ item })),
        planned: review.carryForward.planned.filter(Boolean).map(item => ({ item })),
        watch:   review.carryForward.watch.filter(Boolean),
      },
      notes: review.notes ? [review.notes] : [],
    },
  };
}

// ── Live metrics bar ───────────────────────────────────────────────────────────

function MetricBox({ label, value }) {
  return (
    <div className="rounded-lg border border-brand-8 bg-brand-7 p-4 shadow-card">
      <p className="text-xs text-brand-3 mb-1">{label}</p>
      <p className="font-mono text-sm font-semibold text-gray-900">{value ?? '—'}</p>
    </div>
  );
}

function MetricsBar({ plan, review }) {
  const timedItems   = plan.plan.filter(b => !b.open && b.description);
  const pvaEntries   = timedItems.map((_, i) => review.planVsActual?.[i] ?? {});
  const anyStatus    = pvaEntries.some(a => a.status);
  const doneCt       = anyStatus ? pvaEntries.filter(a => a.status === 'done').length : null;
  const totalCt      = anyStatus ? timedItems.length : null;
  const unplannedMin = review.unplanned.reduce((s, r) => s + (parseInt(r.duration, 10) || 0), 0);

  if (!review.dayStart && !review.dayEnd && doneCt == null && !unplannedMin && !review.incidentCount) return null;

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {(review.dayStart || review.dayEnd) && (
        <MetricBox label="Day" value={[review.dayStart, review.dayEnd].filter(Boolean).join(' – ')} />
      )}
      {doneCt != null && <MetricBox label="Planned" value={`${doneCt} / ${totalCt}`} />}
      {unplannedMin > 0 && <MetricBox label="Unplanned" value={`${unplannedMin} min`} />}
      {review.incidentCount && <MetricBox label="Incidents" value={review.incidentCount} />}
    </div>
  );
}

// ── Editors ────────────────────────────────────────────────────────────────────

function DynamicList({ items, onChange, placeholder }) {
  const update = (i, val) => { const n = [...items]; n[i] = val; onChange(n); };
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input value={item} onChange={e => update(i, e.target.value)} placeholder={placeholder} className={inputCls} />
          <RemoveButton onClick={() => onChange(items.filter((_, idx) => idx !== i))} />
        </div>
      ))}
      <AddButton onClick={() => onChange([...items, ''])} />
    </div>
  );
}

function PlanEditor({ blocks, onChange }) {
  const update = (i, field, val) => onChange(blocks.map((b, idx) => idx === i ? { ...b, [field]: val } : b));
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((b, i) => (
        <div key={i} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
          <TimeInput value={b.start} onChange={v => update(i, 'start', v)} />
          <span className="text-brand-3 text-sm shrink-0">–</span>
          <TimeInput value={b.end}   onChange={v => update(i, 'end',   v)} />
          <input value={b.description} onChange={e => update(i, 'description', e.target.value)}
            placeholder="Description" className={`${inputCls} flex-1`} />
          <label className="flex items-center gap-1.5 text-xs text-brand-3 shrink-0 cursor-pointer select-none">
            <input type="checkbox" checked={!!b.open} onChange={e => update(i, 'open', e.target.checked)} className="accent-brand-1" />
            Open
          </label>
          <RemoveButton onClick={() => onChange(blocks.filter((_, idx) => idx !== i))} />
        </div>
      ))}
      <AddButton onClick={() => onChange([...blocks, { start: '', end: '', description: '', open: false }])} label="Add block" />
    </div>
  );
}

function UnplannedEditor({ rows, onChange }) {
  const update = (i, field, val) => onChange(rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: '7rem 1fr 6rem 8rem auto' }}>
          <TimeInput value={r.time} onChange={v => update(i, 'time', v)} />
          <input value={r.item}     onChange={e => update(i, 'item', e.target.value)}     placeholder="Description" className={inputCls} />
          <input value={r.duration} onChange={e => update(i, 'duration', e.target.value)} placeholder="30 min"     className={inputCls} />
          <select value={r.tag} onChange={e => update(i, 'tag', e.target.value)} className={`${inputCls} cursor-pointer`}>
            <option value="">No tag</option>
            <option value="unplanned">unplanned</option>
            <option value="incident/unplanned">incident/unplanned</option>
            <option value="support">support</option>
            <option value="admin">admin</option>
          </select>
          <RemoveButton onClick={() => onChange(rows.filter((_, idx) => idx !== i))} />
        </div>
      ))}
      <AddButton onClick={() => onChange([...rows, { time: '', item: '', duration: '', tag: '' }])} label="Add row" />
    </div>
  );
}

const STATUS_OPTS = [
  { value: '',        label: '—' },
  { value: 'done',    label: 'Done' },
  { value: 'warning', label: 'Partial' },
  { value: 'missed',  label: 'Missed' },
];

const STATUS_COLOURS = {
  done:    'border-l-green-400',
  warning: 'border-l-amber-400',
  missed:  'border-l-red-400',
};

function PlanVsActualEditor({ planItems, pva, onChange }) {
  const timed = [...planItems.filter(b => !b.open && b.description)].sort((a, b) => {
    const at = (pva[a.description]?.actualStart) || a.start || '';
    const bt = (pva[b.description]?.actualStart) || b.start || '';
    return at.localeCompare(bt);
  });

  if (!timed.length) {
    return <p className="text-sm text-brand-3">No planned items — expand Morning Plan to add some.</p>;
  }

  const update = (idx, field, val) =>
    onChange({ ...pva, [idx]: { ...(pva[idx] ?? {}), [field]: val } });

  return (
    <div className="flex flex-col gap-2">
      {timed.map((b, i) => {
        const ann    = pva[i] ?? {};
        const colour = STATUS_COLOURS[ann.status] ?? 'border-l-brand-8';
        return (
          <div key={i} className={`rounded-lg border border-brand-8 border-l-4 ${colour} bg-gray-50 px-3 py-2`}>
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div>
                <p className="text-sm font-medium text-gray-900">{b.description}</p>
                {b.start && b.end && <p className="text-xs font-mono text-brand-3">{b.start}–{b.end}</p>}
              </div>
              <select value={ann.status ?? ''} onChange={e => update(i, 'status', e.target.value)}
                className="rounded border border-brand-8 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:border-brand-1">
                {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-brand-3 w-10">Start</span>
                <TimeInput value={ann.actualStart ?? ''} onChange={v => update(i, 'actualStart', v)} />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-brand-3 w-8">End</span>
                <TimeInput value={ann.actualEnd ?? ''} onChange={v => update(i, 'actualEnd', v)} />
              </div>
              <input value={ann.notes ?? ''} onChange={e => update(i, 'notes', e.target.value)}
                placeholder="Notes…" className={`${inputCls} flex-1`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Layout helpers ─────────────────────────────────────────────────────────────

function Collapsible({ title, summary, open, onToggle, children }) {
  return (
    <div className="rounded-lg border border-brand-8 bg-white shadow-card mb-5">
      <button type="button" onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors rounded-lg">
        <div>
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          {!open && summary && <p className="text-xs text-brand-3 mt-0.5">{summary}</p>}
        </div>
        <span className="text-brand-3 text-xs ml-4 shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-brand-8 pt-5 flex flex-col gap-6">
          {children}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-lg border border-brand-8 bg-white shadow-card mb-5 px-5 py-5">
      <p className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b border-brand-8">{title}</p>
      {children}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function DayPage() {
  const { date } = useParams();
  const navigate = useNavigate();

  const [plan,       setPlan]       = useState(emptyPlan);
  const [review,     setReview]     = useState(emptyReview);
  const [isComplete, setIsComplete] = useState(false);
  const [saveState,  setSaveState]  = useState('idle');
  const [planOpen,   setPlanOpen]   = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState(null);
  const [gaps,       setGaps]       = useState([]);

  // Latest data ref for debounce closure
  const latestData  = useRef({ plan: emptyPlan(), review: emptyReview(), isComplete: false });
  const saveTimer   = useRef(null);
  const readyToSave = useRef(false);

  // ── Save ──────────────────────────────────────────────────────────────────

  const executeSave = useCallback(async (p, rv, complete) => {
    setSaveState('saving');
    try {
      const r = await fetch(`/api/days/${date}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(formsToPayload(date, p, rv, complete)),
      });
      if (!r.ok) throw new Error(r.status);
      setSaveState('saved');
      setTimeout(() => setSaveState(s => s === 'saved' ? 'idle' : s), 2000);
    } catch {
      setSaveState('error');
    }
  }, [date]);

  const scheduleSave = useCallback(() => {
    if (!readyToSave.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const { plan: p, review: rv, isComplete: c } = latestData.current;
      executeSave(p, rv, c);
    }, 1500);
  }, [executeSave]);

  // Flush pending save on unmount
  useEffect(() => () => {
    if (saveTimer.current && readyToSave.current) {
      clearTimeout(saveTimer.current);
      const { plan: p, review: rv, isComplete: c } = latestData.current;
      executeSave(p, rv, c);
    }
  }, [executeSave]);

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    readyToSave.current = false;
    setLoading(true);
    fetch(`/api/days/${date}`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(day => {
        const { plan: p, review: rv } = dayToForms(day);
        const complete = day.isComplete ?? false;
        setPlan(p);
        setReview(rv);
        setIsComplete(complete);
        setGaps(day.gaps ?? []);
        latestData.current = { plan: p, review: rv, isComplete: complete };
        setLoading(false);
        setTimeout(() => { readyToSave.current = true; }, 50);
      })
      .catch(e => { setLoadError(e.message); setLoading(false); });
  }, [date]);

  // ── Updaters (each syncs ref + triggers save) ──────────────────────────────

  const updatePlan = useCallback((field, val) => {
    setPlan(p => {
      const next = { ...p, [field]: val };
      latestData.current = { ...latestData.current, plan: next };
      return next;
    });
    scheduleSave();
  }, [scheduleSave]);

  const updateReview = useCallback((field, val) => {
    setReview(rv => {
      const next = { ...rv, [field]: val };
      latestData.current = { ...latestData.current, review: next };
      return next;
    });
    scheduleSave();
  }, [scheduleSave]);

  const updateComplete = useCallback((val) => {
    setIsComplete(val);
    latestData.current = { ...latestData.current, isComplete: val };
    scheduleSave();
  }, [scheduleSave]);

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Delete this day? This cannot be undone.')) return;
    readyToSave.current = false;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await fetch(`/api/days/${date}`, { method: 'DELETE' });
    navigate('/');
  }, [date, navigate]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading)   return <p className="text-brand-3">Loading…</p>;
  if (loadError) return <p className="text-red-600">Failed to load: {loadError}</p>;

  const saveIndicator = saveState === 'saving' ? { text: 'Saving…',    cls: 'text-brand-3' }
    : saveState === 'saved'  ? { text: 'Saved',       cls: 'text-green-600' }
    : saveState === 'error'  ? { text: 'Save failed', cls: 'text-red-500'   }
    : null;

  const planSummary = [
    plan.plan.filter(b => !b.open && b.description).length > 0 &&
      `${plan.plan.filter(b => !b.open && b.description).length} blocks`,
    plan.priorities.length > 0 && `${plan.priorities.length} priorities`,
    plan.carriedForward.filter(Boolean).length > 0 &&
      `${plan.carriedForward.filter(Boolean).length} carried forward`,
  ].filter(Boolean).join(' · ') || 'No plan yet';

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link to="/" className="text-sm text-brand-3 hover:text-brand-1 transition-colors mb-1 inline-block">
            ← All reports
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{date.replace(/-/g, '/')}</h1>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {saveIndicator && <span className={`text-xs ${saveIndicator.cls}`}>{saveIndicator.text}</span>}
          <label className="flex items-center gap-2 text-sm text-brand-3 cursor-pointer select-none">
            <input type="checkbox" checked={isComplete} onChange={e => updateComplete(e.target.checked)} className="accent-brand-1" />
            Mark complete
          </label>
          <button type="button" onClick={handleDelete}
            className={`${btnCls} border border-red-200 bg-red-50 text-red-600 hover:bg-red-100`}>
            Delete
          </button>
        </div>
      </div>

      {/* Evening job pending alert */}
      {(() => {
        const now = new Date();
        const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
        const afterCutoff = now.getHours() > 16 || (now.getHours() === 16 && now.getMinutes() >= 45);
        const isToday = (() => {
          const d = now;
          return date === `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
        })();
        if (!isWeekday || !afterCutoff || !isToday || isComplete) return null;
        return (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-700">
              Today isn&apos;t marked complete — tomorrow&apos;s skeleton is pending. The job will retry every 15 minutes until you mark it complete.
            </p>
          </div>
        );
      })()}

      {/* Gaps alert */}
      {gaps.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-700 mb-2">
            ⚠ {gaps.length} gap{gaps.length !== 1 ? 's' : ''} need filling in
          </p>
          <ul className="space-y-1 text-xs text-amber-600">
            {gaps.map((g, i) => <li key={i}>{g.start && g.end ? `${g.start}–${g.end}` : g.location}</li>)}
          </ul>
        </div>
      )}

      {/* Live metrics */}
      <MetricsBar plan={plan} review={review} />

      {/* Priorities quick-view */}
      {plan.priorities.filter(Boolean).length > 0 && (
        <div className="mb-5 rounded-lg border border-brand-8 bg-white shadow-card px-5 py-4">
          <p className="text-sm font-semibold text-gray-800 mb-3">Priorities</p>
          <ol className="list-decimal list-inside space-y-1">
            {plan.priorities.filter(Boolean).map((p, i) => (
              <li key={i} className="text-sm text-gray-700">{p}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Morning Plan (collapsible) */}
      <Collapsible title="Morning Plan" summary={planSummary} open={planOpen} onToggle={() => setPlanOpen(o => !o)}>
        <div>
          <SectionLabel>Priorities</SectionLabel>
          <DynamicList items={plan.priorities} onChange={v => updatePlan('priorities', v)} placeholder="Priority item" />
        </div>
        <div>
          <SectionLabel>Day plan</SectionLabel>
          <PlanEditor blocks={plan.plan} onChange={v => updatePlan('plan', v)} />
        </div>
        <div>
          <SectionLabel>Carried forward</SectionLabel>
          <DynamicList items={plan.carriedForward} onChange={v => updatePlan('carriedForward', v)} placeholder="Carried forward task" />
        </div>
        <div>
          <SectionLabel>Notes</SectionLabel>
          <textarea value={plan.notes} onChange={e => updatePlan('notes', e.target.value)}
            rows={3} placeholder="Any notes for the day…" className={inputCls} />
        </div>
      </Collapsible>

      {/* Plan vs Actual */}
      <Section title="Plan vs Actual">
        <PlanVsActualEditor
          planItems={plan.plan}
          pva={review.planVsActual}
          onChange={v => updateReview('planVsActual', v)}
        />
      </Section>

      {/* Day summary */}
      <Section title="Day summary">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <SectionLabel>Day start</SectionLabel>
            <TimeInput value={review.dayStart} onChange={v => updateReview('dayStart', v)} />
          </div>
          <div>
            <SectionLabel>Day end</SectionLabel>
            <TimeInput value={review.dayEnd} onChange={v => updateReview('dayEnd', v)} />
          </div>
          <div>
            <SectionLabel>Incidents</SectionLabel>
            <input type="number" min="0" value={review.incidentCount}
              onChange={e => updateReview('incidentCount', e.target.value)}
              placeholder="0" className={`${inputCls} w-20`} />
          </div>
        </div>
      </Section>

      {/* Unplanned work */}
      <Section title="Unplanned work">
        <UnplannedEditor rows={review.unplanned} onChange={v => updateReview('unplanned', v)} />
      </Section>

      {/* Carry forward */}
      <Section title="Carry forward">
        <div className="flex flex-col gap-6">
          <div>
            <SectionLabel>Blocked</SectionLabel>
            <DynamicList
              items={review.carryForward.blocked}
              onChange={v => updateReview('carryForward', { ...review.carryForward, blocked: v })}
              placeholder="Blocked item"
            />
          </div>
          <div>
            <SectionLabel>Planned for tomorrow</SectionLabel>
            <DynamicList
              items={review.carryForward.planned}
              onChange={v => updateReview('carryForward', { ...review.carryForward, planned: v })}
              placeholder="Carry forward task"
            />
          </div>
          <div>
            <SectionLabel>Watch</SectionLabel>
            <DynamicList
              items={review.carryForward.watch}
              onChange={v => updateReview('carryForward', { ...review.carryForward, watch: v })}
              placeholder="Watch item"
            />
          </div>
        </div>
      </Section>

      {/* EOD Notes */}
      <Section title="Notes">
        <textarea value={review.notes} onChange={e => updateReview('notes', e.target.value)}
          rows={4} placeholder="EOD notes…" className={inputCls} />
      </Section>
    </div>
  );
}

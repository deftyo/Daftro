import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

// ── Utility ───────────────────────────────────────────────────────────────────

function htmlDateToApi(htmlDate) {
  const [year, month, day] = htmlDate.split('-').map(Number);
  return `${month}-${day}-${year}`;
}

function apiDateToHtml(apiDate) {
  const [month, day, year] = apiDate.split('-').map(Number);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayHtml() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Shared input styles ───────────────────────────────────────────────────────

const inputCls = 'bg-white border border-brand-8 text-gray-900 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-1/20 focus:border-brand-1 placeholder-gray-400 w-full';
const timeCls  = 'bg-white border border-brand-8 text-gray-900 rounded px-2 py-2 text-sm font-mono focus:outline-none focus:border-brand-1 w-28';
const btnCls   = 'rounded-md px-3 py-1.5 text-xs font-medium transition-colors';

// ── Reusable sub-components ───────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-3">{children}</p>
  );
}

function AddButton({ onClick, label = 'Add' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${btnCls} border border-brand-8 bg-white text-brand-3 hover:text-gray-700 hover:border-brand-1 mt-2`}
    >
      + {label}
    </button>
  );
}

function RemoveButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-gray-400 hover:text-red-500 transition-colors px-1.5 py-1 text-sm leading-none shrink-0"
      aria-label="Remove"
    >
      ×
    </button>
  );
}

// Dynamic list of plain text items
function DynamicList({ items, onChange, placeholder }) {
  const update = (i, val) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const add    = () => onChange([...items, '']);

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            value={item}
            onChange={e => update(i, e.target.value)}
            placeholder={placeholder}
            className={inputCls}
          />
          <RemoveButton onClick={() => remove(i)} />
        </div>
      ))}
      <AddButton onClick={add} />
    </div>
  );
}

// Plan blocks editor
function PlanEditor({ blocks, onChange }) {
  const update = (i, field, val) => {
    const next = blocks.map((b, idx) => idx === i ? { ...b, [field]: val } : b);
    onChange(next);
  };
  const remove = (i) => onChange(blocks.filter((_, idx) => idx !== i));
  const add    = () => onChange([...blocks, { start: '', end: '', description: '', open: false }]);

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((b, i) => (
        <div key={i} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
          <input
            type="time"
            step="300"
            value={b.start}
            onChange={e => update(i, 'start', e.target.value)}
            className={timeCls}
          />
          <span className="text-brand-3 text-sm shrink-0">–</span>
          <input
            type="time"
            step="300"
            value={b.end}
            onChange={e => update(i, 'end', e.target.value)}
            className={timeCls}
          />
          <input
            value={b.description}
            onChange={e => update(i, 'description', e.target.value)}
            placeholder="Description"
            className={`${inputCls} flex-1`}
          />
          <label className="flex items-center gap-1.5 text-xs text-brand-3 shrink-0 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!b.open}
              onChange={e => update(i, 'open', e.target.checked)}
              className="accent-brand-1"
            />
            Open
          </label>
          <RemoveButton onClick={() => remove(i)} />
        </div>
      ))}
      <AddButton onClick={add} label="Add block" />
    </div>
  );
}

// Unplanned work rows
function UnplannedEditor({ rows, onChange }) {
  const update = (i, field, val) => {
    const next = rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r);
    onChange(next);
  };
  const remove = (i) => onChange(rows.filter((_, idx) => idx !== i));
  const add    = () => onChange([...rows, { time: '', item: '', duration: '', tag: '' }]);

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: '7rem 1fr 6rem 8rem auto' }}>
          <input
            type="time"
            step="300"
            value={r.time}
            onChange={e => update(i, 'time', e.target.value)}
            className={timeCls}
          />
          <input
            value={r.item}
            onChange={e => update(i, 'item', e.target.value)}
            placeholder="Description"
            className={inputCls}
          />
          <input
            value={r.duration}
            onChange={e => update(i, 'duration', e.target.value)}
            placeholder="30 min"
            className={inputCls}
          />
          <select
            value={r.tag}
            onChange={e => update(i, 'tag', e.target.value)}
            className={`${inputCls} cursor-pointer`}
          >
            <option value="">No tag</option>
            <option value="unplanned">unplanned</option>
            <option value="incident/unplanned">incident/unplanned</option>
            <option value="support">support</option>
            <option value="admin">admin</option>
          </select>
          <RemoveButton onClick={() => remove(i)} />
        </div>
      ))}
      <AddButton onClick={add} label="Add row" />
    </div>
  );
}

// Plan-vs-actual annotation rows (one per planned block)
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
  const timed = planItems.filter(b => !b.open && b.description);

  if (!timed.length) {
    return <p className="text-sm text-brand-3">No planned items — add them in Morning Plan first.</p>;
  }

  const update = (description, field, val) =>
    onChange({ ...pva, [description]: { ...(pva[description] ?? {}), [field]: val } });

  return (
    <div className="flex flex-col gap-2">
      {timed.map((b, i) => {
        const ann    = pva[b.description] ?? {};
        const colour = STATUS_COLOURS[ann.status] ?? 'border-l-brand-8';
        return (
          <div key={i} className={`rounded-lg border border-brand-8 border-l-4 ${colour} bg-gray-50 px-3 py-2`}>
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div>
                <p className="text-sm font-medium text-gray-900">{b.description}</p>
                {b.start && b.end && (
                  <p className="text-xs font-mono text-brand-3">{b.start}–{b.end}</p>
                )}
              </div>
              <select
                value={ann.status ?? ''}
                onChange={e => update(b.description, 'status', e.target.value)}
                className="rounded border border-brand-8 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:border-brand-1"
              >
                {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-brand-3 w-10">Start</span>
                <input
                  type="time"
                  step="300"
                  value={ann.actualStart ?? ''}
                  onChange={e => update(b.description, 'actualStart', e.target.value)}
                  className={timeCls}
                />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-brand-3 w-8">End</span>
                <input
                  type="time"
                  step="300"
                  value={ann.actualEnd ?? ''}
                  onChange={e => update(b.description, 'actualEnd', e.target.value)}
                  className={timeCls}
                />
              </div>
              <input
                value={ann.notes ?? ''}
                onChange={e => update(b.description, 'notes', e.target.value)}
                placeholder="Notes…"
                className={`${inputCls} flex-1`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Plan ─────────────────────────────────────────────────────────────────

function PlanTab({ data, onChange }) {
  const set = (field, val) => onChange({ ...data, [field]: val });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>Priorities</SectionLabel>
        <DynamicList
          items={data.priorities}
          onChange={v => set('priorities', v)}
          placeholder="Priority item"
        />
      </div>

      <div>
        <SectionLabel>Day plan</SectionLabel>
        <PlanEditor blocks={data.plan} onChange={v => set('plan', v)} />
      </div>

      <div>
        <SectionLabel>Carried forward from previous day</SectionLabel>
        <DynamicList
          items={data.carriedForward}
          onChange={v => set('carriedForward', v)}
          placeholder="Carried forward task"
        />
      </div>

      <div>
        <SectionLabel>Notes</SectionLabel>
        <textarea
          value={data.notes}
          onChange={e => set('notes', e.target.value)}
          rows={3}
          placeholder="Any notes for the day…"
          className={inputCls}
        />
      </div>
    </div>
  );
}

// ── Tab: Review ───────────────────────────────────────────────────────────────

function ReviewTab({ data, onChange, planItems = [] }) {
  const set = (field, val) => onChange({ ...data, [field]: val });
  const setCf = (field, val) => onChange({ ...data, carryForward: { ...data.carryForward, [field]: val } });

  return (
    <div className="flex flex-col gap-8">

      <div>
        <SectionLabel>Plan vs actual</SectionLabel>
        <PlanVsActualEditor
          planItems={planItems}
          pva={data.planVsActual}
          onChange={v => set('planVsActual', v)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <SectionLabel>Day start</SectionLabel>
          <input type="time" step="300" value={data.dayStart} onChange={e => set('dayStart', e.target.value)} className={timeCls} />
        </div>
        <div>
          <SectionLabel>Day end</SectionLabel>
          <input type="time" step="300" value={data.dayEnd} onChange={e => set('dayEnd', e.target.value)} className={timeCls} />
        </div>
        <div>
          <SectionLabel>Planned done</SectionLabel>
          <input
            type="number" min="0"
            value={data.plannedCompleted}
            onChange={e => set('plannedCompleted', e.target.value)}
            placeholder="4"
            className={`${inputCls} w-20`}
          />
        </div>
        <div>
          <SectionLabel>Planned total</SectionLabel>
          <input
            type="number" min="0"
            value={data.plannedTotal}
            onChange={e => set('plannedTotal', e.target.value)}
            placeholder="6"
            className={`${inputCls} w-20`}
          />
        </div>
      </div>

      <div>
        <SectionLabel>Unplanned work</SectionLabel>
        <UnplannedEditor rows={data.unplanned} onChange={v => set('unplanned', v)} />
      </div>

      <div>
        <SectionLabel>Completed work</SectionLabel>
        <DynamicList
          items={data.completed}
          onChange={v => set('completed', v)}
          placeholder="Completed item"
        />
      </div>

      <div>
        <SectionLabel>Carry forward — blocked</SectionLabel>
        <DynamicList
          items={data.carryForward.blocked}
          onChange={v => setCf('blocked', v)}
          placeholder="Blocked item"
        />
      </div>

      <div>
        <SectionLabel>Carry forward — planned</SectionLabel>
        <DynamicList
          items={data.carryForward.planned}
          onChange={v => setCf('planned', v)}
          placeholder="Planned for tomorrow"
        />
      </div>

      <div>
        <SectionLabel>Carry forward — watch</SectionLabel>
        <DynamicList
          items={data.carryForward.watch}
          onChange={v => setCf('watch', v)}
          placeholder="Watch item"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <SectionLabel>Incidents</SectionLabel>
          <input
            type="number" min="0"
            value={data.incidentCount}
            onChange={e => set('incidentCount', e.target.value)}
            placeholder="0"
            className={`${inputCls} w-20`}
          />
        </div>
      </div>

      <div>
        <SectionLabel>Notes</SectionLabel>
        <textarea
          value={data.notes}
          onChange={e => set('notes', e.target.value)}
          rows={3}
          placeholder="EOD notes…"
          className={inputCls}
        />
      </div>
    </div>
  );
}

// ── Empty state factories ─────────────────────────────────────────────────────

function emptyPlan() {
  return { priorities: [], plan: [], carriedForward: [], notes: '' };
}

function emptyReview() {
  return {
    dayStart: '', dayEnd: '',
    plannedCompleted: '', plannedTotal: '',
    planVsActual: {},
    unplanned: [],
    completed: [],
    carryForward: { blocked: [], planned: [], watch: [] },
    incidentCount: '',
    notes: '',
  };
}

function dayToForms(day) {
  const tl = day?.tasklist ?? {};
  const rp = day?.report   ?? {};
  const m  = rp.metrics    ?? {};

  // File-parsed tasklists use dayPlan; direct-entry uses plan
  const rawPlan = Array.isArray(tl.plan) ? tl.plan : (Array.isArray(tl.dayPlan) ? tl.dayPlan : []);
  // File-parsed carriedForward is { fromDate, items: [] }; direct-entry is a string[]
  const rawCf = Array.isArray(tl.carriedForward)
    ? tl.carriedForward
    : Array.isArray(tl.carriedForward?.items) ? tl.carriedForward.items : [];

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

  const review = {
    dayStart:         m.dayStart         ?? '',
    dayEnd:           m.dayEnd           ?? '',
    plannedCompleted: m.plannedCompleted != null ? String(m.plannedCompleted) : '',
    plannedTotal:     m.plannedTotal     != null ? String(m.plannedTotal)     : '',
    unplanned: (Array.isArray(rp.unplannedWork) ? rp.unplannedWork : []).map(r => ({
      time:     r.time     ?? '',
      item:     r.item     ?? '',
      duration: r.duration ?? '',
      tag:      r.tag      ?? '',
    })),
    planVsActual: (() => {
      const map = {};
      if (Array.isArray(rp.planVsActual)) {
        rp.planVsActual.forEach(e => {
          if (e.heading) map[e.heading] = {
            actualStart: e.actualStart ?? '',
            actualEnd:   e.actualEnd   ?? '',
            status:      e.statusIndicator ?? '',
            notes:      Array.isArray(e.notes) ? e.notes.join('\n') : (e.notes ?? ''),
          };
        });
      }
      return map;
    })(),
    completed: Array.isArray(rp.completedWork) ? rp.completedWork : [],
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
  const num = v => v === '' || v == null ? null : Number(v);

  const unplannedMinutes = review.unplanned.reduce((acc, r) => {
    const m = parseInt(r.duration, 10);
    return acc + (isNaN(m) ? 0 : m);
  }, 0);

  const timedItems = plan.plan.filter(b => !b.open && b.description);
  const planVsActual = timedItems.map(b => {
    const ann = review.planVsActual?.[b.description] ?? {};
    return {
      heading:         b.description,
      planned:         b.start && b.end ? `${b.start}–${b.end}` : '',
      actualStart:     ann.actualStart || null,
      actualEnd:       ann.actualEnd   || null,
      statusIndicator: ann.status      || null,
      notes:           ann.notes ? [ann.notes] : [],
    };
  });

  // Derive counts from pva statuses; fall back to manual fields
  const pvaStatused    = planVsActual.filter(p => p.statusIndicator);
  const derivedTotal   = pvaStatused.length ? timedItems.length : null;
  const derivedDone    = pvaStatused.length ? planVsActual.filter(p => p.statusIndicator === 'done').length : null;

  const tasklist = {
    source:        'direct',
    priorities:    plan.priorities.filter(Boolean),
    plan:          plan.plan.filter(b => b.description || b.start),
    carriedForward: plan.carriedForward.filter(Boolean),
    notes:         plan.notes || null,
  };

  const report = {
    source: 'direct',
    title:  `End-of-Day Review — ${dateStr}`,
    metrics: {
      dayStart:         review.dayStart || null,
      dayEnd:           review.dayEnd   || null,
      plannedCompleted: num(review.plannedCompleted) ?? derivedDone,
      plannedTotal:     num(review.plannedTotal)     ?? derivedTotal,
      unplannedMinutes: unplannedMinutes || null,
      incidentCount:    num(review.incidentCount),
      gapCount:         0,
    },
    planVsActual,
    unplannedWork: review.unplanned.filter(r => r.item),
    completedWork: review.completed.filter(Boolean),
    carryForward: {
      blocked: review.carryForward.blocked.filter(Boolean).map(item => ({ item })),
      planned: review.carryForward.planned.filter(Boolean).map(item => ({ item })),
      watch:   review.carryForward.watch.filter(Boolean),
    },
    notes: review.notes ? [review.notes] : [],
  };

  return { date: dateStr, tasklist, report, isComplete };
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DayEditor() {
  const { date: dateParam } = useParams();
  const isNew = !dateParam;
  const navigate = useNavigate();

  const [htmlDate,   setHtmlDate]   = useState(todayHtml);
  const [plan,       setPlan]       = useState(emptyPlan);
  const [review,     setReview]     = useState(emptyReview);
  const [isComplete, setIsComplete] = useState(false);
  const [activeTab,  setActiveTab]  = useState('plan');
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [error,      setError]      = useState(null);
  const [loading,    setLoading]    = useState(!isNew);

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/days/${dateParam}`)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(day => {
        setHtmlDate(apiDateToHtml(day.date));
        setIsComplete(day.isComplete ?? false);
        const { plan: p, review: rv } = dayToForms(day);
        setPlan(p);
        setReview(rv);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [dateParam, isNew]);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    const dateStr = isNew ? htmlDateToApi(htmlDate) : dateParam;
    const payload = formsToPayload(dateStr, plan, review, isComplete);
    try {
      const method = isNew ? 'POST' : 'PUT';
      const url    = isNew ? '/api/days' : `/api/days/${dateStr}`;
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error ?? `${r.status}`);
      }
      navigate(`/${dateStr}`);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }, [isNew, htmlDate, dateParam, plan, review, isComplete, navigate]);

  const del = useCallback(async () => {
    if (!window.confirm('Delete this day? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/days/${dateParam}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(`${r.status}`);
      navigate('/');
    } catch (e) {
      setError(e.message);
      setDeleting(false);
    }
  }, [dateParam, navigate]);

  if (loading) return <p className="text-brand-3">Loading…</p>;

  return (
    <div className="max-w-2xl">
      {/* Back link */}
      <Link
        to={isNew ? '/' : `/${dateParam}`}
        className="mb-6 inline-block text-sm text-brand-3 hover:text-brand-1 transition-colors"
      >
        ← {isNew ? 'All reports' : 'Back to day'}
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {isNew ? 'New Day' : `Edit — ${dateParam.replace(/-/g, '/')}`}
          </h1>
          {isNew && (
            <input
              type="date"
              value={htmlDate}
              onChange={e => setHtmlDate(e.target.value)}
              className={`${timeCls} w-auto mt-2`}
            />
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-brand-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isComplete}
              onChange={e => setIsComplete(e.target.checked)}
              className="accent-brand-1"
            />
            Mark complete
          </label>
          {!isNew && (
            <button
              type="button"
              onClick={del}
              disabled={deleting}
              className={`${btnCls} border border-red-200 bg-red-50 text-red-600 hover:bg-red-100`}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className={`${btnCls} bg-brand-1 text-white hover:bg-brand-2 border border-brand-1/20 shadow-sm`}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-brand-8">
        {['plan', 'review'].map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-brand-1 text-brand-1'
                : 'border-transparent text-brand-3 hover:text-gray-700'
            }`}
          >
            {tab === 'plan' ? 'Morning Plan' : 'EOD Review'}
          </button>
        ))}
      </div>

      {activeTab === 'plan'
        ? <PlanTab   data={plan}   onChange={setPlan}   />
        : <ReviewTab data={review} onChange={setReview} planItems={plan.plan} />
      }

      {/* Save again at the bottom */}
      <div className="mt-10 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={`${btnCls} bg-brand-2/80 text-white hover:bg-brand-2 border border-brand-2/40 px-5 py-2 text-sm`}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

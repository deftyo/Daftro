import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

// ── Small helpers ─────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 border-b border-gray-800 pb-1 text-lg font-semibold text-gray-200">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Pill({ children, colour = 'gray' }) {
  const colours = {
    gray:    'bg-gray-800 text-gray-300',
    green:   'bg-emerald-900 text-emerald-300',
    amber:   'bg-amber-900 text-amber-300',
    red:     'bg-red-900 text-red-300',
    blue:    'bg-blue-900 text-blue-300',
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${colours[colour]}`}>
      {children}
    </span>
  );
}

// ── Metrics bar ───────────────────────────────────────────────────────────────

function MetricsBar({ metrics }) {
  if (!metrics) return null;
  const { dayStart, dayEnd, unplannedMinutes, unplannedPercent,
          plannedCompleted, plannedTotal, incidentCount, gapCount } = metrics;

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {dayStart && dayEnd && (
        <div className="rounded-lg bg-gray-900 border border-gray-800 p-4">
          <p className="text-xs text-gray-500 mb-1">Day</p>
          <p className="font-mono text-sm font-semibold">{dayStart} – {dayEnd}</p>
        </div>
      )}
      {plannedCompleted != null && (
        <div className="rounded-lg bg-gray-900 border border-gray-800 p-4">
          <p className="text-xs text-gray-500 mb-1">Planned</p>
          <p className="font-mono text-sm font-semibold">{plannedCompleted} / {plannedTotal ?? '?'}</p>
        </div>
      )}
      {unplannedMinutes != null && (
        <div className="rounded-lg bg-gray-900 border border-gray-800 p-4">
          <p className="text-xs text-gray-500 mb-1">Unplanned</p>
          <p className="font-mono text-sm font-semibold">
            {unplannedMinutes} min
            {unplannedPercent && <span className="ml-1 text-xs text-gray-400">({unplannedPercent})</span>}
          </p>
        </div>
      )}
      <div className="rounded-lg bg-gray-900 border border-gray-800 p-4">
        <p className="text-xs text-gray-500 mb-1">Incidents / Gaps</p>
        <p className="font-mono text-sm font-semibold">
          {incidentCount ?? 0} / {gapCount ?? 0}
        </p>
      </div>
    </div>
  );
}

// ── Plan vs Actual ────────────────────────────────────────────────────────────

function indicatorPill(si) {
  if (si === 'done')    return <Pill colour="green">✅ Done</Pill>;
  if (si === 'warning') return <Pill colour="amber">⚠️ Partial</Pill>;
  return <Pill colour="gray">—</Pill>;
}

function PlanVsActual({ blocks }) {
  if (!blocks?.length) return <p className="text-gray-500 text-sm">No data.</p>;
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) => (
        <div key={i} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium text-sm text-gray-100">{b.heading}</p>
            {indicatorPill(b.statusIndicator)}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 text-xs text-gray-400">
            {b.planned && <p><span className="text-gray-600">Planned </span>{b.planned}</p>}
            {b.actual  && <p><span className="text-gray-600">Actual </span>{b.actual}</p>}
          </div>
          {b.notes?.length > 0 && (
            <ul className="mt-2 list-disc list-inside text-xs text-amber-400 space-y-0.5">
              {b.notes.map((n, j) => <li key={j}>{n}</li>)}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Unplanned work ────────────────────────────────────────────────────────────

function UnplannedWork({ rows }) {
  if (!rows?.length) return <p className="text-gray-500 text-sm">None.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
            <th className="pb-2 pr-4">Time</th>
            <th className="pb-2 pr-4">Item</th>
            <th className="pb-2 pr-4">Duration</th>
            <th className="pb-2">Tag</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {rows.map((r, i) => (
            <tr key={i} className={r.item?.includes('FILL IN') ? 'bg-amber-950/40' : ''}>
              <td className="py-2 pr-4 font-mono text-xs text-gray-400">{r.time}</td>
              <td className="py-2 pr-4 text-gray-200">{r.item}</td>
              <td className="py-2 pr-4 text-gray-400">{r.duration}</td>
              <td className="py-2">
                {r.tag && (
                  <Pill colour={r.tag.includes('incident') ? 'red' : 'gray'}>
                    {r.tag}
                  </Pill>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Gaps alert ────────────────────────────────────────────────────────────────

function GapsAlert({ gaps }) {
  if (!gaps?.length) return null;
  return (
    <div className="mb-6 rounded-lg border border-amber-800 bg-amber-950/40 p-4">
      <p className="text-sm font-semibold text-amber-400 mb-2">
        ⚠ {gaps.length} gap{gaps.length !== 1 ? 's' : ''} need filling in
      </p>
      <ul className="space-y-1 text-xs text-amber-300">
        {gaps.map((g, i) => (
          <li key={i}>
            {g.start && g.end ? `${g.start}–${g.end}` : g.location}
            {g.location && ` (${g.location})`}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Priorities ────────────────────────────────────────────────────────────────

function Priorities({ items }) {
  if (!items?.length) return null;
  return (
    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
      {items.map((p, i) => <li key={i}>{p}</li>)}
    </ol>
  );
}

// ── Carry forward ─────────────────────────────────────────────────────────────

function CarryForward({ cf }) {
  if (!cf) return null;
  const { blocked = [], planned = [], watch = [] } = cf;
  return (
    <div className="space-y-4">
      {blocked.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Blocked</p>
          <ul className="space-y-1 text-sm text-gray-300">
            {blocked.map((r, i) => (
              <li key={i} className="flex gap-2">
                <Pill colour="red">blocked</Pill>
                <span>{r.item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {planned.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Carry forward</p>
          <ul className="space-y-1 text-sm text-gray-300">
            {planned.map((r, i) => <li key={i}>{r.item}</li>)}
          </ul>
        </div>
      )}
      {watch.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Watch</p>
          <ul className="space-y-1 text-sm text-gray-400 list-disc list-inside">
            {watch.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Notes ─────────────────────────────────────────────────────────────────────

function Notes({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-1 text-sm text-gray-300 list-disc list-inside">
      {items.map((n, i) => <li key={i}>{n}</li>)}
    </ul>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DayDetail() {
  const { date } = useParams();
  const [day, setDay] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/days/${date}`)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then(setDay)
      .catch(e => setError(e.message));
  }, [date]);

  if (error) return <p className="text-red-400">Failed to load: {error}</p>;
  if (!day)  return <p className="text-gray-500">Loading…</p>;

  const { tasklist: tl, report: rp, gaps } = day;

  return (
    <div>
      <Link to="/" className="mb-6 inline-block text-sm text-gray-500 hover:text-gray-300">
        ← All reports
      </Link>

      <h1 className="mb-2 text-2xl font-bold">
        {rp?.title ?? date.replace(/-/g, '/')}
      </h1>

      <GapsAlert gaps={gaps} />
      <MetricsBar metrics={rp?.metrics} />

      {tl?.priorities?.length > 0 && (
        <Section title="Priorities">
          <Priorities items={tl.priorities} />
        </Section>
      )}

      {rp?.planVsActual?.length > 0 && (
        <Section title="Plan vs Actual">
          <PlanVsActual blocks={rp.planVsActual} />
        </Section>
      )}

      {rp?.unplannedWork?.length > 0 && (
        <Section title="Unplanned Work">
          <UnplannedWork rows={rp.unplannedWork} />
        </Section>
      )}

      {rp?.completedWork?.length > 0 && (
        <Section title="Completed Work">
          <ul className="space-y-1 text-sm text-gray-300 list-disc list-inside">
            {rp.completedWork.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </Section>
      )}

      {rp?.carryForward && (
        <Section title="Carry Forward">
          <CarryForward cf={rp.carryForward} />
        </Section>
      )}

      {rp?.notes?.length > 0 && (
        <Section title="Notes">
          <Notes items={rp.notes} />
        </Section>
      )}
    </div>
  );
}

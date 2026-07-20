import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

// ── Small helpers ─────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 border-b border-brand-8 pb-1 text-base font-semibold text-gray-800">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Pill({ children, colour = 'default' }) {
  const colours = {
    default:  'bg-gray-100 border-gray-200 text-gray-600',
    teal:     'bg-blue-50 border-blue-200 text-blue-700',
    amber:    'bg-amber-50 border-amber-200 text-amber-700',
    magenta:  'bg-red-50 border-red-200 text-red-700',
  };
  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-medium ${colours[colour]}`}>
      {children}
    </span>
  );
}

// ── Metrics bar ───────────────────────────────────────────────────────────────

function MetricBox({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-brand-8 bg-brand-7 p-4 shadow-card">
      <p className="text-xs text-brand-3 mb-1">{label}</p>
      <p className="font-mono text-sm font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function MetricsBar({ metrics, planVsActual }) {
  if (!metrics) return null;
  const { dayStart, dayEnd, unplannedMinutes, unplannedPercent, incidentCount, gapCount } = metrics;

  // Derive planned counts from pva statuses when available
  const pvaWithStatus = (planVsActual ?? []).filter(b => b.statusIndicator);
  const plannedCompleted = pvaWithStatus.length > 0
    ? (planVsActual ?? []).filter(b => b.statusIndicator === 'done').length
    : metrics.plannedCompleted;
  const plannedTotal = pvaWithStatus.length > 0
    ? (planVsActual ?? []).length
    : metrics.plannedTotal;

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {dayStart && dayEnd && (
        <MetricBox label="Day" value={`${dayStart} – ${dayEnd}`} />
      )}
      {plannedCompleted != null && (
        <MetricBox label="Planned" value={`${plannedCompleted} / ${plannedTotal ?? '?'}`} />
      )}
      {unplannedMinutes != null && (
        <MetricBox
          label="Unplanned"
          value={`${unplannedMinutes} min`}
          sub={unplannedPercent ? `~${unplannedPercent}` : null}
        />
      )}
      <MetricBox
        label="Incidents / Gaps"
        value={`${incidentCount ?? 0} / ${gapCount ?? 0}`}
      />
    </div>
  );
}

// ── Plan vs Actual ────────────────────────────────────────────────────────────

function indicatorPill(si) {
  if (si === 'done')    return <Pill colour="teal">✓ Done</Pill>;
  if (si === 'warning') return <Pill colour="amber">~ Partial</Pill>;
  return <Pill colour="default">—</Pill>;
}

function PlanVsActual({ blocks }) {
  if (!blocks?.length) return <p className="text-brand-3 text-sm">No data.</p>;
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) => (
        <div key={i} className="rounded-lg border border-brand-8 bg-brand-7 p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium text-sm text-gray-800">{b.heading}</p>
            {indicatorPill(b.statusIndicator)}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 text-xs text-gray-500">
            {b.planned && <p><span className="text-brand-3">Planned </span>{b.planned}</p>}
            {(b.actualStart || b.actualEnd || b.actual) && (
              <p>
                <span className="text-brand-3">Actual </span>
                {b.actualStart || b.actualEnd
                  ? [b.actualStart, b.actualEnd].filter(Boolean).join('–')
                  : b.actual}
              </p>
            )}
          </div>
          {b.notes?.length > 0 && (
            <ul className="mt-2 list-disc list-inside text-xs text-amber-600 space-y-0.5">
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
  if (!rows?.length) return <p className="text-brand-3 text-sm">None.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-brand-8 shadow-card">
      <table className="w-full text-sm bg-white">
        <thead>
          <tr className="text-left text-xs text-brand-3 border-b border-brand-8 bg-gray-50">
            <th className="px-4 py-2.5">Time</th>
            <th className="px-4 py-2.5">Item</th>
            <th className="px-4 py-2.5">Duration</th>
            <th className="px-4 py-2.5">Tag</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-8">
          {rows.map((r, i) => (
            <tr key={i} className={r.item?.includes('FILL IN') ? 'bg-amber-50' : ''}>
              <td className="px-4 py-2.5 font-mono text-xs text-brand-3">{r.time}</td>
              <td className="px-4 py-2.5 text-gray-700">{r.item}</td>
              <td className="px-4 py-2.5 text-gray-500">{r.duration}</td>
              <td className="px-4 py-2.5">
                {r.tag && (
                  <Pill colour={r.tag.includes('incident') ? 'magenta' : 'default'}>
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
    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-700 mb-2">
        ⚠ {gaps.length} gap{gaps.length !== 1 ? 's' : ''} need filling in
      </p>
      <ul className="space-y-1 text-xs text-amber-600">
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
    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-3">Blocked</p>
          <ul className="space-y-1 text-sm text-gray-700">
            {blocked.map((r, i) => (
              <li key={i} className="flex gap-2 items-start">
                <Pill colour="magenta">blocked</Pill>
                <span>{r.item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {planned.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-3">Carry forward</p>
          <ul className="space-y-1 text-sm text-gray-700">
            {planned.map((r, i) => <li key={i}>{r.item}</li>)}
          </ul>
        </div>
      )}
      {watch.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-3">Watch</p>
          <ul className="space-y-1 text-sm text-gray-500 list-disc list-inside">
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
    <ul className="space-y-1 text-sm text-gray-700 list-disc list-inside">
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

  if (error) return <p className="text-red-600">Failed to load: {error}</p>;
  if (!day)  return <p className="text-brand-3">Loading…</p>;

  const { tasklist: tl, report: rp, gaps } = day;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link to="/" className="text-sm text-brand-3 hover:text-brand-1 transition-colors">
          ← All reports
        </Link>
        <Link
          to={`/${date}/edit`}
          className="rounded-md px-3 py-1.5 text-xs font-medium border border-brand-8 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-400 hover:shadow-sm transition-all"
        >
          Edit
        </Link>
      </div>

      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        {rp?.title ?? date.replace(/-/g, '/')}
      </h1>

      <GapsAlert gaps={gaps} />
      <MetricsBar metrics={rp?.metrics} planVsActual={rp?.planVsActual} />

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
          <ul className="space-y-1 text-sm text-gray-700 list-disc list-inside">
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

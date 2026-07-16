import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

// ── Small helpers ─────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 border-b border-brand-8 pb-1 text-lg font-semibold text-gray-200">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Pill({ children, colour = 'default' }) {
  const colours = {
    default:  'bg-brand-7 border-brand-8 text-gray-300',
    teal:     'bg-brand-2/20 border-brand-2/40 text-brand-1',
    amber:    'bg-amber-900/40 border-amber-700/40 text-amber-300',
    magenta:  'bg-brand-10/30 border-brand-9/40 text-purple-300',
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
    <div className="rounded-lg border border-brand-8 bg-brand-7 p-4">
      <p className="text-xs text-brand-3 mb-1">{label}</p>
      <p className="font-mono text-sm font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function MetricsBar({ metrics }) {
  if (!metrics) return null;
  const { dayStart, dayEnd, unplannedMinutes, unplannedPercent,
          plannedCompleted, plannedTotal, incidentCount, gapCount } = metrics;

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
  if (si === 'done')    return <Pill colour="teal">✅ Done</Pill>;
  if (si === 'warning') return <Pill colour="amber">⚠️ Partial</Pill>;
  return <Pill colour="default">—</Pill>;
}

function PlanVsActual({ blocks }) {
  if (!blocks?.length) return <p className="text-brand-3 text-sm">No data.</p>;
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) => (
        <div key={i} className="rounded-lg border border-brand-8 bg-brand-7 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium text-sm text-gray-100">{b.heading}</p>
            {indicatorPill(b.statusIndicator)}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 text-xs text-gray-400">
            {b.planned && <p><span className="text-brand-3">Planned </span>{b.planned}</p>}
            {b.actual  && <p><span className="text-brand-3">Actual </span>{b.actual}</p>}
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
  if (!rows?.length) return <p className="text-brand-3 text-sm">None.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-brand-3 border-b border-brand-8">
            <th className="pb-2 pr-4">Time</th>
            <th className="pb-2 pr-4">Item</th>
            <th className="pb-2 pr-4">Duration</th>
            <th className="pb-2">Tag</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-8">
          {rows.map((r, i) => (
            <tr key={i} className={r.item?.includes('FILL IN') ? 'bg-amber-900/20' : ''}>
              <td className="py-2 pr-4 font-mono text-xs text-brand-3">{r.time}</td>
              <td className="py-2 pr-4 text-gray-200">{r.item}</td>
              <td className="py-2 pr-4 text-gray-400">{r.duration}</td>
              <td className="py-2">
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
    <div className="mb-6 rounded-lg border border-amber-700/40 bg-amber-900/20 p-4">
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-3">Blocked</p>
          <ul className="space-y-1 text-sm text-gray-300">
            {blocked.map((r, i) => (
              <li key={i} className="flex gap-2">
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
          <ul className="space-y-1 text-sm text-gray-300">
            {planned.map((r, i) => <li key={i}>{r.item}</li>)}
          </ul>
        </div>
      )}
      {watch.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-3">Watch</p>
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
          className="rounded px-3 py-1.5 text-xs font-medium border border-brand-8 bg-brand-7 text-brand-3 hover:text-gray-100 hover:border-brand-4 transition-colors"
        >
          Edit
        </Link>
      </div>

      <h1 className="mb-2 text-2xl font-bold text-white">
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

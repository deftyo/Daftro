import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

function StatusBadge({ isComplete }) {
  return isComplete
    ? <span className="rounded-full bg-emerald-900 px-2 py-0.5 text-xs text-emerald-300">Complete</span>
    : <span className="rounded-full bg-yellow-900 px-2 py-0.5 text-xs text-yellow-300">Partial</span>;
}

function MetricPill({ label, value }) {
  if (value == null) return null;
  return (
    <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
      <span className="text-gray-500">{label} </span>{value}
    </span>
  );
}

function DayCard({ day }) {
  const m = day.metrics;
  const dateLabel = day.date.replace(/-/g, '/');

  return (
    <Link
      to={`/${day.date}`}
      className="block rounded-lg border border-gray-800 bg-gray-900 p-5 hover:border-gray-600 transition-colors"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="font-mono text-lg font-semibold text-white">{dateLabel}</span>
        <StatusBadge isComplete={day.isComplete} />
      </div>

      {m && (
        <div className="mt-3 flex flex-wrap gap-2">
          {m.dayStart && m.dayEnd && (
            <MetricPill label="Hours" value={`${m.dayStart}–${m.dayEnd}`} />
          )}
          {m.plannedCompleted != null && (
            <MetricPill label="Planned" value={`${m.plannedCompleted}/${m.plannedTotal ?? '?'}`} />
          )}
          {m.unplannedMinutes != null && (
            <MetricPill label="Unplanned" value={`${m.unplannedMinutes} min`} />
          )}
          {m.incidentCount > 0 && (
            <MetricPill label="Incidents" value={m.incidentCount} />
          )}
        </div>
      )}

      {day.gaps?.length > 0 && (
        <p className="mt-3 text-xs text-amber-400">
          ⚠ {day.gaps.length} gap{day.gaps.length !== 1 ? 's' : ''} need filling in
        </p>
      )}

      {(day.tasklistError || day.reportError) && (
        <p className="mt-2 text-xs text-red-400">Parse error — check console</p>
      )}
    </Link>
  );
}

export default function DayList() {
  const [days, setDays] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/days')
      .then(r => r.json())
      .then(setDays)
      .catch(e => setError(e.message));
  }, []);

  if (error) return <p className="text-red-400">Failed to load: {error}</p>;
  if (!days)  return <p className="text-gray-500">Loading…</p>;
  if (days.length === 0) return <p className="text-gray-500">No reports found in the reports directory.</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Daily Reports</h1>
      <div className="flex flex-col gap-3">
        {days.map(d => <DayCard key={d.date} day={d} />)}
      </div>
    </div>
  );
}

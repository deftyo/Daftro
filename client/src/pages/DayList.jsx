import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function StatusBadge({ isComplete }) {
  return isComplete
    ? <span className="rounded-full bg-brand-2/30 px-2 py-0.5 text-xs text-brand-1 border border-brand-2/50">Complete</span>
    : <span className="rounded-full bg-brand-9/30 px-2 py-0.5 text-xs text-purple-300 border border-brand-9/50">Partial</span>;
}

function MetricPill({ label, value }) {
  if (value == null) return null;
  return (
    <span className="rounded bg-brand-7 border border-brand-8 px-2 py-0.5 text-xs text-gray-300">
      <span className="text-brand-3">{label} </span>{value}
    </span>
  );
}

function DayCard({ day }) {
  const m = day.metrics;
  const dateLabel = day.date.replace(/-/g, '/');

  return (
    <Link
      to={`/${day.date}`}
      className="block rounded-lg border border-brand-8 bg-brand-7 p-5 hover:border-brand-4 hover:bg-brand-6 transition-colors"
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
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/days')
      .then(r => r.json())
      .then(setDays)
      .catch(e => setError(e.message));
  }, []);

  if (error) return <p className="text-red-400">Failed to load: {error}</p>;
  if (!days)  return <p className="text-brand-3">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Daily Reports</h1>
        <button
          onClick={() => navigate('/new')}
          className="rounded px-4 py-2 text-sm font-medium bg-brand-2/80 text-white hover:bg-brand-2 border border-brand-2/40 transition-colors"
        >
          + New Day
        </button>
      </div>
      {days.length === 0
        ? <p className="text-brand-3">No reports yet. Create your first day above.</p>
        : (
          <div className="flex flex-col gap-3">
            {days.map(d => <DayCard key={d.date} day={d} />)}
          </div>
        )
      }
    </div>
  );
}

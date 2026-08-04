import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function StatusBadge({ isComplete }) {
  return isComplete
    ? <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">Complete</span>
    : <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">Partial</span>;
}

function MetricPill({ label, value }) {
  if (value == null) return null;
  return (
    <span className="rounded bg-gray-100 border border-brand-8 px-2 py-0.5 text-xs text-gray-600">
      <span className="text-brand-3">{label} </span>{value}
    </span>
  );
}

const WEEK_DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function ordinal(n) {
  const v = n % 100;
  const s = ['th','st','nd','rd'];
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDayLabel(dateStr) {
  const [m, d, y] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${WEEK_DAYS[dt.getDay()]} ${ordinal(d)} ${MONTHS_LONG[m - 1]}`;
}

function DayCard({ day }) {
  const m = day.metrics;
  const dateLabel = formatDayLabel(day.date);

  return (
    <Link
      to={`/${day.date}`}
      className="block rounded-lg border border-brand-8 bg-brand-7 p-5 hover:shadow-card-hover hover:border-gray-300 transition-all shadow-card"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-base font-semibold text-gray-900">{dateLabel}</span>
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
        <p className="mt-3 text-xs text-amber-600">
          ⚠ {day.gaps.length} gap{day.gaps.length !== 1 ? 's' : ''} need filling in
        </p>
      )}

      {(day.tasklistError || day.reportError) && (
        <p className="mt-2 text-xs text-red-600">Parse error — check console</p>
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
      .then(r => { if (!r.ok) throw new Error(`Server error ${r.status}`); return r.json(); })
      .then(data => {
        if (!Array.isArray(data)) throw new Error('Unexpected response from server');
        setDays(data);
      })
      .catch(e => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">Failed to load: {error}</p>;
  if (!days)  return <p className="text-brand-3">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Daily Reports</h1>
        <button
          onClick={() => navigate('/new')}
          className="rounded-md px-4 py-2 text-sm font-medium bg-brand-1 text-white hover:bg-brand-2 transition-colors shadow-sm"
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

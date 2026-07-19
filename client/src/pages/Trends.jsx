import React, { useEffect, useState } from 'react';
import CompletionRate    from '../components/charts/CompletionRate';
import UnplannedTime     from '../components/charts/UnplannedTime';
import DayLength         from '../components/charts/DayLength';
import IncidentFrequency from '../components/charts/IncidentFrequency';
import CarryForward      from '../components/charts/CarryForward';

// ── Summary stats ─────────────────────────────────────────────────────────────

function summarise(data, view) {
  const totalDays = view === 'daily'
    ? data.length
    : data.reduce((s, d) => s + (d.days ?? 1), 0);

  const withRate      = data.filter(d => d.completionRate != null);
  const withUnplanned = data.filter(d => d.unplannedMinutes != null);

  return {
    totalDays,
    avgCompletion: withRate.length
      ? Math.round(withRate.reduce((s, d) => s + d.completionRate, 0) / withRate.length)
      : null,
    avgUnplanned: withUnplanned.length
      ? Math.round(withUnplanned.reduce((s, d) => s + d.unplannedMinutes, 0) / withUnplanned.length)
      : null,
    totalIncidents: data.reduce((s, d) => s + (d.incidentCount ?? 0), 0),
  };
}

// ── UI helpers ────────────────────────────────────────────────────────────────

const VIEWS = ['daily', 'weekly', 'monthly'];

function ViewToggle({ view, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-brand-8 bg-gray-50 p-0.5 gap-0.5">
      {VIEWS.map(v => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors ${
            view === v
              ? 'bg-white text-gray-900 shadow-sm border border-brand-8'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function StatBox({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-brand-8 bg-white p-4 shadow-card">
      <p className="text-xs uppercase tracking-wide text-brand-3 mb-1">{label}</p>
      <p className="font-mono text-lg font-semibold text-gray-900 tabular-nums">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-lg border border-brand-8 bg-white p-5 mb-5 shadow-card">
      <p className="text-sm font-medium text-gray-800 mb-0.5">{title}</p>
      {subtitle && <p className="text-xs text-brand-3 mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Trends() {
  const [view,  setView]  = useState('daily');
  const [data,  setData]  = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    setError(null);
    fetch(`/api/trends/${view}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(setData)
      .catch(e => setError(e.message));
  }, [view]);

  const minPoints = view === 'daily' ? 2 : 1;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Trends</h1>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {error && <p className="text-red-600 mb-4">Failed to load: {error}</p>}

      {!data && !error && <p className="text-brand-3">Loading…</p>}

      {data && data.length < minPoints && (
        <p className="text-brand-3">
          Not enough data yet — log more complete days to see {view} trends.
        </p>
      )}

      {data && data.length >= minPoints && (() => {
        const stats = summarise(data, view);
        return (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <StatBox
                label="Days logged"
                value={stats.totalDays}
                sub={view !== 'daily' ? `across ${data.length} ${view === 'weekly' ? 'weeks' : 'months'}` : null}
              />
              <StatBox label="Avg completion"     value={stats.avgCompletion != null ? `${stats.avgCompletion}%` : null} />
              <StatBox label="Avg unplanned / day" value={stats.avgUnplanned  != null ? `${stats.avgUnplanned} min` : null} />
              <StatBox label="Total incidents"     value={stats.totalIncidents} />
            </div>

            <ChartCard
              title="Planned completion rate"
              subtitle={`% of planned items completed — ${view} view, dashed line at 80%`}
            >
              <CompletionRate data={data} />
            </ChartCard>

            <ChartCard
              title="Unplanned time"
              subtitle={`${view === 'daily' ? 'Minutes per day' : 'Avg minutes per day'} — amber >30 min, red >60 min`}
            >
              <UnplannedTime data={data} />
            </ChartCard>

            <ChartCard
              title="Day length"
              subtitle={`${view === 'daily' ? 'Total logged hours' : 'Avg logged hours'} — dashed line at 8 h`}
            >
              <DayLength data={data} />
            </ChartCard>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ChartCard
                title="Incident frequency"
                subtitle={view === 'daily' ? 'Incidents per day' : `Total incidents per ${view === 'weekly' ? 'week' : 'month'}`}
              >
                <IncidentFrequency data={data} />
              </ChartCard>
              <ChartCard
                title="Carry-forward count"
                subtitle={view === 'daily' ? 'Items slipping to next day' : 'Avg carry-forward per day'}
              >
                <CarryForward data={data} />
              </ChartCard>
            </div>
          </>
        );
      })()}
    </div>
  );
}

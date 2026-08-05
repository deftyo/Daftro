import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import CompletionRate    from '../components/charts/CompletionRate';
import UnplannedTime     from '../components/charts/UnplannedTime';
import DayLength         from '../components/charts/DayLength';
import IncidentFrequency from '../components/charts/IncidentFrequency';
import MeetingTime       from '../components/charts/MeetingTime';
import { C, TOOLTIP, AXIS, GRID } from '../components/charts/chartConfig';

// ── Dev capacity chart (weekly only) ─────────────────────────────────────────

function DevCapacity({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis {...AXIS} domain={[0, 40]} tickFormatter={v => `${v}h`} />
        <Tooltip
          {...TOOLTIP}
          formatter={(v, _, props) => [
            `${v} hrs (overhead: ${(props.payload.overheadMinutes / 60).toFixed(1)} hrs, meetings: ${(props.payload.meetingMinutes / 60).toFixed(1)} hrs)`,
            'Dev capacity',
          ]}
        />
        <ReferenceLine y={37.5} stroke={C.grid} strokeDasharray="4 4"
          label={{ value: '37.5 h', fill: C.axis, fontSize: 10, position: 'right' }} />
        <Bar dataKey="devCapacityHours" fill={C.primary} radius={[3, 3, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Summary stats ─────────────────────────────────────────────────────────────

function summarise(data, view) {
  const totalDays = view === 'daily'
    ? data.length
    : data.reduce((s, d) => s + (d.days ?? 1), 0);

  const withRate      = data.filter(d => d.completionRate != null);
  const withUnplanned = data.filter(d => d.unplannedMinutes != null);
  const totalMeetingMins  = data.reduce((s, d) => s + (d.meetingMinutes ?? 0), 0);
  const totalOverheadMins = data.reduce((s, d) => s + (d.overheadMinutes ?? d.meetingMinutes ?? 0), 0);

  const avgMeetingMins  = data.length ? Math.round(totalMeetingMins  / data.length) : 0;
  const avgOverheadMins = data.length ? Math.round(totalOverheadMins / data.length) : 0;

  return {
    totalDays,
    avgCompletion: withRate.length
      ? Math.round(withRate.reduce((s, d) => s + d.completionRate, 0) / withRate.length)
      : null,
    avgUnplanned: withUnplanned.length
      ? Math.round(withUnplanned.reduce((s, d) => s + d.unplannedMinutes, 0) / withUnplanned.length)
      : null,
    totalIncidents: data.reduce((s, d) => s + (d.incidentCount ?? 0), 0),
    avgMeetingMins,
    avgOverheadMins,
    // Dev capacity subtracts all overhead (meeting + admin + support + other), not just meetings
    avgDevCapacity: view === 'weekly' && avgOverheadMins != null
      ? Math.round((37.5 - avgOverheadMins / 60) * 10) / 10
      : null,
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
              <StatBox
                label={view === 'daily' ? 'Avg meeting / day' : view === 'weekly' ? 'Avg meeting / week' : 'Avg meeting / month'}
                value={stats.avgMeetingMins
                  ? view === 'daily'
                    ? `${stats.avgMeetingMins} min`
                    : `${(stats.avgMeetingMins / 60).toFixed(1)} hrs`
                  : '—'}
                sub={view !== 'daily' ? `${stats.avgMeetingMins} min avg` : null}
              />
              {stats.avgDevCapacity != null && (
                <StatBox
                  label="Avg dev capacity / wk"
                  value={`${stats.avgDevCapacity} hrs`}
                  sub={`37.5h − ${(stats.avgOverheadMins / 60).toFixed(1)}h overhead (mtg + admin + support + other)`}
                />
              )}
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

            <ChartCard
              title="Meeting time"
              subtitle={
                view === 'daily'
                  ? 'Minutes in meetings per day (any plan block containing "meeting") — dashed line at 1 hr'
                  : `Avg minutes per working day — dashed line at 1 hr (${view === 'weekly' ? 'weekly' : 'monthly'} rollup)`
              }
            >
              <MeetingTime data={data} view={view} />
            </ChartCard>

            {view === 'weekly' && (
              <ChartCard
                title="Dev capacity"
                subtitle="37.5 hrs contracted − meeting time = estimated dev hours per week"
              >
                <DevCapacity data={data} />
              </ChartCard>
            )}

            <ChartCard
              title="Incident frequency"
              subtitle={view === 'daily' ? 'Incidents per day' : `Total incidents per ${view === 'weekly' ? 'week' : 'month'}`}
            >
              <IncidentFrequency data={data} />
            </ChartCard>
          </>
        );
      })()}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import CompletionRate    from '../components/charts/CompletionRate';
import UnplannedTime     from '../components/charts/UnplannedTime';
import DayLength         from '../components/charts/DayLength';
import IncidentFrequency from '../components/charts/IncidentFrequency';
import CarryForward      from '../components/charts/CarryForward';

// ── Data helpers ──────────────────────────────────────────────────────────────

function toMins(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function buildChartData(days) {
  return days
    .filter(d => d.isComplete && d.metrics)
    .slice()
    .reverse()
    .map(d => {
      const m = d.metrics;
      const startMins = toMins(m.dayStart);
      const endMins   = toMins(m.dayEnd);
      return {
        label:            d.label ?? d.date,
        date:             d.date,
        completionRate:   m.plannedTotal > 0
          ? Math.round(m.plannedCompleted / m.plannedTotal * 100)
          : null,
        plannedCompleted: m.plannedCompleted,
        plannedTotal:     m.plannedTotal,
        unplannedMinutes: m.unplannedMinutes ?? null,
        dayLengthHours:   startMins != null && endMins != null
          ? Math.round((endMins - startMins) / 6) / 10
          : null,
        dayStart:         m.dayStart,
        dayEnd:           m.dayEnd,
        incidentCount:    m.incidentCount ?? 0,
        carryForwardCount: m.carryForwardCount ?? 0,
      };
    });
}

function summarise(data) {
  const withRate      = data.filter(d => d.completionRate != null);
  const withUnplanned = data.filter(d => d.unplannedMinutes != null);
  return {
    totalDays:     data.length,
    avgCompletion: withRate.length
      ? Math.round(withRate.reduce((s, d) => s + d.completionRate, 0) / withRate.length)
      : null,
    avgUnplanned:  withUnplanned.length
      ? Math.round(withUnplanned.reduce((s, d) => s + d.unplannedMinutes, 0) / withUnplanned.length)
      : null,
    totalIncidents: data.reduce((s, d) => s + d.incidentCount, 0),
  };
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function StatBox({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-brand-8 bg-brand-7 p-4">
      <p className="text-xs uppercase tracking-wide text-brand-3 mb-1">{label}</p>
      <p className="font-mono text-lg font-semibold text-white tabular-nums">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-lg border border-brand-8 bg-brand-7 p-5 mb-5">
      <p className="text-sm font-medium text-gray-200 mb-0.5">{title}</p>
      {subtitle && <p className="text-xs text-brand-3 mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Trends() {
  const [days,  setDays]  = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/days')
      .then(r => r.json())
      .then(setDays)
      .catch(e => setError(e.message));
  }, []);

  if (error) return <p className="text-red-400">Failed to load: {error}</p>;
  if (!days)  return <p className="text-brand-3">Loading…</p>;

  const data = buildChartData(days);

  if (data.length < 2) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold text-white">Trends</h1>
        <p className="text-brand-3">Need at least 2 complete days to show trends.</p>
      </div>
    );
  }

  const stats = summarise(data);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Trends</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatBox label="Days logged"      value={stats.totalDays} />
        <StatBox label="Avg completion"   value={stats.avgCompletion != null ? `${stats.avgCompletion}%` : null} />
        <StatBox label="Avg unplanned"    value={stats.avgUnplanned != null ? `${stats.avgUnplanned} min` : null} />
        <StatBox label="Total incidents"  value={stats.totalIncidents} />
      </div>

      <ChartCard
        title="Planned completion rate"
        subtitle="% of planned items completed each day — dashed line at 80%"
      >
        <CompletionRate data={data} />
      </ChartCard>

      <ChartCard
        title="Unplanned time"
        subtitle="Minutes of unplanned work per day — amber >30 min, purple >60 min"
      >
        <UnplannedTime data={data} />
      </ChartCard>

      <ChartCard
        title="Day length"
        subtitle="Total logged hours — dashed line at 8 h"
      >
        <DayLength data={data} />
      </ChartCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <ChartCard title="Incident frequency" subtitle="Incidents per day">
          <IncidentFrequency data={data} />
        </ChartCard>
        <ChartCard title="Carry-forward count" subtitle="Items slipping to the next day">
          <CarryForward data={data} />
        </ChartCard>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { C } from './charts/chartConfig';

const VISIBLE_DATES = 20;

function DateList({ label, dates, color }) {
  if (!dates.length) return null;
  const visible = dates.slice(0, VISIBLE_DATES);
  const extra = dates.length - visible.length;

  return (
    <details className="mt-2">
      <summary className="text-xs font-medium cursor-pointer select-none" style={{ color }}>
        {label} ({dates.length})
      </summary>
      <p className="mt-1.5 text-xs text-brand-3 leading-relaxed">
        {visible.map(d => d.label).join(', ')}
        {extra > 0 && ` + ${extra} more`}
      </p>
    </details>
  );
}

export default function CompletenessPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/trends/completeness')
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  if (error) return null;
  if (!data || data.expectedWeekdays === 0) return null;

  return (
    <div className="rounded-lg border border-brand-8 bg-white p-5 mb-5 shadow-card">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-gray-800">Data coverage</p>
          <p className="text-xs text-brand-3 mt-0.5">
            {data.rangeStart} – {data.rangeEnd}, weekdays only
          </p>
        </div>
        <p className="font-mono text-2xl font-semibold tabular-nums" style={{ color: C.primary }}>
          {data.completenessPercent}%
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-gray-100 border border-brand-8 px-2 py-0.5 text-gray-600">
          <span className="text-brand-3">Complete </span>{data.complete}
        </span>
        {data.incomplete > 0 && (
          <span className="rounded border px-2 py-0.5" style={{ borderColor: C.amber, color: C.amber, background: '#FEF7E8' }}>
            Incomplete {data.incomplete}
          </span>
        )}
        {data.missing > 0 && (
          <span className="rounded border px-2 py-0.5" style={{ borderColor: C.danger, color: C.danger, background: '#FDECEA' }}>
            Missing {data.missing}
          </span>
        )}
        <span className="rounded bg-gray-100 border border-brand-8 px-2 py-0.5 text-gray-600">
          <span className="text-brand-3">Expected </span>{data.expectedWeekdays}
        </span>
      </div>

      <DateList label="Missing days"    dates={data.missingDates}    color={C.danger} />
      <DateList label="Incomplete days" dates={data.incompleteDates} color={C.amber} />
    </div>
  );
}

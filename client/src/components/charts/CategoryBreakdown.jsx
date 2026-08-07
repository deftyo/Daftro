import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { C, TOOLTIP, AXIS, GRID } from './chartConfig';

const CAT_COLOURS = {
  development: '#1A73E8',
  planning:    '#0D47A1',
  meeting:     '#8E24AA',
  admin:       '#9AA0A6',
  support:     '#F29900',
  other:       '#EA4335',
};

const CAT_LABELS = {
  development: 'Development',
  planning:    'Planning',
  meeting:     'Meeting',
  admin:       'Admin',
  support:     'Support',
  other:       'Other',
};

const ALL_CATS = ['development', 'planning', 'meeting', 'admin', 'support', 'other'];

// Flatten categoryBreakdown object into recharts-compatible data
function flattenBreakdown(dataPoints) {
  return dataPoints.map(d => ({
    ...d,
    ...(d.categoryBreakdown ?? {}),
  }));
}

function usedCategories(data) {
  const seen = new Set();
  for (const d of data) {
    for (const cat of Object.keys(d.categoryBreakdown ?? {})) {
      seen.add(cat);
    }
  }
  return ALL_CATS.filter(c => seen.has(c));
}

export default function CategoryBreakdown({ data }) {
  const flat = flattenBreakdown(data);
  const cats = usedCategories(data);

  if (!cats.length) {
    return <p className="text-sm text-brand-3">No categorised plan blocks yet — add categories to your day plan to see the breakdown.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={flat} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis {...AXIS} tickFormatter={v => `${v}m`} />
        <Tooltip
          {...TOOLTIP}
          formatter={(v, name) => [`${v} min`, CAT_LABELS[name] ?? name]}
        />
        <Legend
          formatter={name => CAT_LABELS[name] ?? name}
          iconType="square"
          wrapperStyle={{ fontSize: 11 }}
        />
        {cats.map(cat => (
          <Bar
            key={cat}
            dataKey={cat}
            stackId="cats"
            fill={CAT_COLOURS[cat] ?? C.muted}
            radius={cat === cats[cats.length - 1] ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            maxBarSize={40}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

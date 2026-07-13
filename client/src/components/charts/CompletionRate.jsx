import React from 'react';
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { C, TOOLTIP, AXIS, GRID } from './chartConfig';

export default function CompletionRate({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis {...AXIS} domain={[0, 100]} tickFormatter={v => `${v}%`} />
        <Tooltip
          {...TOOLTIP}
          formatter={(v, _, props) =>
            [`${v}% (${props.payload.plannedCompleted ?? '?'} of ${props.payload.plannedTotal ?? '?'})`, 'Completed']
          }
        />
        <ReferenceLine y={80} stroke={C.amber} strokeDasharray="4 4" label={{ value: '80%', fill: C.amber, fontSize: 10, position: 'right' }} />
        <Line
          type="monotone"
          dataKey="completionRate"
          stroke={C.primary}
          strokeWidth={2}
          dot={{ r: 3, fill: C.primary, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: C.teal }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

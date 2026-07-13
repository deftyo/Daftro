import React from 'react';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { C, TOOLTIP, AXIS, GRID } from './chartConfig';

export default function DayLength({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
        <defs>
          <linearGradient id="dayLenGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={C.primary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={C.primary} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis
          {...AXIS}
          domain={['auto', 'auto']}
          tickFormatter={v => `${v}h`}
        />
        <Tooltip
          {...TOOLTIP}
          formatter={(v, _, props) => {
            const { dayStart, dayEnd } = props.payload;
            return [`${v}h  (${dayStart ?? '?'} – ${dayEnd ?? '?'})`, 'Day length'];
          }}
        />
        <ReferenceLine y={8} stroke={C.amber} strokeDasharray="4 4" label={{ value: '8h', fill: C.amber, fontSize: 10, position: 'right' }} />
        <Area
          type="monotone"
          dataKey="dayLengthHours"
          stroke={C.primary}
          strokeWidth={2}
          fill="url(#dayLenGrad)"
          dot={{ r: 3, fill: C.primary, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: C.teal }}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

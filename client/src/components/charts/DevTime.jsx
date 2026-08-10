import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { C, TOOLTIP, AXIS, GRID } from './chartConfig';

export default function DevTime({ data, view }) {
  const isDaily = view === 'daily';
  const dataKey = isDaily ? 'devMinutes' : 'avgDailyDevMins';

  // Reference at 6h (360 min) — a healthy full dev day
  const refVal = 360;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis {...AXIS} tickFormatter={v => `${v}m`} />
        <Tooltip
          {...TOOLTIP}
          formatter={(v, _, props) => {
            const hrs = (v / 60).toFixed(1);
            const suffix = !isDaily ? ` avg/day (${props.payload.devMinutes} min total)` : '';
            return [`${v} min (${hrs} hrs)${suffix}`, 'Dev time'];
          }}
        />
        <ReferenceLine
          y={refVal}
          stroke={C.primary}
          strokeDasharray="4 4"
          label={{ value: '6 h', fill: C.primary, fontSize: 10, position: 'right' }}
        />
        <Bar
          dataKey={dataKey}
          fill={C.primary}
          radius={[3, 3, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { C, TOOLTIP, AXIS, GRID } from './chartConfig';

function barColour(minutes) {
  if (minutes == null) return C.grid;
  if (minutes > 60)  return C.dangerLight;
  if (minutes > 30)  return C.amber;
  return C.primary;
}

export default function UnplannedTime({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis {...AXIS} tickFormatter={v => `${v}m`} />
        <Tooltip {...TOOLTIP} formatter={v => [`${v} min`, 'Unplanned']} />
        <ReferenceLine y={30} stroke={C.amber}  strokeDasharray="4 4" label={{ value: '30m', fill: C.amber,  fontSize: 10, position: 'right' }} />
        <ReferenceLine y={60} stroke={C.dangerLight} strokeDasharray="4 4" label={{ value: '60m', fill: C.dangerLight, fontSize: 10, position: 'right' }} />
        <Bar dataKey="unplannedMinutes" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={barColour(d.unplannedMinutes)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

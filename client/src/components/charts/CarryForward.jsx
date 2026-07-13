import React from 'react';
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { C, TOOLTIP, AXIS, GRID } from './chartConfig';

export default function CarryForward({ data }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis {...AXIS} allowDecimals={false} />
        <Tooltip {...TOOLTIP} formatter={v => [v, 'Items carried forward']} />
        <Line
          type="monotone"
          dataKey="carryForwardCount"
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

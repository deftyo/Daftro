import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { C, TOOLTIP, AXIS, GRID } from './chartConfig';

export default function MeetingTime({ data, view }) {
  const isWeekly = view === 'weekly';

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis
          {...AXIS}
          tickFormatter={v => isWeekly ? `${(v / 60).toFixed(1)}h` : `${v}m`}
        />
        <Tooltip
          {...TOOLTIP}
          formatter={v => [
            isWeekly
              ? `${(v / 60).toFixed(1)} hrs (${v} min)`
              : `${v} min`,
            'Meeting time',
          ]}
        />
        {isWeekly && (
          <ReferenceLine
            y={360}
            stroke={C.amber}
            strokeDasharray="4 4"
            label={{ value: '6 h', fill: C.amber, fontSize: 10, position: 'right' }}
          />
        )}
        <Bar
          dataKey="meetingMinutes"
          fill={C.primary}
          radius={[3, 3, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

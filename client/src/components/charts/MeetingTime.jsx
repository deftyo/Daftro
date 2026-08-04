import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { C, TOOLTIP, AXIS, GRID } from './chartConfig';

export default function MeetingTime({ data, view }) {
  const isDaily = view === 'daily';

  // Daily: raw minutes per day. Weekly/monthly: avg minutes per working day.
  const dataKey = isDaily ? 'meetingMinutes' : 'avgDailyMeetingMins';

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis
          {...AXIS}
          tickFormatter={v => `${v}m`}
        />
        <Tooltip
          {...TOOLTIP}
          formatter={(v, _, props) => {
            const suffix = isDaily ? '' : ` avg/day (${props.payload.meetingMinutes} min total)`;
            return [`${v} min${suffix}`, 'Meeting time'];
          }}
        />
        <ReferenceLine
          y={60}
          stroke={C.amber}
          strokeDasharray="4 4"
          label={{ value: '1 h', fill: C.amber, fontSize: 10, position: 'right' }}
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

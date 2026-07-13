import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { C, TOOLTIP, AXIS, GRID } from './chartConfig';

export default function IncidentFrequency({ data }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis {...AXIS} allowDecimals={false} />
        <Tooltip {...TOOLTIP} formatter={v => [v, 'Incidents']} />
        <Bar dataKey="incidentCount" fill={C.dangerLight} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

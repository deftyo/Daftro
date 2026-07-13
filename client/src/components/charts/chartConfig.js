export const C = {
  primary:   '#006466',
  teal:      '#2dd4bf',
  amber:     '#fbbf24',
  danger:    '#4d194d',
  dangerLight: '#a855f7',
  grid:      '#312244',
  axis:      '#065a60',
  muted:     '#475569',
  surface:   '#212f45',
  border:    '#312244',
  text:      '#e2e8f0',
  textMuted: '#94a3b8',
};

export const TOOLTIP = {
  contentStyle: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    fontSize: 12,
    color: C.text,
  },
  labelStyle:  { color: C.teal, marginBottom: 2, fontWeight: 500 },
  itemStyle:   { color: C.textMuted },
  cursor:      { fill: 'rgba(0,100,102,0.07)' },
};

export const AXIS = {
  tick:     { fill: C.axis, fontSize: 11 },
  axisLine: { stroke: C.grid },
  tickLine: false,
};

export const GRID = {
  stroke:          C.grid,
  strokeDasharray: '3 3',
  vertical:        false,
};

export const C = {
  primary:     '#1A73E8',  // Google blue
  teal:        '#1A73E8',  // active dot highlight
  amber:       '#F29900',  // Google amber
  danger:      '#D93025',  // Google red
  dangerLight: '#EA4335',  // Red lighter
  grid:        '#E0E0E0',  // Light border
  axis:        '#9AA0A6',  // Muted grey
  muted:       '#9AA0A6',
  surface:     '#FFFFFF',  // Tooltip bg
  border:      '#E0E0E0',
  text:        '#202124',  // Primary text
  textMuted:   '#5F6368',  // Secondary text
};

export const TOOLTIP = {
  contentStyle: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    fontSize: 12,
    color: C.text,
    boxShadow: '0 2px 6px rgba(60,64,67,0.15)',
  },
  labelStyle:  { color: C.primary, marginBottom: 2, fontWeight: 500 },
  itemStyle:   { color: C.textMuted },
  cursor:      { fill: 'rgba(26,115,232,0.06)' },
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

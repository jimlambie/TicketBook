export const C = {
  bg: '#0f0e0c', surface: '#1a1915', surface2: '#242320',
  border: 'rgba(255,255,255,0.08)' as const,
  border2: 'rgba(255,255,255,0.14)' as const,
  text: '#f0ede6', muted: '#8a8780',
  accent: '#e8c547', accent2: '#c4a832',
  red: '#e05252', green: '#52c47a', teal: '#4ab8a0',
  radius: 10,
} as const

export const F = {
  display: 'Fraunces-SemiBold',
  displayLight: 'Fraunces-Regular',
  displayItalic: 'Fraunces-Italic',
  mono: 'DMMono-Regular',
  monoMedium: 'DMMono-Medium',
} as const

export const eventTypeStyle = {
  concert: { bg: 'rgba(90,148,74,0.15)' as const, text: '#52c47a', border: 'rgba(82,196,122,0.3)' as const, heroBg: '#171f14', label: 'Concert' },
  sport:   { bg: 'rgba(74,108,184,0.15)' as const, text: '#5b8ce8', border: 'rgba(91,140,232,0.3)' as const, heroBg: '#0f1520', label: 'Sport' },
  festival:{ bg: 'rgba(232,197,71,0.12)' as const, text: '#e8c547', border: 'rgba(232,197,71,0.3)' as const, heroBg: '#1a1910', label: 'Festival' },
  other:   { bg: 'rgba(138,135,128,0.1)' as const, text: '#8a8780', border: 'rgba(255,255,255,0.14)' as const, heroBg: '#1a1915', label: 'Other' },
} as const

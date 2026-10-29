export const colors = {
  bg: '#0A0A0B',
  surface: '#141416',
  surfaceAlt: '#1C1C1F',
  border: '#2A2A2E',
  text: '#F5F5F7',
  textMuted: '#9A9AA2',
  textDim: '#6B6B73',
  accent: '#E31937',
  accentSoft: 'rgba(227, 25, 55, 0.14)',
  silver: '#C9CCD1',
  success: '#2FBF71',
  successSoft: 'rgba(47, 191, 113, 0.14)',
  warning: '#F5B53D',
  warningSoft: 'rgba(245, 181, 61, 0.14)',
  danger: '#FF5A5F',
  white: '#FFFFFF',
  black: '#000000',
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const font = {
  h1: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.8 },
};

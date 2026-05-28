/**
 * Ping design tokens — single source of truth for visual identity.
 *
 * Style direction: premium dark, generous spacing, monumental typography,
 * emerald brand accent. Every surface is a clear hierarchy of depth.
 */

export const colors = {
  // Background tiers (deepest → most elevated)
  bg: '#0A0E1C',
  surface: '#13182A',
  surfaceElevated: '#1B2138',
  surfaceMuted: '#161A2E',

  // Borders / dividers
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderMedium: 'rgba(255,255,255,0.12)',
  borderStrong: 'rgba(255,255,255,0.20)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A8B0C7',
  textTertiary: '#6B7390',
  textQuaternary: '#4B5273',
  textInverse: '#0A0E1C',

  // Brand
  brand: '#10B981',
  brandMuted: 'rgba(16,185,129,0.14)',
  brandStrong: '#059669',
  brandFaint: 'rgba(16,185,129,0.06)',

  // Accents (use sparingly)
  accentBlue: '#3B82F6',
  accentPurple: '#8B5CF6',
  accentPink: '#EC4899',
  accentAmber: '#F59E0B',

  // Semantic
  success: '#10B981',
  successMuted: 'rgba(16,185,129,0.12)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245,158,11,0.12)',
  error: '#EF4444',
  errorMuted: 'rgba(239,68,68,0.12)',

  // Channels
  whatsapp: '#25D366',
  whatsappMuted: 'rgba(37,211,102,0.14)',

  // Gradient helpers
  gradientBrandStart: '#10B981',
  gradientBrandEnd: '#06B6D4',
  gradientPremiumStart: '#1B2138',
  gradientPremiumEnd: '#0A0E1C',
};

export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
  full: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
};

export const typography = {
  displayHuge: {
    fontSize: 80,
    fontWeight: '800' as const,
    letterSpacing: -3,
    lineHeight: 84,
  },
  displayLarge: {
    fontSize: 64,
    fontWeight: '800' as const,
    letterSpacing: -2,
    lineHeight: 68,
  },
  displayMedium: {
    fontSize: 48,
    fontWeight: '800' as const,
    letterSpacing: -1.5,
    lineHeight: 52,
  },
  displaySmall: {
    fontSize: 36,
    fontWeight: '700' as const,
    letterSpacing: -1,
    lineHeight: 40,
  },
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  bodyLarge: { fontSize: 17, fontWeight: '400' as const, lineHeight: 24 },
  bodyLargeStrong: { fontSize: 17, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    lineHeight: 18,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    lineHeight: 14,
    textTransform: 'uppercase' as const,
  },
  caption: { fontSize: 11, fontWeight: '400' as const, lineHeight: 14 },
  mono: { fontSize: 13, fontFamily: 'Menlo', lineHeight: 18 },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
  brand: {
    shadowColor: '#10B981',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
};

export const animation = {
  // Spring presets for react-native-reanimated
  springGentle: { damping: 18, stiffness: 180, mass: 0.9 },
  springSnappy: { damping: 14, stiffness: 220, mass: 0.8 },
  springBouncy: { damping: 10, stiffness: 180, mass: 1 },
};

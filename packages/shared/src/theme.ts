/**
 * Raahat Design System Tokens
 * Strictly following design.md
 */

export const colors = {
  forest: {
    900: '#1F3A2A', // Deep text accents, pressed states on green
    700: '#3E6B4B', // Selected chip, active icon accents
  },
  sage: {
    500: '#6F9A78', // Selected chip fill, illustration tint
    300: '#A9C4AE', // Hover/secondary green, dots, progress
  },
  mist: {
    100: '#EEF3F0', // Page background (top gradient)
    200: '#DCE6E0', // Page background (mid gradient), dividers
    400: '#B8C7BE', // Disabled, placeholder, inactive dots
  },
  ink: {
    900: '#111312', // Primary CTA fill, active nav button, headline text
    700: '#2B2F2D', // Body text on light
    500: '#5E6661', // Secondary text, captions
  },
  white: '#FFFFFF',
  sand: {
    300: '#C9A98A', // Desert/warm photography accent
  },
  sunrise: {
    400: '#E9B872', // Warm accent
  },
  semantic: {
    success: '#4C9A6A',
    warning: '#E3A93B',
    error: '#C8503F',
    info: '#4F7FA6',
  },
} as const;

export const pageBackgroundGradient = {
  css: 'linear-gradient(180deg, #F4F7F5 0%, #E3ECE6 55%, #CBDAD0 100%)',
  stops: ['#F4F7F5', '#E3ECE6', '#CBDAD0'] as const,
};

export const glassSurfaces = {
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    backdropFilter: 'blur(20px) saturate(140%)',
    borderColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    innerHighlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.7)',
  },
  medium: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    backdropFilter: 'blur(16px)',
  },
  dark: {
    backgroundColor: 'rgba(17, 19, 18, 0.55)',
    backdropFilter: 'blur(18px)',
  },
  border: 'rgba(255, 255, 255, 0.65)',
  innerHighlight: 'rgba(255, 255, 255, 0.7)',
} as const;

export const radii = {
  xs: 8,
  sm: 12,
  md: 20,
  lg: 28,
  xl: 36,
  pill: 9999,
  circle: '50%',
} as const;

export const elevations = {
  elev0: 'none',
  elev1: '0 2px 8px rgba(31,58,42,0.08)',
  elev2: '0 8px 24px rgba(31,58,42,0.12)',
  elev3: '0 16px 40px rgba(31,58,42,0.18)',
} as const;

export const typography = {
  fontSans: 'Inter, Manrope, system-ui, sans-serif',
  fontSerifItalic: '"Instrument Serif", "Playfair Display", Georgia, serif',
  scale: {
    displayXl: { size: 34, lineHeight: 38, weight: '400', tracking: -0.02 },
    displayLg: { size: 30, lineHeight: 36, weight: '400', tracking: -0.015 },
    titleMd: { size: 18, lineHeight: 24, weight: '500', tracking: -0.005 },
    titleSm: { size: 16, lineHeight: 22, weight: '600', tracking: 0 },
    bodyMd: { size: 14, lineHeight: 20, weight: '400', tracking: 0 },
    bodySm: { size: 12, lineHeight: 16, weight: '400', tracking: 0.005 },
    labelMd: { size: 14, lineHeight: 18, weight: '500', tracking: 0 },
    labelSm: { size: 11, lineHeight: 14, weight: '500', tracking: 0.02 },
    caption: { size: 10, lineHeight: 12, weight: '400', tracking: 0.02 },
  },
} as const;

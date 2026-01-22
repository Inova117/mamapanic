// MAMÁ RESPIRA - Theme Configuration
// "The 3 AM Doctrine" - Dark Mode First, Calm Colors

export const colors = {
  // Primary Background - Deep Charcoal/Slate (Dark Mode First)
  background: {
    primary: '#1e293b',    // Main app background
    secondary: '#0f172a',  // Darker sections
    card: '#334155',       // Card backgrounds
    elevated: '#475569',   // Elevated elements
  },
  
  // Accent Colors - Warm and Calming
  accent: {
    terracotta: '#e07a5f',   // Panic button, urgent actions
    terracottaLight: '#f4a58a', // Terracotta hover/light
    sage: '#81b29a',         // Success, calm states
    sageLight: '#a8d4b9',    // Sage light variant
    gold: '#f2cc8f',         // Highlights, important info
    goldLight: '#f8e4b8',    // Gold light variant
  },
  
  // Text Colors
  text: {
    primary: '#f4f1de',      // Main text (cream on dark)
    secondary: '#94a3b8',    // Secondary text (muted)
    muted: '#64748b',        // Disabled/placeholder
    inverse: '#1e293b',      // Text on light backgrounds
  },
  
  // Mood Colors
  mood: {
    sad: '#e07a5f',          // Terracotta for sad
    neutral: '#f2cc8f',      // Gold for neutral
    happy: '#81b29a',        // Sage for happy
  },
  
  // Status Colors
  status: {
    success: '#81b29a',
    warning: '#f2cc8f',
    error: '#e07a5f',
    info: '#94a3b8',
  },
  
  // Breathing Animation Colors
  breathing: {
    inhale: '#81b29a',       // Sage - inhale
    hold: '#f2cc8f',         // Gold - hold
    exhale: '#e07a5f',       // Terracotta - exhale
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  hero: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Touch target minimums (accessibility)
export const touchTarget = {
  min: 44, // iOS minimum
  comfortable: 48,
  large: 64,
};

export default {
  colors,
  spacing,
  fontSize,
  borderRadius,
  touchTarget,
};

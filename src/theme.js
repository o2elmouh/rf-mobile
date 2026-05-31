// RentaFlow Mobile — Design Tokens
// Mirrors the web app's DESIGN.md (Mastercard-inspired editorial).
// Canvas Cream surface, Ink Black ink, Signal Orange reserved for consent.
// Sofia Sans typography (MarkForMC fallback per DESIGN.md).
//
// Mobile scales the desktop typographic hierarchy down so the editorial
// rhythm survives at phone widths — keep the WEIGHT and -2% TRACKING
// from DESIGN.md, but compress the absolute sizes.

import { Platform } from 'react-native'

// ── Color tokens (verbatim from DESIGN.md §2) ─────────────────────────
export const colors = {
  // Surfaces
  canvas:     '#F3F0EE', // page canvas — never pure white
  lifted:     '#FCFBFA', // one step lighter — nested raised sections
  white:      '#FFFFFF', // nav pill, modal cards, satellite CTAs
  softBone:   '#F4F4F4', // cool-gray alt
  // Brand ink
  ink:        '#141413', // warm near-black — text + primary CTAs + footer
  charcoal:   '#262627', // softer black alternates
  // Text greys
  slate:      '#696969', // muted secondary text — eyebrow alt, disabled
  granite:    '#555555',
  graphite:   '#565656',
  dustTaupe:  '#D1CDC7', // very muted — disabled / "whisper" placeholders
  // Accents (use sparingly)
  signal:     '#CF4500', // consent / legal only
  signalSoft: '#F37338', // orbital arcs, active indicators
  clay:       '#9A3A0A', // secondary link-style buttons
  link:       '#3860BE', // inline links
  // Brand mark (logo only — never as UI fill)
  brandRed:   '#EB001B',
  brandYellow:'#F79E1B',

  // Semantic (web app uses red/orange/blue + ink for these)
  success:    '#1E7F3A',
  warning:    '#CF4500', // same as signal — consent/warning share the hue
  danger:     '#B23824',
  info:       '#3860BE',

  // Border / divider — barely-there 1px lines preferred over shadows
  border:        'rgba(20, 20, 19, 0.10)', // ink at 10%
  borderStrong:  'rgba(20, 20, 19, 0.18)', // ink at 18% — focus / outlined buttons
  borderOnInk:   'rgba(255, 255, 255, 0.30)',

  // Legacy aliases — map the previous "Nuit de Cuir" tokens onto the
  // Mastercard palette so existing screens flip without code churn.
  // Removed once all consumers are migrated to the canonical names above.
  bg:               '#F3F0EE',          // = canvas
  surface:          '#FFFFFF',           // cards on cream
  surface2:         '#FFFFFF',           // input fills
  borderTop:        'rgba(20, 20, 19, 0.10)',
  textPrimary:      '#141413',           // = ink
  textSecondary:    '#696969',           // = slate
  textMuted:        '#D1CDC7',           // = dustTaupe
  gold:             '#141413',           // CTAs become Ink Black
  goldDark:         '#262627',
  goldMuted:        '#F4F4F4',           // active chip background
  statusActive:     '#1E7F3A',
  statusRented:     '#F37338',
  statusAvailable:  '#1E7F3A',
  statusMaintenance:'#3860BE',
  statusClosed:     '#696969',
  statusCancelled:  '#B23824',
}

// ── Border-radius scale (DESIGN.md §5) ────────────────────────────────
// Mastercard skips 8–12: small (≤6) OR medium-large (20–40) OR full-pill (999).
export const radius = {
  micro:  4,    // cookie-banner chips, tiny decorative
  button: 20,   // primary + secondary body CTAs — signature
  card:   20,   // body cards inherit button radius for cohesion
  hero:   40,   // hero media frames, large section containers
  pill:   999,  // full pill — nav, chips, country selector

  // Legacy aliases — collapsed onto Mastercard's three real tiers.
  sm: 4,
  md: 20,
  lg: 20,
  xl: 20,
}

// ── Spacing (DESIGN.md §5: base 8, powers-of-8 scale) ─────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
}

// ── Typography ────────────────────────────────────────────────────────
// Sofia Sans is loaded in App.js via @expo-google-fonts/sofia-sans.
// fontFamily strings match the loaded keys.
//
// DESIGN.md uses 450 body weight — variable-only. Closest fixed weight
// is 400 with tightened tracking (per DESIGN.md §3 substitution note).
export const fonts = {
  regular: Platform.select({ ios: 'SofiaSans_400Regular', android: 'SofiaSans_400Regular' }),
  medium:  Platform.select({ ios: 'SofiaSans_500Medium',  android: 'SofiaSans_500Medium'  }),
  bold:    Platform.select({ ios: 'SofiaSans_700Bold',    android: 'SofiaSans_700Bold'    }),
}

// Scale (mobile-adapted from DESIGN.md desktop table).
// Keep weight + -2% tracking; compress size.
export const typography = {
  // 64px hero → 28px screen title on phones
  screenTitle:  { fontFamily: fonts.medium,  fontSize: 28, lineHeight: 32, letterSpacing: -0.56, color: colors.ink },
  // 36px section → 22px
  sectionTitle: { fontFamily: fonts.medium,  fontSize: 22, lineHeight: 28, letterSpacing: -0.44, color: colors.ink },
  // 24px card title → 17px
  cardTitle:    { fontFamily: fonts.medium,  fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
  // 14px eyebrow stays close — 12px works better at phone widths
  eyebrow:      { fontFamily: fonts.bold,    fontSize: 11, lineHeight: 14, letterSpacing: 0.5,  color: colors.slate, textTransform: 'uppercase' },
  // 16px body → 15px on phone, 450 weight via 400+tracking compensation
  body:         { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, letterSpacing: -0.1, color: colors.ink },
  cardSub:      { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, letterSpacing: -0.1, color: colors.slate },
  caption:      { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.slate },
  // Button label — 16px / 500 / -3% tracking (DESIGN.md)
  button:       { fontFamily: fonts.medium,  fontSize: 15, letterSpacing: -0.45 },
}

// ── Shared component styles (DESIGN.md §4) ────────────────────────────

// Card — flat on canvas, separated by Lifted Cream surface + thin border.
// Mastercard prefers border lines over shadows for functional delineation.
export const card = {
  backgroundColor: colors.lifted,
  borderRadius:    radius.card,
  borderWidth:     1,
  borderColor:     colors.border,
  padding:         spacing.md,
}

// Text input — outlined pill-square, white surface on cream.
export const input = {
  backgroundColor:   colors.white,
  borderRadius:      radius.button,
  borderWidth:       1,
  borderColor:       colors.borderStrong,
  color:             colors.ink,
  paddingHorizontal: 16,
  paddingVertical:   12,
  fontSize:          15,
  fontFamily:        fonts.regular,
  marginBottom:      12,
}

// Primary CTA — Ink Black pill, cream text, 20px radius (DESIGN.md §4).
export const btnPrimary = {
  backgroundColor:   colors.ink,
  borderRadius:      radius.button,
  borderWidth:       1.5,
  borderColor:       colors.ink,
  paddingVertical:   14,
  paddingHorizontal: 24,
  alignItems:        'center',
  marginTop:         4,
}
export const btnPrimaryText = {
  color:        colors.canvas, // canvas cream, NOT pure white
  fontFamily:   fonts.medium,
  fontSize:     15,
  letterSpacing: -0.45,
}

// Secondary CTA — Outlined pill on white.
export const btnSecondary = {
  backgroundColor:   colors.white,
  borderRadius:      radius.button,
  borderWidth:       1.5,
  borderColor:       colors.ink,
  paddingVertical:   14,
  paddingHorizontal: 24,
  alignItems:        'center',
  marginTop:         8,
}
export const btnSecondaryText = {
  color:        colors.ink,
  fontFamily:   fonts.regular,
  fontSize:     15,
  letterSpacing: -0.45,
}

// Atmospheric elevation — DESIGN.md §6 Level 2: 48px spread, 8% opacity.
// Use sparingly — most surfaces sit flat on canvas.
export const elevation = {
  navPill: { // Level 1
    shadowColor:   '#000',
    shadowOpacity: 0.04,
    shadowRadius:  24,
    shadowOffset:  { width: 0, height: 4 },
    elevation:     2,
  },
  card: {    // Level 2
    shadowColor:   '#000',
    shadowOpacity: 0.08,
    shadowRadius:  48,
    shadowOffset:  { width: 0, height: 24 },
    elevation:     4,
  },
}

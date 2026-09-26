export interface ThemeColors {
  primary: string;
  primaryDark: string;
  subheader: string;
  accent: string;
  cta: string;
  background: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  error: string;
  ink: string;
  surfaceSunken: string;
  surface: string;
  surfaceRaised: string;
  cream: string;
  muted: string;
  copper: string;
  copperBright: string;
  brass: string;
  teal: string;
  success: string;
  danger: string;
  line: string;
  overlay: string;
  header: string;
  nav: string;
  onPrimary: string;
  onPrimaryMuted: string;
  star: string;
  starMuted: string;
  copperTint: string;
  tealTint: string;
  successTint: string;
  track: string;
  footer: string;
  footerText: string;
  footerMuted: string;
  heroText: string;
  heroMuted: string;
  heroLine: string;
  heroGlass: string;
  shadow: string;
}
//
export const darkColors: ThemeColors = {
  primary: '#131A22',
  primaryDark: '#0A0E13',
  subheader: '#232F3E',
  accent: '#818CF8',
  cta: '#FF6B2C',
  background: '#0A0E13',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  border: 'rgba(226, 232, 240, 0.16)',
  error: '#DC2626',
  ink: '#0A0E13',
  surfaceSunken: '#131A22',
  surface: '#182430',
  surfaceRaised: '#20303F',
  cream: '#F8FAFC',
  muted: '#94A3B8',
  copper: '#FF6B2C',
  copperBright: '#FF9A76',
  brass: '#F8FAFC',
  teal: '#4D8CFF',
  success: '#22C55E',
  danger: '#F87171',
  line: 'rgba(226, 232, 240, 0.14)',
  overlay: 'rgba(10, 14, 19, 0.90)',
  header: '#131A22',
  nav: '#182430',
  onPrimary: '#FFFFFF',
  onPrimaryMuted: '#B0BEC9',
  star: '#FFA41C',
  starMuted: '#475569',
  copperTint: 'rgba(255, 107, 44, 0.16)',
  tealTint: 'rgba(77, 140, 255, 0.16)',
  successTint: 'rgba(34, 197, 94, 0.14)',
  track: '#334155',
  footer: '#0A0E13',
  footerText: '#F8FAFC',
  footerMuted: '#94A3B8',
  heroText: '#F8FAFC',
  heroMuted: '#CBD5E1',
  heroLine: 'rgba(226, 232, 240, 0.18)',
  heroGlass: 'rgba(24, 36, 48, 0.94)',
  shadow: '#000000',
};
//
export const lightColors: ThemeColors = {
  primary: '#131A22',
  primaryDark: '#0A0E13',
  subheader: '#232F3E',
  accent: '#4F46E5',
  cta: '#F97316',
  background: '#F1F3F6',
  textPrimary: '#0F1111',
  textSecondary: '#565959',
  border: '#DDDDDD',
  error: '#DC2626',
  ink: '#F1F3F6',
  surfaceSunken: '#F1F3F6',
  surface: '#FFFFFF',
  surfaceRaised: '#F8F8F8',
  cream: '#0F1111',
  muted: '#565959',
  copper: '#F97316',
  copperBright: '#FB923C',
  brass: '#131A22',
  teal: '#2874F0',
  success: '#067D62',
  danger: '#DC2626',
  line: '#DDDDDD',
  overlay: 'rgba(241, 243, 246, 0.92)',
  header: '#131A22',
  nav: '#FFFFFF',
  onPrimary: '#FFFFFF',
  onPrimaryMuted: '#C7D0D9',
  star: '#FFA41C',
  starMuted: '#D5DBDB',
  copperTint: 'rgba(249, 115, 22, 0.10)',
  tealTint: 'rgba(40, 116, 240, 0.08)',
  successTint: 'rgba(6, 125, 98, 0.10)',
  track: '#DDDDDD',
  footer: '#131A22',
  footerText: '#F8FAFC',
  footerMuted: '#B0BEC9',
  heroText: '#FFFFFF',
  heroMuted: '#CBD5E1',
  heroLine: 'rgba(255, 255, 255, 0.18)',
  heroGlass: 'rgba(255, 255, 255, 0.98)',
  shadow: '#0F1111',
};
//
// Backward-compatible light palette for non-themed consumers (the storefront
// is a light, dense marketplace UI by default).
export const colors = lightColors;
//
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  section: 40,
} as const;
//
export const radius = {
  xs: 3,
  sm: 6,
  md: 8,
  lg: 14,
  pill: 999,
} as const;
//
export const breakpoints = {
  phone: 480,
  tablet: 768,
  desktop: 1100,
  wide: 1440,
} as const;
//

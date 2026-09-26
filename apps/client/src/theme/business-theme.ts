import { darkColors, lightColors, type ThemeColors } from '@/shared/design-tokens';
import { useMemo } from 'react';
import { useAppTheme } from './theme-context';

// B2B owns its palette so storefront changes never alter the customer UI.
const light: ThemeColors = { ...lightColors, primary: '#172554', primaryDark: '#0F172A', ink: '#F7F9FC', background: '#F7F9FC', surfaceSunken: '#EEF2FF', surfaceRaised: '#F8FAFC', cream: '#172554', textPrimary: '#172554', muted: '#64748B', textSecondary: '#64748B', teal: '#2563EB', tealTint: '#EFF6FF', cta: '#F97316', copper: '#F97316', copperBright: '#FB923C', copperTint: '#FFF1EB', line: '#E2E8F0', border: '#E2E8F0', header: '#FFFFFF', footer: '#0F172A' };
const dark: ThemeColors = { ...darkColors, primary: '#111827', primaryDark: '#0B1220', ink: '#0B1220', background: '#0B1220', surface: '#172033', surfaceRaised: '#1E293B', surfaceSunken: '#111827', cream: '#F8FAFC', muted: '#94A3B8', teal: '#60A5FA', tealTint: '#172554', cta: '#FF6B2C', copper: '#FF8A57', copperBright: '#FDBA74', copperTint: '#431F18', line: '#334155', header: '#111827', footer: '#070B14' };

export function useBusinessColors() {
  return useAppTheme().resolvedTheme === 'dark' ? dark : light;
}

export function useBusinessStyles<T>(factory: (colors: ThemeColors) => T): T {
  const colors = useBusinessColors();
  return useMemo(() => factory(colors), [colors, factory]);
}


import { darkColors, lightColors, type ThemeColors } from '@/shared/design-tokens';
import { useMemo } from 'react';
import { useAppTheme } from './theme-context';

const light: ThemeColors = { ...lightColors, primary: '#1E1B4B', primaryDark: '#111827', ink: '#F6F8FC', background: '#F6F8FC', surfaceSunken: '#F1F5F9', surfaceRaised: '#FFFFFF', cream: '#111827', textPrimary: '#111827', muted: '#64748B', textSecondary: '#64748B', teal: '#2563EB', tealTint: '#EFF6FF', cta: '#F97316', copper: '#F97316', copperBright: '#FB923C', copperTint: '#FFF1EB', line: '#E2E8F0', border: '#E2E8F0', header: '#FFFFFF', footer: '#111827' };
const dark: ThemeColors = { ...darkColors, primary: '#111827', primaryDark: '#0B1220', ink: '#0B1220', background: '#0B1220', surface: '#172033', surfaceRaised: '#1E293B', surfaceSunken: '#111827', cream: '#F8FAFC', muted: '#94A3B8', teal: '#60A5FA', tealTint: '#172554', cta: '#FF6B2C', copper: '#FF8A57', copperBright: '#FDBA74', copperTint: '#431F18', line: '#334155', header: '#111827', footer: '#070B14' };
export function useCustomerStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { resolvedTheme } = useAppTheme();
  return useMemo(() => factory(resolvedTheme === 'dark' ? dark : light), [factory, resolvedTheme]);
}


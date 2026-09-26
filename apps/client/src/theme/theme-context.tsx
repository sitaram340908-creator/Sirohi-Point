import { darkColors, lightColors, type ThemeColors } from '@/shared/design-tokens';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform, useColorScheme } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

interface AppThemeValue {
  colors: ThemeColors;
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference(value: ThemePreference): void;
  toggleTheme(): void;
}

const STORAGE_KEY = 'sirohi-point-theme-v2';
const AppThemeContext = createContext<AppThemeValue | null>(null);

function readStoredPreference(): ThemePreference {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 'dark';
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'dark';
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>(readStoredPreference);
  const resolvedTheme: ResolvedTheme =
    preference === 'system' ? (systemTheme === 'dark' ? 'dark' : 'light') : preference;
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, preference);
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    themeColor?.setAttribute('content', colors.primaryDark);
  }, [colors.primaryDark, preference, resolvedTheme]);

  const value = useMemo<AppThemeValue>(
    () => ({
      colors,
      preference,
      resolvedTheme,
      setPreference,
      toggleTheme() {
        setPreference(resolvedTheme === 'dark' ? 'light' : 'dark');
      },
    }),
    [colors, preference, resolvedTheme],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(AppThemeContext);
  if (!value) throw new Error('useAppTheme must be used inside AppThemeProvider');
  return value;
}

export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useAppTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}


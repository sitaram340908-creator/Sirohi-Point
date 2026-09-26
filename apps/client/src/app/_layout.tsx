import '@/global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';

import { AppStateProvider } from '@/state/app-context';
import { AuthProvider } from '@/state/auth-context';
import { AppThemeProvider, useAppTheme } from '@/theme/theme-context';
import { BrandSplash } from '@/components/brand-splash';
import { CustomerLanguageGate } from '@/components/customer-language-gate';
import { LanguageProvider } from '@/state/language-context';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AppStateProvider>
              <ThemedNavigation />
              <CustomerLanguageGate />
            </AppStateProvider>
          </AuthProvider>
        </LanguageProvider>
      </AppThemeProvider>
      <BrandSplash />
    </QueryClientProvider>
  );
}

function ThemedNavigation() {
  const { colors, resolvedTheme } = useAppTheme();
  const navigationTheme = useMemo(
    () => ({
      ...(resolvedTheme === 'dark' ? DarkTheme : DefaultTheme),
      colors: {
        ...(resolvedTheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
        primary: colors.teal,
        background: colors.ink,
        card: colors.surface,
        text: colors.cream,
        border: colors.line,
        notification: colors.copper,
      },
    }),
    [colors, resolvedTheme],
  );

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          title: 'Sirohi Point | The Complete Solution',
          contentStyle: { backgroundColor: colors.ink },
        }}
      />
    </ThemeProvider>
  );
}

/**
 * Root layout — Stack navigation. Every async at launch is now bulletproof
 * against the fatal RCTExceptionsManager.reportException path that crashed
 * Builds 13/19/22.
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import { authStore } from '../lib/auth-store';
import { colors, typography } from '../lib/theme';

// Last-resort: any unhandled promise rejection at JS layer is swallowed
// here rather than propagated to RCTExceptionsManager (which fatals on
// release builds). Logged only.
const globalAny = global as unknown as {
  HermesInternal?: { enablePromiseRejectionTracker?: (opts: object) => void };
  onunhandledrejection?: (e: {
    promise: Promise<unknown>;
    reason: unknown;
  }) => void;
};
if (
  globalAny.HermesInternal?.enablePromiseRejectionTracker &&
  typeof globalAny.HermesInternal.enablePromiseRejectionTracker === 'function'
) {
  globalAny.HermesInternal.enablePromiseRejectionTracker({
    allRejections: true,
    onUnhandled: (id: number, reason: unknown) => {
      console.warn(`[unhandled rejection ${id}]`, reason);
    },
  });
}

LogBox.ignoreAllLogs(true);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    authStore
      .hydrate()
      .catch(err => {
        // Belt + braces — hydrate() is internally try/caught, but if any
        // future path slips through we don't want to fatal.
        console.warn('[auth hydrate] swallowed:', err);
      })
      .finally(() => setHydrated(true));
  }, []);

  if (!hydrated) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: { ...typography.h3 },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen name="verify" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="send"
            options={{
              headerShown: false,
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="transfer-detail"
            options={{ title: 'Transfer details' }}
          />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

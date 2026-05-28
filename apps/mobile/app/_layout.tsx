/**
 * Root layout. Error handlers are installed in entry.js BEFORE this module
 * even loads — see lib/install-error-handlers.ts for the symbolicated
 * crash chain that motivated the defense.
 *
 * This layout adds the second layer: a React ErrorBoundary that catches
 * render/lifecycle errors so they don't bubble to RN's global handler.
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import { authStore } from '../lib/auth-store';
import { colors, typography } from '../lib/theme';
import { RootErrorBoundary } from '../components/RootErrorBoundary';

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
  // Hydration runs in parallel with rendering — we never gate first render
  // on it. Returning null before the Stack is mounted causes:
  //   "Attempted to navigate before mounting the root Layout component"
  // The Stack must be in the tree from frame 1 so navigation can resolve.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await authStore.hydrate();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[auth hydrate] swallowed:', err);
      }
      if (cancelled) return;
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <RootErrorBoundary>
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
              name="receive"
              options={{
                headerShown: false,
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="cashin"
              options={{
                headerShown: false,
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="swap"
              options={{
                headerShown: false,
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="profile/personal"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="profile/security"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="profile/notifications"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="transfer-detail"
              options={{ title: 'Transfer details' }}
            />
          </Stack>
        </SafeAreaProvider>
      </QueryClientProvider>
    </RootErrorBoundary>
  );
}

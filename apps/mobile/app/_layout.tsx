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
import { StripeProvider } from '@stripe/stripe-react-native';
import { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import { authStore } from '../lib/auth-store';
import { configurePushHandler, registerPushToken } from '../lib/push';
import { colors, typography } from '../lib/theme';
import { RootErrorBoundary } from '../components/RootErrorBoundary';

// Stripe publishable key for the cash-in PaymentSheet (#88). Stripe's
// documented public test key — safe to ship in this default; the real
// key swap is a Constants/expo-config env override on app build. The
// backend's STRIPE_SECRET_KEY (on openova-private secrets) is what
// gates real charge processing — this key only initializes the SDK.
const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  'pk_test_TYooMQauvdEDq54NiTphI7jx';
const PING_APPLE_MERCHANT_ID =
  process.env.EXPO_PUBLIC_PING_APPLE_MERCHANT_ID || 'merchant.cash.ping.app';

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
    configurePushHandler();
    const run = async () => {
      try {
        await authStore.hydrate();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[auth hydrate] swallowed:', err);
      }
      if (cancelled) return;
      // After hydrate: register Expo push token if signed-in (#81). Stub-
      // safe — registerPushToken returns null on simulator + on Expo Go
      // web without crashing the layout.
      const u = authStore.user;
      if (u?.id) {
        void registerPushToken(u.id).catch(() => {});
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <RootErrorBoundary>
      <StripeProvider
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier={PING_APPLE_MERCHANT_ID}
        urlScheme="cash"
      >
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
      </StripeProvider>
    </RootErrorBoundary>
  );
}

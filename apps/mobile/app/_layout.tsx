import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { authStore } from '../lib/auth-store';

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
    authStore.hydrate().finally(() => setHydrated(true));
  }, []);

  if (!hydrated) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#1A1A2E' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '600' },
          }}
        >
          <Stack.Screen
            name="index"
            options={{ title: 'Ping', headerShown: false }}
          />
          <Stack.Screen
            name="signup"
            options={{ title: 'Get started', headerShown: false }}
          />
          <Stack.Screen
            name="verify"
            options={{ title: 'Verify phone', headerShown: false }}
          />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="send"
            options={{ title: 'Send money', presentation: 'modal' }}
          />
          <Stack.Screen
            name="transfer-detail"
            options={{ title: 'Transfer' }}
          />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

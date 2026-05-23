/**
 * Landing screen — branding + sign-in CTA.
 * After hydration, redirects to (tabs) if user is authenticated.
 */
import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authStore } from '../lib/auth-store';

export default function LandingScreen() {
  const router = useRouter();

  useEffect(() => {
    if (authStore.isAuthenticated()) {
      router.replace('/(tabs)');
    }
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brandingArea}>
        <Text style={styles.logo}>Ping</Text>
        <Text style={styles.tagline}>Send money worldwide</Text>
        <Text style={styles.subtagline}>Free between Ping users · 0.4% FX</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/signup')}
        >
          <Text style={styles.primaryButtonText}>Get started</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/signup')}
        >
          <Text style={styles.secondaryButtonText}>Sign in</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Non-custodial · Built on Solana · Powered by USDC
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E', padding: 24 },
  brandingArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: {
    fontSize: 72,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  tagline: {
    fontSize: 22,
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  subtagline: {
    fontSize: 14,
    color: '#A0A0C0',
    marginTop: 8,
    textAlign: 'center',
  },
  actions: { gap: 12, marginBottom: 32 },
  primaryButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  footer: { paddingBottom: 24, alignItems: 'center' },
  footerText: { color: '#6B6B8C', fontSize: 12 },
});

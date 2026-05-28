/**
 * Landing screen — premium first impression. STATIC layout (no
 * Reanimated entry animations) — past version crashed on real iOS
 * device launch with the new arch + reanimated 3.x combo.
 */
import { useEffect } from 'react';
import { View, Image, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../lib/auth-store';
import { colors, radii, spacing } from '../lib/theme';
import { Button } from '../components/ui/Button';
import { Heading } from '../components/ui/Heading';

export default function LandingScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();

  useEffect(() => {
    if (authStore.isAuthenticated()) {
      router.replace('/(tabs)');
    }
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* Static brand-tinted orbs */}
      <View style={[styles.orb, { top: height * 0.05 }]} />
      <View style={[styles.orbAccent, { top: height * 0.25 }]} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.brandingArea}>
          <Image
            source={require('../assets/ping-logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <Heading variant="displayHuge" align="center">
            Ping
          </Heading>
          <View style={{ marginTop: spacing.lg }}>
            <Heading variant="h2" color="secondary" align="center">
              Send money like{'\n'}a message
            </Heading>
          </View>
          <View style={styles.featurePillsRow}>
            <FeaturePill icon="flash" label="Instant" />
            <FeaturePill icon="globe-outline" label="Worldwide" />
            <FeaturePill icon="lock-closed-outline" label="Non-custodial" />
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            label="Create account"
            onPress={() => router.push('/signup')}
            iconRight="arrow-forward"
          />
          <Button
            label="I already have an account"
            variant="ghost"
            onPress={() => router.push('/signup')}
          />
          <View style={styles.footer}>
            <View style={styles.trustRow}>
              <Ionicons
                name="shield-checkmark"
                size={12}
                color={colors.textTertiary}
              />
              <Heading variant="caption" color="tertiary">
                Built on Solana · Powered by USDC
              </Heading>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function FeaturePill({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.pill}>
      <Ionicons name={icon} size={13} color={colors.brand} />
      <Heading variant="labelSmall" color="secondary" style={{ marginLeft: 6 }}>
        {label}
      </Heading>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1, paddingHorizontal: spacing.xl },
  orb: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 999,
    backgroundColor: colors.brand,
    opacity: 0.18,
    alignSelf: 'center',
  },
  orbAccent: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: colors.accentBlue,
    opacity: 0.12,
    right: -40,
  },
  brandingArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogo: {
    width: 110,
    height: 110,
    marginBottom: spacing.xl,
  },
  featurePillsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  actions: { gap: spacing.md, paddingBottom: spacing.lg },
  footer: { marginTop: spacing.lg, alignItems: 'center' },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});

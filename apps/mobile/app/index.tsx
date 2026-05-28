/**
 * Landing screen — premium first impression. Animated logo + tagline,
 * gradient brand mark, big CTA, trust micro-copy at footer.
 */
import { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../lib/auth-store';
import { colors, radii, spacing, typography } from '../lib/theme';
import { Button } from '../components/ui/Button';
import { Heading } from '../components/ui/Heading';

export default function LandingScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const taglineOpacity = useSharedValue(0);
  const taglineY = useSharedValue(20);
  const ctaOpacity = useSharedValue(0);
  const ctaY = useSharedValue(40);
  const orbOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 700 });
    logoScale.value = withSpring(1, { damping: 14, stiffness: 180 });
    orbOpacity.value = withDelay(150, withTiming(1, { duration: 1100 }));
    taglineOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
    taglineY.value = withDelay(
      300,
      withSpring(0, { damping: 18, stiffness: 180 })
    );
    ctaOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    ctaY.value = withDelay(600, withSpring(0, { damping: 18, stiffness: 180 }));
    if (authStore.isAuthenticated()) {
      router.replace('/(tabs)');
    }
  }, []);

  const logoAnim = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const taglineAnim = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineY.value }],
  }));
  const ctaAnim = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaY.value }],
  }));
  const orbAnim = useAnimatedStyle(() => ({
    opacity: orbOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* Soft brand-tinted orb glow at top */}
      <Animated.View style={[styles.orb, { top: height * 0.05 }, orbAnim]} />
      <Animated.View
        style={[styles.orbAccent, { top: height * 0.25 }, orbAnim]}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.brandingArea}>
          <Animated.View style={[styles.logoMark, logoAnim]}>
            <Ionicons name="paper-plane" size={56} color={colors.brand} />
          </Animated.View>
          <Animated.View style={logoAnim}>
            <Heading variant="displayHuge" align="center">
              Ping
            </Heading>
          </Animated.View>
          <Animated.View style={[{ marginTop: spacing.lg }, taglineAnim]}>
            <Heading variant="h2" color="secondary" align="center">
              Send money like{'\n'}a message
            </Heading>
          </Animated.View>
          <Animated.View style={[styles.featurePillsRow, taglineAnim]}>
            <FeaturePill icon="flash" label="Instant" />
            <FeaturePill icon="globe-outline" label="Worldwide" />
            <FeaturePill icon="lock-closed-outline" label="Non-custodial" />
          </Animated.View>
        </View>

        <Animated.View style={[styles.actions, ctaAnim]}>
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
        </Animated.View>
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
    transform: [{ scale: 1 }],
    // simulated blur via transparency layers
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
  logoMark: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.brandMuted,
    borderWidth: 1,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
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

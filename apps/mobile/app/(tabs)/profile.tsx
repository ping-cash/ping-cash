/**
 * Profile / settings — gradient avatar, wallet address display, grouped sections.
 */
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { authStore } from '../../lib/auth-store';
import { colors, radii, spacing, typography, shadows } from '../../lib/theme';
import { Heading } from '../../components/ui/Heading';

export default function ProfileScreen() {
  const router = useRouter();
  const user = authStore.user;

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Sign out?',
      'You will need to re-verify your phone to sign back in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await authStore.clear();
            router.replace('/');
          },
        },
      ]
    );
  };

  const initial = user?.phone?.slice(-2, -1) ?? 'P';
  const wallet = user?.walletAddress ?? '';

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Profile hero */}
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Heading variant="displaySmall" align="center" color="brand">
                {initial}
              </Heading>
            </View>
            <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
              <Heading variant="h1">
                {user?.name ?? 'Ping member'}
              </Heading>
              <Heading variant="bodyLarge" color="secondary" style={{ marginTop: 4 }}>
                {user?.phone ?? ''}
              </Heading>
            </View>

            {wallet ? (
              <Pressable style={styles.walletPill}>
                <Ionicons name="wallet-outline" size={14} color={colors.brand} />
                <Heading
                  variant="bodySmall"
                  color="secondary"
                  style={{ marginLeft: spacing.sm, flex: 1 }}
                  numberOfLines={1}
                >
                  {wallet.slice(0, 6)}…{wallet.slice(-6)}
                </Heading>
                <Ionicons
                  name="copy-outline"
                  size={14}
                  color={colors.textTertiary}
                />
              </Pressable>
            ) : null}
          </View>

          {/* KYC tier card */}
          <View style={styles.kycCard}>
            <View style={styles.kycRow}>
              <View
                style={[styles.kycIcon, { backgroundColor: colors.warningMuted }]}
              >
                <Ionicons name="shield-outline" size={20} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Heading variant="bodyLargeStrong">Verify your identity</Heading>
                <Heading variant="bodySmall" color="secondary">
                  Unlock cash-out and higher limits
                </Heading>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </View>
          </View>

          {/* Account section */}
          <SectionLabel>Account</SectionLabel>
          <View style={styles.section}>
            <Row icon="person-outline" label="Personal details" />
            <Row icon="key-outline" label="Security" />
            <Row icon="notifications-outline" label="Notifications" />
          </View>

          <SectionLabel>Preferences</SectionLabel>
          <View style={styles.section}>
            <Row icon="globe-outline" label="Language" valueText="English" />
            <Row icon="contrast-outline" label="Appearance" valueText="Dark" />
            <Row icon="card-outline" label="Default currency" valueText="USD" />
          </View>

          <SectionLabel>Help</SectionLabel>
          <View style={styles.section}>
            <Row icon="help-circle-outline" label="Help center" />
            <Row icon="mail-outline" label="Contact support" />
            <Row icon="information-circle-outline" label="About Ping" />
          </View>

          {/* Sign out */}
          <Pressable onPress={handleLogout} style={styles.signOut}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Heading
              variant="bodyLargeStrong"
              color="error"
              style={{ marginLeft: spacing.sm }}
            >
              Sign out
            </Heading>
          </Pressable>

          <Heading
            variant="caption"
            color="tertiary"
            align="center"
            style={{ marginTop: spacing.xl }}
          >
            Ping v0.1.0 · built on Solana
          </Heading>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Heading
      variant="labelSmall"
      color="tertiary"
      style={{ marginTop: spacing.xl, marginBottom: spacing.sm, paddingHorizontal: spacing.xs }}
    >
      {children}
    </Heading>
  );
}

function Row({
  icon,
  label,
  valueText,
}: {
  icon: keyof typeof import('@expo/vector-icons/build/Ionicons').default.glyphMap;
  label: string;
  valueText?: string;
}) {
  return (
    <Pressable
      style={styles.rowItem}
      onPress={() => Haptics.selectionAsync()}
    >
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Heading variant="bodyLarge" style={{ flex: 1, marginLeft: spacing.md }}>
        {label}
      </Heading>
      {valueText ? (
        <Heading variant="body" color="tertiary" style={{ marginRight: 6 }}>
          {valueText}
        </Heading>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  hero: { alignItems: 'center', paddingVertical: spacing.xl },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: colors.brandMuted,
    borderWidth: 2,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.brand,
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.lg,
    minWidth: 240,
  },
  kycCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  kycRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  kycIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderSubtle,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorMuted,
    borderRadius: radii.full,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
});

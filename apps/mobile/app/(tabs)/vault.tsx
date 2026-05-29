/**
 * Earn / Vault screen — APY hero, key stats, and configuration row.
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api, type VaultPosition } from '../../lib/api';
import { colors, radii, spacing, shadows } from '../../lib/theme';
import { Heading } from '../../components/ui/Heading';
import { PingTokenMark } from '../../components/ui/PingTokenMark';

export default function VaultScreen() {
  const [autoStake, setAutoStake] = useState(true);
  const [vault, setVault] = useState<VaultPosition | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await api.getVaultPosition();
        if (!cancelled) setVault(v);
      } catch {
        // Stub-safe: vault endpoint may 404 on a fresh signup; UI falls
        // back to zero values rather than blocking the tab.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const apy = vault?.apyDisplay ?? '5.0';
  const staked = vault?.vUsdcBalance ?? '0';
  const earned = vault?.earnedPingLifetime ?? '0';

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* APY hero */}
          <View style={styles.apyCard}>
            <View style={styles.apyHeader}>
              <View style={styles.iconBox}>
                <Ionicons name="flash" size={20} color={colors.brand} />
              </View>
              <Heading variant="labelSmall" color="tertiary">
                EARN RATE · APY
              </Heading>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                marginTop: spacing.lg,
              }}
            >
              <Heading variant="displayLarge">{apy}</Heading>
              <Heading
                variant="h1"
                color="secondary"
                style={{ marginBottom: 8 }}
              >
                %
              </Heading>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: spacing.sm,
                gap: 6,
              }}
            >
              <Heading variant="body" color="secondary">
                Paid in
              </Heading>
              <PingTokenMark size={16} />
              <Heading variant="body" color="secondary">
                · Daily harvest · No lockup
              </Heading>
            </View>
          </View>

          {/* Stats grid */}
          <View style={styles.statsRow}>
            <Stat label="Your stake" value={`$${staked}`} />
            <Stat label="Earned (30d)" value={`$0.00`} tint={colors.brand} />
            <Stat label="Total" value={earned} trailingMark="ping" />
          </View>

          {/* Auto-stake setting */}
          <View style={styles.settingCard}>
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: autoStake
                    ? colors.brandMuted
                    : colors.surfaceElevated,
                },
              ]}
            >
              <Ionicons
                name="infinite"
                size={20}
                color={autoStake ? colors.brand : colors.textTertiary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Heading variant="bodyLargeStrong">Auto-stake</Heading>
              <Heading variant="bodySmall" color="secondary">
                Stake new deposits automatically
              </Heading>
            </View>
            <Switch
              value={autoStake}
              onValueChange={v => {
                Haptics.selectionAsync();
                setAutoStake(v);
              }}
              trackColor={{ false: colors.surfaceElevated, true: colors.brand }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Explainer */}
          <View style={styles.explainCard}>
            <Ionicons
              name="information-circle"
              size={20}
              color={colors.accentBlue}
            />
            <Heading
              variant="bodySmall"
              color="secondary"
              style={{ flex: 1, marginLeft: spacing.sm }}
            >
              Yield comes from real on-chain protocols. Non-custodial: you
              control the keys via your MPC wallet. Per ADR 0012 the split is
              40% Ping / 60% you, paid in the Ping token.
            </Heading>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Stat({
  label,
  value,
  tint,
  trailingMark,
}: {
  label: string;
  value: string;
  tint?: string;
  /** Optional small mark rendered next to the value — 'ping' shows the
   *  $PING token glyph. Used for stats counting native-token balance. */
  trailingMark?: 'ping';
}) {
  return (
    <View style={styles.statCard}>
      <Heading variant="labelSmall" color="tertiary">
        {label}
      </Heading>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 4,
          gap: 6,
        }}
      >
        <Heading variant="h2" style={{ color: tint ?? colors.textPrimary }}>
          {value}
        </Heading>
        {trailingMark === 'ping' ? <PingTokenMark size={16} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  apyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.brand,
    ...shadows.brand,
    marginTop: spacing.lg,
  },
  apyHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.brandMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  explainCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
});

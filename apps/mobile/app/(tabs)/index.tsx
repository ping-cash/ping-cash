/**
 * Home / Dashboard — premium monetary display.
 * Hero card with gradient brand strip, quick actions in pill rail,
 * Activity preview as elegant rows.
 */
import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api, type Transfer } from '../../lib/api';
import { authStore } from '../../lib/auth-store';
import { colors, radii, spacing, typography, shadows } from '../../lib/theme';
import { Heading } from '../../components/ui/Heading';

export default function HomeScreen() {
  const router = useRouter();
  const [balanceUsd, setBalanceUsd] = useState<string>('0.00');
  const [usdc, setUsdc] = useState<string>('0');
  const [pingBalance, setPingBalance] = useState<string>('0');
  const [tier] = useState<string>('bronze');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recent, setRecent] = useState<Transfer[]>([]);
  const user = authStore.user;

  const load = async () => {
    try {
      const [balance, history] = await Promise.all([
        api.getBalance().catch(() => null),
        api
          .listTransfers({ limit: 3 })
          .catch(() => ({ transfers: [] as Transfer[], total: 0 })),
      ]);
      if (balance) {
        const usd = formatDecimal(balance.totalUsdValue ?? '0', 2);
        setBalanceUsd(usd);
        setUsdc(formatDecimal(balance.USDC ?? '0', 2));
        setPingBalance(balance.PING ?? '0');
      }
      setRecent(history?.transfers ?? []);
    } finally {
      setLoading(false);
    }
  };

  function formatDecimal(s: string, places: number): string {
    if (!s) return '0.' + '0'.repeat(places);
    const [w, f = ''] = s.split('.');
    return `${w || '0'}.${(f + '0'.repeat(places)).slice(0, places)}`;
  }

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await load();
    setRefreshing(false);
  };

  const firstName = user?.phone?.slice(-4) ?? 'there';
  const [dollars, cents] = balanceUsd.split('.');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Heading variant="caption" color="tertiary">
                {greeting()}
              </Heading>
              <Heading variant="h2" style={{ marginTop: 2 }} numberOfLines={1}>
                ····{firstName}
              </Heading>
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.avatar}
              hitSlop={8}
            >
              <Ionicons name="person" size={20} color={colors.brand} />
            </Pressable>
          </View>

          {/* Balance hero */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceTopRow}>
              <Heading variant="labelSmall" color="tertiary">
                Available balance
              </Heading>
              <View style={styles.tierChip}>
                <Ionicons
                  name="ribbon-outline"
                  size={11}
                  color={colors.brand}
                />
                <Heading
                  variant="labelSmall"
                  color="brand"
                  style={{ marginLeft: 4 }}
                >
                  {tier.toUpperCase()}
                </Heading>
              </View>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                marginTop: spacing.md,
              }}
            >
              <Heading
                variant="bodyLargeStrong"
                color="secondary"
                style={{ marginBottom: 12 }}
              >
                $
              </Heading>
              <Heading variant="displayHuge">{loading ? '—' : dollars}</Heading>
              <Heading
                variant="h2"
                color="tertiary"
                style={{ marginBottom: 12 }}
              >
                .{cents ?? '00'}
              </Heading>
            </View>
            <View style={styles.subBalanceRow}>
              <View style={styles.subBalanceChip}>
                <View
                  style={[styles.assetDot, { backgroundColor: '#2775CA' }]}
                />
                <Heading variant="bodySmall" color="secondary">
                  {usdc} USDC
                </Heading>
              </View>
              <View style={styles.subBalanceChip}>
                <View style={styles.pingDot} />
                <Heading variant="bodySmall" color="secondary">
                  {pingBalance} $PING
                </Heading>
              </View>
            </View>
          </View>

          {/* Quick actions — distinct, semantic icons (not all circles) */}
          <View style={styles.actionsRow}>
            <ActionTile
              icon="paper-plane"
              label="Send"
              onPress={() => router.push('/send')}
              accent={colors.brand}
            />
            <ActionTile
              icon="qr-code"
              label="Receive"
              onPress={() => router.push('/receive' as never)}
              accent={colors.accentBlue}
            />
            <ActionTile
              icon="wallet"
              label="Add money"
              onPress={() => router.push('/cashin' as never)}
              accent={colors.accentPurple}
            />
            <ActionTile
              icon="repeat"
              label="Swap"
              onPress={() => router.push('/swap' as never)}
              accent={colors.accentPink}
            />
          </View>

          {/* Promo banner */}
          <Pressable
            onPress={() => router.push('/send')}
            style={styles.promoCard}
          >
            <View style={styles.promoIconBox}>
              <Ionicons name="gift" size={20} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Heading variant="bodyLargeStrong">Earn 1,200 $PING</Heading>
              <Heading
                variant="bodySmall"
                color="secondary"
                style={{ marginTop: 2 }}
              >
                Send your first $10 transfer
              </Heading>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textTertiary}
            />
          </Pressable>

          {/* Activity */}
          <View style={styles.sectionHeader}>
            <Heading variant="h3">Recent activity</Heading>
            <Pressable
              onPress={() => router.push('/(tabs)/history')}
              hitSlop={8}
            >
              <Heading variant="bodyStrong" color="brand">
                See all
              </Heading>
            </Pressable>
          </View>

          {recent.length === 0 ? (
            <View style={styles.emptyActivity}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="paper-plane-outline"
                  size={28}
                  color={colors.brand}
                />
              </View>
              <Heading variant="h3" align="center">
                No transfers yet
              </Heading>
              <Heading
                variant="body"
                color="secondary"
                align="center"
                style={{ marginTop: spacing.xs, paddingHorizontal: spacing.xl }}
              >
                Tap Send to make your first transfer — it takes 12 seconds.
              </Heading>
            </View>
          ) : (
            <View style={styles.activityCard}>
              {recent.map((t, i) => (
                <View key={t.id}>
                  {i > 0 && <View style={styles.activityDivider} />}
                  <Pressable
                    style={styles.activityRow}
                    onPress={() =>
                      router.push(`/transfer-detail?id=${t.id}` as never)
                    }
                  >
                    <View
                      style={[
                        styles.activityIcon,
                        {
                          backgroundColor:
                            t.status === 'failed'
                              ? colors.errorMuted
                              : colors.brandMuted,
                        },
                      ]}
                    >
                      <Ionicons
                        name="arrow-up"
                        size={18}
                        color={
                          t.status === 'failed' ? colors.error : colors.brand
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Heading variant="bodyLargeStrong" numberOfLines={1}>
                        To {t.recipientPhone}
                      </Heading>
                      <Heading variant="bodySmall" color="tertiary">
                        {t.status}
                      </Heading>
                    </View>
                    <Heading variant="bodyLargeStrong">-${t.amount}</Heading>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ActionTile({
  icon,
  label,
  onPress,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent: string;
}) {
  return (
    <View style={styles.actionTileWrap}>
      <Pressable
        onPress={() => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {}
          onPress();
        }}
        style={({ pressed }) => [
          styles.actionTile,
          pressed && { opacity: 0.7 },
        ]}
      >
        <View
          style={[
            styles.actionIconBox,
            { backgroundColor: `${accent}22`, borderColor: `${accent}55` },
          ]}
        >
          <Ionicons name={icon} size={22} color={accent} />
        </View>
        <Heading
          variant="caption"
          align="center"
          style={{ marginTop: spacing.sm, fontWeight: '600' }}
        >
          {label}
        </Heading>
      </Pressable>
    </View>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.md,
  },
  balanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  subBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  subBalanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.brand,
    marginRight: 8,
  },
  assetDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    marginRight: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionTileWrap: { flex: 1 },
  actionTile: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandMuted,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  promoIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  emptyActivity: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    backgroundColor: colors.brandMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  activityCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityDivider: {
    height: 0.5,
    backgroundColor: colors.borderSubtle,
    marginLeft: spacing.lg + 36 + spacing.md,
  },
});

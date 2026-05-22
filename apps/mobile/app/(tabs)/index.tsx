/**
 * Home / Balance screen.
 *
 * Shows: balance, tier badge, quick actions (send/receive/cash-in/cash-out)
 */
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { authStore } from '../../lib/auth-store';

export default function HomeScreen() {
  const router = useRouter();
  const [balanceUsd, setBalanceUsd] = useState<string>('—');
  const [pingBalance, setPingBalance] = useState<string>('—');
  const [tier, setTier] = useState<string>('bronze');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const balance = await api.getBalance();
        // Server returns { USDC, vUSDC, PING, totalUsdValue, ... }
        const b = balance as unknown as {
          totalUsdValue?: string;
          balance?: string;
          PING?: string;
        };
        setBalanceUsd(b.totalUsdValue ?? b.balance ?? '0');
        setPingBalance(b.PING ?? '0');
      } catch {
        setBalanceUsd('0.00');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const tierColor = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
  }[tier as 'bronze' | 'silver' | 'gold' | 'platinum'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your balance</Text>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.balanceAmount}>${balanceUsd}</Text>
              <Text style={styles.balancePing}>{pingBalance} $PING</Text>
            </>
          )}
          <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
            <Text style={styles.tierBadgeText}>{tier.toUpperCase()}</Text>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionTile} onPress={() => router.push('/send')}>
            <Text style={styles.actionIcon}>↗</Text>
            <Text style={styles.actionLabel}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionTile} onPress={() => router.push('/(tabs)/history')}>
            <Text style={styles.actionIcon}>↙</Text>
            <Text style={styles.actionLabel}>Receive</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionTile} onPress={() => router.push('/(tabs)/vault')}>
            <Text style={styles.actionIcon}>🏦</Text>
            <Text style={styles.actionLabel}>Earn</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionTile} onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.actionIcon}>⚙</Text>
            <Text style={styles.actionLabel}>More</Text>
          </TouchableOpacity>
        </View>

        {/* Welcome stake banner (if applicable) */}
        <TouchableOpacity style={styles.welcomeBanner}>
          <Text style={styles.welcomeBannerTitle}>🎁 Earn 1,200 $PING</Text>
          <Text style={styles.welcomeBannerBody}>
            Send your first $10+ transfer to unlock your welcome stake.
          </Text>
        </TouchableOpacity>

        {/* Activity preview */}
        <Text style={styles.sectionLabel}>Recent activity</Text>
        <View style={styles.emptyActivity}>
          <Text style={styles.emptyActivityText}>No transfers yet</Text>
          <Text style={styles.emptyActivitySub}>Tap Send to make your first transfer</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  scroll: { padding: 16 },
  balanceCard: {
    backgroundColor: '#2A2A4A',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  balanceLabel: { color: '#A0A0C0', fontSize: 14, marginBottom: 8 },
  balanceAmount: { color: '#FFFFFF', fontSize: 48, fontWeight: '800' },
  balancePing: { color: '#10B981', fontSize: 16, marginTop: 4 },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 16,
  },
  tierBadgeText: { color: '#1A1A2E', fontWeight: '700', fontSize: 12 },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  actionTile: {
    flexBasis: '47%',
    backgroundColor: '#2A2A4A',
    paddingVertical: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionIcon: { fontSize: 28, marginBottom: 4 },
  actionLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  welcomeBanner: {
    backgroundColor: '#10B98115',
    borderColor: '#10B981',
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  welcomeBannerTitle: { color: '#10B981', fontSize: 16, fontWeight: '700' },
  welcomeBannerBody: { color: '#A0A0C0', fontSize: 13, marginTop: 4 },
  sectionLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  emptyActivity: {
    backgroundColor: '#2A2A4A',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyActivityText: { color: '#A0A0C0', fontSize: 14 },
  emptyActivitySub: { color: '#6B6B8C', fontSize: 12, marginTop: 4 },
});

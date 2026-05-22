/**
 * Earn Vault screen — shows yield earned + auto-stake controls.
 *
 * Per ADR 0012 (Earn Vault): non-custodial, auto-stake by default,
 * 40/60 split (40% Ping / 60% user paid in $PING).
 */
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VaultScreen() {
  const [autoStake, setAutoStake] = useState(true);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Earn rate</Text>
          <Text style={styles.cardValue}>5.0% APY</Text>
          <Text style={styles.cardSub}>Paid in $PING · Daily harvest</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statTile}>
            <Text style={styles.statLabel}>Earned (lifetime)</Text>
            <Text style={styles.statValue}>0 $PING</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statLabel}>Earned (last 30d)</Text>
            <Text style={styles.statValue}>0 $PING</Text>
          </View>
        </View>

        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextArea}>
              <Text style={styles.settingTitle}>Auto-stake</Text>
              <Text style={styles.settingSub}>
                Incoming USDC is automatically staked. Spending is instant via atomic unstake.
              </Text>
            </View>
            <Switch
              value={autoStake}
              onValueChange={setAutoStake}
              trackColor={{ true: '#10B981', false: '#6B6B8C' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How Earn works</Text>
          <Text style={styles.infoBullet}>
            • Your USDC is deployed across Kamino, Marginfi, Aave, and Drift
          </Text>
          <Text style={styles.infoBullet}>
            • You stay non-custodial — delegated authority can be revoked anytime
          </Text>
          <Text style={styles.infoBullet}>
            • Yield is auto-converted to $PING at the daily harvest (40% Ping / 60% you)
          </Text>
          <Text style={styles.infoBullet}>
            • Spending unstakes atomically in ~1 second — no waiting period
          </Text>
        </View>

        <TouchableOpacity style={styles.viewDashboardLink}>
          <Text style={styles.viewDashboardText}>
            View public vault dashboard → vault.ping.cash
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  scroll: { padding: 16 },
  card: {
    backgroundColor: '#2A2A4A',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  cardLabel: { color: '#A0A0C0', fontSize: 14 },
  cardValue: { color: '#10B981', fontSize: 48, fontWeight: '800', marginVertical: 4 },
  cardSub: { color: '#A0A0C0', fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  statTile: {
    flex: 1,
    backgroundColor: '#2A2A4A',
    padding: 16,
    borderRadius: 12,
  },
  statLabel: { color: '#A0A0C0', fontSize: 12 },
  statValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginTop: 4 },
  settingsCard: {
    backgroundColor: '#2A2A4A',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  settingRow: { flexDirection: 'row', alignItems: 'center' },
  settingTextArea: { flex: 1 },
  settingTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  settingSub: { color: '#A0A0C0', fontSize: 13, marginTop: 4 },
  infoCard: {
    backgroundColor: '#2A2A4A',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  infoTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  infoBullet: { color: '#A0A0C0', fontSize: 13, lineHeight: 20 },
  viewDashboardLink: { alignItems: 'center', marginTop: 24, padding: 16 },
  viewDashboardText: { color: '#10B981', fontSize: 13 },
});

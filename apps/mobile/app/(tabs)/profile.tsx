/**
 * Profile / settings screen.
 */
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authStore } from '../../lib/auth-store';

export default function ProfileScreen() {
  const router = useRouter();
  const user = authStore.user;

  const handleLogout = () => {
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
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.[0] ?? user?.phone?.[1] ?? '?'}
            </Text>
          </View>
          <Text style={styles.name}>{user?.name ?? 'Ping user'}</Text>
          <Text style={styles.phone}>{user?.phone ?? ''}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identity verification</Text>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>KYC tier</Text>
            <Text style={styles.rowValue}>Tier {user?.kycTier ?? 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>Upgrade to Tier 2</Text>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet</Text>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>Solana address</Text>
            <Text style={styles.rowValue}>
              {user?.walletAddress
                ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
                : '—'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>Recovery (Privy MPC)</Text>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tokenomics</Text>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>Welcome stake</Text>
            <Text style={styles.rowValue}>Not yet earned</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>$PING (Ping Points)</Text>
            <Text style={styles.rowValue}>0</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>Help center</Text>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>Contact us</Text>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>Privacy policy</Text>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>Terms of service</Text>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Ping v0.1.0 · ping.cash</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  scroll: { padding: 16 },
  profileHeader: { alignItems: 'center', padding: 24 },
  avatar: {
    width: 80,
    height: 80,
    backgroundColor: '#10B981',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 32, fontWeight: '700' },
  name: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginTop: 12 },
  phone: { color: '#A0A0C0', fontSize: 14, marginTop: 4 },
  section: { marginTop: 24 },
  sectionTitle: { color: '#A0A0C0', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2A2A4A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  rowLabel: { color: '#FFFFFF', fontSize: 15 },
  rowValue: { color: '#A0A0C0', fontSize: 14 },
  rowChevron: { color: '#6B6B8C', fontSize: 24 },
  signOutButton: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#2A2A4A',
    alignItems: 'center',
  },
  signOutText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
  versionText: { color: '#6B6B8C', fontSize: 12, textAlign: 'center', marginTop: 24 },
});

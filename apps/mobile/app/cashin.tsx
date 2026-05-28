/**
 * Cash-in / Add Money — shows the channels we will support and disabled
 * states for those not yet wired. Apple Pay + Stripe + MoonPay land in
 * sequential commits; for now this is a real screen, not a misroute.
 */
import { View, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../lib/theme';
import { Heading } from '../components/ui/Heading';

type Method = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  fee: string;
  available: boolean;
};

const METHODS: Method[] = [
  {
    icon: 'logo-apple',
    iconColor: '#FFFFFF',
    title: 'Apple Pay',
    subtitle: 'Add money instantly with the card already in your Wallet',
    fee: '2.9% + $0.30',
    available: false,
  },
  {
    icon: 'card',
    iconColor: '#635BFF',
    title: 'Debit / credit card',
    subtitle: 'Via Stripe — Visa, Mastercard, Amex',
    fee: '2.9% + $0.30',
    available: false,
  },
  {
    icon: 'logo-bitcoin',
    iconColor: '#F7931A',
    title: 'Crypto on-ramp',
    subtitle: 'USDC, BTC, ETH via MoonPay',
    fee: '~1.5%',
    available: false,
  },
  {
    icon: 'business',
    iconColor: '#10B981',
    title: 'Bank transfer (ACH)',
    subtitle: 'US bank — 1-3 business days, lowest fees',
    fee: 'Free',
    available: false,
  },
];

export default function CashinScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.textPrimary}
            />
          </Pressable>
          <Heading variant="h3">Add money</Heading>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Heading
            variant="bodyLarge"
            color="secondary"
            style={{ marginBottom: spacing.xl }}
          >
            How would you like to fund your wallet?
          </Heading>

          {METHODS.map(m => (
            <Pressable
              key={m.title}
              onPress={() =>
                Alert.alert(
                  `${m.title} — coming soon`,
                  `${m.title} is being wired in. Wave-2 release.`
                )
              }
              style={[styles.row, !m.available && styles.rowDisabled]}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: `${m.iconColor}22` },
                ]}
              >
                <Ionicons name={m.icon} size={26} color={m.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Heading variant="bodyLargeStrong">{m.title}</Heading>
                <Heading variant="bodySmall" color="secondary">
                  {m.subtitle}
                </Heading>
                <View style={styles.feeRow}>
                  <Heading variant="labelSmall" color="tertiary">
                    FEE · {m.fee}
                  </Heading>
                  {!m.available && (
                    <View style={styles.soonChip}>
                      <Heading variant="labelSmall" color="brand">
                        Coming soon
                      </Heading>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>
          ))}

          <View style={styles.testnetBanner}>
            <Ionicons name="flask" size={18} color={colors.accentAmber} />
            <Heading
              variant="bodySmall"
              color="secondary"
              style={{ flex: 1, marginLeft: spacing.sm }}
            >
              Devnet build — real money on-ramps activate after legal-entity
              KYB. For testing now, ask any Ping user to send you devnet USDC.
            </Heading>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1, paddingHorizontal: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingBottom: spacing.xxxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rowDisabled: { opacity: 0.75 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  soonChip: {
    backgroundColor: colors.brandMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  testnetBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warningMuted,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
});

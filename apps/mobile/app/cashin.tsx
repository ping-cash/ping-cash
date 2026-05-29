/**
 * Cash-in / Add Money — currently devnet-mode. Real fiat on-ramps
 * (Apple Pay, Stripe, MoonPay, ACH) are placeholders until production
 * vendor signups complete. For now, surfacing a working path:
 * show the user's wallet address + open Solana + Circle devnet
 * faucets so they can fund their own wallet for testing.
 */
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Linking,
  Clipboard,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStripe } from '@stripe/stripe-react-native';
import { api } from '../lib/api';
import { authStore } from '../lib/auth-store';
import { colors, radii, spacing } from '../lib/theme';
import { Button } from '../components/ui/Button';
import { Heading } from '../components/ui/Heading';

type Method = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  fee: string;
  available: boolean;
};

type StripeMethod = 'apple_pay' | 'card' | 'ach';

const PROD_METHODS: (Method & { stripeMethod?: StripeMethod })[] = [
  {
    icon: 'logo-apple',
    iconColor: '#FFFFFF',
    title: 'Apple Pay',
    subtitle: 'Card from your Wallet — fastest',
    fee: '2.9% + $0.30',
    available: true,
    stripeMethod: 'apple_pay',
  },
  {
    icon: 'card',
    iconColor: '#635BFF',
    title: 'Debit / credit card',
    subtitle: 'Visa, Mastercard, Amex via Stripe',
    fee: '2.9% + $0.30',
    available: true,
    stripeMethod: 'card',
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
    subtitle: '1-3 business days, lowest fees',
    fee: 'Free',
    available: true,
    stripeMethod: 'ach',
  },
];

export default function CashinScreen() {
  const router = useRouter();
  const user = authStore.user;
  const wallet = user?.walletAddress ?? '';
  const stripe = useStripe();
  const [loadingMethod, setLoadingMethod] = useState<StripeMethod | null>(null);

  const copyAddress = async () => {
    if (!wallet) return;
    Clipboard.setString(wallet);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Wallet address copied to clipboard.');
  };

  const handleStripeMethod = async (method: StripeMethod) => {
    try {
      setLoadingMethod(method);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Default top-up: $25. A future iteration can let the user choose
      // the amount before tapping the method (Send-screen style sheet).
      const intent = await api.buildCashinIntent('25.00', method);
      const initRes = await stripe.initPaymentSheet({
        merchantDisplayName: 'Ping',
        paymentIntentClientSecret: intent.clientSecret,
        customerId: intent.customerId,
        customerEphemeralKeySecret: intent.ephemeralKey,
        applePay:
          method === 'apple_pay' ? { merchantCountryCode: 'US' } : undefined,
        allowsDelayedPaymentMethods: method === 'ach',
        returnURL: 'cash://stripe-redirect',
      });
      if (initRes.error) {
        Alert.alert('Cash-in setup failed', initRes.error.message);
        return;
      }
      const presentRes = await stripe.presentPaymentSheet();
      if (presentRes.error) {
        if (presentRes.error.code !== 'Canceled') {
          Alert.alert('Cash-in failed', presentRes.error.message);
        }
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Top-up confirmed',
        intent.isLive
          ? 'Your $25 is on the way to your Ping wallet as USDC.'
          : 'Demo mode — production funding ships after Stripe sign-up.'
      );
    } catch (err) {
      Alert.alert('Cash-in error', (err as Error).message);
    } finally {
      setLoadingMethod(null);
    }
  };

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
          <View style={styles.testCard}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: spacing.md,
              }}
            >
              <Ionicons name="flask" size={20} color={colors.accentAmber} />
              <Heading
                variant="bodyLargeStrong"
                color="primary"
                style={{ marginLeft: spacing.sm }}
              >
                Get devnet test funds
              </Heading>
            </View>
            <Heading variant="bodySmall" color="secondary">
              You're on the devnet build — production fiat rails activate after
              legal-entity KYB. For testing, fund your wallet free in 3 steps:
            </Heading>

            <View style={styles.steps}>
              <Step n={1} text="Copy your wallet address (below)" />
              <Step
                n={2}
                text="Get 1 devnet SOL from faucet.solana.com — needed for tx fees"
              />
              <Step
                n={3}
                text="Get ~10 devnet USDC from faucet.circle.com — paste your address"
              />
            </View>

            <View style={styles.walletBox}>
              <View style={{ flex: 1 }}>
                <Heading variant="labelSmall" color="tertiary">
                  YOUR PING WALLET
                </Heading>
                <Heading
                  variant="bodySmall"
                  color="primary"
                  style={styles.walletAddr}
                  numberOfLines={1}
                >
                  {wallet || 'no wallet — sign in again'}
                </Heading>
              </View>
              <Pressable
                onPress={copyAddress}
                style={styles.copyButton}
                hitSlop={8}
              >
                <Ionicons name="copy-outline" size={18} color={colors.brand} />
              </Pressable>
            </View>

            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Button
                label="Open Solana faucet"
                variant="secondary"
                icon="open-outline"
                onPress={() => Linking.openURL('https://faucet.solana.com/')}
              />
              <Button
                label="Open Circle USDC faucet"
                variant="secondary"
                icon="open-outline"
                onPress={() => Linking.openURL('https://faucet.circle.com/')}
              />
            </View>
          </View>

          <Heading
            variant="labelSmall"
            color="tertiary"
            style={styles.sectionLabel}
          >
            PRODUCTION FUNDING (COMING SOON)
          </Heading>

          {PROD_METHODS.map(m => (
            <Pressable
              key={m.title}
              onPress={() => {
                if (m.stripeMethod) {
                  void handleStripeMethod(m.stripeMethod);
                } else {
                  Alert.alert(
                    `${m.title} — coming soon`,
                    `${m.title} ships after vendor KYB + production tier upgrade.`
                  );
                }
              }}
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
                  {loadingMethod && loadingMethod === m.stripeMethod && (
                    <View style={styles.soonChip}>
                      <Heading variant="labelSmall" color="brand">
                        Opening…
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
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Heading variant="labelSmall" color="brand">
          {n}
        </Heading>
      </View>
      <Heading variant="bodySmall" color="secondary" style={{ flex: 1 }}>
        {text}
      </Heading>
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
  scroll: { paddingBottom: spacing.xxxl, paddingTop: spacing.md },
  testCard: {
    backgroundColor: colors.warningMuted,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  steps: { marginTop: spacing.md, gap: spacing.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.brandMuted,
    borderWidth: 1,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  walletAddr: {
    fontFamily: 'Menlo',
    marginTop: 2,
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.brandMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  sectionLabel: { marginTop: spacing.xxl, marginBottom: spacing.md },
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
});

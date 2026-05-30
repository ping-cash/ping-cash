/**
 * Cash-in / Add Money — Onramper aggregator (ADR 0026).
 *
 * One pipeline: USD → USDC via Topper-via-Onramper → USDC-Base
 * → treasury-rebalanced to Solana via CCTP (Phase 1.2, batched).
 *
 * Flow:
 *   1. User picks amount (default $25)
 *   2. User taps Apple Pay / Card / Google Pay
 *   3. Mobile calls api.buildCashinIntent → backend returns signed
 *      buy.onramper.com URL + expected USDC + fee disclosure
 *   4. Mobile launches the URL in expo-web-browser (in-app browser)
 *   5. User completes Onramper checkout
 *   6. Onramper posts to /notify/webhooks/onramper → treasury funds
 *      user wallet on-chain (sandbox-mode) OR USDC lands directly
 *      (production)
 *   7. Mobile polls /wallet/balance for the credit
 *
 * Devnet test funds card stays — for the demo walk we fund via
 * faucet OR treasury-auto-credit when the sandbox webhook fires.
 *
 * Ping pricing contract: ONE fee shown (~1.62% Onramper-Topper-Base)
 * with disclosure "Your bank may charge separate FX margin" per
 * ADR 0026 §"Per-step ownership".
 */
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Linking,
  Clipboard,
  TextInput,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../lib/api';
import { authStore } from '../lib/auth-store';
import { colors, radii, spacing } from '../lib/theme';
import { Button } from '../components/ui/Button';
import { Heading } from '../components/ui/Heading';

type Method = 'apple_pay' | 'card' | 'google_pay';

type MethodOption = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  method: Method;
};

const METHODS: MethodOption[] = [
  {
    icon: 'logo-apple',
    iconColor: '#FFFFFF',
    title: 'Apple Pay',
    subtitle: 'Card from your Wallet — fastest checkout',
    method: 'apple_pay',
  },
  {
    icon: 'card',
    iconColor: '#635BFF',
    title: 'Debit / credit card',
    subtitle: 'Visa, Mastercard, Amex worldwide',
    method: 'card',
  },
  {
    icon: 'logo-google',
    iconColor: '#4285F4',
    title: 'Google Pay',
    subtitle: 'Tap to pay from your Google Wallet',
    method: 'google_pay',
  },
];

export default function CashinScreen() {
  const router = useRouter();
  const user = authStore.user;
  const wallet = user?.walletAddress ?? '';
  const [amount, setAmount] = useState('25');
  const [loadingMethod, setLoadingMethod] = useState<Method | null>(null);

  const copyAddress = async () => {
    if (!wallet) return;
    Clipboard.setString(wallet);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Wallet address copied to clipboard.');
  };

  const handlePayment = async (method: Method) => {
    if (!wallet) {
      Alert.alert(
        'Sign in first',
        'We need your Ping wallet address to route the on-ramp purchase.'
      );
      return;
    }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      Alert.alert('Enter an amount', 'Please enter a USD amount above $0.');
      return;
    }
    try {
      setLoadingMethod(method);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const intent = await api.buildCashinIntent(amt.toFixed(2), method, {
        email: user?.phone ? `${user.phone}@phone.ping.cash` : undefined,
      });

      // Disclose fee + expected delivered amount before launching the
      // hosted widget. Per ADR 0026: "Ping fee 1.62% — your bank may
      // charge separate FX margin (typically 0.4-1%)".
      const message = intent.isLive
        ? `You'll receive ~${intent.expectedUsdcAmount.toFixed(2)} USDC.\n\n` +
          `Ping fee: ${intent.feePercent}% via ${intent.provider}.\n` +
          `Your bank may charge separate FX margin if you're paying in a non-USD currency.\n\n` +
          `Tap Continue to complete payment.`
        : `Demo mode — your wallet will be funded with test USDC after the sandbox checkout.\n\n` +
          `Expected: ~${intent.expectedUsdcAmount.toFixed(2)} USDC (~${intent.feePercent}% fee via ${intent.provider}).`;

      const confirmed = await new Promise<boolean>(resolve => {
        Alert.alert('Confirm cash-in', message, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Continue', onPress: () => resolve(true) },
        ]);
      });
      if (!confirmed) return;

      const result = await WebBrowser.openAuthSessionAsync(
        intent.checkoutUrl,
        'cash://onramper-return'
      );

      if (result.type === 'success' || result.type === 'dismiss') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Payment submitted',
          'Your USDC will land in seconds. Pull-to-refresh on Home to see the credit.'
        );
        router.replace('/(tabs)');
      } else if (result.type === 'cancel') {
        // User dismissed the in-app browser — no-op.
      }
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
          <View style={styles.amountCard}>
            <Heading variant="labelSmall" color="tertiary">
              AMOUNT TO ADD
            </Heading>
            <View style={styles.amountRow}>
              <Heading variant="h1" color="primary">
                $
              </Heading>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                style={styles.amountInput}
                placeholder="25"
                placeholderTextColor={colors.textTertiary}
                testID="cashin-amount-input"
              />
              <Heading variant="bodyLarge" color="tertiary">
                USD
              </Heading>
            </View>
            <Heading variant="bodySmall" color="secondary">
              You pay in USD via card or Apple Pay. Your bank handles any
              local-currency conversion (typically 0.4-1% margin) — that's
              separate from Ping's fee.
            </Heading>
          </View>

          <Heading
            variant="labelSmall"
            color="tertiary"
            style={styles.sectionLabel}
          >
            PAY WITH
          </Heading>

          {METHODS.map(m => (
            <Pressable
              key={m.method}
              onPress={() => void handlePayment(m.method)}
              disabled={!!loadingMethod}
              style={[styles.row, !!loadingMethod && styles.rowLoading]}
              testID={`cashin-method-${m.method}`}
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
                {loadingMethod === m.method && (
                  <View style={styles.feeRow}>
                    <Heading variant="labelSmall" color="brand">
                      Opening secure checkout…
                    </Heading>
                  </View>
                )}
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>
          ))}

          <Heading
            variant="labelSmall"
            color="tertiary"
            style={styles.sectionLabel}
          >
            OR DEPOSIT USDC DIRECTLY
          </Heading>

          <Pressable
            onPress={() => router.push('/receive' as never)}
            style={styles.row}
          >
            <View
              style={[styles.iconBox, { backgroundColor: `${colors.brand}22` }]}
            >
              <Ionicons name="qr-code" size={26} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Heading variant="bodyLargeStrong">
                Send from another wallet
              </Heading>
              <Heading variant="bodySmall" color="secondary">
                Free — only ~$0.0001 Solana network fee
              </Heading>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textTertiary}
            />
          </Pressable>

          <View style={styles.testCard}>
            <View style={styles.testHeader}>
              <Ionicons name="flask" size={20} color={colors.accentAmber} />
              <Heading
                variant="bodyLargeStrong"
                color="primary"
                style={{ marginLeft: spacing.sm }}
              >
                Devnet self-fund
              </Heading>
            </View>
            <Heading variant="bodySmall" color="secondary">
              Bypass the on-ramp on devnet — fund your wallet free from the
              public faucets. Useful for end-to-end testing.
            </Heading>
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
  scroll: { paddingBottom: spacing.xxxl, paddingTop: spacing.md },
  amountCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  amountInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: '700',
    padding: 0,
  },
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.md },
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
  rowLoading: { opacity: 0.6 },
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
  testCard: {
    backgroundColor: colors.warningMuted,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
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
});

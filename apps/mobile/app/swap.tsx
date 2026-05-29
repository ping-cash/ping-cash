/**
 * Swap — convert between USDC and the user's local currency.
 * UI scaffold only; the wire to Jupiter/Pyth swap quote API is a
 * follow-up task.
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { api, type SwapQuote } from '../lib/api';
import { colors, radii, spacing, typography } from '../lib/theme';
import { Button } from '../components/ui/Button';
import { Heading } from '../components/ui/Heading';
import { PingTokenMark } from '../components/ui/PingTokenMark';

const FROM_CURRENCY = 'USDC';
const FALLBACK_RATE = 0.085;
const DEBOUNCE_MS = 400;

export default function SwapScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const numeric = parseFloat(amount) || 0;

  // Debounced live quote fetch as the user types. Cancels in-flight
  // requests so the user always sees the latest typed amount's quote,
  // never a stale one from a previous keystroke.
  useEffect(() => {
    if (numeric <= 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      setQuoting(true);
      api
        .getSwapQuote(amount)
        .then(q => {
          if (!cancelled) setQuote(q);
        })
        .catch(() => {
          if (!cancelled) setQuote(null);
        })
        .finally(() => {
          if (!cancelled) setQuoting(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [amount, numeric]);

  const liveRate = quote ? parseFloat(quote.rate) : FALLBACK_RATE;
  const received = quote
    ? quote.outputAmount
    : (numeric / FALLBACK_RATE).toFixed(2);

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
          <Heading variant="h3">Swap</Heading>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.content}>
          {/* From */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <Heading variant="labelSmall" color="tertiary">
                FROM
              </Heading>
              <View style={styles.tokenChip}>
                <Heading variant="bodyStrong">{FROM_CURRENCY}</Heading>
              </View>
            </View>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={colors.textQuaternary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              autoFocus
            />
            <Heading variant="caption" color="tertiary">
              Balance: 0.00 {FROM_CURRENCY}
            </Heading>
          </View>

          {/* Direction indicator */}
          <View style={styles.divider}>
            <View style={styles.dirCircle}>
              <Ionicons name="arrow-down" size={18} color={colors.brand} />
            </View>
          </View>

          {/* To */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <Heading variant="labelSmall" color="tertiary">
                TO
              </Heading>
              <View style={styles.tokenChip}>
                <PingTokenMark size={14} />
                <Heading variant="bodyStrong" style={{ marginLeft: 6 }}>
                  $PING
                </Heading>
              </View>
            </View>
            <Heading variant="displaySmall" color="primary">
              {numeric > 0 ? received : '0'}
            </Heading>
            <Heading variant="caption" color="tertiary">
              {quoting
                ? 'Quoting…'
                : quote
                  ? `1 USDC ≈ ${liveRate.toFixed(4)} $PING${quote.isLive ? '' : ' (indicative)'}`
                  : `1 USDC ≈ ${(1 / FALLBACK_RATE).toFixed(4)} $PING (indicative)`}
            </Heading>
            {quote && quote.route.length > 0 ? (
              <Heading variant="caption" color="tertiary">
                Route: {quote.route.join(' → ')}
                {quote.slippageBps
                  ? ` · slippage ${(quote.slippageBps / 100).toFixed(2)}%`
                  : ''}
              </Heading>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            label={
              numeric > 0
                ? `Swap ${amount} ${FROM_CURRENCY}`
                : 'Enter an amount'
            }
            onPress={() =>
              Alert.alert(
                'Swap engine coming online',
                'Pyth + Jupiter wires up next iteration. UI is in place.'
              )
            }
            disabled={numeric <= 0}
            iconRight="arrow-forward"
          />
        </View>
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
  content: { flex: 1, paddingTop: spacing.xl, gap: spacing.md },
  fieldCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  amountInput: {
    ...typography.displayLarge,
    color: colors.textPrimary,
    padding: 0,
  },
  divider: {
    alignItems: 'center',
    height: 0,
  },
  dirCircle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.brandMuted,
    borderWidth: 1,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -spacing.md,
  },
  actions: { paddingBottom: spacing.lg },
});

/**
 * Transfer details — rendered when a user taps an activity row.
 * Pulls the transfer record by id from the transfer-service.
 */
import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Share,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api, type Transfer } from '../lib/api';
import { colors, radii, spacing } from '../lib/theme';
import { Button } from '../components/ui/Button';
import { Heading } from '../components/ui/Heading';

export default function TransferDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.listTransfers({ limit: 200 });
        const found = list.transfers.find(t => t.id === id);
        if (!cancelled) setTransfer(found ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const shareClaimLink = async () => {
    if (!transfer?.claimUrl) return;
    Haptics.selectionAsync();
    await Share.share({
      message: `Money on Ping for you: ${transfer.claimUrl}`,
      url: transfer.claimUrl,
    });
  };

  const shareViaWhatsApp = async () => {
    if (!transfer?.claimUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const phoneDigits = transfer.recipientPhone.replace(/[^\d]/g, '');
    const message = `I sent you $${transfer.amount} on Ping. Claim it here: ${transfer.claimUrl}`;
    const url = `whatsapp://send?phone=${phoneDigits}&text=${encodeURIComponent(message)}`;
    const fallback = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
    const canOpen = await Linking.canOpenURL(url);
    Linking.openURL(canOpen ? url : fallback);
  };

  const cancelTransfer = async () => {
    if (!transfer) return;
    Alert.alert(
      'Cancel this transfer?',
      "We'll refund the USDC back to your wallet.",
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel transfer',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = await api.cancelTransfer(transfer.id);
              setTransfer(updated);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            } catch (err) {
              Alert.alert('Cancel failed', (err as Error).message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <Header onBack={() => router.back()} title="Transfer" />
          <View style={styles.empty}>
            <Heading variant="bodyLarge" color="secondary">
              Loading…
            </Heading>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!transfer) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <Header onBack={() => router.back()} title="Transfer" />
          <View style={styles.empty}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={colors.textTertiary}
            />
            <Heading
              variant="bodyLargeStrong"
              align="center"
              style={{ marginTop: spacing.md }}
            >
              We couldn&apos;t find that transfer
            </Heading>
            <Heading
              variant="bodySmall"
              color="secondary"
              align="center"
              style={{ marginTop: spacing.sm }}
            >
              It may have been cancelled, expired, or never existed on this
              account.
            </Heading>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const isClaimable = transfer.status === 'pending' && transfer.claimUrl;
  const isCancellable =
    transfer.status === 'pending' || transfer.status === 'confirmed';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Header onBack={() => router.back()} title="Transfer" />
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.heroCard}>
            <Heading variant="labelSmall" color="tertiary">
              YOU SENT
            </Heading>
            <Heading variant="displayLarge" style={{ marginTop: 4 }}>
              ${transfer.amount}
            </Heading>
            {transfer.localAmount ? (
              <Heading variant="bodyLarge" color="brand">
                ≈ {transfer.localAmount} {transfer.localCurrency}
              </Heading>
            ) : null}
            <StatusPill status={transfer.status} />
          </View>

          <Row label="To" value={transfer.recipientPhone} mono />
          <Row label="Reference" value={transfer.id} mono />
          <Row
            label="Created"
            value={new Date(transfer.createdAt).toLocaleString()}
          />
          {transfer.claimCode ? (
            <Row label="Claim code" value={transfer.claimCode} mono />
          ) : null}
          {transfer.claimUrl ? (
            <Row label="Claim link" value={transfer.claimUrl} small />
          ) : null}

          {isClaimable ? (
            <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
              <Button
                label="Share via WhatsApp"
                variant="whatsapp"
                onPress={shareViaWhatsApp}
                icon="logo-whatsapp"
              />
              <Button
                label="Share another way…"
                variant="secondary"
                onPress={shareClaimLink}
                icon="share-outline"
              />
            </View>
          ) : null}

          {isCancellable ? (
            <Pressable
              onPress={cancelTransfer}
              style={{ marginTop: spacing.xl, alignSelf: 'center' }}
              hitSlop={8}
            >
              <Heading variant="bodyStrong" color="error">
                Cancel transfer
              </Heading>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.back} hitSlop={8}>
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
      </Pressable>
      <Heading variant="h3">{title}</Heading>
      <View style={{ width: 44 }} />
    </View>
  );
}

function Row({
  label,
  value,
  mono,
  small,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Heading variant="labelSmall" color="tertiary">
        {label.toUpperCase()}
      </Heading>
      <Heading
        variant={small ? 'bodySmall' : 'bodyLarge'}
        style={mono ? { fontFamily: 'Menlo' } : undefined}
        numberOfLines={1}
      >
        {value}
      </Heading>
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'claimed' || status === 'completed'
      ? { bg: colors.successMuted, fg: colors.success }
      : status === 'failed' || status === 'cancelled' || status === 'expired'
        ? { bg: colors.errorMuted, fg: colors.error }
        : { bg: colors.warningMuted, fg: colors.warning };
  return (
    <View
      style={[styles.pill, { backgroundColor: tone.bg, borderColor: tone.fg }]}
    >
      <Heading variant="labelSmall" style={{ color: tone.fg }}>
        {status.toUpperCase()}
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
  back: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingBottom: spacing.xxxl, paddingTop: spacing.md },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  pill: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 4,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
});

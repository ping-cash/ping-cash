/**
 * Send money screen — jumbo amount entry → share screen with WhatsApp deep
 * link and OS share-sheet. Confetti + haptic success on transfer creation.
 */
import { useEffect, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  Linking,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Contacts from 'expo-contacts';
import { api } from '../lib/api';
import { colors, radii, spacing, typography, shadows } from '../lib/theme';
import { Button } from '../components/ui/Button';
import { Heading } from '../components/ui/Heading';

export default function SendScreen() {
  const router = useRouter();
  // Accept a prefilled recipient via ?to=<phone> — used by the receive
  // QR round-trip + future deep links like ping.cash/send?to=+44…
  const params = useLocalSearchParams<{ to?: string }>();
  const initialPhone = params.to
    ? params.to.startsWith('+')
      ? params.to
      : `+${params.to}`
    : '+';
  type TokenKind = 'USDC' | 'PING';
  const [phone, setPhone] = useState(initialPhone);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [tokenKind, setTokenKind] = useState<TokenKind>('USDC');
  const [loading, setLoading] = useState(false);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<{
    rate: string;
    currency: string;
  } | null>(null);

  // Recipient local currency inferred from E.164 prefix. Mirrors the
  // claim-service mapping so the preview here matches what the
  // recipient will actually see post-cashout.
  const localCurrency = (() => {
    if (phone.startsWith('+63')) return 'PHP';
    if (phone.startsWith('+91')) return 'INR';
    if (phone.startsWith('+92')) return 'PKR';
    if (phone.startsWith('+880')) return 'BDT';
    if (phone.startsWith('+254')) return 'KES';
    if (phone.startsWith('+234')) return 'NGN';
    if (phone.startsWith('+90')) return 'TRY';
    if (phone.startsWith('+971')) return 'AED';
    if (phone.startsWith('+966')) return 'SAR';
    if (phone.startsWith('+62')) return 'IDR';
    return null;
  })();

  // Debounced FX fetch so the user sees a live "≈ X PHP" preview
  // as they type. Cancels in-flight requests on each keystroke.
  useEffect(() => {
    if (!localCurrency || !amount || parseFloat(amount) <= 0) {
      setLocalPreview(null);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      api
        .getRate('USD', localCurrency)
        .then(r => {
          if (cancelled) return;
          const conv = (parseFloat(amount) * parseFloat(r.rate)).toFixed(2);
          setLocalPreview({ rate: conv, currency: localCurrency });
        })
        .catch(() => {
          if (!cancelled) setLocalPreview(null);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [amount, localCurrency]);

  const handlePickContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Contacts permission needed',
          'Allow contacts access in Settings to pick a recipient by name.'
        );
        return;
      }
      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return;
      const number = contact.phoneNumbers?.[0]?.number;
      if (!number) {
        Alert.alert('No phone number', `${contact.name} has no phone number.`);
        return;
      }
      // Normalize: keep + and digits only
      const normalized = number.replace(/[^\d+]/g, '');
      const withPlus = normalized.startsWith('+')
        ? normalized
        : `+${normalized}`;
      setPhone(withPlus);
      setRecipientName(contact.name ?? null);
      Haptics.selectionAsync();
    } catch (err) {
      Alert.alert('Could not open contacts', (err as Error).message);
    }
  };

  const handleSend = async () => {
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Invalid phone',
        'Enter the recipient phone in international format (e.g. +447700900001)'
      );
      return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || parseFloat(amount) <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Invalid amount', 'Enter a valid amount');
      return;
    }
    setLoading(true);
    try {
      if (tokenKind === 'PING') {
        // In-network only — lookup recipient wallet first. $PING cannot be
        // sent to non-Ping users (no claim-link UX). Privy MPC sign + Solana
        // RPC submit is a follow-up; this iteration validates the resolver
        // path end-to-end so the Maestro walk has full coverage.
        const { walletAddress } = await api.lookupRecipientWallet(phone);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Recipient found',
          `${amount} $PING → ${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}\n\nOn-chain submit via Privy MPC ships in the next iteration. Backend is ready (wallet-service /send-intent accepts tokenKind:'PING').`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }
      const transfer = await api.createTransfer({
        recipientPhone: phone,
        amount,
        currency: 'USD',
        note: note || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (transfer.claimUrl) {
        setClaimUrl(transfer.claimUrl);
      } else {
        Alert.alert('Sent', 'Check Activity for details', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = (err as Error).message;
      if (tokenKind === 'PING' && msg.includes('RECIPIENT_NOT_REGISTERED')) {
        Alert.alert(
          'Not on Ping yet',
          '$PING can only be sent to existing Ping users. Use USDC to send to anyone via claim link.'
        );
      } else {
        Alert.alert('Send failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const shareViaWhatsApp = async () => {
    if (!claimUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const phoneDigits = phone.replace(/[^\d]/g, '');
    const message = `I sent you $${amount} on Ping${note ? ` (${note})` : ''}. Claim it here: ${claimUrl}`;
    const url = `whatsapp://send?phone=${phoneDigits}&text=${encodeURIComponent(message)}`;
    const fallback = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
    const canOpen = await Linking.canOpenURL(url);
    Linking.openURL(canOpen ? url : fallback);
  };

  const shareViaSheet = async () => {
    if (!claimUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const message = `I sent you $${amount} on Ping${note ? ` (${note})` : ''}. Claim it here: ${claimUrl}`;
    await Share.share({ message, url: claimUrl });
  };

  if (claimUrl) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={styles.successScroll}>
            {/* Success badge */}
            <View style={styles.successBadge}>
              <Ionicons name="checkmark" size={48} color={colors.brand} />
            </View>

            <Heading variant="displaySmall" align="center">
              ${amount} on the way
            </Heading>
            <Heading
              variant="bodyLarge"
              color="secondary"
              align="center"
              style={{ marginTop: spacing.sm }}
            >
              to {phone}
            </Heading>

            <View style={styles.shareSection}>
              <Heading
                variant="label"
                color="tertiary"
                align="center"
                style={{ marginBottom: spacing.md }}
              >
                Send them the claim link
              </Heading>
              <Button
                label="Send via WhatsApp"
                variant="whatsapp"
                onPress={shareViaWhatsApp}
                icon="logo-whatsapp"
              />
              <View style={{ height: spacing.sm }} />
              <Button
                label="Share another way…"
                variant="secondary"
                onPress={shareViaSheet}
                icon="share-outline"
              />
            </View>

            <View style={styles.linkBox}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: spacing.sm,
                }}
              >
                <Ionicons
                  name="link"
                  size={14}
                  color={colors.textTertiary}
                  style={{ marginRight: 6 }}
                />
                <Heading variant="labelSmall" color="tertiary">
                  Claim link
                </Heading>
              </View>
              <Heading
                variant="bodySmall"
                color="primary"
                style={{
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                }}
                numberOfLines={2}
              >
                {claimUrl}
              </Heading>
            </View>

            <Pressable
              onPress={() => router.back()}
              style={styles.doneButton}
              hitSlop={12}
            >
              <Heading variant="bodyStrong" color="tertiary">
                Done
              </Heading>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kb}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons
                name="chevron-back"
                size={24}
                color={colors.textPrimary}
              />
            </Pressable>
            <Heading variant="h3">Send money</Heading>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Token toggle — USDC default, $PING in-network only (#52) */}
            <View style={styles.tokenToggleRow}>
              <Pressable
                onPress={() => {
                  setTokenKind('USDC');
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.tokenPill,
                  tokenKind === 'USDC' && styles.tokenPillActive,
                ]}
                testID="send-token-usdc"
              >
                <Heading
                  variant="labelSmall"
                  color={tokenKind === 'USDC' ? 'primary' : 'tertiary'}
                >
                  USDC
                </Heading>
              </Pressable>
              <Pressable
                onPress={() => {
                  setTokenKind('PING');
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.tokenPill,
                  tokenKind === 'PING' && styles.tokenPillActive,
                ]}
                testID="send-token-ping"
              >
                <Heading
                  variant="labelSmall"
                  color={tokenKind === 'PING' ? 'primary' : 'tertiary'}
                >
                  $PING
                </Heading>
              </Pressable>
            </View>

            {/* Amount entry — jumbo */}
            <View style={styles.amountSection}>
              <Heading variant="labelSmall" color="tertiary" align="center">
                You're sending
              </Heading>
              <View style={styles.amountInputRow}>
                <Heading variant="displayMedium" color="tertiary">
                  {tokenKind === 'USDC' ? '$' : ''}
                </Heading>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={colors.textQuaternary}
                  value={amount}
                  onChangeText={t => {
                    if (t.length > amount.length) Haptics.selectionAsync();
                    setAmount(t);
                  }}
                  keyboardType="decimal-pad"
                  editable={!loading}
                  autoFocus
                />
                {tokenKind === 'PING' ? (
                  <Heading variant="bodyLarge" color="tertiary">
                    $PING
                  </Heading>
                ) : null}
              </View>
              {localPreview && tokenKind === 'USDC' ? (
                <Heading
                  variant="bodyStrong"
                  color="brand"
                  align="center"
                  style={{ marginTop: 6 }}
                >
                  ≈ {localPreview.rate} {localPreview.currency}
                </Heading>
              ) : null}
              <View style={styles.feePill}>
                <View style={styles.dot} />
                <Heading variant="caption" color="secondary">
                  {tokenKind === 'PING'
                    ? 'In-network only · instant on-chain'
                    : 'FREE in-network · ~0.5% if cash-out'}
                </Heading>
              </View>
            </View>

            {/* Recipient field */}
            <View style={styles.fieldGroup}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Heading variant="label" color="secondary">
                  Send to
                </Heading>
                <Pressable
                  onPress={handlePickContact}
                  style={styles.pickContactBtn}
                  hitSlop={8}
                >
                  <Ionicons name="people" size={14} color={colors.brand} />
                  <Heading
                    variant="labelSmall"
                    color="brand"
                    style={{ marginLeft: 6 }}
                  >
                    Pick from contacts
                  </Heading>
                </Pressable>
              </View>
              <View style={styles.fieldRow}>
                <Ionicons name="call" size={18} color={colors.textTertiary} />
                <TextInput
                  style={styles.fieldInput}
                  placeholder="+447700900001"
                  placeholderTextColor={colors.textQuaternary}
                  value={phone}
                  onChangeText={t => {
                    setPhone(t);
                    setRecipientName(null);
                  }}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
              </View>
              {recipientName ? (
                <Heading
                  variant="bodySmall"
                  color="brand"
                  style={{ marginTop: 4 }}
                >
                  → {recipientName}
                </Heading>
              ) : (
                <Heading
                  variant="caption"
                  color="tertiary"
                  style={{ marginTop: 4 }}
                >
                  Type a phone number or pick from contacts above.
                </Heading>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Heading variant="label" color="secondary">
                What's it for?
              </Heading>
              <View style={styles.fieldRow}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={18}
                  color={colors.textTertiary}
                />
                <TextInput
                  style={styles.fieldInput}
                  placeholder="optional note"
                  placeholderTextColor={colors.textQuaternary}
                  value={note}
                  onChangeText={setNote}
                  editable={!loading}
                  maxLength={64}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.actionsBar}>
            <Button
              label={
                amount && parseFloat(amount) > 0
                  ? `Send $${amount}`
                  : 'Enter an amount'
              }
              onPress={handleSend}
              loading={loading}
              disabled={!amount || parseFloat(amount) <= 0}
              iconRight="arrow-forward"
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  kb: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
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
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  tokenToggleRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    padding: 4,
    gap: 4,
    marginTop: spacing.md,
  },
  tokenPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  tokenPillActive: {
    backgroundColor: colors.brand,
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: spacing.sm,
  },
  amountInput: {
    ...typography.displayHuge,
    color: colors.textPrimary,
    minWidth: 80,
    textAlign: 'left',
    padding: 0,
  },
  feePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    marginTop: spacing.lg,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.brand,
    marginRight: 8,
  },
  fieldGroup: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    gap: spacing.sm,
  },
  fieldInput: {
    flex: 1,
    ...typography.bodyLarge,
    color: colors.textPrimary,
    padding: 0,
  },
  pickContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  actionsBar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  // Success screen
  successScroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.lg,
  },
  successBadge: {
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: colors.brandMuted,
    borderWidth: 2,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xl,
    ...shadows.brand,
  },
  shareSection: { marginTop: spacing.xxxl, gap: spacing.xs },
  linkBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  doneButton: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
});

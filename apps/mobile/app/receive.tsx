/**
 * Receive screen — show user's phone + a shareable link.
 *
 * QRCode is loaded LAZILY via dynamic require to keep react-native-svg's
 * native module init off the app launch path. Expo Router's _ctx
 * pre-requires every screen file at bundle start; a top-level
 *   import QRCode from 'react-native-qrcode-svg'
 * fires react-native-svg's RCTBridgeModule registration while the JS
 * bridge is still spinning up the root view, which produced Build 30's
 * 112s `kAXErrorIPCTimeout` — main thread hung waiting for the bridge.
 */
import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Share,
  ScrollView,
  Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../lib/auth-store';
import { colors, radii, spacing } from '../lib/theme';
import { Button } from '../components/ui/Button';
import { Heading } from '../components/ui/Heading';

type QRComponent = (props: {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}) => JSX.Element;

function LazyQRCode({ value }: { value: string }) {
  const [Comp, setComp] = useState<QRComponent | null>(null);
  useEffect(() => {
    let cancelled = false;
    // Dynamic require so the native module init happens after the receive
    // screen is navigated to, not at app launch via the route registry.
    Promise.resolve()
      .then(() => require('react-native-qrcode-svg'))
      .then(mod => {
        if (!cancelled) setComp(() => mod.default as QRComponent);
      })
      .catch(() => {
        // If the SVG module fails to load we degrade gracefully — the
        // receive screen still works via the phone number + share link.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!Comp) {
    return (
      <View style={{ width: 200, height: 200, backgroundColor: '#FFFFFF' }} />
    );
  }
  return (
    <Comp
      value={value}
      size={200}
      color={colors.bg}
      backgroundColor="#FFFFFF"
    />
  );
}

type Mode = 'phone' | 'wallet';

export default function ReceiveScreen() {
  const router = useRouter();
  const user = authStore.user;
  const phone = user?.phone ?? '';
  const walletAddress = user?.walletAddress ?? '';
  const [mode, setMode] = useState<Mode>('phone');
  const [copied, setCopied] = useState(false);

  // Phone mode: QR encodes the phone directly so any QR scanner (Ping or
  // generic) reads the recipient number. Wallet mode: QR encodes the raw
  // Solana address so any wallet (Phantom, Backpack, exchange withdraw
  // flow) reads it correctly. ADR 0024 Method 1: direct stablecoin
  // deposit is the cheapest cash-in path — 0 fee + ~$0.0001 gas.
  const qrPayload = mode === 'phone' ? phone : walletAddress;
  const shareLink =
    mode === 'phone'
      ? `https://ping.cash/send?to=${encodeURIComponent(phone)}`
      : '';

  const handleShare = async () => {
    if (mode === 'phone') {
      await Share.share({
        message: `Send me money on Ping: ${shareLink}`,
        url: shareLink,
      });
    } else {
      await Share.share({
        message: `My Solana wallet for USDC/USDT: ${walletAddress}`,
      });
    }
  };

  const handleCopyAddress = () => {
    if (!walletAddress) return;
    Clipboard.setString(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            testID="back-button"
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.textPrimary}
            />
          </Pressable>
          <Heading variant="h3">Receive money</Heading>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.modeToggle}>
          <Pressable
            onPress={() => setMode('phone')}
            style={[
              styles.modeButton,
              mode === 'phone' && styles.modeButtonActive,
            ]}
            testID="receive-mode-phone"
          >
            <Heading
              variant="bodySmall"
              color={mode === 'phone' ? 'primary' : 'tertiary'}
            >
              From Ping users
            </Heading>
          </Pressable>
          <Pressable
            onPress={() => setMode('wallet')}
            style={[
              styles.modeButton,
              mode === 'wallet' && styles.modeButtonActive,
            ]}
            testID="receive-mode-wallet"
          >
            <Heading
              variant="bodySmall"
              color={mode === 'wallet' ? 'primary' : 'tertiary'}
            >
              From any wallet
            </Heading>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.qrCard}>
            <View style={styles.qrInner}>
              <LazyQRCode value={qrPayload} />
            </View>
            <Heading
              variant="bodySmall"
              color="tertiary"
              align="center"
              style={{ marginTop: spacing.md }}
            >
              {mode === 'phone'
                ? 'Show this QR — they tap their phone camera at it to send you money'
                : 'Scan from Phantom, Backpack, or any Solana wallet to send USDC/USDT'}
            </Heading>
          </View>

          {mode === 'phone' ? (
            <View style={styles.phoneCard}>
              <Heading variant="labelSmall" color="tertiary">
                YOUR PHONE
              </Heading>
              <Heading variant="h1" style={{ marginTop: 4 }}>
                {phone}
              </Heading>
              <Heading
                variant="bodySmall"
                color="secondary"
                style={{ marginTop: 6 }}
              >
                Anyone with this number can send you money on Ping. Recipients
                who aren't on Ping yet get a claim link they can open in any
                browser.
              </Heading>
            </View>
          ) : (
            <View style={styles.phoneCard}>
              <Heading variant="labelSmall" color="tertiary">
                SOLANA WALLET ADDRESS
              </Heading>
              <Pressable
                onPress={handleCopyAddress}
                style={styles.addressBox}
                testID="receive-wallet-address"
              >
                <Heading variant="bodySmall" style={styles.addressText}>
                  {walletAddress || 'Loading…'}
                </Heading>
                <Ionicons
                  name={copied ? 'checkmark-circle' : 'copy-outline'}
                  size={20}
                  color={copied ? colors.success : colors.textSecondary}
                />
              </Pressable>
              <Heading
                variant="bodySmall"
                color="secondary"
                style={{ marginTop: spacing.md }}
              >
                Send USDC or USDT on Solana to this address. Both stablecoins
                land instantly with no Ping fee — only the Solana network fee
                (~$0.0001).
              </Heading>
              <View style={styles.warningBox}>
                <Ionicons name="warning" size={16} color={colors.warning} />
                <Heading
                  variant="bodySmall"
                  color="secondary"
                  style={{ flex: 1, marginLeft: spacing.sm }}
                >
                  Only send USDC or USDT on Solana. Other assets or networks
                  will be lost permanently.
                </Heading>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.actions}>
          <Button
            label={mode === 'phone' ? 'Share my Ping link' : 'Share my address'}
            onPress={handleShare}
            icon="share-outline"
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
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 4,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.md,
  },
  modeButtonActive: {
    backgroundColor: colors.bg,
  },
  scroll: { flex: 1 },
  content: { gap: spacing.xl, paddingBottom: spacing.lg },
  qrCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  qrInner: {
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderRadius: radii.md,
  },
  phoneCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  addressText: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  actions: { paddingBottom: spacing.lg },
});

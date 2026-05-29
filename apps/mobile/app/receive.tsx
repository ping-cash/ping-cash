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
import { View, StyleSheet, Pressable, Share } from 'react-native';
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

export default function ReceiveScreen() {
  const router = useRouter();
  const user = authStore.user;
  const phone = user?.phone ?? '';
  // QR encodes the phone directly so any QR scanner (Ping or generic)
  // reads the recipient number. /c/<code> is reserved for claim-code
  // links — a phone there 404s. The shareable text link points at a
  // landing page the sender's Ping app intercepts (or the marketing
  // site falls back to web-claim's "download Ping to send to <X>").
  const qrPayload = phone;
  const shareLink = `https://ping.cash/send?to=${encodeURIComponent(phone)}`;

  const handleShare = async () => {
    await Share.share({
      message: `Send me money on Ping: ${shareLink}`,
      url: shareLink,
    });
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
          <Heading variant="h3">Receive money</Heading>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.content}>
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
              Show this QR — they tap their phone camera at it to send you money
            </Heading>
          </View>

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
              Anyone with this number can send you money on Ping. Recipients who
              aren't on Ping yet get a claim link they can open in any browser.
            </Heading>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            label="Share my Ping link"
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
  content: { flex: 1, justifyContent: 'center', gap: spacing.xl },
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
  actions: { paddingBottom: spacing.lg },
});

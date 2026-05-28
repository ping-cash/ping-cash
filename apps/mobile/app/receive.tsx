/**
 * Receive screen — show user's phone + a shareable link.
 * Full QR / username vanity URL ships in Phase 2.
 */
import { View, StyleSheet, Pressable, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../lib/auth-store';
import { colors, radii, spacing } from '../lib/theme';
import { Button } from '../components/ui/Button';
import { Heading } from '../components/ui/Heading';

export default function ReceiveScreen() {
  const router = useRouter();
  const user = authStore.user;
  const phone = user?.phone ?? '';
  const link = `https://app.ping.cash/c/${encodeURIComponent(phone)}`;

  const handleShare = async () => {
    await Share.share({
      message: `Send me money on Ping: ${link}`,
      url: link,
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
            <Ionicons name="qr-code" size={140} color={colors.brand} />
            <Heading
              variant="bodySmall"
              color="tertiary"
              align="center"
              style={{ marginTop: spacing.md }}
            >
              QR code coming in next release
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
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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

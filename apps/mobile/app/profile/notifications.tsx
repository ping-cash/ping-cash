/**
 * Notification preferences — per-event toggles.
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../lib/theme';
import { Heading } from '../../components/ui/Heading';

type Pref = { key: string; label: string; sub: string };

const PREFS: Pref[] = [
  {
    key: 'received',
    label: 'Money received',
    sub: 'Push you the moment someone sends you money',
  },
  {
    key: 'claimed',
    label: 'Recipient claimed',
    sub: 'When your sent transfer is picked up',
  },
  {
    key: 'cashout_complete',
    label: 'Cash-out completed',
    sub: 'When local bank deposit lands',
  },
  {
    key: 'security',
    label: 'Security alerts',
    sub: 'New sign-ins, recovery code views',
  },
  {
    key: 'marketing',
    label: 'Product updates',
    sub: 'New countries, features, $PING news',
  },
];

const PREFS_KEY = '@ping/notif_prefs';
const DEFAULT_PREFS: Record<string, boolean> = {
  received: true,
  claimed: true,
  cashout_complete: true,
  security: true,
  marketing: false,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [state, setState] = useState<Record<string, boolean>>(DEFAULT_PREFS);

  // Hydrate from AsyncStorage on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFS_KEY);
        if (raw && !cancelled) {
          const parsed = JSON.parse(raw) as Record<string, boolean>;
          setState({ ...DEFAULT_PREFS, ...parsed });
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on change (debounced not needed — switches don't toggle fast).
  const setPref = (key: string, value: boolean) => {
    setState(s => {
      const next = { ...s, [key]: value };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
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
          <Heading variant="h3">Notifications</Heading>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Heading
            variant="bodyLarge"
            color="secondary"
            style={{ marginBottom: spacing.lg }}
          >
            Which events should we push to your phone?
          </Heading>
          <View style={styles.card}>
            {PREFS.map((p, i) => (
              <View key={p.key}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Heading variant="bodyLargeStrong">{p.label}</Heading>
                    <Heading variant="bodySmall" color="secondary">
                      {p.sub}
                    </Heading>
                  </View>
                  <Switch
                    value={!!state[p.key]}
                    onValueChange={v => setPref(p.key, v)}
                    trackColor={{
                      false: colors.surfaceElevated,
                      true: colors.brand,
                    }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            ))}
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
  scroll: { paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.borderSubtle,
    marginLeft: spacing.lg,
  },
});

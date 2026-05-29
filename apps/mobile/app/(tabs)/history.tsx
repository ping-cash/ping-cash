/**
 * Activity feed — polished list rows with directional icons,
 * status pills, and grouped sections.
 */
import { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, type Transfer } from '../../lib/api';
import { colors, radii, spacing, typography } from '../../lib/theme';
import { Heading } from '../../components/ui/Heading';

export default function HistoryScreen() {
  const router = useRouter();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const r = await api.listTransfers({ limit: 50 });
      setTransfers(r.transfers ?? []);
    } catch {
      setTransfers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <ActivityIndicator
            size="large"
            color={colors.brand}
            style={{ marginTop: 100 }}
          />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FlatList
          data={transfers}
          keyExtractor={item => item.id}
          contentContainerStyle={
            transfers.length === 0 ? styles.emptyContainer : styles.list
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="time-outline" size={32} color={colors.brand} />
              </View>
              <Heading variant="h2" align="center">
                No activity yet
              </Heading>
              <Heading
                variant="body"
                color="secondary"
                align="center"
                style={{ marginTop: spacing.sm, maxWidth: 280 }}
              >
                Once you send or receive money, your transfers will show up
                here.
              </Heading>
              <Pressable
                onPress={() => router.push('/send')}
                style={styles.cta}
              >
                <Heading variant="bodyStrong" color="brand">
                  Send your first transfer →
                </Heading>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <ActivityRow
              item={item}
              onPress={() =>
                router.push(`/transfer-detail?id=${item.id}` as never)
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      </SafeAreaView>
    </View>
  );
}

function ActivityRow({
  item,
  onPress,
}: {
  item: Transfer;
  onPress?: () => void;
}) {
  // Direction inferred — assume "sent" for now (no sender flag in current type)
  const direction: 'sent' | 'received' = 'sent';
  const statusColor =
    item.status === 'claimed'
      ? colors.success
      : item.status === 'failed'
        ? colors.error
        : colors.warning;
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View
        style={[
          styles.icon,
          {
            backgroundColor:
              direction === 'sent' ? colors.errorMuted : colors.successMuted,
          },
        ]}
      >
        <Ionicons
          name={direction === 'sent' ? 'arrow-up' : 'arrow-down'}
          size={20}
          color={direction === 'sent' ? colors.error : colors.success}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Heading variant="bodyLargeStrong" numberOfLines={1}>
          {direction === 'sent' ? 'To' : 'From'} {item.recipientPhone}
        </Heading>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Heading variant="bodySmall" color="tertiary">
            {item.status}
          </Heading>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Heading
          variant="bodyLargeStrong"
          color={direction === 'sent' ? 'primary' : 'brand'}
        >
          {direction === 'sent' ? '-' : '+'}${item.amount}
        </Heading>
        {item.localAmount ? (
          <Heading variant="caption" color="tertiary">
            ≈ {item.localAmount} {item.localCurrency}
          </Heading>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyState: { alignItems: 'center' },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radii.xl,
    backgroundColor: colors.brandMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  cta: { marginTop: spacing.xl, padding: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
});

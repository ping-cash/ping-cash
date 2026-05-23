/**
 * Activity / Transfers history screen.
 */
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, type Transfer } from '../../lib/api';

export default function HistoryScreen() {
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
      <SafeAreaView style={styles.container}>
        <ActivityIndicator
          size="large"
          color="#10B981"
          style={{ marginTop: 50 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={transfers}
        keyExtractor={item => item.id}
        contentContainerStyle={
          transfers.length === 0 ? styles.emptyContainer : { padding: 16 }
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10B981"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptySub}>
              Your sent and received transfers will appear here
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.recipient}>{item.recipientPhone}</Text>
              <Text style={styles.status}>{item.status}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.amount}>
                ${item.amount} {item.currency}
              </Text>
              {item.localAmount ? (
                <Text style={styles.localAmount}>
                  {item.localAmount} {item.localCurrency}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  emptySub: {
    color: '#A0A0C0',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#2A2A4A',
    borderRadius: 12,
    marginBottom: 8,
  },
  rowLeft: { flex: 1 },
  recipient: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  status: { color: '#A0A0C0', fontSize: 12, marginTop: 4 },
  rowRight: { alignItems: 'flex-end' },
  amount: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  localAmount: { color: '#10B981', fontSize: 12, marginTop: 4 },
});

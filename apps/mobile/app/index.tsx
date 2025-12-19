import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function Home() {
  // Test backend connectivity
  const { data: health, isLoading, error } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.healthCheck(),
    retry: false,
  });

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>💸</Text>
      <Text style={styles.title}>Cash</Text>
      <Text style={styles.subtitle}>The cheapest way to send money anywhere</Text>

      {/* Backend Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Backend Status:</Text>
        {isLoading ? (
          <ActivityIndicator size="small" color="#10b981" />
        ) : error ? (
          <Text style={styles.statusError}>❌ Disconnected</Text>
        ) : (
          <Text style={styles.statusOk}>✅ Connected</Text>
        )}
      </View>

      {/* Development Info */}
      <View style={styles.devInfo}>
        <Text style={styles.devTitle}>Development Mode</Text>
        <Text style={styles.devText}>API: {api.baseUrl}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonOutline}>
          <Text style={styles.buttonOutlineText}>I have an account</Text>
        </TouchableOpacity>
      </View>

      {/* Features */}
      <View style={styles.features}>
        <Feature icon="⚡" text="Instant transfers" />
        <Feature icon="💰" text="Zero fees in-network" />
        <Feature icon="🔒" text="Bank-grade security" />
      </View>
    </View>
  );
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.feature}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#374151',
  },
  statusOk: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  statusError: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  devInfo: {
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    width: '100%',
  },
  devTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  devText: {
    fontSize: 12,
    color: '#92400e',
    fontFamily: 'monospace',
  },
  actions: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonOutline: {
    borderWidth: 2,
    borderColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonOutlineText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  features: {
    flexDirection: 'row',
    gap: 24,
  },
  feature: {
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});

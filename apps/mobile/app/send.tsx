/**
 * Send money screen — phone-driven send flow.
 *
 * For Phase 1: simple form-based flow. Phase 2 will add contact-picker UI.
 */
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';

export default function SendScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('+');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      Alert.alert('Invalid phone', 'Enter the recipient phone in international format');
      return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || parseFloat(amount) <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid amount');
      return;
    }
    setLoading(true);
    try {
      const transfer = await api.createTransfer({
        recipientPhone: phone,
        amount,
        currency: 'USDC',
        note: note || undefined,
      });
      Alert.alert(
        'Transfer sent!',
        `Claim link: ${transfer.claimUrl ?? 'check Activity for details'}`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (err) {
      Alert.alert('Send failed', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kb}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.label}>Send to</Text>
          <TextInput
            style={styles.input}
            placeholder="+971501234567"
            placeholderTextColor="#6B6B8C"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!loading}
          />
          <Text style={styles.helper}>
            Phone number of your recipient (Ping or non-Ping)
          </Text>

          <Text style={[styles.label, { marginTop: 24 }]}>Amount (USDC)</Text>
          <View style={styles.amountRow}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor="#6B6B8C"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              editable={!loading}
            />
          </View>

          <Text style={[styles.label, { marginTop: 24 }]}>Note (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="What's this for?"
            placeholderTextColor="#6B6B8C"
            value={note}
            onChangeText={setNote}
            editable={!loading}
            multiline
          />

          <View style={styles.feePreview}>
            <Text style={styles.feeLabel}>Estimated fee</Text>
            <Text style={styles.feeValue}>FREE in-network · ~0.5% if cash-out</Text>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSend}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Send ${amount || '0'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  kb: { flex: 1 },
  scroll: { padding: 24 },
  label: { fontSize: 14, color: '#A0A0C0', marginBottom: 8 },
  input: {
    backgroundColor: '#2A2A4A',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    fontSize: 16,
  },
  helper: { color: '#6B6B8C', fontSize: 12, marginTop: 8 },
  amountRow: {
    flexDirection: 'row',
    backgroundColor: '#2A2A4A',
    borderRadius: 12,
    alignItems: 'center',
  },
  dollarSign: { color: '#A0A0C0', fontSize: 28, paddingLeft: 16 },
  amountInput: { color: '#FFFFFF', fontSize: 28, flex: 1, padding: 16 },
  feePreview: {
    backgroundColor: '#10B98115',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  feeLabel: { color: '#A0A0C0', fontSize: 13 },
  feeValue: { color: '#10B981', fontSize: 14, marginTop: 4, fontWeight: '600' },
  actions: { padding: 24 },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});

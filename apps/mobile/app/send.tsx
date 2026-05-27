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
  Share,
  Linking,
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
  const [claimUrl, setClaimUrl] = useState<string | null>(null);

  const handleSend = async () => {
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      Alert.alert(
        'Invalid phone',
        'Enter the recipient phone in international format'
      );
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
      if (transfer.claimUrl) {
        setClaimUrl(transfer.claimUrl);
      } else {
        Alert.alert('Sent', 'Check Activity for details', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err) {
      Alert.alert('Send failed', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const shareViaWhatsApp = async () => {
    if (!claimUrl) return;
    const phoneDigits = phone.replace(/[^\d]/g, '');
    const message = `I sent you $${amount} on Ping${note ? ` (${note})` : ''}. Claim it here: ${claimUrl}`;
    const url = `whatsapp://send?phone=${phoneDigits}&text=${encodeURIComponent(message)}`;
    const fallback = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
    const canOpen = await Linking.canOpenURL(url);
    Linking.openURL(canOpen ? url : fallback);
  };

  const shareViaSheet = async () => {
    if (!claimUrl) return;
    const message = `I sent you $${amount} on Ping${note ? ` (${note})` : ''}. Claim it here: ${claimUrl}`;
    await Share.share({ message, url: claimUrl });
  };

  if (claimUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.successBadge}>
            <Text style={styles.successAmount}>${amount}</Text>
            <Text style={styles.successTo}>to {phone}</Text>
          </View>
          <Text style={styles.successHeader}>Send the claim link</Text>
          <Text style={styles.successSub}>
            Your recipient claims the money by opening this link. It expires in
            7 days.
          </Text>

          <TouchableOpacity style={styles.waButton} onPress={shareViaWhatsApp}>
            <Text style={styles.waButtonText}>Send via WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} onPress={shareViaSheet}>
            <Text style={styles.shareButtonText}>Share another way…</Text>
          </TouchableOpacity>

          <View style={styles.linkBox}>
            <Text style={styles.linkLabel}>Or copy the link</Text>
            <Text selectable style={styles.linkValue}>
              {claimUrl}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => router.back()}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.feeValue}>
              FREE in-network · ~0.5% if cash-out
            </Text>
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
  successBadge: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#10B98115',
    borderRadius: 16,
    marginBottom: 24,
  },
  successAmount: { color: '#10B981', fontSize: 48, fontWeight: '700' },
  successTo: { color: '#A0A0C0', fontSize: 16, marginTop: 4 },
  successHeader: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  successSub: {
    color: '#A0A0C0',
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  waButton: {
    backgroundColor: '#25D366',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  waButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  shareButton: {
    backgroundColor: '#2A2A4A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  shareButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  linkBox: {
    backgroundColor: '#2A2A4A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  linkLabel: { color: '#A0A0C0', fontSize: 12, marginBottom: 6 },
  linkValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  doneButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneButtonText: { color: '#6B6B8C', fontSize: 15 },
});

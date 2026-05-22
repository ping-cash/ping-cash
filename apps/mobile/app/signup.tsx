/**
 * Signup screen — phone entry + OTP send.
 * Sends to /auth/init, then navigates to /verify with sessionId.
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';

export default function SignupScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('+');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      Alert.alert('Invalid phone', 'Please enter your phone number in international format (e.g. +971501234567)');
      return;
    }
    setLoading(true);
    try {
      const result = await api.initAuth(phone);
      router.push({
        pathname: '/verify',
        params: { phone, sessionId: result.sessionId },
      });
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
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
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to Ping</Text>
          <Text style={styles.subtitle}>Enter your phone number to get started</Text>

          <Text style={styles.label}>Phone number</Text>
          <TextInput
            style={styles.input}
            placeholder="+971 50 123 4567"
            placeholderTextColor="#6B6B8C"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoFocus
            editable={!loading}
          />

          <Text style={styles.helper}>
            We'll send you a 6-digit verification code via SMS.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Send verification code</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.legal}>
            By continuing, you agree to Ping's Terms and Privacy Policy.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  kb: { flex: 1 },
  content: { flex: 1, padding: 24, paddingTop: 60 },
  title: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#A0A0C0', marginBottom: 40 },
  label: { fontSize: 14, color: '#A0A0C0', marginBottom: 8 },
  input: {
    backgroundColor: '#2A2A4A',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  helper: { color: '#6B6B8C', fontSize: 13, marginTop: 12 },
  actions: { padding: 24 },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  legal: { fontSize: 12, color: '#6B6B8C', textAlign: 'center', marginTop: 16 },
});

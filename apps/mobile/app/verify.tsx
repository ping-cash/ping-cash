/**
 * Verify screen — 6-digit OTP entry.
 * Calls /auth/verify, stores tokens, navigates to home.
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { authStore } from '../lib/auth-store';

export default function VerifyScreen() {
  const router = useRouter();
  const { phone, sessionId } = useLocalSearchParams<{
    phone: string;
    sessionId: string;
  }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(code)) {
      Alert.alert('Invalid code', 'Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const result = await api.verifyOtp(sessionId, code);
      // Server returns { user: {...}, tokens: { accessToken, refreshToken }, isNewUser }
      // Adapt to whichever shape we get
      const r = result as unknown as {
        user: {
          id: string;
          phone: string;
          walletAddress: string;
          phoneHash?: string;
        };
        tokens?: { accessToken: string; refreshToken: string };
        token?: string;
      };
      const accessToken = r.tokens?.accessToken ?? r.token ?? '';
      const refreshToken = r.tokens?.refreshToken ?? '';

      await authStore.setSession({
        accessToken,
        refreshToken,
        user: {
          id: r.user.id,
          phone: r.user.phone,
          name: undefined,
          kycTier: 0,
          walletAddress: r.user.walletAddress,
          createdAt: new Date().toISOString(),
        },
      });
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Verification failed', (err as Error).message);
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
          <Text style={styles.title}>Enter the code</Text>
          <Text style={styles.subtitle}>We sent a 6-digit code to {phone}</Text>

          <TextInput
            style={styles.codeInput}
            placeholder="000000"
            placeholderTextColor="#6B6B8C"
            value={code}
            onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoFocus
            editable={!loading}
            maxLength={6}
          />

          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.resendArea}
          >
            <Text style={styles.resendText}>
              Didn't get a code? Change number
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.button,
              (loading || code.length !== 6) && styles.buttonDisabled,
            ]}
            onPress={handleVerify}
            disabled={loading || code.length !== 6}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
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
  content: { flex: 1, padding: 24, paddingTop: 60 },
  title: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#A0A0C0', marginBottom: 40 },
  codeInput: {
    backgroundColor: '#2A2A4A',
    color: '#FFFFFF',
    paddingVertical: 24,
    borderRadius: 12,
    fontSize: 36,
    textAlign: 'center',
    letterSpacing: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  resendArea: { alignItems: 'center', marginTop: 24 },
  resendText: { color: '#10B981', fontSize: 14 },
  actions: { padding: 24 },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});

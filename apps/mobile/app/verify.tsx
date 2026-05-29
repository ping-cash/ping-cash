/**
 * Verify screen — 6-digit OTP entry with iOS-style boxed digit cells.
 */
import { useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '../lib/api';
import { authStore } from '../lib/auth-store';
import { colors, radii, spacing, typography } from '../lib/theme';
import { Button } from '../components/ui/Button';
import { Heading } from '../components/ui/Heading';

export default function VerifyScreen() {
  const router = useRouter();
  const { phone, sessionId } = useLocalSearchParams<{
    phone: string;
    sessionId: string;
  }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const handleVerify = async (codeOverride?: string) => {
    const submitted = codeOverride ?? code;
    if (!/^\d{6}$/.test(submitted)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Invalid code', 'Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const result = await api.verifyOtp(sessionId, submitted);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Verification failed', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const updateCode = (text: string) => {
    const next = text.replace(/\D/g, '').slice(0, 6);
    if (next.length > code.length) {
      Haptics.selectionAsync();
    }
    setCode(next);
    // 3-tap onboarding: when the 6th digit lands, auto-submit so the
    // user doesn't have to tap "Verify and continue". iOS SMS one-tap
    // autofill drops 6 digits in one event → user goes home with zero
    // additional taps. Manual typing also auto-progresses the moment
    // the last digit is entered.
    if (next.length === 6 && !loading) {
      void handleVerify(next);
    }
  };

  const digits = Array.from({ length: 6 }, (_, i) => code[i] ?? '');

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kb}
        >
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={12}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.textPrimary}
            />
          </Pressable>
          <View style={styles.content}>
            <Heading variant="displaySmall">Check your phone</Heading>
            <Heading
              variant="bodyLarge"
              color="secondary"
              style={{ marginTop: spacing.md }}
            >
              We texted a 6-digit code to{' '}
              <Heading variant="bodyLargeStrong">{phone}</Heading>
            </Heading>

            {/* 6 boxed digit cells */}
            <Pressable
              onPress={() => inputRef.current?.focus()}
              style={styles.cellsRow}
            >
              {digits.map((d, i) => {
                const isActive = code.length === i;
                const isFilled = d !== '';
                return (
                  <View
                    key={i}
                    style={[
                      styles.cell,
                      isFilled && styles.cellFilled,
                      isActive && styles.cellActive,
                    ]}
                  >
                    <Heading variant="displaySmall" align="center">
                      {d}
                    </Heading>
                  </View>
                );
              })}
            </Pressable>
            {/* Hidden actual input */}
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={code}
              onChangeText={updateCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              editable={!loading}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
            />

            <Pressable
              onPress={() => router.back()}
              style={{ marginTop: spacing.xl, alignSelf: 'center' }}
              hitSlop={12}
            >
              <Heading variant="bodyStrong" color="brand">
                Didn't get a code? Change number
              </Heading>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Button
              label="Verify and continue"
              onPress={handleVerify}
              loading={loading}
              disabled={code.length !== 6}
              iconRight="arrow-forward"
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const CELL_SIZE = 50;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1, paddingHorizontal: spacing.xl },
  kb: { flex: 1 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  content: { flex: 1, paddingTop: spacing.xxl },
  cellsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xxxl,
    alignSelf: 'center',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE + 16,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    borderColor: colors.brand,
    backgroundColor: colors.brandFaint,
  },
  cellActive: {
    borderColor: colors.brand,
    backgroundColor: colors.surfaceElevated,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
    top: 100,
  },
  actions: { paddingBottom: spacing.lg },
});

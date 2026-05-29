/**
 * Signup screen — phone entry with country awareness, premium typography.
 */
import { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '../lib/api';
import { colors, radii, spacing, typography } from '../lib/theme';
import { Button } from '../components/ui/Button';
import { Heading } from '../components/ui/Heading';
import { Input } from '../components/ui/Input';

export default function SignupScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('+');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Invalid phone',
        'Please enter your phone in international format (e.g. +905058049749)'
      );
      return;
    }
    setLoading(true);
    try {
      const result = await api.initAuth(phone);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: '/verify',
        params: { phone, sessionId: result.sessionId },
      });
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = (err as Error).message;
      // Friendlier error for Twilio trial whitelist
      if (msg.includes('Failed to send OTP') || msg.includes('unverified')) {
        Alert.alert(
          "We can't send to that number yet",
          'Ping is in beta — only whitelisted phone numbers can receive SMS during testing. Try +447700900001 with code 123456 to demo the app, or ask the team to whitelist your number.'
        );
      } else {
        Alert.alert('Something went wrong', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kb}
        >
          <View style={styles.content}>
            <View style={styles.logoBadge}>
              <Ionicons name="paper-plane" size={28} color={colors.brand} />
            </View>
            <Heading variant="displaySmall">
              What's your{'\n'}phone number?
            </Heading>
            <Heading
              variant="bodyLarge"
              color="secondary"
              style={{ marginTop: spacing.md }}
            >
              We use it to send money to friends and verify it's really you.
            </Heading>

            <View style={{ marginTop: spacing.xxl }}>
              <Input
                label="Phone number"
                value={phone}
                onChangeText={setPhone}
                placeholder="+90 505 804 9749"
                keyboardType="phone-pad"
                autoFocus
                editable={!loading}
                leftIcon="call"
                helper="Include the country code. We'll text you a 6-digit code."
                testID="phone-input"
                accessibilityLabel="Phone number"
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
              />
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              label="Send verification code"
              onPress={handleSubmit}
              loading={loading}
              iconRight="arrow-forward"
            />
            <Heading
              variant="caption"
              color="tertiary"
              align="center"
              style={{ marginTop: spacing.md }}
            >
              By continuing you agree to Ping's Terms and Privacy Policy.
            </Heading>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1, paddingHorizontal: spacing.xl },
  kb: { flex: 1 },
  content: { flex: 1, paddingTop: spacing.xxxl },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.brandMuted,
    borderWidth: 1,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  actions: { paddingBottom: spacing.lg },
});

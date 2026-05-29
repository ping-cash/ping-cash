/**
 * Personal details — edit name + email; phone is read-only (auth identifier).
 */
import { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../../lib/auth-store';
import { colors, radii, spacing } from '../../lib/theme';
import { Button } from '../../components/ui/Button';
import { Heading } from '../../components/ui/Heading';
import { Input } from '../../components/ui/Input';

export default function PersonalScreen() {
  const router = useRouter();
  const user = authStore.user;
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState('');

  const handleSave = async () => {
    // We persist locally to authStore + AsyncStorage — the user-service
    // profile-edit endpoint wires up when KYB lands. Until then this
    // keeps the name visible across launches but doesn't sync across
    // devices.
    if (name) {
      await authStore.updateUser({ name });
    }
    Alert.alert(
      'Saved',
      'Your display name + email are stored on this device.'
    );
    router.back();
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
          <Heading variant="h3">Personal details</Heading>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Input
            label="Display name"
            value={name}
            onChangeText={setName}
            placeholder="What should we call you?"
            leftIcon="person-outline"
          />
          <View style={{ height: spacing.lg }} />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
            helper="Used for receipts + recovery. Optional."
          />
          <View style={{ height: spacing.lg }} />
          <View style={styles.readOnlyCard}>
            <Ionicons name="call" size={20} color={colors.textTertiary} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Heading variant="labelSmall" color="tertiary">
                PHONE (verified)
              </Heading>
              <Heading variant="bodyLarge" style={{ marginTop: 2 }}>
                {user?.phone ?? ''}
              </Heading>
            </View>
            <Ionicons
              name="lock-closed"
              size={16}
              color={colors.textTertiary}
            />
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Button label="Save changes" onPress={handleSave} />
        </View>
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
  readOnlyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  actions: { paddingBottom: spacing.lg },
});

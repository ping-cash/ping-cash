/**
 * Security — Face ID, biometrics, session list.
 */
import { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../lib/theme';
import { Heading } from '../../components/ui/Heading';

export default function SecurityScreen() {
  const router = useRouter();
  const [faceId, setFaceId] = useState(true);
  const [requireBio, setRequireBio] = useState(true);

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
          <Heading variant="h3">Security</Heading>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Heading variant="labelSmall" color="tertiary" style={styles.section}>
            BIOMETRICS
          </Heading>
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="finger-print" size={22} color={colors.brand} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Heading variant="bodyLargeStrong">Face ID / Touch ID</Heading>
                <Heading variant="bodySmall" color="secondary">
                  Unlock the app with biometrics
                </Heading>
              </View>
              <Switch
                value={faceId}
                onValueChange={setFaceId}
                trackColor={{
                  false: colors.surfaceElevated,
                  true: colors.brand,
                }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Ionicons
                name="shield-checkmark"
                size={22}
                color={colors.brand}
              />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Heading variant="bodyLargeStrong">
                  Require for every transfer
                </Heading>
                <Heading variant="bodySmall" color="secondary">
                  Confirm with biometrics on each Send
                </Heading>
              </View>
              <Switch
                value={requireBio}
                onValueChange={setRequireBio}
                trackColor={{
                  false: colors.surfaceElevated,
                  true: colors.brand,
                }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <Heading variant="labelSmall" color="tertiary" style={styles.section}>
            ACCESS
          </Heading>
          <View style={styles.card}>
            <Pressable
              style={styles.row}
              onPress={() =>
                Alert.alert(
                  'Sessions',
                  'Endpoint for revoking other devices ships next iteration.'
                )
              }
            >
              <Ionicons
                name="phone-portrait"
                size={22}
                color={colors.textSecondary}
              />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Heading variant="bodyLarge">Active sessions</Heading>
                <Heading variant="bodySmall" color="secondary">
                  1 device · this iPhone
                </Heading>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textTertiary}
              />
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={styles.row}
              onPress={() =>
                Alert.alert(
                  'Recovery codes',
                  '2-of-3 MPC recovery codes ship after we add the recovery flow on web. Privy holds your shard server-side; this device holds another.'
                )
              }
            >
              <Ionicons name="key" size={22} color={colors.textSecondary} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Heading variant="bodyLarge">Recovery codes</Heading>
                <Heading variant="bodySmall" color="secondary">
                  MPC wallet recovery
                </Heading>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textTertiary}
              />
            </Pressable>
          </View>
        </ScrollView>
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
  scroll: { paddingBottom: spacing.xxxl },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.borderSubtle,
    marginLeft: spacing.huge,
  },
});

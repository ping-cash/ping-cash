/**
 * Ping primary Button — primary/secondary/ghost/whatsapp/subtle variants.
 * Native Pressable + opacity-on-press. No Reanimated wrapping to avoid
 * Animated.createAnimatedComponent(Pressable) + New Architecture crash
 * mode (Reanimated 3.16.x + newArchEnabled=true).
 */
import { ReactNode } from 'react';
import {
  Pressable,
  Text,
  View,
  ViewStyle,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, shadows } from '../../lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'whatsapp' | 'subtle';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  children?: ReactNode;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  iconRight,
  fullWidth = true,
  size = 'lg',
  style,
}: Props) {
  const handlePress = () => {
    if (disabled || loading) return;
    try {
      Haptics.impactAsync(
        variant === 'primary' || variant === 'whatsapp'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      );
    } catch {
      // Haptics on some devices/configs may throw — never block the action.
    }
    onPress();
  };

  const v = variantStyle[variant];
  const sz = sizeStyle[size];

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      testID={`btn-${label}`}
      style={({ pressed }) => [
        styles.base,
        v.container,
        { paddingVertical: sz.padY, paddingHorizontal: sz.padX },
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        variant === 'primary' && shadows.brand,
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color as string} size="small" />
      ) : (
        <View style={styles.inner}>
          {icon && (
            <Ionicons
              name={icon}
              size={sz.icon}
              color={v.text.color}
              style={{ marginRight: spacing.sm }}
            />
          )}
          <Text style={[v.text, { fontSize: sz.text }]}>{label}</Text>
          {iconRight && (
            <Ionicons
              name={iconRight}
              size={sz.icon}
              color={v.text.color}
              style={{ marginLeft: spacing.sm }}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.45 },
});

const variantStyle = {
  primary: {
    container: { backgroundColor: colors.brand },
    text: { color: colors.textInverse, fontWeight: '700' as const },
  },
  secondary: {
    container: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.borderMedium,
    },
    text: { color: colors.textPrimary, fontWeight: '600' as const },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: colors.textSecondary, fontWeight: '600' as const },
  },
  whatsapp: {
    container: { backgroundColor: colors.whatsapp },
    text: { color: '#FFFFFF', fontWeight: '700' as const },
  },
  subtle: {
    container: { backgroundColor: colors.brandMuted },
    text: { color: colors.brand, fontWeight: '600' as const },
  },
} satisfies Record<
  ButtonVariant,
  { container: ViewStyle; text: { color: string; fontWeight: '600' | '700' } }
>;

const sizeStyle = {
  sm: { padY: 10, padX: 16, text: 14, icon: 16 },
  md: { padY: 13, padX: 20, text: 15, icon: 18 },
  lg: { padY: 18, padX: 24, text: 17, icon: 20 },
};

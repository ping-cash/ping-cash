/**
 * Ping text Input — large touch target, focused-state ring, label/helper.
 */
import { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../../lib/theme';

type Props = TextInputProps & {
  label?: string;
  helper?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle;
  size?: 'md' | 'lg' | 'jumbo';
};

export function Input({
  label,
  helper,
  error,
  leftIcon,
  containerStyle,
  size = 'lg',
  ...inputProps
}: Props) {
  const [focused, setFocused] = useState(false);
  const ring = useSharedValue(0);
  const ringStyle = useAnimatedStyle(() => ({
    borderColor: focused ? colors.brand : colors.borderMedium,
    shadowOpacity: ring.value * 0.4,
  }));

  const jumbo = size === 'jumbo';
  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Animated.View
        style={[styles.field, jumbo && styles.fieldJumbo, ringStyle]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={focused ? colors.brand : colors.textTertiary}
            style={{ marginRight: spacing.sm }}
          />
        )}
        <TextInput
          {...inputProps}
          onFocus={e => {
            setFocused(true);
            ring.value = withTiming(1, { duration: 180 });
            inputProps.onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            ring.value = withTiming(0, { duration: 180 });
            inputProps.onBlur?.(e);
          }}
          placeholderTextColor={colors.textQuaternary}
          style={[styles.input, jumbo && styles.inputJumbo, inputProps.style]}
        />
      </Animated.View>
      {error ? (
        <Text style={[styles.helper, styles.error]}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  label: { ...typography.label, color: colors.textSecondary },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    shadowColor: colors.brand,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  fieldJumbo: {
    paddingVertical: 24,
    paddingHorizontal: spacing.xl,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.bodyLarge,
    padding: 0,
  },
  inputJumbo: {
    ...typography.displaySmall,
    color: colors.textPrimary,
  },
  helper: { ...typography.bodySmall, color: colors.textTertiary },
  error: { color: colors.error },
});

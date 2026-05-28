/**
 * Ping text Input — no Reanimated (to avoid new-arch crash). Plain
 * focus-state border swap via React state.
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
  const jumbo = size === 'jumbo';

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.field,
          jumbo && styles.fieldJumbo,
          { borderColor: focused ? colors.brand : colors.borderMedium },
        ]}
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
            inputProps.onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          placeholderTextColor={colors.textQuaternary}
          style={[styles.input, jumbo && styles.inputJumbo, inputProps.style]}
        />
      </View>
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

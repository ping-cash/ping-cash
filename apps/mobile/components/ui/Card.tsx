/**
 * Ping Card — elevated surface with consistent radius + shadow + padding.
 * Used as the visual container for balance, activity rows, settings sections.
 */
import { ReactNode } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { colors, radii, spacing, shadows } from '../../lib/theme';

type Props = {
  children: ReactNode;
  variant?: 'flat' | 'elevated' | 'brand' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: ViewStyle;
};

export function Card({
  children,
  variant = 'flat',
  padding = 'lg',
  style,
}: Props) {
  const padValue =
    padding === 'none'
      ? 0
      : padding === 'sm'
        ? spacing.md
        : padding === 'md'
          ? spacing.lg
          : spacing.xl;
  return (
    <View
      style={[styles.base, variantStyle[variant], { padding: padValue }, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
  },
});

const variantStyle = {
  flat: {
    backgroundColor: colors.surface,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
    ...shadows.md,
  },
  brand: {
    backgroundColor: colors.brandMuted,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderMedium,
  },
} satisfies Record<string, ViewStyle>;

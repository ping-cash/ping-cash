/**
 * Ping Heading + Text helpers. Eliminates inline typography styles.
 */
import { Text, TextStyle, StyleProp } from 'react-native';
import { colors, typography } from '../../lib/theme';

type Variant = keyof typeof typography;
type ColorKey =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'brand'
  | 'inverse'
  | 'error';

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  color?: ColorKey;
  align?: 'left' | 'center' | 'right';
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

const colorMap: Record<ColorKey, string> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  tertiary: colors.textTertiary,
  brand: colors.brand,
  inverse: colors.textInverse,
  error: colors.error,
};

export function Heading({
  children,
  variant = 'h2',
  color = 'primary',
  align,
  style,
  numberOfLines,
}: Props) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        typography[variant],
        { color: colorMap[color] },
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

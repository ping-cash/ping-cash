/**
 * $PING token mark — a distinct visual signal for the loyalty/governance
 * token, deliberately separate from the company Ping brand mark.
 *
 * Founder feedback on #87 (2026-05-29): "'$PING' as text in the dashboard's
 * balance card looks ugly. Either use the Ping logo or design a distinct
 * signal mark for $PING separate from the company brand." This component is
 * the latter — a token chip that visually distinguishes $PING (the asset)
 * from Ping (the company), the way exchanges differentiate coin icons from
 * the venue brand.
 *
 * Used in the home dashboard balance pill ("12 $PING" → "12 [P]") and in
 * the promo banner ("Earn 1,200 $PING").
 */
import { View, StyleSheet } from 'react-native';
import { colors, radii } from '../../lib/theme';
import { Heading } from './Heading';

interface Props {
  /** Total height of the badge. Width auto-scales. Default 18. */
  size?: number;
  /** Show the "$PING" wordmark next to the badge. Default false. */
  showWordmark?: boolean;
  /** Override the accent color (defaults to brand). Use for inverted bg. */
  tint?: string;
}

export function PingTokenMark({
  size = 18,
  showWordmark = false,
  tint,
}: Props) {
  const color = tint ?? colors.brand;
  return (
    <View style={styles.row}>
      <View
        style={[
          styles.badge,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
            backgroundColor: color + '22',
          },
        ]}
      >
        <Heading
          variant="caption"
          style={[styles.glyph, { color, fontSize: Math.round(size * 0.55) }]}
        >
          P
        </Heading>
      </View>
      {showWordmark ? (
        <Heading
          variant="bodySmall"
          color="secondary"
          style={{ marginLeft: 6 }}
        >
          $PING
        </Heading>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  badge: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  glyph: {
    fontWeight: '800',
    lineHeight: undefined,
  },
});

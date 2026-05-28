/**
 * RootErrorBoundary — catches React render/lifecycle errors so they don't
 * propagate up to React Native's global error handler (which would call
 * RCTExceptionsManager.reportException → fatal abort).
 *
 * On error, renders a minimal recovery UI with a reset button.
 */
import { Component, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../lib/theme';

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error): void {
    try {
      // eslint-disable-next-line no-console
      console.warn('[RootErrorBoundary caught]', error?.message, error?.stack);
    } catch {
      // ignore
    }
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.fallback}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle} numberOfLines={4}>
            {this.state.error?.message ?? 'Unknown error'}
          </Text>
          <Pressable onPress={this.reset} style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 22,
  },
  button: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: radii.full,
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: 17,
    fontWeight: '700',
  },
});

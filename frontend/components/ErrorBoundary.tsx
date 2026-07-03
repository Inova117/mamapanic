// ─────────────────────────────────────────────────────────────────────────────
// Root ErrorBoundary — prevents a single render error from white-screening the
// app for an already-distressed mother. Renders a calm, self-contained fallback
// (no external context/data dependencies) with a gentle breathing cue and a
// retry action, and reports the error to Sentry.
//
// NOTE (Phase 4): real crisis escalation (regional hotlines + emergency call)
// will be added to this fallback so help is reachable even when the app crashes.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { colors, fontSize, spacing, borderRadius, touchTarget } from '../theme/theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  // Core Animated value for the breathing cue (intentionally NOT reanimated,
  // to keep the fallback dependency-light and crash-proof).
  private breathe = new Animated.Value(0);
  private loop?: Animated.CompositeAnimation;

  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    try {
      Sentry.captureException(error, {
        contexts: { react: { componentStack: info?.componentStack ?? 'n/a' } },
        tags: { boundary: 'root' },
      });
    } catch {
      // Never let error reporting throw inside the boundary.
    }
  }

  componentDidUpdate(_prev: Props, prevState: State) {
    if (this.state.hasError && !prevState.hasError) {
      this.startBreathing();
    }
  }

  componentWillUnmount() {
    this.loop?.stop();
  }

  private startBreathing() {
    this.loop?.stop();
    this.breathe.setValue(0);
    this.loop = Animated.loop(
      Animated.sequence([
        Animated.timing(this.breathe, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(this.breathe, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    this.loop.start();
  }

  private handleReset = () => {
    this.loop?.stop();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const scale = this.breathe.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.1] });
    const opacity = this.breathe.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] });

    return (
      <View style={styles.container} accessibilityRole="alert">
        <View style={styles.circleWrap}>
          <Animated.View style={[styles.circle, { transform: [{ scale }], opacity }]} />
          <Text style={styles.breatheLabel}>Respira</Text>
        </View>

        <Text style={styles.title} accessibilityRole="header">
          Estamos contigo
        </Text>
        <Text style={styles.message}>
          Algo falló por un momento, pero tú estás a salvo.{'\n'}
          Respira hondo. No es tu culpa.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={this.handleReset}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Reintentar y volver a la app"
        >
          <Text style={styles.buttonText}>Reintentar</Text>
        </TouchableOpacity>

        {!!this.state.error && (
          <Text style={styles.errText} selectable>
            {String((this.state.error && this.state.error.message) || this.state.error)}
          </Text>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    // Manual top padding so we don't depend on SafeAreaProvider being mounted.
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  circleWrap: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  circle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: borderRadius.full,
    backgroundColor: colors.breathing.inhale,
  },
  breatheLabel: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.accent.sage,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.md,
    minHeight: touchTarget.comfortable,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  errText: {
    marginTop: spacing.lg,
    fontSize: fontSize.xs,
    color: colors.text.muted,
    textAlign: 'center',
    maxWidth: 320,
  },
});

export default ErrorBoundary;

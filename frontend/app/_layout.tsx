import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/theme';
import ErrorBoundary from '../components/ErrorBoundary';
import * as Sentry from '@sentry/react-native';

const SENTRY_DSN =
  process.env.EXPO_PUBLIC_SENTRY_DSN ||
  'https://d8a4b4e58e84c2cb62ce55f0e7958c89@o4508888147623937.ingest.us.sentry.io/4510757508349952';
const SENTRY_ENV =
  process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || (__DEV__ ? 'development' : 'production');

// PRIVACY (mental-health app): we must NOT auto-collect PII and must NEVER
// record a distressed mother's screen. Therefore:
//   - sendDefaultPii: false  (was true — stops IP/cookies/user auto-capture)
//   - NO session replay      (mobileReplayIntegration removed)
//   - enableLogs removed     (stops shipping console logs that contain PII)
//   - `integrations` is intentionally OMITTED so Sentry's DEFAULT integrations
//     (error/native handlers) stay active WITHOUT the replay integration.
//     Passing `integrations: []` would wipe the defaults and break capture.
//   - disabled in local development (__DEV__).
Sentry.init({
  dsn: SENTRY_DSN,
  environment: SENTRY_ENV,
  enabled: !__DEV__,
  sendDefaultPii: false,
  tracesSampleRate: SENTRY_ENV === 'production' ? 0.2 : 1.0,
  beforeSend(event) {
    if (event.user) {
      delete event.user.ip_address;
      delete (event.user as { email?: string }).email;
    }
    if (event.request) {
      delete event.request.cookies;
      delete (event.request as { data?: unknown }).data;
    }
    return event;
  },
  ignoreErrors: ['Network request failed', 'Failed to fetch', 'Rate limit exceeded'],
});

// Inner shell: renders the navigator always (so routing stays mounted) and
// overlays a calm splash while the auth session is resolving — this hides the
// login-screen flash that used to appear on every cold start.
function AppShell() {
  const { isLoading } = useAuth();
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor={colors.background.primary} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background.primary },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        {isLoading && (
          <View style={styles.splash}>
            <Ionicons name="heart" size={56} color={colors.accent.terracotta} />
            <ActivityIndicator color={colors.accent.sage} style={{ marginTop: 20 }} />
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ErrorBoundary>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || 'development';
const SENTRY_ENABLED = process.env.EXPO_PUBLIC_SENTRY_ENABLED === 'true';

/**
 * Initialize Sentry for error tracking and performance monitoring
 * Only enabled in production by default
 */
export function initSentry() {
    if (!SENTRY_ENABLED || !SENTRY_DSN) {
        console.log('Sentry not enabled or DSN not configured');
        return;
    }

    Sentry.init({
        dsn: SENTRY_DSN,
        environment: SENTRY_ENVIRONMENT,

        // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
        // We recommend adjusting this value in production
        tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.2 : 1.0,

        // Enable tracking of performance
        enableAutoSessionTracking: true,

        // Session timeout in milliseconds
        sessionTrackingIntervalMillis: 30000,

        // Capture user interactions
        enableNative: true,
        enableNativeNagger: false,

        // Filter out sensitive data
        beforeSend(event) {
            // Don't send events in development unless explicitly enabled
            if (SENTRY_ENVIRONMENT === 'development' && !SENTRY_ENABLED) {
                return null;
            }

            // Remove sensitive user data
            if (event.user) {
                delete event.user.ip_address;
                delete event.user.email;
            }

            return event;
        },

        // Ignore specific errors
        ignoreErrors: [
            // Network errors
            'Network request failed',
            'Failed to fetch',
            // Groq API quota errors (expected in free tier)
            'Rate limit exceeded',
            // Expo development errors
            'Expo pops',
        ],
    });

    console.log(`Sentry initialized for ${SENTRY_ENVIRONMENT} environment`);
}

/**
 * Capture a custom error
 */
export function captureError(error: Error, context?: Record<string, any>) {
    if (!SENTRY_ENABLED) {
        console.error('Error (Sentry disabled):', error, context);
        return;
    }

    Sentry.captureException(error, {
        extra: context,
    });
}

/**
 * Capture a custom message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
    if (!SENTRY_ENABLED) {
        console.log(`Message (Sentry disabled) [${level}]:`, message);
        return;
    }

    Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUser(userId: string, email?: string, username?: string) {
    if (!SENTRY_ENABLED) return;

    Sentry.setUser({
        id: userId,
        username: username || email,
        // Don't send email to Sentry for privacy
    });
}

/**
 * Clear user context
 */
export function clearUser() {
    if (!SENTRY_ENABLED) return;

    Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
    if (!SENTRY_ENABLED) return;

    Sentry.addBreadcrumb({
        message,
        category,
        data,
        level: 'info',
    });
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, operation: string) {
    if (!SENTRY_ENABLED) return null;

    return Sentry.startTransaction({
        name,
        op: operation,
    });
}

export default Sentry;

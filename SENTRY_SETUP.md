# Sentry Setup for Error Tracking & Analytics

## What is Sentry?

Sentry provides:
- 🐛 **Error tracking** - Catch and fix bugs in production
- 📊 **Performance monitoring** - Track slow API calls and renders
- 👤 **User insights** - See which users are affected
- 📱 **Session replay** - Understand user flows
- 🔔 **Alerts** - Get notified of critical errors

## Setup Instructions (5 minutes)

### 1. Create Sentry Account

1. Go to https://sentry.io
2. Sign up (free tier: 5,000 errors/month)
3. Create new project
   - Platform: **React Native**
   - Name: **mamapanic**

### 2. Get Your DSN

1. After project creation, you'll see the DSN
2. Or go to: Settings → Projects → mamapanic → Client Keys (DSN)
3. Copy the DSN (looks like: `https://abc123@o123456.ingest.sentry.io/789012`)

### 3. Configure Environment

Add to `frontend/.env`:

```bash
# Sentry Configuration
EXPO_PUBLIC_SENTRY_DSN=https://your-public-key@o123456.ingest.sentry.io/project-id
EXPO_PUBLIC_SENTRY_ENVIRONMENT=development
EXPO_PUBLIC_SENTRY_ENABLED=true  # Set to false in development if you don't want errors sent
```

### 4. Initialize in Your App

In your `App.tsx` or `_layout.tsx`:

```typescript
import { initSentry } from './lib/sentry';

// Initialize Sentry before anything else
initSentry();

export default function App() {
  // Your app code
}
```

### 5. Update app.json (Optional - for Source Maps)

Add to `frontend/app.json`:

```json
{
  "expo": {
    "hooks": {
      "postPublish": [
        {
          "file": "sentry-expo/upload-sourcemaps",
          "config": {
            "organization": "your-org-name",
            "project": "mamapanic"
          }
        }
      ]
    }
  }
}
```

## Usage Examples

### Automatic Error Tracking

Sentry automatically catches:
- Unhandled exceptions
- Promise rejections
- React errors
- Native crashes

```typescript
// This error will automatically be caught
throw new Error('Something went wrong!');
```

### Manual Error Tracking

```typescript
import { captureError, captureMessage } from './lib/sentry';

// Capture an error with context
try {
  await someOperation();
} catch (error) {
  captureError(error as Error, {
    operation: 'create_checkin',
    userId: user.id,
  });
}

// Capture a message
captureMessage('User completed onboarding', 'info');
```

### Set User Context

```typescript
import { setUser, clearUser } from './lib/sentry';

// When user logs in
setUser(user.id, user.email, user.name);

// When user logs out
clearUser();
```

### Add Breadcrumbs

Track user actions leading up to an error:

```typescript
import { addBreadcrumb } from './lib/sentry';

addBreadcrumb('User clicked crisis mode button', 'user', {
  mood: currentMood,
  time: new Date().toISOString(),
});
```

### Performance Monitoring

```typescript
import { startTransaction } from './lib/sentry';

const transaction = startTransaction('AI Response', 'ai.chat');

// Your operation
const response = await getChatResponse(message);

transaction?.finish();
```

## What Sentry Tracks

### Errors Tracked
- ✅ JavaScript errors
- ✅ Unhandled promise rejections
- ✅ React component errors
- ✅ API call failures
- ✅ Native crashes

### Performance Metrics
- ✅ API response times (Supabase, Groq)
- ✅ Screen load times
- ✅ Component render times
- ✅ Database query performance

### Ignored Errors (Pre-configured)

We automatically filter out:
- Network timeout errors (expected)
- Groq rate limit errors (free tier)
- Development-only errors

## Sentry Dashboard

### Key Features

1. **Issues Tab**
   - See all errors grouped by type
   - Click to see stack trace and context
   - Mark as resolved when fixed

2. **Performance Tab**
   - See slow API calls
   - Identify performance bottlenecks
   - Track trends over time

3. **Releases Tab**
   - Track errors by app version
   - See when new errors were introduced

4. **Alerts**
   - Set up notifications for critical errors
   - Email, Slack, Discord, etc.

## Best Practices

### Development
```bash
# Keep Sentry disabled in development
EXPO_PUBLIC_SENTRY_ENABLED=false
```

### Staging
```bash
# Enable Sentry but separate environment
EXPO_PUBLIC_SENTRY_ENVIRONMENT=staging
EXPO_PUBLIC_SENTRY_ENABLED=true
```

### Production
```bash
# Always enable in production
EXPO_PUBLIC_SENTRY_ENVIRONMENT=production
EXPO_PUBLIC_SENTRY_ENABLED=true
```

## Privacy Considerations

Our Sentry configuration:
- ❌ **Does NOT send** email addresses
- ❌ **Does NOT send** IP addresses
- ❌ **Does NOT send** personal health data
- ✅ **Only sends** anonymous user IDs
- ✅ **Only sends** error stack traces
- ✅ **Filters** sensitive data

## Cost

### Free Tier
- 5,000 errors/month
- 10,000 performance units/month
- 1 project
- 7-day event retention

### Team Plan ($26/month)
- 50,000 errors/month
- 100,000 performance units/month
- Unlimited projects
- 90-day event retention

**Recommendation:** Start with free tier, upgrade if needed.

## Testing Sentry

### Test Error Capture

```typescript
import { captureError } from './lib/sentry';

// Test button in your app
<Button onPress={() => {
  captureError(new Error('Test error from button'), {
    test: true,
  });
}} title="Test Sentry" />
```

### Verify in Dashboard

1. Go to https://sentry.io
2. Open your project
3. Check Issues tab
4. You should see the test error

## Troubleshooting

### Errors not showing up

1. Check `EXPO_PUBLIC_SENTRY_ENABLED=true` in `.env`
2. Verify DSN is correct
3. Check Sentry initialization happened before error
4. Look for console message: "Sentry initialized for X environment"

### Too many errors

1. Adjust sample rate in `lib/sentry.ts`:
   ```typescript
   tracesSampleRate: 0.1, // Only 10% of errors
   ```

2. Add more ignore patterns:
   ```typescript
   ignoreErrors: [
     'Network request failed',
     'Your pattern here',
   ]
   ```

## Resources

- **Sentry Docs**: https://docs.sentry.io/platforms/react-native/
- **Expo + Sentry**: https://docs.expo.dev/guides/using-sentry/
- **Sentry Dashboard**: https://sentry.io/organizations/your-org/issues/

## Next Steps

1. Create Sentry account
2. Get DSN
3. Update `.env`
4. Initialize in app
5. Test with sample error
6. Monitor dashboard

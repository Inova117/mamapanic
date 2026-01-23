# MAMÁ RESPIRA - Supabase + Groq Edition

Mental health app for anxious first-time mothers.

## Stack

- **Frontend**: React Native (Expo)
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **AI**: Groq (Llama 3.1 70B - Fast & Cheap)
- **Analytics**: Sentry (Error tracking)

## Quick Start

### 1. Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Supabase account (free): https://supabase.com
- Groq API key (free): https://console.groq.com

### 2. Setup (30 minutes)

Follow these guides in order:

1. **[SUPABASE_SETUP.md](SUPABASE_SETUP.md)** - Set up database and auth (15 min)
2. **[SENTRY_SETUP.md](SENTRY_SETUP.md)** - Set up error tracking (5 min, optional)
3. Configure frontend (10 min)

### 3. Install & Run

```bash
cd frontend

# Copy environment template
cp .env.example .env

# Edit .env with your keys (see .env.example for format)

# Install dependencies
npm install

# Run the app
npm start
```

## Environment Variables

All configuration is in `frontend/.env`:

```bash
# Supabase (required)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Groq AI (required)
EXPO_PUBLIC_GROQ_API_KEY=gsk_...

# Sentry (optional)
EXPO_PUBLIC_SENTRY_DSN=https://...
EXPO_PUBLIC_SENTRY_ENABLED=true
```

See `frontend/.env.example` for detailed format examples.

## Cost Breakdown

### Free Tier (Development)
- **Supabase**: Free (500MB DB, 2GB bandwidth)
- **Groq**: Free (30 req/min, unlimited total)
- **Sentry**: Free (5,000 errors/month)
- **Total**: $0/month 💰

### Production (1,000 active users)
- **Supabase Pro**: $25/month
- **Groq**: $0-5/month
- **Sentry**: Free tier sufficient
- **Total**: ~$30/month 💰

## Features

- ✅ Crisis Mode with breathing exercises
- ✅ Daily check-ins with AI validation
- ✅ Chat with "Abuela Sabia" (empathetic AI)
- ✅ Sleep coach bitácora (daily logs)
- ✅ Validation cards
- ✅ Community presence simulation
- ✅ Coach messaging (premium)
- ✅ Real-time updates
- ✅ Error tracking with Sentry

## Project Structure

```
mamapanic/
├── frontend/                    # React Native Expo app
│   ├── app/                    # Expo Router pages
│   ├── components/             # React components
│   ├── lib/
│   │   ├── supabase.ts        # Supabase client
│   │   └── sentry.ts          # Sentry config
│   ├── services/
│   │   ├── api.ts             # API calls to Supabase
│   │   └── groq.ts            # AI service (Groq)
│   ├── .env                   # Your config (DO NOT COMMIT)
│   └── .env.example           # Template
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Database schema
├── SUPABASE_SETUP.md          # Setup guide
├── SENTRY_SETUP.md            # Error tracking guide
└── README.md                  # This file
```

## Development Workflow

```bash
# Start Expo dev server
cd frontend && npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

## Testing

### Test Supabase Connection
```typescript
import { supabase } from './lib/supabase'
const { data } = await supabase.from('validation_cards').select('*').limit(1)
console.log(data) // Should show a validation card
```

### Test Groq AI
```typescript
import { getChatResponse } from './services/groq'
const response = await getChatResponse('Hola, ¿cómo estás?')
console.log(response) // Should get Spanish response
```

### Test Sentry
```typescript
import { captureMessage } from './lib/sentry'
captureMessage('Test from app', 'info')
// Check Sentry dashboard for the message
```

## Deployment

### Frontend (Expo EAS)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Backend
✅ **No deployment needed!** Supabase handles everything.

## Troubleshooting

### "Invalid API key" (Supabase)
- Check you copied the **anon** key, not service role key
- Restart Expo: `npm start -- --clear`

### "Invalid API key" (Groq)
- Verify key starts with `gsk_`
- Keys expire after 90 days - generate new one

### AI responses are slow
- Groq should be very fast (~500 tokens/sec)
- Check internet connection

### Database errors
- Verify RLS policies are set up (re-run SQL schema)
- Check user is authenticated

## Support

- **Supabase**: https://supabase.com/docs
- **Groq**: https://console.groq.com/docs
- **Sentry**: https://docs.sentry.io
- **Expo**: https://docs.expo.dev

## License

[Your License]

---

**Note**: If you see a `backend_old_self_hosted` folder, that's from an earlier architecture. You can safely delete it - we're using Supabase now!

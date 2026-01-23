# MAMÁ RESPIRA - Supabase + Groq Setup Guide

## Quick Start

### 1. Create Supabase Project (10 minutes)

1. Go to https://supabase.com
2. Sign up / Log in
3. Click "New Project"
4. Fill in:
   - **Name**: mamapanic
   - **Database Password**: (generate a strong password)
   - **Region**: Choose closest to your users
5. Wait for project to initialize (~2 minutes)

### 2. Run Database Schema (5 minutes)

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Click "Run" or press Cmd/Ctrl + Enter
5. Verify tables created: Go to **Table Editor** and you should see:
   - profiles
   - validation_cards
   - checkins
   - chat_messages
   - direct_messages
   - bitacoras

### 3. Get Supabase Credentials (2 minutes)

1. Go to **Project Settings** (gear icon) → **API**
2. Copy these values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (starts with `eyJ...`)

### 4. Get Groq API Key (5 minutes)

1. Go to https://console.groq.com
2. Sign up / Log in (free)
3. Go to **API Keys**
4. Click "Create API Key"
5. Name it "mamapanic"
6. Copy the key (starts with `gsk_...`)

**Free Tier**: 30 requests/minute, unlimited usage!

### 5. Set Up Sentry (Optional - 5 minutes)

Sentry provides error tracking and performance monitoring.

1. Go to https://sentry.io
2. Sign up / Log in (free tier: 5,000 errors/month)
3. Create new project:
   - Platform: **React Native**
   - Name: **mamapanic**
4. Copy the **DSN** (looks like: `https://abc@o123.ingest.sentry.io/456`)

**Free Tier**: 5,000 errors/month, performance monitoring included!

See [`SENTRY_SETUP.md`](SENTRY_SETUP.md) for detailed configuration.

### 6. Configure Frontend (2 minutes)

```bash
cd frontend

# Copy environment template
cp .env.example .env

# Edit .env and add your credentials:
# EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# EXPO_PUBLIC_GROQ_API_KEY=gsk_...
# EXPO_PUBLIC_SENTRY_DSN=https://...  (optional)
# EXPO_PUBLIC_SENTRY_ENABLED=true     (optional)
```

### 7. Install Dependencies (2 minutes)

```bash
# Install Supabase, Groq, and Sentry SDKs
npm install @supabase/supabase-js groq-sdk @sentry/react-native sentry-expo

# Or with yarn
yarn add @supabase/supabase-js groq-sdk @sentry/react-native sentry-expo
```

### 8. Test the Setup (5 minutes)

```bash
# Start Expo
npm start
```

You should be able to:
- ✅ Register a new user
- ✅ Login
- ✅ Get validation cards
- ✅ Create check-ins with AI responses
- ✅ Chat with Abuela Sabia

---

## Verification Checklist

### Database Setup
- [ ] Supabase project created
- [ ] All 6 tables created (profiles, validation_cards, checkins, chat_messages, direct_messages, bitacoras)
- [ ] 15 validation cards inserted
- [ ] RLS policies enabled
- [ ] Triggers created (profile auto-creation, updated_at)

### API Keys
- [ ] Supabase URL copied
- [ ] Supabase anon key copied
- [ ] Groq API key obtained
- [ ] All keys added to `frontend/.env`

### Frontend
- [ ] Dependencies installed
- [ ] Supabase client initialized
- [ ] Groq service created
- [ ] Environment variables configured

---

## Testing the Backend

### Test 1: Authentication

```typescript
// Register
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'test123456',
  options: {
    data: { name: 'Test User' }
  }
})

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'test123456',
})
```

### Test 2: Get Validation Cards

```typescript
const { data, error } = await supabase
  .from('validation_cards')
  .select('*')
  .limit(1)
  .single()

console.log(data.message_es) // Should print a validation message in Spanish
```

### Test 3: Create Check-in with AI

```typescript
import { getValidationResponse } from './services/groq'

const aiResponse = await getValidationResponse(1, 'No dormí nada anoche')
console.log(aiResponse) // Should be empathetic Spanish response

const { data, error } = await supabase
  .from('checkins')
  .insert([{
    mood: 1,
    brain_dump: 'No dormí nada anoche',
    ai_response: aiResponse
  }])
  .select()
  .single()
```

### Test 4: Chat with AI

```typescript
import { getChatResponse } from './services/groq'

const response = await getChatResponse('Estoy muy cansada')
console.log(response) // Should be Abuela Sabia response in Spanish
```

---

## Troubleshooting

### "Invalid API key" error (Supabase)
- Double-check you copied the **anon public** key, not the service role key
- Make sure there are no extra spaces in `.env` file
- Restart Expo after changing `.env`: `npm start -- --clear`

### "Invalid API key" error (Groq)
- Verify the key starts with `gsk_`
- Groq keys expire after 90 days - generate a new one
- Check you're within free tier limits (30 req/min)

### "Row Level Security" error
- RLS policies might not be set up correctly
- Re-run the SQL schema (it's idempotent)
- Check in Supabase → Authentication → Policies

### AI responses are slow
- Groq is usually very fast (~500 tokens/sec)
- Check your internet connection
- Verify you're using `llama-3.1-70b-versatile` model

### Profile not created on signup
- Check the `handle_new_user()` trigger exists
- Go to Database → Triggers in Supabase dashboard
- Manually insert profile if needed

---

## Next Steps

Once setup is complete:

1. **Update AuthContext** to use Supabase auth
2. **Update all API calls** to use Supabase instead of old backend
3. **Test all features** end-to-end
4. **Deploy** - Expo handles the app, Supabase handles the backend!

---

## Cost Estimate

### Free Tier (Perfect for Development & Small Scale)
- **Supabase Free**: Up to 500MB database, 2GB bandwidth, 50MB file storage
- **Groq Free**: 30 requests/minute, unlimited total requests
- **Total**: $0/month

### Production (1,000 active users)
- **Supabase Pro**: $25/month (8GB database, 250GB bandwidth)
- **Groq**: $0-5/month (pay only for what you use beyond free tier)
- **Total**: $25-30/month

**Savings vs self-hosted**: ~$240/month! 💰

---

## Resources

- **Supabase Docs**: https://supabase.com/docs
- **Groq Docs**: https://console.groq.com/docs
- **Supabase Auth**: https://supabase.com/docs/guides/auth
- **Groq Models**: https://console.groq.com/docs/models

---

## Support

If you run into issues:
1. Check Supabase logs: Dashboard → Logs
2. Check Groq usage: console.groq.com
3. Test API calls in Supabase API Docs (built-in testing UI)

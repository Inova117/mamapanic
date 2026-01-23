# ⚠️ THIS FOLDER IS OBSOLETE ⚠️

This folder contains the **self-hosted backend** implementation (FastAPI + MongoDB + Claude).

**We are NOT using this approach!**

Instead, we're using:
- ✅ **Supabase** for backend (database + auth)
- ✅ **Groq** for AI (much cheaper and faster)

This folder is kept for reference only. You can safely delete it.

## What to Use Instead

Everything you need is in:
- `frontend/.env` - Configuration file (Supabase + Groq + Sentry)
- `supabase/migrations/` - Database schema
- `frontend/lib/supabase.ts` - Supabase client
- `frontend/services/groq.ts` - AI service

See `SUPABASE_SETUP.md` for setup instructions.

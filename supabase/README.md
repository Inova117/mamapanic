# Supabase setup — Mamá Respira

## Fresh install (current path)

The backend was rebuilt from scratch. **Run only one file** on the new project:

1. Open the new Supabase project → **SQL Editor**.
2. Paste and run [`schema_complete.sql`](./schema_complete.sql).

That single script creates everything — tables, indexes, RLS policies (security-
hardened), triggers, the storage buckets + policies, the rate-limit / audit
functions, and seeds the validation cards. It is **idempotent** (safe to re-run).

After it runs, promote your coach account (sign up in the app first):

```sql
UPDATE profiles SET role = 'coach' WHERE email = 'TU_COACH@ejemplo.com';
```

## `migrations/` folder

`migrations/001_*`…`007_*` are the **historical** incremental migrations from the
previous (deleted) backend. They are kept for reference only and are **superseded
by `schema_complete.sql`**. Do not run them on the fresh project — running both
would conflict (duplicate tables/policies).

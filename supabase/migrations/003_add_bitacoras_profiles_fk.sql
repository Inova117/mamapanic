-- Add foreign key relationship between bitacoras and profiles
-- This allows Supabase to perform JOINs in queries

-- Since bitacoras.user_id already references auth.users,
-- and profiles.id also references auth.users,
-- we need to add an explicit foreign key to profiles

-- First, let's add a foreign key constraint
-- Note: This assumes all user_ids in bitacoras already exist in profiles
ALTER TABLE bitacoras
  ADD CONSTRAINT bitacoras_user_id_fkey_profiles
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- Add index for better JOIN performance
CREATE INDEX IF NOT EXISTS bitacoras_user_id_profiles_idx ON bitacoras(user_id);

-- Migration to add night_wakings JSONB array to bitacoras table
ALTER TABLE bitacoras ADD COLUMN IF NOT EXISTS night_wakings JSONB;

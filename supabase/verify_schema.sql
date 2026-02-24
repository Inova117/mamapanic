-- Script de verificación del esquema de bitácoras
-- Ejecuta esto en Supabase SQL Editor para verificar que todo esté correcto

-- 1. Verificar que la tabla bitacoras existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'bitacoras'
) AS bitacoras_table_exists;

-- 2. Verificar todas las columnas de la tabla bitacoras
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'bitacoras'
ORDER BY ordinal_position;

-- 3. Verificar que la columna night_wakings existe y es JSONB
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'bitacoras'
AND column_name = 'night_wakings';

-- 4. Verificar políticas RLS para bitacoras
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'bitacoras';

-- 5. Verificar que los índices existen
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'bitacoras';

-- 6. Contar bitácoras existentes
SELECT COUNT(*) as total_bitacoras FROM bitacoras;

-- 7. Verificar estructura de una bitácora de ejemplo (si existe)
SELECT 
  id,
  user_id,
  day_number,
  date,
  nap_1_duration_minutes,
  nap_2_duration_minutes,
  nap_3_duration_minutes,
  night_wakings,
  baby_mood,
  number_of_wakings,
  ai_summary,
  created_at
FROM bitacoras
ORDER BY created_at DESC
LIMIT 1;

-- 8. Verificar que los buckets de storage existen
SELECT name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name IN ('avatars', 'message-attachments');

-- 9. Verificar políticas de storage
SELECT policyname, bucket_id, permissive, roles, cmd
FROM storage.policies
ORDER BY bucket_id, policyname;

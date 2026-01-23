-- ==================== CREATE COACH ACCOUNT ====================
-- Run this SQL in Supabase SQL Editor AFTER creating the coach user via signup

-- Step 1: The coach should first register normally in the app
-- Step 2: Then run this SQL to upgrade their account to coach role

-- Update user role to coach (replace with actual coach email)
UPDATE profiles
SET role = 'coach'
WHERE email = 'coach@mamarespira.com'; -- Change this to your coach's email

-- Verify the update
SELECT id, email, name, role, created_at
FROM profiles
WHERE role = 'coach';

-- ==================== ALTERNATIVE: Create Coach Directly ====================
-- If you want to create the coach account directly via SQL:

-- 1. First, create the auth user (you'll need to do this via Supabase Dashboard or app signup)
-- 2. Then update the profile:

/*
-- Example: Update existing user to coach
UPDATE profiles
SET role = 'coach'
WHERE email = 'tu-coach@ejemplo.com';

-- Or if you know the user_id:
UPDATE profiles
SET role = 'coach'
WHERE id = 'uuid-del-usuario-aqui';
*/

-- ==================== VERIFY COACH PERMISSIONS ====================
-- Check that coach can see all bitacoras (RLS policy test)
SELECT 
  b.id,
  b.user_id,
  b.date,
  b.ai_summary,
  p.name as user_name,
  p.email as user_email
FROM bitacoras b
JOIN profiles p ON p.id = b.user_id
ORDER BY b.created_at DESC
LIMIT 10;

-- This query should work when run by a coach user

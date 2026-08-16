-- Fix demo user email confirmation & identities for instant login in new Supabase project

-- 1. Auto-confirm demo users in auth.users (email_confirmed_at updates generated confirmed_at automatically)
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  role = 'authenticated',
  aud = 'authenticated'
WHERE email IN ('admin@example.com', 'guru@example.com');

-- 2. Insert missing identities for demo users so GoTrue allows password auth
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  id,
  id AS user_id,
  jsonb_build_object('sub', id::text, 'email', email),
  'email',
  email AS provider_id,
  now(),
  now(),
  now()
FROM auth.users
WHERE email IN ('admin@example.com', 'guru@example.com')
ON CONFLICT (provider_id, provider) DO UPDATE
SET identity_data = EXCLUDED.identity_data,
    updated_at = now();

-- 3. Execute setup_demo_user for both admin and guru
DO $$
BEGIN
  PERFORM public.setup_demo_user('admin@example.com');
  PERFORM public.setup_demo_user('guru@example.com');
END $$;

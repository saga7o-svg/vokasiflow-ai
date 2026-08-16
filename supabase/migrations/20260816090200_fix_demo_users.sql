-- Ensure all existing demo users in auth.users are confirmed and have identity records

UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  role = 'authenticated',
  aud = 'authenticated'
WHERE email IN ('admin@example.com', 'guru@example.com');

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

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT email FROM auth.users WHERE email IN ('admin@example.com', 'guru@example.com') LOOP
    PERFORM public.setup_demo_user(r.email);
  END LOOP;
END $$;

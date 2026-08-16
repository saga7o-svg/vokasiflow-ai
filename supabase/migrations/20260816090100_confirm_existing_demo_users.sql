-- 1. Confirm any existing demo users in auth.users
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  role = 'authenticated',
  aud = 'authenticated'
WHERE email IN ('admin@example.com', 'guru@example.com');

-- 2. Ensure auth.identities exists for demo users
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

-- 3. Trigger to automatically insert identity for demo users on signup/insert
CREATE OR REPLACE FUNCTION public.auto_confirm_demo_users()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IN ('admin@example.com', 'guru@example.com') THEN
    NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
    NEW.role = 'authenticated';
    NEW.aud = 'authenticated';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.auto_create_demo_identity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IN ('admin@example.com', 'guru@example.com') THEN
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    )
    VALUES (
      NEW.id, NEW.id, jsonb_build_object('sub', NEW.id::text, 'email', NEW.email), 'email', NEW.email, now(), now(), now()
    )
    ON CONFLICT (provider_id, provider) DO UPDATE SET updated_at = now();
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_after_insert_identity ON auth.users;
CREATE TRIGGER on_auth_user_after_insert_identity
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.auto_create_demo_identity();

-- 4. Setup profile & roles for all existing demo users
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT email FROM auth.users WHERE email IN ('admin@example.com', 'guru@example.com') LOOP
    PERFORM public.setup_demo_user(r.email);
  END LOOP;
END $$;

-- Migration: 20260827133500_update_admin_create_user_uuid.sql
-- Description: Update admin_create_user RPC to use UUID for auth.identities id

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.admin_create_user(
  target_name text,
  target_email text,
  target_password text,
  target_role text DEFAULT 'GURU',
  target_school_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  clean_email text;
  target_uid uuid;
  resolved_school_id uuid;
  assigned_role public.app_role;
BEGIN
  clean_email := LOWER(TRIM(target_email));
  
  IF clean_email IS NULL OR clean_email = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email tidak boleh kosong.');
  END IF;

  IF target_password IS NULL OR length(target_password) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password minimal 6 karakter.');
  END IF;

  -- Validate and resolve role
  IF UPPER(TRIM(target_role)) = 'ADMIN' OR UPPER(TRIM(target_role)) = 'SUPER_ADMIN' THEN
    assigned_role := 'ADMIN'::public.app_role;
    resolved_school_id := NULL;
  ELSE
    assigned_role := 'GURU'::public.app_role;
    resolved_school_id := target_school_id;
    IF resolved_school_id IS NULL THEN
      SELECT id INTO resolved_school_id FROM public.schools WHERE status = 'ACTIVE' ORDER BY created_at LIMIT 1;
    END IF;
  END IF;

  -- 1. Check if user already exists in auth.users
  SELECT id INTO target_uid FROM auth.users WHERE LOWER(email) = clean_email LIMIT 1;

  IF target_uid IS NULL THEN
    target_uid := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      is_super_admin,
      created_at,
      updated_at
    ) VALUES (
      target_uid,
      '00000000-0000-0000-0000-000000000000',
      clean_email,
      extensions.crypt(target_password, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'name', target_name,
        'role', assigned_role::text,
        'school_id', resolved_school_id,
        'position', CASE WHEN assigned_role = 'ADMIN' THEN 'Administrator' ELSE 'Guru Pembimbing Magang' END
      ),
      'authenticated',
      'authenticated',
      false,
      now(),
      now()
    );

    -- Insert into auth.identities matching GoTrue identity specs (id is UUID, provider_id is text)
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      target_uid,
      target_uid,
      jsonb_build_object(
        'sub', target_uid::text,
        'email', clean_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      target_uid::text,
      now(),
      now(),
      now()
    )
    ON CONFLICT (provider_id, provider) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      identity_data = EXCLUDED.identity_data,
      updated_at = now();

  ELSE
    -- User already exists in auth.users, update password and metadata
    UPDATE auth.users
       SET encrypted_password = extensions.crypt(target_password, extensions.gen_salt('bf')),
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
           raw_user_meta_data = jsonb_build_object(
             'name', target_name,
             'role', assigned_role::text,
             'school_id', resolved_school_id,
             'position', CASE WHEN assigned_role = 'ADMIN' THEN 'Administrator' ELSE 'Guru Pembimbing Magang' END
           ),
           aud = 'authenticated',
           role = 'authenticated',
           updated_at = now()
     WHERE id = target_uid;

    -- Ensure identity exists
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      target_uid,
      target_uid,
      jsonb_build_object(
        'sub', target_uid::text,
        'email', clean_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      target_uid::text,
      now(),
      now(),
      now()
    )
    ON CONFLICT (provider_id, provider) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      identity_data = EXCLUDED.identity_data,
      updated_at = now();
  END IF;

  -- 2. Upsert into public.profiles
  INSERT INTO public.profiles (
    id,
    name,
    email,
    school_id,
    position,
    status
  ) VALUES (
    target_uid,
    COALESCE(target_name, split_part(clean_email, '@', 1)),
    clean_email,
    resolved_school_id,
    CASE WHEN assigned_role = 'ADMIN' THEN 'Administrator' ELSE 'Guru Pembimbing Magang' END,
    'ACTIVE'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    school_id = EXCLUDED.school_id,
    position = EXCLUDED.position,
    status = 'ACTIVE',
    updated_at = now();

  -- 3. Update public.user_roles
  DELETE FROM public.user_roles WHERE user_id = target_uid;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_uid, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_uid,
    'email', clean_email,
    'role', assigned_role::text
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Allow authenticated users and service_role to call admin_create_user
REVOKE EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, uuid) TO anon, authenticated, service_role;

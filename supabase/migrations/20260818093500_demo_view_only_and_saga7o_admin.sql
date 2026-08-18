-- Migration to setup saga7o admin account and demo view-only helper functions

-- 1. Helper function to check if user is a demo user
CREATE OR REPLACE FUNCTION public.is_demo_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND LOWER(email) IN ('admin@example.com', 'guru@example.com')
  );
$$;

-- 2. Update handle_new_user to assign ADMIN role for saga7o@example.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  default_school uuid;
  sel_school uuid;
BEGIN
  SELECT id INTO default_school FROM public.schools ORDER BY created_at LIMIT 1;
  
  IF NEW.raw_user_meta_data->>'school_id' IS NOT NULL AND NEW.raw_user_meta_data->>'school_id' != '' THEN
    BEGIN
      sel_school := (NEW.raw_user_meta_data->>'school_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      sel_school := default_school;
    END;
  ELSE
    sel_school := default_school;
  END IF;

  IF NEW.email IN ('admin@example.com', 'saga7o@example.com', 'saga7o@vokasiflow.ai') THEN
    INSERT INTO public.profiles (id, name, email, phone, position)
    VALUES (
      NEW.id,
      CASE WHEN NEW.email LIKE 'saga7o%' THEN 'saga7o (Super Admin)' ELSE 'Admin Pusat' END,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'phone', '08123456789'),
      COALESCE(NEW.raw_user_meta_data->>'position', 'Administrator Utama Website')
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email;

    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'ADMIN')
    ON CONFLICT DO NOTHING;

  ELSIF NEW.email = 'guru@example.com' THEN
    INSERT INTO public.profiles (id, name, email, school_id, phone, position)
    VALUES (
      NEW.id,
      'Guru Pembimbing (SMK 1)',
      NEW.email,
      default_school,
      '08123456789',
      'Guru Pembimbing Magang'
    )
    ON CONFLICT (id) DO UPDATE SET
      school_id = COALESCE(public.profiles.school_id, default_school);

    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'GURU')
    ON CONFLICT DO NOTHING;

  ELSE
    INSERT INTO public.profiles (id, name, email, school_id, phone, position)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
      NEW.email,
      sel_school,
      NEW.raw_user_meta_data->>'phone',
      COALESCE(NEW.raw_user_meta_data->>'position', 'Guru Pembimbing Magang')
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      school_id = COALESCE(public.profiles.school_id, EXCLUDED.school_id),
      phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
      position = COALESCE(public.profiles.position, EXCLUDED.position);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'GURU')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

-- 3. Update auto_confirm_demo_users trigger to auto confirm saga7o as well
CREATE OR REPLACE FUNCTION public.auto_confirm_demo_users()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IN ('admin@example.com', 'guru@example.com', 'saga7o@example.com', 'saga7o@vokasiflow.ai') THEN
    NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
  END IF;
  RETURN NEW;
END; $$;

-- 4. RPC function to setup saga7o super admin account
CREATE OR REPLACE FUNCTION public.setup_saga7o_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email IN ('saga7o@example.com', 'saga7o@vokasiflow.ai');
  IF uid IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = uid;
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'ADMIN');
    UPDATE public.profiles SET name = 'saga7o (Super Admin)', status = 'ACTIVE', position = 'Administrator Utama Website' WHERE id = uid;
    RETURN jsonb_build_object('success', true, 'message', 'Role ADMIN assigned to saga7o');
  END IF;
  RETURN jsonb_build_object('success', false, 'message', 'User not found yet');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.setup_saga7o_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.setup_saga7o_admin() TO anon, authenticated;

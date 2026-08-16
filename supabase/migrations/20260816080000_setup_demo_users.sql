-- Migration to setup demo users handling and RPC helper

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  default_school uuid;
BEGIN
  SELECT id INTO default_school FROM public.schools ORDER BY created_at LIMIT 1;

  IF NEW.email = 'admin@example.com' THEN
    INSERT INTO public.profiles (id, name, email)
    VALUES (NEW.id, 'Admin Pusat', NEW.email)
    ON CONFLICT (id) DO UPDATE SET name = 'Admin Pusat';

    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'ADMIN')
    ON CONFLICT DO NOTHING;

  ELSIF NEW.email = 'guru@example.com' THEN
    INSERT INTO public.profiles (id, name, email, school_id)
    VALUES (NEW.id, 'Guru Pembimbing (SMK 1)', NEW.email, default_school)
    ON CONFLICT (id) DO UPDATE SET school_id = COALESCE(public.profiles.school_id, default_school);

    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'GURU')
    ON CONFLICT DO NOTHING;

  ELSE
    INSERT INTO public.profiles (id, name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), NEW.email)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'GURU')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.setup_demo_user(target_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  sid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = target_email;
  IF uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;

  SELECT id INTO sid FROM public.schools ORDER BY created_at LIMIT 1;

  IF target_email = 'admin@example.com' THEN
    DELETE FROM public.user_roles WHERE user_id = uid;
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'ADMIN');
    UPDATE public.profiles SET name = 'Admin Pusat', status = 'ACTIVE' WHERE id = uid;
  ELSIF target_email = 'guru@example.com' THEN
    DELETE FROM public.user_roles WHERE user_id = uid;
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'GURU');
    UPDATE public.profiles SET name = 'Guru Pembimbing (SMK 1)', school_id = sid, status = 'ACTIVE' WHERE id = uid;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Auto confirm demo users in auth.users
CREATE OR REPLACE FUNCTION public.auto_confirm_demo_users()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IN ('admin@example.com', 'guru@example.com') THEN
    NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_before_insert_confirm ON auth.users;
CREATE TRIGGER on_auth_user_before_insert_confirm
BEFORE INSERT OR UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_demo_users();

REVOKE EXECUTE ON FUNCTION public.setup_demo_user(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.setup_demo_user(text) TO anon, authenticated;

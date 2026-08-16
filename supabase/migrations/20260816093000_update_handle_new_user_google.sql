-- Update handle_new_user function to handle Google OAuth user metadata (full_name, name, avatar_url)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  default_school uuid;
  sel_school uuid;
  user_name text;
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

  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  IF NEW.email = 'admin@example.com' THEN
    INSERT INTO public.profiles (id, name, email, phone, position)
    VALUES (
      NEW.id,
      'Admin Pusat',
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'phone', '08123456789'),
      COALESCE(NEW.raw_user_meta_data->>'position', 'Administrator Pusat')
    )
    ON CONFLICT (id) DO UPDATE SET name = 'Admin Pusat';

    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'ADMIN')
    ON CONFLICT DO NOTHING;

  ELSE
    INSERT INTO public.profiles (id, name, email, school_id, phone, position)
    VALUES (
      NEW.id,
      user_name,
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

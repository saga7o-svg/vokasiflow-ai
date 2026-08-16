-- Migration to add position and phone to profiles table and update handle_new_user

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

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

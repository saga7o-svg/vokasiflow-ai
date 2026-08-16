-- Migration to auto-confirm demo users in auth.users

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

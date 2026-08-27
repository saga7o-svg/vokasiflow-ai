-- Migration: 20260827111000_auto_confirm_all_users_and_rpc.sql
-- Description: Auto-confirm all users (including those created by Super Admin) so they can log in immediately

-- 1. Immediately confirm all existing unconfirmed accounts in auth.users
UPDATE auth.users
   SET email_confirmed_at = COALESCE(email_confirmed_at, now())
 WHERE email_confirmed_at IS NULL;

-- 2. Update trigger to automatically confirm every new user created via Super Admin or signup
CREATE OR REPLACE FUNCTION public.auto_confirm_all_users()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_before_insert_confirm ON auth.users;
CREATE TRIGGER on_auth_user_before_insert_confirm
BEFORE INSERT OR UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_all_users();

-- 3. RPC function to allow confirming user email on demand
CREATE OR REPLACE FUNCTION public.confirm_user_email(target_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE auth.users
     SET email_confirmed_at = COALESCE(email_confirmed_at, now())
   WHERE LOWER(email) = LOWER(TRIM(target_email));
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_user_email(text) TO anon, authenticated, service_role;

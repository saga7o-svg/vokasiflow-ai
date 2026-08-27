-- Migration: 20260827134000_inspect_auth_schema.sql
CREATE OR REPLACE FUNCTION public.inspect_auth_schema()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, information_schema
AS $$
DECLARE
  cols_users jsonb;
  cols_identities jsonb;
  sample_user jsonb;
  sample_identity jsonb;
BEGIN
  SELECT jsonb_agg(jsonb_build_object('column_name', column_name, 'data_type', data_type, 'is_nullable', is_nullable))
    INTO cols_users
    FROM information_schema.columns
   WHERE table_schema = 'auth' AND table_name = 'users';

  SELECT jsonb_agg(jsonb_build_object('column_name', column_name, 'data_type', data_type, 'is_nullable', is_nullable))
    INTO cols_identities
    FROM information_schema.columns
   WHERE table_schema = 'auth' AND table_name = 'identities';

  SELECT to_jsonb(u.*) INTO sample_user FROM auth.users u WHERE email = 'saga7o@example.com' LIMIT 1;
  SELECT to_jsonb(i.*) INTO sample_identity FROM auth.identities i WHERE user_id = (sample_user->>'id')::uuid LIMIT 1;

  RETURN jsonb_build_object(
    'users_columns', cols_users,
    'identities_columns', cols_identities,
    'sample_user', sample_user,
    'sample_identity', sample_identity
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.inspect_auth_schema() TO anon, authenticated, service_role;

-- Migration: 20260819140000_security_hardening_rpc_and_policies.sql
-- Description: Security hardening for Supabase RPC functions, revoking public/anon execution and enforcing auth checks

-- 1. Hardening setup_saga7o_admin function: Only authenticated users can trigger, and only matches their own authenticated email
CREATE OR REPLACE FUNCTION public.setup_saga7o_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_email text;
BEGIN
  IF caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Authentication required');
  END IF;

  SELECT email INTO caller_email FROM auth.users WHERE id = caller_id;

  IF caller_email IN ('saga7o@example.com', 'saga7o@vokasiflow.ai') THEN
    DELETE FROM public.user_roles WHERE user_id = caller_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (caller_id, 'ADMIN');
    UPDATE public.profiles 
       SET name = 'saga7o (Super Admin)', status = 'ACTIVE', position = 'Administrator Utama Website' 
     WHERE id = caller_id;
    RETURN jsonb_build_object('success', true, 'message', 'Role ADMIN assigned to saga7o');
  END IF;

  RETURN jsonb_build_object('success', false, 'message', 'Permission denied: User email not authorized for Super Admin');
END;
$$;

-- Revoke anon and public execution, restrict strictly to authenticated
REVOKE EXECUTE ON FUNCTION public.setup_saga7o_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.setup_saga7o_admin() TO authenticated;

-- 2. Hardening setup_demo_user: Can only be run by authenticated caller on demo accounts
CREATE OR REPLACE FUNCTION public.setup_demo_user(target_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_email text;
  uid uuid;
  sid uuid;
BEGIN
  IF caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Authentication required');
  END IF;

  SELECT email INTO caller_email FROM auth.users WHERE id = caller_id;
  
  -- Prevent privilege escalation: Caller can only initialize demo account if logged in as that demo user or is admin
  IF caller_email IS DISTINCT FROM target_email AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Forbidden: Cannot configure roles for other users');
  END IF;

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

-- Revoke anon execution on setup_demo_user
REVOKE EXECUTE ON FUNCTION public.setup_demo_user(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.setup_demo_user(text) TO authenticated;

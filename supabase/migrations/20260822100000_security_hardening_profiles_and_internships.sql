-- Migration: 20260822100000_security_hardening_profiles_and_internships.sql
-- Description: Enforce multi-tenant isolation on profiles and prevent unauthorized internship status transitions

-- 1. Trigger to prevent non-admins from changing school_id or status on public.profiles
CREATE OR REPLACE FUNCTION public.protect_profile_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If caller is not an admin, disallow unauthorized changes to school_id or status
  IF NOT public.is_admin() THEN
    IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
      RAISE EXCEPTION 'Akses Ditolak: Hanya Administrator yang dapat mengubah asal sekolah guru.';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Akses Ditolak: Hanya Administrator yang dapat mengubah status akun.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_immutable_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_immutable_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_immutable_fields();

-- 2. Hardening RLS policy on public.internships to prevent GURU from setting APPROVED or REJECTED directly
DROP POLICY IF EXISTS "internships_guru_update" ON public.internships;
CREATE POLICY "internships_guru_update" ON public.internships
  FOR UPDATE TO authenticated
  USING (school_id = public.current_school_id())
  WITH CHECK (
    school_id = public.current_school_id()
    AND (status NOT IN ('APPROVED', 'REJECTED') OR public.is_admin())
  );

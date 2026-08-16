
CREATE TYPE public.app_role AS ENUM ('ADMIN','GURU');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- SCHOOLS
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  school_code text NOT NULL UNIQUE,
  address text,
  city text,
  province text,
  contact_name text,
  contact_phone text,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN');
$$;

CREATE OR REPLACE FUNCTION public.current_school_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'GURU')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "profiles_select_self_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_admin_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "profiles_admin_delete" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "roles_admin_write" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "schools_select_auth" ON public.schools FOR SELECT TO authenticated USING (true);
CREATE POLICY "schools_admin_write" ON public.schools FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- COMPANIES
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_code text NOT NULL UNIQUE,
  industry text,
  address text,
  city text,
  province text,
  contact_name text,
  contact_email text,
  contact_phone text,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_select_auth" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "companies_admin_write" ON public.companies FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.company_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  competency text NOT NULL,
  quota integer NOT NULL DEFAULT 0 CHECK (quota >= 0),
  used_quota integer NOT NULL DEFAULT 0 CHECK (used_quota >= 0),
  period text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, competency, period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_quotas TO authenticated;
GRANT ALL ON public.company_quotas TO service_role;
ALTER TABLE public.company_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotas_select_auth" ON public.company_quotas FOR SELECT TO authenticated USING (true);
CREATE POLICY "quotas_admin_write" ON public.company_quotas FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- STUDENTS
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_number text NOT NULL,
  name text NOT NULL,
  gender text,
  birth_date date,
  phone text,
  email text,
  competency text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, student_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students_admin_all" ON public.students FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "students_guru_select" ON public.students FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());
CREATE POLICY "students_guru_insert" ON public.students FOR INSERT TO authenticated
  WITH CHECK (school_id = public.current_school_id());
CREATE POLICY "students_guru_update" ON public.students FOR UPDATE TO authenticated
  USING (school_id = public.current_school_id()) WITH CHECK (school_id = public.current_school_id());

-- INTERNSHIPS
CREATE TABLE public.internships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  competency text NOT NULL,
  period text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','ACTIVE','COMPLETED','CANCELLED')),
  submitted_by uuid,
  approved_by uuid,
  approval_note text,
  rejection_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internships TO authenticated;
GRANT ALL ON public.internships TO service_role;
ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internships_admin_all" ON public.internships FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "internships_guru_select" ON public.internships FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());
CREATE POLICY "internships_guru_insert" ON public.internships FOR INSERT TO authenticated
  WITH CHECK (school_id = public.current_school_id());
CREATE POLICY "internships_guru_update" ON public.internships FOR UPDATE TO authenticated
  USING (school_id = public.current_school_id()) WITH CHECK (school_id = public.current_school_id());

CREATE OR REPLACE FUNCTION public.internship_in_scope(_internship_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.internships i
    WHERE i.id = _internship_id AND i.school_id = public.current_school_id()
  );
$$;

CREATE TABLE public.internship_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id uuid NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  activity text NOT NULL,
  achievement text,
  obstacles text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internship_reports TO authenticated;
GRANT ALL ON public.internship_reports TO service_role;
ALTER TABLE public.internship_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_scope_all" ON public.internship_reports FOR ALL TO authenticated
  USING (public.internship_in_scope(internship_id)) WITH CHECK (public.internship_in_scope(internship_id));

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id uuid NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('PRESENT','LATE','ABSENT','EXCUSED')),
  check_in time,
  check_out time,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (internship_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_scope_all" ON public.attendance FOR ALL TO authenticated
  USING (public.internship_in_scope(internship_id)) WITH CHECK (public.internship_in_scope(internship_id));

CREATE TABLE public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id uuid NOT NULL UNIQUE REFERENCES public.internships(id) ON DELETE CASCADE,
  technical_score numeric(5,2) NOT NULL CHECK (technical_score BETWEEN 0 AND 100),
  non_technical_score numeric(5,2) NOT NULL CHECK (non_technical_score BETWEEN 0 AND 100),
  discipline_score numeric(5,2) NOT NULL CHECK (discipline_score BETWEEN 0 AND 100),
  attendance_score numeric(5,2) NOT NULL DEFAULT 0,
  final_score numeric(5,2) NOT NULL DEFAULT 0,
  evaluator_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluations TO authenticated;
GRANT ALL ON public.evaluations TO service_role;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evaluations_scope_all" ON public.evaluations FOR ALL TO authenticated
  USING (public.internship_in_scope(internship_id)) WITH CHECK (public.internship_in_scope(internship_id));

CREATE OR REPLACE FUNCTION public.attendance_rate(_internship_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN count(*) = 0 THEN 0
    ELSE round((count(*) FILTER (WHERE status = 'PRESENT') + 0.5 * count(*) FILTER (WHERE status = 'LATE'))::numeric * 100 / count(*), 2)
  END FROM public.attendance WHERE internship_id = _internship_id;
$$;

CREATE OR REPLACE FUNCTION public.compute_evaluation_scores()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.attendance_score := public.attendance_rate(NEW.internship_id);
  NEW.final_score := round(NEW.technical_score * 0.40 + NEW.non_technical_score * 0.25
                     + NEW.discipline_score * 0.20 + NEW.attendance_score * 0.15, 2);
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
CREATE TRIGGER evaluations_compute BEFORE INSERT OR UPDATE ON public.evaluations
FOR EACH ROW EXECUTE FUNCTION public.compute_evaluation_scores();

CREATE TABLE public.competency_demand (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competency text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  location text NOT NULL,
  period text NOT NULL,
  requested_quota integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competency_demand TO authenticated;
GRANT ALL ON public.competency_demand TO service_role;
ALTER TABLE public.competency_demand ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demand_select_auth" ON public.competency_demand FOR SELECT TO authenticated USING (true);
CREATE POLICY "demand_admin_write" ON public.competency_demand FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_admin_select" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "audit_insert_self" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TRIGGER schools_updated BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER quotas_updated BEFORE UPDATE ON public.company_quotas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER students_updated BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER internships_updated BEFORE UPDATE ON public.internships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER reports_updated BEFORE UPDATE ON public.internship_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Transactional workflow functions
CREATE OR REPLACE FUNCTION public.submit_internship(
  _student_id uuid, _company_id uuid, _competency text, _period text,
  _start_date date, _end_date date
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_school uuid; v_quota record; v_id uuid; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  SELECT school_id INTO v_school FROM public.students WHERE id = _student_id;
  IF v_school IS NULL THEN RAISE EXCEPTION 'STUDENT_NOT_FOUND'; END IF;
  IF NOT public.is_admin() AND v_school IS DISTINCT FROM public.current_school_id() THEN
    RAISE EXCEPTION 'FORBIDDEN_SCHOOL';
  END IF;
  IF EXISTS (SELECT 1 FROM public.internships WHERE student_id = _student_id
             AND status IN ('SUBMITTED','APPROVED','ACTIVE')) THEN
    RAISE EXCEPTION 'STUDENT_ALREADY_PLACED';
  END IF;
  SELECT * INTO v_quota FROM public.company_quotas
   WHERE company_id = _company_id AND competency = _competency AND period = _period FOR UPDATE;
  IF v_quota IS NULL THEN RAISE EXCEPTION 'QUOTA_NOT_FOUND'; END IF;
  IF v_quota.used_quota >= v_quota.quota THEN RAISE EXCEPTION 'QUOTA_FULL'; END IF;
  INSERT INTO public.internships (student_id, school_id, company_id, competency, period,
    start_date, end_date, status, submitted_by)
  VALUES (_student_id, v_school, _company_id, _competency, _period, _start_date, _end_date, 'SUBMITTED', v_uid)
  RETURNING id INTO v_id;
  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, detail)
  VALUES (v_uid, 'SUBMIT', 'internship', v_id, 'Pengajuan magang dibuat');
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.approve_internship(_internship_id uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_i record; v_quota record; v_uid uuid := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO v_i FROM public.internships WHERE id = _internship_id FOR UPDATE;
  IF v_i IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_i.status <> 'SUBMITTED' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  SELECT * INTO v_quota FROM public.company_quotas
   WHERE company_id = v_i.company_id AND competency = v_i.competency AND period = v_i.period FOR UPDATE;
  IF v_quota IS NULL THEN RAISE EXCEPTION 'QUOTA_NOT_FOUND'; END IF;
  IF v_quota.used_quota >= v_quota.quota THEN RAISE EXCEPTION 'QUOTA_FULL'; END IF;
  UPDATE public.company_quotas SET used_quota = used_quota + 1 WHERE id = v_quota.id;
  UPDATE public.internships SET status = 'APPROVED', approved_by = v_uid, approval_note = _note
   WHERE id = _internship_id;
  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, detail)
  VALUES (v_uid, 'APPROVE', 'internship', _internship_id, _note);
END; $$;

CREATE OR REPLACE FUNCTION public.reject_internship(_internship_id uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_i record; v_uid uuid := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO v_i FROM public.internships WHERE id = _internship_id FOR UPDATE;
  IF v_i IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_i.status <> 'SUBMITTED' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  UPDATE public.internships SET status = 'REJECTED', approved_by = v_uid, rejection_note = _note
   WHERE id = _internship_id;
  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, detail)
  VALUES (v_uid, 'REJECT', 'internship', _internship_id, _note);
END; $$;

CREATE OR REPLACE FUNCTION public.school_performance()
RETURNS TABLE (
  school_id uuid, school_name text, city text,
  total_students bigint, total_internships bigint, completed_internships bigint,
  industry_score numeric, success_rate numeric, discipline_score numeric, score numeric
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH scoped AS (
    SELECT s.id, s.name, s.city FROM public.schools s
    WHERE public.is_admin() OR s.id = public.current_school_id()
  ),
  ev AS (
    SELECT i.school_id, avg(e.final_score) avg_final, avg(e.attendance_score) avg_att,
           avg(e.discipline_score) avg_disc
    FROM public.internships i JOIN public.evaluations e ON e.internship_id = i.id
    GROUP BY i.school_id
  ),
  ins AS (
    SELECT school_id, count(*) total,
           count(*) FILTER (WHERE status = 'COMPLETED') completed
    FROM public.internships
    WHERE status IN ('ACTIVE','COMPLETED','CANCELLED')
    GROUP BY school_id
  ),
  st AS (SELECT school_id, count(*) total FROM public.students GROUP BY school_id)
  SELECT sc.id, sc.name, sc.city,
    COALESCE(st.total,0), COALESCE(ins.total,0), COALESCE(ins.completed,0),
    round(COALESCE(ev.avg_final,0),2),
    CASE WHEN COALESCE(ins.total,0) = 0 THEN 0 ELSE round(ins.completed::numeric * 100 / ins.total,2) END,
    round(COALESCE(ev.avg_att,0) * 0.6 + COALESCE(ev.avg_disc,0) * 0.4, 2),
    round(
      COALESCE(ev.avg_final,0) * 0.5
      + (CASE WHEN COALESCE(ins.total,0) = 0 THEN 0 ELSE ins.completed::numeric * 100 / ins.total END) * 0.3
      + (COALESCE(ev.avg_att,0) * 0.6 + COALESCE(ev.avg_disc,0) * 0.4) * 0.2
    , 2)
  FROM scoped sc
  LEFT JOIN ev ON ev.school_id = sc.id
  LEFT JOIN ins ON ins.school_id = sc.id
  LEFT JOIN st ON st.school_id = sc.id
  ORDER BY 10 DESC;
$$;

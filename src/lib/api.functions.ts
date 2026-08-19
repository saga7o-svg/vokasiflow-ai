import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { forecastSeries, groupDemand, toPoints } from "@/lib/analytics";
import {
  analyzeCurriculumWithGemini,
  recommendNearestSchoolsWithGemini,
  matchSpecialSkillsStudentsWithGemini,
} from "@/lib/gemini";

function isDemoEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return lower === "admin@example.com" || lower === "guru@example.com";
}

function assertNotDemo(context: { claims?: { email?: string } }) {
  if (isDemoEmail(context.claims?.email)) {
    throw new Error(
      "Akses Ditolak: Akun Demo hanya memiliki akses lihat (View Only). Pengubahan data dinonaktifkan demi keamanan.",
    );
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function assertAdminRole(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "ADMIN");
  if (!isAdmin) {
    throw new Error("Akses Ditolak: Tindakan ini memerlukan hak akses Administrator.");
  }
  return true;
}

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,name,email,school_id,status,phone,position")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const isDemoAdmin = profile?.email?.toLowerCase() === "admin@example.com";
    const isDemoGuru = profile?.email?.toLowerCase() === "guru@example.com";
    const isDemo = isDemoAdmin || isDemoGuru;

    const role: "ADMIN" | "GURU" =
      roles?.some((r) => r.role === "ADMIN") || isDemoAdmin ? "ADMIN" : "GURU";

    let currentSchoolId = profile?.school_id ?? null;

    if (!currentSchoolId && (role === "GURU" || isDemoGuru)) {
      const { data: firstSchool } = await supabase
        .from("schools")
        .select("id,name")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (firstSchool) {
        currentSchoolId = firstSchool.id;
        await supabase.from("profiles").update({ school_id: firstSchool.id }).eq("id", userId);
      }
    }

    let schoolName: string | null = null;
    if (currentSchoolId) {
      const { data: school } = await supabase
        .from("schools")
        .select("name")
        .eq("id", currentSchoolId)
        .maybeSingle();
      schoolName = school?.name ?? null;
    }

    const rawProf = profile as { phone?: string | null; position?: string | null } | null;

    return {
      id: userId,
      name: profile?.name || (isDemoAdmin ? "Admin Pusat" : isDemoGuru ? "Guru Pembimbing" : ""),
      email: profile?.email ?? "",
      phone: rawProf?.phone ?? null,
      position: rawProf?.position ?? null,
      schoolId: currentSchoolId,
      schoolName,
      status: profile?.status ?? "ACTIVE",
      role,
      isDemo,
    };
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [schools, students, companies, internships, evaluations] = await Promise.all([
      supabase.from("schools").select("id,status"),
      supabase.from("students").select("id,status,school_id"),
      supabase.from("companies").select("id,status"),
      supabase
        .from("internships")
        .select("id,status,student_id,start_date,period,competency,school_id"),
      supabase.from("evaluations").select("final_score,internship_id"),
    ]);
    const list = internships.data ?? [];
    const byStatus = (status: string) => list.filter((i) => i.status === status).length;
    const finished = list.filter((i) => ["COMPLETED", "CANCELLED"].includes(i.status)).length;
    const completed = byStatus("COMPLETED");
    const scores = (evaluations.data ?? []).map((e) => Number(e.final_score));
    const placedStudents = new Set(
      list
        .filter((i) => ["SUBMITTED", "APPROVED", "ACTIVE", "COMPLETED"].includes(i.status))
        .map((i) => i.student_id),
    );
    const trendMap = new Map<string, number>();
    for (const i of list) {
      const month = (i.start_date ?? "").slice(0, 7);
      if (month) trendMap.set(month, (trendMap.get(month) ?? 0) + 1);
    }
    const competencyMap = new Map<string, number>();
    for (const i of list)
      competencyMap.set(i.competency, (competencyMap.get(i.competency) ?? 0) + 1);

    return {
      totalSchools: (schools.data ?? []).filter((s) => s.status === "ACTIVE").length,
      totalStudents: (students.data ?? []).filter((s) => s.status === "ACTIVE").length,
      totalCompanies: (companies.data ?? []).filter((c) => c.status === "ACTIVE").length,
      activeInternships: byStatus("ACTIVE"),
      pendingApprovals: byStatus("SUBMITTED"),
      completedInternships: completed,
      rejected: byStatus("REJECTED"),
      approved: byStatus("APPROVED"),
      draft: byStatus("DRAFT"),
      submitted: byStatus("SUBMITTED"),
      successRate: finished === 0 ? 0 : Math.round((completed / finished) * 1000) / 10,
      unplacedStudents: (students.data ?? []).filter(
        (s) => s.status === "ACTIVE" && !placedStudents.has(s.id),
      ).length,
      averageScore:
        scores.length === 0
          ? 0
          : Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      statusChart: [
        { name: "Draft", value: byStatus("DRAFT") },
        { name: "Diajukan", value: byStatus("SUBMITTED") },
        { name: "Disetujui", value: byStatus("APPROVED") },
        { name: "Berjalan", value: byStatus("ACTIVE") },
        { name: "Selesai", value: completed },
        { name: "Ditolak", value: byStatus("REJECTED") },
      ],
      trendChart: [...trendMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, value]) => ({ name: month, value })),
      competencyChart: [...competencyMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value })),
    };
  });

export const listSchools = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("schools").select("*").order("name");
    if (error) throw new Error("Gagal memuat data sekolah.");
    return data;
  });

export const saveSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(2).max(120),
        school_code: z.string().trim().min(2).max(30),
        address: z.string().trim().max(200).nullable().default(null),
        city: z.string().trim().max(80).nullable().default(null),
        province: z.string().trim().max(80).nullable().default(null),
        contact_name: z.string().trim().max(80).nullable().default(null),
        contact_phone: z.string().trim().max(30).nullable().default(null),
        status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    await assertAdminRole(context.supabase, context.userId);
    const { id, ...values } = data;
    const query = id
      ? context.supabase.from("schools").update(values).eq("id", id)
      : context.supabase.from("schools").insert(values);
    const { error } = await query;
    if (error) throw new Error("Data sekolah gagal disimpan. Pastikan kode sekolah unik.");
    await context.supabase.from("audit_logs").insert({
      user_id: context.userId,
      action: id ? "UPDATE" : "CREATE",
      entity: "school",
      entity_id: id ?? null,
      detail: values.name,
    });
    return { ok: true };
  });

export const listStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("students")
      .select("*, schools(name)")
      .order("name");
    if (error) throw new Error("Gagal memuat data siswa.");
    return data;
  });

export const saveStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        school_id: z.string().uuid().optional(),
        student_number: z.string().trim().min(3).max(30),
        name: z.string().trim().min(2).max(120),
        gender: z.enum(["L", "P"]).nullable().default(null),
        birth_date: z.string().trim().min(10).max(10).nullable().default(null),
        phone: z.string().trim().max(30).nullable().default(null),
        email: z.string().trim().max(160).nullable().default(null),
        competency: z.string().trim().min(2).max(80),
        status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", userId)
      .maybeSingle();
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "ADMIN");
    const schoolId = isAdmin ? data.school_id : (profile?.school_id ?? undefined);
    if (!schoolId) throw new Error("Sekolah wajib dipilih.");
    const { id, ...rest } = data;
    const values = { ...rest, school_id: schoolId, email: rest.email || null };
    const query = id
      ? supabase.from("students").update(values).eq("id", id)
      : supabase.from("students").insert(values);
    const { error } = await query;
    if (error)
      throw new Error("Data siswa gagal disimpan. Periksa nomor induk yang mungkin sudah dipakai.");
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: id ? "UPDATE" : "CREATE",
      entity: "student",
      entity_id: id ?? null,
      detail: values.name,
    });
    return { ok: true };
  });

export const listCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [companies, quotas] = await Promise.all([
      context.supabase.from("companies").select("*").order("name"),
      context.supabase.from("company_quotas").select("*").order("competency"),
    ]);
    if (companies.error || quotas.error) throw new Error("Gagal memuat data perusahaan.");
    return { companies: companies.data ?? [], quotas: quotas.data ?? [] };
  });

export const saveCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(2).max(120),
        company_code: z.string().trim().min(2).max(30),
        industry: z.string().trim().max(80).nullable().default(null),
        address: z.string().trim().max(200).nullable().default(null),
        city: z.string().trim().max(80).nullable().default(null),
        province: z.string().trim().max(80).nullable().default(null),
        contact_name: z.string().trim().max(80).nullable().default(null),
        contact_email: z.string().trim().max(160).nullable().default(null),
        contact_phone: z.string().trim().max(30).nullable().default(null),
        status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    await assertAdminRole(context.supabase, context.userId);
    const { id, ...values } = data;
    const query = id
      ? context.supabase.from("companies").update(values).eq("id", id)
      : context.supabase.from("companies").insert(values);
    const { error } = await query;
    if (error) throw new Error("Data perusahaan gagal disimpan. Pastikan kode perusahaan unik.");
    await context.supabase.from("audit_logs").insert({
      user_id: context.userId,
      action: id ? "UPDATE" : "CREATE",
      entity: "company",
      entity_id: id ?? null,
      detail: values.name,
    });
    return { ok: true };
  });

export const saveQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        company_id: z.string().uuid(),
        competency: z.string().trim().min(2).max(80),
        period: z
          .string()
          .trim()
          .regex(/^\d{4}-S[12]$/, "Format periode: 2026-S1"),
        quota: z.number().int().min(0).max(999),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    await assertAdminRole(context.supabase, context.userId);
    const { id, ...values } = data;
    const query = id
      ? context.supabase.from("company_quotas").update(values).eq("id", id)
      : context.supabase.from("company_quotas").insert(values);
    const { error } = await query;
    if (error)
      throw new Error(
        "Kuota gagal disimpan. Kombinasi perusahaan, kompetensi, dan periode harus unik.",
      );
    return { ok: true };
  });

export const listInternships = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("internships")
      .select(
        "*, students(name, student_number), schools(name), companies(name), evaluations(final_score)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error("Gagal memuat data pengajuan magang.");
    return data;
  });

export const getInternship = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: internship, error } = await supabase
      .from("internships")
      .select("*, students(*), schools(name, city), companies(name, city, industry)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error("Gagal memuat detail magang.");
    if (!internship) throw new Error("Anda tidak memiliki akses ke data ini.");
    const [reports, attendance, evaluation, quota] = await Promise.all([
      supabase
        .from("internship_reports")
        .select("*")
        .eq("internship_id", data.id)
        .order("report_date", { ascending: false }),
      supabase
        .from("attendance")
        .select("*")
        .eq("internship_id", data.id)
        .order("date", { ascending: false }),
      supabase.from("evaluations").select("*").eq("internship_id", data.id).maybeSingle(),
      supabase
        .from("company_quotas")
        .select("*")
        .eq("company_id", internship.company_id)
        .eq("competency", internship.competency)
        .eq("period", internship.period)
        .maybeSingle(),
    ]);
    return {
      internship,
      reports: reports.data ?? [],
      attendance: attendance.data ?? [],
      evaluation: evaluation.data ?? null,
      quota: quota.data ?? null,
    };
  });

export const submitInternship = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        company_id: z.string().uuid(),
        competency: z.string().trim().min(2).max(80),
        period: z
          .string()
          .trim()
          .regex(/^\d{4}-S[12]$/),
        start_date: z.string().min(10).max(10),
        end_date: z.string().min(10).max(10),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    if (data.end_date <= data.start_date)
      throw new Error("Tanggal selesai harus setelah tanggal mulai.");
    const { error } = await context.supabase.rpc("submit_internship", {
      _student_id: data.student_id,
      _company_id: data.company_id,
      _competency: data.competency,
      _period: data.period,
      _start_date: data.start_date,
      _end_date: data.end_date,
    });
    if (error) {
      const message = error.message || "";
      if (message.includes("QUOTA_FULL"))
        throw new Error("Kuota perusahaan untuk kompetensi ini sudah penuh.");
      if (message.includes("QUOTA_NOT_FOUND"))
        throw new Error("Perusahaan belum membuka kuota untuk kompetensi dan periode ini.");
      if (message.includes("STUDENT_ALREADY_PLACED"))
        throw new Error("Siswa ini sudah memiliki pengajuan atau penempatan aktif.");
      if (message.includes("FORBIDDEN")) throw new Error("Anda tidak memiliki akses ke data ini.");
      throw new Error("Pengajuan gagal disimpan. Silakan coba lagi.");
    }
    return { ok: true };
  });

export const decideInternship = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["APPROVE", "REJECT"]),
        note: z.string().trim().max(500).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    await assertAdminRole(context.supabase, context.userId);
    if (data.decision === "REJECT" && !data.note) throw new Error("Alasan penolakan wajib diisi.");
    const { error } = await context.supabase.rpc(
      data.decision === "APPROVE" ? "approve_internship" : "reject_internship",
      { _internship_id: data.id, _note: data.note },
    );
    if (error) {
      const message = error.message || "";
      if (message.includes("QUOTA_FULL")) throw new Error("Kuota perusahaan sudah penuh.");
      if (message.includes("INVALID_STATUS"))
        throw new Error("Pengajuan ini sudah diproses sebelumnya.");
      if (message.includes("FORBIDDEN"))
        throw new Error("Anda tidak memiliki akses ke tindakan ini.");
      throw new Error("Tindakan gagal diproses. Silakan coba lagi.");
    }
    return { ok: true };
  });

export const updateInternshipStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    const { data: current } = await context.supabase
      .from("internships")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    if (!current) throw new Error("Anda tidak memiliki akses ke data ini.");
    const allowed: Record<string, string[]> = {
      APPROVED: ["ACTIVE", "CANCELLED"],
      ACTIVE: ["COMPLETED", "CANCELLED"],
    };
    if (!(allowed[current.status] ?? []).includes(data.status)) {
      throw new Error("Perubahan status tidak diizinkan dari status saat ini.");
    }
    const { error } = await context.supabase
      .from("internships")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error("Status gagal diperbarui. Silakan coba lagi.");
    await context.supabase.from("audit_logs").insert({
      user_id: context.userId,
      action: "UPDATE",
      entity: "internship",
      entity_id: data.id,
      detail: data.status,
    });
    return { ok: true };
  });

export const saveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        internship_id: z.string().uuid(),
        report_date: z.string().min(10).max(10),
        activity: z.string().trim().min(5).max(1000),
        achievement: z.string().trim().max(1000).optional().default(""),
        obstacles: z.string().trim().max(1000).optional().default(""),
        notes: z.string().trim().max(1000).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    const { error } = await context.supabase.from("internship_reports").insert({
      ...data,
      created_by: context.userId,
    });
    if (error) throw new Error("Laporan gagal disimpan. Silakan coba lagi.");
    await context.supabase.from("audit_logs").insert({
      user_id: context.userId,
      action: "CREATE",
      entity: "internship_report",
      entity_id: data.internship_id,
      detail: data.report_date,
    });
    return { ok: true };
  });

export const saveAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        internship_id: z.string().uuid(),
        date: z.string().min(10).max(10),
        status: z.enum(["PRESENT", "LATE", "ABSENT", "EXCUSED"]),
        notes: z.string().trim().max(300).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    const { error } = await context.supabase
      .from("attendance")
      .upsert({ ...data }, { onConflict: "internship_id,date" });
    if (error) throw new Error("Kehadiran gagal disimpan. Silakan coba lagi.");
    return { ok: true };
  });

export const saveEvaluation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        internship_id: z.string().uuid(),
        technical_score: z.number().min(0).max(100),
        non_technical_score: z.number().min(0).max(100),
        discipline_score: z.number().min(0).max(100),
        evaluator_name: z.string().trim().max(120).optional().default(""),
        notes: z.string().trim().max(500).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    const { error } = await context.supabase
      .from("evaluations")
      .upsert({ ...data }, { onConflict: "internship_id" });
    if (error) throw new Error("Penilaian gagal disimpan. Silakan coba lagi.");
    await context.supabase.from("audit_logs").insert({
      user_id: context.userId,
      action: "EVALUATE",
      entity: "internship",
      entity_id: data.internship_id,
      detail: "Penilaian diperbarui",
    });
    const { data: saved } = await context.supabase
      .from("evaluations")
      .select("*")
      .eq("internship_id", data.internship_id)
      .maybeSingle();
    return { ok: true, evaluation: saved };
  });

export const getSchoolPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("school_performance");
    if (error) throw new Error("Gagal menghitung performa sekolah.");
    return data ?? [];
  });

export const getForecast = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [demand, quotas, companies] = await Promise.all([
      context.supabase
        .from("competency_demand")
        .select("competency,location,period,requested_quota"),
      context.supabase.from("company_quotas").select("*"),
      context.supabase.from("companies").select("id,name,city,industry,status"),
    ]);
    if (demand.error) throw new Error("Gagal memuat data historis permintaan.");
    const groups = groupDemand(demand.data ?? []);
    const series = [...groups.values()].map((g) =>
      forecastSeries(g.competency, g.location, toPoints(g.points)),
    );

    const byCompetency = new Map<
      string,
      { history: Map<string, number>; locations: Set<string> }
    >();
    for (const row of demand.data ?? []) {
      let entry = byCompetency.get(row.competency);
      if (!entry) {
        entry = { history: new Map(), locations: new Set() };
        byCompetency.set(row.competency, entry);
      }
      entry.history.set(row.period, (entry.history.get(row.period) ?? 0) + row.requested_quota);
      entry.locations.add(row.location);
    }
    const competencyForecast = [...byCompetency.entries()]
      .map(([competency, entry]) =>
        forecastSeries(competency, "Semua Lokasi", toPoints(entry.history)),
      )
      .sort((a, b) => (b.growthPct ?? -999) - (a.growthPct ?? -999));

    const locationTotals = new Map<string, number>();
    for (const row of demand.data ?? []) {
      locationTotals.set(
        row.location,
        (locationTotals.get(row.location) ?? 0) + row.requested_quota,
      );
    }

    const topCompetencies = competencyForecast
      .filter((c) => c.sufficient)
      .slice(0, 4)
      .map((c) => c.competency);
    const recommendedCompanies = (quotas.data ?? [])
      .filter((q) => q.quota - q.used_quota > 0 && topCompetencies.includes(q.competency))
      .map((q) => {
        const company = (companies.data ?? []).find((c) => c.id === q.company_id);
        const demandTotal = (demand.data ?? [])
          .filter((d) => d.competency === q.competency && d.location === (company?.city ?? ""))
          .reduce((a, b) => a + b.requested_quota, 0);
        return {
          companyId: q.company_id,
          companyName: company?.name ?? "-",
          city: company?.city ?? "-",
          competency: q.competency,
          available: q.quota - q.used_quota,
          period: q.period,
          historicalDemand: demandTotal,
        };
      })
      .sort((a, b) => b.historicalDemand - a.historicalDemand || b.available - a.available)
      .slice(0, 8);

    return {
      series,
      competencyForecast,
      locations: [...locationTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, total]) => ({ name, total })),
      recommendedCompanies,
      hasData: (demand.data ?? []).length > 0,
    };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profiles, roles, schools] = await Promise.all([
      context.supabase.from("profiles").select("*").order("name"),
      context.supabase.from("user_roles").select("user_id,role"),
      context.supabase.from("schools").select("id,name"),
    ]);
    if (profiles.error) throw new Error("Gagal memuat data pengguna.");
    return (profiles.data ?? []).map((p) => ({
      ...p,
      role: (roles.data ?? []).find((r) => r.user_id === p.id)?.role ?? "GURU",
      schoolName: (schools.data ?? []).find((s) => s.id === p.school_id)?.name ?? null,
    }));
  });

export const createGuruUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(160),
        password: z.string().min(8).max(72),
        school_id: z.string().uuid(),
        role: z.enum(["ADMIN", "GURU"]).default("GURU"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (
      context.claims.email === "admin@example.com" ||
      context.claims.email === "guru@example.com"
    ) {
      throw new Error(
        "Akun Demo hanya memiliki akses lihat (View Only). Pengubahan data dinonaktifkan.",
      );
    }
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Anda tidak memiliki akses ke tindakan ini.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (error || !created.user)
      throw new Error("Pengguna gagal dibuat. Email mungkin sudah terdaftar.");
    await supabaseAdmin.from("profiles").upsert({
      id: created.user.id,
      name: data.name,
      email: data.email,
      school_id: data.school_id,
    });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });
    await context.supabase.from("audit_logs").insert({
      user_id: context.userId,
      action: "CREATE",
      entity: "user",
      entity_id: created.user.id,
      detail: data.email,
    });
    return { ok: true };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(2).max(120),
        school_id: z.string().uuid().nullable(),
        status: z.enum(["ACTIVE", "INACTIVE"]),
        role: z.enum(["ADMIN", "GURU"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (
      context.claims.email === "admin@example.com" ||
      context.claims.email === "guru@example.com"
    ) {
      throw new Error(
        "Akun Demo hanya memiliki akses lihat (View Only). Pengubahan data dinonaktifkan.",
      );
    }
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Anda tidak memiliki akses ke tindakan ini.");
    const { error } = await context.supabase
      .from("profiles")
      .update({ name: data.name, school_id: data.school_id, status: data.status })
      .eq("id", data.id);
    if (error) throw new Error("Data pengguna gagal disimpan.");
    await context.supabase.from("user_roles").delete().eq("user_id", data.id);
    await context.supabase.from("user_roles").insert({ user_id: data.id, role: data.role });
    await context.supabase.from("audit_logs").insert({
      user_id: context.userId,
      action: "UPDATE",
      entity: "user",
      entity_id: data.id,
      detail: data.status,
    });
    return { ok: true };
  });

export const globalSearch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ q: z.string().trim().max(80) }).parse(input))
  .handler(async ({ data, context }) => {
    const cleanQ = data.q.replace(/[%_\\]/g, "").trim();
    if (cleanQ.length < 2) return { students: [], schools: [], companies: [] };
    const term = `%${cleanQ}%`;
    const [students, schools, companies] = await Promise.all([
      context.supabase
        .from("students")
        .select("id,name,student_number,competency")
        .ilike("name", term)
        .limit(5),
      context.supabase.from("schools").select("id,name,city").ilike("name", term).limit(5),
      context.supabase.from("companies").select("id,name,city").ilike("name", term).limit(5),
    ]);
    return {
      students: students.data ?? [],
      schools: schools.data ?? [],
      companies: companies.data ?? [],
    };
  });

export const analyzeCurriculumFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        schoolId: z.string().uuid().optional(),
        competency: z.string().trim().min(2),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let schoolName = "SMK Vokasi Unggulan";
    if (data.schoolId) {
      const { data: s } = await context.supabase
        .from("schools")
        .select("name")
        .eq("id", data.schoolId)
        .maybeSingle();
      if (s?.name) schoolName = s.name;
    }

    const { data: demands } = await context.supabase
      .from("competency_demand")
      .select("competency, requested_quota, location, company_id, companies(name)")
      .eq("competency", data.competency);

    const formattedDemands = (demands ?? []).map((d) => ({
      companyName: (d.companies as unknown as { name: string })?.name || "Perusahaan Mitra",
      competency: d.competency,
      quota: d.requested_quota,
      location: d.location,
    }));

    const result = await analyzeCurriculumWithGemini({
      schoolName,
      competency: data.competency,
      industryDemands: formattedDemands,
    });

    return result;
  });

export const getNearestSchoolsRecommendationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        requiredCompetency: z.string().trim().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const [{ data: company }, { data: schools }] = await Promise.all([
      context.supabase
        .from("companies")
        .select("id,name,address,city,province,industry")
        .eq("id", data.companyId)
        .single(),
      context.supabase
        .from("schools")
        .select("id,name,address,city,province")
        .eq("status", "ACTIVE"),
    ]);

    if (!company) throw new Error("Perusahaan tidak ditemukan.");

    const recommendations = await recommendNearestSchoolsWithGemini({
      companyName: company.name,
      companyAddress: company.address || company.city || "Pusat Industri",
      companyCity: company.city || "Jakarta",
      ...(data.requiredCompetency ? { requiredCompetency: data.requiredCompetency } : {}),
      schools: (schools ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        city: s.city || "Kota / Kab",
        address: s.address || s.city || "",
        province: s.province || "",
      })),
    });

    return {
      company,
      recommendations,
    };
  });

export const getSpecialSkillsStudentMatchingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        companyName: z.string().trim().min(2),
        requirementNote: z.string().trim().min(2),
        competency: z.string().trim().optional(),
        specialSkillFilter: z.string().trim().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("students")
      .select("id,name,student_number,competency,school_id,schools(name)")
      .eq("status", "ACTIVE");

    if (data.competency) {
      query = query.eq("competency", data.competency);
    }

    const { data: rawStudents } = await query.limit(15);

    const defaultSkillsPool = [
      ["Bisa Mengemudi Mobil (SIM A)", "Sertifikasi K3 Dasar", "Bahasa Inggris Pasif"],
      ["Bisa Mengemudi Sepeda Motor (SIM C)", "AutoCAD 2D/3D", "Troubleshooting Hardware"],
      ["Bisa Mengemudi Mobil (SIM A)", "Bisa Mengemudi Sepeda Motor (SIM C)", "Public Speaking"],
      ["Welding 3G Certified", "Bisa Mengemudi Mobil (SIM A)", "Keselamatan Kerja Bengkel"],
      ["Design Photoshop & Illustrator", "Copywriting", "Manajemen Sosmed"],
      ["Python Basic", "Network Configuration (Mikrotik)", "Bisa Mengemudi Mobil (SIM A)"],
    ];

    const studentList = (rawStudents ?? []).map((s, idx) => {
      const skills = defaultSkillsPool[idx % defaultSkillsPool.length] ?? [];
      return {
        id: s.id,
        name: s.name,
        schoolName: (s.schools as unknown as { name: string })?.name || "SMK Negeri Vokasi",
        competency: s.competency,
        specialSkills: skills,
      };
    });

    let filteredList = studentList;
    if (data.specialSkillFilter) {
      const filterLower = data.specialSkillFilter.toLowerCase();
      filteredList = studentList.filter((s) =>
        s.specialSkills.some((sk) => sk.toLowerCase().includes(filterLower)),
      );
      if (filteredList.length === 0) filteredList = studentList;
    }

    const candidates = await matchSpecialSkillsStudentsWithGemini({
      companyName: data.companyName,
      companyRequirementNote: data.requirementNote,
      ...(data.competency ? { targetCompetency: data.competency } : {}),
      students: filteredList,
    });

    return candidates;
  });

export const updateTeacherProfileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(2),
        schoolId: z.string().uuid(),
        position: z.string().trim().min(2),
        phone: z.string().trim().min(5),
        email: z.string().trim().email().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (
      context.claims.email === "admin@example.com" ||
      context.claims.email === "guru@example.com"
    ) {
      throw new Error(
        "Akun Demo hanya memiliki akses lihat (View Only). Pengubahan data dinonaktifkan.",
      );
    }
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        name: data.name,
        school_id: data.schoolId,
        position: data.position,
        phone: data.phone,
        ...(data.email ? { email: data.email } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw new Error(error.message || "Gagal memperbarui profil guru.");
    return { success: true };
  });

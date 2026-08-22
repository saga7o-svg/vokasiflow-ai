import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { forecastSeries, groupDemand, toPoints } from "@/lib/analytics";
import {
  analyzeCurriculumWithGemini,
  recommendNearestSchoolsWithGemini,
  matchSpecialSkillsStudentsWithGemini,
} from "@/lib/gemini";

import {
  DUMMY_SCHOOLS,
  DUMMY_COMPANIES,
  DUMMY_STUDENTS,
  DUMMY_INTERNSHIPS,
  DUMMY_DASHBOARD_STATS,
  DUMMY_USERS,
} from "./demo-data";
import {
  extractMetadata,
  embedMetadata,
  stripMetadata,
  mergeMetadata,
} from "./meta-serializer";

export function isDemoEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return (
    lower === "admin@example.com" ||
    lower === "guru@example.com" ||
    (lower.endsWith("@example.com") && lower !== "saga7o@example.com")
  );
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
    if (isDemoEmail(context.claims?.email)) {
      return DUMMY_DASHBOARD_STATS;
    }
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
    if (isDemoEmail(context.claims?.email)) {
      return DUMMY_SCHOOLS;
    }
    const { data, error } = await context.supabase.from("schools").select("*").order("name");
    if (error) throw new Error("Gagal memuat data sekolah.");

    // Enrich rows if mentor/partnership_type are stored in embedded metadata
    const enriched = (data || []).map((s: Record<string, unknown>) => {
      const { cleanText: cleanAddress, metadata: meta } = extractMetadata<{
        mentor?: string | null;
        partnership_type?: string | null;
      }>(s["address"] as string | null);

      const mentor = (s["mentor"] as string | null) ?? meta?.mentor ?? null;
      const partnership_type =
        (s["partnership_type"] as string | null) ?? meta?.partnership_type ?? null;

      return {
        ...s,
        address: cleanAddress || null,
        mentor,
        partnership_type,
      };
    });

    return enriched;
  });

export const saveSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(2).max(150),
        school_code: z.string().trim().min(1).max(50),
        address: z.string().trim().max(300).nullable().default(null),
        city: z.string().trim().max(100).nullable().default(null),
        province: z.string().trim().max(100).nullable().default(null),
        mentor: z.string().trim().max(100).nullable().default(null),
        partnership_type: z.string().trim().max(100).nullable().default(null),
        contact_name: z.string().trim().max(100).nullable().default(null),
        contact_phone: z.string().trim().max(50).nullable().default(null),
        status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    await assertAdminRole(context.supabase, context.userId);
    const { id, ...values } = data;

    const embeddedAddress =
      values.mentor || values.partnership_type
        ? embedMetadata(values.address, {
            mentor: values.mentor || null,
            partnership_type: values.partnership_type || null,
          })
        : values.address;

    const baseValues = {
      name: values.name,
      school_code: values.school_code,
      address: embeddedAddress,
      city: values.city,
      province: values.province,
      contact_name: values.contact_name,
      contact_phone: values.contact_phone,
      status: values.status,
    };

    let saveErr: { message?: string; code?: string } | null = null;

    if (id) {
      const res = await context.supabase.from("schools").update(values).eq("id", id);
      saveErr = res.error;
      if (
        saveErr &&
        (saveErr.message?.includes("column") ||
          saveErr.code === "PGRST204" ||
          saveErr.message?.includes("mentor") ||
          saveErr.message?.includes("partnership_type"))
      ) {
        const fallbackRes = await context.supabase.from("schools").update(baseValues).eq("id", id);
        saveErr = fallbackRes.error;
      }
    } else {
      const res = await context.supabase.from("schools").insert(values);
      saveErr = res.error;
      if (
        saveErr &&
        (saveErr.message?.includes("column") ||
          saveErr.code === "PGRST204" ||
          saveErr.message?.includes("mentor") ||
          saveErr.message?.includes("partnership_type"))
      ) {
        const fallbackRes = await context.supabase.from("schools").insert(baseValues);
        saveErr = fallbackRes.error;
      }
    }

    if (saveErr) {
      throw new Error(
        `Data sekolah gagal disimpan: ${saveErr.message || "Pastikan kode sekolah unik."}`,
      );
    }

    try {
      await context.supabase.from("audit_logs").insert({
        user_id: context.userId,
        action: id ? "UPDATE" : "CREATE",
        entity: "school",
        entity_id: id ?? null,
        detail: values.name,
      });
    } catch {
      // Non-blocking audit log
    }
    return { ok: true };
  });

export const importSchoolsBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        schools: z
          .array(
            z.object({
              name: z.string().trim().min(1),
              school_code: z.string().trim().min(1),
              address: z.string().trim().nullable().optional().default(null),
              city: z.string().trim().nullable().optional().default(null),
              province: z.string().trim().nullable().optional().default(null),
              mentor: z.string().trim().nullable().optional().default(null),
              partnership_type: z.string().trim().nullable().optional().default(null),
              contact_name: z.string().trim().nullable().optional().default(null),
              contact_phone: z.string().trim().nullable().optional().default(null),
              status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
            }),
          )
          .min(1, "Minimal 1 data sekolah untuk diimpor.")
          .max(1000, "Maksimal 1000 baris dalam satu kali impor."),
        upsert: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    await assertAdminRole(context.supabase, context.userId);

    const { schools, upsert } = data;
    const chunkSize = 50;
    let processedCount = 0;

    for (let i = 0; i < schools.length; i += chunkSize) {
      const slice = schools.slice(i, i + chunkSize);

      const fullChunk = slice.map((item) => ({
        name: item.name,
        school_code: item.school_code.toUpperCase(),
        address: item.address || null,
        city: item.city || null,
        province: item.province || null,
        mentor: item.mentor || null,
        partnership_type: item.partnership_type || null,
        contact_name: item.contact_name || null,
        contact_phone: item.contact_phone || null,
        status: item.status,
      }));

      const baseChunk = slice.map((item) => {
        const embeddedAddress =
          item.mentor || item.partnership_type
            ? `${item.address || ""} <!--meta:${JSON.stringify({
                mentor: item.mentor || null,
                partnership_type: item.partnership_type || null,
              })}-->`.trim()
            : item.address || null;

        return {
          name: item.name,
          school_code: item.school_code.toUpperCase(),
          address: embeddedAddress,
          city: item.city || null,
          province: item.province || null,
          contact_name: item.contact_name || null,
          contact_phone: item.contact_phone || null,
          status: item.status,
        };
      });

      let insertErr: { message?: string; code?: string } | null = null;

      if (upsert) {
        const res = await context.supabase
          .from("schools")
          .upsert(fullChunk, { onConflict: "school_code" });
        insertErr = res.error;

        if (
          insertErr &&
          (insertErr.message?.includes("column") ||
            insertErr.code === "PGRST204" ||
            insertErr.message?.includes("mentor") ||
            insertErr.message?.includes("partnership_type"))
        ) {
          const fallbackRes = await context.supabase
            .from("schools")
            .upsert(baseChunk, { onConflict: "school_code" });
          insertErr = fallbackRes.error;
        }
      } else {
        const res = await context.supabase.from("schools").insert(fullChunk);
        insertErr = res.error;

        if (
          insertErr &&
          (insertErr.message?.includes("column") ||
            insertErr.code === "PGRST204" ||
            insertErr.message?.includes("mentor") ||
            insertErr.message?.includes("partnership_type"))
        ) {
          const fallbackRes = await context.supabase.from("schools").insert(baseChunk);
          insertErr = fallbackRes.error;
        }
      }

      if (insertErr) {
        throw new Error(
          `Gagal menyimpan ke database (Batch ${Math.floor(i / chunkSize) + 1}): ${
            insertErr.message || "Pastikan format data sesuai."
          }`,
        );
      }

      processedCount += slice.length;
    }

    try {
      await context.supabase.from("audit_logs").insert({
        user_id: context.userId,
        action: "IMPORT_EXCEL",
        entity: "school",
        entity_id: null,
        detail: `Import bulk ${processedCount} data sekolah via Excel`,
      });
    } catch {
      // Non-blocking audit log
    }

    return { success: true, count: processedCount };
  });

export const listStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (isDemoEmail(context.claims?.email)) {
      return DUMMY_STUDENTS;
    }
    const { data, error } = await context.supabase
      .from("students")
      .select("*, schools(name, school_code, city, province)")
      .order("name");
    if (error) throw new Error("Gagal memuat data siswa.");

interface StudentMeta {
  batch_id?: string | null;
  mentor?: string | null;
  city?: string | null;
  program_status?: string | null;
  talent_pool_year?: string | null;
  driving_r4?: string | null;
  sim_a?: string | null;
  sim_c?: string | null;
  theory_score?: string | null;
  interview_score?: string | null;
  graduation_status?: string | null;
}

    // Enrich rows with parsed vocational metadata if embedded
    const enriched = (data || []).map((s: Record<string, unknown>) => {
      const sourceStr = `${s["email"] || ""} ${s["phone"] || ""} ${s["competency"] || ""}`;
      const { metadata: meta } = extractMetadata<StudentMeta>(sourceStr);

      const batch_id = (s["batch_id"] as string | null) ?? meta?.batch_id ?? "Batch 01";
      const mentor = (s["mentor"] as string | null) ?? meta?.mentor ?? null;
      const city = (s["city"] as string | null) ?? meta?.city ?? null;
      const program_status =
        (s["program_status"] as string | null) ?? meta?.program_status ?? "TalentPool";
      const talent_pool_year =
        (s["talent_pool_year"] as string | null) ?? meta?.talent_pool_year ?? "2024";
      const driving_r4 = (s["driving_r4"] as string | null) ?? meta?.driving_r4 ?? null;
      const sim_a = (s["sim_a"] as string | null) ?? meta?.sim_a ?? null;
      const sim_c = (s["sim_c"] as string | null) ?? meta?.sim_c ?? null;
      const theory_score = (s["theory_score"] as string | null) ?? meta?.theory_score ?? null;
      const interview_score =
        (s["interview_score"] as string | null) ?? meta?.interview_score ?? null;
      const graduation_status =
        (s["graduation_status"] as string | null) ??
        meta?.graduation_status ??
        (s["status"] === "ACTIVE" ? "Lulus" : "Tidak Lulus");

      const cleanEmail = stripMetadata(s["email"] as string | null) || null;
      const cleanPhone = stripMetadata(s["phone"] as string | null) || null;

      return {
        ...s,
        email: cleanEmail,
        phone: cleanPhone,
        batch_id,
        mentor,
        city: city || (s["schools"] as any)?.city || null,
        program_status,
        talent_pool_year,
        driving_r4,
        sim_a,
        sim_c,
        theory_score,
        interview_score,
        graduation_status,
      };
    });

    return enriched;
  });

export const importStudentsBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        students: z
          .array(
            z.object({
              batch_id: z.string().trim().nullable().optional().default("Batch 01"),
              school_name: z.string().trim().min(1),
              school_code: z.string().trim().nullable().optional().default(null),
              name: z.string().trim().min(1),
              mentor: z.string().trim().nullable().optional().default(null),
              city: z.string().trim().nullable().optional().default(null),
              competency: z.string().trim().nullable().optional().default("Kelas XII"),
              program_status: z.string().trim().nullable().optional().default("TalentPool"),
              talent_pool_year: z.string().trim().nullable().optional().default("2024"),
              student_number: z.string().trim().min(1),
              email: z.string().trim().nullable().optional().default(null),
              phone: z.string().trim().nullable().optional().default(null),
              driving_r4: z.string().trim().nullable().optional().default("Tidak Bisa"),
              sim_a: z.string().trim().nullable().optional().default("Tidak Memiliki"),
              sim_c: z.string().trim().nullable().optional().default("Tidak Memiliki"),
              birth_date: z.string().trim().nullable().optional().default(null),
              gender: z.enum(["L", "P"]).nullable().optional().default("L"),
              theory_score: z.string().trim().nullable().optional().default(null),
              interview_score: z.string().trim().nullable().optional().default(null),
              graduation_status: z.string().trim().nullable().optional().default("Lulus"),
              status: z.string().trim().default("Aktif Akademi"),
            }),
          )
          .min(1, "Minimal 1 data siswa untuk diimpor.")
          .max(1000, "Maksimal 1000 baris dalam satu kali impor."),
        upsert: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    await assertAdminRole(context.supabase, context.userId);

    const { students, upsert } = data;

    // 1. Fetch existing schools
    const { data: existingSchools } = await context.supabase
      .from("schools")
      .select("id, name, school_code");
    const schoolMapByName = new Map<string, string>();
    const schoolMapByCode = new Map<string, string>();

    (existingSchools || []).forEach((sch) => {
      if (sch.name) schoolMapByName.set(sch.name.toLowerCase().trim(), sch.id);
      if (sch.school_code) {
        schoolMapByCode.set(sch.school_code.toLowerCase().trim(), sch.id);
      }
    });

    // 2. Identify missing schools and auto-create them using school_code (Kode BMI)
    const missingSchools = new Map<string, { name: string; code: string }>();
    students.forEach((st, i) => {
      const codeKey = st.school_code ? st.school_code.toLowerCase().trim() : "";
      const nameKey = st.school_name.toLowerCase().trim();

      const matchedId = (codeKey && schoolMapByCode.get(codeKey)) || schoolMapByName.get(nameKey);

      if (!matchedId) {
        const uniqueKey = codeKey || nameKey;
        if (!missingSchools.has(uniqueKey)) {
          const finalCode =
            st.school_code?.trim() || `SCH-${Date.now().toString().slice(-4)}-${i + 1}`;
          missingSchools.set(uniqueKey, {
            name: st.school_name.trim(),
            code: finalCode,
          });
        }
      }
    });

    if (missingSchools.size > 0) {
      const newSchools = Array.from(missingSchools.values()).map((sch) => ({
        name: sch.name,
        school_code: sch.code,
        status: "ACTIVE",
      }));

      const { data: createdSchools, error: schErr } = await context.supabase
        .from("schools")
        .insert(newSchools)
        .select("id, name, school_code");

      if (!schErr && createdSchools) {
        createdSchools.forEach((sch) => {
          if (sch.name) schoolMapByName.set(sch.name.toLowerCase().trim(), sch.id);
          if (sch.school_code) schoolMapByCode.set(sch.school_code.toLowerCase().trim(), sch.id);
        });
      }
    }

    const defaultSchoolId = existingSchools?.[0]?.id;

    // 3. Process students in chunks
    const chunkSize = 50;
    let processedCount = 0;

    for (let i = 0; i < students.length; i += chunkSize) {
      const slice = students.slice(i, i + chunkSize);

      const chunk = slice.map((st) => {
        const codeKey = st.school_code ? st.school_code.toLowerCase().trim() : "";
        const nameKey = st.school_name.toLowerCase().trim();

        const schoolId =
          (codeKey && schoolMapByCode.get(codeKey)) ||
          schoolMapByName.get(nameKey) ||
          defaultSchoolId ||
          existingSchools?.[0]?.id;

        const metaObj = {
          batch_id: st.batch_id || "Batch 01",
          mentor: st.mentor || null,
          city: st.city || null,
          program_status: st.program_status || "TalentPool",
          talent_pool_year: st.talent_pool_year || "2024",
          driving_r4: st.driving_r4 || "Tidak Bisa",
          sim_a: st.sim_a || "Tidak Memiliki",
          sim_c: st.sim_c || "Tidak Memiliki",
          theory_score: st.theory_score || null,
          interview_score: st.interview_score || null,
          graduation_status: st.graduation_status || "Lulus",
        };

        const metaTag = `<!--meta:${JSON.stringify(metaObj)}-->`;
        const emailWithMeta = st.email ? `${st.email} ${metaTag}` : metaTag;

        let formattedBirthDate: string | null = null;
        if (st.birth_date) {
          const raw = String(st.birth_date).trim();
          if (raw && raw !== "-" && raw !== "null") {
            if (/^\d{4,6}$/.test(raw)) {
              const serial = parseInt(raw, 10);
              const d = new Date((serial - 25569) * 86400 * 1000);
              if (!isNaN(d.getTime())) {
                formattedBirthDate = d.toISOString().split("T")[0] ?? null;
              }
            } else {
              const dmyMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
              if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
                let day = parseInt(dmyMatch[1], 10);
                let month = parseInt(dmyMatch[2], 10);
                let year = parseInt(dmyMatch[3], 10);
                if (year < 100) year += 2000;
                if (
                  month >= 1 &&
                  month <= 12 &&
                  day >= 1 &&
                  day <= 31 &&
                  year >= 1900 &&
                  year <= 2100
                ) {
                  formattedBirthDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                }
              } else {
                const ymdMatch = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
                if (ymdMatch && ymdMatch[1] && ymdMatch[2] && ymdMatch[3]) {
                  let year = parseInt(ymdMatch[1], 10);
                  let month = parseInt(ymdMatch[2], 10);
                  let day = parseInt(ymdMatch[3], 10);
                  if (
                    month >= 1 &&
                    month <= 12 &&
                    day >= 1 &&
                    day <= 31 &&
                    year >= 1900 &&
                    year <= 2100
                  ) {
                    formattedBirthDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  }
                }
              }
            }
          }
        }

        return {
          name: st.name,
          student_number: st.student_number.toUpperCase(),
          school_id: schoolId,
          gender: st.gender || "L",
          birth_date: formattedBirthDate,
          phone: st.phone || null,
          email: emailWithMeta,
          competency: st.competency || "Kelas XII",
          status: st.status || "ACTIVE",
        };
      });

      let insertErr: { message?: string; code?: string } | null = null;

      if (upsert) {
        const res = await context.supabase
          .from("students")
          .upsert(chunk, { onConflict: "school_id,student_number" });
        insertErr = res.error;

        if (
          insertErr &&
          (insertErr.message?.includes("on conflict") || insertErr.code === "42P10")
        ) {
          const fallbackRes = await context.supabase
            .from("students")
            .upsert(chunk, { onConflict: "student_number" as any });
          insertErr = fallbackRes.error;
        }
      } else {
        const res = await context.supabase.from("students").insert(chunk);
        insertErr = res.error;
      }

      if (insertErr) {
        throw new Error(
          `Gagal menyimpan data siswa ke database (Batch ${Math.floor(i / chunkSize) + 1}): ${
            insertErr.message || "Pastikan format data sesuai."
          }`,
        );
      }

      processedCount += slice.length;
    }

    try {
      await context.supabase.from("audit_logs").insert({
        user_id: context.userId,
        action: "IMPORT_EXCEL",
        entity: "student",
        entity_id: null,
        detail: `Import bulk ${processedCount} data siswa via Excel`,
      });
    } catch {
      // Non-blocking audit log
    }

    return { success: true, count: processedCount };
  });

export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid("ID Siswa tidak valid."),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    await assertAdminRole(context.supabase, context.userId);

    const { error } = await context.supabase.from("students").delete().eq("id", data.id);

    if (error) {
      throw new Error(`Gagal menghapus data siswa: ${error.message}`);
    }

    try {
      await context.supabase.from("audit_logs").insert({
        user_id: context.userId,
        action: "DELETE",
        entity: "student",
        entity_id: data.id,
        detail: `Menghapus data siswa ID ${data.id}`,
      });
    } catch {
      // Non-blocking audit log
    }

    return { success: true };
  });

export const clearAllStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertNotDemo(context);
    await assertAdminRole(context.supabase, context.userId);

    const { error } = await context.supabase
      .from("students")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      throw new Error(`Gagal mengosongkan data siswa: ${error.message}`);
    }

    try {
      await context.supabase.from("audit_logs").insert({
        user_id: context.userId,
        action: "DELETE_ALL",
        entity: "student",
        entity_id: null,
        detail: "Mengosongkan semua data siswa untuk persiapan impor baru",
      });
    } catch {
      // Non-blocking audit log
    }

    return { success: true };
  });

export const bulkUpdateStudentsStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1, "Pilih minimal 1 siswa"),
        status: z.string().trim().optional(),
        competency: z.string().trim().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    const { supabase, userId } = context;
    await assertAdminRole(supabase, userId);

    const { ids, status, competency } = data;

    const { data: existingList } = await supabase
      .from("students")
      .select("id, email, phone, competency, status")
      .in("id", ids);

    for (let i = 0; i < (existingList ?? []).length; i += 25) {
      const chunk = (existingList ?? []).slice(i, i + 25);
      await Promise.all(
        chunk.map(async (st) => {
          const sourceStr = `${st.email || ""} ${st.phone || ""}`;
          const match = sourceStr.match(/<!--meta:(.*?)-->/);
          let meta: Record<string, any> = {};
          if (match && match[1]) {
            try {
              meta = JSON.parse(match[1]);
            } catch {}
          }
          if (status) meta["program_status"] = status;
          const metaTag = `<!--meta:${JSON.stringify(meta)}-->`;
          let cleanEmail = st.email ? st.email.replace(/<!--meta:.*?-->/, "").trim() : "";
          const newEmail = cleanEmail ? `${cleanEmail} ${metaTag}` : metaTag;

          const updatePayload: Record<string, any> = {
            email: newEmail,
          };
          if (status) updatePayload["status"] = status;
          if (competency) updatePayload["competency"] = competency;

          return supabase.from("students").update(updatePayload).eq("id", st.id);
        }),
      );
    }

    try {
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "BULK_UPDATE",
        entity: "student",
        entity_id: null,
        detail: `Bulk update ${ids.length} siswa status=${status || "-"} kelas=${competency || "-"}`,
      });
    } catch {}

    return { success: true, count: ids.length };
  });

export const bulkDeleteStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1, "Pilih minimal 1 siswa"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    const { supabase, userId } = context;
    await assertAdminRole(supabase, userId);

    for (let i = 0; i < data.ids.length; i += 100) {
      const chunk = data.ids.slice(i, i + 100);
      await supabase.from("students").delete().in("id", chunk);
    }

    try {
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "BULK_DELETE",
        entity: "student",
        entity_id: null,
        detail: `Menghapus massal ${data.ids.length} data siswa`,
      });
    } catch {}

    return { success: true, count: data.ids.length };
  });

export const saveStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        school_id: z.string().uuid().optional(),
        student_number: z.string().trim().min(2).max(50),
        name: z.string().trim().min(2).max(150),
        gender: z.enum(["L", "P"]).nullable().default(null),
        birth_date: z.string().trim().nullable().default(null),
        phone: z.string().trim().max(50).nullable().default(null),
        email: z.string().trim().max(300).nullable().default(null),
        competency: z.string().trim().min(1).max(100),
        status: z.string().trim().default("Aktif Akademi"),
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
    const { id, ...rest } = data;
    const cleanEmail = rest.email
      ? rest.email
          .replace(/ı/g, "i")
          .replace(/İ/g, "I")
          .replace(/[\u200B-\u200D\uFEFF]/g, "")
          .trim()
      : null;

    let finalEmail = cleanEmail;
    if (id) {
      const { data: existing } = await supabase
        .from("students")
        .select("email, phone, competency")
        .eq("id", id)
        .maybeSingle();

      const sourceStr = `${existing?.email || ""} ${existing?.phone || ""}`;
      const match = sourceStr.match(/<!--meta:(.*?)-->/);
      let existingMeta: Record<string, any> = {};
      if (match && match[1]) {
        try {
          existingMeta = JSON.parse(match[1]);
        } catch {}
      }
      existingMeta["program_status"] = data.status;
      const metaTag = `<!--meta:${JSON.stringify(existingMeta)}-->`;
      finalEmail = finalEmail ? `${finalEmail} ${metaTag}` : metaTag;
    }

    const values = {
      ...rest,
      school_id: schoolId,
      email: finalEmail,
    };

    const query = id
      ? supabase.from("students").update(values).eq("id", id)
      : supabase.from("students").insert(values);

    const { error } = await query;
    if (error) {
      throw new Error(`Data siswa gagal disimpan: ${error.message}`);
    }

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
    if (isDemoEmail(context.claims?.email)) {
      return {
        companies: DUMMY_COMPANIES.map((c) => {
          const branches = (c.branches || []).map((b) => {
            const count = DUMMY_INTERNSHIPS.filter(
              (i) =>
                String(i.target_pkt || "")
                  .toLowerCase()
                  .trim() === b.branch_name.toLowerCase().trim() ||
                String(i.target_pkt || "")
                  .toLowerCase()
                  .trim()
                  .includes(b.branch_name.toLowerCase().trim()),
            ).length;
            return { ...b, internCount: count };
          });
          const totalInterns = branches.reduce((acc, b) => acc + (b.internCount || 0), 0);
          return {
            ...c,
            branches,
            totalInterns,
          };
        }),
        quotas: [],
      };
    }

    const [companiesRes, quotasRes, internshipsRes] = await Promise.all([
      context.supabase.from("companies").select("*").order("name"),
      context.supabase.from("company_quotas").select("*").order("competency"),
      context.supabase.from("internships").select("id, approval_note, competency, status"),
    ]);

    const rawCompanies = companiesRes.data ?? [];

    const rawInternships = internshipsRes.data || [];
    const targetPktCounts = new Map<string, number>();

    for (const intern of rawInternships) {
      const note = intern.approval_note || "";
      let targetPkt = "";
      if (note.includes("<!--meta:")) {
        try {
          const match = note.match(/<!--meta:(.*?)-->/);
          if (match && match[1]) {
            const meta = JSON.parse(match[1]);
            if (meta.target_pkt) targetPkt = String(meta.target_pkt).trim().toLowerCase();
          }
        } catch {}
      }
      if (targetPkt) {
        targetPktCounts.set(targetPkt, (targetPktCounts.get(targetPkt) || 0) + 1);
      }
    }

    const enrichedCompanies = rawCompanies.map((comp: Record<string, unknown>) => {
      const { cleanText: cleanAddress, metadata: meta } = extractMetadata<{
        branches?: Array<{
          id: string;
          branch_name: string;
          address: string;
          city?: string | null;
          province?: string | null;
          contact_person?: string | null;
          phone?: string | null;
          internCount?: number;
        }>;
      }>(comp["address"] as string | null);

      let branches = Array.isArray(meta?.branches) ? meta.branches : [];

      // If no branches defined, create a default branch from company's own address
      if (branches.length === 0 && cleanAddress) {
        branches = [
          {
            id: `b-${comp["id"]}-main`,
            branch_name: `${comp["company_code"] || comp["name"]} - Pusat`,
            address: cleanAddress,
            city: (comp["city"] as string) || null,
            province: (comp["province"] as string) || null,
          },
        ];
      }

      // Calculate intern count for each branch
      const branchesWithCounts = branches.map((b) => {
        const bLower = b.branch_name.toLowerCase().trim();
        let count = targetPktCounts.get(bLower) || 0;
        if (count === 0) {
          for (const [key, val] of targetPktCounts.entries()) {
            if (key.includes(bLower) || bLower.includes(key)) {
              count += val;
            }
          }
        }
        return {
          ...b,
          internCount: count,
        };
      });

      const totalInterns = branchesWithCounts.reduce((acc, b) => acc + (b.internCount || 0), 0);

      return {
        ...comp,
        address: cleanAddress,
        branches: branchesWithCounts,
        totalInterns,
      };
    });

    return { companies: enrichedCompanies, quotas: quotasRes.data ?? [] };
  });

export const saveCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(2).max(150),
        company_code: z.string().trim().min(1).max(50),
        industry: z.string().trim().max(120).nullable().default(null),
        address: z.string().trim().max(1000).nullable().default(null),
        city: z.string().trim().max(80).nullable().default(null),
        province: z.string().trim().max(80).nullable().default(null),
        contact_name: z.string().trim().max(80).nullable().default(null),
        contact_email: z.string().trim().max(160).nullable().default(null),
        contact_phone: z.string().trim().max(30).nullable().default(null),
        status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
        branches: z
          .array(
            z.object({
              id: z.string(),
              branch_name: z.string().trim().min(1),
              address: z.string().trim().min(1),
              city: z.string().trim().nullable().optional().default(null),
              province: z.string().trim().nullable().optional().default(null),
            }),
          )
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    await assertAdminRole(context.supabase, context.userId);
    const { id, branches, ...values } = data;

    let finalAddress = values.address || "";
    if (branches && branches.length > 0) {
      finalAddress = `${finalAddress} <!--meta:${JSON.stringify({ branches })}-->`.trim();
    }

    const payload = {
      ...values,
      address: finalAddress,
    };

    const query = id
      ? context.supabase.from("companies").update(payload).eq("id", id)
      : context.supabase.from("companies").insert(payload);
    const { error } = await query;
    if (error) throw new Error(`Data perusahaan gagal disimpan: ${error.message}`);

    await context.supabase.from("audit_logs").insert({
      user_id: context.userId,
      action: id ? "UPDATE" : "CREATE",
      entity: "company",
      entity_id: id ?? null,
      detail: values.name,
    });
    return { ok: true };
  });

export const deleteCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    await assertAdminRole(context.supabase, context.userId);

    // 1. Delete dependent company_quotas
    try {
      await context.supabase.from("company_quotas").delete().eq("company_id", data.id);
    } catch {}

    // 2. Delete dependent competency_demand
    try {
      await context.supabase.from("competency_demand").delete().eq("company_id", data.id);
    } catch {}

    // 3. Handle internships referencing this company
    try {
      const { error: nullErr } = await context.supabase
        .from("internships")
        .update({ company_id: null as any })
        .eq("company_id", data.id);

      if (nullErr) {
        // Find another company to re-assign if NOT NULL constraint
        const { data: otherComp } = await context.supabase
          .from("companies")
          .select("id")
          .neq("id", data.id)
          .limit(1)
          .maybeSingle();

        if (otherComp) {
          await context.supabase
            .from("internships")
            .update({ company_id: otherComp.id })
            .eq("company_id", data.id);
        } else {
          // Cascade delete orphan internship tracking rows
          const { data: linkedInterns } = await context.supabase
            .from("internships")
            .select("id")
            .eq("company_id", data.id);

          const internIds = (linkedInterns || []).map((i) => i.id);
          if (internIds.length > 0) {
            await context.supabase.from("attendance").delete().in("internship_id", internIds);
            await context.supabase.from("evaluations").delete().in("internship_id", internIds);
            await context.supabase
              .from("internship_reports")
              .delete()
              .in("internship_id", internIds);
            await context.supabase.from("internships").delete().in("id", internIds);
          }
        }
      }
    } catch {}

    // 4. Delete the company
    const { error } = await context.supabase.from("companies").delete().eq("id", data.id);
    if (error) throw new Error(`Gagal menghapus data perusahaan: ${error.message}`);

    try {
      await context.supabase.from("audit_logs").insert({
        user_id: context.userId,
        action: "DELETE",
        entity: "company",
        entity_id: data.id,
        detail: "Menghapus data perusahaan dan cabangnya",
      });
    } catch {}

    return { ok: true };
  });

export const clearAllCompanies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertNotDemo(context);
    await assertAdminRole(context.supabase, context.userId);

    // 1. Delete company_quotas
    try {
      await context.supabase
        .from("company_quotas")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
    } catch {}

    // 2. Delete competency_demand
    try {
      await context.supabase
        .from("competency_demand")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
    } catch {}

    // 3. Unlink or clean up internships referencing companies
    try {
      const { error: nullErr } = await context.supabase
        .from("internships")
        .update({ company_id: null as any })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (nullErr) {
        // If company_id has a strict NOT NULL constraint, clean up internship dependencies
        await context.supabase
          .from("attendance")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
        await context.supabase
          .from("evaluations")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
        await context.supabase
          .from("internship_reports")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
        await context.supabase
          .from("internships")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
      }
    } catch {}

    // 4. Delete all companies
    const { error } = await context.supabase
      .from("companies")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) throw new Error(`Gagal mengosongkan database perusahaan: ${error.message}`);

    try {
      await context.supabase.from("audit_logs").insert({
        user_id: context.userId,
        action: "DELETE_ALL",
        entity: "companies",
        entity_id: null,
        detail: "Mengosongkan seluruh data perusahaan tempat magang untuk upload ulang",
      });
    } catch {}

    return { ok: true };
  });

export const saveCompanyBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        branch: z.object({
          id: z.string().optional(),
          branch_name: z.string().trim().min(1, "Nama Cabang PKT wajib diisi"),
          address: z.string().trim().min(1, "Alamat cabang wajib diisi"),
          city: z.string().trim().nullable().optional().default(null),
          province: z.string().trim().nullable().optional().default(null),
        }),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    await assertAdminRole(context.supabase, context.userId);

    const { data: comp } = await context.supabase
      .from("companies")
      .select("address")
      .eq("id", data.companyId)
      .maybeSingle();

    if (!comp) throw new Error("Perusahaan tidak ditemukan.");

    let rawAddress = comp.address || "";
    let branches: any[] = [];
    if (rawAddress.includes("<!--meta:")) {
      try {
        const match = rawAddress.match(/<!--meta:(.*?)-->/);
        if (match && match[1]) {
          const meta = JSON.parse(match[1]);
          if (Array.isArray(meta.branches)) branches = meta.branches;
        }
      } catch {}
      rawAddress = rawAddress.replace(/<!--meta:.*?-->/, "").trim();
    }

    const branchId = data.branch.id || `branch-${Date.now()}`;
    const branchItem = {
      id: branchId,
      branch_name: data.branch.branch_name,
      address: data.branch.address,
      city: data.branch.city || null,
      province: data.branch.province || null,
    };

    const existingIdx = branches.findIndex((b) => b.id === branchId);
    if (existingIdx >= 0) {
      branches[existingIdx] = branchItem;
    } else {
      branches.push(branchItem);
    }

    const newAddress = `${rawAddress} <!--meta:${JSON.stringify({ branches })}-->`.trim();
    const { error } = await context.supabase
      .from("companies")
      .update({ address: newAddress })
      .eq("id", data.companyId);

    if (error) throw new Error(`Gagal menyimpan cabang: ${error.message}`);
    return { ok: true };
  });

export const deleteCompanyBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        companyId: z.string().uuid(),
        branchId: z.string(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    await assertAdminRole(context.supabase, context.userId);

    const { data: comp } = await context.supabase
      .from("companies")
      .select("address")
      .eq("id", data.companyId)
      .maybeSingle();

    if (!comp) throw new Error("Perusahaan tidak ditemukan.");

    let rawAddress = comp.address || "";
    let branches: any[] = [];
    if (rawAddress.includes("<!--meta:")) {
      try {
        const match = rawAddress.match(/<!--meta:(.*?)-->/);
        if (match && match[1]) {
          const meta = JSON.parse(match[1]);
          if (Array.isArray(meta.branches)) branches = meta.branches;
        }
      } catch {}
      rawAddress = rawAddress.replace(/<!--meta:.*?-->/, "").trim();
    }

    branches = branches.filter((b) => b.id !== data.branchId);

    const newAddress =
      branches.length > 0
        ? `${rawAddress} <!--meta:${JSON.stringify({ branches })}-->`.trim()
        : rawAddress;

    const { error } = await context.supabase
      .from("companies")
      .update({ address: newAddress })
      .eq("id", data.companyId);

    if (error) throw new Error(`Gagal menghapus cabang: ${error.message}`);
    return { ok: true };
  });

export const importCompanyBranchesBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        items: z.array(
          z.object({
            company_name: z.string().trim().min(1),
            branch_name: z.string().trim().min(1),
            address: z.string().trim().min(1),
          }),
        ),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    await assertAdminRole(context.supabase, context.userId);

    const { items } = data;
    if (items.length === 0) return { success: true, count: 0 };

    // Group branches by company_name
    const grouped = new Map<string, Array<{ branch_name: string; address: string }>>();
    for (const item of items) {
      const cName = item.company_name.trim();
      if (!grouped.has(cName)) grouped.set(cName, []);
      grouped.get(cName)!.push({
        branch_name: item.branch_name.trim(),
        address: item.address.trim(),
      });
    }

    const { data: existingCompanies } = await context.supabase
      .from("companies")
      .select("id, name, company_code, address");

    const existingMap = new Map<string, any>();
    (existingCompanies || []).forEach((c) => {
      existingMap.set(c.name.toLowerCase().trim(), c);
    });

    let processedCount = 0;

    for (const [companyName, branchList] of grouped.entries()) {
      const cLower = companyName.toLowerCase().trim();
      let companyId: string;
      let rawAddress = "";
      let existingBranches: any[] = [];

      if (existingMap.has(cLower)) {
        const existing = existingMap.get(cLower);
        companyId = existing.id;
        rawAddress = existing.address || "";
        if (rawAddress.includes("<!--meta:")) {
          try {
            const match = rawAddress.match(/<!--meta:(.*?)-->/);
            if (match && match[1]) {
              const meta = JSON.parse(match[1]);
              if (Array.isArray(meta.branches)) existingBranches = meta.branches;
            }
          } catch {}
          rawAddress = rawAddress.replace(/<!--meta:.*?-->/, "").trim();
        }
      } else {
        // Create new company
        const code = companyName
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 10);
        const { data: inserted, error: insErr } = await context.supabase
          .from("companies")
          .insert({
            name: companyName,
            company_code: code,
            address: branchList[0]?.address || "-",
            status: "ACTIVE",
          })
          .select("id")
          .single();

        if (insErr || !inserted) continue;
        companyId = inserted.id;
        rawAddress = branchList[0]?.address || "-";
      }

      // Merge branches
      const branchMap = new Map<string, any>();
      existingBranches.forEach((b) => branchMap.set(b.branch_name.toLowerCase().trim(), b));

      branchList.forEach((b, idx) => {
        const bLower = b.branch_name.toLowerCase().trim();
        branchMap.set(bLower, {
          id: branchMap.get(bLower)?.id || `branch-${Date.now()}-${idx}`,
          branch_name: b.branch_name,
          address: b.address,
        });
      });

      const mergedBranches = Array.from(branchMap.values());
      const newAddress =
        `${rawAddress} <!--meta:${JSON.stringify({ branches: mergedBranches })}-->`.trim();

      await context.supabase.from("companies").update({ address: newAddress }).eq("id", companyId);

      // Re-link existing internships that match any branch in this company
      try {
        const { data: allInterns } = await context.supabase
          .from("internships")
          .select("id, approval_note");

        for (const intern of allInterns || []) {
          const note = intern.approval_note || "";
          let targetPkt = "";
          if (note.includes("<!--meta:")) {
            try {
              const match = note.match(/<!--meta:(.*?)-->/);
              if (match && match[1]) {
                const meta = JSON.parse(match[1]);
                if (meta.target_pkt) targetPkt = String(meta.target_pkt).trim().toLowerCase();
              }
            } catch {}
          }
          if (targetPkt) {
            const matchesThisComp = mergedBranches.some((b: any) => {
              const bName = (b.branch_name || "").toLowerCase().trim();
              return (
                bName === targetPkt ||
                bName.includes(targetPkt) ||
                targetPkt.includes(bName) ||
                companyName.toLowerCase().includes(targetPkt)
              );
            });
            if (matchesThisComp) {
              await context.supabase
                .from("internships")
                .update({ company_id: companyId })
                .eq("id", intern.id);
            }
          }
        }
      } catch {}

      processedCount += branchList.length;
    }

    try {
      await context.supabase.from("audit_logs").insert({
        user_id: context.userId,
        action: "IMPORT_EXCEL",
        entity: "company_branches",
        entity_id: null,
        detail: `Import bulk ${processedCount} data cabang PKT perusahaan`,
      });
    } catch {}

    return { success: true, count: processedCount };
  });

export const seedDefaultCompaniesAndBranches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertNotDemo(context);
    await assertAdminRole(context.supabase, context.userId);

    const kja = DUMMY_COMPANIES.find((c) => c.company_code === "KJA");
    const acs = DUMMY_COMPANIES.find((c) => c.company_code === "ACS");

    const toSeed = [kja, acs].filter(Boolean);

    for (const comp of toSeed) {
      if (!comp) continue;
      const { data: existing } = await context.supabase
        .from("companies")
        .select("id, address")
        .ilike("name", comp.name)
        .maybeSingle();

      const metaTag = `<!--meta:${JSON.stringify({ branches: comp.branches })}-->`;
      const finalAddress = `${comp.address} ${metaTag}`.trim();

      if (existing) {
        await context.supabase
          .from("companies")
          .update({
            company_code: comp.company_code,
            industry: comp.industry,
            address: finalAddress,
            city: comp.city,
            province: comp.province,
            status: "ACTIVE",
          })
          .eq("id", existing.id);
      } else {
        await context.supabase.from("companies").insert({
          name: comp.name,
          company_code: comp.company_code,
          industry: comp.industry,
          address: finalAddress,
          city: comp.city,
          province: comp.province,
          status: "ACTIVE",
        });
      }
    }

    return { success: true };
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
    if (isDemoEmail(context.claims?.email)) {
      return DUMMY_INTERNSHIPS;
    }
    const { data, error } = await context.supabase
      .from("internships")
      .select(
        "*, students(id, name, student_number, email, phone, competency, birth_date, gender), schools(id, name, city, school_code), companies(id, name, city), evaluations(final_score)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error("Gagal memuat data pengajuan magang.");

    const enriched = (data || []).map((item: any) => {
      let batch_no = "Intra 3";
      let training_center = item.schools?.name || "-";
      let student_name = item.students?.name || "-";
      let mentor: string | null = null;
      let city = item.schools?.city || null;
      let driving_skill = "Siswa Aktif";
      let student_status = item.students?.competency || "Kelas XII";
      let target_pkt = item.companies?.name || "SSI - Pusat";
      let jobdesk = item.competency || "CPC";
      let placement_month = item.start_date || "02 Januari 2025";
      let email = item.students?.email || null;
      let phone = item.students?.phone || null;
      let internship_status =
        item.status === "ACTIVE"
          ? "Peserta Baru"
          : item.status === "COMPLETED"
            ? "Selesai"
            : "Peserta Baru";

      const note = item.approval_note || "";
      if (note.includes("<!--meta:")) {
        try {
          const match = note.match(/<!--meta:(.*?)-->/);
          if (match && match[1]) {
            const meta = JSON.parse(match[1]);
            if (meta.batch_no) batch_no = meta.batch_no;
            if (meta.training_center) training_center = meta.training_center;
            if (meta.student_name) student_name = meta.student_name;
            if (meta.mentor) mentor = meta.mentor;
            if (meta.city) city = meta.city;
            if (meta.driving_skill) driving_skill = meta.driving_skill;
            if (meta.student_status) student_status = meta.student_status;
            if (meta.target_pkt) target_pkt = meta.target_pkt;
            if (meta.jobdesk) jobdesk = meta.jobdesk;
            if (meta.placement_month) placement_month = meta.placement_month;
            if (meta.email) email = meta.email;
            if (meta.phone) phone = meta.phone;
            if (meta.internship_status) internship_status = meta.internship_status;
          }
        } catch {
          // ignore
        }
      }

      if (email && email.includes("<!--meta:")) {
        email = email.replace(/<!--meta:.*?-->/, "").trim() || null;
      }

      return {
        ...item,
        batch_no,
        training_center,
        student_name,
        mentor,
        city,
        driving_skill,
        student_status,
        target_pkt,
        jobdesk,
        placement_month,
        email,
        phone,
        internship_status,
      };
    });

    return enriched;
  });

export const importInternshipsBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        items: z
          .array(
            z.object({
              batch_no: z.string().trim().default("Intra 3"),
              training_center: z.string().trim().min(1),
              student_name: z.string().trim().min(1),
              mentor: z.string().trim().nullable().optional().default(null),
              city: z.string().trim().nullable().optional().default(null),
              driving_skill: z.string().trim().nullable().optional().default("Siswa Aktif"),
              student_status: z.string().trim().nullable().optional().default("Kelas XII"),
              target_pkt: z.string().trim().min(1),
              jobdesk: z.string().trim().nullable().optional().default("CPC"),
              placement_month: z.string().trim().nullable().optional().default("02 Januari 2025"),
              email: z.string().trim().nullable().optional().default(null),
              phone: z.string().trim().nullable().optional().default(null),
              internship_status: z.string().trim().default("Peserta Baru"),
            }),
          )
          .min(1, "Minimal 1 data peserta magang untuk diimpor.")
          .max(1000, "Maksimal 1000 baris dalam satu kali impor."),
        upsert: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    const { supabase, userId } = context;
    await assertAdminRole(supabase, userId);

    const { items, upsert } = data;

    // 1. Bulk Fetch Existing Schools & Companies
    const [schoolsRes, companiesRes] = await Promise.all([
      supabase.from("schools").select("id, name, school_code"),
      supabase.from("companies").select("id, name, company_code"),
    ]);

    const schoolMap = new Map<string, string>();
    (schoolsRes.data ?? []).forEach((s) => {
      schoolMap.set(s.name.toLowerCase().trim(), s.id);
    });

    const companyMap = new Map<string, string>();
    (companiesRes.data ?? []).forEach((c) => {
      companyMap.set(c.name.toLowerCase().trim(), c.id);
    });

    // 2. Bulk Identify & Create Missing Schools
    const missingSchools = new Map<string, { name: string; city?: string | null }>();
    items.forEach((item) => {
      const key = item.training_center.toLowerCase().trim();
      if (!schoolMap.has(key) && !missingSchools.has(key)) {
        missingSchools.set(key, { name: item.training_center.trim(), city: item.city });
      }
    });

    if (missingSchools.size > 0) {
      let codeIdx = schoolMap.size + 1;
      const newSchoolsPayload = Array.from(missingSchools.values()).map((sch) => ({
        name: sch.name,
        school_code: `TC-${String(codeIdx++).padStart(3, "0")}`,
        city: sch.city || "Indonesia",
        status: "ACTIVE",
      }));

      const { data: createdSchools } = await supabase
        .from("schools")
        .insert(newSchoolsPayload)
        .select("id, name");

      (createdSchools ?? []).forEach((sch) => {
        schoolMap.set(sch.name.toLowerCase().trim(), sch.id);
      });
    }

    // 3. Bulk Identify & Create Missing Companies (Target PKT)
    const missingCompanies = new Map<string, { name: string; city?: string | null }>();
    items.forEach((item) => {
      const key = item.target_pkt.toLowerCase().trim();
      if (!companyMap.has(key) && !missingCompanies.has(key)) {
        missingCompanies.set(key, { name: item.target_pkt.trim(), city: item.city });
      }
    });

    if (missingCompanies.size > 0) {
      let compIdx = companyMap.size + 1;
      const newCompaniesPayload = Array.from(missingCompanies.values()).map((comp) => ({
        name: comp.name,
        company_code: `PKT-${String(compIdx++).padStart(3, "0")}`,
        city: comp.city || "Indonesia",
        industry: "Perbankan / Pengelolaan Kas",
      }));

      const { data: createdCompanies } = await supabase
        .from("companies")
        .insert(newCompaniesPayload)
        .select("id, name");

      (createdCompanies ?? []).forEach((c) => {
        companyMap.set(c.name.toLowerCase().trim(), c.id);
      });
    }

    // 4. Bulk Fetch & Create Students
    const { data: existingStudents } = await supabase
      .from("students")
      .select("id, name, school_id, student_number");

    const studentMap = new Map<string, string>();
    (existingStudents ?? []).forEach((st) => {
      studentMap.set(`${st.school_id}_${st.name.toLowerCase().trim()}`, st.id);
    });

    const missingStudents = new Map<string, any>();
    items.forEach((item) => {
      const schoolId = schoolMap.get(item.training_center.toLowerCase().trim());
      if (!schoolId) return;

      const stKey = `${schoolId}_${item.student_name.toLowerCase().trim()}`;
      if (!studentMap.has(stKey) && !missingStudents.has(stKey)) {
        const nameSlug = item.student_name
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 20);
        const stuNumber = `${nameSlug}-${String(studentMap.size + missingStudents.size + 1).padStart(3, "0")}`;

        missingStudents.set(stKey, {
          school_id: schoolId,
          student_number: stuNumber,
          name: item.student_name.trim(),
          competency: item.student_status || "Kelas XII",
          status: "Aktif Akademi",
          phone: item.phone || null,
          email: item.email || null,
        });
      }
    });

    if (missingStudents.size > 0) {
      const studentChunks: any[][] = [];
      const allNewStudents = Array.from(missingStudents.values());
      for (let i = 0; i < allNewStudents.length; i += 100) {
        studentChunks.push(allNewStudents.slice(i, i + 100));
      }

      for (const chunk of studentChunks) {
        const { data: createdStudents } = await supabase
          .from("students")
          .insert(chunk)
          .select("id, name, school_id");

        (createdStudents ?? []).forEach((st) => {
          studentMap.set(`${st.school_id}_${st.name.toLowerCase().trim()}`, st.id);
        });
      }
    }

    // 5. Bulk Fetch Existing Internships
    const allStudentIds = Array.from(studentMap.values());
    const existingInternshipMap = new Map<string, string>();

    // Fetch in chunks of 200 student IDs
    for (let i = 0; i < allStudentIds.length; i += 200) {
      const idChunk = allStudentIds.slice(i, i + 200);
      const { data: intList } = await supabase
        .from("internships")
        .select("id, student_id")
        .in("student_id", idChunk);

      (intList ?? []).forEach((intItem) => {
        existingInternshipMap.set(intItem.student_id, intItem.id);
      });
    }

    // 6. Prepare Batch Inserts and Updates for Internships
    const toInsertInternships: any[] = [];
    const toUpdateInternships: { id: string; payload: any }[] = [];

    items.forEach((item) => {
      const schoolId = schoolMap.get(item.training_center.toLowerCase().trim());
      const companyId = companyMap.get(item.target_pkt.toLowerCase().trim());
      if (!schoolId || !companyId) return;

      const studentId = studentMap.get(`${schoolId}_${item.student_name.toLowerCase().trim()}`);
      if (!studentId) return;

      const metaObj = {
        batch_no: item.batch_no,
        training_center: item.training_center,
        student_name: item.student_name,
        mentor: item.mentor,
        city: item.city,
        driving_skill: item.driving_skill,
        student_status: item.student_status,
        target_pkt: item.target_pkt,
        jobdesk: item.jobdesk,
        placement_month: item.placement_month,
        email: item.email,
        phone: item.phone,
        internship_status: item.internship_status,
      };
      const metaTag = `<!--meta:${JSON.stringify(metaObj)}-->`;

      const existingId = existingInternshipMap.get(studentId);

      if (existingId) {
        if (upsert) {
          toUpdateInternships.push({
            id: existingId,
            payload: {
              company_id: companyId,
              school_id: schoolId,
              competency: item.jobdesk || "CPC",
              period: item.batch_no || "2025-S1",
              status: "ACTIVE",
              approval_note: metaTag,
              updated_at: new Date().toISOString(),
            },
          });
        }
      } else {
        toInsertInternships.push({
          student_id: studentId,
          company_id: companyId,
          school_id: schoolId,
          competency: item.jobdesk || "CPC",
          period: item.batch_no || "2025-S1",
          start_date: "2025-01-02",
          end_date: "2025-06-30",
          status: "ACTIVE",
          approval_note: metaTag,
        });
      }
    });

    // Execute Inserts in chunks of 100
    for (let i = 0; i < toInsertInternships.length; i += 100) {
      const chunk = toInsertInternships.slice(i, i + 100);
      await supabase.from("internships").insert(chunk);
    }

    // Execute Updates in parallel batches of 25
    for (let i = 0; i < toUpdateInternships.length; i += 25) {
      const updateBatch = toUpdateInternships.slice(i, i + 25);
      await Promise.all(
        updateBatch.map((u) => supabase.from("internships").update(u.payload).eq("id", u.id)),
      );
    }

    const totalProcessed = toInsertInternships.length + toUpdateInternships.length;

    try {
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "IMPORT",
        entity: "internship",
        entity_id: null,
        detail: `Impor massal ${totalProcessed} data peserta magang dari Excel`,
      });
    } catch {}

    return { success: true, count: totalProcessed };
  });

export const saveInternshipParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        batch_no: z.string().trim().default("Intra 3"),
        training_center: z.string().trim().min(1),
        student_name: z.string().trim().min(1),
        mentor: z.string().trim().nullable().default(null),
        city: z.string().trim().nullable().default(null),
        driving_skill: z.string().trim().nullable().default("Siswa Aktif"),
        student_status: z.string().trim().nullable().default("Kelas XII"),
        target_pkt: z.string().trim().min(1),
        jobdesk: z.string().trim().nullable().default("CPC"),
        placement_month: z.string().trim().nullable().default("02 Januari 2025"),
        email: z.string().trim().nullable().default(null),
        phone: z.string().trim().nullable().default(null),
        internship_status: z.string().trim().default("Peserta Baru"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    const { supabase, userId } = context;
    await assertAdminRole(supabase, userId);

    let { data: school } = await supabase
      .from("schools")
      .select("id")
      .ilike("name", data.training_center)
      .maybeSingle();

    if (!school) {
      const { data: newSch } = await supabase
        .from("schools")
        .insert({
          name: data.training_center,
          school_code: `TC-${Date.now().toString().slice(-4)}`,
          city: data.city || "Indonesia",
          status: "ACTIVE",
        })
        .select("id")
        .single();
      school = newSch;
    }

    if (!school) throw new Error("Gagal memvalidasi Training Center / Sekolah.");

    let { data: comp } = await supabase
      .from("companies")
      .select("id")
      .ilike("name", data.target_pkt)
      .maybeSingle();

    if (!comp) {
      const { data: newComp } = await supabase
        .from("companies")
        .insert({
          name: data.target_pkt,
          company_code: `PKT-${Date.now().toString().slice(-4)}`,
          city: data.city || "Indonesia",
          industry: "Perbankan / Pengelolaan Kas",
        })
        .select("id")
        .single();
      comp = newComp;
    }

    if (!comp) throw new Error("Gagal memvalidasi Target PKT / Perusahaan.");

    let { data: stu } = await supabase
      .from("students")
      .select("id")
      .eq("school_id", school.id)
      .ilike("name", data.student_name)
      .maybeSingle();

    if (!stu) {
      const nameSlug = data.student_name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 20);
      const { data: newStu } = await supabase
        .from("students")
        .insert({
          school_id: school.id,
          student_number: `${nameSlug}-${Date.now().toString().slice(-4)}`,
          name: data.student_name,
          competency: data.student_status || "Kelas XII",
          status: "Aktif Akademi",
          email: data.email || null,
          phone: data.phone || null,
        })
        .select("id")
        .single();
      stu = newStu;
    }

    if (!stu) throw new Error("Gagal memvalidasi data siswa.");

    const metaObj = {
      batch_no: data.batch_no,
      training_center: data.training_center,
      student_name: data.student_name,
      mentor: data.mentor,
      city: data.city,
      driving_skill: data.driving_skill,
      student_status: data.student_status,
      target_pkt: data.target_pkt,
      jobdesk: data.jobdesk,
      placement_month: data.placement_month,
      email: data.email,
      phone: data.phone,
      internship_status: data.internship_status,
    };
    const metaTag = `<!--meta:${JSON.stringify(metaObj)}-->`;

    if (data.id) {
      const { error } = await supabase
        .from("internships")
        .update({
          school_id: school.id,
          company_id: comp.id,
          student_id: stu.id,
          competency: data.jobdesk || "CPC",
          period: data.batch_no || "2025-S1",
          status: data.internship_status === "Selesai" ? "COMPLETED" : "ACTIVE",
          approval_note: metaTag,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      if (error) throw new Error(`Gagal memperbarui data peserta magang: ${error.message}`);
    } else {
      const { error } = await supabase.from("internships").insert({
        school_id: school.id,
        company_id: comp.id,
        student_id: stu.id,
        competency: data.jobdesk || "CPC",
        period: data.batch_no || "2025-S1",
        start_date: "2025-01-02",
        end_date: "2025-06-30",
        status: "ACTIVE",
        approval_note: metaTag,
      });
      if (error) throw new Error(`Gagal menambahkan data peserta magang: ${error.message}`);
    }

    return { success: true };
  });

export const deleteInternshipParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    const { supabase, userId } = context;
    await assertAdminRole(supabase, userId);

    const { error } = await supabase.from("internships").delete().eq("id", data.id);
    if (error) throw new Error(`Gagal menghapus data peserta magang: ${error.message}`);

    try {
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "DELETE",
        entity: "internship",
        entity_id: data.id,
        detail: "Menghapus peserta magang dari dashboard",
      });
    } catch {}

    return { success: true };
  });

export const bulkUpdateInternshipsStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1, "Pilih minimal 1 peserta magang"),
        status: z.string().trim().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    const { supabase, userId } = context;
    await assertAdminRole(supabase, userId);

    const { ids, status } = data;

    const { data: existingList } = await supabase
      .from("internships")
      .select("id, approval_note, status")
      .in("id", ids);

    for (let i = 0; i < (existingList ?? []).length; i += 25) {
      const chunk = (existingList ?? []).slice(i, i + 25);
      await Promise.all(
        chunk.map(async (intItem) => {
          const updatedNote = mergeMetadata(intItem.approval_note, { internship_status: status });

          return supabase
            .from("internships")
            .update({
              approval_note: updatedNote,
              status: status === "Selesai" ? "COMPLETED" : "ACTIVE",
              updated_at: new Date().toISOString(),
            })
            .eq("id", intItem.id);
        }),
      );
    }

    try {
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "BULK_UPDATE",
        entity: "internship",
        entity_id: null,
        detail: `Bulk update ${ids.length} peserta magang ke status ${status}`,
      });
    } catch {}

    return { success: true, count: ids.length };
  });

export const bulkDeleteInternships = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1, "Pilih minimal 1 peserta"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertNotDemo(context);
    const { supabase, userId } = context;
    await assertAdminRole(supabase, userId);

    for (let i = 0; i < data.ids.length; i += 100) {
      const chunk = data.ids.slice(i, i + 100);
      await supabase.from("internships").delete().in("id", chunk);
    }

    try {
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "BULK_DELETE",
        entity: "internship",
        entity_id: null,
        detail: `Menghapus massal ${data.ids.length} data peserta magang`,
      });
    } catch {}

    return { success: true, count: data.ids.length };
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
    if (isDemoEmail(context.claims?.email)) {
      return DUMMY_USERS.map((u) => ({
        ...u,
        schoolName: u.schools?.name ?? null,
      }));
    }
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
    if (isDemoEmail(context.claims?.email)) {
      const qLower = cleanQ.toLowerCase();
      return {
        students: DUMMY_STUDENTS.filter(
          (s) =>
            s.name.toLowerCase().includes(qLower) ||
            s.student_number.toLowerCase().includes(qLower),
        ).slice(0, 5),
        schools: DUMMY_SCHOOLS.filter((s) => s.name.toLowerCase().includes(qLower)).slice(0, 5),
        companies: DUMMY_COMPANIES.filter((c) => c.name.toLowerCase().includes(qLower)).slice(0, 5),
      };
    }
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
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = roles?.some((r) => r.role === "ADMIN");

    const updatePayload: Record<string, unknown> = {
      name: data.name,
      position: data.position,
      phone: data.phone,
      ...(data.email ? { email: data.email } : {}),
      updated_at: new Date().toISOString(),
    };

    // Only administrators can reassign a user's school_id
    if (isAdmin && data.schoolId) {
      updatePayload["school_id"] = data.schoolId;
    }

    const { error } = await supabase.from("profiles").update(updatePayload).eq("id", userId);

    if (error) throw new Error(error.message || "Gagal memperbarui profil guru.");
    return { success: true };
  });

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

    // Enrich rows if mentor/partnership_type are stored in embedded metadata
    const enriched = (data || []).map((s: Record<string, unknown>) => {
      let mentor = (s.mentor as string | null) ?? null;
      let partnership_type = (s.partnership_type as string | null) ?? null;
      let cleanAddress = (s.address as string | null) ?? null;

      if (cleanAddress && cleanAddress.includes("<!--meta:")) {
        try {
          const match = cleanAddress.match(/<!--meta:(.*?)-->/);
          if (match && match[1]) {
            const meta = JSON.parse(match[1]);
            if (!mentor && meta.mentor) mentor = meta.mentor;
            if (!partnership_type && meta.partnership_type)
              partnership_type = meta.partnership_type;
            cleanAddress = cleanAddress.replace(/<!--meta:.*?-->/, "").trim();
          }
        } catch {
          // ignore parse error
        }
      }

      return {
        ...s,
        address: cleanAddress,
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
        ? `${values.address || ""} <!--meta:${JSON.stringify({
            mentor: values.mentor || null,
            partnership_type: values.partnership_type || null,
          })}-->`.trim()
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
    const { data, error } = await context.supabase
      .from("students")
      .select("*, schools(name, school_code, city, province)")
      .order("name");
    if (error) throw new Error("Gagal memuat data siswa.");

    // Enrich rows with parsed vocational metadata if embedded
    const enriched = (data || []).map((s: Record<string, unknown>) => {
      let batch_id = (s.batch_id as string | null) ?? "Batch 01";
      let mentor = (s.mentor as string | null) ?? null;
      let city = (s.city as string | null) ?? null;
      let program_status = (s.program_status as string | null) ?? "TalentPool";
      let talent_pool_year = (s.talent_pool_year as string | null) ?? "2024";
      let driving_r4 = (s.driving_r4 as string | null) ?? null;
      let sim_a = (s.sim_a as string | null) ?? null;
      let sim_c = (s.sim_c as string | null) ?? null;
      let theory_score = (s.theory_score as string | null) ?? null;
      let interview_score = (s.interview_score as string | null) ?? null;
      let graduation_status =
        (s.graduation_status as string | null) ?? (s.status === "ACTIVE" ? "Lulus" : "Tidak Lulus");

      let cleanEmail = (s.email as string | null) ?? null;
      let cleanPhone = (s.phone as string | null) ?? null;

      const sourceStr = `${s.email || ""} ${s.phone || ""} ${s.competency || ""}`;
      if (sourceStr.includes("<!--meta:")) {
        try {
          const match = sourceStr.match(/<!--meta:(.*?)-->/);
          if (match && match[1]) {
            const meta = JSON.parse(match[1]);
            if (meta.batch_id) batch_id = meta.batch_id;
            if (meta.mentor) mentor = meta.mentor;
            if (meta.city) city = meta.city;
            if (meta.program_status) program_status = meta.program_status;
            if (meta.talent_pool_year) talent_pool_year = meta.talent_pool_year;
            if (meta.driving_r4) driving_r4 = meta.driving_r4;
            if (meta.sim_a) sim_a = meta.sim_a;
            if (meta.sim_c) sim_c = meta.sim_c;
            if (meta.theory_score) theory_score = meta.theory_score;
            if (meta.interview_score) interview_score = meta.interview_score;
            if (meta.graduation_status) graduation_status = meta.graduation_status;
          }
        } catch {
          // ignore parse error
        }
      }

      if (cleanEmail && cleanEmail.includes("<!--meta:")) {
        cleanEmail = cleanEmail.replace(/<!--meta:.*?-->/, "").trim() || null;
      }
      if (cleanPhone && cleanPhone.includes("<!--meta:")) {
        cleanPhone = cleanPhone.replace(/<!--meta:.*?-->/, "").trim() || null;
      }

      return {
        ...s,
        email: cleanEmail,
        phone: cleanPhone,
        batch_id,
        mentor,
        city: city || (s.schools as any)?.city || null,
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
                formattedBirthDate = d.toISOString().split("T")[0];
              }
            } else {
              const dmyMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
              if (dmyMatch) {
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
                if (ymdMatch) {
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
      existingMeta.program_status = data.status;
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

    const [schoolsRes, companiesRes, studentsRes] = await Promise.all([
      supabase.from("schools").select("id, name, school_code"),
      supabase.from("companies").select("id, name, company_code"),
      supabase.from("students").select("id, name, school_id, student_number"),
    ]);

    const schoolMap = new Map<string, string>();
    (schoolsRes.data ?? []).forEach((s) => {
      schoolMap.set(s.name.toLowerCase().trim(), s.id);
    });

    const companyMap = new Map<string, string>();
    (companiesRes.data ?? []).forEach((c) => {
      companyMap.set(c.name.toLowerCase().trim(), c.id);
    });

    const studentMap = new Map<string, string>();
    (studentsRes.data ?? []).forEach((st) => {
      studentMap.set(`${st.school_id}_${st.name.toLowerCase().trim()}`, st.id);
    });

    let importedCount = 0;

    for (const item of data.items) {
      const schoolKey = item.training_center.toLowerCase().trim();
      let schoolId = schoolMap.get(schoolKey);

      if (!schoolId) {
        const code = `TC-${String(schoolMap.size + 1).padStart(3, "0")}`;
        const { data: newSchool, error: schoolErr } = await supabase
          .from("schools")
          .insert({
            name: item.training_center,
            school_code: code,
            city: item.city || "Indonesia",
            status: "ACTIVE",
          })
          .select("id")
          .single();
        if (!schoolErr && newSchool) {
          schoolId = newSchool.id;
          schoolMap.set(schoolKey, schoolId);
        }
      }

      if (!schoolId) continue;

      const companyKey = item.target_pkt.toLowerCase().trim();
      let companyId = companyMap.get(companyKey);
      if (!companyId) {
        const compCode = `PKT-${String(companyMap.size + 1).padStart(3, "0")}`;
        const { data: newComp, error: compErr } = await supabase
          .from("companies")
          .insert({
            name: item.target_pkt,
            company_code: compCode,
            city: item.city || "Indonesia",
            industry: "Perbankan / Pengelolaan Kas",
          })
          .select("id")
          .single();
        if (!compErr && newComp) {
          companyId = newComp.id;
          companyMap.set(companyKey, companyId);
        }
      }

      if (!companyId) continue;

      const studentKey = `${schoolId}_${item.student_name.toLowerCase().trim()}`;
      let studentId = studentMap.get(studentKey);
      if (!studentId) {
        const nameSlug = item.student_name
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 20);
        const stuNumber = `${nameSlug}-${String(studentMap.size + 1).padStart(3, "0")}`;
        const { data: newStudent, error: stuErr } = await supabase
          .from("students")
          .insert({
            school_id: schoolId,
            student_number: stuNumber,
            name: item.student_name,
            competency: item.student_status || "Kelas XII",
            status: "Aktif Akademi",
            phone: item.phone || null,
            email: item.email || null,
          })
          .select("id")
          .single();
        if (!stuErr && newStudent) {
          studentId = newStudent.id;
          studentMap.set(studentKey, studentId);
        }
      }

      if (!studentId) continue;

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

      const { data: existingInternship } = await supabase
        .from("internships")
        .select("id")
        .eq("student_id", studentId)
        .maybeSingle();

      if (existingInternship && data.upsert) {
        await supabase
          .from("internships")
          .update({
            company_id: companyId,
            school_id: schoolId,
            competency: item.jobdesk || "CPC",
            period: item.batch_no || "2025-S1",
            status: "ACTIVE",
            approval_note: metaTag,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingInternship.id);
      } else if (!existingInternship) {
        await supabase.from("internships").insert({
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
      importedCount++;
    }

    try {
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "IMPORT",
        entity: "internship",
        entity_id: null,
        detail: `Impor massal ${importedCount} data peserta magang dari Excel`,
      });
    } catch {}

    return { success: true, count: importedCount };
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

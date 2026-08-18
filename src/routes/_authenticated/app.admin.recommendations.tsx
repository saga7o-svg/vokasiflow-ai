import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles,
  MapPin,
  Car,
  Compass,
  Building2,
  Users,
  Navigation,
  CheckCircle2,
  Clock,
  Award,
  Filter,
  Search,
  School as SchoolIcon,
  ShieldCheck,
  Briefcase,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { AppShell } from "@/components/app/shell";
import {
  getNearestSchoolsRecommendationFn,
  getSpecialSkillsStudentMatchingFn,
} from "@/lib/api.functions";
import type { NearestSchoolRecommendationResult, SpecialSkillMatchCandidate } from "@/lib/gemini";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/admin/recommendations")({
  component: SmartMatchingPage,
});

function SmartMatchingPage() {
  const [activeTab, setActiveTab] = useState<"NEAREST_SCHOOLS" | "SPECIAL_SKILLS">(
    "NEAREST_SCHOOLS",
  );

  // Server functions
  const fetchNearestSchools = useServerFn(getNearestSchoolsRecommendationFn);
  const fetchSpecialSkillMatches = useServerFn(getSpecialSkillsStudentMatchingFn);

  // Fetch Companies for dropdown
  const { data: companies = [] } = useQuery({
    queryKey: ["companies-select-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("id,name,city,address,industry")
        .eq("status", "ACTIVE")
        .order("name");
      return data ?? [];
    },
  });

  // State Tab 1: Nearest Schools
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedCompetency, setSelectedCompetency] = useState<string>("");
  const [nearestResult, setNearestResult] = useState<{
    company: { name: string; city: string | null; address: string | null };
    recommendations: NearestSchoolRecommendationResult[];
  } | null>(null);

  const nearestMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCompanyId) throw new Error("Pilih perusahaan terlebih dahulu.");
      return await fetchNearestSchools({
        data: {
          companyId: selectedCompanyId,
          requiredCompetency: selectedCompetency || undefined,
        },
      });
    },
    onSuccess: (data) => {
      setNearestResult(data);
    },
  });

  // State Tab 2: Special Skills Candidate Matching
  const [companyName, setCompanyName] = useState<string>("PT Vokasi Industri Utama");
  const [requirementNote, setRequirementNote] = useState<string>(
    "Dibutuhkan siswa magang teknisi/operasional lapangan yang memiliki SIM A (Bisa Mengemudi Mobil) dan Sertifikasi K3 Dasar.",
  );
  const [skillFilter, setSkillFilter] = useState<string>("Mengemudi");
  const [skillCandidates, setSkillCandidates] = useState<SpecialSkillMatchCandidate[]>([]);

  const specialSkillMutation = useMutation({
    mutationFn: async () => {
      return await fetchSpecialSkillMatches({
        data: {
          companyName,
          requirementNote,
          specialSkillFilter: skillFilter,
        },
      });
    },
    onSuccess: (data) => {
      setSkillCandidates(data);
    },
  });

  return (
    <AppShell title="Smart Matching & Rekomendasi AI">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Banner Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-primary p-6 md:p-8 text-white shadow-xl">
          <div className="relative z-10 space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 backdrop-blur-md text-xs font-medium border border-white/15">
              <Sparkles className="h-3.5 w-3.5 text-accent animate-pulse" />
              Gemini Matching Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Smart Matching & Rekomendasi Penempatan AI
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Temukan SMK terdekat dari lokasi perusahaan mitra dan filter kandidat siswa magang
              berdasarkan kualifikasi & kemampuan khusus (seperti kepemilikan SIM A/C, mengemudi,
              sertifikasi K3, software, dll).
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-border space-x-4">
          <button
            onClick={() => setActiveTab("NEAREST_SCHOOLS")}
            className={cn(
              "flex items-center gap-2 pb-3 pt-1 text-sm font-bold border-b-2 transition-all",
              activeTab === "NEAREST_SCHOOLS"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <MapPin className="h-4 w-4" />
            1. Rekomendasi Sekolah Terdekat
          </button>
          <button
            onClick={() => setActiveTab("SPECIAL_SKILLS")}
            className={cn(
              "flex items-center gap-2 pb-3 pt-1 text-sm font-bold border-b-2 transition-all",
              activeTab === "SPECIAL_SKILLS"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Car className="h-4 w-4" />
            2. Match Kemampuan Khusus (SIM / Driving / Certs)
          </button>
        </div>

        {/* TAB 1: NEAREST SCHOOLS */}
        {activeTab === "NEAREST_SCHOOLS" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Pilih Perusahaan Penempatan Magang
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Perusahaan Mitra
                  </label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="">-- Pilih Perusahaan --</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.city || "Kota"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Filter Kompetensi Keahlian (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="misal: Teknik Kendaraan Ringan"
                    value={selectedCompetency}
                    onChange={(e) => setSelectedCompetency(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => nearestMutation.mutate()}
                    disabled={!selectedCompanyId || nearestMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {nearestMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Menghitung Lokasi & Jarak...
                      </>
                    ) : (
                      <>
                        <Compass className="h-4 w-4 text-accent" />
                        Cari Sekolah Terdekat
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            {nearestResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-emerald-600" />
                    Hasil Rekomendasi Sekolah Terdekat untuk {nearestResult.company.name}
                  </h3>
                  <span className="text-xs text-muted-foreground font-medium">
                    Lokasi: {nearestResult.company.city || "Pusat"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {nearestResult.recommendations.map((sch, i) => (
                    <div
                      key={sch.schoolId || i}
                      className="rounded-2xl border border-border bg-background p-5 shadow-sm space-y-4 hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-base">
                            {i + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-base text-foreground">
                              {sch.schoolName}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="h-3.5 w-3.5 text-primary" />
                              <span>± {sch.estimatedDistanceKm} km dari lokasi</span>
                              <span>•</span>
                              <Clock className="h-3.5 w-3.5" />
                              <span>~{sch.travelTimeMinutes} menit</span>
                            </div>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "text-xs font-black px-2.5 py-1 rounded-lg border",
                            sch.matchScore >= 85
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-blue-50 text-blue-700 border-blue-200",
                          )}
                        >
                          {sch.matchScore}% Match
                        </span>
                      </div>

                      <p className="text-xs text-foreground/90 bg-softgray/50 p-3 rounded-xl border border-border/60 leading-relaxed">
                        {sch.aiReasoning}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <SchoolIcon className="h-3.5 w-3.5 text-primary" />
                          <span>Kuota Direkomendasikan:</span>
                          <span className="font-bold text-foreground">
                            {sch.recommendedInternSlots} Siswa
                          </span>
                        </div>
                        <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          Logistik: {sch.logisticalFeasibility}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SPECIAL SKILLS CANDIDATE MATCHING */}
        {activeTab === "SPECIAL_SKILLS" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-background p-6 shadow-sm space-y-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                Input Kebutuhan & Skill Khusus Peserta Magang
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Nama Perusahaan / Unit Penempatan
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Quick Filter Kemampuan Khusus
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["Mengemudi", "SIM A", "SIM C", "K3", "AutoCAD", "Bahasa Inggris"].map(
                      (tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setSkillFilter(tag);
                            setRequirementNote(
                              `Dibutuhkan siswa magang dengan kualifikasi khusus: ${tag} untuk operasional tim.`,
                            );
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                            skillFilter === tag
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-softgray text-muted-foreground border-border hover:bg-background",
                          )}
                        >
                          {tag === "Mengemudi" || tag === "SIM A" || tag === "SIM C"
                            ? `🚗 ${tag}`
                            : tag === "K3"
                              ? `🛡️ ${tag}`
                              : `⭐ ${tag}`}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Catatan Kebutuhan Khusus Lapangan Perusahaan
                </label>
                <textarea
                  rows={2}
                  value={requirementNote}
                  onChange={(e) => setRequirementNote(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="misal: Diutamakan memiliki SIM A / bisa mengemudi mobil operasional untuk inspeksi lapangan..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => specialSkillMutation.mutate()}
                  disabled={specialSkillMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {specialSkillMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Mencocokkan Siswa dengan Gemini AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-accent" />
                      Cari & Match Kandidat Siswa AI
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Candidate Matching Results */}
            {skillCandidates.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Rekomendasi Kandidat Teratas Berdasarkan Skill Khusus
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Menampilkan {skillCandidates.length} kandidat
                  </span>
                </div>

                <div className="space-y-3">
                  {skillCandidates.map((cand, idx) => (
                    <div
                      key={cand.studentId || idx}
                      className="rounded-2xl border border-border bg-background p-5 shadow-sm hover:border-primary/40 transition-all space-y-3"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700 font-black text-base border border-indigo-200">
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-base text-foreground">
                                {cand.studentName}
                              </h4>
                              {cand.specialSkills.some(
                                (s) =>
                                  s.toLowerCase().includes("sim") ||
                                  s.toLowerCase().includes("mengemudi"),
                              ) && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  🚗 Bisa Mengemudi / SIM
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {cand.schoolName} • {cand.competency}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground block">Fit Score</span>
                            <span className="text-base font-black text-primary">
                              {cand.matchScore}% Match
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* AI Reasoning */}
                      <p className="text-xs text-foreground/90 bg-softgray/50 p-3 rounded-xl border border-border/60 leading-relaxed">
                        <span className="font-bold text-primary mr-1">Rekomendasi AI:</span>
                        {cand.aiMatchReasoning}
                      </p>

                      {/* Special Skills Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold text-muted-foreground mr-1">
                            Kemampuan Khusus:
                          </span>
                          {cand.specialSkills.map((sk, i) => (
                            <span
                              key={i}
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Briefcase className="h-3.5 w-3.5" />
                          <span>Peran Direkomendasikan:</span>
                          <span className="font-bold text-foreground">
                            {cand.suggestedRoles.join(", ")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

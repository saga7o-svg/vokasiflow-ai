import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  MapPinned,
  ExternalLink,
} from "lucide-react";
import { AppShell, useMe, Card } from "@/components/app/shell";
import {
  listCompanies,
  getNearestSchoolsRecommendationFn,
  getSpecialSkillsStudentMatchingFn,
} from "@/lib/api.functions";
import type { NearestSchoolRecommendationResult, SpecialSkillMatchCandidate } from "@/lib/gemini";
import { GoogleMapsView } from "@/components/app/google-maps-view";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/admin/recommendations")({
  component: SmartMatchingPage,
});

function SmartMatchingPage() {
  const { data: me } = useMe();
  const navigate = useNavigate();

  useEffect(() => {
    if (me && me.role === "GURU") {
      navigate({ to: "/app/guru/dashboard", replace: true });
    }
  }, [me, navigate]);

  const [activeTab, setActiveTab] = useState<"NEAREST_SCHOOLS" | "SPECIAL_SKILLS">(
    "NEAREST_SCHOOLS",
  );

  // Server functions
  const fetchCompaniesFn = useServerFn(listCompanies);
  const fetchNearestSchools = useServerFn(getNearestSchoolsRecommendationFn);
  const fetchSpecialSkillMatches = useServerFn(getSpecialSkillsStudentMatchingFn);

  // Fetch Companies & Branches
  const { data: companiesData, isPending: companiesLoading } = useQuery({
    queryKey: ["companies-with-branches-list"],
    queryFn: () => fetchCompaniesFn(),
  });

  const companies = companiesData?.companies ?? [];

  // State Tab 1: Nearest Schools
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedCompetency, setSelectedCompetency] = useState<string>("");
  const [selectedSchoolForMap, setSelectedSchoolForMap] =
    useState<NearestSchoolRecommendationResult | null>(null);
  const [nearestResult, setNearestResult] = useState<{
    company: { name: string; city: string | null; address: string | null };
    branch?: { id?: string; name?: string; city?: string; address?: string };
    recommendations: NearestSchoolRecommendationResult[];
  } | null>(null);

  // Default selection when companies data loads
  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      const firstComp = companies[0];
      setSelectedCompanyId(firstComp.id);
      if (firstComp.branches && firstComp.branches.length > 0) {
        setSelectedBranchId(firstComp.branches[0].id);
      }
    }
  }, [companies, selectedCompanyId]);

  const currentCompany = companies.find((c) => c.id === selectedCompanyId);
  const currentBranches = currentCompany?.branches ?? [];
  const currentBranch = currentBranches.find((b) => b.id === selectedBranchId) ?? currentBranches[0];

  const nearestMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCompanyId) throw new Error("Pilih perusahaan terlebih dahulu.");
      return await fetchNearestSchools({
        data: {
          companyId: selectedCompanyId,
          branchId: selectedBranchId || undefined,
          branchName: currentBranch?.branch_name,
          branchCity: currentBranch?.city || currentCompany?.city || undefined,
          branchAddress: currentBranch?.address || currentCompany?.address || undefined,
          requiredCompetency: selectedCompetency || undefined,
        },
      });
    },
    onSuccess: (data) => {
      setNearestResult(data);
      const firstSchool = data.recommendations?.[0];
      if (firstSchool) {
        setSelectedSchoolForMap(firstSchool);
      }
    },
  });

  // State Tab 2: Special Skills Candidate Matching
  const [companyName, setCompanyName] = useState<string>("PT Kelola Jasa Artha (KJA)");
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
              Smart Matching &amp; Rekomendasi Penempatan AI
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Temukan SMK terdekat dari lokasi cabang PKT dan filter kandidat siswa magang
              berdasarkan kualifikasi &amp; kemampuan khusus (seperti kepemilikan SIM A/C, mengemudi,
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
            1. Rekomendasi Sekolah Terdekat (Data Cabang PKT)
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Pilih Data PKT &amp; Cabang Lokasi Penempatan
                </h2>
                <span className="text-xs font-semibold text-muted-foreground bg-softgray px-2.5 py-1 rounded-lg">
                  Sinkronisasi Real-Time PKT
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Pilih PKT / Perusahaan */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Perusahaan Mitra (PKT)
                  </label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => {
                      const cId = e.target.value;
                      setSelectedCompanyId(cId);
                      const targetC = companies.find((c) => c.id === cId);
                      if (targetC && targetC.branches && targetC.branches.length > 0) {
                        setSelectedBranchId(targetC.branches[0].id);
                      } else {
                        setSelectedBranchId("");
                      }
                    }}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    {companiesLoading && <option>Memuat data PKT...</option>}
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company_code ? `(${c.company_code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Pilih Cabang Lokasi PKT */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Cabang Lokasi PKT
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                    disabled={currentBranches.length === 0}
                  >
                    {currentBranches.length === 0 ? (
                      <option value="">Kantor Pusat ({currentCompany?.city || "Indonesia"})</option>
                    ) : (
                      currentBranches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.branch_name} ({b.city || "Cabang"})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* 3. Filter Kompetensi Keahlian */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Filter Kompetensi Keahlian (Opsional)
                  </label>
                  <select
                    value={selectedCompetency}
                    onChange={(e) => setSelectedCompetency(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="">Semua Kompetensi Vokasi</option>
                    <option value="CPC">CPC (Cash Processing Center)</option>
                    <option value="CIT">CIT (Cash In Transit)</option>
                    <option value="CIT/RPL">CIT/RPL (Hybrid CIT &amp; Replenishment)</option>
                    <option value="RPL">RPL (Replenishment ATM)</option>
                    <option value="FLM">FLM (First Line Maintenance)</option>
                    <option value="Admin">Admin (Administrasi &amp; Operasional)</option>
                  </select>
                </div>
              </div>

              {/* Branch Address Preview & Action */}
              <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPinned className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    <strong>Lokasi Cabang:</strong> {currentBranch?.address || currentCompany?.address || "-"}
                    {currentBranch?.city || currentCompany?.city ? ` • Kota/Kab: ${currentBranch?.city || currentCompany?.city}` : ""}
                  </span>
                </div>

                <button
                  onClick={() => nearestMutation.mutate()}
                  disabled={!selectedCompanyId || nearestMutation.isPending}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shrink-0"
                >
                  {nearestMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Mencocokkan Lokasi Sekolah dengan AI...
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

            {/* Google Maps Interactive View & Results Grid */}
            {nearestResult && (
              <div className="space-y-6" id="map-section">
                {/* 1. Google Maps View Component */}
                <GoogleMapsView
                  originName={`${nearestResult.company.name} (${nearestResult.branch?.name || "Pusat"})`}
                  originAddress={nearestResult.branch?.address || nearestResult.company.address || undefined}
                  originCity={nearestResult.branch?.city || nearestResult.company.city || undefined}
                  destinationName={selectedSchoolForMap?.schoolName || nearestResult.recommendations[0]?.schoolName}
                  destinationAddress={selectedSchoolForMap?.schoolName || nearestResult.recommendations[0]?.schoolName}
                  distanceKm={selectedSchoolForMap?.estimatedDistanceKm ?? nearestResult.recommendations[0]?.estimatedDistanceKm}
                  travelTimeMinutes={selectedSchoolForMap?.travelTimeMinutes ?? nearestResult.recommendations[0]?.travelTimeMinutes}
                />

                {/* 2. Results Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-emerald-600" />
                    Hasil Rekomendasi Sekolah Terdekat untuk {nearestResult.company.name}{" "}
                    {nearestResult.branch?.name ? `(${nearestResult.branch.name})` : ""}
                  </h3>
                  <span className="text-xs text-muted-foreground font-medium bg-softgray px-3 py-1 rounded-full">
                    Lokasi Cabang PKT: {nearestResult.branch?.city || nearestResult.company.city || "Pusat"}
                  </span>
                </div>

                {/* 3. Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {nearestResult.recommendations.map((sch, i) => {
                    const isSelectedOnMap =
                      selectedSchoolForMap?.schoolId === sch.schoolId ||
                      (!selectedSchoolForMap && i === 0);

                    const dirUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                      `${nearestResult.company.name} ${nearestResult.branch?.address || ""} ${nearestResult.branch?.city || ""}`,
                    )}&destination=${encodeURIComponent(sch.schoolName)}&travelmode=driving`;

                    return (
                      <div
                        key={sch.schoolId || i}
                        className={cn(
                          "rounded-2xl border bg-background p-5 shadow-sm space-y-4 transition-all",
                          isSelectedOnMap
                            ? "border-primary ring-2 ring-primary/20 shadow-md"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "grid h-10 w-10 shrink-0 place-items-center rounded-xl font-bold text-base transition-colors",
                                isSelectedOnMap
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-primary/10 text-primary",
                              )}
                            >
                              {i + 1}
                            </div>
                            <div>
                              <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                                <span>{sch.schoolName}</span>
                                {isSelectedOnMap && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    Aktif di Peta
                                  </span>
                                )}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <MapPin className="h-3.5 w-3.5 text-primary" />
                                <span>± {sch.estimatedDistanceKm} km dari lokasi cabang</span>
                                <span>•</span>
                                <Clock className="h-3.5 w-3.5" />
                                <span>~{sch.travelTimeMinutes} menit</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs text-muted-foreground block font-medium">
                              Match Score
                            </span>
                            <span className="text-lg font-black text-primary">
                              {sch.matchScore}%
                            </span>
                          </div>
                        </div>

                        {/* AI Reasoning */}
                        <div className="bg-softgray/60 p-3.5 rounded-xl text-xs space-y-1.5 border border-border/50">
                          <div className="flex items-center gap-1.5 font-bold text-foreground">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            <span>Analisis Kesesuaian Lokasi AI:</span>
                          </div>
                          <p className="text-muted-foreground leading-relaxed">
                            {sch.aiReasoning}
                          </p>
                        </div>

                        {/* Action Buttons for Google Maps */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSchoolForMap(sch);
                              document.getElementById("map-section")?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border",
                              isSelectedOnMap
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card hover:bg-muted text-foreground border-border",
                            )}
                          >
                            <Compass className="h-3.5 w-3.5" />
                            <span>{isSelectedOnMap ? "Sedang Ditampilkan di Peta" : "Tampilkan Rute di Peta"}</span>
                          </button>

                          <a
                            href={dirUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border transition-all"
                            title="Buka navigasi Google Maps di tab baru"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-primary" />
                            <span className="hidden sm:inline">Google Maps</span>
                          </a>
                        </div>

                        {/* Footer Info */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Kelayakan Logistik:</span>
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                sch.logisticalFeasibility === "EXCELLENT"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                  : sch.logisticalFeasibility === "GOOD"
                                    ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                                    : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
                              )}
                            >
                              {sch.logisticalFeasibility}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            <span>
                              Saran Kuota:{" "}
                              <strong className="text-foreground">
                                {sch.recommendedInternSlots} Siswa
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                    Nama Perusahaan / Unit Penempatan (PKT)
                  </label>
                  <select
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="PT Kelola Jasa Artha (KJA) - Cabang Sidoarjo">PT Kelola Jasa Artha (KJA) - Cabang Sidoarjo</option>
                    <option value="PT Advantage SCM (ACS) - Cabang Denpasar">PT Advantage SCM (ACS) - Cabang Denpasar</option>
                    <option value="PT Advantage SCM (ACS) - Cabang Surabaya">PT Advantage SCM (ACS) - Cabang Surabaya</option>
                    <option value="PT Swadharma Sarana Informatika (SSI) - Cabang Surabaya">PT Swadharma Sarana Informatika (SSI) - Cabang Surabaya</option>
                  </select>
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

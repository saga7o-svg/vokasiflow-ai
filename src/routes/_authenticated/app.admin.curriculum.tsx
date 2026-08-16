import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Building2,
  TrendingUp,
  School as SchoolIcon,
  RefreshCw,
  Award,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileCheck,
} from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { listSchools, analyzeCurriculumFn } from "@/lib/api.functions";
import type { CurriculumAnalysisResult } from "@/lib/gemini";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/admin/curriculum")({
  component: CurriculumAnalysisPage,
});

const DEFAULT_COMPETENCIES = [
  "Teknik Kendaraan Ringan",
  "Rekayasa Perangkat Lunak",
  "Teknik Komputer & Jaringan",
  "Teknik Pemesinan",
  "Teknik Instalasi Tenaga Listrik",
  "Akuntansi dan Keuangan Lembaga",
  "Otomatisasi & Tata Kelola Perkantoran",
];

function CurriculumAnalysisPage() {
  const fetchSchools = useServerFn(listSchools);
  const runAnalysis = useServerFn(analyzeCurriculumFn);

  const { data: schools = [] } = useQuery({
    queryKey: ["schools-list"],
    queryFn: () => fetchSchools(),
  });

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [selectedCompetency, setSelectedCompetency] = useState<string>(DEFAULT_COMPETENCIES[0]);
  const [analysisResult, setAnalysisResult] = useState<CurriculumAnalysisResult | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await runAnalysis({
        data: {
          schoolId: selectedSchoolId || undefined,
          competency: selectedCompetency,
        },
      });
      return res;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
    },
  });

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId);

  return (
    <AppShell title="Analisis Kurikulum AI">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-slate-900 to-indigo-950 p-6 md:p-8 text-white shadow-xl">
          <div className="relative z-10 space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 backdrop-blur-md text-xs font-medium border border-white/15">
              <Sparkles className="h-3.5 w-3.5 text-accent animate-pulse" />
              Gemini 2.5 Flash Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Analisis Kurikulum & Keselarasan Industri (Link & Match)
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Bandingkan silabus & modul pembelajaran SMK dengan kebutuhan aktual industri mitra.
              Dapatkan rekomendasi celah *skill*, pembaruan modul, dan analisis SWOT terstruktur secara otomatis.
            </p>
          </div>
          <div className="absolute right-0 top-0 -bottom-10 w-96 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        </div>

        {/* Input Selector Card */}
        <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Pilih Target Sekolah & Program Keahlian
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Sekolah Vokasi (SMK)
              </label>
              <select
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="">-- Pilih Sekolah (Default: Standar Umum) --</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.city || "Nasional"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Kompetensi Keahlian / Jurusan
              </label>
              <select
                value={selectedCompetency}
                onChange={(e) => setSelectedCompetency(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
              >
                {DEFAULT_COMPETENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Menganalisis Kurikulum...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-accent" />
                    Jalankan Analisis AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {analyzeMutation.isPending && (
          <div className="rounded-2xl border border-border bg-background p-12 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 animate-pulse">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">AI Sedang Mengevaluasi Kurikulum</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
              Gemini AI sedang memetakan silabus {selectedCompetency} terhadap tren industri, permintaan kualifikasi perusahaan, dan standar kompetensi kerja nasional.
            </p>
          </div>
        )}

        {analysisResult && !analyzeMutation.isPending && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Executive Score & Overview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score Gauge */}
              <div className="rounded-2xl border border-border bg-background p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Skor Keselarasan Kurikulum
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-black text-primary">
                      {analysisResult.matchPercentage}%
                    </span>
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Link & Match Status
                    </span>
                  </div>
                </div>
                <div className="w-full bg-softgray rounded-full h-3 mt-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${analysisResult.matchPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                  Berdasarkan pemetaan otomatis terhadap data kebutuhan industri mitra aktif dalam sistem vokasi.
                </p>
              </div>

              {/* Executive Summary */}
              <div className="lg:col-span-2 rounded-2xl border border-border bg-background p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Ringkasan Eksekutif Analisis AI
                  </h3>
                  <p className="text-sm text-foreground/90 leading-relaxed bg-softgray/50 p-4 rounded-xl border border-border/60">
                    {analysisResult.summary}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-2 text-xs">
                  <span className="font-semibold text-muted-foreground">Target Sekolah:</span>
                  <span className="font-medium text-foreground">{selectedSchool?.name || "SMK Vokasi"}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-semibold text-muted-foreground">Jurusan:</span>
                  <span className="font-medium text-foreground">{selectedCompetency}</span>
                </div>
              </div>
            </div>

            {/* Curriculum Gaps Section */}
            <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-5 font-bold" />
                    Skill Gap & Materi Kurikulum Yang Belum Tercover
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Kesenjangan kompetensi yang sering ditemui perusahaan mitra pada peserta magang.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analysisResult.curriculumGaps.map((gap, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-softgray/30 p-4 space-y-2 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground">{gap.skill}</span>
                      <span
                        className={cn(
                          "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border",
                          gap.urgency === "HIGH"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : gap.urgency === "MEDIUM"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-blue-50 text-blue-700 border-blue-200",
                        )}
                      >
                        {gap.urgency} Urgency
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {gap.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Modules Section */}
            <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-indigo-600" />
                    Rekomendasi Pembaruan Modul Pembelajaran
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Modul pelatihan singkat yang direkomendasikan AI untuk dimasukkan ke dalam kurikulum tambahan.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {analysisResult.recommendedModules.map((mod, i) => (
                  <div
                    key={i}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-background hover:bg-softgray/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                          {i + 1}
                        </span>
                        <h4 className="font-bold text-sm text-foreground">{mod.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground pl-8">{mod.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 pl-8 md:pl-0">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
                        {mod.estimatedHours} Jam Pelajaran
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SWOT Matrix & Trend Alignment */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SWOT Cards */}
              <div className="rounded-2xl border border-border bg-background p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  Matriks SWOT Kurikulum
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1.5">
                    <span className="font-bold text-emerald-800 uppercase tracking-wider block text-[11px]">
                      Strengths (Kekuatan)
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-emerald-950">
                      {analysisResult.swotAnalysis.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 space-y-1.5">
                    <span className="font-bold text-rose-800 uppercase tracking-wider block text-[11px]">
                      Weaknesses (Kelemahan)
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-rose-950">
                      {analysisResult.swotAnalysis.weaknesses.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1.5">
                    <span className="font-bold text-blue-800 uppercase tracking-wider block text-[11px]">
                      Opportunities (Peluang)
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-blue-950">
                      {analysisResult.swotAnalysis.opportunities.map((o, idx) => (
                        <li key={idx}>{o}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1.5">
                    <span className="font-bold text-amber-800 uppercase tracking-wider block text-[11px]">
                      Threats (Tantangan)
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-amber-950">
                      {analysisResult.swotAnalysis.threats.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Industry Trend */}
              <div className="rounded-2xl border border-border bg-background p-6 shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Kesesuaian Tren Industri Terkini
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Proyeksi pertumbuhan lapangan kerja dan kualifikasi yang dicari perusahaan mitra vokasi.
                  </p>
                  <p className="text-sm font-medium text-foreground bg-softgray p-4 rounded-xl border border-border mt-4 leading-relaxed">
                    {analysisResult.industryTrendAlignment}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <FileCheck className="h-4 w-4" />
                    Laporan Resmi Analisis Vokasi
                  </div>
                  <button
                    onClick={() => window.print()}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    Cetak / Simpan PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

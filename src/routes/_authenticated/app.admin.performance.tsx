import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, Loading, EmptyState } from "@/components/app/shell";
import { getSchoolPerformance } from "@/lib/api.functions";
import {
  Award,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  School,
  BarChart2,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/performance")({
  head: () => ({
    meta: [
      { title: "AI School Performance Score — VokasiFlow AI" },
      {
        name: "description",
        content: "Evaluasi kualitas dan indeks performa sekolah mitra berbasis AI.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SchoolPerformancePage,
});

function getTierBadge(score: number) {
  if (score >= 85)
    return {
      label: "Tier 1 — Unggul (A+)",
      className: "bg-good/20 text-good border-good/30",
    };
  if (score >= 70)
    return {
      label: "Tier 2 — Baik (B)",
      className: "bg-ai-soft text-ai border-ai/30",
    };
  return {
    label: "Tier 3 — Pembinaan (C)",
    className: "bg-warn/20 text-warn border-warn/30",
  };
}

interface SchoolPerformanceRow {
  school_id: string;
  school_name: string;
  city: string | null;
  total_students: number;
  total_internships: number;
  completed_internships: number;
  industry_score: number | null;
  success_rate: number | null;
  discipline_score: number | null;
  score: number | null;
}

function SchoolPerformancePage() {
  const fetchPerformance = useServerFn(getSchoolPerformance);
  const [selectedSchool, setSelectedSchool] = useState<SchoolPerformanceRow | null>(null);

  const {
    data: rankings,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["school-performance"],
    queryFn: () => fetchPerformance(),
  });

  return (
    <AppShell title="AI School Performance Score">
      <div className="space-y-6">
        {/* Banner Info */}
        <div className="rounded-3xl border border-ai/30 bg-gradient-to-br from-ai/15 via-background to-primary/5 p-6 shadow-soft">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ai text-white shadow-md">
                <Award className="h-6 w-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold tracking-tight">
                    Model Evaluasi Kualitas Institusi Pendidikan Vokasi
                  </h2>
                  <span className="rounded-full bg-ai/20 text-ai px-2.5 py-0.5 text-[10px] font-bold">
                    AI Evaluatif
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
                  Skor dihitung secara otomatis dan <i>real-time</i> dari data aktual di lapangan:{" "}
                  <strong>Nilai Industri (50%)</strong> + <strong>Rasio Keberhasilan (30%)</strong>{" "}
                  + <strong>Indeks Kedisiplinan & Laporan (20%)</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Table */}
        {isPending ? <Loading count={3} /> : null}

        {isError ? (
          <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4">
            <p className="text-xs font-medium">Gagal memuat evaluasi performa sekolah.</p>
          </Card>
        ) : null}

        {!isPending && !isError ? (
          rankings && rankings.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-border bg-softgray/30 px-6 py-3.5 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Peringkat Performa Sekolah Mitra Vokasi
                </h3>
                <span className="text-xs text-muted-foreground">
                  Total {rankings.length} Sekolah Terdaftar
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-softgray/50 border-b border-border">
                    <tr className="text-muted-foreground">
                      <th className="px-5 py-3 font-semibold">Peringkat</th>
                      <th className="px-5 py-3 font-semibold">Nama Sekolah</th>
                      <th className="px-5 py-3 font-semibold">Kota</th>
                      <th className="px-5 py-3 font-semibold">Siswa / Magang</th>
                      <th className="px-5 py-3 font-semibold">Nilai Industri (50%)</th>
                      <th className="px-5 py-3 font-semibold">Keberhasilan (30%)</th>
                      <th className="px-5 py-3 font-semibold">Kedisiplinan (20%)</th>
                      <th className="px-5 py-3 font-semibold text-center">Skor AI</th>
                      <th className="px-5 py-3 font-semibold text-right">Rincian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rankings.map((row: SchoolPerformanceRow, index: number) => {
                      const tier = getTierBadge(Number(row.score));
                      return (
                        <tr key={row.school_id} className="hover:bg-softgray/30 transition-colors">
                          <td className="px-5 py-4 font-display font-extrabold text-sm">
                            <span
                              className={`grid h-7 w-7 place-items-center rounded-xl font-mono text-xs ${
                                index === 0
                                  ? "bg-amber-400/20 text-amber-600 font-bold border border-amber-400/40"
                                  : index === 1
                                    ? "bg-slate-300/40 text-slate-700 font-bold"
                                    : index === 2
                                      ? "bg-amber-700/15 text-amber-800 font-bold"
                                      : "bg-softgray text-muted-foreground"
                              }`}
                            >
                              #{index + 1}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-bold text-foreground text-sm block">
                              {row.school_name}
                            </span>
                            <span
                              className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${tier.className}`}
                            >
                              {tier.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-muted-foreground font-medium">
                            {row.city || "-"}
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-semibold block">{row.total_students} Siswa</span>
                            <span className="text-[11px] text-muted-foreground">
                              {row.total_internships} Terdaftar ({row.completed_internships}{" "}
                              Selesai)
                            </span>
                          </td>
                          <td className="px-5 py-4 font-mono font-semibold">
                            {row.industry_score ?? 0}
                          </td>
                          <td className="px-5 py-4 font-mono font-semibold">
                            {row.success_rate ?? 0}%
                          </td>
                          <td className="px-5 py-4 font-mono font-semibold">
                            {row.discipline_score ?? 0}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="font-display text-base font-extrabold text-primary">
                                {row.score ?? 0}
                              </span>
                              <div className="w-16 h-1.5 rounded-full bg-softgray overflow-hidden mt-1">
                                <div
                                  className="h-full bg-ai rounded-full"
                                  style={{ width: `${Math.min(100, Number(row.score))}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedSchool(row)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-softgray transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" /> Analisis
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <EmptyState
              title="Belum ada data evaluasi sekolah"
              description="Skor akan otomatis terhitung begitu data magang dan evaluasi mulai terisi."
            />
          )
        ) : null}
      </div>

      {/* School Breakdown Modal */}
      {selectedSchool ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-background shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-ai/10 text-ai font-bold">
                  <School className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold tracking-tight">
                    {selectedSchool.school_name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Lokasi: {selectedSchool.city || "Indonesia"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSchool(null)}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-softgray text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Score Highlight Box */}
              <div className="rounded-2xl border border-border bg-softgray/40 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Indeks Performa Gabungan
                  </span>
                  <div className="flex items-center gap-3 mt-1 justify-center sm:justify-start">
                    <span className="font-display text-4xl font-extrabold text-foreground">
                      {selectedSchool.score}
                    </span>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                        getTierBadge(Number(selectedSchool.score)).className
                      }`}
                    >
                      {getTierBadge(Number(selectedSchool.score)).label}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-5 space-y-1">
                  <p>
                    Total Siswa Terdaftar: <strong>{selectedSchool.total_students}</strong>
                  </p>
                  <p>
                    Magang Selesai: <strong>{selectedSchool.completed_internships}</strong> dari{" "}
                    {selectedSchool.total_internships}
                  </p>
                </div>
              </div>

              {/* Component Progress Bars */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Komponen Pembentuk Skor AI
                </h4>

                <div className="space-y-3">
                  {/* Industry Score (50%) */}
                  <div className="rounded-xl border border-border bg-background p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-foreground">
                          1. Nilai Evaluasi Industri (Bobot 50%)
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Rata-rata penilaian teknis & non-teknis dari mentor perusahaan
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold">
                        {selectedSchool.industry_score} / 100
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-softgray overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Number(selectedSchool.industry_score))}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Success Rate (30%) */}
                  <div className="rounded-xl border border-border bg-background p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-foreground">
                          2. Rasio Keberhasilan Penempatan (Bobot 30%)
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Persentase siswa yang menyelesaikan periode magang tanpa pembatalan
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold">
                        {selectedSchool.success_rate}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-softgray overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Number(selectedSchool.success_rate))}%` }}
                      />
                    </div>
                  </div>

                  {/* Discipline Score (20%) */}
                  <div className="rounded-xl border border-border bg-background p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-foreground">
                          3. Kedisiplinan & Presensi (Bobot 20%)
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Log kehadiran (60%) + ketepatan pelaporan kegiatan (40%)
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold">
                        {selectedSchool.discipline_score} / 100
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-softgray overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Number(selectedSchool.discipline_score))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Narrative Insight */}
              <div className="rounded-2xl border border-ai/20 bg-ai-soft/30 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-ai">
                  <Sparkles className="h-4 w-4" />
                  <span>Rekomendasi AI untuk Sekolah Ini:</span>
                </div>
                <p className="text-foreground leading-relaxed">
                  {(selectedSchool.score ?? 0) >= 80 ? (
                    <>
                      <strong>{selectedSchool.school_name}</strong> menunjukkan kinerja program
                      magang yang luar biasa. Tingkat kepuasan industri mitra sangat memuaskan.
                      Disarankan untuk memperluas kuota kerjasama ke industri berskala nasional.
                    </>
                  ) : (
                    <>
                      <strong>{selectedSchool.school_name}</strong> memiliki potensi besar namun
                      perlu perhatian pada aspek kedisiplinan absensi siswa dan konsistensi
                      pengisian jurnal harian untuk mendongkrak skor akhir di periode mendatang.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

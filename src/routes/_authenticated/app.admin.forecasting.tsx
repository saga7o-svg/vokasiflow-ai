import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, Loading, EmptyState } from "@/components/app/shell";
import { getForecast } from "@/lib/api.functions";
import {
  TrendingUp,
  Sparkles,
  MapPin,
  Building2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Clock,
  CalendarDays,
  RotateCw,
  Users,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/app/admin/forecasting")({
  head: () => ({
    meta: [
      { title: "AI Workforce Forecasting — VokasiFlow AI" },
      {
        name: "description",
        content: "Proyeksi kebutuhan kompetensi SDM vokasi berbasis time-series regression.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForecastingPage,
});

function getConfidenceBadge(confidence: "HIGH" | "MEDIUM" | "LOW") {
  if (confidence === "HIGH") return "bg-good/20 text-good border-good/30";
  if (confidence === "MEDIUM") return "bg-ai-soft text-ai border-ai/30";
  return "bg-warn/20 text-warn border-warn/30";
}

import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMe } from "@/components/app/shell";

function ForecastingPage() {
  const { data: me } = useMe();
  const navigate = useNavigate();

  useEffect(() => {
    if (me && me.role === "GURU") {
      navigate({ to: "/app/guru/dashboard", replace: true });
    }
  }, [me, navigate]);

  const fetchForecast = useServerFn(getForecast);
  const [selectedCompetency, setSelectedCompetency] = useState<string>("CPC");

  const { data, isPending, isError } = useQuery({
    queryKey: ["admin-forecasting"],
    queryFn: () => fetchForecast(),
  });

  // Ensure selected competency defaults properly when data arrives
  const activeSeries =
    (data?.series ?? []).find((s) => s.competency === selectedCompetency) ??
    (data?.series ?? [])[0];

  // Combine historical and projected data points for Recharts
  const chartData: Array<{ period: string; Aktual: number | null; ProyeksiAI: number | null }> = (
    activeSeries?.history ?? []
  ).map((h) => ({
    period: h.period,
    Aktual: h.total,
    ProyeksiAI: null,
  }));

  // Link last historical point to start of projection
  if (chartData.length > 0 && (activeSeries?.forecast ?? []).length > 0) {
    const lastHist = chartData[chartData.length - 1];
    if (lastHist) {
      lastHist.ProyeksiAI = lastHist.Aktual;
    }
  }

  (activeSeries?.forecast ?? []).forEach((p) => {
    chartData.push({
      period: `${p.period} (Prediksi)`,
      Aktual: null,
      ProyeksiAI: p.total,
    });
  });

  return (
    <AppShell title="AI Workforce Demand Forecasting">
      <div className="space-y-6">
        {/* Banner Header */}
        <div className="rounded-3xl border border-ai/30 bg-gradient-to-br from-ai/15 via-background to-primary/5 p-6 shadow-soft">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ai text-white shadow-md">
                <TrendingUp className="h-6 w-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold tracking-tight">
                    Model Prediktif Permintaan SDM &amp; Lokasi PKT
                  </h2>
                  <span className="rounded-full bg-ai/20 text-ai px-2.5 py-0.5 text-[10px] font-bold">
                    Siklus 6 Bulan (Semesteran)
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
                  Memproses deret waktu penempatan magang dengan acuan <strong>Bulan Penempatan</strong> dan
                  durasi program <strong>6 bulan</strong>. Setiap gelombang peserta menyelesaikan masa magang,
                  AI memproyeksikan kebutuhan pembukaan kuota baru per semester untuk cabang PKT.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 6-Month Cycle & Rotation Overview Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Durasi Siklus Magang
                </span>
                <span className="text-base font-extrabold text-foreground">
                  {data?.cycleInfo?.durationMonths ?? 6} Bulan (1 Semester)
                </span>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
              Acuan data bulan penempatan (<code className="text-[10px] bg-background px-1 py-0.5 rounded">placement_month</code>){" "}
              {data?.cycleInfo?.totalActiveStudents ? `dari ${data.cycleInfo.totalActiveStudents} peserta aktif` : "peserta magang"}.
            </p>
          </Card>

          <Card className="p-4 border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Gelombang Berjalan
                </span>
                <span className="text-base font-extrabold text-foreground">
                  {data?.cycleInfo?.currentBatchSemester ?? "Januari – Juni 2026 (S1)"}
                </span>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
              Peserta gelombang ini dijadwalkan <strong>Selesai Magang</strong> pada akhir semester (
              {data?.cycleInfo?.expectedCompletionDate ?? "Juni 2026"}).
            </p>
          </Card>

          <Card className="p-4 border-ai/20 bg-ai/5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-ai/10 text-ai">
                <RotateCw className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Rotasi &amp; Pembukaan Kuota Baru
                </span>
                <span className="text-base font-extrabold text-ai">
                  {data?.cycleInfo?.nextIntakePeriod ?? "Juli – Desember 2026 (S2)"}
                </span>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
              Kuota workstation cabang PKT kosong kembali &amp; siap menerima gelombang peserta baru.
            </p>
          </Card>
        </div>

        {/* Content Body */}
        {isPending ? <Loading count={4} /> : null}

        {isError ? (
          <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4">
            <p className="text-xs font-medium">Gagal memuat analitik forecasting.</p>
          </Card>
        ) : null}

        {!isPending && !isError && data ? (
          <div className="space-y-6">
            {/* Top Cards: Growing Skills Recommendations */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Tren & Proyeksi Pertumbuhan per Bidang Keahlian
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(data.competencyForecast ?? []).map((cf) => {
                  const growth = cf.growthPct ?? 0;
                  const isPositive = growth > 0;
                  const isZero = growth === 0;

                  return (
                    <Card
                      key={cf.competency}
                      className={`cursor-pointer transition-all border ${
                        selectedCompetency === cf.competency
                          ? "border-ai bg-ai-soft/10 ring-2 ring-ai/20"
                          : "hover:border-border"
                      }`}
                      onClick={() => setSelectedCompetency(cf.competency)}
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-sm text-foreground">{cf.competency}</span>
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${getConfidenceBadge(
                            cf.confidence,
                          )}`}
                        >
                          {cf.confidence}
                        </span>
                      </div>

                      <div className="mt-3 flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                            Pertumbuhan Tren
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            {isPositive ? (
                              <ArrowUpRight className="h-4 w-4 text-good" />
                            ) : isZero ? (
                              <Minus className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-destructive" />
                            )}
                            <span
                              className={`font-display text-lg font-extrabold ${
                                isPositive
                                  ? "text-good"
                                  : isZero
                                    ? "text-muted-foreground"
                                    : "text-destructive"
                              }`}
                            >
                              {growth > 0 ? `+${growth}%` : `${growth}%`}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block">
                            {cf.sufficient ? "Data Cukup" : "Data Terbatas"}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Main Interactive Projection Chart */}
            <Card className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h3 className="text-base font-bold tracking-tight">
                    Kurva Deret Waktu: {selectedCompetency}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Data historis dan proyeksi kuota penempatan baru setiap siklus 6 bulan (Semester) pasca-rotasi peserta selesai
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Kompetensi:</span>
                  <select
                    value={selectedCompetency}
                    onChange={(e) => setSelectedCompetency(e.target.value)}
                    className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold outline-none focus:border-ai"
                  >
                    {(data.competencyForecast ?? []).map((c) => (
                      <option key={c.competency} value={c.competency}>
                        {c.competency}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {activeSeries?.sufficient ? (
                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          borderRadius: "0.75rem",
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.4)",
                          padding: "8px 12px",
                        }}
                        labelStyle={{
                          color: "#ffffff",
                          fontWeight: "700",
                          fontSize: "12px",
                          marginBottom: "4px",
                        }}
                        itemStyle={{
                          color: "#93c5fd",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="Aktual"
                        name="Kebutuhan Aktual (Historis)"
                        stroke="#0f172a"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="ProyeksiAI"
                        name="Proyeksi AI (Masa Depan)"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        dot={{ r: 5, fill: "#3b82f6" }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center text-xs text-muted-foreground space-y-2">
                  <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto" />
                  <p className="font-semibold text-sm text-foreground">
                    Data historis belum mencukupi untuk regresi deret waktu
                  </p>
                  <p>
                    Dibutuhkan minimal 3 titik periode permintaan dari industri untuk menghasilkan
                    estimasi statistik yang valid tanpa rekayasa data.
                  </p>
                </div>
              )}
            </Card>

            {/* Bottom Grid: Locations & Company Matching */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Priority Regional Locations */}
              <Card className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-ai" />
                  <h3 className="text-sm font-bold tracking-tight">
                    Distribusi Permintaan per Wilayah / Cabang PKT
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {(data.locations ?? []).map((loc, idx) => (
                    <div
                      key={loc.name}
                      className="flex items-center justify-between rounded-xl border border-border p-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-muted-foreground text-[11px] font-bold">
                          0{idx + 1}.
                        </span>
                        <span className="font-bold text-foreground">{loc.name}</span>
                      </div>
                      <span className="rounded-md bg-softgray px-2.5 py-1 font-mono font-semibold">
                        {loc.total} Penempatan / Kuota
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Recommended Companies for Placement */}
              <Card className="space-y-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-good" />
                  <h3 className="text-sm font-bold tracking-tight">
                    Rekomendasi Penempatan PKT Berdasarkan Kuota
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {(data.recommendedCompanies ?? []).length > 0 ? (
                    (data.recommendedCompanies ?? []).map((rec, idx) => (
                      <div
                        key={`${rec.companyId}-${rec.competency}`}
                        className="flex items-center justify-between rounded-xl border border-border p-3 text-xs hover:bg-softgray/40 transition-colors"
                      >
                        <div>
                          <span className="font-bold text-foreground block">{rec.companyName}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {rec.city} • Bidang: {rec.competency}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="rounded-full bg-good/15 text-good px-2.5 py-0.5 text-[11px] font-bold">
                            {rec.available} Kuota Terbuka
                          </span>
                          <span className="block text-[10px] text-muted-foreground mt-0.5">
                            Periode {rec.period}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Tidak ada kuota mitra yang tersedia saat ini.
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

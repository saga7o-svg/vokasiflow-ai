import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, Kpi, Loading, StatusBadge } from "@/components/app/shell";
import { getDashboard, listInternships } from "@/lib/api.functions";
import {
  School,
  Users,
  Building2,
  Briefcase,
  Clock,
  CheckCircle2,
  TrendingUp,
  Award,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export const Route = createFileRoute("/_authenticated/app/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — VokasiFlow AI" },
      { name: "description", content: "Ringkasan metrik ekosistem magang vokasi regional." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

const STATUS_COLORS: Record<string, string> = {
  Draft: "#94a3b8",
  Diajukan: "#f59e0b",
  Disetujui: "#10b981",
  Berjalan: "#3b82f6",
  Selesai: "#059669",
  Ditolak: "#ef4444",
};

function AdminDashboard() {
  const fetchDashboard = useServerFn(getDashboard);
  const fetchInternships = useServerFn(listInternships);

  const { data, isPending, isError } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  const { data: internships } = useQuery({
    queryKey: ["admin-internships-recent"],
    queryFn: () => fetchInternships(),
  });

  const pendingList = (internships ?? []).filter((i) => i.status === "SUBMITTED").slice(0, 5);

  return (
    <AppShell title="Dashboard Ekosistem Vokasi">
      {isPending ? <Loading count={4} /> : null}

      {isError ? (
        <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4">
          <p className="text-sm font-medium">
            Gagal memuat data dashboard. Silakan muat ulang halaman.
          </p>
        </Card>
      ) : null}

      {data ? (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Sekolah Mitra"
              value={data.totalSchools}
              icon={School}
              hint="SMK binaan aktif"
            />
            <Kpi
              label="Total Siswa"
              value={data.totalStudents}
              icon={Users}
              hint={`${data.unplacedStudents} belum ditempatkan`}
            />
            <Kpi
              label="Industri / Perusahaan"
              value={data.totalCompanies}
              icon={Building2}
              hint="Mitra magang terverifikasi"
            />
            <Kpi
              label="Magang Aktif"
              value={data.activeInternships}
              icon={Briefcase}
              variant="ai"
              hint="Sedang bertugas di industri"
            />
          </div>

          {/* Secondary KPIs */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Kpi
              label="Menunggu Approval"
              value={data.pendingApprovals}
              icon={Clock}
              variant={data.pendingApprovals > 0 ? "warn" : "default"}
              hint="Memerlukan verifikasi admin"
            />
            <Kpi
              label="Tingkat Keberhasilan"
              value={`${data.successRate}%`}
              icon={CheckCircle2}
              variant="good"
              hint="Selesai tanpa kendala"
            />
            <Kpi
              label="Rata-rata Nilai Industri"
              value={data.averageScore}
              icon={Award}
              hint="Dari evaluasi pembimbing"
            />
          </div>

          {/* AI Banner Shortcut */}
          <div className="rounded-2xl border border-ai/30 bg-gradient-to-r from-ai/10 via-background to-ai/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ai text-white shadow-md">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold tracking-tight">
                  Analitik Cerdas & Forecasting Kebutuhan SDM Vokasi
                </h2>
                <p className="text-xs text-muted-foreground">
                  Model AI memproyeksikan kebutuhan keahlian 2026-2027 & kalkulasi otomatis indeks
                  performa sekolah.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/app/admin/performance"
                className="rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-softgray transition-colors"
              >
                Performa Sekolah
              </Link>
              <Link
                to="/app/admin/forecasting"
                className="rounded-xl bg-primary text-primary-foreground px-3.5 py-2 text-xs font-semibold hover:opacity-95 transition-opacity"
              >
                Forecasting SDM
              </Link>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Chart 1: Placement Trends */}
            <Card className="space-y-4">
              <div>
                <h3 className="text-sm font-bold tracking-tight">Tren Penempatan Magang</h3>
                <p className="text-xs text-muted-foreground">
                  Jumlah siswa yang memulai penempatan per periode
                </p>
              </div>
              <div className="h-64 w-full">
                {data.trendChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.trendChart}>
                      <defs>
                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          borderColor: "#334155",
                          borderRadius: "0.75rem",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        name="Penempatan"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#trendGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="grid h-full place-items-center text-xs text-muted-foreground">
                    Belum ada data riwayat penempatan.
                  </div>
                )}
              </div>
            </Card>

            {/* Chart 2: Competency Distribution */}
            <Card className="space-y-4">
              <div>
                <h3 className="text-sm font-bold tracking-tight">Sebaran Kompetensi Magang</h3>
                <p className="text-xs text-muted-foreground">
                  Jumlah siswa aktif & selesai berdasarkan bidang keahlian
                </p>
              </div>
              <div className="h-64 w-full">
                {data.competencyChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.competencyChart}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                    >
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          borderColor: "#334155",
                          borderRadius: "0.75rem",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="value" name="Siswa" fill="#18181b" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="grid h-full place-items-center text-xs text-muted-foreground">
                    Belum ada data kompetensi.
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Pending Verifications Quick List */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  Pengajuan Magang Perlu Verifikasi
                </h3>
                <p className="text-xs text-muted-foreground">
                  Pengajuan baru dari guru yang membutuhkan persetujuan Admin
                </p>
              </div>
              <Link
                to="/app/admin/internships"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Lihat Semua ({data.pendingApprovals}) <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {pendingList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="pb-2.5 font-medium">Siswa</th>
                      <th className="pb-2.5 font-medium">Sekolah</th>
                      <th className="pb-2.5 font-medium">Perusahaan Mitra</th>
                      <th className="pb-2.5 font-medium">Kompetensi</th>
                      <th className="pb-2.5 font-medium">Periode</th>
                      <th className="pb-2.5 font-medium text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pendingList.map((item) => (
                      <tr key={item.id} className="hover:bg-softgray/50 transition-colors">
                        <td className="py-3 font-semibold text-foreground">
                          {item.students?.name}
                          <span className="block text-[10px] text-muted-foreground font-normal">
                            NIS: {item.students?.student_number}
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground">{item.schools?.name}</td>
                        <td className="py-3 font-medium">{item.companies?.name}</td>
                        <td className="py-3">
                          <span className="rounded-md bg-softgray px-2 py-0.5 text-[10px] font-mono">
                            {item.competency}
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground">{item.period}</td>
                        <td className="py-3 text-right">
                          <Link
                            to="/app/admin/internships"
                            className="rounded-lg bg-primary text-primary-foreground px-2.5 py-1 text-[11px] font-medium hover:opacity-90 transition-opacity"
                          >
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Tidak ada pengajuan magang yang sedang menunggu persetujuan saat ini.
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </AppShell>
  );
}

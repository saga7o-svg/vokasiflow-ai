import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, Kpi, Loading, StatusBadge, useMe } from "@/components/app/shell";
import { getDashboard, listInternships } from "@/lib/api.functions";
import {
  Users,
  Briefcase,
  Clock,
  CheckCircle2,
  Award,
  AlertCircle,
  Plus,
  ArrowRight,
  School,
  CalendarCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/guru/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Guru — VokasiFlow AI" },
      { name: "description", content: "Portal pemantauan magang siswa sekolah binaan." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GuruDashboard,
});

function GuruDashboard() {
  const { data: me } = useMe();
  const fetchDashboard = useServerFn(getDashboard);
  const fetchInternships = useServerFn(listInternships);

  const { data, isPending, isError } = useQuery({
    queryKey: ["guru-dashboard"],
    queryFn: () => fetchDashboard(),
  });

  const { data: internships } = useQuery({
    queryKey: ["guru-internships-recent"],
    queryFn: () => fetchInternships(),
  });

  const recentList = (internships ?? []).slice(0, 5);

  return (
    <AppShell title={`Dashboard — ${me?.schoolName || "Portal Guru"}`}>
      {isPending ? <Loading count={4} /> : null}

      {isError ? (
        <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4">
          <p className="text-sm font-medium">Gagal memuat data dashboard.</p>
        </Card>
      ) : null}

      {data ? (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div className="rounded-3xl border border-border bg-background p-6 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ai">
                Selamat Datang, {me?.name}
              </span>
              <h2 className="font-display text-xl font-bold tracking-tight mt-0.5">
                {me?.schoolName || "SMK Vokasi"}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Pantau proses pengajuan magang, log kehadiran harian, dan penginputan nilai industri
                siswa Anda.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/app/guru/internships"
                className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
              >
                <Plus className="h-4 w-4" /> Ajukan Magang
              </Link>
              <Link
                to="/app/guru/monitoring"
                className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold hover:bg-softgray transition-colors"
              >
                <CalendarCheck className="h-4 w-4" /> Monitoring
              </Link>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi
              label="Total Siswa Terdaftar"
              value={data.totalStudents}
              icon={Users}
              hint="Terdaftar di pangkalan data sekolah"
            />
            <Kpi
              label="Belum Ditempatkan"
              value={data.unplacedStudents}
              icon={AlertCircle}
              variant={data.unplacedStudents > 0 ? "warn" : "default"}
              hint="Perlu diajukan ke mitra industri"
            />
            <Kpi
              label="Sedang Aktif Magang"
              value={data.activeInternships}
              icon={Briefcase}
              variant="ai"
              hint="Sedang bertugas di perusahaan"
            />
            <Kpi
              label="Menunggu Approval"
              value={data.pendingApprovals}
              icon={Clock}
              hint="Dalam antrean review admin pusat"
            />
            <Kpi
              label="Selesai Magang"
              value={data.completedInternships}
              icon={CheckCircle2}
              variant="good"
              hint="Menyelesaikan periode magang"
            />
            <Kpi
              label="Rata-rata Nilai Industri"
              value={data.averageScore}
              icon={Award}
              hint="Rata-rata hasil evaluasi akhir"
            />
          </div>

          {/* Recent Internships Status Table */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  Status Penempatan Magang Terbaru
                </h3>
                <p className="text-xs text-muted-foreground">
                  Daftar pengajuan magang siswa sekolah Anda terkini
                </p>
              </div>
              <Link
                to="/app/guru/internships"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="pb-2.5 font-medium">Siswa</th>
                      <th className="pb-2.5 font-medium">Perusahaan Mitra</th>
                      <th className="pb-2.5 font-medium">Kompetensi</th>
                      <th className="pb-2.5 font-medium">Periode</th>
                      <th className="pb-2.5 font-medium">Status</th>
                      <th className="pb-2.5 font-medium text-right">Nilai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentList.map((item) => (
                      <tr key={item.id} className="hover:bg-softgray/50 transition-colors">
                        <td className="py-3 font-semibold text-foreground">
                          {item.students?.name}
                          <span className="block text-[10px] text-muted-foreground font-normal">
                            NIS: {item.students?.student_number}
                          </span>
                        </td>
                        <td className="py-3 font-medium">{item.companies?.name}</td>
                        <td className="py-3">
                          <span className="rounded-md bg-softgray px-2 py-0.5 text-[10px] font-mono">
                            {item.competency}
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground">{item.period}</td>
                        <td className="py-3">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="py-3 text-right font-mono font-semibold">
                          {item.evaluations?.final_score ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Belum ada pengajuan magang yang tercatat untuk sekolah Anda.
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </AppShell>
  );
}

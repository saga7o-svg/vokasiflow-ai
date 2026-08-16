import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Kpi, Loading, Card, useMe } from "@/components/app/shell";
import { getDashboard } from "@/lib/api.functions";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — VokasiFlow AI" },
      { name: "description", content: "Ringkasan program magang vokasi berdasarkan data aktual." },
      { property: "og:title", content: "Dashboard — VokasiFlow AI" },
      { property: "og:description", content: "Ringkasan program magang vokasi berdasarkan data aktual." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppHome,
});

function AppHome() {
  const { data: me } = useMe();
  const fetchDashboard = useServerFn(getDashboard);
  const { data, isPending, isError } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDashboard() });

  return (
    <AppShell title="Dashboard">
      {isPending ? <Loading /> : null}
      {isError ? (
        <Card>
          <p className="text-sm text-destructive">Data gagal dimuat. Silakan muat ulang halaman.</p>
        </Card>
      ) : null}
      {data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {me?.role === "ADMIN" ? <Kpi label="Total Sekolah" value={data.totalSchools} /> : null}
          <Kpi label="Total Siswa" value={data.totalStudents} />
          {me?.role === "ADMIN" ? <Kpi label="Perusahaan Mitra" value={data.totalCompanies} /> : null}
          <Kpi label="Siswa Sedang Magang" value={data.activeInternships} />
          <Kpi label="Menunggu Approval" value={data.pendingApprovals} />
          <Kpi label="Siswa Belum Ditempatkan" value={data.unplacedStudents} />
          <Kpi label="Selesai Magang" value={data.completedInternships} />
          <Kpi label="Tingkat Keberhasilan" value={`${data.successRate}%`} hint="Selesai dibanding magang yang berakhir" />
          <Kpi label="Rata-rata Nilai Akhir" value={data.averageScore} />
        </div>
      ) : null}
    </AppShell>
  );
}

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, StatusBadge, Loading, EmptyState, useMe } from "@/components/app/shell";
import { listInternships, getInternship, saveAttendance, saveReport } from "@/lib/api.functions";
import {
  CalendarCheck,
  ClipboardList,
  Search,
  Plus,
  X,
  User,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/guru/monitoring")({
  head: () => ({
    meta: [
      { title: "Monitoring & Log Magang — VokasiFlow AI" },
      {
        name: "description",
        content: "Pencatatan presensi kehadiran dan log kegiatan harian/mingguan siswa.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GuruMonitoringPage,
});

function GuruMonitoringPage() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const fetchInternships = useServerFn(listInternships);
  const fetchDetail = useServerFn(getInternship);
  const saveAttendanceFn = useServerFn(saveAttendance);
  const saveReportFn = useServerFn(saveReport);

  const [search, setSearch] = useState("");
  const [selectedInternshipId, setSelectedInternshipId] = useState<string | null>(null);

  // Attendance Modal State
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attStatus, setAttStatus] = useState<"PRESENT" | "LATE" | "ABSENT" | "EXCUSED">("PRESENT");
  const [attNotes, setAttNotes] = useState("");

  // Report Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [activity, setActivity] = useState("");
  const [achievement, setAchievement] = useState("");
  const [obstacles, setObstacles] = useState("");
  const [reportNotes, setReportNotes] = useState("");

  const {
    data: internships,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["guru-internships"],
    queryFn: () => fetchInternships(),
  });

  const activeInternships = (internships ?? []).filter((i) =>
    ["APPROVED", "ACTIVE", "COMPLETED"].includes(i.status),
  );

  const activeId = selectedInternshipId || activeInternships[0]?.id || null;

  const { data: detailData, isFetching: detailLoading } = useQuery({
    queryKey: ["internship-detail", activeId],
    queryFn: () => fetchDetail({ data: { id: activeId! } }),
    enabled: Boolean(activeId),
  });

  const attendanceMutation = useMutation({
    mutationFn: async (payload: {
      internship_id: string;
      date: string;
      status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
      notes?: string | undefined;
    }) => {
      return saveAttendanceFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("Presensi kehadiran siswa berhasil dicatat.");
      queryClient.invalidateQueries({ queryKey: ["internship-detail", activeId] });
      queryClient.invalidateQueries({ queryKey: ["guru-dashboard"] });
      setAttendanceModalOpen(false);
      setAttNotes("");
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal mencatat presensi.");
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (payload: {
      internship_id: string;
      report_date: string;
      activity: string;
      achievement?: string | undefined;
      obstacles?: string | undefined;
      notes?: string | undefined;
    }) => {
      return saveReportFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("Jurnal / laporan kegiatan berhasil disimpan.");
      queryClient.invalidateQueries({ queryKey: ["internship-detail", activeId] });
      setReportModalOpen(false);
      setActivity("");
      setAchievement("");
      setObstacles("");
      setReportNotes("");
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal menyimpan laporan kegiatan.");
    },
  });

  function handleAttendanceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !attDate) return;
    attendanceMutation.mutate({
      internship_id: activeId,
      date: attDate,
      status: attStatus,
      notes: attNotes.trim() || undefined,
    });
  }

  function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !reportDate || !activity.trim()) {
      toast.error("Tanggal dan uraian aktivitas kegiatan wajib diisi.");
      return;
    }
    reportMutation.mutate({
      internship_id: activeId,
      report_date: reportDate,
      activity: activity.trim(),
      achievement: achievement.trim() || undefined,
      obstacles: obstacles.trim() || undefined,
      notes: reportNotes.trim() || undefined,
    });
  }

  return (
    <AppShell title={`Monitoring & Log — ${me?.schoolName || "Sekolah"}`}>
      <div className="space-y-6">
        {isPending ? <Loading count={3} /> : null}

        {isError ? (
          <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4">
            <p className="text-xs font-medium">Gagal memuat data magang aktif.</p>
          </Card>
        ) : null}

        {!isPending && !isError ? (
          activeInternships.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column: Student List */}
              <div className="space-y-3 lg:col-span-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Pilih Siswa Magang ({activeInternships.length})
                </h3>

                <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
                  {activeInternships.map((item) => {
                    const isSelected = item.id === activeId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedInternshipId(item.id)}
                        className={`w-full text-left rounded-2xl border p-3.5 transition-all ${
                          isSelected
                            ? "border-ai bg-ai-soft/20 shadow-xs ring-2 ring-ai/20"
                            : "border-border bg-background hover:border-border hover:bg-softgray/50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-sm text-foreground block">
                            {item.students?.name}
                          </span>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="text-xs text-foreground font-medium mt-1">
                          {item.companies?.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {item.competency} • {item.period}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Logs, Attendance & Reports Detail */}
              <div className="space-y-6 lg:col-span-2">
                {detailLoading ? (
                  <Loading count={3} />
                ) : detailData?.internship ? (
                  <div className="space-y-6">
                    {/* Header Info Card */}
                    <Card className="p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                        <div>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            NIS: {detailData.internship.students?.student_number}
                          </span>
                          <h2 className="text-lg font-bold tracking-tight text-foreground">
                            {detailData.internship.students?.name}
                          </h2>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Penempatan: <strong>{detailData.internship.companies?.name}</strong> (
                            {detailData.internship.companies?.city}) • Bidang{" "}
                            {detailData.internship.competency}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAttendanceModalOpen(true)}
                            className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3 py-2 text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
                          >
                            <CalendarCheck className="h-4 w-4" /> Input Presensi
                          </button>
                          <button
                            type="button"
                            onClick={() => setReportModalOpen(true)}
                            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold hover:bg-softgray transition-colors"
                          >
                            <ClipboardList className="h-4 w-4" /> Jurnal Kegiatan
                          </button>
                        </div>
                      </div>

                      {/* Quick Attendance Summary */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="rounded-xl bg-softgray/60 p-2.5">
                          <span className="text-[11px] text-muted-foreground block">
                            Total Hari Log
                          </span>
                          <span className="font-display text-lg font-bold">
                            {detailData.attendance.length} Hari
                          </span>
                        </div>
                        <div className="rounded-xl bg-good/10 text-good p-2.5">
                          <span className="text-[11px] block">Hadir (Present)</span>
                          <span className="font-display text-lg font-bold">
                            {detailData.attendance.filter((a) => a.status === "PRESENT").length}
                          </span>
                        </div>
                        <div className="rounded-xl bg-warn/10 text-warn p-2.5">
                          <span className="text-[11px] block">Terlambat / Izin</span>
                          <span className="font-display text-lg font-bold">
                            {
                              detailData.attendance.filter((a) =>
                                ["LATE", "EXCUSED"].includes(a.status),
                              ).length
                            }
                          </span>
                        </div>
                        <div className="rounded-xl bg-destructive/10 text-destructive p-2.5">
                          <span className="text-[11px] block">Alpa (Absent)</span>
                          <span className="font-display text-lg font-bold">
                            {detailData.attendance.filter((a) => a.status === "ABSENT").length}
                          </span>
                        </div>
                      </div>
                    </Card>

                    {/* Attendance Logs Table */}
                    <Card className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Log Presensi Kehadiran Siswa
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {detailData.attendance.length} Catatan
                        </span>
                      </div>

                      {detailData.attendance.length > 0 ? (
                        <div className="overflow-x-auto max-h-56 overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-border bg-softgray/50">
                              <tr className="text-muted-foreground">
                                <th className="px-3 py-2 font-medium">Tanggal</th>
                                <th className="px-3 py-2 font-medium">Status Kehadiran</th>
                                <th className="px-3 py-2 font-medium">Catatan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {detailData.attendance.map((att) => (
                                <tr key={att.id} className="hover:bg-softgray/30">
                                  <td className="px-3 py-2.5 font-mono font-semibold">
                                    {att.date}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <StatusBadge status={att.status} />
                                  </td>
                                  <td className="px-3 py-2.5 text-muted-foreground">
                                    {att.notes || "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Belum ada catatan presensi untuk siswa ini.
                        </p>
                      )}
                    </Card>

                    {/* Activity Reports Log */}
                    <Card className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Jurnal Laporan Kegiatan Siswa
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {detailData.reports.length} Laporan
                        </span>
                      </div>

                      {detailData.reports.length > 0 ? (
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                          {detailData.reports.map((rep) => (
                            <div
                              key={rep.id}
                              className="rounded-xl border border-border p-3.5 text-xs space-y-1.5 bg-softgray/20"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-foreground">
                                  Tanggal: {rep.report_date}
                                </span>
                              </div>
                              <p className="text-foreground font-medium">
                                <strong>Aktivitas:</strong> {rep.activity}
                              </p>
                              {rep.achievement && (
                                <p className="text-muted-foreground">
                                  <strong>Pencapaian:</strong> {rep.achievement}
                                </p>
                              )}
                              {rep.obstacles && (
                                <p className="text-warn">
                                  <strong>Kendala:</strong> {rep.obstacles}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Belum ada jurnal kegiatan yang tercatat.
                        </p>
                      )}
                    </Card>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <EmptyState
              title="Belum ada siswa yang sedang magang aktif"
              description="Setelah pengajuan magang disetujui oleh Admin, log monitoring dan presensi siswa akan muncul di halaman ini."
            />
          )
        ) : null}
      </div>

      {/* Input Attendance Modal */}
      {attendanceModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-border bg-background shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-bold tracking-tight">Input Presensi Harian Siswa</h2>
              <button
                type="button"
                onClick={() => setAttendanceModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-softgray text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAttendanceSubmit} className="p-6 space-y-4">
              <label className="grid gap-1.5 text-xs font-semibold">
                Tanggal Presensi
                <input
                  type="date"
                  required
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold">
                Status Kehadiran
                <select
                  value={attStatus}
                  onChange={(e) =>
                    setAttStatus(e.target.value as "PRESENT" | "LATE" | "ABSENT" | "EXCUSED")
                  }
                  className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai font-medium"
                >
                  <option value="PRESENT">Hadir (PRESENT)</option>
                  <option value="LATE">Terlambat (LATE)</option>
                  <option value="EXCUSED">Izin / Sakit (EXCUSED)</option>
                  <option value="ABSENT">Alpa / Tanpa Keterangan (ABSENT)</option>
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-semibold">
                Catatan (Opsional)
                <textarea
                  rows={2}
                  value={attNotes}
                  onChange={(e) => setAttNotes(e.target.value)}
                  placeholder="Keterangan izin atau alasan terlambat..."
                  className="rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-ai"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setAttendanceModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-softgray transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={attendanceMutation.isPending}
                  className="rounded-xl bg-primary text-primary-foreground px-5 py-2 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {attendanceMutation.isPending ? "Menyimpan..." : "Simpan Presensi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Input Activity Report Modal */}
      {reportModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-background shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-bold tracking-tight">
                Input Jurnal Laporan Kegiatan Siswa
              </h2>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-softgray text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleReportSubmit}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <label className="grid gap-1.5 text-xs font-semibold">
                Tanggal Laporan
                <input
                  type="date"
                  required
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold">
                Uraian Aktivitas Pekerjaan
                <textarea
                  rows={3}
                  required
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  placeholder="Misal: Menyelesaikan modul backend API dan konfigurasi database..."
                  className="rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-ai"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold">
                Hasil / Pencapaian (Achievement)
                <textarea
                  rows={2}
                  value={achievement}
                  onChange={(e) => setAchievement(e.target.value)}
                  placeholder="Misal: API endpoint berhasil ditest dan deploy staging..."
                  className="rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-ai"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold">
                Kendala / Hambatan (Obstacles)
                <textarea
                  rows={2}
                  value={obstacles}
                  onChange={(e) => setObstacles(e.target.value)}
                  placeholder="Misal: Kendala koneksi jaringan atau adaptasi framework baru..."
                  className="rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-ai"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-softgray transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={reportMutation.isPending}
                  className="rounded-xl bg-primary text-primary-foreground px-5 py-2 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {reportMutation.isPending ? "Menyimpan..." : "Simpan Laporan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

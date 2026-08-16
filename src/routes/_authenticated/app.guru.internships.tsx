import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, StatusBadge, Loading, EmptyState, useMe } from "@/components/app/shell";
import {
  listInternships,
  listStudents,
  listCompanies,
  submitInternship,
} from "@/lib/api.functions";
import {
  Search,
  Plus,
  X,
  FileText,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Filter,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/guru/internships")({
  head: () => ({
    meta: [
      { title: "Pengajuan Magang — VokasiFlow AI" },
      {
        name: "description",
        content: "Formulir pengajuan penempatan magang siswa dan riwayat status.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GuruInternshipsPage,
});

function GuruInternshipsPage() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const fetchInternships = useServerFn(listInternships);
  const fetchStudents = useServerFn(listStudents);
  const fetchCompanies = useServerFn(listCompanies);
  const submitFn = useServerFn(submitInternship);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Form states
  const [studentId, setStudentId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [period, setPeriod] = useState("2026-S1");
  const [startDate, setStartDate] = useState("2026-03-01");
  const [endDate, setEndDate] = useState("2026-08-31");

  const {
    data: internships,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["guru-internships"],
    queryFn: () => fetchInternships(),
  });

  const { data: students } = useQuery({
    queryKey: ["guru-students"],
    queryFn: () => fetchStudents(),
  });

  const { data: companiesData } = useQuery({
    queryKey: ["companies-list"],
    queryFn: () => fetchCompanies(),
  });

  const submitMutation = useMutation({
    mutationFn: async (payload: {
      student_id: string;
      company_id: string;
      competency: string;
      period: string;
      start_date: string;
      end_date: string;
    }) => {
      return submitFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("Pengajuan magang berhasil dikirimkan ke Admin Pusat!");
      queryClient.invalidateQueries({ queryKey: ["guru-internships"] });
      queryClient.invalidateQueries({ queryKey: ["guru-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["companies-list"] });
      closeModal();
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal mengajukan magang.");
    },
  });

  // Selected student object and auto-detected competency
  const selectedStudent = useMemo(() => {
    return (students ?? []).find((s) => s.id === studentId);
  }, [students, studentId]);

  const studentCompetency = selectedStudent?.competency ?? "";

  // Available students who are not placed currently
  const placedStudentIds = useMemo(() => {
    return new Set(
      (internships ?? [])
        .filter((i) => ["SUBMITTED", "APPROVED", "ACTIVE", "COMPLETED"].includes(i.status))
        .map((i) => i.student_id),
    );
  }, [internships]);

  const eligibleStudents = useMemo(() => {
    return (students ?? []).filter((s) => s.status === "ACTIVE" && !placedStudentIds.has(s.id));
  }, [students, placedStudentIds]);

  // Quotas for matching competency and period
  const matchingCompanies = useMemo(() => {
    if (!companiesData) return [];
    const companies = companiesData.companies ?? [];
    const quotas = companiesData.quotas ?? [];

    return quotas
      .filter((q) => q.competency === studentCompetency && q.period === period)
      .map((q) => {
        const comp = companies.find((c) => c.id === q.company_id);
        return {
          companyId: q.company_id,
          name: comp?.name ?? "-",
          city: comp?.city ?? "-",
          industry: comp?.industry ?? "-",
          quota: q.quota,
          usedQuota: q.used_quota,
          available: q.quota - q.used_quota,
        };
      });
  }, [companiesData, studentCompetency, period]);

  const selectedCompanyQuota = matchingCompanies.find((c) => c.companyId === companyId);

  function openCreate() {
    setStudentId(eligibleStudents[0]?.id ?? "");
    setCompanyId("");
    setPeriod("2026-S1");
    setStartDate("2026-03-01");
    setEndDate("2026-08-31");
    setCreateModalOpen(true);
  }

  function closeModal() {
    setCreateModalOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !companyId || !studentCompetency || !period || !startDate || !endDate) {
      toast.error("Semua formulir pengajuan wajib diisi.");
      return;
    }

    if (selectedCompanyQuota && selectedCompanyQuota.available <= 0) {
      toast.error(
        "Kuota perusahaan untuk kompetensi ini sudah penuh. Silakan pilih perusahaan lain.",
      );
      return;
    }

    submitMutation.mutate({
      student_id: studentId,
      company_id: companyId,
      competency: studentCompetency,
      period,
      start_date: startDate,
      end_date: endDate,
    });
  }

  const filteredInternships = (internships ?? []).filter((i) => {
    const matchesSearch =
      (i.students?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (i.companies?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      i.competency.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "ALL" ? true : i.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <AppShell
      title={`Pengajuan Magang — ${me?.schoolName || "Sekolah"}`}
      actions={
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3.5 py-2 text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Ajukan Magang Baru
        </button>
      }
    >
      <div className="space-y-4">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari siswa, mitra industri, kompetensi..."
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2 text-xs outline-none focus:border-ai transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {[
              { id: "ALL", label: "Semua" },
              { id: "SUBMITTED", label: "Menunggu" },
              { id: "APPROVED", label: "Disetujui" },
              { id: "ACTIVE", label: "Aktif" },
              { id: "COMPLETED", label: "Selesai" },
              { id: "REJECTED", label: "Ditolak" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors shrink-0 ${
                  statusFilter === tab.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-background border border-border text-muted-foreground hover:bg-softgray"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Table */}
        {isPending ? <Loading count={4} /> : null}

        {isError ? (
          <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4">
            <p className="text-xs font-medium">Gagal memuat data pengajuan magang.</p>
          </Card>
        ) : null}

        {!isPending && !isError ? (
          filteredInternships.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-softgray/50 border-b border-border">
                    <tr className="text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">Nama Siswa</th>
                      <th className="px-4 py-3 font-semibold">Perusahaan Mitra</th>
                      <th className="px-4 py-3 font-semibold">Kompetensi</th>
                      <th className="px-4 py-3 font-semibold">Periode Magang</th>
                      <th className="px-4 py-3 font-semibold">Status Pengajuan</th>
                      <th className="px-4 py-3 font-semibold">Catatan Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredInternships.map((row) => (
                      <tr key={row.id} className="hover:bg-softgray/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-foreground block text-sm">
                            {row.students?.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            NIS: {row.students?.student_number}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-foreground">
                          {row.companies?.name}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded-md bg-softgray px-2 py-0.5 font-mono text-[11px]">
                            {row.competency}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold block">{row.period}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {row.start_date} s/d {row.end_date}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-4 py-3.5 text-xs">
                          {row.approval_note && (
                            <span className="text-good block">✓ {row.approval_note}</span>
                          )}
                          {row.rejection_note && (
                            <span className="text-destructive block">✗ {row.rejection_note}</span>
                          )}
                          {!row.approval_note && !row.rejection_note && (
                            <span className="text-muted-foreground">
                              {row.status === "SUBMITTED" ? "Menunggu verifikasi admin" : "-"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <EmptyState
              title="Belum ada pengajuan magang"
              description="Ajukan siswa Anda ke perusahaan mitra yang tersedia kuotanya."
              action={
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold"
                >
                  Ajukan Sekarang
                </button>
              }
            />
          )
        ) : null}
      </div>

      {/* Submit Internship Wizard Modal */}
      {createModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-background shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-bold tracking-tight">
                Formulir Pengajuan Penempatan Magang
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-softgray text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Step 1: Select Student */}
              <label className="grid gap-1.5 text-xs font-semibold">
                1. Pilih Siswa (Hanya yang belum ditempatkan)
                <select
                  required
                  value={studentId}
                  onChange={(e) => {
                    setStudentId(e.target.value);
                    setCompanyId("");
                  }}
                  className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                >
                  <option value="">Pilih Siswa...</option>
                  {eligibleStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (NIS: {s.student_number}) — {s.competency}
                    </option>
                  ))}
                </select>
                {eligibleStudents.length === 0 && (
                  <p className="text-[11px] text-warn">
                    Semua siswa aktif sudah memiliki pengajuan atau penempatan magang.
                  </p>
                )}
              </label>

              {/* Step 2: Auto Competency & Period */}
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-semibold">
                  Kompetensi Siswa (Otomatis)
                  <input
                    type="text"
                    disabled
                    value={studentCompetency || "-"}
                    className="rounded-xl border border-border bg-softgray px-3.5 py-2.5 text-xs font-mono opacity-80"
                  />
                </label>

                <label className="grid gap-1.5 text-xs font-semibold">
                  Periode Penempatan
                  <input
                    type="text"
                    required
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    placeholder="2026-S1"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-mono outline-none focus:border-ai"
                  />
                </label>
              </div>

              {/* Step 3: Select Company with Real-Time Quota Check */}
              <label className="grid gap-1.5 text-xs font-semibold">
                2. Pilih Perusahaan Mitra (Sesuai Kompetensi & Kuota)
                <select
                  required
                  disabled={!studentCompetency}
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai disabled:opacity-50"
                >
                  <option value="">Pilih Perusahaan Mitra...</option>
                  {matchingCompanies.map((c) => (
                    <option key={c.companyId} value={c.companyId} disabled={c.available <= 0}>
                      {c.name} ({c.city}) — Sisa {c.available} dari {c.quota} Kuota{" "}
                      {c.available <= 0 ? "[PENUH]" : ""}
                    </option>
                  ))}
                </select>
                {studentCompetency && matchingCompanies.length === 0 && (
                  <p className="text-[11px] text-destructive">
                    Belum ada mitra industri yang membuka kuota untuk kompetensi "
                    {studentCompetency}" pada periode {period}.
                  </p>
                )}
              </label>

              {/* Step 4: Dates */}
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-semibold">
                  Tanggal Mulai
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Tanggal Selesai
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
              </div>

              {/* Real-time Summary Box */}
              {selectedStudent && selectedCompanyQuota ? (
                <div className="rounded-2xl border border-ai/20 bg-ai-soft/30 p-3.5 text-xs space-y-1">
                  <span className="font-bold text-ai block">Ringkasan Pengajuan:</span>
                  <p className="text-foreground">
                    Siswa <strong>{selectedStudent.name}</strong> akan ditempatkan di{" "}
                    <strong>{selectedCompanyQuota.name}</strong> ({selectedCompanyQuota.city}).
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    Sisa Kuota Tersedia: <strong>{selectedCompanyQuota.available} kursi</strong>.
                  </p>
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-softgray transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    submitMutation.isPending ||
                    !studentId ||
                    !companyId ||
                    (selectedCompanyQuota?.available ?? 0) <= 0
                  }
                  className="rounded-xl bg-primary text-primary-foreground px-5 py-2 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitMutation.isPending ? "Mengirim..." : "Kirim Pengajuan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

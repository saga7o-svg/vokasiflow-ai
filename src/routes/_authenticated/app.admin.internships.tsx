import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, StatusBadge, Loading, EmptyState } from "@/components/app/shell";
import {
  listInternships,
  getInternship,
  decideInternship,
  updateInternshipStatus,
} from "@/lib/api.functions";
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  X,
  FileText,
  User,
  Building2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/admin/internships")({
  head: () => ({
    meta: [
      { title: "Pengajuan Magang — VokasiFlow AI" },
      { name: "description", content: "Daftar dan verifikasi penempatan magang vokasi." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminInternshipsPage,
});

function AdminInternshipsPage() {
  const queryClient = useQueryClient();
  const fetchInternships = useServerFn(listInternships);
  const fetchInternshipDetail = useServerFn(getInternship);
  const decideFn = useServerFn(decideInternship);
  const updateStatusFn = useServerFn(updateInternshipStatus);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionType, setDecisionType] = useState<"APPROVE" | "REJECT" | null>(null);

  const {
    data: internships,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["admin-internships"],
    queryFn: () => fetchInternships(),
  });

  const { data: detailData, isFetching: detailLoading } = useQuery({
    queryKey: ["internship-detail", selectedId],
    queryFn: () => fetchInternshipDetail({ data: { id: selectedId! } }),
    enabled: Boolean(selectedId),
  });

  const decideMutation = useMutation({
    mutationFn: async ({
      id,
      decision,
      note,
    }: {
      id: string;
      decision: "APPROVE" | "REJECT";
      note: string;
    }) => {
      return decideFn({ data: { id, decision, note } });
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.decision === "APPROVE"
          ? "Pengajuan magang berhasil disetujui."
          : "Pengajuan magang telah ditolak.",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-internships"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["internship-detail", selectedId] });
      setReviewModalOpen(false);
      setDecisionNote("");
      setDecisionType(null);
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Terjadi kesalahan saat memproses keputusan.");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "ACTIVE" | "COMPLETED" | "CANCELLED";
    }) => {
      return updateStatusFn({ data: { id, status } });
    },
    onSuccess: () => {
      toast.success("Status magang berhasil diperbarui.");
      queryClient.invalidateQueries({ queryKey: ["admin-internships"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["internship-detail", selectedId] });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal memperbarui status.");
    },
  });

  const filteredList = (internships ?? []).filter((item) => {
    const matchesSearch =
      (item.students?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.schools?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.companies?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      item.competency.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "ALL" ? true : item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function openDetail(id: string) {
    setSelectedId(id);
    setReviewModalOpen(true);
    setDecisionNote("");
    setDecisionType(null);
  }

  return (
    <AppShell title="Manajemen Pengajuan Magang">
      <div className="space-y-4">
        {/* Filters & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari siswa, sekolah, mitra industri..."
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

        {/* Table Content */}
        {isPending ? <Loading count={4} /> : null}

        {isError ? (
          <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4">
            <p className="text-xs font-medium">Gagal memuat data pengajuan.</p>
          </Card>
        ) : null}

        {!isPending && !isError ? (
          filteredList.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-softgray/50 border-b border-border">
                    <tr className="text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">Siswa & Sekolah</th>
                      <th className="px-4 py-3 font-semibold">Perusahaan Mitra</th>
                      <th className="px-4 py-3 font-semibold">Kompetensi</th>
                      <th className="px-4 py-3 font-semibold">Periode & Durasi</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredList.map((row) => (
                      <tr key={row.id} className="hover:bg-softgray/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-foreground block">
                            {row.students?.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {row.schools?.name} • NIS: {row.students?.student_number}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold block">{row.companies?.name}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded-md bg-softgray px-2 py-0.5 font-mono text-[11px]">
                            {row.competency}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-medium block">{row.period}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {row.start_date} s/d {row.end_date}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => openDetail(row.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-softgray transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {row.status === "SUBMITTED" ? "Review" : "Detail"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <EmptyState
              title="Tidak ada pengajuan ditemukan"
              description="Coba ubah kata kunci pencarian atau ganti filter status."
            />
          )
        ) : null}
      </div>

      {/* Review / Detail Modal */}
      {reviewModalOpen && selectedId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-background shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-base font-bold tracking-tight">
                  Detail & Verifikasi Penempatan Magang
                </h2>
                <p className="text-xs text-muted-foreground">
                  Informasi komprehensif alokasi kuota dan data siswa
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-softgray text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailLoading ? (
                <Loading count={3} />
              ) : detailData?.internship ? (
                <div className="space-y-5">
                  {/* Summary Header Card */}
                  <div className="rounded-2xl border border-border bg-softgray/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Status Saat Ini:
                      </span>
                      <StatusBadge status={detailData.internship.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Siswa:</span>
                        <p className="font-bold text-sm text-foreground">
                          {detailData.internship.students?.name}
                        </p>
                        <p className="text-muted-foreground">
                          NIS: {detailData.internship.students?.student_number} •{" "}
                          {detailData.internship.students?.gender === "L"
                            ? "Laki-laki"
                            : "Perempuan"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">
                          Asal Sekolah:
                        </span>
                        <p className="font-semibold text-foreground">
                          {detailData.internship.schools?.name}
                        </p>
                        <p className="text-muted-foreground">
                          {detailData.internship.schools?.city}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-border pt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">
                          Perusahaan Tujuan:
                        </span>
                        <p className="font-semibold text-foreground">
                          {detailData.internship.companies?.name}
                        </p>
                        <p className="text-muted-foreground">
                          Bidang: {detailData.internship.companies?.industry || "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">
                          Kompetensi & Periode:
                        </span>
                        <p className="font-semibold text-foreground">
                          {detailData.internship.competency} ({detailData.internship.period})
                        </p>
                        <p className="text-muted-foreground">
                          {detailData.internship.start_date} s/d {detailData.internship.end_date}
                        </p>
                      </div>
                    </div>

                    {/* Quota Status Info */}
                    {detailData.quota ? (
                      <div className="border-t border-border pt-2.5 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Kuota Perusahaan Periode Ini:</span>
                        <span className="font-mono font-bold">
                          Terpakai {detailData.quota.used_quota} / {detailData.quota.quota} Kuota
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Notes / History */}
                  {detailData.internship.approval_note ? (
                    <div className="rounded-xl border border-good/20 bg-good/5 p-3 text-xs">
                      <span className="font-bold text-good block mb-1">Catatan Persetujuan:</span>
                      <p className="text-foreground">{detailData.internship.approval_note}</p>
                    </div>
                  ) : null}

                  {detailData.internship.rejection_note ? (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs">
                      <span className="font-bold text-destructive block mb-1">
                        Catatan Penolakan:
                      </span>
                      <p className="text-foreground">{detailData.internship.rejection_note}</p>
                    </div>
                  ) : null}

                  {/* Status Lifecycle Actions for Approved / Active */}
                  {["APPROVED", "ACTIVE"].includes(detailData.internship.status) ? (
                    <div className="rounded-2xl border border-border p-4 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Update Status Pelaksanaan Magang
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {detailData.internship.status === "APPROVED" ? (
                          <button
                            type="button"
                            disabled={updateStatusMutation.isPending}
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: detailData.internship.id,
                                status: "ACTIVE",
                              })
                            }
                            className="rounded-xl bg-ai text-white px-3.5 py-2 text-xs font-semibold hover:opacity-90 transition-opacity"
                          >
                            Tandai Sebagai "Aktif Berjalan"
                          </button>
                        ) : null}

                        {detailData.internship.status === "ACTIVE" ? (
                          <button
                            type="button"
                            disabled={updateStatusMutation.isPending}
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: detailData.internship.id,
                                status: "COMPLETED",
                              })
                            }
                            className="rounded-xl bg-good text-white px-3.5 py-2 text-xs font-semibold hover:opacity-90 transition-opacity"
                          >
                            Tandai Sebagai "Selesai Magang"
                          </button>
                        ) : null}

                        <button
                          type="button"
                          disabled={updateStatusMutation.isPending}
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: detailData.internship.id,
                              status: "CANCELLED",
                            })
                          }
                          className="rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 px-3.5 py-2 text-xs font-semibold transition-colors"
                        >
                          Batalkan Magang
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Approve / Reject Form for SUBMITTED */}
                  {detailData.internship.status === "SUBMITTED" ? (
                    <div className="rounded-2xl border border-ai/20 bg-ai-soft/20 p-4 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Tindakan Persetujuan Admin
                      </h4>

                      <label className="grid gap-1 text-xs">
                        Catatan Verifikasi (Opsional untuk Approve, Wajib untuk Reject):
                        <textarea
                          rows={2}
                          value={decisionNote}
                          onChange={(e) => setDecisionNote(e.target.value)}
                          placeholder="Masukkan catatan atau alasan jika menolak..."
                          className="rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-ai transition-colors"
                        />
                      </label>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          disabled={decideMutation.isPending}
                          onClick={() => {
                            if (!decisionNote.trim()) {
                              toast.error("Alasan penolakan wajib diisi.");
                              return;
                            }
                            decideMutation.mutate({
                              id: detailData.internship.id,
                              decision: "REJECT",
                              note: decisionNote,
                            });
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 px-4 py-2 text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Tolak Pengajuan
                        </button>

                        <button
                          type="button"
                          disabled={decideMutation.isPending}
                          onClick={() => {
                            decideMutation.mutate({
                              id: detailData.internship.id,
                              decision: "APPROVE",
                              note: decisionNote,
                            });
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-good text-white hover:opacity-90 px-4 py-2 text-xs font-bold transition-opacity shadow-xs disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Setujui & Potong Kuota
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Data pengajuan tidak ditemukan.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

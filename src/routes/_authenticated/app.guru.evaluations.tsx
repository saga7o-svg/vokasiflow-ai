import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, StatusBadge, Loading, EmptyState, useMe } from "@/components/app/shell";
import { listInternships, getInternship, saveEvaluation } from "@/lib/api.functions";
import {
  Award,
  Search,
  Plus,
  Edit2,
  X,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calculator,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/guru/evaluations")({
  head: () => ({
    meta: [
      { title: "Penilaian Magang — VokasiFlow AI" },
      {
        name: "description",
        content: "Input evaluasi nilai industri dan kedisiplinan magang siswa.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GuruEvaluationsPage,
});

function GuruEvaluationsPage() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const fetchInternships = useServerFn(listInternships);
  const fetchDetail = useServerFn(getInternship);
  const saveEvaluationFn = useServerFn(saveEvaluation);

  const [search, setSearch] = useState("");
  const [selectedInternshipId, setSelectedInternshipId] = useState<string | null>(null);
  const [evalModalOpen, setEvalModalOpen] = useState(false);

  // Evaluation Form State
  const [technicalScore, setTechnicalScore] = useState<number>(85);
  const [nonTechnicalScore, setNonTechnicalScore] = useState<number>(80);
  const [disciplineScore, setDisciplineScore] = useState<number>(85);
  const [evaluatorName, setEvaluatorName] = useState<string>("");
  const [evaluatorNotes, setEvaluatorNotes] = useState<string>("");

  const {
    data: internships,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["guru-internships"],
    queryFn: () => fetchInternships(),
  });

  const { data: detailData, isFetching: detailLoading } = useQuery({
    queryKey: ["internship-detail", selectedInternshipId],
    queryFn: () => fetchDetail({ data: { id: selectedInternshipId! } }),
    enabled: Boolean(selectedInternshipId),
  });

  // Calculate live estimated final score
  const attendanceScorePreview = useMemo(() => {
    if (!detailData?.attendance || detailData.attendance.length === 0) return 100;
    const total = detailData.attendance.length;
    const present = detailData.attendance.filter((a) => a.status === "PRESENT").length;
    const late = detailData.attendance.filter((a) => a.status === "LATE").length;
    return Math.round(((present + 0.5 * late) / total) * 100);
  }, [detailData]);

  const finalScorePreview = useMemo(() => {
    const score =
      technicalScore * 0.4 +
      nonTechnicalScore * 0.25 +
      disciplineScore * 0.2 +
      attendanceScorePreview * 0.15;
    return Math.round(score * 10) / 10;
  }, [technicalScore, nonTechnicalScore, disciplineScore, attendanceScorePreview]);

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      internship_id: string;
      technical_score: number;
      non_technical_score: number;
      discipline_score: number;
      evaluator_name?: string;
      notes?: string;
    }) => {
      return saveEvaluationFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("Penilaian magang berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["guru-internships"] });
      queryClient.invalidateQueries({ queryKey: ["guru-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["internship-detail", selectedInternshipId] });
      closeModal();
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal menyimpan penilaian.");
    },
  });

  function openEvaluation(internship: {
    id: string;
    evaluations?: { final_score?: number | null } | null;
  }) {
    setSelectedInternshipId(internship.id);
    setTechnicalScore(85);
    setNonTechnicalScore(80);
    setDisciplineScore(85);
    setEvaluatorName("");
    setEvaluatorNotes("");
    setEvalModalOpen(true);
  }

  function closeModal() {
    setEvalModalOpen(false);
    setSelectedInternshipId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInternshipId) return;

    saveMutation.mutate({
      internship_id: selectedInternshipId,
      technical_score: Number(technicalScore),
      non_technical_score: Number(nonTechnicalScore),
      discipline_score: Number(disciplineScore),
      evaluator_name: evaluatorName.trim() || undefined,
      notes: evaluatorNotes.trim() || undefined,
    });
  }

  const eligibleInternships = (internships ?? []).filter((i) =>
    ["ACTIVE", "COMPLETED", "APPROVED"].includes(i.status),
  );

  const filteredList = eligibleInternships.filter((item) => {
    return (
      (item.students?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.companies?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      item.competency.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <AppShell title={`Penilaian Magang Siswa — ${me?.schoolName || "Sekolah"}`}>
      <div className="space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari siswa atau perusahaan..."
            className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2 text-xs outline-none focus:border-ai transition-colors"
          />
        </div>

        {/* Content Table */}
        {isPending ? <Loading count={4} /> : null}

        {isError ? (
          <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4">
            <p className="text-xs font-medium">Gagal memuat data magang untuk dinilai.</p>
          </Card>
        ) : null}

        {!isPending && !isError ? (
          filteredList.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-softgray/50 border-b border-border">
                    <tr className="text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">Nama Siswa</th>
                      <th className="px-4 py-3 font-semibold">Perusahaan Mitra</th>
                      <th className="px-4 py-3 font-semibold">Kompetensi</th>
                      <th className="px-4 py-3 font-semibold">Status Magang</th>
                      <th className="px-4 py-3 font-semibold">Nilai Akhir</th>
                      <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredList.map((row) => {
                      const hasScore = row.evaluations?.final_score != null;
                      return (
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
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="px-4 py-3.5">
                            {hasScore && row.evaluations ? (
                              <span className="font-display text-sm font-extrabold text-good">
                                {row.evaluations.final_score} / 100
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">
                                Belum dinilai
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => openEvaluation(row)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold hover:bg-softgray transition-colors"
                            >
                              <Award className="h-3.5 w-3.5" />
                              {hasScore ? "Ubah Nilai" : "Input Nilai"}
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
              title="Belum ada siswa yang dapat dinilai"
              description="Siswa dengan status disetujui, aktif, atau selesai magang akan muncul di halaman ini."
            />
          )
        ) : null}
      </div>

      {/* Evaluation Input Modal */}
      {evalModalOpen && selectedInternshipId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-background shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-good/10 text-good font-bold">
                  <Award className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold tracking-tight">
                    Formulir Evaluasi & Penilaian Magang
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Kombinasi penilaian pembimbing industri dan rekap presensi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-softgray text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {detailLoading ? (
                <Loading count={3} />
              ) : (
                <>
                  {/* Student & Company Header */}
                  <div className="rounded-2xl border border-border bg-softgray/40 p-4 space-y-1 text-xs">
                    <p className="font-bold text-sm text-foreground">
                      {detailData?.internship?.students?.name}
                    </p>
                    <p className="text-muted-foreground">
                      Industri: <strong>{detailData?.internship?.companies?.name}</strong> • Bidang{" "}
                      {detailData?.internship?.competency}
                    </p>
                  </div>

                  {/* Weighting Explanation */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-xl border border-border p-2 bg-background">
                      <span className="text-[10px] text-muted-foreground block">Teknis (40%)</span>
                      <span className="font-bold text-foreground">{technicalScore}</span>
                    </div>
                    <div className="rounded-xl border border-border p-2 bg-background">
                      <span className="text-[10px] text-muted-foreground block">
                        Non-Teknis (25%)
                      </span>
                      <span className="font-bold text-foreground">{nonTechnicalScore}</span>
                    </div>
                    <div className="rounded-xl border border-border p-2 bg-background">
                      <span className="text-[10px] text-muted-foreground block">
                        Disiplin (20%)
                      </span>
                      <span className="font-bold text-foreground">{disciplineScore}</span>
                    </div>
                    <div className="rounded-xl border border-border p-2 bg-background">
                      <span className="text-[10px] text-muted-foreground block">
                        Presensi (15%)
                      </span>
                      <span className="font-bold text-ai">{attendanceScorePreview} (Auto)</span>
                    </div>
                  </div>

                  {/* Form Inputs */}
                  <div className="space-y-3.5">
                    <label className="grid gap-1.5 text-xs font-semibold">
                      Nilai Keterampilan Teknis (0 - 100) — Bobot 40%
                      <input
                        type="number"
                        min={0}
                        max={100}
                        required
                        value={technicalScore}
                        onChange={(e) => setTechnicalScore(Number(e.target.value))}
                        className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                      />
                    </label>

                    <label className="grid gap-1.5 text-xs font-semibold">
                      Nilai Keterampilan Non-Teknis / Soft Skills (0 - 100) — Bobot 25%
                      <input
                        type="number"
                        min={0}
                        max={100}
                        required
                        value={nonTechnicalScore}
                        onChange={(e) => setNonTechnicalScore(Number(e.target.value))}
                        className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                      />
                    </label>

                    <label className="grid gap-1.5 text-xs font-semibold">
                      Nilai Sikap & Kedisiplinan Kerja (0 - 100) — Bobot 20%
                      <input
                        type="number"
                        min={0}
                        max={100}
                        required
                        value={disciplineScore}
                        onChange={(e) => setDisciplineScore(Number(e.target.value))}
                        className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="grid gap-1.5 text-xs font-semibold">
                        Nama Pembimbing / Penilai
                        <input
                          type="text"
                          value={evaluatorName}
                          onChange={(e) => setEvaluatorName(e.target.value)}
                          placeholder="Sari Puspita (Mentor Industri)"
                          className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                        />
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold">
                        Catatan Rekomendasi
                        <input
                          type="text"
                          value={evaluatorNotes}
                          onChange={(e) => setEvaluatorNotes(e.target.value)}
                          placeholder="Sangat baik, siap direkrut..."
                          className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Calculated Final Score Banner */}
                  <div className="rounded-2xl border border-good/30 bg-good/10 p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-good block">
                        Estimasi Nilai Akhir Komposit:
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Kalkulasi otomatis: (40% Teknis + 25% Non-Teknis + 20% Disiplin + 15%
                        Presensi)
                      </p>
                    </div>
                    <span className="font-display text-3xl font-extrabold text-good">
                      {finalScorePreview}
                    </span>
                  </div>

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
                      disabled={saveMutation.isPending}
                      className="rounded-xl bg-primary text-primary-foreground px-5 py-2 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {saveMutation.isPending ? "Menyimpan..." : "Simpan Penilaian"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

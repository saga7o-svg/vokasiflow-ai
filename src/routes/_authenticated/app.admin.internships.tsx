import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, StatusBadge, Loading, EmptyState } from "@/components/app/shell";
import {
  listInternships,
  saveInternshipParticipant,
  deleteInternshipParticipant,
  bulkUpdateInternshipsStatus,
  bulkDeleteInternships,
  importInternshipsBulk,
  listSchools,
  listCompanies,
} from "@/lib/api.functions";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  FileSpreadsheet,
  Download,
  Building2,
  Users,
  Briefcase,
  Layers,
  MapPin,
  Car,
  UserCheck,
  UserPlus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  InternshipExcelImportModal,
  type InternshipImportItem,
} from "@/components/app/internship-excel-import-modal";
import { exportInternshipsToExcel } from "@/lib/internship-excel.utils";

export const Route = createFileRoute("/_authenticated/app/admin/internships")({
  head: () => ({
    meta: [
      { title: "Data Peserta Magang — VokasiFlow AI" },
      {
        name: "description",
        content: "Dashboard dan direktori data penempatan peserta magang vokasi.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminInternshipsPage,
});

interface InternshipParticipantItem {
  id: string;
  student_id: string;
  school_id: string;
  company_id: string;
  batch_no: string;
  training_center: string;
  student_name: string;
  mentor: string | null;
  city: string | null;
  driving_skill: string | null;
  student_status: string | null;
  target_pkt: string;
  jobdesk: string | null;
  placement_month: string | null;
  email: string | null;
  phone: string | null;
  internship_status: string;
  students?: { name: string; student_number?: string; email?: string; phone?: string } | null;
  schools?: { name: string; school_code?: string; city?: string } | null;
  companies?: { name: string; city?: string } | null;
}

function AdminInternshipsPage() {
  const queryClient = useQueryClient();
  const fetchInternships = useServerFn(listInternships);
  const saveParticipantFn = useServerFn(saveInternshipParticipant);
  const deleteParticipantFn = useServerFn(deleteInternshipParticipant);
  const bulkUpdateInternshipsFn = useServerFn(bulkUpdateInternshipsStatus);
  const bulkDeleteInternshipsFn = useServerFn(bulkDeleteInternships);
  const importBulkFn = useServerFn(importInternshipsBulk);
  const fetchSchools = useServerFn(listSchools);
  const fetchCompanies = useServerFn(listCompanies);

  const [search, setSearch] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("ALL");
  const [selectedTargetPkt, setSelectedTargetPkt] = useState("ALL");
  const [selectedJobdesk, setSelectedJobdesk] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InternshipParticipantItem | null>(null);

  // Form states
  const [batchNo, setBatchNo] = useState("Intra 3");
  const [trainingCenter, setTrainingCenter] = useState("");
  const [studentName, setStudentName] = useState("");
  const [mentor, setMentor] = useState("");
  const [city, setCity] = useState("");
  const [drivingSkill, setDrivingSkill] = useState("Siswa Aktif");
  const [studentStatus, setStudentStatus] = useState("Kelas XII");
  const [targetPkt, setTargetPkt] = useState("SSI - Palu");
  const [jobdesk, setJobdesk] = useState("CPC");
  const [placementMonth, setPlacementMonth] = useState("02 Januari 2025");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [internshipStatus, setInternshipStatus] = useState("Peserta Baru");

  const {
    data: internships,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["admin-internships"],
    queryFn: () => fetchInternships(),
  });

  const { data: schools } = useQuery({
    queryKey: ["schools-list"],
    queryFn: () => fetchSchools(),
  });

  const { data: companiesData } = useQuery({
    queryKey: ["companies-list"],
    queryFn: () => fetchCompanies(),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      return saveParticipantFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(
        editingItem
          ? "Data peserta magang berhasil diperbarui."
          : "Peserta magang baru berhasil ditambahkan.",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-internships"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      closeModal();
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal menyimpan data peserta magang.");
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (params: { items: InternshipImportItem[]; upsert: boolean }) => {
      return importBulkFn({ data: params as any });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-internships"] });
      queryClient.invalidateQueries({ queryKey: ["schools-list"] });
      queryClient.invalidateQueries({ queryKey: ["companies-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteParticipantFn({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Peserta magang berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["admin-internships"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal menghapus data peserta magang.");
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (params: { ids: string[]; status: string }) => {
      return bulkUpdateInternshipsFn({ data: params });
    },
    onSuccess: (_, variables) => {
      toast.success(
        `Berhasil memperbarui ${variables.ids.length} data peserta magang ke status ${variables.status}.`,
      );
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin-internships"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal memperbarui status peserta magang massal.");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return bulkDeleteInternshipsFn({ data: { ids } });
    },
    onSuccess: (_, variables) => {
      toast.success(`Berhasil menghapus ${variables.length} data peserta magang.`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin-internships"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal menghapus data peserta magang.");
    },
  });

  function handleDeleteParticipant(id: string, name: string) {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus data peserta magang "${name}"? Tindakan ini tidak dapat dibatalkan.`,
    );
    if (confirmed) {
      deleteMutation.mutate(id);
    }
  }

  function openCreateModal() {
    setEditingItem(null);
    setBatchNo("Intra 3");
    setTrainingCenter(schools?.[0]?.name ?? "SMK Negeri 1 Gorontalo");
    setStudentName("");
    setMentor("Aldi");
    setCity("Kota Gorontalo");
    setDrivingSkill("Siswa Aktif");
    setStudentStatus("Kelas XII");
    setTargetPkt("SSI - Palu");
    setJobdesk("CPC");
    setPlacementMonth("02 Januari 2025");
    setEmail("");
    setPhone("");
    setInternshipStatus("Peserta Baru");
    setModalOpen(true);
  }

  function openEditModal(item: InternshipParticipantItem) {
    setEditingItem(item);
    setBatchNo(item.batch_no || "Intra 3");
    setTrainingCenter(item.training_center || item.schools?.name || "");
    setStudentName(item.student_name || item.students?.name || "");
    setMentor(item.mentor || "");
    setCity(item.city || item.schools?.city || "");
    setDrivingSkill(item.driving_skill || "Siswa Aktif");
    setStudentStatus(item.student_status || "Kelas XII");
    setTargetPkt(item.target_pkt || item.companies?.name || "SSI - Palu");
    setJobdesk(item.jobdesk || "CPC");
    setPlacementMonth(item.placement_month || "02 Januari 2025");
    setEmail(item.email || item.students?.email || "");
    setPhone(item.phone || item.students?.phone || "");
    setInternshipStatus(item.internship_status || "Peserta Baru");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingItem(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentName.trim() || !trainingCenter.trim() || !targetPkt.trim()) {
      toast.error("Nama Peserta, Training Center, dan Target PKT wajib diisi.");
      return;
    }

    const cleanEmail = email
      ? email
          .replace(/ı/g, "i")
          .replace(/İ/g, "I")
          .replace(/[\u200B-\u200D\uFEFF]/g, "")
          .trim()
      : null;

    saveMutation.mutate({
      id: editingItem?.id,
      batch_no: batchNo.trim(),
      training_center: trainingCenter.trim(),
      student_name: studentName.trim(),
      mentor: mentor.trim() || null,
      city: city.trim() || null,
      driving_skill: drivingSkill.trim() || "Siswa Aktif",
      student_status: studentStatus.trim() || "Kelas XII",
      target_pkt: targetPkt.trim(),
      jobdesk: jobdesk.trim() || "CPC",
      placement_month: placementMonth.trim() || "02 Januari 2025",
      email: cleanEmail,
      phone: phone.trim() || null,
      internship_status: internshipStatus.trim() || "Peserta Baru",
    });
  }

  const allItems: InternshipParticipantItem[] = (internships ?? []) as any[];

  // Dynamic filter options
  const batchList: string[] = Array.from(
    new Set(allItems.map((i) => i.batch_no).filter((x): x is string => Boolean(x))),
  );
  const targetPktList: string[] = Array.from(
    new Set(allItems.map((i) => i.target_pkt).filter((x): x is string => Boolean(x))),
  );
  const jobdeskList: string[] = Array.from(
    new Set(allItems.map((i) => i.jobdesk).filter((x): x is string => Boolean(x))),
  );
  const statusList = ["Peserta Baru", "Peserta Pengganti", "Aktif Magang", "Selesai", "Mundur"];

  const filteredItems = allItems.filter((i) => {
    if (!i) return false;
    const q = (search || "").toLowerCase().trim();
    const matchesSearch =
      !q ||
      (i.student_name || "").toLowerCase().includes(q) ||
      (i.training_center || "").toLowerCase().includes(q) ||
      (i.batch_no || "").toLowerCase().includes(q) ||
      (i.target_pkt || "").toLowerCase().includes(q) ||
      (i.jobdesk || "").toLowerCase().includes(q) ||
      (i.city || "").toLowerCase().includes(q) ||
      (i.mentor || "").toLowerCase().includes(q) ||
      (i.email || "").toLowerCase().includes(q) ||
      (i.phone || "").toLowerCase().includes(q);

    const matchesBatch = selectedBatch === "ALL" || i.batch_no === selectedBatch;
    const matchesPkt = selectedTargetPkt === "ALL" || i.target_pkt === selectedTargetPkt;
    const matchesJobdesk = selectedJobdesk === "ALL" || i.jobdesk === selectedJobdesk;
    const matchesStatus =
      selectedStatus === "ALL" ||
      (i.internship_status || "").toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesBatch && matchesPkt && matchesJobdesk && matchesStatus;
  });

  const allFilteredSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      filteredItems.forEach((item) => next.add(item.id));
      setSelectedIds(next);
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  // KPI Calculations
  const totalPeserta = allItems.length;
  const pesertaBaruCount = allItems.filter((i) =>
    (i.internship_status || "").toLowerCase().includes("baru"),
  ).length;
  const pesertaPenggantiCount = allItems.filter((i) =>
    (i.internship_status || "").toLowerCase().includes("pengganti"),
  ).length;
  const uniquePktCount = new Set(allItems.map((i) => i.target_pkt).filter(Boolean)).size;
  const uniqueBatchCount = new Set(allItems.map((i) => i.batch_no).filter(Boolean)).size;

  async function handleExportExcel() {
    if (filteredItems.length === 0) {
      toast.error("Tidak ada data peserta magang untuk diekspor.");
      return;
    }
    const toastId = toast.loading(`Mengekspor ${filteredItems.length} data peserta magang...`);
    try {
      const exportData = filteredItems.map((i) => ({
        batch_no: i.batch_no,
        training_center: i.training_center,
        student_name: i.student_name,
        mentor: i.mentor,
        city: i.city,
        driving_skill: i.driving_skill,
        student_status: i.student_status,
        target_pkt: i.target_pkt,
        jobdesk: i.jobdesk,
        placement_month: i.placement_month,
        email: i.email,
        phone: i.phone,
        internship_status: i.internship_status,
      }));
      await exportInternshipsToExcel(exportData);
      toast.dismiss(toastId);
      toast.success("File Excel berhasil diunduh.");
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(`Gagal mengekspor data: ${err?.message || "Kesalahan tidak terduga"}`);
    }
  }

  return (
    <AppShell
      title="Dashboard Data Peserta Magang"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-softgray transition-colors shadow-2xs text-foreground"
          >
            <Download className="h-4 w-4 text-primary" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-2 text-xs font-semibold hover:bg-emerald-500/20 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Import Excel
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3.5 py-2 text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Tambah Peserta
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* KPI Metric Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="p-4 bg-card/60 backdrop-blur-xs border-border/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Total Peserta Magang</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{totalPeserta}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Semua penempatan terdata</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-4 bg-card/60 backdrop-blur-xs border-border/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Peserta Baru</p>
              <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {pesertaBaruCount}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Penempatan reguler baru</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <UserPlus className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-4 bg-card/60 backdrop-blur-xs border-border/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Peserta Pengganti</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {pesertaPenggantiCount}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Rotasi penggantian posisi</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <UserCheck className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-4 bg-card/60 backdrop-blur-xs border-border/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Target PKT Aktif</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {uniquePktCount}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Cabang & lokasi mitra</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Building2 className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-4 bg-card/60 backdrop-blur-xs border-border/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Total Batch</p>
              <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                {uniqueBatchCount}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Gelombang penempatan</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Layers className="h-5 w-5" />
            </div>
          </Card>
        </div>

        {/* Filter Controls (5 columns) */}
        <div className="grid gap-3 sm:grid-cols-5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari peserta, sekolah, PKT, batch..."
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2 text-xs outline-none focus:border-ai transition-colors"
            />
          </div>

          <div>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
            >
              <option value="ALL">Semua Batch</option>
              {batchList.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedTargetPkt}
              onChange={(e) => setSelectedTargetPkt(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
            >
              <option value="ALL">Semua Target PKT</option>
              {targetPktList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedJobdesk}
              onChange={(e) => setSelectedJobdesk(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
            >
              <option value="ALL">Semua Jobdesk</option>
              {jobdeskList.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
            >
              <option value="ALL">Semua Status Magang</option>
              {statusList.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Floating Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-3.5 shadow-sm text-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-xs">
                {selectedIds.size}
              </span>
              <span className="font-semibold text-foreground">
                Peserta Magang Dipilih (Multiple Choice)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">Ubah Status Magang:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      bulkUpdateMutation.mutate({
                        ids: Array.from(selectedIds),
                        status: e.target.value,
                      });
                      e.target.value = "";
                    }
                  }}
                  defaultValue=""
                  disabled={bulkUpdateMutation.isPending}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus:border-ai shadow-2xs"
                >
                  <option value="" disabled>
                    Pilih Status...
                  </option>
                  {statusList.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Hapus ${selectedIds.size} data peserta magang yang dipilih? Tindakan ini tidak dapat dibatalkan.`,
                    )
                  ) {
                    bulkDeleteMutation.mutate(Array.from(selectedIds));
                  }
                }}
                disabled={bulkDeleteMutation.isPending}
                className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors shadow-2xs disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Hapus Terpilih
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-softgray transition-colors shadow-2xs"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Counter Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Menampilkan <strong className="text-foreground">{filteredItems.length}</strong> dari{" "}
            <strong className="text-foreground">{allItems.length}</strong> peserta magang
          </span>
          {selectedIds.size > 0 && (
            <span className="text-primary font-semibold">{selectedIds.size} peserta dipilih</span>
          )}
        </div>

        {/* Table View */}
        {isPending ? <Loading count={5} /> : null}

        {isError ? (
          <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4">
            <p className="text-xs font-medium">Gagal memuat data peserta magang.</p>
          </Card>
        ) : null}

        {!isPending && !isError ? (
          filteredItems.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-softgray/60 border-b border-border">
                    <tr className="text-muted-foreground whitespace-nowrap">
                      <th className="px-3.5 py-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer accent-primary"
                          title="Pilih Semua"
                        />
                      </th>
                      <th className="px-3.5 py-3 font-semibold">Batch No</th>
                      <th className="px-3.5 py-3 font-semibold">Training Center</th>
                      <th className="px-3.5 py-3 font-semibold">Nama Peserta</th>
                      <th className="px-3.5 py-3 font-semibold">Pendamping</th>
                      <th className="px-3.5 py-3 font-semibold">Kabupaten/Domisili</th>
                      <th className="px-3.5 py-3 font-semibold">Kemampuan</th>
                      <th className="px-3.5 py-3 font-semibold">Status Siswa</th>
                      <th className="px-3.5 py-3 font-semibold">Target PKT</th>
                      <th className="px-3.5 py-3 font-semibold">Jobdesk</th>
                      <th className="px-3.5 py-3 font-semibold">Bulan Penempatan</th>
                      <th className="px-3.5 py-3 font-semibold">Email</th>
                      <th className="px-3.5 py-3 font-semibold">Nomor WA</th>
                      <th className="px-3.5 py-3 font-semibold">Status Magang</th>
                      <th className="px-3.5 py-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredItems.map((item) => {
                      const isSelected = selectedIds.has(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-softgray/30 transition-colors ${
                            isSelected ? "bg-primary/5 dark:bg-primary/10" : ""
                          }`}
                        >
                          <td className="px-3.5 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(item.id)}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer accent-primary"
                            />
                          </td>
                          <td className="px-3.5 py-3 whitespace-nowrap">
                            <span className="rounded-md bg-softgray px-2 py-0.5 text-[11px] font-semibold text-foreground">
                              {item.batch_no || "-"}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 min-w-[170px]">
                            <span className="font-semibold text-foreground block">
                              {item.training_center}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 min-w-[170px]">
                            <span className="font-bold text-foreground block text-xs">
                              {item.student_name}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 whitespace-nowrap">
                            {item.mentor ? (
                              <span className="rounded bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                                {item.mentor}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-muted-foreground whitespace-nowrap">
                            {item.city || "-"}
                          </td>
                          <td className="px-3.5 py-3 whitespace-nowrap text-muted-foreground">
                            {item.driving_skill || "-"}
                          </td>
                          <td className="px-3.5 py-3 whitespace-nowrap">
                            <span className="rounded-md bg-softgray px-2 py-0.5 text-[11px] font-medium text-foreground">
                              {item.student_status || "Kelas XII"}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 min-w-[150px]">
                            <span className="font-semibold text-foreground block">
                              {item.target_pkt}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 whitespace-nowrap font-bold text-primary">
                            {item.jobdesk || "-"}
                          </td>
                          <td className="px-3.5 py-3 whitespace-nowrap text-muted-foreground">
                            {item.placement_month || "-"}
                          </td>
                          <td className="px-3.5 py-3 font-mono text-[11px] text-muted-foreground min-w-[160px]">
                            {item.email || "-"}
                          </td>
                          <td className="px-3.5 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                            {item.phone || "-"}
                          </td>
                          <td className="px-3.5 py-3 whitespace-nowrap">
                            {(() => {
                              const st = (item.internship_status || "Peserta Baru").trim();
                              let badgeClass =
                                "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
                              if (st.toLowerCase().includes("pengganti")) {
                                badgeClass =
                                  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
                              } else if (st.toLowerCase().includes("selesai")) {
                                badgeClass =
                                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                              } else if (
                                st.toLowerCase().includes("mundur") ||
                                st.toLowerCase().includes("keluar")
                              ) {
                                badgeClass =
                                  "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
                              }
                              return (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeClass}`}
                                >
                                  {st}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-3.5 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold hover:bg-softgray hover:text-foreground transition-colors shadow-2xs"
                                title="Edit Data Peserta Magang"
                              >
                                <Edit2 className="h-3 w-3" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteParticipant(item.id, item.student_name)}
                                disabled={deleteMutation.isPending}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2.5 py-1 text-xs font-semibold hover:bg-rose-500/20 transition-colors shadow-2xs disabled:opacity-50"
                                title="Hapus Data Peserta Magang"
                              >
                                <Trash2 className="h-3 w-3" /> Hapus
                              </button>
                            </div>
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
              icon={Briefcase}
              title="Belum ada data peserta magang"
              description={
                search || selectedBatch !== "ALL" || selectedTargetPkt !== "ALL"
                  ? "Tidak ada data yang sesuai dengan filter pencarian Anda."
                  : "Mulai dengan mengimpor data peserta magang dari template Excel atau tambah data manual."
              }
              action={
                <button
                  type="button"
                  onClick={() => setImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold shadow-xs hover:opacity-95"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Import Data Excel
                </button>
              }
            />
          )
        ) : null}
      </div>

      {/* Tambah / Edit Modal */}
      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-background p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold tracking-tight text-foreground">
                {editingItem ? "Edit Data Peserta Magang" : "Tambah Peserta Magang Baru"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-softgray text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Batch No *</label>
                  <input
                    type="text"
                    required
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    placeholder="Contoh: Intra 3 / Intra 4 / 47"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Training Center (Sekolah) *
                  </label>
                  <input
                    type="text"
                    required
                    value={trainingCenter}
                    onChange={(e) => setTrainingCenter(e.target.value)}
                    placeholder="Contoh: SMK Negeri 1 Gorontalo"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Nama Peserta *</label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Nama lengkap peserta magang"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Pendamping</label>
                  <input
                    type="text"
                    value={mentor}
                    onChange={(e) => setMentor(e.target.value)}
                    placeholder="Contoh: Aldi / Richie"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Kabupaten / Domisili
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Contoh: Kota Gorontalo"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Kemampuan Mengemudi
                  </label>
                  <input
                    type="text"
                    value={drivingSkill}
                    onChange={(e) => setDrivingSkill(e.target.value)}
                    placeholder="Siswa Aktif / Bisa R4 / SIM C"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Status Siswa</label>
                  <select
                    value={studentStatus}
                    onChange={(e) => setStudentStatus(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  >
                    <option value="Siswa Aktif">Siswa Aktif</option>
                    <option value="Kelas XI">Kelas XI</option>
                    <option value="Kelas XII">Kelas XII</option>
                    <option value="Alumni">Alumni</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Target PKT *</label>
                  <input
                    type="text"
                    required
                    value={targetPkt}
                    onChange={(e) => setTargetPkt(e.target.value)}
                    placeholder="Contoh: SSI - Palu / AND - Bali"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Jobdesk</label>
                  <input
                    type="text"
                    value={jobdesk}
                    onChange={(e) => setJobdesk(e.target.value)}
                    placeholder="Contoh: CPC / ATM / FLM"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Bulan Penempatan</label>
                  <input
                    type="text"
                    value={placementMonth}
                    onChange={(e) => setPlacementMonth(e.target.value)}
                    placeholder="Contoh: 02 Januari 2025"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Email</label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.replace(/ı/g, "i").replace(/İ/g, "I"))}
                    placeholder="peserta@email.com"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Nomor WA</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0813..."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Status Magang</label>
                  <select
                    value={internshipStatus}
                    onChange={(e) => setInternshipStatus(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  >
                    <option value="Peserta Baru">Peserta Baru</option>
                    <option value="Peserta Pengganti">Peserta Pengganti</option>
                    <option value="Aktif Magang">Aktif Magang</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Mundur">Mundur</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
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
                  className="rounded-xl bg-primary text-primary-foreground px-5 py-2 text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {saveMutation.isPending ? "Menyimpan..." : "Simpan Peserta Magang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Import Modal */}
      <InternshipExcelImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-internships"] });
          queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
        }}
        bulkImportMutation={bulkImportMutation}
      />
    </AppShell>
  );
}

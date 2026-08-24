import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, Loading, EmptyState } from "@/components/app/shell";
import {
  listSchools,
  saveSchool,
  deleteSchool,
  bulkDeleteSchools,
  bulkUpdateSchoolsStatus,
  importSchoolsBulk,
} from "@/lib/api.functions";
import {
  Search,
  Plus,
  Edit2,
  X,
  FileSpreadsheet,
  Trash2,
  CheckSquare,
  Square,
  CheckCircle2,
  Building2,
  School,
  Layers,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { SchoolExcelImportModal } from "@/components/app/school-excel-import-modal";

export const Route = createFileRoute("/_authenticated/app/admin/schools")({
  head: () => ({
    meta: [
      { title: "Data Sekolah — VokasiFlow AI" },
      { name: "description", content: "Manajemen data induk institusi SMK mitra." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSchoolsPage,
});

interface SchoolItem {
  id: string;
  name: string;
  school_code: string;
  address: string | null;
  city: string | null;
  province: string | null;
  mentor: string | null;
  partnership_type: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  status: string;
}

function AdminSchoolsPage() {
  const queryClient = useQueryClient();
  const fetchSchools = useServerFn(listSchools);
  const saveSchoolFn = useServerFn(saveSchool);
  const deleteSchoolFn = useServerFn(deleteSchool);
  const bulkDeleteSchoolsFn = useServerFn(bulkDeleteSchools);
  const bulkUpdateSchoolsStatusFn = useServerFn(bulkUpdateSchoolsStatus);
  const importSchoolsBulkFn = useServerFn(importSchoolsBulk);

  const [search, setSearch] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolItem | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [mentor, setMentor] = useState("");
  const [partnershipType, setPartnershipType] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const {
    data: schools,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["schools-list"],
    queryFn: () => fetchSchools(),
  });

  const allSchools: SchoolItem[] = (schools ?? []) as SchoolItem[];

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: string | undefined;
      name: string;
      school_code: string;
      address: string | null;
      city: string | null;
      province: string | null;
      mentor: string | null;
      partnership_type: string | null;
      contact_name: string | null;
      contact_phone: string | null;
      status: "ACTIVE" | "INACTIVE";
    }) => {
      return saveSchoolFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(
        editingSchool
          ? "Data sekolah berhasil diperbarui."
          : "Sekolah mitra baru berhasil ditambahkan.",
      );
      queryClient.invalidateQueries({ queryKey: ["schools-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      closeModal();
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal menyimpan data sekolah.");
    },
  });

  const deleteSchoolMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteSchoolFn({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Data sekolah berhasil dihapus.");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["schools-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal menghapus data sekolah.");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return bulkDeleteSchoolsFn({ data: { ids } });
    },
    onSuccess: (_, variables) => {
      toast.success(`Berhasil menghapus ${variables.length} sekolah.`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["schools-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal menghapus sekolah terpilih.");
    },
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async (payload: { ids: string[]; status: "ACTIVE" | "INACTIVE" }) => {
      return bulkUpdateSchoolsStatusFn({ data: payload });
    },
    onSuccess: (_, variables) => {
      toast.success(`Berhasil memperbarui status ${variables.ids.length} sekolah.`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["schools-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal memperbarui status sekolah terpilih.");
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (params: {
      schools: Array<{
        name: string;
        school_code: string;
        address: string | null;
        city: string | null;
        province: string | null;
        mentor: string | null;
        partnership_type: string | null;
        contact_name: string | null;
        contact_phone: string | null;
        status: "ACTIVE" | "INACTIVE";
      }>;
      upsert: boolean;
    }) => {
      return importSchoolsBulkFn({ data: params });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });

  function openCreateModal() {
    setEditingSchool(null);
    setName("");
    setSchoolCode("");
    setAddress("");
    setCity("");
    setProvince("");
    setMentor("");
    setPartnershipType("SMK Rujukan");
    setContactName("");
    setContactPhone("");
    setStatus("ACTIVE");
    setModalOpen(true);
  }

  function openEditModal(school: SchoolItem) {
    setEditingSchool(school);
    setName(school.name);
    setSchoolCode(school.school_code);
    setAddress(school.address ?? "");
    setCity(school.city ?? "");
    setProvince(school.province ?? "");
    setMentor(school.mentor ?? "");
    setPartnershipType(school.partnership_type ?? "");
    setContactName(school.contact_name ?? "");
    setContactPhone(school.contact_phone ?? "");
    setStatus(school.status as "ACTIVE" | "INACTIVE");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingSchool(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !schoolCode.trim()) {
      toast.error("Nama sekolah dan kode sekolah wajib diisi.");
      return;
    }

    saveMutation.mutate({
      id: editingSchool?.id,
      name: name.trim(),
      school_code: schoolCode.trim().toUpperCase(),
      address: address.trim() || null,
      city: city.trim() || null,
      province: province.trim() || null,
      mentor: mentor.trim() || null,
      partnership_type: partnershipType.trim() || null,
      contact_name: contactName.trim() || null,
      contact_phone: contactPhone.trim() || null,
      status,
    });
  }

  // Filter options
  const cityList: string[] = Array.from(
    new Set(allSchools.map((s) => s.city).filter((c): c is string => Boolean(c))),
  );

  const filteredSchools = allSchools.filter((s) => {
    if (!s) return false;
    const q = (search || "").toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(s.name ?? "")
        .toLowerCase()
        .includes(q) ||
      String(s.school_code ?? "")
        .toLowerCase()
        .includes(q) ||
      String(s.city ?? "")
        .toLowerCase()
        .includes(q) ||
      String(s.province ?? "")
        .toLowerCase()
        .includes(q) ||
      String(s.mentor ?? "")
        .toLowerCase()
        .includes(q) ||
      String(s.partnership_type ?? "")
        .toLowerCase()
        .includes(q) ||
      String(s.contact_name ?? "")
        .toLowerCase()
        .includes(q) ||
      String(s.contact_phone ?? "")
        .toLowerCase()
        .includes(q);

    const matchesStatus = selectedStatusFilter === "ALL" || s.status === selectedStatusFilter;
    const matchesCity = selectedCityFilter === "ALL" || s.city === selectedCityFilter;

    return matchesSearch && matchesStatus && matchesCity;
  });

  // Multiple selection helpers
  const allFilteredSelected =
    filteredSchools.length > 0 && filteredSchools.every((s) => selectedIds.has(s.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      const next = new Set(selectedIds);
      filteredSchools.forEach((s) => next.delete(s.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filteredSchools.forEach((s) => next.add(s.id));
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

  // Counts
  const activeCount = allSchools.filter((s) => s.status === "ACTIVE").length;
  const inactiveCount = allSchools.filter((s) => s.status === "INACTIVE").length;

  return (
    <AppShell
      title="Master Data Sekolah Mitra"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-bold hover:bg-softgray hover:text-foreground transition-all shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Import Excel
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3.5 py-2 text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Tambah Sekolah
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* KPI Stats Cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4 bg-card/60 backdrop-blur-xs border-border/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Total Sekolah Mitra</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{allSchools.length}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">SMK mitra terdaftar</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <School className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-4 bg-card/60 backdrop-blur-xs border-border/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Sekolah Aktif</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {activeCount}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Kemitraan aktif berjalan</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-4 bg-card/60 backdrop-blur-xs border-border/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Non-Aktif</p>
              <h3 className="text-2xl font-black text-zinc-500 mt-0.5">{inactiveCount}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Kemitraan ditangguhkan</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-zinc-500/10 text-zinc-500">
              <Building2 className="h-5 w-5" />
            </div>
          </Card>
        </div>

        {/* Filter Controls */}
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, kode sekolah, kota, provinsi, pendamping, kepala sekolah..."
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2 text-xs outline-none focus:border-ai transition-colors"
            />
          </div>

          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Non-Aktif</option>
            </select>
          </div>

          <div>
            <select
              value={selectedCityFilter}
              onChange={(e) => setSelectedCityFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
            >
              <option value="ALL">Semua Kota / Kab</option>
              {cityList.map((c) => (
                <option key={c} value={c}>
                  {c}
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
                Sekolah Dipilih (Multiple Choice)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">Ubah Status:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value === "ACTIVE" || e.target.value === "INACTIVE") {
                      bulkUpdateStatusMutation.mutate({
                        ids: Array.from(selectedIds),
                        status: e.target.value,
                      });
                      e.target.value = "";
                    }
                  }}
                  defaultValue=""
                  disabled={bulkUpdateStatusMutation.isPending}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus:border-ai shadow-2xs"
                >
                  <option value="" disabled>
                    Pilih Status...
                  </option>
                  <option value="ACTIVE">Set Aktif</option>
                  <option value="INACTIVE">Set Non-Aktif</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `PERINGATAN: Hapus ${selectedIds.size} data sekolah yang dipilih beserta relasi siswa & pengajuan magangnya? Tindakan ini tidak dapat dibatalkan.`,
                    )
                  ) {
                    bulkDeleteMutation.mutate(Array.from(selectedIds));
                  }
                }}
                disabled={bulkDeleteMutation.isPending}
                className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors shadow-2xs disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {bulkDeleteMutation.isPending
                  ? "Menghapus..."
                  : `Hapus (${selectedIds.size}) Sekolah`}
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-softgray transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Counter Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Menampilkan <strong className="text-foreground">{filteredSchools.length}</strong> dari{" "}
            <strong className="text-foreground">{allSchools.length}</strong> sekolah
          </span>
          {selectedIds.size > 0 && (
            <span className="text-primary font-semibold">{selectedIds.size} sekolah terpilih</span>
          )}
        </div>

        {/* Content Table */}
        {isPending ? <Loading count={3} /> : null}

        {isError ? (
          <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4">
            <p className="text-xs font-medium">Gagal memuat data sekolah.</p>
          </Card>
        ) : null}

        {!isPending && !isError ? (
          filteredSchools.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-softgray/60 border-b border-border">
                    <tr className="text-muted-foreground whitespace-nowrap">
                      <th className="px-3.5 py-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-center"
                          title={allFilteredSelected ? "Batal pilih semua" : "Pilih semua baris"}
                        >
                          {allFilteredSelected ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-3.5 py-3 font-semibold">Nama Sekolah</th>
                      <th className="px-3.5 py-3 font-semibold">Kode Sekolah</th>
                      <th className="px-3.5 py-3 font-semibold">Alamat</th>
                      <th className="px-3.5 py-3 font-semibold">Kota / Kab</th>
                      <th className="px-3.5 py-3 font-semibold">Provinsi</th>
                      <th className="px-3.5 py-3 font-semibold">Pendamping</th>
                      <th className="px-3.5 py-3 font-semibold">Status Sekolah</th>
                      <th className="px-3.5 py-3 font-semibold">Kepesertaan Sekolah</th>
                      <th className="px-3.5 py-3 font-semibold">Kepala Sekolah</th>
                      <th className="px-3.5 py-3 font-semibold">Nomor Telpon</th>
                      <th className="px-3.5 py-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSchools.map((s) => {
                      const isSelected = selectedIds.has(s.id);
                      return (
                        <tr
                          key={s.id}
                          className={`transition-colors ${
                            isSelected ? "bg-primary/5 font-medium" : "hover:bg-softgray/30"
                          }`}
                        >
                          <td className="px-3.5 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSelect(s.id)}
                              className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-center"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="px-3.5 py-3 min-w-[200px]">
                            <span className="font-bold text-foreground block text-xs">
                              {s.name}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 font-mono">
                            <span className="rounded-md bg-softgray px-2 py-0.5 text-[11px] font-semibold text-foreground">
                              {s.school_code}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 min-w-[220px] max-w-[280px]">
                            <span
                              className="text-[11px] text-muted-foreground line-clamp-2 block"
                              title={s.address || "Belum diatur"}
                            >
                              {s.address || "-"}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-muted-foreground whitespace-nowrap">
                            {s.city || "-"}
                          </td>
                          <td className="px-3.5 py-3 text-muted-foreground whitespace-nowrap">
                            {s.province || "-"}
                          </td>
                          <td className="px-3.5 py-3 font-medium text-foreground whitespace-nowrap">
                            {s.mentor ? (
                              <span className="rounded bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                                {s.mentor}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                s.status === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-zinc-500/10 text-zinc-500"
                              }`}
                            >
                              {s.status === "ACTIVE" ? "Aktif" : "Non-Aktif"}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 whitespace-nowrap">
                            {s.partnership_type ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                                  String(s.partnership_type).toLowerCase().includes("rujukan")
                                    ? "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200/50"
                                    : String(s.partnership_type).toLowerCase().includes("mandiri")
                                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/50"
                                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/50"
                                }`}
                              >
                                {s.partnership_type}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 min-w-[150px]">
                            <span className="font-medium text-foreground text-[11px] block">
                              {s.contact_name || "-"}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                            {s.contact_phone || "-"}
                          </td>
                          <td className="px-3.5 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(s)}
                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold hover:bg-softgray transition-colors"
                                title="Edit Sekolah"
                              >
                                <Edit2 className="h-3 w-3" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Hapus sekolah "${s.name}"? Siswa dan pengajuan magang yang terhubung ke sekolah ini akan dibersihkan.`,
                                    )
                                  ) {
                                    deleteSchoolMutation.mutate(s.id);
                                  }
                                }}
                                disabled={deleteSchoolMutation.isPending}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                                title="Hapus Sekolah"
                              >
                                <Trash2 className="h-3 w-3" />
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
              title="Tidak ada data sekolah"
              description="Belum ada data sekolah yang sesuai dengan pencarian atau filter Anda."
              action={
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
                >
                  <Plus className="h-4 w-4" /> Tambah Sekolah
                </button>
              }
            />
          )
        ) : null}
      </div>

      {/* Create / Edit School Modal */}
      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-background p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground">
                {editingSchool ? "Edit Data Sekolah" : "Tambah Sekolah Mitra Baru"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-softgray text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Nama Sekolah *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: SMK Negeri 1 Surabaya"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Kode Sekolah *</label>
                  <input
                    type="text"
                    required
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value)}
                    placeholder="Contoh: SMKN1-SBY"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors uppercase font-mono font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  >
                    <option value="ACTIVE">Aktif</option>
                    <option value="INACTIVE">Non-Aktif</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Alamat Lengkap</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat sekolah..."
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Kota / Kabupaten</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Contoh: Kota Surabaya"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Provinsi</label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="Contoh: Jawa Timur"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Pendamping</label>
                  <input
                    type="text"
                    value={mentor}
                    onChange={(e) => setMentor(e.target.value)}
                    placeholder="Contoh: Hani / Aldi"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Kepesertaan Sekolah
                  </label>
                  <input
                    type="text"
                    value={partnershipType}
                    onChange={(e) => setPartnershipType(e.target.value)}
                    placeholder="Contoh: SMK Rujukan / Mandiri"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Kepala Sekolah / PIC
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Nama kontak..."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Nomor Telepon</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
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
                  className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {saveMutation.isPending ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Excel Import Modal */}
      <SchoolExcelImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={async (importedSchools, upsert) => {
          return bulkImportMutation.mutateAsync({
            schools: importedSchools,
            upsert,
          });
        }}
        isImporting={bulkImportMutation.isPending}
      />
    </AppShell>
  );
}

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, Loading, EmptyState } from "@/components/app/shell";
import { listSchools, saveSchool, importSchoolsBulk } from "@/lib/api.functions";
import { Search, Plus, Edit2, X, FileSpreadsheet } from "lucide-react";
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
  const importSchoolsBulkFn = useServerFn(importSchoolsBulk);

  const [search, setSearch] = useState("");
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

  const filteredSchools = (schools ?? []).filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.school_code.toLowerCase().includes(q) ||
      (s.city ?? "").toLowerCase().includes(q) ||
      (s.province ?? "").toLowerCase().includes(q) ||
      (s.mentor ?? "").toLowerCase().includes(q) ||
      (s.partnership_type ?? "").toLowerCase().includes(q) ||
      (s.contact_name ?? "").toLowerCase().includes(q) ||
      (s.contact_phone ?? "").toLowerCase().includes(q)
    );
  });

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
        {/* Search Bar & Total count */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, kode sekolah, kota, provinsi, pendamping, kepala sekolah..."
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2 text-xs outline-none focus:border-ai transition-colors"
            />
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            Total Sekolah: <span className="font-bold text-foreground">{schools?.length ?? 0}</span>
          </div>
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
                    {filteredSchools.map((s) => (
                      <tr key={s.id} className="hover:bg-softgray/30 transition-colors">
                        <td className="px-3.5 py-3 min-w-[200px]">
                          <span className="font-bold text-foreground block text-xs">{s.name}</span>
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
                                s.partnership_type.toLowerCase().includes("rujukan")
                                  ? "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200/50"
                                  : s.partnership_type.toLowerCase().includes("mandiri")
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
                          <button
                            type="button"
                            onClick={() => openEditModal(s)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold hover:bg-softgray transition-colors"
                          >
                            <Edit2 className="h-3 w-3" /> Edit
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
              title="Tidak ada sekolah ditemukan"
              description="Belum ada data sekolah mitra atau kata kunci tidak sesuai."
            />
          )
        ) : null}
      </div>

      {/* Add / Edit School Modal */}
      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-background shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-bold tracking-tight">
                {editingSchool ? "Edit Data Sekolah" : "Tambah Sekolah Mitra"}
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
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="grid gap-1.5 text-xs font-semibold">
                    Nama Sekolah
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="BLK Don Bosco / SMK Negeri 1 Tengaran"
                      className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                    />
                  </label>
                </div>
                <div>
                  <label className="grid gap-1.5 text-xs font-semibold">
                    Kode Sekolah
                    <input
                      type="text"
                      required
                      value={schoolCode}
                      onChange={(e) => setSchoolCode(e.target.value)}
                      placeholder="119 / SMKN1"
                      className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-mono outline-none focus:border-ai uppercase"
                    />
                  </label>
                </div>
              </div>

              <label className="grid gap-1.5 text-xs font-semibold">
                Alamat Lengkap
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Rangga Rame, Desa Weepangali, Kec. Kota Tambolaka..."
                  className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-semibold">
                  Kota / Kab
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Kabupaten Sumba Barat"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Provinsi
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="Nusa Tenggara Timur"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-semibold">
                  Pendamping
                  <input
                    type="text"
                    value={mentor}
                    onChange={(e) => setMentor(e.target.value)}
                    placeholder="Aldi / Hani"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Kepesertaan Sekolah
                  <input
                    type="text"
                    list="partnership-options"
                    value={partnershipType}
                    onChange={(e) => setPartnershipType(e.target.value)}
                    placeholder="SMK Rujukan / SMK Mandiri / SMK Aliansi"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                  <datalist id="partnership-options">
                    <option value="SMK Rujukan" />
                    <option value="SMK Mandiri" />
                    <option value="SMK Aliansi" />
                  </datalist>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-semibold">
                  Kepala Sekolah / PIC
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Br. Ephrem Santos, SPd"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Nomor Telpon
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="08123599602"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
              </div>

              <label className="grid gap-1.5 text-xs font-semibold">
                Status Sekolah
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                  className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                >
                  <option value="ACTIVE">Aktif (ACTIVE)</option>
                  <option value="INACTIVE">Non-Aktif (INACTIVE)</option>
                </select>
              </label>

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
                  {saveMutation.isPending ? "Menyimpan..." : "Simpan Sekolah"}
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
          await bulkImportMutation.mutateAsync({
            schools: importedSchools,
            upsert,
          });
        }}
        isImporting={bulkImportMutation.isPending}
      />
    </AppShell>
  );
}

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, StatusBadge, Loading, EmptyState } from "@/components/app/shell";
import { listSchools, saveSchool } from "@/lib/api.functions";
import { Search, Plus, Edit2, X, School, MapPin, Phone, User } from "lucide-react";
import { toast } from "sonner";

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
  contact_name: string | null;
  contact_phone: string | null;
  status: string;
}

function AdminSchoolsPage() {
  const queryClient = useQueryClient();
  const fetchSchools = useServerFn(listSchools);
  const saveSchoolFn = useServerFn(saveSchool);

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolItem | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
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

  function openCreateModal() {
    setEditingSchool(null);
    setName("");
    setSchoolCode("");
    setAddress("");
    setCity("");
    setProvince("");
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
      contact_name: contactName.trim() || null,
      contact_phone: contactPhone.trim() || null,
      status,
    });
  }

  const filteredSchools = (schools ?? []).filter((s) => {
    return (
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.school_code.toLowerCase().includes(search.toLowerCase()) ||
      (s.city ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <AppShell
      title="Master Data Sekolah Mitra"
      actions={
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3.5 py-2 text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Tambah Sekolah
        </button>
      }
    >
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, kode sekolah, kota..."
            className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2 text-xs outline-none focus:border-ai transition-colors"
          />
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
                  <thead className="bg-softgray/50 border-b border-border">
                    <tr className="text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">Nama Sekolah</th>
                      <th className="px-4 py-3 font-semibold">Kode</th>
                      <th className="px-4 py-3 font-semibold">Lokasi</th>
                      <th className="px-4 py-3 font-semibold">Kontak PIC</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSchools.map((s) => (
                      <tr key={s.id} className="hover:bg-softgray/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-foreground block text-sm">{s.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {s.address || "Alamat belum diatur"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-semibold">
                          <span className="rounded-md bg-softgray px-2 py-0.5 text-[11px]">
                            {s.school_code}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {s.city ? `${s.city}, ${s.province || ""}` : "-"}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-medium text-foreground block">
                            {s.contact_name || "-"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {s.contact_phone || ""}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="px-4 py-3.5 text-right">
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
                      placeholder="SMK Negeri 1 Bandung"
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
                      placeholder="SMKN1BDG"
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
                  placeholder="Jl. Wastukancana No. 3"
                  className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-semibold">
                  Kota / Kabupaten
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bandung"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Provinsi
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="Jawa Barat"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-semibold">
                  Nama Kontak PIC / Kepala Hubin
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Dedi Supriadi"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Nomor HP / WA PIC
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="081234567001"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
              </div>

              <label className="grid gap-1.5 text-xs font-semibold">
                Status Kerjasama
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
    </AppShell>
  );
}

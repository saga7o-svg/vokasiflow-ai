import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, StatusBadge, Loading, EmptyState } from "@/components/app/shell";
import { listCompanies, saveCompany, saveQuota } from "@/lib/api.functions";
import {
  Search,
  Plus,
  Edit2,
  X,
  Building2,
  Layers,
  MapPin,
  Mail,
  Phone,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/admin/companies")({
  head: () => ({
    meta: [
      { title: "Perusahaan Mitra & Kuota — VokasiFlow AI" },
      { name: "description", content: "Manajemen industri mitra dan alokasi kuota magang." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCompaniesPage,
});

interface CompanyItem {
  id: string;
  name: string;
  company_code: string;
  industry: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
}

interface QuotaItem {
  id: string;
  company_id: string;
  competency: string;
  quota: number;
  used_quota: number;
  period: string;
}

function AdminCompaniesPage() {
  const queryClient = useQueryClient();
  const fetchCompanies = useServerFn(listCompanies);
  const saveCompanyFn = useServerFn(saveCompany);
  const saveQuotaFn = useServerFn(saveQuota);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"COMPANIES" | "QUOTAS">("COMPANIES");

  // Company Modal State
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [industry, setIndustry] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [companyStatus, setCompanyStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  // Quota Modal State
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [editingQuota, setEditingQuota] = useState<QuotaItem | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [quotaCompetency, setQuotaCompetency] = useState("Software Development");
  const [quotaPeriod, setQuotaPeriod] = useState("2026-S1");
  const [quotaAmount, setQuotaAmount] = useState(5);

  const { data, isPending, isError } = useQuery({
    queryKey: ["companies-list"],
    queryFn: () => fetchCompanies(),
  });

  const saveCompanyMutation = useMutation({
    mutationFn: async (payload: {
      id?: string | undefined;
      name: string;
      company_code: string;
      industry: string | null;
      address: string | null;
      city: string | null;
      province: string | null;
      contact_name: string | null;
      contact_email: string | null;
      contact_phone: string | null;
      status: "ACTIVE" | "INACTIVE";
    }) => {
      return saveCompanyFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(
        editingCompany
          ? "Data perusahaan berhasil diperbarui."
          : "Perusahaan mitra berhasil ditambahkan.",
      );
      queryClient.invalidateQueries({ queryKey: ["companies-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      closeCompanyModal();
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal menyimpan data perusahaan.");
    },
  });

  const saveQuotaMutation = useMutation({
    mutationFn: async (payload: {
      id?: string | undefined;
      company_id: string;
      competency: string;
      period: string;
      quota: number;
    }) => {
      return saveQuotaFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("Alokasi kuota magang berhasil disimpan.");
      queryClient.invalidateQueries({ queryKey: ["companies-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      closeQuotaModal();
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal menyimpan kuota.");
    },
  });

  function openCreateCompany() {
    setEditingCompany(null);
    setCompanyName("");
    setCompanyCode("");
    setIndustry("");
    setAddress("");
    setCity("");
    setProvince("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setCompanyStatus("ACTIVE");
    setCompanyModalOpen(true);
  }

  function openEditCompany(c: CompanyItem) {
    setEditingCompany(c);
    setCompanyName(c.name);
    setCompanyCode(c.company_code);
    setIndustry(c.industry ?? "");
    setAddress(c.address ?? "");
    setCity(c.city ?? "");
    setProvince(c.province ?? "");
    setContactName(c.contact_name ?? "");
    setContactEmail(c.contact_email ?? "");
    setContactPhone(c.contact_phone ?? "");
    setCompanyStatus(c.status as "ACTIVE" | "INACTIVE");
    setCompanyModalOpen(true);
  }

  function closeCompanyModal() {
    setCompanyModalOpen(false);
    setEditingCompany(null);
  }

  function handleCompanySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !companyCode.trim()) {
      toast.error("Nama dan kode perusahaan wajib diisi.");
      return;
    }
    saveCompanyMutation.mutate({
      id: editingCompany?.id,
      name: companyName.trim(),
      company_code: companyCode.trim().toUpperCase(),
      industry: industry.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      province: province.trim() || null,
      contact_name: contactName.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      status: companyStatus,
    });
  }

  function openCreateQuota(companyId?: string) {
    setEditingQuota(null);
    setSelectedCompanyId(companyId || data?.companies[0]?.id || "");
    setQuotaCompetency("Software Development");
    setQuotaPeriod("2026-S1");
    setQuotaAmount(5);
    setQuotaModalOpen(true);
  }

  function openEditQuota(q: QuotaItem) {
    setEditingQuota(q);
    setSelectedCompanyId(q.company_id);
    setQuotaCompetency(q.competency);
    setQuotaPeriod(q.period);
    setQuotaAmount(q.quota);
    setQuotaModalOpen(true);
  }

  function closeQuotaModal() {
    setQuotaModalOpen(false);
    setEditingQuota(null);
  }

  function handleQuotaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCompanyId || !quotaCompetency.trim() || !quotaPeriod.trim()) {
      toast.error("Semua kolom kuota wajib diisi.");
      return;
    }
    saveQuotaMutation.mutate({
      id: editingQuota?.id,
      company_id: selectedCompanyId,
      competency: quotaCompetency.trim(),
      period: quotaPeriod.trim(),
      quota: Number(quotaAmount),
    });
  }

  const companiesList = data?.companies ?? [];
  const quotasList = data?.quotas ?? [];

  const filteredCompanies = companiesList.filter((c) => {
    return (
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company_code.toLowerCase().includes(search.toLowerCase()) ||
      (c.industry ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.city ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const filteredQuotas = quotasList.filter((q) => {
    const comp = companiesList.find((c) => c.id === q.company_id);
    return (
      q.competency.toLowerCase().includes(search.toLowerCase()) ||
      q.period.toLowerCase().includes(search.toLowerCase()) ||
      (comp?.name ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <AppShell
      title="Manajemen Industri Mitra & Kuota"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateCompany}
            className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3.5 py-2 text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Tambah Mitra
          </button>
          <button
            type="button"
            onClick={() => openCreateQuota()}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-bold hover:bg-softgray transition-colors"
          >
            <Layers className="h-4 w-4" /> Buka Kuota
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Navigation Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 border-b border-border sm:border-0 pb-2 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab("COMPANIES")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "COMPANIES"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-background border border-border text-muted-foreground hover:bg-softgray"
              }`}
            >
              Daftar Perusahaan ({companiesList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("QUOTAS")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === "QUOTAS"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-background border border-border text-muted-foreground hover:bg-softgray"
              }`}
            >
              Alokasi Kuota Magang ({quotasList.length})
            </button>
          </div>

          <div className="relative max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari perusahaan atau kuota..."
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2 text-xs outline-none focus:border-ai transition-colors"
            />
          </div>
        </div>

        {/* Content Body */}
        {isPending ? <Loading count={4} /> : null}

        {isError ? (
          <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4">
            <p className="text-xs font-medium">Gagal memuat data perusahaan dan kuota.</p>
          </Card>
        ) : null}

        {!isPending && !isError && activeTab === "COMPANIES" ? (
          filteredCompanies.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-softgray/50 border-b border-border">
                    <tr className="text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">Nama Perusahaan</th>
                      <th className="px-4 py-3 font-semibold">Bidang Industri</th>
                      <th className="px-4 py-3 font-semibold">Lokasi</th>
                      <th className="px-4 py-3 font-semibold">Kontak PIC</th>
                      <th className="px-4 py-3 font-semibold">Total Kuota Aktif</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredCompanies.map((c) => {
                      const cQuotas = quotasList.filter((q) => q.company_id === c.id);
                      const totalQuota = cQuotas.reduce((acc, q) => acc + q.quota, 0);
                      const usedQuota = cQuotas.reduce((acc, q) => acc + q.used_quota, 0);

                      return (
                        <tr key={c.id} className="hover:bg-softgray/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-foreground block text-sm">
                              {c.name}
                            </span>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              Kode: {c.company_code}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-foreground">
                            {c.industry || "Umum"}
                          </td>
                          <td className="px-4 py-3.5 text-muted-foreground">
                            {c.city ? `${c.city}, ${c.province || ""}` : "-"}
                          </td>
                          <td className="px-4 py-3.5 text-[11px]">
                            <span className="font-medium text-foreground block">
                              {c.contact_name || "-"}
                            </span>
                            <span className="text-muted-foreground">
                              {c.contact_email || c.contact_phone || ""}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold">
                                {usedQuota} / {totalQuota}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                ({totalQuota - usedQuota} sisa)
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openCreateQuota(c.id)}
                                title="Buka Kuota Tambahan"
                                className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-medium hover:bg-softgray transition-colors"
                              >
                                + Kuota
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditCompany(c)}
                                className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-semibold hover:bg-softgray transition-colors"
                              >
                                Edit
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
              title="Tidak ada perusahaan mitra"
              description="Belum ada perusahaan yang cocok dengan pencarian Anda."
            />
          )
        ) : null}

        {!isPending && !isError && activeTab === "QUOTAS" ? (
          filteredQuotas.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-softgray/50 border-b border-border">
                    <tr className="text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">Perusahaan Mitra</th>
                      <th className="px-4 py-3 font-semibold">Kompetensi</th>
                      <th className="px-4 py-3 font-semibold">Periode</th>
                      <th className="px-4 py-3 font-semibold">Alokasi Kuota</th>
                      <th className="px-4 py-3 font-semibold">Kapasitas Tersedia</th>
                      <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredQuotas.map((q) => {
                      const company = companiesList.find((c) => c.id === q.company_id);
                      const available = q.quota - q.used_quota;
                      const isFull = available <= 0;

                      return (
                        <tr key={q.id} className="hover:bg-softgray/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-foreground block">
                              {company?.name ?? "-"}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {company?.city ?? ""}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="rounded-md bg-softgray px-2 py-0.5 font-mono text-[11px]">
                              {q.competency}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-mono font-semibold">{q.period}</td>
                          <td className="px-4 py-3.5 font-mono">
                            {q.used_quota} dari {q.quota} siswa
                          </td>
                          <td className="px-4 py-3.5">
                            {isFull ? (
                              <span className="rounded-full bg-destructive/10 text-destructive px-2.5 py-0.5 text-[11px] font-bold">
                                Kuota Penuh (0)
                              </span>
                            ) : (
                              <span className="rounded-full bg-good/15 text-good px-2.5 py-0.5 text-[11px] font-bold">
                                Sisa {available} Kursi
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => openEditQuota(q)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold hover:bg-softgray transition-colors"
                            >
                              <Edit2 className="h-3 w-3" /> Edit Kuota
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
              title="Tidak ada alokasi kuota"
              description="Belum ada kuota magang yang dibuka untuk periode ini."
            />
          )
        ) : null}
      </div>

      {/* Add / Edit Company Modal */}
      {companyModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-background shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-bold tracking-tight">
                {editingCompany ? "Edit Data Perusahaan" : "Tambah Mitra Industri"}
              </h2>
              <button
                type="button"
                onClick={closeCompanyModal}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-softgray text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleCompanySubmit}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="grid gap-1.5 text-xs font-semibold">
                    Nama Perusahaan / Industri
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="PT Nusantara Digital"
                      className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                    />
                  </label>
                </div>
                <div>
                  <label className="grid gap-1.5 text-xs font-semibold">
                    Kode Mitra
                    <input
                      type="text"
                      required
                      value={companyCode}
                      onChange={(e) => setCompanyCode(e.target.value)}
                      placeholder="NUSDIG"
                      className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-mono outline-none focus:border-ai uppercase"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-semibold">
                  Bidang Industri / Sektor
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Teknologi Informasi"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Kota Operasional
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Jakarta"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
              </div>

              <label className="grid gap-1.5 text-xs font-semibold">
                Alamat Kantor / Pabrik
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Jenderal Sudirman No. 21"
                  className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-semibold">
                  Nama PIC HR / Pembimbing
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Sari Puspita"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Email PIC
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="hr@nusantara.id"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-semibold">
                  No. Telepon / WA PIC
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="0218001001"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Status Kemitraan
                  <select
                    value={companyStatus}
                    onChange={(e) => setCompanyStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  >
                    <option value="ACTIVE">Aktif (ACTIVE)</option>
                    <option value="INACTIVE">Non-Aktif (INACTIVE)</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={closeCompanyModal}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-softgray transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saveCompanyMutation.isPending}
                  className="rounded-xl bg-primary text-primary-foreground px-5 py-2 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saveCompanyMutation.isPending ? "Menyimpan..." : "Simpan Perusahaan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Add / Edit Quota Modal */}
      {quotaModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-border bg-background shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-bold tracking-tight">
                {editingQuota ? "Ubah Alokasi Kuota" : "Buka Kuota Magang Baru"}
              </h2>
              <button
                type="button"
                onClick={closeQuotaModal}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-softgray text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleQuotaSubmit} className="p-6 space-y-4">
              <label className="grid gap-1.5 text-xs font-semibold">
                Pilih Perusahaan Mitra
                <select
                  required
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                >
                  <option value="">Pilih Perusahaan...</option>
                  {companiesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-semibold">
                Kompetensi Keahlian
                <input
                  type="text"
                  required
                  value={quotaCompetency}
                  onChange={(e) => setQuotaCompetency(e.target.value)}
                  placeholder="Software Development"
                  className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-semibold">
                  Periode Semester
                  <input
                    type="text"
                    required
                    value={quotaPeriod}
                    onChange={(e) => setQuotaPeriod(e.target.value)}
                    placeholder="2026-S1"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-mono outline-none focus:border-ai"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Jumlah Kuota Siswa
                  <input
                    type="number"
                    min={1}
                    max={200}
                    required
                    value={quotaAmount}
                    onChange={(e) => setQuotaAmount(Number(e.target.value))}
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={closeQuotaModal}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-softgray transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saveQuotaMutation.isPending}
                  className="rounded-xl bg-primary text-primary-foreground px-5 py-2 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saveQuotaMutation.isPending ? "Menyimpan..." : "Simpan Kuota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

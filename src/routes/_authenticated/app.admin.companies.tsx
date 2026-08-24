import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, StatusBadge, Loading, EmptyState } from "@/components/app/shell";
import {
  listCompanies,
  saveCompany,
  deleteCompany,
  saveCompanyBranch,
  deleteCompanyBranch,
  importCompanyBranchesBulk,
  seedDefaultCompaniesAndBranches,
  clearAllCompanies,
  bulkDeleteCompanies,
  bulkUpdateCompaniesStatus,
} from "@/lib/api.functions";
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
  FileSpreadsheet,
  Download,
  Trash2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Users,
  Briefcase,
  Sparkles,
  MapPinned,
} from "lucide-react";
import { toast } from "sonner";
import { CompanyBranchImportModal } from "@/components/app/company-branch-import-modal";

export const Route = createFileRoute("/_authenticated/app/admin/companies")({
  head: () => ({
    meta: [
      { title: "PKT — VokasiFlow AI" },
      {
        name: "description",
        content: "Manajemen industri mitra, cabang PKT, dan alamat penempatan magang.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCompaniesPage,
});

interface BranchItem {
  id: string;
  branch_name: string;
  address: string;
  city?: string | null;
  province?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  internCount?: number;
}

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
  branches?: BranchItem[];
  totalInterns?: number;
}

function AdminCompaniesPage() {
  const queryClient = useQueryClient();
  const fetchCompanies = useServerFn(listCompanies);
  const saveCompanyFn = useServerFn(saveCompany);
  const deleteCompanyFn = useServerFn(deleteCompany);
  const saveBranchFn = useServerFn(saveCompanyBranch);
  const deleteBranchFn = useServerFn(deleteCompanyBranch);
  const importBranchesFn = useServerFn(importCompanyBranchesBulk);
  const seedDefaultFn = useServerFn(seedDefaultCompaniesAndBranches);
  const clearAllFn = useServerFn(clearAllCompanies);
  const bulkDeleteCompaniesFn = useServerFn(bulkDeleteCompanies);
  const bulkUpdateCompaniesStatusFn = useServerFn(bulkUpdateCompaniesStatus);

  const [search, setSearch] = useState("");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("ALL");
  const [expandedCompanyIds, setExpandedCompanyIds] = useState<Set<string>>(
    new Set(["demo-comp-kja", "demo-comp-acs"]),
  );
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // Branch Modal State
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [targetCompanyForBranch, setTargetCompanyForBranch] = useState<CompanyItem | null>(null);
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchCity, setBranchCity] = useState("");

  const { data, isPending, isError } = useQuery({
    queryKey: ["companies-list"],
    queryFn: () => fetchCompanies(),
  });

  const companies: CompanyItem[] = (data?.companies as CompanyItem[]) || [];

  // Toggle company expansion
  function toggleExpand(id: string) {
    const next = new Set(expandedCompanyIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedCompanyIds(next);
  }

  // Expand all by default once companies load if not set
  const saveCompanyMutation = useMutation({
    mutationFn: async (payload: any) => {
      return saveCompanyFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(
        editingCompany
          ? "Data PKT / Perusahaan berhasil diperbarui."
          : "PKT / Perusahaan baru berhasil ditambahkan.",
      );
      queryClient.invalidateQueries({ queryKey: ["companies-list"] });
      closeCompanyModal();
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal menyimpan data perusahaan.");
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteCompanyFn({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Perusahaan / PKT berhasil dihapus.");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["companies-list"] });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal menghapus data perusahaan.");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return bulkDeleteCompaniesFn({ data: { ids } });
    },
    onSuccess: (_, variables) => {
      toast.success(`Berhasil menghapus ${variables.length} perusahaan / PKT.`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["companies-list"] });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal menghapus perusahaan terpilih.");
    },
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async (payload: { ids: string[]; status: "ACTIVE" | "INACTIVE" }) => {
      return bulkUpdateCompaniesStatusFn({ data: payload });
    },
    onSuccess: (_, variables) => {
      toast.success(`Berhasil memperbarui status ${variables.ids.length} perusahaan / PKT.`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["companies-list"] });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal memperbarui status perusahaan terpilih.");
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      return clearAllFn();
    },
    onSuccess: () => {
      toast.success(
        "Seluruh data perusahaan berhasil dikosongkan. Silakan upload ulang file Excel Anda.",
      );
      queryClient.invalidateQueries({ queryKey: ["companies-list"] });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal mengosongkan data perusahaan.");
    },
  });

  const saveBranchMutation = useMutation({
    mutationFn: async (payload: { companyId: string; branch: any }) => {
      return saveBranchFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("Data cabang PKT berhasil disimpan.");
      queryClient.invalidateQueries({ queryKey: ["companies-list"] });
      closeBranchModal();
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal menyimpan data cabang.");
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (payload: { companyId: string; branchId: string }) => {
      return deleteBranchFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("Cabang PKT berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["companies-list"] });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal menghapus cabang.");
    },
  });

  const seedDefaultMutation = useMutation({
    mutationFn: async () => {
      return seedDefaultFn();
    },
    onSuccess: () => {
      toast.success("Berhasil memuat data bawaan PT Kelola Jasa Artha & PT Abacus Cash Solution.");
      queryClient.invalidateQueries({ queryKey: ["companies-list"] });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal memuat data bawaan.");
    },
  });

  function openCreateCompanyModal() {
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

  function openEditCompanyModal(comp: CompanyItem) {
    setEditingCompany(comp);
    setCompanyName(comp.name);
    setCompanyCode(comp.company_code);
    setIndustry(comp.industry ?? "");
    setAddress(comp.address ?? "");
    setCity(comp.city ?? "");
    setProvince(comp.province ?? "");
    setContactName(comp.contact_name ?? "");
    setContactEmail(comp.contact_email ?? "");
    setContactPhone(comp.contact_phone ?? "");
    setCompanyStatus(comp.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
    setCompanyModalOpen(true);
  }

  function closeCompanyModal() {
    setCompanyModalOpen(false);
    setEditingCompany(null);
  }

  function handleCompanySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !companyCode.trim()) {
      toast.error("Nama dan Kode Perusahaan wajib diisi.");
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

  function openCreateBranchModal(comp: CompanyItem) {
    setTargetCompanyForBranch(comp);
    setEditingBranch(null);
    setBranchName(`${comp.company_code} - `);
    setBranchAddress("");
    setBranchCity("");
    setBranchModalOpen(true);
  }

  function openEditBranchModal(comp: CompanyItem, branch: BranchItem) {
    setTargetCompanyForBranch(comp);
    setEditingBranch(branch);
    setBranchName(branch.branch_name);
    setBranchAddress(branch.address);
    setBranchCity(branch.city ?? "");
    setBranchModalOpen(true);
  }

  function closeBranchModal() {
    setBranchModalOpen(false);
    setTargetCompanyForBranch(null);
    setEditingBranch(null);
  }

  function handleBranchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetCompanyForBranch) return;
    if (!branchName.trim() || !branchAddress.trim()) {
      toast.error("Nama Cabang PKT dan Alamat wajib diisi.");
      return;
    }
    saveBranchMutation.mutate({
      companyId: targetCompanyForBranch.id,
      branch: {
        id: editingBranch?.id,
        branch_name: branchName.trim(),
        address: branchAddress.trim(),
        city: branchCity.trim() || null,
      },
    });
  }

  // Filter companies and branches
  const q = search.toLowerCase().trim();
  const filteredCompanies = companies
    .filter((c) => selectedCompanyFilter === "ALL" || c.id === selectedCompanyFilter)
    .map((c) => {
      const matchComp =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.company_code.toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q);

      const matchingBranches = (c.branches || []).filter(
        (b) =>
          !q ||
          matchComp ||
          b.branch_name.toLowerCase().includes(q) ||
          b.address.toLowerCase().includes(q) ||
          (b.city || "").toLowerCase().includes(q),
      );

      return {
        ...c,
        matchingBranches,
        hasMatch: matchComp || matchingBranches.length > 0,
      };
    })
    .filter((c) => c.hasMatch);

  // Calculate totals
  const totalBranchesCount = companies.reduce((acc, c) => acc + (c.branches?.length || 0), 0);
  const totalInternsPlaced = companies.reduce((acc, c) => acc + (c.totalInterns || 0), 0);

  const allFilteredSelected =
    filteredCompanies.length > 0 && filteredCompanies.every((item) => selectedIds.has(item.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      filteredCompanies.forEach((item) => next.add(item.id));
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

  // Export Excel Handler
  async function handleExportExcel() {
    const XLSX = await import("xlsx");
    const exportRows: any[][] = [];

    companies.forEach((c) => {
      exportRows.push(["Nama Perusahaan / PKT", c.name]);
      exportRows.push(["Cabang PKT", "Alamat", "Kota/Kab", "Peserta Magang"]);
      (c.branches || []).forEach((b) => {
        exportRows.push([b.branch_name, b.address, b.city || "-", b.internCount || 0]);
      });
      exportRows.push([]); // blank row separator
    });

    const ws = XLSX.utils.aoa_to_sheet(exportRows);
    ws["!cols"] = [{ wch: 25 }, { wch: 75 }, { wch: 20 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data PKT");
    XLSX.writeFile(wb, `data_pkt_cabang_${Date.now()}.xlsx`);
    toast.success("Berhasil mengekspor data PKT dan cabang.");
  }

  return (
    <AppShell
      title="PKT"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {companies.length === 0 && (
            <button
              type="button"
              onClick={() => seedDefaultMutation.mutate()}
              disabled={seedDefaultMutation.isPending}
              className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 text-primary px-3 py-2 text-xs font-semibold hover:bg-primary/20 transition-colors shadow-2xs"
              title="Muat data bawaan PT Kelola Jasa Artha & PT Abacus Cash Solution"
            >
              <Sparkles className="h-4 w-4" />
              {seedDefaultMutation.isPending ? "Memuat..." : "Muat Data Bawaan (KJA & ACS)"}
            </button>
          )}

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
            Import Excel Cabang
          </button>

          <button
            type="button"
            onClick={openCreateCompanyModal}
            className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3.5 py-2 text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Tambah PKT
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* KPI Stats */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4 bg-card/60 backdrop-blur-xs border-border/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">
                Total Perusahaan / PKT
              </p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{companies.length}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Mitra industri terdaftar</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-4 bg-card/60 backdrop-blur-xs border-border/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Total Cabang PKT</p>
              <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {totalBranchesCount}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Titik lokasi penempatan</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <MapPinned className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-4 bg-card/60 backdrop-blur-xs border-border/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Peserta Terhubung</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {totalInternsPlaced}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Ditempatkan di Cabang PKT</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Users className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-4 bg-card/60 backdrop-blur-xs border-border/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Status Kemitraan</p>
              <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                {companies.filter((c) => c.status === "ACTIVE").length} Aktif
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Siap menerima peserta</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </Card>
        </div>

        {/* Filter Controls */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama perusahaan, cabang PKT (cth: KJA - JAKARTA, ACS - BANDUNG), alamat..."
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2 text-xs outline-none focus:border-ai transition-colors"
            />
          </div>

          <div>
            <select
              value={selectedCompanyFilter}
              onChange={(e) => setSelectedCompanyFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
            >
              <option value="ALL">Semua Perusahaan / PKT</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.branches?.length || 0} Cabang)
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
                Perusahaan / PKT Dipilih (Multiple Choice)
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
                        status: e.target.value as "ACTIVE" | "INACTIVE",
                      });
                      e.target.value = "";
                    }
                  }}
                  defaultValue=""
                  disabled={bulkUpdateStatusMutation.isPending}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold outline-none focus:border-ai cursor-pointer shadow-2xs"
                >
                  <option value="" disabled>
                    Pilih Status Baru...
                  </option>
                  <option value="ACTIVE">Set Aktif (ACTIVE)</option>
                  <option value="INACTIVE">Set Non-Aktif (INACTIVE)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Apakah Anda yakin ingin menghapus ${selectedIds.size} perusahaan/PKT terpilih beserta seluruh cabang dan relasinya? Tindakan ini tidak dapat dibatalkan.`,
                    )
                  ) {
                    bulkDeleteMutation.mutate(Array.from(selectedIds));
                  }
                }}
                disabled={bulkDeleteMutation.isPending}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500 text-white px-3.5 py-1.5 text-xs font-bold hover:bg-rose-600 transition-colors shadow-xs disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {bulkDeleteMutation.isPending ? "Menghapus..." : `Hapus ${selectedIds.size} PKT`}
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Select All Row */}
        {filteredCompanies.length > 0 && (
          <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none font-semibold hover:text-foreground">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer"
              />
              <span>
                {allFilteredSelected
                  ? "Batal Pilih Semua"
                  : "Pilih Semua Perusahaan / PKT (Bulk Up)"}{" "}
                ({filteredCompanies.length})
              </span>
            </label>
            {selectedIds.size > 0 && (
              <span className="font-semibold text-primary">{selectedIds.size} dipilih</span>
            )}
          </div>
        )}

        {/* Content Section */}
        {isPending ? <Loading count={3} /> : null}

        {isError ? (
          <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4">
            <p className="text-xs font-medium">Gagal memuat data PKT / perusahaan tempat magang.</p>
          </Card>
        ) : null}

        {!isPending && !isError ? (
          filteredCompanies.length > 0 ? (
            <div className="space-y-4">
              {filteredCompanies.map((comp) => {
                const isExpanded = expandedCompanyIds.has(comp.id) || search.length > 0;
                const branches = comp.matchingBranches || comp.branches || [];

                return (
                  <Card
                    key={comp.id}
                    className={`overflow-hidden p-0 transition-all border-border shadow-2xs ${
                      selectedIds.has(comp.id) ? "ring-2 ring-primary/40 bg-primary/[0.02]" : ""
                    }`}
                  >
                    {/* Company Header (Click to expand/collapse) */}
                    <div
                      onClick={() => toggleExpand(comp.id)}
                      className="flex flex-wrap items-center justify-between gap-3 p-4 bg-softgray/40 hover:bg-softgray/70 cursor-pointer transition-colors border-b border-border"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(comp.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelect(comp.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer shrink-0"
                        />
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                              {comp.name}
                            </h3>
                            <span className="rounded-md bg-primary/10 text-primary font-mono text-[10px] font-bold px-2 py-0.5">
                              {comp.company_code}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                comp.status === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                              }`}
                            >
                              {comp.status === "ACTIVE" ? "Aktif" : "Non-Aktif"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {comp.industry || "Industri Mitra"} • {branches.length} Cabang PKT •{" "}
                            {comp.totalInterns || 0} Peserta Terhubung
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openCreateBranchModal(comp)}
                          className="flex items-center gap-1 rounded-xl border border-primary/40 bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold hover:bg-primary/20 transition-colors shadow-2xs"
                          title="Tambah Cabang PKT untuk perusahaan ini"
                        >
                          <Plus className="h-3.5 w-3.5" /> Tambah Cabang PKT
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditCompanyModal(comp)}
                          className="flex items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-semibold hover:bg-softgray transition-colors shadow-2xs"
                          title="Edit Info Perusahaan"
                        >
                          <Edit2 className="h-3 w-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Hapus perusahaan "${comp.name}" beserta semua cabangnya?`,
                              )
                            ) {
                              deleteCompanyMutation.mutate(comp.id);
                            }
                          }}
                          disabled={deleteCompanyMutation.isPending}
                          className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2.5 py-1.5 text-xs font-semibold hover:bg-rose-500/20 transition-colors shadow-2xs disabled:opacity-50"
                          title="Hapus Perusahaan"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Branches Table */}
                    {isExpanded && (
                      <div className="p-0 animate-in fade-in duration-150">
                        {branches.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-muted/30 border-b border-border text-muted-foreground">
                                <tr>
                                  <th className="px-4 py-2.5 font-semibold w-12 text-center">No</th>
                                  <th className="px-4 py-2.5 font-semibold min-w-[200px]">
                                    Cabang PKT
                                  </th>
                                  <th className="px-4 py-2.5 font-semibold min-w-[400px]">
                                    Alamat Perusahaan
                                  </th>
                                  <th className="px-4 py-2.5 font-semibold whitespace-nowrap text-center">
                                    Peserta Magang
                                  </th>
                                  <th className="px-4 py-2.5 font-semibold text-right w-24">
                                    Aksi
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {branches.map((b, idx) => {
                                  const isMaps =
                                    b.address.includes("http") || b.address.includes("maps");
                                  const mapsUrl = isMaps
                                    ? b.address.match(/(https?:\/\/[^\s\)]+)/)?.[0]
                                    : null;
                                  const cleanText = mapsUrl
                                    ? b.address.replace(mapsUrl, "").trim()
                                    : b.address;

                                  return (
                                    <tr
                                      key={b.id || idx}
                                      className="hover:bg-softgray/30 transition-colors"
                                    >
                                      <td className="px-4 py-3 text-center text-muted-foreground font-mono">
                                        {idx + 1}
                                      </td>
                                      <td className="px-4 py-3 font-bold text-foreground">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-mono text-primary">
                                            {b.branch_name}
                                          </span>
                                          {b.city && (
                                            <span className="text-[10px] font-normal text-muted-foreground rounded bg-softgray px-1.5 py-0.2">
                                              {b.city}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-muted-foreground leading-relaxed">
                                        <span>{cleanText || b.address}</span>
                                        {mapsUrl && (
                                          <a
                                            href={mapsUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline ml-2"
                                          >
                                            <MapPin className="h-3 w-3" /> Buka Maps{" "}
                                            <ExternalLink className="h-2.5 w-2.5" />
                                          </a>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-center whitespace-nowrap">
                                        {b.internCount && b.internCount > 0 ? (
                                          <Link
                                            to="/app/admin/internships"
                                            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-bold hover:bg-emerald-500/20 transition-colors"
                                            title="Lihat peserta magang di cabang ini"
                                          >
                                            <Users className="h-3 w-3" /> {b.internCount} Peserta
                                          </Link>
                                        ) : (
                                          <span className="text-muted-foreground/60 text-[11px]">
                                            0 Peserta
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-1">
                                          <button
                                            type="button"
                                            onClick={() => openEditBranchModal(comp, b)}
                                            className="p-1.5 rounded-lg hover:bg-softgray text-muted-foreground hover:text-foreground transition-colors"
                                            title="Edit Cabang"
                                          >
                                            <Edit2 className="h-3 w-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (
                                                window.confirm(`Hapus cabang "${b.branch_name}"?`)
                                              ) {
                                                deleteBranchMutation.mutate({
                                                  companyId: comp.id,
                                                  branchId: b.id,
                                                });
                                              }
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
                                            title="Hapus Cabang"
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
                        ) : (
                          <div className="p-6 text-center text-xs text-muted-foreground">
                            Belum ada cabang PKT yang ditambahkan untuk perusahaan ini. Klik tombol{" "}
                            <strong>Tambah Cabang PKT</strong> di atas.
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Database Perusahaan Kosong"
              description="Database data perusahaan tempat magang saat ini kosong. Anda dapat mengimpor file Excel baru, menambah perusahaan secara manual, atau memuat data percontohan."
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setImportModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white px-4 py-2 text-xs font-bold shadow-xs hover:bg-emerald-700 transition-colors"
                  >
                    <FileSpreadsheet className="h-4 w-4" /> Import File Excel Cabang
                  </button>
                  <button
                    type="button"
                    onClick={openCreateCompanyModal}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold hover:bg-softgray transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Tambah Perusahaan Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => seedDefaultMutation.mutate()}
                    disabled={seedDefaultMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 text-primary px-3.5 py-2 text-xs font-semibold hover:bg-primary/20 transition-colors"
                  >
                    <Sparkles className="h-4 w-4" /> Muat Data Bawaan (KJA & ACS)
                  </button>
                </div>
              }
            />
          )
        ) : null}
      </div>

      {/* Company Modal (Create / Edit) */}
      {companyModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground">
                {editingCompany ? "Edit Perusahaan Mitra" : "Tambah Perusahaan Mitra Baru"}
              </h2>
              <button
                type="button"
                onClick={closeCompanyModal}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-softgray text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCompanySubmit} noValidate className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-foreground">Nama Perusahaan *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Contoh: PT Kelola Jasa Artha"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Kode Singkat *</label>
                  <input
                    type="text"
                    required
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    placeholder="Contoh: KJA"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Bidang / Sektor Industri
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Contoh: Jasa Pengelolaan Kas & Logistik Nilai Tinggi"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Alamat Kantor Pusat</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat kantor pusat..."
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Kota / Domisili</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Contoh: Jakarta Pusat"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Status</label>
                  <select
                    value={companyStatus}
                    onChange={(e) => setCompanyStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  >
                    <option value="ACTIVE">Aktif (Menerima Magang)</option>
                    <option value="INACTIVE">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
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
                  className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {saveCompanyMutation.isPending ? "Menyimpan..." : "Simpan Perusahaan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Branch Modal (Create / Edit Branch) */}
      {branchModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {editingBranch ? "Edit Cabang PKT" : "Tambah Cabang PKT Baru"}
                </h2>
                <p className="text-xs text-muted-foreground">{targetCompanyForBranch?.name}</p>
              </div>
              <button
                type="button"
                onClick={closeBranchModal}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-softgray text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleBranchSubmit} noValidate className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Nama Cabang PKT *</label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Contoh: KJA - JAKARTA / ACS - BANDUNG"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors font-mono font-semibold"
                />
                <p className="text-[10px] text-muted-foreground">
                  Format ini terhubung otomatis dengan kolom Target PKT pada Data Peserta Magang.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Alamat Lengkap Cabang *
                </label>
                <textarea
                  rows={3}
                  required
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="JL.Cideng Raya No.139, Kec, Kedawung, Kab, Cirebon..."
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Kota / Kabupaten</label>
                <input
                  type="text"
                  value={branchCity}
                  onChange={(e) => setBranchCity(e.target.value)}
                  placeholder="Contoh: Kota Bandung / Jakarta Pusat"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={closeBranchModal}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-softgray transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saveBranchMutation.isPending}
                  className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {saveBranchMutation.isPending ? "Menyimpan..." : "Simpan Cabang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Excel Branch Import Modal */}
      <CompanyBranchImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={async (items) => {
          return importBranchesFn({ data: { items } });
        }}
        isImporting={false}
      />
    </AppShell>
  );
}

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, StatusBadge, Loading, EmptyState } from "@/components/app/shell";
import { listCompanies } from "@/lib/api.functions";
import {
  Search,
  Building2,
  MapPin,
  CheckCircle2,
  Download,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Users,
  MapPinned,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/guru/companies")({
  head: () => ({
    meta: [
      { title: "PKT — Portal Guru" },
      {
        name: "description",
        content: "Daftar industri mitra, cabang PKT, dan alamat penempatan magang.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GuruCompaniesPage,
});

interface BranchItem {
  id: string;
  branch_name: string;
  address: string;
  city?: string | null;
  province?: string | null;
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
  status: string;
  branches?: BranchItem[];
  totalInterns?: number;
}

function GuruCompaniesPage() {
  const fetchCompanies = useServerFn(listCompanies);

  const [search, setSearch] = useState("");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("ALL");
  const [expandedCompanyIds, setExpandedCompanyIds] = useState<Set<string>>(
    new Set(["demo-comp-kja", "demo-comp-acs"]),
  );

  const { data, isPending, isError } = useQuery({
    queryKey: ["companies-list"],
    queryFn: () => fetchCompanies(),
  });

  const companies: CompanyItem[] = (data?.companies as CompanyItem[]) || [];

  function toggleExpand(id: string) {
    const next = new Set(expandedCompanyIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedCompanyIds(next);
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

  const totalBranchesCount = companies.reduce((acc, c) => acc + (c.branches?.length || 0), 0);
  const totalInternsPlaced = companies.reduce((acc, c) => acc + (c.totalInterns || 0), 0);

  // Export Excel Handler
  async function handleExportExcel() {
    const XLSX = await import("xlsx");
    const exportRows: any[][] = [];

    companies.forEach((c) => {
      exportRows.push(["Nama Perusahaan", c.name]);
      exportRows.push(["Cabang PKT", "Alamat", "Kota/Kab", "Peserta Magang"]);
      (c.branches || []).forEach((b) => {
        exportRows.push([b.branch_name, b.address, b.city || "-", b.internCount || 0]);
      });
      exportRows.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(exportRows);
    ws["!cols"] = [{ wch: 25 }, { wch: 75 }, { wch: 20 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Perusahaan Magang");
    XLSX.writeFile(wb, `data_perusahaan_cabang_pkt_${Date.now()}.xlsx`);
    toast.success("Berhasil mengekspor data perusahaan dan cabang PKT.");
  }

  return (
    <AppShell
      title="PKT"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-softgray transition-colors shadow-2xs text-foreground"
          >
            <Download className="h-4 w-4 text-primary" />
            Export Excel
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
                Total Perusahaan Mitra
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
              <option value="ALL">Semua Perusahaan</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.branches?.length || 0} Cabang)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Section */}
        {isPending ? <Loading count={3} /> : null}

        {isError ? (
          <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4">
            <p className="text-xs font-medium">Gagal memuat data perusahaan tempat magang.</p>
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
                    className="overflow-hidden p-0 transition-all border-border shadow-2xs"
                  >
                    {/* Company Header (Click to expand/collapse) */}
                    <div
                      onClick={() => toggleExpand(comp.id)}
                      className="flex flex-wrap items-center justify-between gap-3 p-4 bg-softgray/40 hover:bg-softgray/70 cursor-pointer transition-colors border-b border-border"
                    >
                      <div className="flex items-center gap-3">
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

                      <span className="text-xs font-semibold text-primary">
                        {isExpanded ? "Tutup Detail Cabang" : "Lihat Cabang & Alamat"}
                      </span>
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
                                            to="/app/guru/internships"
                                            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-bold hover:bg-emerald-500/20 transition-colors"
                                          >
                                            <Users className="h-3 w-3" /> {b.internCount} Peserta
                                          </Link>
                                        ) : (
                                          <span className="text-muted-foreground/60 text-[11px]">
                                            0 Peserta
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="p-6 text-center text-xs text-muted-foreground">
                            Belum ada cabang PKT yang terdaftar untuk perusahaan ini.
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
              title="Tidak ada data perusahaan tempat magang"
              description="Belum ada data perusahaan mitra yang cocok dengan kriteria pencarian."
            />
          )
        ) : null}
      </div>
    </AppShell>
  );
}

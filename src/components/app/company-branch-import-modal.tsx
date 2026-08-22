import { useState, useRef } from "react";
import { X, Upload, FileSpreadsheet, Check, AlertCircle, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";

export interface CompanyBranchImportPayloadItem {
  company_name: string;
  branch_name: string;
  address: string;
}

interface CompanyBranchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: CompanyBranchImportPayloadItem[]) => Promise<any>;
  isImporting: boolean;
}

export function CompanyBranchImportModal({
  isOpen,
  onClose,
  onImport,
  isImporting,
}: CompanyBranchImportModalProps) {
  const [parsedData, setParsedData] = useState<CompanyBranchImportPayloadItem[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setFileName(file.name);

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName || !workbook.Sheets[sheetName]) {
        setErrorMsg("File Excel tidak memiliki lembar kerja (worksheet).");
        return;
      }
      const worksheet = workbook.Sheets[sheetName]!;
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!rawRows || rawRows.length === 0) {
        setErrorMsg("File Excel kosong atau tidak terbaca.");
        return;
      }

      // Find header row or parse rows
      let currentCompany = "";
      const results: CompanyBranchImportPayloadItem[] = [];

      for (let r = 0; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;

        const col0 = String(row[0] || "").trim();
        const col1 = String(row[1] || "").trim();

        // Check if row is a "Nama Perusahaan" header
        if (col0.toLowerCase().includes("nama perusahaan")) {
          currentCompany =
            col1 ||
            String(row[0])
              .replace(/nama perusahaan[:\s]*/i, "")
              .trim();
          continue;
        }

        // Check if row is a table header: "Cabang PKT" / "Alamat"
        if (col0.toLowerCase().includes("cabang") || col0.toLowerCase().includes("pkt")) {
          continue;
        }

        // If row has 3 columns: [Nama Perusahaan, Cabang PKT, Alamat]
        if (
          row.length >= 3 &&
          String(row[0] || "")
            .toLowerCase()
            .startsWith("pt")
        ) {
          results.push({
            company_name: String(row[0]).trim(),
            branch_name: String(row[1]).trim(),
            address: String(row[2] || "-").trim(),
          });
          continue;
        }

        // If row has 2 columns: [Cabang PKT, Alamat] under currentCompany
        if (col0 && col1) {
          const guessedCompany =
            currentCompany ||
            (col0.startsWith("KJA")
              ? "PT Kelola Jasa Artha"
              : col0.startsWith("ACS")
                ? "PT Abacus Cash Solution"
                : "Perusahaan Mitra");

          results.push({
            company_name: guessedCompany,
            branch_name: col0,
            address: col1,
          });
        }
      }

      if (results.length === 0) {
        setErrorMsg(
          "Tidak ada data cabang PKT yang berhasil diparsing. Pastikan format Excel sesuai contoh.",
        );
        return;
      }

      setParsedData(results);
    } catch (err: any) {
      console.error("Parse Excel error:", err);
      setErrorMsg(`Gagal membaca file Excel: ${err?.message || "Format file tidak didukung."}`);
    }
  }

  async function handleDownloadTemplate() {
    const XLSX = await import("xlsx");
    const templateData = [
      ["Nama Perusahaan", "PT Kelola Jasa Artha"],
      ["Cabang PKT", "Alamat"],
      [
        "KJA - JAKARTA",
        "JL.Ir H Juanda No.28 Kebon Kelapa Gambir Jakarta Pusat 10120 ( Gd.Bank Indonesia )",
      ],
      ["KJA - BANDUNG", "Jl. Terusan Buah Batu No. 248 Bandung"],
      ["KJA - SURABAYA", "JL.Sidosermo II/80 Surabaya 60239"],
      [],
      ["Nama Perusahaan", "PT Abacus Cash Solution"],
      ["Cabang PKT", "Alamat"],
      ["ACS - BANDUNG", "JL. Terusan Jakarta No.57 Bandung, 40291, Jawa Barat"],
      ["ACS - SURABAYA", "JL. Anjasmoro No.14a, Sawahan, Surabaya, 60251"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws["!cols"] = [{ wch: 25 }, { wch: 75 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cabang PKT");
    XLSX.writeFile(wb, "template_cabang_perusahaan_pkt.xlsx");
  }

  async function handleExecuteImport() {
    if (parsedData.length === 0) return;
    try {
      await onImport(parsedData);
      toast.success(`Berhasil mengimpor ${parsedData.length} data cabang PKT.`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengimpor data cabang perusahaan.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-background p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">Import Cabang PKT Perusahaan</h2>
              <p className="text-xs text-muted-foreground">
                Upload file Excel data cabang dan alamat perusahaan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-softgray text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Template Download & File Picker */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-softgray/50 border border-border">
            <span className="text-xs text-muted-foreground">
              Belum memiliki format template Excel?
            </span>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Download className="h-3.5 w-3.5" /> Download Template
            </button>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-card/50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs font-bold text-foreground">Klik untuk memilih file Excel</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Format .xlsx, .xls (Kolom: Nama Perusahaan, Cabang PKT, Alamat)
            </p>
            {fileName && (
              <span className="inline-block mt-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs px-2.5 py-1">
                {fileName} ({parsedData.length} baris terdeteksi)
              </span>
            )}
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview Parsed Data */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground">
                Pratinjau Data ({parsedData.length} Cabang PKT):
              </span>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-softgray/70 sticky top-0 border-b border-border">
                    <tr className="text-muted-foreground whitespace-nowrap">
                      <th className="px-3 py-2">Perusahaan</th>
                      <th className="px-3 py-2">Cabang PKT</th>
                      <th className="px-3 py-2">Alamat Lengkap</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedData.slice(0, 10).map((row, i) => (
                      <tr key={i} className="hover:bg-softgray/20">
                        <td className="px-3 py-2 font-semibold text-foreground whitespace-nowrap">
                          {row.company_name}
                        </td>
                        <td className="px-3 py-2 font-mono text-primary whitespace-nowrap">
                          {row.branch_name}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground truncate max-w-[280px]">
                          {row.address}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 10 && (
                <p className="text-[11px] text-muted-foreground text-center">
                  ... dan {parsedData.length - 10} data cabang lainnya
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-softgray transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={parsedData.length === 0 || isImporting}
            className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-xs"
          >
            {isImporting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Mengimpor...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" /> Simpan & Impor Data
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

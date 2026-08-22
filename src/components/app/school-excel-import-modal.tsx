import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export interface ParsedSchoolRow {
  rowIndex: number;
  name: string;
  school_code: string;
  address: string | null;
  city: string | null;
  province: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  status: "ACTIVE" | "INACTIVE";
  partnershipType?: string | null;
  mentor?: string | null;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface SchoolExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
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
    }>,
    upsert: boolean,
  ) => Promise<void>;
  isImporting: boolean;
}

export function downloadSchoolExcelTemplate() {
  const headers = [
    "Nama Sekolah",
    "Kode Sekolah",
    "Alamat",
    "Kota / Kab",
    "Provinsi",
    "Pendamping",
    "Status Sekolah",
    "Kepesertaan Sekolah",
    "Kepala Sekolah",
    "Nomor Telpon",
  ];

  const sampleData = [
    [
      "BLK Don Bosco",
      "119",
      "Jl. Rangga Rame, Desa Weepangali, Kec. Kota Tambolaka, Kabupaten Sumba Barat Daya, Nusa Tenggara Tim. 87255",
      "Kabupaten Sumba Barat",
      "Nusa Tenggara Timur",
      "Aldi",
      "Aktif",
      "SMK Rujukan",
      "Br. Ephrem Santos, SPd",
      "08123599602",
    ],
    [
      "SMK Negeri 1 Tengaran",
      "2",
      "Jl. Durian Na'im, Karangduren, Kec. Tengaran, Kabupaten Semarang, Jawa Tengah 50775",
      "Kabupaten Semarang",
      "Jawa Tengah",
      "Aldi",
      "Aktif",
      "SMK Mandiri",
      "Drs. Santoso, M.M.",
      "081225364647",
    ],
    [
      "SMK Al-Mufti Subang",
      "60",
      "Jl. Raya K.H. Zaenal Mufti, Wanakarta, Kec. Purwadadi, Kabupaten Subang, Jawa Barat 41261",
      "Kabupaten Subang",
      "Jawa Barat",
      "Hani",
      "Aktif",
      "SMK Rujukan",
      "Rusmanudin, S.Si",
      "081394335281",
    ],
    [
      "SMK Antartika 2 Sidoarjo",
      "102",
      "Jl. Raya Siwalanpanji No.6, Bedrek, Siwalanpanji, Kec. Buduran, Kabupaten Sidoarjo, Jawa Timur 61252",
      "Kabupaten Sidoarjo",
      "Jawa Timur",
      "Hani",
      "Aktif",
      "SMK Mandiri",
      "Retno Purwolistyorini, S.E., M.M.Pd",
      "081235987255",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  // Set column widths
  ws["!cols"] = [
    { wch: 30 }, // Nama Sekolah
    { wch: 14 }, // Kode Sekolah
    { wch: 45 }, // Alamat
    { wch: 24 }, // Kota / Kab
    { wch: 22 }, // Provinsi
    { wch: 16 }, // Pendamping
    { wch: 16 }, // Status Sekolah
    { wch: 22 }, // Kepesertaan Sekolah
    { wch: 30 }, // Kepala Sekolah
    { wch: 20 }, // Nomor Telpon
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Sekolah");
  XLSX.writeFile(wb, "template_data_sekolah_vokasiflow.xlsx");
}

function normalizePhone(val: unknown): string | null {
  if (val === null || val === undefined || val === "") return null;
  let str = String(val).trim();
  // Remove spaces, dashes, parentheses, dots
  str = str.replace(/[\s\-().]/g, "");
  if (!str) return null;
  // If starts with +62
  if (str.startsWith("+62")) {
    str = "0" + str.slice(3);
  } else if (str.startsWith("62")) {
    str = "0" + str.slice(2);
  } else if (str.startsWith("8")) {
    str = "0" + str;
  }
  return str;
}

function normalizeStatus(val: unknown): "ACTIVE" | "INACTIVE" {
  if (!val) return "ACTIVE";
  const str = String(val).toLowerCase().trim();
  if (
    str.includes("non") ||
    str.includes("inact") ||
    str.includes("pasif") ||
    str.includes("tidak") ||
    str.includes("off")
  ) {
    return "INACTIVE";
  }
  return "ACTIVE";
}

function findColumnValue(row: Record<string, unknown>, aliases: string[]): unknown {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const matchedKey = keys.find(
      (k) =>
        k.toLowerCase().replace(/[^a-z0-9]/g, "") === alias.toLowerCase().replace(/[^a-z0-9]/g, ""),
    );
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
      return row[matchedKey];
    }
  }
  return undefined;
}

export function SchoolExcelImportModal({
  isOpen,
  onClose,
  onImport,
  isImporting,
}: SchoolExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedSchoolRow[]>([]);
  const [upsert, setUpsert] = useState(true);
  const [filterInvalidOnly, setFilterInvalidOnly] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function resetState() {
    setFile(null);
    setParsedRows([]);
    setFilterInvalidOnly(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function handleFileProcess(selectedFile: File) {
    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        toast.error("File Excel tidak memiliki lembar kerja (worksheet).");
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        raw: false,
        defval: "",
      });

      if (!rawRows || rawRows.length === 0) {
        toast.error("File Excel kosong atau tidak memiliki baris data.");
        return;
      }

      const codeMap = new Map<string, number>();
      const processed: ParsedSchoolRow[] = [];

      rawRows.forEach((row, idx) => {
        const rawName = findColumnValue(row, [
          "nama sekolah",
          "nama",
          "school_name",
          "sekolah",
          "nama_sekolah",
        ]);
        const rawCode = findColumnValue(row, [
          "kode sekolah",
          "kode",
          "school_code",
          "npsn",
          "kode_sekolah",
          "kd_sekolah",
        ]);
        const rawAddress = findColumnValue(row, [
          "alamat",
          "alamat lengkap",
          "address",
          "alamat_sekolah",
        ]);
        const rawCity = findColumnValue(row, [
          "kota / kab",
          "kota/kab",
          "kota / kabupaten",
          "kota/kabupaten",
          "kota",
          "kabupaten",
          "kab/kota",
          "city",
        ]);
        const rawProvince = findColumnValue(row, ["provinsi", "propinsi", "province"]);
        const rawContact = findColumnValue(row, [
          "kepala sekolah",
          "kepala_sekolah",
          "pic",
          "nama pic",
          "nama kontak",
          "pendamping",
          "contact_name",
          "kontak pic",
        ]);
        const rawPhone = findColumnValue(row, [
          "nomor telpon",
          "nomor telepon",
          "no telp",
          "no telepon",
          "no hp",
          "nomor hp",
          "telepon",
          "phone",
          "contact_phone",
          "telp",
        ]);
        const rawStatus = findColumnValue(row, ["status sekolah", "status", "status_sekolah"]);
        const rawPartnership = findColumnValue(row, [
          "kepesertaan sekolah",
          "kepesertaan",
          "kategori",
          "tipe kerjasama",
        ]);
        const rawMentor = findColumnValue(row, ["pendamping", "pembimbing", "mentor"]);

        const name = String(rawName || "").trim();
        const code = String(rawCode || "")
          .trim()
          .toUpperCase();
        const address = rawAddress ? String(rawAddress).trim() : null;
        const city = rawCity ? String(rawCity).trim() : null;
        const province = rawProvince ? String(rawProvince).trim() : null;
        const contact_name = rawContact ? String(rawContact).trim() : null;
        const contact_phone = normalizePhone(rawPhone);
        const status = normalizeStatus(rawStatus);

        const errors: string[] = [];
        const warnings: string[] = [];

        if (!name) {
          errors.push("Nama Sekolah kosong");
        }
        if (!code) {
          errors.push("Kode Sekolah kosong");
        }

        if (code) {
          const prevCount = codeMap.get(code) || 0;
          if (prevCount > 0) {
            warnings.push(`Kode '${code}' terduplikasi di baris spreadsheet`);
          }
          codeMap.set(code, prevCount + 1);
        }

        processed.push({
          rowIndex: idx + 2, // Excel row index starts from 2 (header = 1)
          name,
          school_code: code,
          address,
          city,
          province,
          contact_name,
          contact_phone,
          status,
          partnershipType: rawPartnership ? String(rawPartnership).trim() : null,
          mentor: rawMentor ? String(rawMentor).trim() : null,
          isValid: errors.length === 0,
          errors,
          warnings,
        });
      });

      setFile(selectedFile);
      setParsedRows(processed);

      const validCount = processed.filter((r) => r.isValid).length;
      toast.success(
        `Berhasil membaca ${processed.length} baris dari Excel (${validCount} baris valid).`,
      );
    } catch (err: unknown) {
      console.error("Failed to parse Excel:", err);
      toast.error("Gagal membaca file Excel. Pastikan format file valid.");
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  }

  const [isSubmitting, setIsSubmitting] = useState(false);

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);
  const displayedRows = filterInvalidOnly ? invalidRows : parsedRows;
  const isBusy = isImporting || isSubmitting;

  async function handleProceedImport() {
    if (validRows.length === 0) {
      toast.error("Tidak ada baris data valid yang dapat diimpor.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(`Sedang mengimpor ${validRows.length} data sekolah...`);

    try {
      const payload = validRows.map((r) => ({
        name: r.name,
        school_code: r.school_code,
        address: r.address,
        city: r.city,
        province: r.province,
        mentor: r.mentor || null,
        partnership_type: r.partnershipType || null,
        contact_name: r.contact_name,
        contact_phone: r.contact_phone,
        status: r.status,
      }));

      await onImport(payload, upsert);
      toast.success(`Berhasil mengimpor ${validRows.length} data sekolah!`, { id: toastId });
      handleClose();
    } catch (err: unknown) {
      console.error("Import failed:", err);
      const errMsg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err && "message" in err
            ? String((err as any).message)
            : "Gagal mengimpor data sekolah ke database.";
      toast.error(errMsg, { id: toastId, duration: 6000 });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl rounded-3xl border border-border bg-background shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-softgray/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Import Data Sekolah dari Excel
              </h2>
              <p className="text-xs text-muted-foreground">
                Unggah spreadsheet .xlsx / .xls untuk menambahkan data sekolah secara massal.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-softgray text-muted-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Action Bar: Download template and select file */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-softgray/40 border border-border/80">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadSchoolExcelTemplate}
                className="inline-flex items-center gap-2 rounded-xl bg-background border border-border px-3.5 py-2 text-xs font-semibold hover:bg-softgray hover:text-foreground transition-all shadow-xs"
              >
                <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Unduh Template Excel (.xlsx)
              </button>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Gunakan format template ini untuk hasil import terbaik.
              </span>
            </div>

            {file && (
              <button
                type="button"
                onClick={resetState}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                <RefreshCw className="h-3 w-3" /> Ganti File
              </button>
            )}
          </div>

          {/* Upload Dropzone if no file loaded */}
          {!file && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-softgray/20 hover:bg-softgray/50 p-8 text-center transition-all duration-200"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-105 transition-transform mb-3">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-foreground">
                Tarik & letakkan file Excel di sini, atau klik untuk memilih file
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Mendukung format <strong>.xlsx</strong>, <strong>.xls</strong>, dan{" "}
                <strong>.csv</strong> (Maksimal 500 baris)
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/50">
                  Nama Sekolah
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/50">
                  Kode Sekolah
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/50">
                  Kota / Kab
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/50">
                  Kepala Sekolah / PIC
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/50">
                  Nomor Telpon
                </span>
              </div>
            </div>
          )}

          {/* Preview Section if file loaded */}
          {file && (
            <div className="space-y-4">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[11px] text-muted-foreground font-medium block">
                    Total Baris Terbaca
                  </span>
                  <span className="text-xl font-bold text-foreground mt-0.5 block">
                    {parsedRows.length}{" "}
                    <span className="text-xs font-normal text-muted-foreground">sekolah</span>
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400">
                  <span className="text-[11px] font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Baris Siap Diimpor
                  </span>
                  <span className="text-xl font-bold mt-0.5 block">
                    {validRows.length} <span className="text-xs font-normal opacity-80">valid</span>
                  </span>
                </div>
                <div
                  className={`p-3.5 rounded-xl border ${
                    invalidRows.length > 0
                      ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  <span className="text-[11px] font-medium flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" /> Baris Perlu Dicek
                  </span>
                  <span className="text-xl font-bold mt-0.5 block">
                    {invalidRows.length}{" "}
                    <span className="text-xs font-normal opacity-80">tidak valid</span>
                  </span>
                </div>
              </div>

              {/* Options & Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={upsert}
                    onChange={(e) => setUpsert(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                  />
                  <span>
                    Perbarui data jika <strong>Kode Sekolah</strong> sudah ada di database (Upsert)
                  </span>
                </label>

                {invalidRows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterInvalidOnly(!filterInvalidOnly)}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                  >
                    {filterInvalidOnly
                      ? "Tampilkan Semua Baris"
                      : `Hanya Lihat Baris Bermasalah (${invalidRows.length})`}
                  </button>
                )}
              </div>

              {/* Data Table Preview */}
              <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-xs">
                <div className="max-h-72 overflow-x-auto overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-softgray/70 sticky top-0 z-10 border-b border-border">
                      <tr className="text-muted-foreground">
                        <th className="px-3 py-2.5 font-semibold w-12 text-center">No</th>
                        <th className="px-3 py-2.5 font-semibold">Nama Sekolah</th>
                        <th className="px-3 py-2.5 font-semibold">Kode</th>
                        <th className="px-3 py-2.5 font-semibold">Lokasi</th>
                        <th className="px-3 py-2.5 font-semibold">Kepala Sekolah / PIC</th>
                        <th className="px-3 py-2.5 font-semibold">No. Telpon</th>
                        <th className="px-3 py-2.5 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {displayedRows.map((row) => (
                        <tr
                          key={row.rowIndex}
                          className={`transition-colors ${
                            !row.isValid
                              ? "bg-destructive/5 text-destructive-foreground hover:bg-destructive/10"
                              : "hover:bg-softgray/30"
                          }`}
                        >
                          <td className="px-3 py-2.5 text-center text-muted-foreground font-mono text-[11px]">
                            {row.rowIndex}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-semibold text-foreground block">
                              {row.name || (
                                <span className="text-destructive font-normal italic">
                                  Wajib diisi
                                </span>
                              )}
                            </span>
                            {row.address && (
                              <span className="text-[11px] text-muted-foreground block line-clamp-1">
                                {row.address}
                              </span>
                            )}
                            {row.errors.length > 0 && (
                              <span className="text-[10px] text-destructive font-medium block mt-0.5">
                                ⚠ {row.errors.join(", ")}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-mono">
                            {row.school_code ? (
                              <span className="rounded bg-softgray px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
                                {row.school_code}
                              </span>
                            ) : (
                              <span className="text-destructive text-[11px] italic">Kosong</span>
                            )}
                            {row.warnings.length > 0 && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5">
                                ⚠ Duplikat file
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {row.city
                              ? `${row.city}${row.province ? `, ${row.province}` : ""}`
                              : "-"}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-medium text-foreground">
                              {row.contact_name || "-"}
                            </span>
                            {row.partnershipType && (
                              <span className="text-[10px] text-muted-foreground block">
                                {row.partnershipType}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                            {row.contact_phone || "-"}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                row.status === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-zinc-500/10 text-zinc-500"
                              }`}
                            >
                              {row.status === "ACTIVE" ? "Aktif" : "Non-Aktif"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-softgray/20">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-softgray transition-colors"
          >
            Batal
          </button>

          {file && (
            <button
              type="button"
              onClick={handleProceedImport}
              disabled={isBusy || validRows.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-xs"
            >
              {isBusy ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Mengimpor Data...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  Impor {validRows.length} Data Sekolah
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

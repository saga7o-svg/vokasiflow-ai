import { useState, useRef, ChangeEvent } from "react";
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Eye,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { downloadInternshipExcelTemplate } from "@/lib/internship-excel.utils";

export interface InternshipImportItem {
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
}

export interface InternshipImportRowPreview extends InternshipImportItem {
  id: string;
  rowIndex: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  bulkImportMutation: {
    mutateAsync: (data: { items: InternshipImportItem[]; upsert: boolean }) => Promise<any>;
    isPending: boolean;
  };
}

export function InternshipExcelImportModal({
  open,
  onClose,
  onImportComplete,
  bulkImportMutation,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<InternshipImportRowPreview[]>([]);
  const [upsert, setUpsert] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterValid, setFilterValid] = useState<"ALL" | "VALID" | "ERROR">("ALL");

  if (!open) return null;

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      parseFile(selected);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (
        droppedFile.name.endsWith(".xlsx") ||
        droppedFile.name.endsWith(".xls") ||
        droppedFile.name.endsWith(".csv")
      ) {
        setFile(droppedFile);
        parseFile(droppedFile);
      } else {
        toast.error("Format file harus berupa .xlsx, .xls, atau .csv");
      }
    }
  }

  function cleanHeaderKey(key: string): string {
    return key
      .toLowerCase()
      .replace(/[\uFEFF\u200B-\u200D\u00A0]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  function findColumnValue(
    row: Record<string, any>,
    possibleKeys: string[],
    positionIdx?: number,
  ): any {
    const rowKeys = Object.keys(row);

    for (const key of rowKeys) {
      const cleaned = cleanHeaderKey(key);
      for (const candidate of possibleKeys) {
        const cleanedCandidate = cleanHeaderKey(candidate);
        if (cleaned === cleanedCandidate || cleaned.includes(cleanedCandidate)) {
          if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
            return row[key];
          }
        }
      }
    }

    if (positionIdx !== undefined && positionIdx < rowKeys.length) {
      const val = row[rowKeys[positionIdx]];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        return val;
      }
    }

    return null;
  }

  function normalizePhone(raw: any): string | null {
    if (!raw) return null;
    let s = String(raw).replace(/[^0-9]/g, "");
    if (s.startsWith("62")) s = "0" + s.slice(2);
    if (!s.startsWith("0") && s.length >= 9) s = "0" + s;
    return s || null;
  }

  async function parseFile(fileToParse: File) {
    setIsParsing(true);
    setParsedRows([]);

    try {
      const XLSX = await import("xlsx");
      const buffer = await fileToParse.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (jsonData.length === 0) {
        toast.error("File Excel kosong atau tidak memiliki data yang valid.");
        setIsParsing(false);
        return;
      }

      const previews: InternshipImportRowPreview[] = jsonData.map((row, idx) => {
        let rawBatch = findColumnValue(row, ["batch no", "batch", "batch_no", "no batch"], 0);
        let rawTraining = findColumnValue(
          row,
          ["training center", "sekolah", "asal sekolah", "training_center"],
          1,
        );
        let rawName = findColumnValue(
          row,
          ["nama peserta", "nama", "nama siswa", "peserta", "student_name"],
          2,
        );
        let rawMentor = findColumnValue(row, ["pendamping", "mentor", "guru pendamping"], 3);
        let rawCity = findColumnValue(
          row,
          ["kabupaten", "kabupaten/kota domisili", "domisili", "kota"],
          4,
        );
        let rawDriving = findColumnValue(
          row,
          ["kemampuan mengemudi", "kemampuan", "mengemudi", "r4", "sim"],
          5,
        );
        let rawStatusSiswa = findColumnValue(
          row,
          ["status siswa", "status pendidikan", "kelas", "status_siswa"],
          6,
        );
        let rawTargetPkt = findColumnValue(
          row,
          ["target pkt", "pkt", "penempatan", "perusahaan", "target_pkt"],
          7,
        );
        let rawJobdesk = findColumnValue(row, ["jobdesk", "posisi", "role", "divisi"], 8);
        let rawPlacement = findColumnValue(
          row,
          ["bulan penempatan", "penempatan", "tgl penempatan", "bulan"],
          9,
        );
        let rawEmail = findColumnValue(row, ["email", "email address"], 10);
        let rawPhone = findColumnValue(
          row,
          ["nomor wa", "no wa", "telepon", "phone", "whatsapp"],
          11,
        );
        let rawStatusMagang = findColumnValue(
          row,
          ["status magang", "status", "status_magang"],
          12,
        );

        // Smart shift correction: if row has code in Col 1 and School in Col 2
        if (
          rawTraining &&
          /^\d+$/.test(String(rawTraining).trim()) &&
          rawName &&
          (String(rawName).toLowerCase().includes("smk") ||
            String(rawName).toLowerCase().includes("sma"))
        ) {
          rawTraining = rawName;
          rawName = rawMentor;
          rawMentor = rawCity;
          rawCity = rawDriving;
          rawDriving = rawStatusSiswa;
          rawStatusSiswa = rawTargetPkt;
          rawTargetPkt = rawJobdesk;
          rawJobdesk = rawPlacement;
          rawPlacement = rawEmail;
          rawEmail = rawPhone;
          rawPhone = rawStatusMagang;
        }

        const batch_no = rawBatch ? String(rawBatch).trim() : "Intra 3";
        const training_center = rawTraining ? String(rawTraining).trim() : "";
        const student_name = rawName ? String(rawName).trim() : "";
        const mentor = rawMentor ? String(rawMentor).trim() : null;
        const city = rawCity ? String(rawCity).trim() : null;
        const driving_skill = rawDriving ? String(rawDriving).trim() : "Siswa Aktif";
        const student_status = rawStatusSiswa ? String(rawStatusSiswa).trim() : "Kelas XII";
        const target_pkt = rawTargetPkt ? String(rawTargetPkt).trim() : "SSI - Pusat";
        const jobdesk = rawJobdesk ? String(rawJobdesk).trim() : "CPC";
        const placement_month = rawPlacement ? String(rawPlacement).trim() : "02 Januari 2025";
        const email = rawEmail
          ? String(rawEmail)
              .replace(/ı/g, "i")
              .replace(/İ/g, "I")
              .replace(/[\u200B-\u200D\uFEFF]/g, "")
              .trim()
          : null;
        const phone = normalizePhone(rawPhone);

        let internship_status = "Peserta Baru";
        if (rawStatusMagang) {
          const stLower = String(rawStatusMagang).toLowerCase().trim();
          if (stLower.includes("pengganti")) internship_status = "Peserta Pengganti";
          else if (stLower.includes("selesai")) internship_status = "Selesai";
          else if (stLower.includes("mundur") || stLower.includes("keluar"))
            internship_status = "Mundur";
          else if (stLower.includes("aktif")) internship_status = "Aktif Magang";
          else internship_status = String(rawStatusMagang).trim();
        }

        const errors: string[] = [];
        const warnings: string[] = [];

        if (!student_name) {
          errors.push("Nama Peserta wajib diisi");
        }
        if (!training_center) {
          errors.push("Training Center / Asal Sekolah wajib diisi");
        }
        if (!target_pkt) {
          warnings.push("Target PKT kosong (default: SSI - Pusat)");
        }
        if (!email && !phone) {
          warnings.push("Kontak email & WA kosong");
        }

        return {
          id: `row-${idx + 1}`,
          rowIndex: idx + 2,
          batch_no,
          training_center,
          student_name,
          mentor,
          city,
          driving_skill,
          student_status,
          target_pkt,
          jobdesk,
          placement_month,
          email,
          phone,
          internship_status,
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      });

      setParsedRows(previews);
      const validCount = previews.filter((r) => r.isValid).length;
      toast.success(
        `Berhasil membaca ${previews.length} baris data (${validCount} valid). Silakan tinjau sebelum mengimpor.`,
      );
    } catch (err: any) {
      console.error(err);
      toast.error(`Gagal memproses file Excel: ${err?.message || "Format tidak dikenali"}`);
    } finally {
      setIsParsing(false);
    }
  }

  async function handleExecuteImport() {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error("Tidak ada baris data valid yang dapat diimpor.");
      return;
    }

    const payload: InternshipImportItem[] = validRows.map((r) => ({
      batch_no: r.batch_no,
      training_center: r.training_center,
      student_name: r.student_name,
      mentor: r.mentor,
      city: r.city,
      driving_skill: r.driving_skill,
      student_status: r.student_status,
      target_pkt: r.target_pkt,
      jobdesk: r.jobdesk,
      placement_month: r.placement_month,
      email: r.email,
      phone: r.phone,
      internship_status: r.internship_status,
    }));

    const toastId = toast.loading(`Mengimpor ${payload.length} data peserta magang...`);
    try {
      await bulkImportMutation.mutateAsync({
        items: payload,
        upsert,
      });
      toast.dismiss(toastId);
      toast.success(`Berhasil mengimpor ${payload.length} peserta magang ke database.`);
      onImportComplete();
      handleReset();
      onClose();
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err?.message || "Gagal mengimpor data peserta magang ke database.");
    }
  }

  function handleReset() {
    setFile(null);
    setParsedRows([]);
    setSearchTerm("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const filteredPreview = parsedRows.filter((row) => {
    if (filterValid === "VALID" && !row.isValid) return false;
    if (filterValid === "ERROR" && row.isValid) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      row.student_name.toLowerCase().includes(term) ||
      row.training_center.toLowerCase().includes(term) ||
      row.batch_no.toLowerCase().includes(term) ||
      row.target_pkt.toLowerCase().includes(term) ||
      (row.city || "").toLowerCase().includes(term) ||
      (row.mentor || "").toLowerCase().includes(term)
    );
  });

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const errorCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-5xl h-[90vh] rounded-3xl border border-border bg-background shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card/50">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Import Data Peserta Magang (Excel / CSV)
              </h2>
              <p className="text-xs text-muted-foreground">
                Unggah file Excel 13 kolom untuk menambah data penempatan peserta magang secara
                massal.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl hover:bg-softgray text-muted-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {parsedRows.length === 0 ? (
            <div className="space-y-6 max-w-2xl mx-auto py-8">
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border hover:border-primary/50 bg-softgray/30 hover:bg-softgray/50 p-10 text-center cursor-pointer transition-all duration-200"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="grid h-16 w-16 place-items-center rounded-3xl bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform">
                  {isParsing ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <Upload className="h-8 w-8" />
                  )}
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">
                  Pilih file Excel atau geser ke sini
                </h3>
                <p className="text-xs text-muted-foreground max-w-md">
                  Mendukung format spreadsheet <strong>.xlsx</strong>, <strong>.xls</strong>, atau{" "}
                  <strong>.csv</strong> sesuai format 13 kolom standar peserta magang.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold shadow-xs">
                  <Upload className="h-3.5 w-3.5" /> Pilih File Excel
                </div>
              </div>

              {/* Template Box */}
              <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      Belum memiliki template Excel Peserta Magang?
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Unduh template resmi dengan 13 kolom standar untuk memudahkan pengisian data.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => downloadInternshipExcelTemplate()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-softgray transition-colors shadow-2xs text-foreground"
                >
                  <Download className="h-3.5 w-3.5 text-primary" /> Unduh Template (.xlsx)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-4">
                  <div className="text-xs">
                    <span className="text-muted-foreground">File: </span>
                    <strong className="text-foreground font-mono">{file?.name}</strong>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {validCount} Valid
                    </span>
                    {errorCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-semibold ml-2">
                        <XCircle className="h-3.5 w-3.5" /> {errorCount} Error
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-softgray transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Ganti File
                  </button>
                </div>
              </div>

              {/* Filter and Search */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Cari peserta, sekolah, batch, PKT..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-1.5 text-xs outline-none focus:border-ai"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Filter status:</span>
                  <div className="inline-flex rounded-xl border border-border bg-muted/30 p-0.5">
                    <button
                      type="button"
                      onClick={() => setFilterValid("ALL")}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        filterValid === "ALL"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Semua ({parsedRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterValid("VALID")}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        filterValid === "VALID"
                          ? "bg-background text-emerald-600 shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Valid ({validCount})
                    </button>
                    {errorCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilterValid("ERROR")}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                          filterValid === "ERROR"
                            ? "bg-background text-rose-600 shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Error ({errorCount})
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview Table with 13 columns */}
              <div className="rounded-2xl border border-border overflow-hidden bg-card">
                <div className="overflow-x-auto max-h-[44vh]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-softgray/80 sticky top-0 z-10 border-b border-border">
                      <tr className="text-muted-foreground whitespace-nowrap">
                        <th className="px-3 py-2.5 font-semibold">Baris</th>
                        <th className="px-3 py-2.5 font-semibold">Status</th>
                        <th className="px-3 py-2.5 font-semibold">Batch No</th>
                        <th className="px-3 py-2.5 font-semibold">Training Center</th>
                        <th className="px-3 py-2.5 font-semibold">Nama Peserta</th>
                        <th className="px-3 py-2.5 font-semibold">Pendamping</th>
                        <th className="px-3 py-2.5 font-semibold">Kabupaten/Domisili</th>
                        <th className="px-3 py-2.5 font-semibold">Kemampuan</th>
                        <th className="px-3 py-2.5 font-semibold">Status Siswa</th>
                        <th className="px-3 py-2.5 font-semibold">Target PKT</th>
                        <th className="px-3 py-2.5 font-semibold">Jobdesk</th>
                        <th className="px-3 py-2.5 font-semibold">Bulan Penempatan</th>
                        <th className="px-3 py-2.5 font-semibold">Email</th>
                        <th className="px-3 py-2.5 font-semibold">Nomor WA</th>
                        <th className="px-3 py-2.5 font-semibold">Status Magang</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredPreview.map((row) => (
                        <tr
                          key={row.id}
                          className={`hover:bg-softgray/30 transition-colors ${
                            !row.isValid ? "bg-rose-500/5" : ""
                          }`}
                        >
                          <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                            #{row.rowIndex}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                                <CheckCircle2 className="h-3 w-3" /> Valid
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600"
                                title={row.errors.join(", ")}
                              >
                                <XCircle className="h-3 w-3" /> Error
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap font-medium">
                            {row.batch_no}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{row.training_center}</td>
                          <td className="px-3 py-2 whitespace-nowrap font-semibold text-foreground">
                            {row.student_name}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                            {row.mentor || "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                            {row.city || "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                            {row.driving_skill || "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                            {row.student_status || "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap font-medium text-foreground">
                            {row.target_pkt}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap font-semibold text-primary">
                            {row.jobdesk || "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                            {row.placement_month || "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                            {row.email || "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                            {row.phone || "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                              {row.internship_status}
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

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-card/50">
          <label className="flex items-center gap-2 text-xs cursor-pointer text-muted-foreground select-none">
            <input
              type="checkbox"
              checked={upsert}
              onChange={(e) => setUpsert(e.target.checked)}
              className="rounded border-border text-primary focus:ring-ai"
            />
            Perbarui data jika peserta dan perusahaan sudah terdaftar sebelumnya
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-softgray transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={validCount === 0 || bulkImportMutation.isPending}
              onClick={handleExecuteImport}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-5 py-2 text-xs font-bold shadow-xs hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {bulkImportMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mengimpor...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" /> Impor {validCount} Peserta Magang
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef } from "react";
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
import { downloadStudentExcelTemplate } from "@/lib/student-excel.utils";

export interface ParsedStudentRow {
  rowIndex: number;
  batch_id: string | null;
  school_name: string;
  school_code: string | null;
  name: string;
  mentor: string | null;
  city: string | null;
  competency: string;
  program_status: string | null;
  talent_pool_year: string | null;
  student_number: string;
  email: string | null;
  phone: string | null;
  driving_r4: string | null;
  sim_a: string | null;
  sim_c: string | null;
  birth_date: string | null;
  gender: "L" | "P" | null;
  theory_score: string | null;
  interview_score: string | null;
  graduation_status: string | null;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface StudentImportPayloadItem {
  batch_id?: string | null;
  school_name?: string | null;
  school_code?: string | null;
  name: string;
  mentor?: string | null;
  city?: string | null;
  competency?: string | null;
  program_status?: string | null;
  talent_pool_year?: string | null;
  student_number: string;
  email?: string | null;
  phone?: string | null;
  driving_r4?: string | null;
  sim_a?: string | null;
  sim_c?: string | null;
  birth_date?: string | null;
  gender?: "L" | "P" | null;
  theory_score?: string | null;
  interview_score?: string | null;
  graduation_status?: string | null;
  status?: "ACTIVE" | "INACTIVE";
}

interface StudentExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    students: StudentImportPayloadItem[],
    upsert: boolean,
    clearExisting?: boolean,
  ) => Promise<unknown>;
  isImporting: boolean;
}

function normalizePhone(val: unknown): string | null {
  if (val === null || val === undefined || val === "") return null;
  let str = String(val).trim();
  str = str.replace(/[\s\-().]/g, "");
  if (!str) return null;
  if (str.startsWith("+62")) {
    str = "0" + str.slice(3);
  } else if (str.startsWith("62")) {
    str = "0" + str.slice(2);
  } else if (str.startsWith("8")) {
    str = "0" + str;
  }
  return str;
}

function normalizeGender(val: unknown): "L" | "P" | null {
  if (!val) return "L";
  const str = String(val).trim().toUpperCase();
  if (str.startsWith("P") || str.includes("PEREMPUAN") || str.includes("WANITA")) return "P";
  if (str.startsWith("L") || str.includes("LAKI") || str.includes("PRIA")) return "L";
  return "L";
}

function findColumnValue(
  row: Record<string, unknown>,
  aliases: string[],
  fallbackIndex?: number,
): unknown {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const normAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
    const matchedKey = keys.find((k) => {
      const normKey = k
        .replace(/^\uFEFF/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      return normKey === normAlias || normKey.includes(normAlias) || normAlias.includes(normKey);
    });
    if (
      matchedKey &&
      row[matchedKey] !== undefined &&
      row[matchedKey] !== null &&
      String(row[matchedKey]).trim() !== ""
    ) {
      return row[matchedKey];
    }
  }
  if (fallbackIndex !== undefined && keys[fallbackIndex] !== undefined) {
    const val = row[keys[fallbackIndex]];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return val;
    }
  }
  return undefined;
}

export function StudentExcelImportModal({
  isOpen,
  onClose,
  onImport,
  isImporting,
}: StudentExcelImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [upsert, setUpsert] = useState(true);
  const [filterInvalidOnly, setFilterInvalidOnly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function resetState() {
    setFile(null);
    setParsedRows([]);
    setFilterInvalidOnly(false);
    setIsSubmitting(false);
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
      const XLSX = await import("xlsx");
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        toast.error("File Excel tidak memiliki lembar kerja (worksheet).");
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) {
        toast.error("Lembar kerja Excel kosong atau tidak terbaca.");
        return;
      }
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        raw: false,
        defval: "",
      });

      if (!rawRows || rawRows.length === 0) {
        toast.error("File Excel kosong atau tidak memiliki baris data.");
        return;
      }

      const studentNumberMap = new Map<string, number>();
      const processed: ParsedStudentRow[] = [];

      rawRows.forEach((row, idx) => {
        const rawBatch = findColumnValue(
          row,
          ["batch id", "batch_id", "batch", "id batch", "gelombang", "angkatan"],
          0,
        );
        const rawSchool = findColumnValue(
          row,
          ["asal sekolah", "sekolah", "nama sekolah", "school"],
          1,
        );
        const rawName = findColumnValue(
          row,
          ["nama peserta", "nama siswa", "nama", "peserta", "student name"],
          2,
        );
        const rawMentor = findColumnValue(row, ["pendamping", "mentor", "pembimbing"], 3);
        const rawCity = findColumnValue(
          row,
          ["kabupaten/kota domisili", "kota / kab", "kabupaten", "kota", "domisili"],
          4,
        );
        const rawCompetency = findColumnValue(
          row,
          ["status pendidikan", "pendidikan", "kompetensi", "jurusan", "kelas"],
          5,
        );
        const rawProgram = findColumnValue(row, ["status program", "program", "status_program"], 6);
        const rawYear = findColumnValue(row, ["tahun talent pool", "tahun talentpool", "tahun"], 7);
        const rawStudentNumber = findColumnValue(
          row,
          ["kode bmi", "bmi", "nis", "nisn", "no induk", "kode siswa", "nomor induk"],
          8,
        );
        const rawEmail = findColumnValue(row, ["email address", "email", "surel"], 9);
        const rawPhone = findColumnValue(
          row,
          ["nomor telepon/wa terapan", "no telp", "telepon", "no wa", "whatsapp", "no hp", "phone"],
          10,
        );
        const rawDriving = findColumnValue(
          row,
          ["kemampuan mengemudi r4", "mengemudi r4", "mengemudi"],
          11,
        );
        const rawSimA = findColumnValue(row, ["apakah memiliki sim a", "sim a", "punya sim a"], 12);
        const rawSimC = findColumnValue(row, ["apakah memiliki sim c", "sim c", "punya sim c"], 13);
        const rawBirthDate = findColumnValue(
          row,
          ["tgl lahir", "tanggal lahir", "tgl_lahir", "birth_date", "birth date"],
          14,
        );
        const rawGender = findColumnValue(row, ["jenis kelamin", "jk", "gender", "l/p"], 15);
        const rawTheory = findColumnValue(row, ["nilai teori", "teori", "nilai_teori"], 16);
        const rawInterview = findColumnValue(
          row,
          ["nilai interview", "interview", "wawancara"],
          17,
        );
        const rawGraduation = findColumnValue(row, ["kelulusan", "status kelulusan", "lulus"], 18);

        const name = String(rawName || "").trim();
        const school_name = String(rawSchool || "").trim();
        const school_code = rawStudentNumber ? String(rawStudentNumber).trim() : null;
        const birth_date = rawBirthDate ? String(rawBirthDate).trim() : null;

        // Unique ID siswa menggunakan kombinasi Nama dan Tanggal Lahir
        const cleanNameSlug = name
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 25);
        const cleanDateSlug = birth_date ? birth_date.replace(/[^0-9]/g, "") : "";
        const student_number = cleanNameSlug
          ? cleanDateSlug
            ? `${cleanNameSlug}-${cleanDateSlug}`
            : `${cleanNameSlug}-${String(idx + 1).padStart(3, "0")}`
          : `SISWA-${String(idx + 1).padStart(4, "0")}`;

        const batch_id = rawBatch ? String(rawBatch).trim() : "Batch 01";
        const mentor = rawMentor ? String(rawMentor).trim() : null;
        const city = rawCity ? String(rawCity).trim() : null;

        let competency = "Kelas XII";
        if (rawCompetency) {
          const compStr = String(rawCompetency).toLowerCase().trim();
          if (compStr.includes("xi") && !compStr.includes("xii")) {
            competency = "Kelas XI";
          } else if (compStr.includes("alumni") || compStr.includes("lulus")) {
            competency = "Alumni";
          } else {
            competency = "Kelas XII";
          }
        }

        let program_status = "Talent Pool";
        if (rawProgram) {
          const progStr = String(rawProgram).toLowerCase().trim();
          if (progStr.includes("akademi")) {
            program_status = "Aktif Akademi";
          } else if (progStr.includes("talent")) {
            program_status = "Talent Pool";
          } else if (progStr.includes("vokasi")) {
            program_status = "Vokasi";
          } else if (
            progStr.includes("mundur") ||
            progStr.includes("keluar") ||
            progStr.includes("inactive")
          ) {
            program_status = "Mundur";
          } else {
            program_status = String(rawProgram).trim();
          }
        }

        const talent_pool_year = rawYear ? String(rawYear).trim() : "2024";
        const email = rawEmail ? String(rawEmail).trim() : null;
        const phone = normalizePhone(rawPhone);
        const driving_r4 = rawDriving ? String(rawDriving).trim() : "Tidak Bisa";
        const sim_a = rawSimA ? String(rawSimA).trim() : "Tidak Memiliki";
        const sim_c = rawSimC ? String(rawSimC).trim() : "Tidak Memiliki";
        const gender = normalizeGender(rawGender);
        const theory_score = rawTheory ? String(rawTheory).replace("%", "").trim() : null;
        const interview_score = rawInterview ? String(rawInterview).replace("%", "").trim() : null;
        const graduation_status = rawGraduation ? String(rawGraduation).trim() : "Lulus";

        const errors: string[] = [];
        const warnings: string[] = [];

        if (!name) {
          errors.push("Nama Peserta kosong");
        }
        if (!school_name && !school_code) {
          errors.push("Asal Sekolah / Kode Sekolah kosong");
        }

        if (student_number) {
          const prevCount = studentNumberMap.get(student_number) || 0;
          if (prevCount > 0) {
            warnings.push(`Siswa '${name}' dengan tgl lahir sama terduplikasi di file`);
          }
          studentNumberMap.set(student_number, prevCount + 1);
        }

        processed.push({
          rowIndex: idx + 2,
          batch_id,
          school_name,
          school_code,
          name,
          mentor,
          city,
          competency,
          program_status,
          talent_pool_year,
          student_number,
          email,
          phone,
          driving_r4,
          sim_a,
          sim_c,
          birth_date,
          gender,
          theory_score,
          interview_score,
          graduation_status,
          isValid: errors.length === 0,
          errors,
          warnings,
        });
      });

      setFile(selectedFile);
      setParsedRows(processed);

      const validCount = processed.filter((r) => r.isValid).length;
      toast.success(`Berhasil membaca ${processed.length} baris data siswa (${validCount} valid).`);
    } catch (err: unknown) {
      console.error("Failed to parse Excel:", err);
      toast.error("Gagal membaca file Excel data siswa. Pastikan format file valid.");
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

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);
  const displayedRows = filterInvalidOnly ? invalidRows : parsedRows;
  const isBusy = isImporting || isSubmitting;

  async function handleProceedImport() {
    if (validRows.length === 0) {
      toast.error("Tidak ada baris data siswa valid yang dapat diimpor.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(`Sedang mengimpor ${validRows.length} data siswa...`);

    try {
      const payload: StudentImportPayloadItem[] = validRows.map((r) => ({
        batch_id: r.batch_id,
        school_name: r.school_name,
        school_code: r.school_code,
        name: r.name,
        mentor: r.mentor,
        city: r.city,
        competency: r.competency,
        program_status: r.program_status,
        talent_pool_year: r.talent_pool_year,
        student_number: r.student_number,
        email: r.email,
        phone: r.phone,
        driving_r4: r.driving_r4,
        sim_a: r.sim_a,
        sim_c: r.sim_c,
        birth_date: r.birth_date,
        gender: r.gender,
        theory_score: r.theory_score,
        interview_score: r.interview_score,
        graduation_status: r.graduation_status,
        status: (r.graduation_status || "").toLowerCase().includes("tidak") ? "INACTIVE" : "ACTIVE",
      }));

      await onImport(payload, upsert);
      toast.success(`Berhasil mengimpor ${validRows.length} data siswa!`, { id: toastId });
      handleClose();
    } catch (err: unknown) {
      console.error("Student Import failed:", err);
      const errMsg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err && "message" in err
            ? String((err as Record<string, unknown>)["message"])
            : "Gagal mengimpor data siswa ke database.";
      toast.error(errMsg, { id: toastId, duration: 6000 });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-5xl rounded-3xl border border-border bg-background shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-softgray/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Import Data Siswa dari Excel
              </h2>
              <p className="text-xs text-muted-foreground">
                Unggah spreadsheet .xlsx / .xls data siswa vokasi, talent pool, dan penilaian.
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
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-softgray/40 border border-border/80">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadStudentExcelTemplate}
                className="inline-flex items-center gap-2 rounded-xl bg-background border border-border px-3.5 py-2 text-xs font-semibold hover:bg-softgray hover:text-foreground transition-all shadow-xs"
              >
                <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Unduh Format Template Siswa (.xlsx)
              </button>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Sesuai 19 kolom format standar data peserta vokasi.
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
                Tarik & letakkan file Excel Siswa di sini, atau klik untuk memilih file
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Format yang didukung: .xlsx, .xls (Maksimal 1.000 baris)
              </p>
            </div>
          )}

          {/* Preview Section */}
          {file && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-border bg-card">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Total Terbaca
                  </span>
                  <span className="text-xl font-bold text-foreground mt-0.5 block">
                    {parsedRows.length}{" "}
                    <span className="text-xs font-normal text-muted-foreground">baris</span>
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
                    Perbarui data jika <strong>Nama & Tanggal Lahir</strong> sudah ada di database
                    (Upsert)
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
                      <tr className="text-muted-foreground whitespace-nowrap">
                        <th className="px-3 py-2.5 font-semibold w-10 text-center">No</th>
                        <th className="px-3 py-2.5 font-semibold">Batch</th>
                        <th className="px-3 py-2.5 font-semibold">Nama Peserta</th>
                        <th className="px-3 py-2.5 font-semibold">Asal Sekolah</th>
                        <th className="px-3 py-2.5 font-semibold">Kode BMI</th>
                        <th className="px-3 py-2.5 font-semibold">Pendamping</th>
                        <th className="px-3 py-2.5 font-semibold">Domisili</th>
                        <th className="px-3 py-2.5 font-semibold">Pendidikan</th>
                        <th className="px-3 py-2.5 font-semibold">Teori / Intv</th>
                        <th className="px-3 py-2.5 font-semibold">Kelulusan</th>
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
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="rounded bg-softgray px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                              {row.batch_id || "Batch 01"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 min-w-[170px]">
                            <span className="font-semibold text-foreground block">
                              {row.name || (
                                <span className="text-destructive font-normal italic">
                                  Wajib diisi
                                </span>
                              )}
                            </span>
                            {row.email && (
                              <span className="text-[10px] text-muted-foreground block truncate max-w-[160px]">
                                {row.email}
                              </span>
                            )}
                            {row.errors.length > 0 && (
                              <span className="text-[10px] text-destructive font-medium block mt-0.5">
                                ⚠ {row.errors.join(", ")}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 min-w-[160px] text-foreground font-medium">
                            {row.school_name || (
                              <span className="text-destructive text-[11px] italic">
                                Wajib diisi
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                            <span className="rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[11px] font-semibold">
                              {row.student_number}
                            </span>
                            {row.warnings.length > 0 && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5">
                                ⚠ Duplikat file
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                            {row.mentor || "-"}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                            {row.city || "-"}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                            {row.competency}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                            {row.theory_score ? `${row.theory_score}%` : "-"} /{" "}
                            {row.interview_score ? `${row.interview_score}%` : "-"}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                (row.graduation_status || "").toLowerCase().includes("lulus") &&
                                !(row.graduation_status || "").toLowerCase().includes("tidak")
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-zinc-500/10 text-zinc-500"
                              }`}
                            >
                              {row.graduation_status || "Lulus"}
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
                  Mengimpor Data Siswa...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  Impor {validRows.length} Data Siswa
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

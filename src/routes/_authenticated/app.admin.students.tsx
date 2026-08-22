import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, StatusBadge, Loading, EmptyState } from "@/components/app/shell";
import {
  listStudents,
  listSchools,
  saveStudent,
  importStudentsBulk,
  deleteStudent,
} from "@/lib/api.functions";
import {
  Search,
  Plus,
  Edit2,
  X,
  User,
  School,
  GraduationCap,
  Phone,
  Mail,
  Filter,
  FileSpreadsheet,
  Download,
  Award,
  Car,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  StudentExcelImportModal,
  type StudentImportPayloadItem,
} from "@/components/app/student-excel-import-modal";
import { exportStudentsToExcel } from "@/lib/student-excel.utils";

export const Route = createFileRoute("/_authenticated/app/admin/students")({
  head: () => ({
    meta: [
      { title: "Data Siswa — VokasiFlow AI" },
      { name: "description", content: "Direktori siswa vokasi lintas sekolah mitra." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminStudentsPage,
});

interface StudentItem {
  id: string;
  school_id: string;
  student_number: string;
  name: string;
  gender: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  competency: string;
  status: string;
  schools?: { name: string; school_code?: string; city?: string } | null;
  batch_id?: string | null;
  mentor?: string | null;
  city?: string | null;
  program_status?: string | null;
  talent_pool_year?: string | null;
  driving_r4?: string | null;
  sim_a?: string | null;
  sim_c?: string | null;
  theory_score?: string | null;
  interview_score?: string | null;
  graduation_status?: string | null;
}

function AdminStudentsPage() {
  const queryClient = useQueryClient();
  const fetchStudents = useServerFn(listStudents);
  const fetchSchools = useServerFn(listSchools);
  const saveStudentFn = useServerFn(saveStudent);
  const importStudentsBulkFn = useServerFn(importStudentsBulk);
  const deleteStudentFn = useServerFn(deleteStudent);

  const [search, setSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string>("ALL");
  const [selectedBatch, setSelectedBatch] = useState<string>("ALL");
  const [selectedCompetency, setSelectedCompetency] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);

  // Form states
  const [studentNumber, setStudentNumber] = useState("");
  const [name, setName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [gender, setGender] = useState<"L" | "P">("L");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [competency, setCompetency] = useState("Kelas XII");
  const [status, setStatus] = useState("Aktif Akademi");

  const {
    data: students,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["admin-students"],
    queryFn: () => fetchStudents(),
  });

  const { data: schools } = useQuery({
    queryKey: ["schools-list"],
    queryFn: () => fetchSchools(),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: string | undefined;
      school_id?: string;
      student_number: string;
      name: string;
      gender: "L" | "P" | null;
      birth_date: string | null;
      phone: string | null;
      email: string | null;
      competency: string;
      status: string;
    }) => {
      return saveStudentFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(
        editingStudent ? "Data siswa berhasil diperbarui." : "Siswa baru berhasil ditambahkan.",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      closeModal();
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal menyimpan data siswa.");
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (params: { students: StudentImportPayloadItem[]; upsert: boolean }) => {
      return importStudentsBulkFn({ data: params as any });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      queryClient.invalidateQueries({ queryKey: ["schools-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteStudentFn({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Data siswa berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal menghapus data siswa.");
    },
  });

  function handleDeleteStudent(id: string, studentName: string) {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus data siswa "${studentName}"? Tindakan ini tidak dapat dibatalkan.`,
    );
    if (confirmed) {
      deleteStudentMutation.mutate(id);
    }
  }

  function openCreateModal() {
    setEditingStudent(null);
    setStudentNumber("");
    setName("");
    setSchoolId(schools?.[0]?.id ?? "");
    setGender("L");
    setBirthDate("");
    setPhone("");
    setEmail("");
    setCompetency("Kelas XII");
    setStatus("Aktif Akademi");
    setModalOpen(true);
  }

  function openEditModal(student: StudentItem) {
    setEditingStudent(student);
    setStudentNumber(student.student_number);
    setName(student.name);
    setSchoolId(student.school_id);
    setGender(student.gender === "P" ? "P" : "L");
    setBirthDate(student.birth_date ?? "");
    setPhone(student.phone ?? "");
    setEmail(student.email ?? "");

    // Normalisasi kelas (Kelas XI, Kelas XII, Alumni)
    const rawComp = (student.competency || "").trim();
    if (rawComp.toLowerCase().includes("xi") && !rawComp.toLowerCase().includes("xii")) {
      setCompetency("Kelas XI");
    } else if (
      rawComp.toLowerCase().includes("alumni") ||
      rawComp.toLowerCase().includes("lulus")
    ) {
      setCompetency("Alumni");
    } else {
      setCompetency(rawComp || "Kelas XII");
    }

    // Normalisasi status peserta (Aktif Akademi, Talent Pool, Vokasi, Mundur)
    const rawSt = (student.program_status || student.status || "Aktif Akademi").trim();
    if (rawSt.toLowerCase().includes("akademi")) {
      setStatus("Aktif Akademi");
    } else if (rawSt.toLowerCase().includes("talent")) {
      setStatus("Talent Pool");
    } else if (rawSt.toLowerCase().includes("vokasi")) {
      setStatus("Vokasi");
    } else if (rawSt.toLowerCase().includes("mundur") || rawSt.toLowerCase().includes("inactive")) {
      setStatus("Mundur");
    } else {
      setStatus(rawSt || "Aktif Akademi");
    }

    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingStudent(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !studentNumber.trim() || !schoolId) {
      toast.error("Nama, NIS, dan Sekolah wajib diisi.");
      return;
    }

    const cleanEmail = email
      ? email
          .replace(/ı/g, "i")
          .replace(/İ/g, "I")
          .replace(/[\u200B-\u200D\uFEFF]/g, "")
          .trim()
      : null;

    saveMutation.mutate({
      id: editingStudent?.id,
      school_id: schoolId,
      student_number: studentNumber.trim(),
      name: name.trim(),
      gender,
      birth_date: birthDate || null,
      phone: phone.trim() || null,
      email: cleanEmail,
      competency,
      status,
    });
  }

  const batchList = Array.from(
    new Set((students ?? []).map((s: any) => s.batch_id).filter(Boolean)),
  );

  const competenciesList = ["Kelas XI", "Kelas XII", "Alumni"];
  const statusList = ["Aktif Akademi", "Talent Pool", "Vokasi", "Mundur"];

  const filteredStudents = (students ?? []).filter((s: any) => {
    if (!s) return false;
    const q = (search || "").toLowerCase().trim();
    const matchesSearch =
      !q ||
      (s.name ?? "").toLowerCase().includes(q) ||
      (s.student_number ?? "").toLowerCase().includes(q) ||
      (s.schools?.name ?? "").toLowerCase().includes(q) ||
      (s.city ?? "").toLowerCase().includes(q) ||
      (s.mentor ?? "").toLowerCase().includes(q) ||
      (s.batch_id ?? "").toLowerCase().includes(q);

    const matchesSchool = selectedSchool === "ALL" || s.school_id === selectedSchool;
    const matchesBatch = selectedBatch === "ALL" || s.batch_id === selectedBatch;
    const matchesCompetency =
      selectedCompetency === "ALL" ||
      s.competency?.toLowerCase() === selectedCompetency.toLowerCase() ||
      (selectedCompetency === "Kelas XI" &&
        s.competency?.toLowerCase().includes("xi") &&
        !s.competency?.toLowerCase().includes("xii")) ||
      (selectedCompetency === "Kelas XII" && s.competency?.toLowerCase().includes("xii")) ||
      (selectedCompetency === "Alumni" && s.competency?.toLowerCase().includes("alumni"));

    const sStatus = (s.program_status || s.status || "").toLowerCase();
    const matchesStatus =
      selectedStatus === "ALL" || sStatus.includes(selectedStatus.toLowerCase());

    return matchesSearch && matchesSchool && matchesBatch && matchesCompetency && matchesStatus;
  });

  async function handleExportExcel() {
    if (filteredStudents.length === 0) {
      toast.error("Tidak ada data siswa untuk diekspor.");
      return;
    }
    const toastId = toast.loading(`Mengekspor ${filteredStudents.length} data siswa ke Excel...`);
    try {
      const exportData = filteredStudents.map((s: any) => ({
        batch_id: s.batch_id || "Batch 01",
        school_name: s.schools?.name || "-",
        name: s.name,
        mentor: s.mentor || "-",
        city: s.city || "-",
        competency: s.competency || "Kelas XII",
        program_status: s.program_status || "TalentPool",
        talent_pool_year: s.talent_pool_year || "2024",
        student_number: s.student_number,
        email: s.email || "-",
        phone: s.phone || "-",
        driving_r4: s.driving_r4 || "Tidak Bisa",
        sim_a: s.sim_a || "Tidak Memiliki",
        sim_c: s.sim_c || "Tidak Memiliki",
        birth_date: s.birth_date || "-",
        gender: s.gender || "L",
        theory_score: s.theory_score || null,
        interview_score: s.interview_score || null,
        graduation_status: s.graduation_status || (s.status === "ACTIVE" ? "Lulus" : "Tidak Lulus"),
        status: s.status,
      }));

      await exportStudentsToExcel(exportData, `data_siswa_vokasiflow_${Date.now()}.xlsx`);
      toast.success(`Berhasil mengekspor ${filteredStudents.length} data siswa.`, { id: toastId });
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Gagal mengekspor data siswa.", { id: toastId });
    }
  }

  return (
    <AppShell
      title="Direktori Data Siswa"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold hover:bg-softgray hover:text-foreground transition-all shadow-xs"
            title="Ekspor data siswa ke file Excel"
          >
            <Download className="h-4 w-4 text-primary" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold hover:bg-softgray hover:text-foreground transition-all shadow-xs"
            title="Impor data siswa dari spreadsheet Excel"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Import Excel
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3.5 py-2 text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Tambah Siswa
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Filter Controls */}
        <div className="grid gap-3 sm:grid-cols-5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIS, batch, domisili..."
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2 text-xs outline-none focus:border-ai transition-colors"
            />
          </div>

          <div>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
            >
              <option value="ALL">Semua Batch</option>
              {batchList.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
            >
              <option value="ALL">Semua Sekolah Mitra</option>
              {(schools ?? []).map((sch) => (
                <option key={sch.id} value={sch.id}>
                  {sch.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedCompetency}
              onChange={(e) => setSelectedCompetency(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
            >
              <option value="ALL">Semua Pendidikan / Kelas</option>
              {competenciesList.map((comp: any) => (
                <option key={String(comp)} value={String(comp)}>
                  {String(comp)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
            >
              <option value="ALL">Semua Status Peserta</option>
              {statusList.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Counter Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Menampilkan <strong className="text-foreground">{filteredStudents.length}</strong> dari{" "}
            <strong className="text-foreground">{students?.length ?? 0}</strong> siswa
          </span>
        </div>

        {/* Content Table */}
        {isPending ? <Loading count={4} /> : null}

        {isError ? (
          <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4">
            <p className="text-xs font-medium">Gagal memuat data siswa.</p>
          </Card>
        ) : null}

        {!isPending && !isError ? (
          filteredStudents.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-softgray/60 border-b border-border">
                    <tr className="text-muted-foreground whitespace-nowrap">
                      <th className="px-3.5 py-3 font-semibold">Batch</th>
                      <th className="px-3.5 py-3 font-semibold">Nama Peserta (ID)</th>
                      <th className="px-3.5 py-3 font-semibold">Asal Sekolah & Kode</th>
                      <th className="px-3.5 py-3 font-semibold">Pendamping</th>
                      <th className="px-3.5 py-3 font-semibold">Domisili</th>
                      <th className="px-3.5 py-3 font-semibold">Pendidikan</th>
                      <th className="px-3.5 py-3 font-semibold">Status Peserta</th>
                      <th className="px-3.5 py-3 font-semibold">SIM & Kemudi</th>
                      <th className="px-3.5 py-3 font-semibold">Nilai</th>
                      <th className="px-3.5 py-3 font-semibold">Kelulusan</th>
                      <th className="px-3.5 py-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStudents.map((s: any) => (
                      <tr key={s.id} className="hover:bg-softgray/30 transition-colors">
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className="rounded-md bg-softgray px-2 py-0.5 text-[10px] font-semibold text-foreground">
                            {s.batch_id || "-"}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 min-w-[180px]">
                          <span className="font-bold text-foreground block text-xs">{s.name}</span>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono mt-0.5">
                            <span className="text-primary font-semibold">{s.student_number}</span>
                            {s.gender && (
                              <span className="text-[10px] rounded bg-softgray px-1 font-sans">
                                {s.gender === "P" ? "P" : "L"}
                              </span>
                            )}
                          </div>
                          {s.phone && (
                            <span className="text-[10px] text-muted-foreground block font-mono">
                              {s.phone}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 min-w-[170px]">
                          <span className="font-semibold text-foreground block">
                            {s.schools?.name || "-"}
                          </span>
                          {s.schools?.school_code && (
                            <span className="inline-block mt-0.5 rounded bg-softgray font-mono text-[10px] px-1.5 py-0.2 text-muted-foreground">
                              Kode: {s.schools.school_code}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {s.mentor ? (
                            <span className="rounded bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                              {s.mentor}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-muted-foreground whitespace-nowrap">
                          {s.city || "-"}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className="rounded-md bg-softgray px-2 py-0.5 text-[11px] font-semibold text-foreground">
                            {s.competency || "Kelas XII"}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {(() => {
                            const rawStatus = (
                              s.program_status ||
                              s.status ||
                              "Aktif Akademi"
                            ).trim();
                            let label = rawStatus;
                            let badgeClass =
                              "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";

                            if (rawStatus.toLowerCase().includes("talent")) {
                              label = "Talent Pool";
                              badgeClass =
                                "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
                            } else if (rawStatus.toLowerCase().includes("vokasi")) {
                              label = "Vokasi";
                              badgeClass =
                                "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                            } else if (
                              rawStatus.toLowerCase().includes("mundur") ||
                              rawStatus.toLowerCase().includes("inactive")
                            ) {
                              label = "Mundur";
                              badgeClass =
                                "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
                            } else if (
                              rawStatus.toLowerCase().includes("akademi") ||
                              rawStatus.toLowerCase().includes("active")
                            ) {
                              label = "Aktif Akademi";
                              badgeClass =
                                "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
                            }

                            return (
                              <div>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeClass}`}
                                >
                                  {label}
                                </span>
                                {s.talent_pool_year && label === "Talent Pool" && (
                                  <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono">
                                    Thn {s.talent_pool_year}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap text-[11px] text-muted-foreground">
                          {s.driving_r4 && s.driving_r4.toLowerCase().includes("bisa") ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              <Car className="h-3 w-3" /> R4: Bisa
                            </span>
                          ) : (
                            <span className="text-muted-foreground">R4: -</span>
                          )}
                          <div className="text-[10px] text-muted-foreground">
                            SIM: {s.sim_a?.toLowerCase().includes("memiliki") ? "A " : ""}
                            {s.sim_c?.toLowerCase().includes("memiliki") ? "C" : ""}
                            {!s.sim_a?.toLowerCase().includes("memiliki") &&
                              !s.sim_c?.toLowerCase().includes("memiliki") &&
                              "-"}
                          </div>
                        </td>
                        <td className="px-3.5 py-3 font-mono text-[11px] whitespace-nowrap">
                          {s.theory_score || s.interview_score ? (
                            <div>
                              <span className="text-foreground font-semibold">
                                T: {s.theory_score ? `${s.theory_score}%` : "-"}
                              </span>
                              <span className="text-muted-foreground block text-[10px]">
                                I: {s.interview_score ? `${s.interview_score}%` : "-"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              (s.graduation_status || "").toLowerCase().includes("lulus") &&
                              !(s.graduation_status || "").toLowerCase().includes("tidak")
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-zinc-500/10 text-zinc-500"
                            }`}
                          >
                            {s.graduation_status ||
                              (s.status === "ACTIVE" ? "Lulus" : "Tidak Lulus")}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(s)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold hover:bg-softgray hover:text-foreground transition-colors shadow-2xs"
                              title="Edit Data Siswa"
                            >
                              <Edit2 className="h-3 w-3" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(s.id, s.name)}
                              disabled={deleteStudentMutation.isPending}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2.5 py-1 text-xs font-semibold hover:bg-rose-500/20 transition-colors shadow-2xs disabled:opacity-50"
                              title="Hapus Data Siswa"
                            >
                              <Trash2 className="h-3 w-3" /> Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <EmptyState
              title="Tidak ada data siswa ditemukan"
              description="Sesuaikan filter pencarian atau gunakan tombol Import Excel untuk menambahkan data siswa secara massal."
              action={
                <button
                  type="button"
                  onClick={() => setImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Import Excel Siswa
                </button>
              }
            />
          )
        ) : null}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold tracking-tight text-foreground">
                {editingStudent ? "Edit Data Siswa" : "Tambah Siswa Baru"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-softgray text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Nomor Induk (NIS) *
                  </label>
                  <input
                    type="text"
                    required
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    placeholder="Contoh: BMI-001 / 202401"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Jenis Kelamin</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "L" | "P")}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap peserta / siswa"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Asal Sekolah *</label>
                <select
                  required
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                >
                  <option value="" disabled>
                    Pilih Sekolah Mitra
                  </option>
                  {(schools ?? []).map((sch) => (
                    <option key={sch.id} value={sch.id}>
                      {sch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Kompetensi / Kelas
                  </label>
                  <select
                    value={competency}
                    onChange={(e) => setCompetency(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  >
                    <option value="Kelas XI">Kelas XI</option>
                    <option value="Kelas XII">Kelas XII</option>
                    <option value="Alumni">Alumni</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Status Peserta</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  >
                    <option value="Aktif Akademi">Aktif Akademi</option>
                    <option value="Talent Pool">Talent Pool</option>
                    <option value="Vokasi">Vokasi</option>
                    <option value="Mundur">Mundur</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Nomor Telepon / WA
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0812..."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Email</label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.replace(/ı/g, "i").replace(/İ/g, "I"))}
                    placeholder="nama@email.com"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
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
                  {saveMutation.isPending ? "Menyimpan..." : "Simpan Siswa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Student Excel Import Modal */}
      <StudentExcelImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={async (importedStudents, upsert) => {
          return bulkImportMutation.mutateAsync({
            students: importedStudents,
            upsert,
          });
        }}
        isImporting={bulkImportMutation.isPending}
      />
    </AppShell>
  );
}

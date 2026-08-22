import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, StatusBadge, Loading, EmptyState, useMe } from "@/components/app/shell";
import { listStudents, saveStudent } from "@/lib/api.functions";
import {
  Search,
  Plus,
  Edit2,
  X,
  User,
  GraduationCap,
  Phone,
  Mail,
  Filter,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { exportStudentsToExcel } from "@/lib/student-excel.utils";

export const Route = createFileRoute("/_authenticated/app/guru/students")({
  head: () => ({
    meta: [
      { title: "Data Siswa — VokasiFlow AI" },
      { name: "description", content: "Manajemen data siswa sekolah binaan." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GuruStudentsPage,
});

interface StudentItem {
  id: string;
  student_number: string;
  name: string;
  gender: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  competency: string;
  status: string;
}

function GuruStudentsPage() {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const fetchStudents = useServerFn(listStudents);
  const saveStudentFn = useServerFn(saveStudent);

  const [search, setSearch] = useState("");
  const [selectedCompetency, setSelectedCompetency] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);

  // Form states
  const [studentNumber, setStudentNumber] = useState("");
  const [name, setName] = useState("");
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
    queryKey: ["guru-students"],
    queryFn: () => fetchStudents(),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: string | undefined;
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
      queryClient.invalidateQueries({ queryKey: ["guru-students"] });
      queryClient.invalidateQueries({ queryKey: ["guru-dashboard"] });
      closeModal();
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal menyimpan data siswa.");
    },
  });

  function openCreateModal() {
    setEditingStudent(null);
    setStudentNumber("");
    setName("");
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
    setGender(student.gender === "P" ? "P" : "L");
    setBirthDate(student.birth_date ?? "");
    setPhone(student.phone ?? "");
    setEmail(student.email ?? "");

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

    const rawSt = (student.status || "Aktif Akademi").trim();
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
    if (!name.trim() || !studentNumber.trim()) {
      toast.error("Nama dan NIS siswa wajib diisi.");
      return;
    }

    saveMutation.mutate({
      id: editingStudent?.id,
      student_number: studentNumber.trim(),
      name: name.trim(),
      gender,
      birth_date: birthDate || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      competency,
      status,
    });
  }

  const competenciesList = Array.from(new Set((students ?? []).map((s) => s.competency)));

  const filteredStudents = (students ?? []).filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.student_number.toLowerCase().includes(search.toLowerCase()) ||
      s.competency.toLowerCase().includes(search.toLowerCase());

    const matchesCompetency = selectedCompetency === "ALL" || s.competency === selectedCompetency;

    return matchesSearch && matchesCompetency;
  });

  async function handleExportExcel() {
    if (filteredStudents.length === 0) {
      toast.error("Tidak ada data siswa untuk diekspor.");
      return;
    }
    const toastId = toast.loading(`Mengekspor ${filteredStudents.length} data siswa...`);
    try {
      const exportData = filteredStudents.map((s: any) => ({
        batch_id: s.batch_id || "Batch 01",
        school_name: me?.schoolName || "-",
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

      await exportStudentsToExcel(
        exportData,
        `data_siswa_${(me?.schoolName || "sekolah").toLowerCase().replace(/\s+/g, "_")}.xlsx`,
      );
      toast.success(`Berhasil mengekspor ${filteredStudents.length} data siswa.`, { id: toastId });
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Gagal mengekspor data siswa.", { id: toastId });
    }
  }

  return (
    <AppShell
      title={`Data Siswa — ${me?.schoolName || "Sekolah"}`}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold hover:bg-softgray hover:text-foreground transition-all shadow-xs"
          >
            <Download className="h-4 w-4 text-primary" />
            Export Excel
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
        {/* Search & Competency Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau NIS siswa..."
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2 text-xs outline-none focus:border-ai transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <select
              value={selectedCompetency}
              onChange={(e) => setSelectedCompetency(e.target.value)}
              className="rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
            >
              <option value="ALL">Semua Jurusan / Kompetensi</option>
              {competenciesList.map((comp: any) => (
                <option key={String(comp)} value={String(comp)}>
                  {String(comp)}
                </option>
              ))}
            </select>
          </div>
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
                  <thead className="bg-softgray/50 border-b border-border">
                    <tr className="text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">NIS & Nama Lengkap</th>
                      <th className="px-4 py-3 font-semibold">Jurusan / Kompetensi</th>
                      <th className="px-4 py-3 font-semibold">Jenis Kelamin</th>
                      <th className="px-4 py-3 font-semibold">Kontak HP & Email</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-softgray/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-foreground block text-sm">{s.name}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            NIS: {s.student_number}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded-md bg-softgray px-2 py-0.5 font-mono text-[11px]">
                            {s.competency}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {s.gender === "L" ? "Laki-laki" : s.gender === "P" ? "Perempuan" : "-"}
                        </td>
                        <td className="px-4 py-3.5 text-[11px] text-muted-foreground">
                          {s.email && <div className="truncate max-w-[150px]">{s.email}</div>}
                          {s.phone && <div>{s.phone}</div>}
                          {!s.email && !s.phone && "-"}
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
              title="Belum ada siswa terdaftar"
              description="Tambahkan siswa pertama sekolah Anda untuk memulai proses penempatan magang."
              action={
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold"
                >
                  Tambah Siswa Sekarang
                </button>
              }
            />
          )
        ) : null}
      </div>

      {/* Add / Edit Student Modal */}
      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-background shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-bold tracking-tight">
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

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-semibold">
                  Nomor Induk Siswa (NIS)
                  <input
                    type="text"
                    required
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    placeholder="2026001"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Nama Lengkap Siswa
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ahmad Fauzan"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-semibold">
                  Kompetensi / Kelas
                  <select
                    value={competency}
                    onChange={(e) => setCompetency(e.target.value)}
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  >
                    <option value="Kelas XI">Kelas XI</option>
                    <option value="Kelas XII">Kelas XII</option>
                    <option value="Alumni">Alumni</option>
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Jenis Kelamin
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "L" | "P")}
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-semibold">
                  Nomor Telepon / WA
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08123456789"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Email Siswa
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="siswa@sekolah.sch.id"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
                </label>
              </div>

              <label className="grid gap-1.5 text-xs font-semibold">
                Status Peserta
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                >
                  <option value="Aktif Akademi">Aktif Akademi</option>
                  <option value="Talent Pool">Talent Pool</option>
                  <option value="Vokasi">Vokasi</option>
                  <option value="Mundur">Mundur</option>
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
                  {saveMutation.isPending ? "Menyimpan..." : "Simpan Siswa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

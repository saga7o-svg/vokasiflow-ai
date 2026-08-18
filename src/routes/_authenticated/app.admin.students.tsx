import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, StatusBadge, Loading, EmptyState } from "@/components/app/shell";
import { listStudents, listSchools, saveStudent } from "@/lib/api.functions";
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
} from "lucide-react";
import { toast } from "sonner";

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
  schools?: { name: string } | null;
}

function AdminStudentsPage() {
  const queryClient = useQueryClient();
  const fetchStudents = useServerFn(listStudents);
  const fetchSchools = useServerFn(listSchools);
  const saveStudentFn = useServerFn(saveStudent);

  const [search, setSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string>("ALL");
  const [selectedCompetency, setSelectedCompetency] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);

  // Form states
  const [studentNumber, setStudentNumber] = useState("");
  const [name, setName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [gender, setGender] = useState<"L" | "P">("L");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [competency, setCompetency] = useState("Software Development");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

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
      status: "ACTIVE" | "INACTIVE";
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

  function openCreateModal() {
    setEditingStudent(null);
    setStudentNumber("");
    setName("");
    setSchoolId(schools?.[0]?.id ?? "");
    setGender("L");
    setBirthDate("");
    setPhone("");
    setEmail("");
    setCompetency("Software Development");
    setStatus("ACTIVE");
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
    setCompetency(student.competency);
    setStatus(student.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
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

    saveMutation.mutate({
      id: editingStudent?.id,
      school_id: schoolId,
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
      (s.schools?.name ?? "").toLowerCase().includes(search.toLowerCase());

    const matchesSchool = selectedSchool === "ALL" || s.school_id === selectedSchool;
    const matchesCompetency = selectedCompetency === "ALL" || s.competency === selectedCompetency;

    return matchesSearch && matchesSchool && matchesCompetency;
  });

  return (
    <AppShell
      title="Direktori Data Siswa"
      actions={
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3.5 py-2 text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Tambah Siswa
        </button>
      }
    >
      <div className="space-y-4">
        {/* Filter Controls */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau NIS siswa..."
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2 text-xs outline-none focus:border-ai transition-colors"
            />
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
              <option value="ALL">Semua Kompetensi Keahlian</option>
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
                      <th className="px-4 py-3 font-semibold">NIS & Nama</th>
                      <th className="px-4 py-3 font-semibold">Asal Sekolah</th>
                      <th className="px-4 py-3 font-semibold">Kompetensi</th>
                      <th className="px-4 py-3 font-semibold">Gender</th>
                      <th className="px-4 py-3 font-semibold">Kontak</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-softgray/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-foreground block">{s.name}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            NIS: {s.student_number}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-foreground">
                          {s.schools?.name}
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
              title="Tidak ada data siswa"
              description="Belum ada siswa yang sesuai kriteria pencarian."
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
              <label className="grid gap-1.5 text-xs font-semibold">
                Asal Sekolah Mitra
                <select
                  required
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                >
                  <option value="">Pilih Sekolah...</option>
                  {(schools ?? []).map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name} ({sc.city})
                    </option>
                  ))}
                </select>
              </label>

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
                  Nama Lengkap
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
                  Kompetensi Keahlian
                  <input
                    type="text"
                    required
                    value={competency}
                    onChange={(e) => setCompetency(e.target.value)}
                    placeholder="Software Development"
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  />
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
                  Nomor Telepon
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
                Status Siswa
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

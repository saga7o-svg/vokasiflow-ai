import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, StatusBadge, Loading, EmptyState } from "@/components/app/shell";
import { listUsers, listSchools, createGuruUser, updateUser } from "@/lib/api.functions";
import {
  Search,
  Plus,
  Edit2,
  X,
  UserCheck,
  Shield,
  GraduationCap,
  Mail,
  School,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/admin/users")({
  head: () => ({
    meta: [
      { title: "Manajemen Pengguna — VokasiFlow AI" },
      { name: "description", content: "Kelola akun akses guru sekolah dan administrator." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUsersPage,
});

interface UserItem {
  id: string;
  name: string;
  email: string;
  school_id: string | null;
  status: string;
  role: "ADMIN" | "GURU";
  schoolName: string | null;
}

function AdminUsersPage() {
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const fetchSchools = useServerFn(listSchools);
  const createGuruFn = useServerFn(createGuruUser);
  const updateUserFn = useServerFn(updateUser);

  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Create form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [role, setRole] = useState<"ADMIN" | "GURU">("GURU");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editSchoolId, setEditSchoolId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [editRole, setEditRole] = useState<"ADMIN" | "GURU">("GURU");

  const {
    data: users,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => fetchUsers(),
  });

  const { data: schools } = useQuery({
    queryKey: ["schools-list"],
    queryFn: () => fetchSchools(),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      email: string;
      password: string;
      school_id: string;
      role: "ADMIN" | "GURU";
    }) => {
      return createGuruFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("Akun guru baru berhasil dibuat dan didaftarkan.");
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      setCreateModalOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal membuat akun.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      name: string;
      school_id: string | null;
      status: "ACTIVE" | "INACTIVE";
      role: "ADMIN" | "GURU";
    }) => {
      return updateUserFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("Data akun berhasil diperbarui.");
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      setEditModalOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err?.message || "Gagal memperbarui akun.");
    },
  });

  function openCreate() {
    setName("");
    setEmail("");
    setPassword("");
    setSchoolId(schools?.[0]?.id ?? "");
    setRole("GURU");
    setCreateModalOpen(true);
  }

  function openEdit(u: UserItem) {
    setEditingUser(u);
    setEditName(u.name);
    setEditSchoolId(u.school_id ?? null);
    setEditStatus(u.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
    setEditRole(u.role === "ADMIN" ? "ADMIN" : "GURU");
    setEditModalOpen(true);
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Nama, email, dan password wajib diisi.");
      return;
    }
    if (role === "GURU" && !schoolId) {
      toast.error("Pilih sekolah penugasan untuk guru.");
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      password,
      school_id: schoolId || (schools?.[0]?.id ?? ""),
      role,
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    updateMutation.mutate({
      id: editingUser.id,
      name: editName.trim(),
      school_id: editSchoolId || null,
      status: editStatus,
      role: editRole,
    });
  }

  const filteredUsers = (users ?? []).filter((u) => {
    return (
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.schoolName ?? "").toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <AppShell
      title="Manajemen Hak Akses & Pengguna"
      actions={
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3.5 py-2 text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
        >
          <Plus className="h-4 w-4" /> Buat Akun Pengguna
        </button>
      }
    >
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, sekolah penugasan..."
            className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2 text-xs outline-none focus:border-ai transition-colors"
          />
        </div>

        {/* Content Table */}
        {isPending ? <Loading count={3} /> : null}

        {isError ? (
          <Card className="border-destructive/20 bg-destructive/5 text-destructive p-4">
            <p className="text-xs font-medium">Gagal memuat data pengguna.</p>
          </Card>
        ) : null}

        {!isPending && !isError ? (
          filteredUsers.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-softgray/50 border-b border-border">
                    <tr className="text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">Nama & Email</th>
                      <th className="px-4 py-3 font-semibold">Peran (Role)</th>
                      <th className="px-4 py-3 font-semibold">Sekolah Penugasan</th>
                      <th className="px-4 py-3 font-semibold">Status Akun</th>
                      <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-softgray/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-foreground block text-sm">{u.name}</span>
                          <span className="text-[11px] text-muted-foreground">{u.email}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              u.role === "ADMIN"
                                ? "bg-primary text-primary-foreground"
                                : "bg-ai-soft text-ai"
                            }`}
                          >
                            {u.role === "ADMIN" ? (
                              <Shield className="h-3 w-3" />
                            ) : (
                              <GraduationCap className="h-3 w-3" />
                            )}
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-foreground font-medium">
                          {u.schoolName ||
                            (u.role === "ADMIN" ? "Semua Regional (Pusat)" : "Belum Ditugaskan")}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={u.status ?? "ACTIVE"} />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold hover:bg-softgray transition-colors"
                          >
                            <Edit2 className="h-3 w-3" /> Kelola
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
              title="Tidak ada pengguna"
              description="Belum ada pengguna yang sesuai dengan pencarian Anda."
            />
          )
        ) : null}
      </div>

      {/* Create User Modal */}
      {createModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-border bg-background shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-bold tracking-tight">Buat Akun Pengguna Baru</h2>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-softgray text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <label className="grid gap-1.5 text-xs font-semibold">
                Nama Lengkap
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dra. Siti Aminah"
                  className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold">
                Email Pengguna
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="guru@smkn1bdg.sch.id"
                  className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold">
                Password Awal (Min 8 Karakter)
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-semibold">
                  Peran Akun
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "ADMIN" | "GURU")}
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  >
                    <option value="GURU">Guru Sekolah</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </label>

                <label className="grid gap-1.5 text-xs font-semibold">
                  Sekolah Penugasan
                  <select
                    disabled={role === "ADMIN"}
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai disabled:opacity-50"
                  >
                    <option value="">Pilih Sekolah...</option>
                    {(schools ?? []).map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-softgray transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-xl bg-primary text-primary-foreground px-5 py-2 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {createMutation.isPending ? "Mendaftarkan..." : "Daftarkan Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Edit User Modal */}
      {editModalOpen && editingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-border bg-background shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-bold tracking-tight">
                Kelola Akun: {editingUser.email}
              </h2>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-softgray text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <label className="grid gap-1.5 text-xs font-semibold">
                Nama Pengguna
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-semibold">
                  Peran Akun
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as "ADMIN" | "GURU")}
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  >
                    <option value="GURU">Guru Sekolah</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </label>

                <label className="grid gap-1.5 text-xs font-semibold">
                  Status Akun
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                    className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai"
                  >
                    <option value="ACTIVE">Aktif (ACTIVE)</option>
                    <option value="INACTIVE">Non-Aktif (INACTIVE)</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-1.5 text-xs font-semibold">
                Sekolah Penugasan
                <select
                  disabled={editRole === "ADMIN"}
                  value={editSchoolId || ""}
                  onChange={(e) => setEditSchoolId(e.target.value || null)}
                  className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs outline-none focus:border-ai disabled:opacity-50"
                >
                  <option value="">Tidak Ditugaskan (Admin Pusat)</option>
                  {(schools ?? []).map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-softgray transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-xl bg-primary text-primary-foreground px-5 py-2 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, Card, Loading, EmptyState, useMe } from "@/components/app/shell";
import {
  listUsers,
  listSchools,
  createGuruUser,
  updateUser,
  deleteUser,
  isSuperAdminEmail,
} from "@/lib/api.functions";
import {
  Search,
  Plus,
  Edit2,
  X,
  Shield,
  GraduationCap,
  Trash2,
  ShieldAlert,
  Users,
  Crown,
  Copy,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  role: "SUPER_ADMIN" | "ADMIN" | "GURU";
  isSuperAdmin?: boolean;
  schoolName: string | null;
}

function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const isSuperAdmin =
    me?.role === "SUPER_ADMIN" ||
    me?.role === "ADMIN" ||
    Boolean(me?.isSuperAdmin) ||
    isSuperAdminEmail(me?.email);

  const fetchUsers = useServerFn(listUsers);
  const fetchSchools = useServerFn(listSchools);
  const createGuruFn = useServerFn(createGuruUser);
  const updateUserFn = useServerFn(updateUser);
  const deleteUserFn = useServerFn(deleteUser);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "GURU">("ALL");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Success Created Notification Modal
  const [createdAccountInfo, setCreatedAccountInfo] = useState<{
    name: string;
    email: string;
    password: string;
    role: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    enabled: isSuperAdmin,
  });

  const { data: schools } = useQuery({
    queryKey: ["schools-list"],
    queryFn: () => fetchSchools(),
    enabled: isSuperAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      email: string;
      password: string;
      school_id?: string | null;
      role: "ADMIN" | "GURU";
    }) => {
      const cleanEmail = payload.email.trim().toLowerCase();
      return createGuruFn({
        data: {
          name: payload.name.trim(),
          email: cleanEmail,
          password: payload.password,
          school_id: payload.school_id,
          role: payload.role,
        },
      });
    },
    onSuccess: (_, variables) => {
      toast.success(`Akun "${variables.email}" berhasil didaftarkan dan langsung aktif!`);
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      queryClient.refetchQueries({ queryKey: ["users-list"] });
      setCreateModalOpen(false);
      setCreatedAccountInfo({
        name: variables.name,
        email: variables.email,
        password: variables.password,
        role: variables.role,
      });
      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setSchoolId("");
      setRole("GURU");
    },
    onError: (err: any) => {
      const msg = err?.message || err?.data?.message || "Gagal membuat akun.";
      toast.error(msg);
      console.error("Create user error:", err);
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
    onError: (err: any) => {
      const msg = err?.message || err?.data?.message || "Gagal memperbarui akun.";
      toast.error(msg);
      console.error("Update user error:", err);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteUserFn({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Akun pengguna berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
    },
    onError: (err: any) => {
      const msg = err?.message || err?.data?.message || "Gagal menghapus akun pengguna.";
      toast.error(msg);
      console.error("Delete user error:", err);
    },
  });

  function openCreate() {
    setName("");
    setEmail("");
    setPassword("");
    setSchoolId(schools?.[0]?.id ?? "");
    setRole("GURU");
    setShowPassword(false);
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
    if (!name.trim()) {
      toast.error("Nama lengkap wajib diisi.");
      return;
    }
    if (!email.trim()) {
      toast.error("Email akun wajib diisi.");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("Password minimal 6 karakter.");
      return;
    }
    if (role === "GURU" && !schoolId) {
      toast.error("Pilih sekolah penugasan untuk guru.");
      return;
    }

    const cleanSchoolId =
      role === "ADMIN" || !schoolId || schoolId.trim() === "" ? null : schoolId.trim();

    createMutation.mutate({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      school_id: cleanSchoolId,
      role,
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    updateMutation.mutate({
      id: editingUser.id,
      name: editName.trim(),
      school_id: editRole === "ADMIN" ? null : editSchoolId || null,
      status: editStatus,
      role: editRole,
    });
  }

  function handleCopyCredentials(creds: { email: string; password?: string }) {
    const text = creds.password
      ? `Email: ${creds.email}\nPassword: ${creds.password}`
      : creds.email;
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    toast.success("Kredensial akun berhasil disalin ke clipboard!");
    setTimeout(() => setCopiedKey(false), 2500);
  }

  if (!isSuperAdmin) {
    return (
      <AppShell title="Manajemen Pengguna">
        <div className="max-w-md mx-auto py-16 text-center space-y-4 animate-in fade-in duration-200">
          <div className="grid h-16 w-16 mx-auto place-items-center rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground tracking-tight">
              Akses Khusus Super Administrator
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sebagai <strong>Admin</strong>, Anda memiliki hak akses penuh ke data sekolah, peserta
              magang, perusahaan, perizinan, dan rekomendasi AI. Pengelolaan akun pengguna hanya
              dapat dilakukan oleh <strong>Super Admin</strong>.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/app/admin/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold shadow-xs hover:opacity-90 transition-opacity"
            >
              Kembali ke Dashboard Admin
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const allUsers = users ?? [];
  const superAdminCount = allUsers.filter((u) => u.role === "SUPER_ADMIN").length;
  const adminBiasaCount = allUsers.filter((u) => u.role === "ADMIN").length;
  const guruCount = allUsers.filter((u) => u.role === "GURU").length;

  const filteredUsers = allUsers.filter((u) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.schoolName ?? "").toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (roleFilter === "ADMIN") return u.role === "ADMIN" || u.role === "SUPER_ADMIN";
    if (roleFilter === "GURU") return u.role === "GURU";
    return true;
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
          <Plus className="h-4 w-4" /> Tambah Pengguna Baru
        </button>
      }
    >
      <div className="space-y-4">
        {/* KPI Stats */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4 bg-card/60 backdrop-blur-xs border-border/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Total Pengguna</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{allUsers.length}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Semua akun terdaftar</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-4 bg-card/60 backdrop-blur-xs border-border/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Admin & Super Admin</p>
              <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {superAdminCount + adminBiasaCount}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {superAdminCount} Super Admin &bull; {adminBiasaCount} Admin
              </p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Shield className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-4 bg-card/60 backdrop-blur-xs border-border/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Guru Sekolah</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {guruCount}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Guru pembimbing magang</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <GraduationCap className="h-5 w-5" />
            </div>
          </Card>
        </div>

        {/* Filter Pills & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, email, sekolah, atau peran..."
              className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2 text-xs outline-none focus:border-ai transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setRoleFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                roleFilter === "ALL"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:bg-softgray"
              }`}
            >
              Semua ({allUsers.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("ADMIN")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                roleFilter === "ADMIN"
                  ? "bg-indigo-600 text-white"
                  : "bg-card border border-border text-muted-foreground hover:bg-softgray"
              }`}
            >
              Admin ({superAdminCount + adminBiasaCount})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("GURU")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                roleFilter === "GURU"
                  ? "bg-emerald-600 text-white"
                  : "bg-card border border-border text-muted-foreground hover:bg-softgray"
              }`}
            >
              Guru ({guruCount})
            </button>
          </div>
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
                      <th className="px-4 py-3 font-semibold">Hak Akses & Penugasan</th>
                      <th className="px-4 py-3 font-semibold">Status Akun</th>
                      <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.map((u) => {
                      const isSelf = u.id === me?.id || u.email === me?.email;
                      const isUserSuperAdmin = u.role === "SUPER_ADMIN";

                      return (
                        <tr key={u.id} className="hover:bg-softgray/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-foreground block text-sm">
                              {u.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                              <span>{u.email}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyCredentials({ email: u.email })}
                                className="hover:text-foreground text-muted-foreground transition-colors"
                                title="Salin Email"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            {isUserSuperAdmin ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                <Crown className="h-3 w-3" />
                                Super Admin
                              </span>
                            ) : u.role === "ADMIN" ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                                <Shield className="h-3 w-3" />
                                Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <GraduationCap className="h-3 w-3" />
                                Guru Sekolah
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-foreground font-medium">
                            {isUserSuperAdmin ? (
                              <span className="text-purple-600 dark:text-purple-400 font-semibold">
                                Akses Penuh + Manajemen User
                              </span>
                            ) : u.role === "ADMIN" ? (
                              <span className="text-primary font-medium">
                                Semua Fitur Admin (Non-User)
                              </span>
                            ) : (
                              u.schoolName || (
                                <span className="text-muted-foreground">Belum Ditugaskan</span>
                              )
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                (u.status ?? "ACTIVE") === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                              }`}
                            >
                              {(u.status ?? "ACTIVE") === "ACTIVE" ? "Aktif" : "Non-Aktif"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEdit(u)}
                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold hover:bg-softgray transition-colors"
                              >
                                <Edit2 className="h-3 w-3" /> Edit
                              </button>
                              {!isSelf && !isUserSuperAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Hapus akun pengguna "${u.name}" (${u.email})? Tindakan ini tidak dapat dibatalkan.`,
                                      )
                                    ) {
                                      deleteMutation.mutate(u.id);
                                    }
                                  }}
                                  disabled={deleteMutation.isPending}
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                                  title="Hapus Pengguna"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <EmptyState
              title="Tidak ada pengguna"
              description="Belum ada pengguna yang sesuai dengan pencarian atau filter Anda."
            />
          )
        ) : null}
      </div>

      {/* Success Account Created Notification Modal with Credentials */}
      {createdAccountInfo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-border bg-background shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600">
                  <Check className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-foreground">Akun Berhasil Didaftarkan</h2>
              </div>
              <button
                type="button"
                onClick={() => setCreatedAccountInfo(null)}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-softgray text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2.5">
              <p className="text-xs text-foreground font-medium">
                Akun pengguna baru telah dibuat dan langsung berstatus <strong>Aktif</strong>.
                Pengguna dapat langsung login dengan kredensial berikut:
              </p>

              <div className="bg-background/80 rounded-xl p-3 border border-border space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Nama:</span>
                  <span className="font-bold text-foreground font-sans">{createdAccountInfo.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Role:</span>
                  <span className="font-bold text-primary font-sans">{createdAccountInfo.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Email:</span>
                  <span className="font-bold text-foreground">{createdAccountInfo.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Password:</span>
                  <span className="font-bold text-foreground">{createdAccountInfo.password}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => handleCopyCredentials(createdAccountInfo)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary text-secondary-foreground px-4 py-2 text-xs font-semibold hover:bg-softgray transition-colors"
              >
                {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedKey ? "Tersalin!" : "Salin Kredensial"}
              </button>
              <button
                type="button"
                onClick={() => setCreatedAccountInfo(null)}
                className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:opacity-90 transition-opacity"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Create User Modal */}
      {createModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-background shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Buat Akun Pengguna Baru</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Daftarkan akun Administrator pusat atau Guru pembimbing sekolah
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-softgray text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} noValidate className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso, M.Pd / Muzaki"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Email Akun *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh@sekolah.sch.id / nama@perusahaan.com"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Password Awal * (Min 6 Karakter)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-border bg-background pl-3.5 pr-10 py-2 text-xs outline-none focus:border-ai transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Peran Akun (Role) *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "ADMIN" | "GURU")}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                >
                  <option value="GURU">Guru Sekolah (Pembimbing Magang)</option>
                  <option value="ADMIN">Admin (Akses Wilayah / Pusat)</option>
                </select>
              </div>

              {role === "GURU" ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Sekolah Penugasan *
                  </label>
                  <select
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  >
                    <option value="">Pilih Sekolah...</option>
                    {(schools ?? []).map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-[11px] text-muted-foreground">
                  💡 <strong>Admin</strong> memiliki akses setara Super Admin ke seluruh data
                  magang, siswa, sekolah, dan perusahaan tanpa terikat sekolah penugasan tertentu,
                  namun tidak dapat mengelola akun pengguna.
                </div>
              )}

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
                  className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-border bg-background shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground truncate">
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

            <form onSubmit={handleEditSubmit} noValidate className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Nama Pengguna *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Peran (Role)</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as "ADMIN" | "GURU")}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  >
                    <option value="GURU">Guru Sekolah</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Status Akun</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  >
                    <option value="ACTIVE">Aktif (ACTIVE)</option>
                    <option value="INACTIVE">Non-Aktif (INACTIVE)</option>
                  </select>
                </div>
              </div>

              {editRole === "GURU" ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Sekolah Penugasan</label>
                  <select
                    value={editSchoolId || ""}
                    onChange={(e) => setEditSchoolId(e.target.value || null)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs outline-none focus:border-ai transition-colors"
                  >
                    <option value="">Pilih Sekolah...</option>
                    {(schools ?? []).map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-[11px] text-muted-foreground">
                  💡 <strong>Admin</strong> memiliki akses seluruh data regional tanpa ikatan
                  sekolah khusus.
                </div>
              )}

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
                  className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
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

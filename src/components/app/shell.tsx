import { useState, useTransition, type ReactNode, useEffect, useRef } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Menu,
  X,
  Sparkles,
  LogOut,
  Search,
  LayoutDashboard,
  FileText,
  Users,
  GraduationCap,
  Building2,
  TrendingUp,
  Award,
  UserCog,
  CalendarCheck,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Shield,
  School,
  BookOpen,
  Compass,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMe, globalSearch, listSchools, updateTeacherProfileFn } from "@/lib/api.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function useMe() {
  const fetchMe = useServerFn(getMe);
  return useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
}

export const adminNav = [
  { to: "/app/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/admin/curriculum", label: "Analisis Kurikulum AI", icon: BookOpen },
  { to: "/app/admin/recommendations", label: "Smart Matching AI", icon: Compass },
  { to: "/app/admin/internships", label: "Pengajuan Magang", icon: FileText },
  { to: "/app/admin/students", label: "Data Siswa", icon: Users },
  { to: "/app/admin/schools", label: "Data Sekolah", icon: School },
  { to: "/app/admin/companies", label: "Perusahaan Mitra", icon: Building2 },
  { to: "/app/admin/performance", label: "Performa AI", icon: Award },
  { to: "/app/admin/forecasting", label: "Forecasting AI", icon: TrendingUp },
  { to: "/app/admin/users", label: "Manajemen User", icon: UserCog },
];

export const guruNav = [
  { to: "/app/guru/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/admin/curriculum", label: "Analisis Kurikulum AI", icon: BookOpen },
  { to: "/app/admin/recommendations", label: "Smart Matching AI", icon: Compass },
  { to: "/app/guru/students", label: "Data Siswa", icon: Users },
  { to: "/app/guru/internships", label: "Pengajuan Magang", icon: FileText },
  { to: "/app/guru/monitoring", label: "Monitoring & Log", icon: CalendarCheck },
  { to: "/app/guru/evaluations", label: "Penilaian Magang", icon: Award },
];

export function AppShell({
  children,
  title,
  actions,
}: {
  children: ReactNode;
  title: string;
  actions?: ReactNode;
}) {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = me?.role === "ADMIN" ? adminNav : guruNav;

  const updateProfile = useServerFn(updateTeacherProfileFn);

  const isProfileIncomplete =
    me?.role === "GURU" && me?.email !== "guru@example.com" && (!me?.phone || !me?.position);

  useEffect(() => {
    if (isProfileIncomplete) {
      setShowCompleteProfileModal(true);
    }
  }, [isProfileIncomplete]);

  useEffect(() => {
    if (typeof window !== "undefined" && me?.id) {
      const pendingRaw = sessionStorage.getItem("pending_teacher_profile");
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw);
          sessionStorage.removeItem("pending_teacher_profile");
          updateProfile({
            data: {
              name: pending.name,
              schoolId: pending.school_id,
              position: pending.position,
              phone: pending.phone,
              email: pending.email,
            },
          }).then(() => {
            queryClient.invalidateQueries({ queryKey: ["me"] });
            toast.success("Pendaftaran akun guru dengan Google berhasil!");
          });
        } catch (e) {
          console.warn("Failed parsing pending profile:", e);
        }
      }
    }
  }, [me?.id]);

  const runSearch = useServerFn(globalSearch);
  const { data: searchResults, isFetching: searchLoading } = useQuery({
    queryKey: ["global-search", searchDebounced],
    queryFn: () => runSearch({ data: { q: searchDebounced } }),
    enabled: searchDebounced.trim().length >= 2,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  return (
    <div className="min-h-screen bg-offwhite text-foreground flex flex-col">
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-background flex flex-col p-4 transition-transform duration-200 lg:static lg:translate-x-0",
            open ? "translate-x-0 shadow-xl" : "-translate-x-full",
          )}
        >
          {/* Brand Header */}
          <Link
            to={me?.role === "ADMIN" ? "/app/admin/dashboard" : "/app/guru/dashboard"}
            className="flex items-center gap-2.5 px-2 pb-6 border-b border-border hover:opacity-90 transition-opacity"
          >
            <img
              src="/vokasi.png"
              alt="Logo Program Vokasi Sekolah"
              className="h-8 w-8 shrink-0 object-contain rounded-xl"
            />
            <div>
              <span className="text-[15px] font-bold tracking-tight block leading-none">
                Program Vokasi Sekolah
              </span>
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                {me?.role === "ADMIN" ? "Admin Panel" : "Portal Guru"}
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1 py-4 overflow-y-auto">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-softgray hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-primary-foreground" : "text-muted-foreground",
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile Footer */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-softgray/60 mb-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                {me?.name ? me.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate leading-tight">
                  {me?.name || "Memuat..."}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {me?.role === "ADMIN" ? "Administrator" : me?.schoolName || "Guru"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" /> Keluar
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <div className="min-w-0 flex-1 flex flex-col">
          {/* Demo Mode Notice Banner */}
          {me?.isDemo ? (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 animate-pulse" />
              <span>
                <strong>Mode Akun Demo (Lihat Saja):</strong> Anda sedang menguji coba mode demo
                (View Only). Pengubahan data dinonaktifkan. Gunakan akun admin (
                <strong>saga7o</strong>) untuk akses edit penuh.
              </span>
            </div>
          ) : null}

          {/* Header */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-4 sm:px-6 py-3 backdrop-blur">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label="Menu"
                className="grid h-9 w-9 place-items-center rounded-lg border border-border lg:hidden hover:bg-softgray"
              >
                {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
              <div>
                <h1 className="truncate text-base sm:text-lg font-bold tracking-tight">{title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Global Search Trigger */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-border bg-softgray/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-softgray hover:text-foreground transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Cari siswa, sekolah, mitra...</span>
                <span className="inline md:hidden">Cari</span>
                <kbd className="hidden md:inline-block rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono">
                  ⌘K
                </kbd>
              </button>

              {/* User Profile & Logout Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl border border-border bg-background p-1.5 pr-2.5 hover:bg-softgray transition-colors"
                >
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                    {me?.name ? me.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold leading-none">{me?.name || "Pengguna"}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 font-medium">
                      {me?.role === "ADMIN" ? "Administrator" : me?.schoolName || "Guru"}
                    </p>
                  </div>
                </button>

                {userMenuOpen ? (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl border border-border bg-background p-2.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-2 border-b border-border mb-1 space-y-1">
                        <p className="text-xs font-bold truncate">{me?.name || "Pengguna"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{me?.email}</p>
                        {me?.position ? (
                          <p className="text-[11px] font-medium text-foreground truncate">
                            💼 {me.position}
                          </p>
                        ) : null}
                        {me?.schoolName ? (
                          <p className="text-[11px] text-muted-foreground truncate">
                            🏫 {me.schoolName}
                          </p>
                        ) : null}
                        {me?.phone ? (
                          <p className="text-[11px] text-muted-foreground truncate">
                            📞 {me.phone}
                          </p>
                        ) : null}
                        <div className="pt-1">
                          <span className="inline-block rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold uppercase">
                            {me?.role === "ADMIN" ? "Admin Pusat" : "Guru Pembimbing"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          signOut();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Keluar (Logout)</span>
                      </button>
                    </div>
                  </>
                ) : null}
              </div>

              {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
            </div>
          </header>

          {/* Main Content */}
          <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 flex-1">{children}</main>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {open ? (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden"
        />
      ) : null}

      {/* Complete Profile Modal for Google users */}
      {showCompleteProfileModal ? (
        <CompleteProfileModal me={me} onClose={() => setShowCompleteProfileModal(false)} />
      ) : null}

      {/* Global Search Modal */}
      {searchOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama siswa, sekolah, atau perusahaan..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
                className="grid h-6 w-6 place-items-center rounded hover:bg-softgray text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-3 space-y-3">
              {searchLoading ? (
                <p className="text-center py-6 text-xs text-muted-foreground">Mencari...</p>
              ) : null}

              {!searchLoading && searchQuery.trim().length < 2 ? (
                <p className="text-center py-6 text-xs text-muted-foreground">
                  Ketik minimal 2 karakter untuk memulai pencarian.
                </p>
              ) : null}

              {!searchLoading &&
              searchQuery.trim().length >= 2 &&
              !searchResults?.students.length &&
              !searchResults?.schools.length &&
              !searchResults?.companies.length ? (
                <p className="text-center py-6 text-xs text-muted-foreground">
                  Tidak ada hasil yang ditemukan untuk "{searchQuery}".
                </p>
              ) : null}

              {searchResults?.students.length ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">
                    Siswa ({searchResults.students.length})
                  </p>
                  <div className="space-y-1">
                    {searchResults.students.map((s) => (
                      <Link
                        key={s.id}
                        to={me?.role === "ADMIN" ? "/app/admin/students" : "/app/guru/students"}
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-xs hover:bg-softgray transition-colors"
                      >
                        <div>
                          <span className="font-medium block">{s.name}</span>
                          <span className="text-muted-foreground text-[11px]">
                            NIS: {s.student_number} • {s.competency}
                          </span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {searchResults?.schools.length ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">
                    Sekolah ({searchResults.schools.length})
                  </p>
                  <div className="space-y-1">
                    {searchResults.schools.map((sc) => (
                      <Link
                        key={sc.id}
                        to="/app/admin/schools"
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-xs hover:bg-softgray transition-colors"
                      >
                        <div>
                          <span className="font-medium block">{sc.name}</span>
                          <span className="text-muted-foreground text-[11px]">
                            {sc.city || "Indonesia"}
                          </span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {searchResults?.companies.length ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">
                    Perusahaan Mitra ({searchResults.companies.length})
                  </p>
                  <div className="space-y-1">
                    {searchResults.companies.map((c) => (
                      <Link
                        key={c.id}
                        to="/app/admin/companies"
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-xs hover:bg-softgray transition-colors"
                      >
                        <div>
                          <span className="font-medium block">{c.name}</span>
                          <span className="text-muted-foreground text-[11px]">
                            {c.city || "Indonesia"}
                          </span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Card({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-border bg-background p-5 shadow-xs transition-shadow hover:shadow-soft",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "ai" | "good" | "warn";
}) {
  return (
    <Card className="flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              "grid h-8 w-8 place-items-center rounded-xl",
              variant === "ai" && "bg-ai-soft text-ai",
              variant === "good" && "bg-good/15 text-good",
              variant === "warn" && "bg-warn/15 text-warn",
              variant === "default" && "bg-softgray text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <div className="mt-3">
        <p className="font-display text-3xl font-extrabold tracking-tight">{value}</p>
        {hint ? <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p> : null}
      </div>
    </Card>
  );
}

const statusStyles: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-softgray text-muted-foreground" },
  SUBMITTED: { label: "Diajukan", className: "bg-warn/20 text-warn font-semibold" },
  APPROVED: { label: "Disetujui", className: "bg-good/15 text-good font-semibold" },
  ACTIVE: { label: "Aktif Magang", className: "bg-ai-soft text-ai font-semibold" },
  COMPLETED: { label: "Selesai", className: "bg-good/20 text-good font-semibold" },
  REJECTED: { label: "Ditolak", className: "bg-destructive/15 text-destructive font-semibold" },
  CANCELLED: { label: "Dibatalkan", className: "bg-softgray text-muted-foreground" },
  PRESENT: { label: "Hadir", className: "bg-good/20 text-good" },
  LATE: { label: "Terlambat", className: "bg-warn/20 text-warn" },
  ABSENT: { label: "Alpa", className: "bg-destructive/20 text-destructive" },
  EXCUSED: { label: "Izin / Sakit", className: "bg-ai-soft text-ai" },
  INACTIVE: { label: "Non-Aktif", className: "bg-softgray text-muted-foreground" },
};

export function StatusBadge({ status }: { status: string }) {
  const info = statusStyles[status] ?? {
    label: status,
    className: "bg-softgray text-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-none",
        info.className,
      )}
    >
      {info.label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center flex flex-col items-center justify-center">
      <p className="text-sm font-semibold">{title}</p>
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Loading({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-softgray/80" />
      ))}
    </div>
  );
}

export function CompleteProfileModal({ me, onClose }: { me: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const fetchSchools = useServerFn(listSchools);
  const updateProfile = useServerFn(updateTeacherProfileFn);

  const { data: schools } = useQuery({
    queryKey: ["schools-list"],
    queryFn: () => fetchSchools(),
  });

  const [name, setName] = useState(me?.name || "");
  const [schoolId, setSchoolId] = useState(me?.schoolId || "");
  const [position, setPosition] = useState(me?.position || "Guru Pembimbing Magang");
  const [phone, setPhone] = useState(me?.phone || "");
  const [email, setEmail] = useState(me?.email || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const selSchool = schoolId || (schools?.[0]?.id ?? "");

    if (!name.trim() || !selSchool || !position.trim() || !phone.trim() || !email.trim()) {
      setError("Semua bidang bertanda wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        data: {
          name: name.trim(),
          schoolId: selSchool,
          position: position.trim(),
          phone: phone.trim(),
          email: email.trim(),
        },
      });
      toast.success("Profil Guru berhasil dilengkapi!");
      queryClient.invalidateQueries({ queryKey: ["me"] });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan data profil guru.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-ai-soft text-ai">
            <UserCog className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">Lengkapi Data Profil Guru</h3>
            <p className="text-xs text-muted-foreground">
              Silakan lengkapi data resmi Anda untuk mulai mengelola magang siswa.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3 text-xs">
          <label className="grid gap-1 font-medium">
            Nama Lengkap &amp; Gelar <span className="text-destructive">*</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Drs. Budi Santoso, M.Pd."
              className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-ai"
            />
          </label>

          <label className="grid gap-1 font-medium">
            Asal Sekolah Mitra <span className="text-destructive">*</span>
            <select
              required
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-ai font-medium"
            >
              <option value="">-- Pilih Sekolah Mitra --</option>
              {(schools ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.city})
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 font-medium">
            Jabatan / Peran di Sekolah <span className="text-destructive">*</span>
            <input
              type="text"
              required
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="misal: Guru Pembimbing Magang / Kaprog"
              className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-ai"
            />
          </label>

          <label className="grid gap-1 font-medium">
            Nomor Telepon (WhatsApp &amp; Telegram) <span className="text-destructive">*</span>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="081234567890"
              className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-ai"
            />
          </label>

          <label className="grid gap-1 font-medium">
            Email Sekolah / Resmi <span className="text-destructive">*</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="guru@smk.sch.id"
              className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-ai"
            />
          </label>

          {error ? (
            <div className="rounded-xl bg-destructive/10 p-2.5 text-xs text-destructive font-medium">
              {error}
            </div>
          ) : null}

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Menyimpan Data..." : "Simpan Data Guru"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

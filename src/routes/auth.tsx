import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles,
  Shield,
  GraduationCap,
  ArrowRight,
  User,
  School,
  Briefcase,
  Phone,
  Mail,
  Lock,
  UserPlus,
  LogIn,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listSchools } from "@/lib/api.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const title = "Masuk & Pendaftaran — VokasiFlow AI";
const description = "Masuk dan pendaftaran akun guru pembimbing magang vokasi di VokasiFlow AI.";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: (search["mode"] as "login" | "register") || "login",
  }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const fetchSchools = useServerFn(listSchools);

  const [authMode, setAuthMode] = useState<"login" | "register">(
    searchParams["mode"] === "register" ? "register" : "login",
  );

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register form state (Guru Profile Data)
  const [regName, setRegName] = useState("");
  const [regSchoolId, setRegSchoolId] = useState("");
  const [regPosition, setRegPosition] = useState("Guru Pembimbing Magang");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: schools } = useQuery({
    queryKey: ["schools-list"],
    queryFn: () => fetchSchools(),
  });

  async function handleLogin(targetEmail?: string, targetPassword?: string) {
    const emailVal = (targetEmail || email).trim().toLowerCase();
    const passVal = targetPassword || password;

    setError(null);
    if (!emailVal || !passVal) {
      setError("Email dan password wajib diisi.");
      return;
    }

    setLoading(true);

    // 1. Attempt standard signInWithPassword
    let { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailVal,
      password: passVal,
    });

    // 2. Fallback auto-signup if user doesn't exist in Supabase Auth yet
    if (signInError) {
      const displayName = emailVal === "admin@example.com" ? "Admin Pusat" : "Guru Pembimbing";
      await supabase.auth.signUp({
        email: emailVal,
        password: passVal,
        options: {
          data: { name: displayName },
        },
      });

      const retry = await supabase.auth.signInWithPassword({
        email: emailVal,
        password: passVal,
      });
      signInError = retry.error;
    }

    if (!signInError) {
      try {
        await supabase.rpc("setup_demo_user" as never, { target_email: emailVal } as never);
      } catch (e) {
        console.warn("setup_demo_user warning:", e);
      }
    }

    setLoading(false);

    if (signInError) {
      setError(signInError.message || "Email atau password salah.");
      return;
    }

    toast.success("Berhasil masuk ke portal!");
    navigate({ to: "/app", replace: true });
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanEmail = regEmail.trim().toLowerCase();
    const selectedSchool = regSchoolId || (schools?.[0]?.id ?? "");

    if (!regName.trim() || !cleanEmail || !regPassword || !selectedSchool) {
      setError("Semua bidang bertanda wajib diisi.");
      return;
    }

    if (regPassword.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setLoading(true);

    // Register account via Supabase Auth with metadata (Auto-role GURU in trigger)
    const { error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: regPassword,
      options: {
        data: {
          name: regName.trim(),
          phone: regPhone.trim(),
          position: regPosition.trim() || "Guru Pembimbing Magang",
          school_id: selectedSchool,
        },
      },
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message || "Gagal melakukan pendaftaran akun guru.");
      return;
    }

    // Immediately sign in after successful registration
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: regPassword,
    });

    setLoading(false);

    if (signInError) {
      toast.success("Akun guru berhasil dibuat! Silakan masuk.");
      setAuthMode("login");
      setEmail(cleanEmail);
      setPassword(regPassword);
      return;
    }

    toast.success("Pendaftaran guru berhasil! Selamat datang di VokasiFlow AI.");
    navigate({ to: "/app", replace: true });
  }

  async function onLoginSubmit(event: React.FormEvent) {
    event.preventDefault();
    await handleLogin();
  }

  function setDemoAdmin() {
    setEmail("admin@example.com");
    setPassword("Admin123!");
    handleLogin("admin@example.com", "Admin123!");
  }

  function setDemoGuru() {
    setEmail("guru@example.com");
    setPassword("Guru123!");
    handleLogin("guru@example.com", "Guru123!");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-offwhite px-4 py-8">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-background p-6 sm:p-8 shadow-soft">
        {/* Header Logo */}
        <Link to="/" className="mb-5 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Sparkles className="h-4.5 w-4.5 text-accent" aria-hidden />
          </span>
          <div>
            <span className="text-base font-bold tracking-tight block leading-tight">
              VokasiFlow AI
            </span>
            <span className="text-[10px] text-muted-foreground font-mono uppercase">
              Portal Magang Vokasi
            </span>
          </div>
        </Link>

        {/* Mode Selector Tabs (Sign In / Sign Up) */}
        <div className="grid grid-cols-2 rounded-2xl bg-softgray p-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setAuthMode("login");
              setError(null);
            }}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all",
              authMode === "login"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Masuk (Sign In)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("register");
              setError(null);
            }}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all",
              authMode === "register"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Daftar Guru (Sign Up)</span>
          </button>
        </div>

        {authMode === "login" ? (
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight">
              Masuk ke Portal Magang
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Akses dashboard manajemen magang untuk Administrator dan Guru.
            </p>

            {/* Demo Fast Login Buttons */}
            <div className="mt-5 rounded-2xl border border-border bg-softgray/50 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Akun Uji Coba Demo:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={setDemoAdmin}
                  className="flex items-center gap-2 rounded-xl border border-border bg-background p-2.5 text-left text-xs font-medium hover:border-ai hover:bg-ai-soft/30 transition-all group"
                >
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary group-hover:bg-ai group-hover:text-white transition-colors">
                    <Shield className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight">Admin Demo</p>
                    <p className="text-[10px] text-muted-foreground truncate">admin@example.com</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={setDemoGuru}
                  className="flex items-center gap-2 rounded-xl border border-border bg-background p-2.5 text-left text-xs font-medium hover:border-ai hover:bg-ai-soft/30 transition-all group"
                >
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary group-hover:bg-ai group-hover:text-white transition-colors">
                    <GraduationCap className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight">Guru Demo</p>
                    <p className="text-[10px] text-muted-foreground truncate">guru@example.com</p>
                  </div>
                </button>
              </div>
            </div>

            <form onSubmit={onLoginSubmit} className="mt-5 grid gap-3.5">
              <label className="grid gap-1.5 text-xs font-medium">
                Email
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@sekolah.sch.id"
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pl-9 text-xs outline-none transition-colors focus:border-ai focus:ring-2 focus:ring-ai/20"
                  />
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </label>
              <label className="grid gap-1.5 text-xs font-medium">
                Password
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pl-9 text-xs outline-none transition-colors focus:border-ai focus:ring-2 focus:ring-ai/20"
                  />
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </label>

              {error ? (
                <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive font-medium">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Memverifikasi..." : "Masuk ke Sistem"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight">
              Pendaftaran Guru Baru
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Daftarkan akun guru pembimbing untuk mengelola siswa dan pengajuan magang.
            </p>

            <form onSubmit={handleRegister} className="mt-5 grid gap-3.5">
              {/* Nama Guru */}
              <label className="grid gap-1.5 text-xs font-medium">
                Nama Lengkap &amp; Gelar <span className="text-destructive">*</span>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Drs. Budi Santoso, M.Pd."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pl-9 text-xs outline-none transition-colors focus:border-ai focus:ring-2 focus:ring-ai/20"
                  />
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </label>

              {/* Asal Sekolah */}
              <label className="grid gap-1.5 text-xs font-medium">
                Asal Sekolah <span className="text-destructive">*</span>
                <div className="relative">
                  <select
                    required
                    value={regSchoolId}
                    onChange={(e) => setRegSchoolId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pl-9 text-xs outline-none transition-colors focus:border-ai focus:ring-2 focus:ring-ai/20 font-medium"
                  >
                    <option value="">-- Pilih Sekolah Mitra --</option>
                    {(schools ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.city})
                      </option>
                    ))}
                  </select>
                  <School className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </label>

              {/* Jabatan di Sekolah */}
              <label className="grid gap-1.5 text-xs font-medium">
                Jabatan / Peran di Sekolah <span className="text-destructive">*</span>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={regPosition}
                    onChange={(e) => setRegPosition(e.target.value)}
                    placeholder="misal: Guru Pembimbing Magang / Kaprog TKJ"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pl-9 text-xs outline-none transition-colors focus:border-ai focus:ring-2 focus:ring-ai/20"
                  />
                  <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </label>

              {/* Nomor Telepon */}
              <label className="grid gap-1.5 text-xs font-medium">
                Nomor WhatsApp / Telepon
                <div className="relative">
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pl-9 text-xs outline-none transition-colors focus:border-ai focus:ring-2 focus:ring-ai/20"
                  />
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </label>

              {/* Email */}
              <label className="grid gap-1.5 text-xs font-medium">
                Email Sekolah / Resmi <span className="text-destructive">*</span>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="guru@smk.sch.id"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pl-9 text-xs outline-none transition-colors focus:border-ai focus:ring-2 focus:ring-ai/20"
                  />
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </label>

              {/* Password */}
              <label className="grid gap-1.5 text-xs font-medium">
                Password <span className="text-destructive">*</span>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pl-9 text-xs outline-none transition-colors focus:border-ai focus:ring-2 focus:ring-ai/20"
                  />
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </label>

              {error ? (
                <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive font-medium">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Mendaftarkan Akun Guru..." : "Daftar Akun Guru Sekarang"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

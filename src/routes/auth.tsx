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
import {
  listPublicSchools,
  registerTeacherAccount,
  confirmUserEmailFn,
} from "@/lib/api.functions";
import { DUMMY_SCHOOLS } from "@/lib/demo-data";
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

// Feature Flag: Ubah ke `true` jika ke depannya ingin mengaktifkan kembali tombol masuk/daftar via Akun Google
const ENABLE_GOOGLE_AUTH = false;

function AuthPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const fetchPublicSchools = useServerFn(listPublicSchools);
  const registerTeacherFn = useServerFn(registerTeacherAccount);
  const confirmEmailServerFn = useServerFn(confirmUserEmailFn);
  const loginOrSyncSuperAdminFn = useServerFn(loginOrSyncSuperAdmin);

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

  const { data: schools, isLoading: isSchoolsLoading } = useQuery({
    queryKey: ["public-schools-list"],
    queryFn: async () => {
      try {
        const res = await fetchPublicSchools();
        if (res && res.length > 0) return res;
      } catch (err) {
        console.warn("fetchPublicSchools serverFn error:", err);
      }
      return DUMMY_SCHOOLS;
    },
    staleTime: 1000 * 60 * 5,
  });

  async function handleLogin(targetEmail?: string, targetPassword?: string) {
    let emailVal = (targetEmail || email).trim().toLowerCase();
    if (emailVal === "saga7o") {
      emailVal = "saga7o@example.com";
    }
    const passVal = targetPassword || password;

    setError(null);
    if (!emailVal || !passVal) {
      setError("Email dan password wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      // 1. Attempt standard signInWithPassword
      let { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailVal,
        password: passVal,
      });

      // 2. If email is not confirmed yet (e.g. accounts created by Super Admin), auto confirm and retry immediately!
      if (
        signInError &&
        (signInError.message?.toLowerCase().includes("email not confirmed") ||
          signInError.message?.toLowerCase().includes("not confirmed"))
      ) {
        try {
          await supabase.rpc("confirm_user_email" as never, { target_email: emailVal } as never);
          await confirmEmailServerFn({ data: { email: emailVal } });
          const retryConfirm = await supabase.auth.signInWithPassword({
            email: emailVal,
            password: passVal,
          });
          if (!retryConfirm.error) {
            signInError = null;
          }
        } catch (e) {
          console.warn("Auto confirm error:", e);
        }
      }

      // 3. Fallback auto-sync for Super Admin / Admin accounts if credentials mismatch
      if (
        signInError &&
        (signInError.message?.toLowerCase().includes("invalid login credentials") ||
          signInError.message?.toLowerCase().includes("user not found"))
      ) {
        try {
          const syncRes = await loginOrSyncSuperAdminFn({
            data: { email: emailVal, password: passVal },
          });
          if (syncRes?.synced) {
            const retrySync = await supabase.auth.signInWithPassword({
              email: emailVal,
              password: passVal,
            });
            if (!retrySync.error) {
              signInError = null;
            }
          }
        } catch (syncEx) {
          console.warn("loginOrSyncSuperAdmin exception:", syncEx);
        }

        if (signInError) {
          let displayName =
            emailVal === "saga7o@example.com"
              ? "saga7o (Super Admin)"
              : emailVal === "admin@example.com"
                ? "Admin Pusat"
                : "Pengguna VokasiFlow";

          try {
            const { data: existingProf } = await supabase
              .from("profiles")
              .select("name")
              .eq("email", emailVal)
              .maybeSingle();
            if (existingProf?.name) {
              displayName = existingProf.name;
            }
          } catch {}

          try {
            await supabase.auth.signUp({
              email: emailVal,
              password: passVal,
              options: {
                data: { name: displayName },
              },
            });

            // Confirm immediately
            try {
              await supabase.rpc("confirm_user_email" as never, { target_email: emailVal } as never);
              await confirmEmailServerFn({ data: { email: emailVal } });
            } catch {}

            const retry = await supabase.auth.signInWithPassword({
              email: emailVal,
              password: passVal,
            });
            if (!retry.error) {
              signInError = null;
            }
          } catch {
            // ignore signup fallback error
          }
        }
      }

      if (signInError) {
        if (
          signInError.message?.toLowerCase().includes("email not confirmed") ||
          signInError.message?.toLowerCase().includes("not confirmed")
        ) {
          try {
            await supabase.auth.resend({
              type: "signup",
              email: emailVal,
            });
            toast.info(`Tautan verifikasi telah dikirim ke ${emailVal}.`);
          } catch {}

          setError(
            `Email akun (${emailVal}) belum diverifikasi. Tautan konfirmasi telah dikirim ke email Anda (cek kotak Masuk atau Spam). Silakan klik tautan verifikasi tersebut untuk mengaktifkan akun.`,
          );
        } else {
          setError(signInError.message || "Email atau password salah.");
        }
        return;
      }

      // 4. Setup admin / demo role in database (non-blocking)
      try {
        if (emailVal === "saga7o@example.com") {
          await supabase.rpc("setup_saga7o_admin" as never);
        } else if (emailVal === "admin@example.com" || emailVal === "guru@example.com") {
          await supabase.rpc("setup_demo_user" as never, { target_email: emailVal } as never);
        }
      } catch (e) {
        console.warn("setup user warning:", e);
      }

      toast.success("Berhasil masuk ke portal!");
      // Hard refresh navigation to ensure auth session cookies/storage are immediately available
      window.location.href = "/app";
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err?.message || "Terjadi kesalahan saat masuk. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanEmail = regEmail.trim().toLowerCase();
    const availableSchools = schools && schools.length > 0 ? schools : DUMMY_SCHOOLS;
    const selectedSchool = regSchoolId || (availableSchools[0]?.id ?? "");

    if (!regName.trim() || !cleanEmail || !regPassword || !selectedSchool) {
      setError("Semua bidang bertanda wajib diisi.");
      return;
    }

    if (regPassword.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setLoading(true);
    try {
      // 1. Register teacher via server function (ensures pre-confirmed account & profile creation)
      await registerTeacherFn({
        data: {
          name: regName.trim(),
          email: cleanEmail,
          password: regPassword,
          phone: regPhone.trim(),
          position: regPosition.trim() || "Guru Pembimbing Magang",
          schoolId: selectedSchool,
        },
      });

      // 2. Immediately sign in with credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: regPassword,
      });

      if (signInError) {
        toast.success("Akun guru berhasil dibuat! Silakan masuk.");
        setAuthMode("login");
        setEmail(cleanEmail);
        setPassword(regPassword);
        return;
      }

      toast.success("Pendaftaran guru berhasil! Selamat datang di VokasiFlow AI.");
      window.location.href = "/app";
    } catch (err: any) {
      console.error("Register error:", err);
      // Fallback: If server function threw, attempt client-side signup
      try {
        const { error: fallbackSignUpErr } = await supabase.auth.signUp({
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
        if (!fallbackSignUpErr) {
          toast.success("Pendaftaran berhasil! Silakan masuk.");
          setAuthMode("login");
          setEmail(cleanEmail);
          setPassword(regPassword);
          return;
        }
      } catch {}

      setError(err?.message || "Gagal melakukan pendaftaran akun guru. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });

      if (oauthError) {
        setError(oauthError.message || "Gagal otentikasi akun Google.");
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan otentikasi Google.";
      setError(msg);
      setLoading(false);
    }
  }

  async function handleGoogleRegister() {
    setError(null);

    const cleanEmail = regEmail.trim().toLowerCase();
    const availableSchools = schools && schools.length > 0 ? schools : DUMMY_SCHOOLS;
    const selectedSchool = regSchoolId || (availableSchools[0]?.id ?? "");

    if (!regName.trim()) {
      setError("Silakan isi Nama Lengkap & Gelar Anda terlebih dahulu.");
      return;
    }
    if (!selectedSchool) {
      setError("Silakan pilih Asal Sekolah Mitra Anda.");
      return;
    }
    if (!regPosition.trim()) {
      setError("Silakan isi Jabatan / Peran di Sekolah Anda.");
      return;
    }
    if (!regPhone.trim()) {
      setError("Silakan isi Nomor WhatsApp / Telegram Anda.");
      return;
    }
    if (!cleanEmail) {
      setError("Silakan isi Email Sekolah / Resmi Anda.");
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "pending_teacher_profile",
        JSON.stringify({
          name: regName.trim(),
          school_id: selectedSchool,
          position: regPosition.trim() || "Guru Pembimbing Magang",
          phone: regPhone.trim(),
          email: cleanEmail,
        }),
      );
    }

    setLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });

      if (oauthError) {
        setError(oauthError.message || "Gagal melakukan pendaftaran via Google.");
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan pendaftaran Google.";
      setError(msg);
      setLoading(false);
    }
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
          <img
            src="/vokasi.png"
            alt="Logo Program Vokasi Sekolah"
            className="h-9 w-9 shrink-0 object-contain rounded-xl"
          />
          <div>
            <span className="text-base font-bold tracking-tight block leading-tight">
              Program Vokasi Sekolah
            </span>
            <span className="text-[10px] text-muted-foreground font-mono uppercase">
              Portal Magang Vokasi
            </span>
          </div>
        </Link>

        {/* Mode Selector Tabs (Sign In / Sign Up) */}
        <div
          role="tablist"
          aria-label="Pilihan autentikasi"
          className="grid grid-cols-2 rounded-2xl bg-softgray p-1 mb-6"
        >
          <button
            type="button"
            role="tab"
            aria-selected={authMode === "login"}
            onClick={() => {
              setAuthMode("login");
              setError(null);
            }}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-ai",
              authMode === "login"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Masuk (Sign In)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={authMode === "register"}
            onClick={() => {
              setAuthMode("register");
              setError(null);
            }}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-ai",
              authMode === "register"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
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

            {/* Google OAuth Login Button (Set ENABLE_GOOGLE_AUTH = true to re-enable) */}
            {ENABLE_GOOGLE_AUTH && (
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-softgray hover:border-slate-300 transition-all disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-ai"
                >
                  <GoogleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Masuk dengan Google</span>
                </button>
                <div className="relative my-4 flex items-center justify-center" aria-hidden="true">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <span className="relative bg-background px-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    atau masuk via email
                  </span>
                </div>
              </div>
            )}

            {/* Fast Login Buttons */}
            <div className="mt-5 rounded-2xl border border-border bg-softgray/50 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Akun Uji Coba Demo:
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={setDemoAdmin}
                  aria-label="Masuk cepat sebagai Admin Demo (View Only)"
                  className="flex items-center gap-2 rounded-xl border border-border bg-background p-2.5 text-left text-xs font-medium hover:border-amber-400 hover:bg-amber-500/5 transition-all group focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight flex items-center gap-1">
                      <span>Admin Demo</span>
                      <span className="text-[9px] font-mono text-amber-600 font-bold">(View)</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">admin@example.com</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={setDemoGuru}
                  aria-label="Masuk cepat sebagai Guru Demo (View Only)"
                  className="flex items-center gap-2 rounded-xl border border-border bg-background p-2.5 text-left text-xs font-medium hover:border-amber-400 hover:bg-amber-500/5 transition-all group focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight flex items-center gap-1">
                      <span>Guru Demo</span>
                      <span className="text-[9px] font-mono text-amber-600 font-bold">(View)</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">guru@example.com</p>
                  </div>
                </button>
              </div>
            </div>

            <form onSubmit={onLoginSubmit} className="mt-5 grid gap-3.5" noValidate>
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
                    aria-required="true"
                    aria-invalid={!!error}
                    aria-describedby={error ? "auth-login-error" : undefined}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pl-9 text-xs outline-none transition-colors focus:border-ai focus:ring-2 focus:ring-ai/20 focus-visible:ring-2 focus-visible:ring-ai"
                  />
                  <Mail
                    className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
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
                    aria-required="true"
                    aria-invalid={!!error}
                    aria-describedby={error ? "auth-login-error" : undefined}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pl-9 text-xs outline-none transition-colors focus:border-ai focus:ring-2 focus:ring-ai/20 focus-visible:ring-2 focus-visible:ring-ai"
                  />
                  <Lock
                    className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              </label>

              {error ? (
                <div
                  id="auth-login-error"
                  role="alert"
                  aria-live="assertive"
                  className="rounded-xl bg-destructive/10 p-3.5 text-xs text-destructive font-medium space-y-2"
                >
                  <p className="leading-relaxed">{error}</p>
                  {(error.toLowerCase().includes("konfirmasi") ||
                    error.toLowerCase().includes("confirmed") ||
                    error.toLowerCase().includes("verifikasi")) && (
                    <button
                      type="button"
                      onClick={async () => {
                        const targetEmail = (email || "").trim().toLowerCase();
                        if (!targetEmail) {
                          toast.error("Silakan masukkan email terlebih dahulu.");
                          return;
                        }
                        try {
                          await supabase.auth.resend({
                            type: "signup",
                            email: targetEmail,
                          });
                          toast.success(
                            `Tautan aktivasi email berhasil dikirim ulang ke ${targetEmail}.`,
                          );
                        } catch (e: any) {
                          toast.error(e?.message || "Gagal mengirim ulang email.");
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary underline hover:opacity-80 transition-opacity"
                    >
                      <Mail className="h-3.5 w-3.5" /> Kirim Ulang Tautan Konfirmasi Email
                    </button>
                  )}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-ai"
              >
                {loading ? "Memverifikasi..." : "Masuk ke Sistem"}
                {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight">
              Pendaftaran Guru Baru
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {ENABLE_GOOGLE_AUTH
                ? "Lengkapi data profil guru di bawah ini, lalu pilih metode pendaftaran (Google / Email)."
                : "Lengkapi data profil guru di bawah ini untuk mendaftarkan akun."}
            </p>

            <form onSubmit={handleRegister} className="mt-5 grid gap-3.5" noValidate>
              {/* Nama Guru */}
              <label className="grid gap-1.5 text-xs font-medium">
                Nama Lengkap &amp; Gelar <span className="text-destructive">*</span>
                <div className="relative">
                  <input
                    type="text"
                    required
                    aria-required="true"
                    aria-invalid={!!error}
                    aria-describedby={error ? "auth-register-error" : undefined}
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Drs. Budi Santoso, M.Pd."
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pl-9 text-xs outline-none transition-colors focus:border-ai focus:ring-2 focus:ring-ai/20 focus-visible:ring-2 focus-visible:ring-ai"
                  />
                  <User
                    className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              </label>

              {/* Asal Sekolah */}
              <label className="grid gap-1.5 text-xs font-medium">
                Asal Sekolah Mitra <span className="text-destructive">*</span>
                <div className="relative">
                  <select
                    required
                    aria-required="true"
                    aria-invalid={!!error}
                    aria-describedby={error ? "auth-register-error" : undefined}
                    value={regSchoolId}
                    onChange={(e) => setRegSchoolId(e.target.value)}
                    disabled={isSchoolsLoading}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pl-9 pr-8 text-xs outline-none transition-colors focus:border-ai focus:ring-2 focus:ring-ai/20 focus-visible:ring-2 focus-visible:ring-ai font-medium disabled:opacity-60"
                  >
                    <option value="">
                      {isSchoolsLoading
                        ? "-- Memuat Data Sekolah Mitra... --"
                        : "-- Pilih Sekolah Mitra --"}
                    </option>
                    {(schools && schools.length > 0 ? schools : DUMMY_SCHOOLS).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.city ? `(${s.city})` : s.school_code ? `(${s.school_code})` : ""}
                      </option>
                    ))}
                  </select>
                  <School
                    className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </label>

              {/* Jabatan di Sekolah */}
              <label className="grid gap-1.5 text-xs font-medium">
                Jabatan / Peran di Sekolah <span className="text-destructive">*</span>
                <div className="relative">
                  <input
                    type="text"
                    required
                    aria-required="true"
                    aria-invalid={!!error}
                    aria-describedby={error ? "auth-register-error" : undefined}
                    value={regPosition}
                    onChange={(e) => setRegPosition(e.target.value)}
                    placeholder="misal: Guru Pembimbing Magang / Kaprog TKJ"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pl-9 text-xs outline-none transition-colors focus:border-ai focus:ring-2 focus:ring-ai/20 focus-visible:ring-2 focus-visible:ring-ai"
                  />
                  <Briefcase
                    className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              </label>

              {/* Nomor Telepon (WA / Telegram) */}
              <label className="grid gap-1.5 text-xs font-medium">
                Nomor Telepon (WhatsApp / Telegram) <span className="text-destructive">*</span>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    aria-required="true"
                    aria-invalid={!!error}
                    aria-describedby={error ? "auth-register-error" : undefined}
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pl-9 text-xs outline-none transition-colors focus:border-ai focus:ring-2 focus:ring-ai/20 focus-visible:ring-2 focus-visible:ring-ai"
                  />
                  <Phone
                    className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              </label>

              {/* Email Resmi */}
              <label className="grid gap-1.5 text-xs font-medium">
                Email Sekolah / Resmi <span className="text-destructive">*</span>
                <div className="relative">
                  <input
                    type="email"
                    required
                    aria-required="true"
                    aria-invalid={!!error}
                    aria-describedby={error ? "auth-register-error" : undefined}
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="guru@smk.sch.id"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pl-9 text-xs outline-none transition-colors focus:border-ai focus:ring-2 focus:ring-ai/20 focus-visible:ring-2 focus-visible:ring-ai"
                  />
                  <Mail
                    className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              </label>

              {/* Password */}
              <label className="grid gap-1.5 text-xs font-medium">
                {ENABLE_GOOGLE_AUTH ? "Password (Opsional jika via Google)" : "Password Akun *"}
                <div className="relative">
                  <input
                    type="password"
                    required={!ENABLE_GOOGLE_AUTH}
                    minLength={6}
                    aria-invalid={!!error}
                    aria-describedby={error ? "auth-register-error" : undefined}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pl-9 text-xs outline-none transition-colors focus:border-ai focus:ring-2 focus:ring-ai/20 focus-visible:ring-2 focus-visible:ring-ai"
                  />
                  <Lock
                    className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              </label>

              {error ? (
                <div
                  id="auth-register-error"
                  role="alert"
                  aria-live="assertive"
                  className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive font-medium"
                >
                  {error}
                </div>
              ) : null}

              {/* Submit Actions: Google vs Email Password */}
              <div className="mt-2 grid gap-2.5">
                {ENABLE_GOOGLE_AUTH && (
                  <button
                    type="button"
                    onClick={handleGoogleRegister}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2.5 rounded-full border border-border bg-background px-4 py-3 text-xs font-bold text-foreground shadow-xs hover:bg-softgray hover:border-slate-300 transition-all disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-ai"
                  >
                    <GoogleIcon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                    <span>{loading ? "Memproses..." : "Daftar dengan Akun Google"}</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-ai"
                >
                  {loading
                    ? "Mendaftarkan..."
                    : ENABLE_GOOGLE_AUTH
                      ? "Daftar dengan Password Email"
                      : "Daftar Akun Guru"}
                  {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

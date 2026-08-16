import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Sparkles, Shield, GraduationCap, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const title = "Masuk — VokasiFlow AI";
const description =
  "Masuk ke aplikasi manajemen magang vokasi VokasiFlow AI untuk admin dan guru sekolah.";

export const Route = createFileRoute("/auth")({
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
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    navigate({ to: "/app", replace: true });
  }

  async function onSubmit(event: React.FormEvent) {
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
      <div className="w-full max-w-md rounded-3xl border border-border bg-background p-7 shadow-soft">
        <Link to="/" className="mb-6 flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Sparkles className="h-4 w-4 text-accent" aria-hidden />
          </span>
          <span className="text-base font-bold tracking-tight">VokasiFlow AI</span>
        </Link>

        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          Masuk ke Portal Magang
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Sistem terpadu manajemen program magang vokasi berbasis AI.
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

        <form onSubmit={onSubmit} className="mt-5 grid gap-3.5">
          <label className="grid gap-1.5 text-xs font-medium">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@sekolah.sch.id"
              autoComplete="email"
              required
              className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ai focus:ring-2 focus:ring-ai/20"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ai focus:ring-2 focus:ring-ai/20"
            />
          </label>

          {error ? (
            <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive font-medium">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Memverifikasi..." : "Masuk ke Sistem"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}

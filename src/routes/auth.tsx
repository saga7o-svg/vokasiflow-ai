import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const title = "Masuk — VokasiFlow AI";
const description = "Masuk ke aplikasi manajemen magang vokasi VokasiFlow AI untuk admin dan guru sekolah.";

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

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError("Email atau password salah.");
      return;
    }
    navigate({ to: "/app", replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-offwhite px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-[15px] font-bold tracking-tight">VokasiFlow AI</span>
        </Link>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Masuk ke aplikasi</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Gunakan akun yang diberikan pengelola program vokasi.
        </p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-3">
          <label className="grid gap-1.5 text-[13px]">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@sekolah.sch.id"
              autoComplete="email"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ai"
            />
          </label>
          <label className="grid gap-1.5 text-[13px]">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ai"
            />
          </label>
          {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-60"
          >
            {loading ? "Memproses…" : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}

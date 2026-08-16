import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Menu, X, Sparkles, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/lib/api.functions";
import { cn } from "@/lib/utils";

export function useMe() {
  const fetchMe = useServerFn(getMe);
  return useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
}

const adminNav = [
  { to: "/app/admin/dashboard", label: "Dashboard" },
  { to: "/app/admin/internships", label: "Pengajuan Magang" },
];

const guruNav = [
  { to: "/app/guru/dashboard", label: "Dashboard" },
  { to: "/app/guru/students", label: "Siswa" },
  { to: "/app/guru/internships", label: "Pengajuan Magang" },
];

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = me?.role === "ADMIN" ? adminNav : guruNav;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-offwhite text-foreground">
      <div className="flex">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-background p-4 transition-transform lg:static lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center gap-2 pb-6">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-[15px] font-bold tracking-tight">VokasiFlow AI</span>
          </div>
          <nav className="flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm transition-colors",
                  pathname === item.to
                    ? "bg-softgray font-medium text-foreground"
                    : "text-muted-foreground hover:bg-softgray hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label="Menu"
                className="grid h-9 w-9 place-items-center rounded-lg border border-border lg:hidden"
              >
                {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
              <h1 className="truncate text-[15px] font-semibold">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-[13px] font-medium leading-tight">{me?.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {me?.role === "ADMIN" ? "Admin" : me?.schoolName ?? "Guru"}
                </p>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[13px] hover:bg-softgray"
              >
                <LogOut className="h-3.5 w-3.5" /> Keluar
              </button>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
        </div>
      </div>
      {open ? (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
        />
      ) : null}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-background p-5", className)}>{children}</div>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <p className="text-[12px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-extrabold">{value}</p>
      {hint ? <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

const statusStyles: Record<string, string> = {
  DRAFT: "bg-softgray text-muted-foreground",
  SUBMITTED: "bg-warn/15 text-warn",
  APPROVED: "bg-good/15 text-good",
  ACTIVE: "bg-ai-soft text-ai",
  COMPLETED: "bg-good/15 text-good",
  REJECTED: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-softgray text-muted-foreground",
  PRESENT: "bg-good/15 text-good",
  LATE: "bg-warn/15 text-warn",
  ABSENT: "bg-destructive/10 text-destructive",
  EXCUSED: "bg-ai-soft text-ai",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium", statusStyles[status] ?? "bg-softgray")}>
      {status}
    </span>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="mt-1 text-[13px] text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function Loading() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-softgray" />
      ))}
    </div>
  );
}

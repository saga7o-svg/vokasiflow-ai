import { useEffect, useState } from "react";
import { Menu, X, Sparkles } from "lucide-react";
import { Container, Cta } from "./primitives";
import { cn } from "@/lib/utils";

const links = [
  { label: "Produk", href: "#produk" },
  { label: "Fitur", href: "#fitur" },
  { label: "AI Insights", href: "#ai-insights" },
  { label: "Cara Kerja", href: "#cara-kerja" },
  { label: "Untuk Sekolah", href: "#peran" },
  { label: "Untuk Admin", href: "#peran" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-300",
        scrolled
          ? "border-border bg-background/85 backdrop-blur-md"
          : "border-transparent bg-background",
      )}
    >
      <Container>
        <nav
          aria-label="Navigasi utama"
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4 lg:flex lg:justify-between"
        >
          <a href="#" className="flex min-w-0 items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <span className="truncate text-[15px] font-bold tracking-tight">VokasiFlow AI</span>
          </a>

          <ul className="hidden items-center gap-7 lg:flex">
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  className="relative text-[14px] text-muted-foreground transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-foreground after:transition-all after:duration-300 hover:text-foreground hover:after:w-full"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <a
              href="#cta"
              className="hidden rounded-full px-4 py-2 text-[14px] text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              Masuk
            </a>
            <Cta href="#cta" className="hidden sm:inline-flex">
              Mulai Sekarang
            </Cta>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Tutup menu" : "Buka menu"}
              className="grid h-10 w-10 place-items-center rounded-full border border-border lg:hidden"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </nav>

        {open ? (
          <div className="border-t border-border py-4 lg:hidden">
            <ul className="flex flex-col gap-1">
              {links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-2 py-2.5 text-[15px] text-muted-foreground hover:bg-softgray hover:text-foreground"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Cta href="#cta" variant="ghost" className="flex-1">
                Masuk
              </Cta>
              <Cta href="#cta" className="flex-1">
                Mulai Sekarang
              </Cta>
            </div>
          </div>
        ) : null}
      </Container>
    </header>
  );
}
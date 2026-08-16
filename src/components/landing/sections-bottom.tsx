import {
  ArrowRight,
  Brain,
  Building2,
  ClipboardList,
  Database,
  Factory,
  GraduationCap,
  Lock,
  MapPin,
  Monitor,
  ShieldCheck,
  Smartphone,
  Tablet,
  TrendingUp,
  UserCheck,
  Users,
  Activity,
  BarChart3,
} from "lucide-react";
import illoCta from "@/assets/illo-cta.png";
import { Container, Cta, Reveal, SectionHeading } from "./primitives";
import { AdminMiniDashboard, TeacherMiniDashboard } from "./dashboards";

const steps = [
  { n: "01", title: "Input Siswa", desc: "Guru memilih siswa dan keahlian." },
  {
    n: "02",
    title: "Ajukan Penempatan",
    desc: "Profil siswa dikirim ke perusahaan mitra yang tersedia.",
  },
  { n: "03", title: "Approval", desc: "Admin menyetujui atau menolak pengajuan." },
  {
    n: "04",
    title: "Monitoring",
    desc: "Aktivitas, kehadiran, kedisiplinan, dan laporan dipantau.",
  },
  {
    n: "05",
    title: "Evaluasi & AI",
    desc: "Nilai dan aktivitas masuk ke analitik performa dan forecasting.",
  },
];

export function Workflow() {
  return (
    <section id="cara-kerja" className="py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="Cara Kerja"
          title="Dari pengajuan hingga evaluasi. Lebih sederhana."
        />
        <ol className="mt-14 grid gap-4 md:grid-cols-5">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 80}>
              <div className="relative h-full rounded-2xl border border-border bg-background p-5 transition-shadow duration-300 hover:shadow-soft">
                <span className="text-[12px] font-semibold tracking-[0.16em] text-ai">{s.n}</span>
                <h3 className="mt-3 text-[15px] font-semibold">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}

const roles = [
  {
    title: "Admin",
    subtitle: "Admin Control Center",
    items: [
      "Dashboard regional",
      "Approval penempatan",
      "School performance",
      "AI forecasting",
      "Industry demand",
      "Location recommendation",
    ],
    cta: "Lihat untuk Admin",
  },
  {
    title: "Guru",
    subtitle: "School Internship Workspace",
    items: [
      "Data siswa",
      "Pengajuan penempatan",
      "Monitoring siswa",
      "Activity reports",
      "Grades",
      "Attendance & discipline",
    ],
    cta: "Lihat untuk Guru",
  },
];

export function Roles() {
  return (
    <section id="peran" className="border-y border-border bg-offwhite py-24 sm:py-32">
      <Container>
        <SectionHeading eyebrow="Peran" title="Satu platform. Setiap peran punya kendali." />
        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          {roles.map((r, i) => (
            <Reveal key={r.title} delay={i * 100}>
              <article className="flex h-full flex-col gap-6 rounded-3xl border border-border bg-background p-6 sm:p-8">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-bold">{r.title}</h3>
                    <p className="truncate text-[13px] text-muted-foreground">{r.subtitle}</p>
                  </div>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-offwhite">
                    {i === 0 ? (
                      <ShieldCheck className="h-4 w-4" aria-hidden />
                    ) : (
                      <GraduationCap className="h-4 w-4" aria-hidden />
                    )}
                  </span>
                </div>
                {i === 0 ? <AdminMiniDashboard /> : <TeacherMiniDashboard />}
                <ul className="grid gap-2 sm:grid-cols-2">
                  {r.items.map((it) => (
                    <li
                      key={it}
                      className="flex items-center gap-2 text-[14px] text-muted-foreground"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ai" aria-hidden />
                      {it}
                    </li>
                  ))}
                </ul>
                <Cta href="#cta" variant="ghost" className="mt-auto self-start">
                  {r.cta} <ArrowRight className="h-4 w-4" />
                </Cta>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

const chain = [
  { label: "Student Data", icon: Users },
  { label: "Internship Data", icon: ClipboardList },
  { label: "Industry Evaluation", icon: Factory },
  { label: "Performance Score", icon: BarChart3 },
  { label: "AI Forecast", icon: Brain },
  { label: "Strategic Decision", icon: TrendingUp },
];

export function DataDriven() {
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="Data-driven"
          title="Bukan sekadar menyimpan data. Mengubahnya menjadi keputusan."
        />
        <Reveal delay={100} className="mx-auto mt-14 max-w-2xl">
          <ol className="relative flex flex-col gap-3">
            {chain.map((c, i) => (
              <li key={c.label} className="relative">
                <div className="flex items-center gap-4 rounded-2xl border border-border bg-background px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-offwhite">
                    <c.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 truncate text-[15px] font-medium">{c.label}</span>
                  <span className="ml-auto text-[12px] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                {i < chain.length - 1 ? (
                  <span
                    aria-hidden
                    className="mx-auto block h-3 w-px bg-hairline"
                    style={{ marginBlock: "0.25rem" }}
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </Reveal>
      </Container>
    </section>
  );
}

export function ResponsiveSection() {
  const devices = [
    { icon: Monitor, label: "Desktop", note: "Dashboard lengkap & analitik" },
    { icon: Tablet, label: "Tablet", note: "Monitoring saat kunjungan industri" },
    { icon: Smartphone, label: "Mobile", note: "Input laporan harian siswa" },
  ];
  return (
    <section className="border-y border-border bg-offwhite py-24 sm:py-32">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <SectionHeading
            align="left"
            eyebrow="Responsif"
            title="Kerja nyaman di mana saja."
            desc="Guru dapat menginput laporan dan memantau aktivitas siswa melalui perangkat desktop, tablet, maupun mobile."
          />
          <Reveal delay={100}>
            <ul className="grid gap-3">
              {devices.map((d) => (
                <li
                  key={d.label}
                  className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-2xl border border-border bg-background p-5"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-softgray">
                    <d.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold">{d.label}</p>
                    <p className="truncate text-[13px] text-muted-foreground">{d.note}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

const trust = [
  { icon: UserCheck, title: "Role-Based Access", desc: "Guru hanya melihat data sekolahnya." },
  {
    icon: Lock,
    title: "Data Privacy",
    desc: "Data siswa dilindungi dengan kontrol akses yang ketat.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Workflow",
    desc: "Persetujuan dan aktivitas tercatat dalam sistem.",
  },
];

export function Trust() {
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <SectionHeading eyebrow="Keamanan" title="Data terkelola. Akses terkendali." />
        <ul className="mt-12 grid gap-4 sm:grid-cols-3">
          {trust.map((t, i) => (
            <Reveal as="li" key={t.title} delay={i * 80}>
              <div className="h-full rounded-2xl border border-border p-6">
                <t.icon className="h-4 w-4" aria-hidden />
                <h3 className="mt-4 text-[15px] font-semibold">{t.title}</h3>
                <p className="mt-2 text-[14px] text-muted-foreground">{t.desc}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export function Impact() {
  const orgs = [
    { label: "Sekolah Vokasi", icon: GraduationCap },
    { label: "SMK", icon: GraduationCap },
    { label: "Pengelola Program", icon: ShieldCheck },
    { label: "Perusahaan Mitra", icon: Building2 },
    { label: "Industri", icon: Factory },
  ];
  const metrics = [
    { big: "1 Platform", small: "Seluruh proses magang terintegrasi" },
    { big: "360°", small: "Visibilitas program magang" },
    { big: "AI-Powered", small: "Analitik & forecasting" },
  ];
  return (
    <section className="border-y border-border bg-offwhite py-24 sm:py-32">
      <Container>
        <SectionHeading title="Dibangun untuk ekosistem vokasi yang lebih siap menghadapi industri." />
        <Reveal delay={100} className="mt-12">
          <ul className="flex flex-wrap items-center justify-center gap-3">
            {orgs.map((o) => (
              <li
                key={o.label}
                className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-[13px] text-muted-foreground"
              >
                <o.icon className="h-3.5 w-3.5" aria-hidden />
                {o.label}
              </li>
            ))}
          </ul>
        </Reveal>
        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {metrics.map((m, i) => (
            <Reveal key={m.big} delay={i * 90}>
              <div className="rounded-2xl border border-border bg-background p-8 text-center">
                <p className="text-2xl font-bold sm:text-3xl">{m.big}</p>
                <p className="mt-2 text-[13px] text-muted-foreground">{m.small}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

const useCases = [
  {
    icon: Database,
    title: "Manajemen Data Siswa",
    desc: "Profil siswa terpusat dan mudah dicari.",
  },
  {
    icon: Users,
    title: "Penempatan Magang",
    desc: "Cocokkan keahlian siswa dengan peluang perusahaan.",
  },
  { icon: Activity, title: "Monitoring Magang", desc: "Pantau aktivitas dan kedisiplinan siswa." },
  {
    icon: BarChart3,
    title: "Evaluasi Sekolah",
    desc: "Ukur performa program magang tiap sekolah.",
  },
  { icon: Brain, title: "Forecasting SDM", desc: "Prediksi kebutuhan keahlian di masa depan." },
  {
    icon: MapPin,
    title: "Rekomendasi Lokasi",
    desc: "Temukan wilayah perusahaan yang paling optimal.",
  },
];

export function UseCases() {
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <SectionHeading eyebrow="Use Case" title="Banyak kebutuhan. Satu platform." />
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((u, i) => (
            <Reveal as="li" key={u.title} delay={i * 60}>
              <div className="group h-full rounded-2xl border border-border bg-background p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-softgray transition-colors group-hover:bg-ai-soft">
                  <u.icon className="h-4 w-4 transition-colors group-hover:text-ai" aria-hidden />
                </span>
                <h3 className="mt-5 text-[15px] font-semibold">{u.title}</h3>
                <p className="mt-2 text-[14px] text-muted-foreground">{u.desc}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export function FinalCta() {
  return (
    <section id="cta" className="border-t border-border bg-offwhite py-24 sm:py-32">
      <Container>
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] leading-[1.06] font-bold text-balance">
            Mulai bangun program magang yang lebih cerdas.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[17px] text-muted-foreground">
            Kelola data dengan lebih sederhana. Pantau program dengan lebih jelas. Ambil keputusan
            dengan bantuan AI.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Cta href="/auth" size="lg" className="w-full sm:w-auto">
              Mulai Sekarang{" "}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Cta>
            <Cta href="/auth" variant="ghost" size="lg" className="w-full sm:w-auto">
              Masuk ke Portal
            </Cta>
          </div>
        </Reveal>
        <Reveal delay={120} className="mt-12">
          <img
            src={illoCta}
            alt="Ilustrasi guru dan siswa meninjau dashboard magang bersama sekolah dan perusahaan mitra"
            loading="lazy"
            width={1200}
            height={800}
            className="mx-auto w-full max-w-3xl"
          />
        </Reveal>
      </Container>
    </section>
  );
}

const footerCols = [
  { title: "Produk", links: ["Fitur", "AI Analytics", "AI Forecasting", "Dashboard"] },
  {
    title: "Solusi",
    links: ["Untuk Admin", "Untuk Sekolah", "Untuk Guru", "Untuk Program Vokasi"],
  },
  { title: "Resources", links: ["Dokumentasi", "Panduan", "FAQ", "Contact"] },
  { title: "Company", links: ["Tentang", "Kontak", "Privacy", "Terms"] },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-16">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2.6fr]">
          <div className="max-w-xs">
            <p className="text-[15px] font-bold">VokasiFlow AI</p>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              Sistem manajemen program magang vokasi berbasis data dan AI.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerCols.map((c) => (
              <div key={c.title}>
                <p className="text-[13px] font-semibold">{c.title}</p>
                <ul className="mt-3 space-y-2">
                  {c.links.map((l) => (
                    <li key={l}>
                      <a
                        href="#produk"
                        className="text-[14px] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-12 border-t border-border pt-6 text-[13px] text-muted-foreground">
          © 2026 VokasiFlow AI. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}

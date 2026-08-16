import type { ReactNode } from "react";
import {
  Building2,
  GraduationCap,
  LayoutDashboard,
  MapPin,
  Sparkles,
  TrendingUp,
  Users,
  ClipboardList,
  CalendarCheck,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Counter, useInView } from "./primitives";

export function DashboardChrome({
  title,
  subtitle,
  children,
  className,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-background shadow-float",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-offwhite px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-hairline" />
        <span className="h-2.5 w-2.5 rounded-full bg-hairline" />
        <span className="h-2.5 w-2.5 rounded-full bg-hairline" />
        <div className="ml-3 min-w-0">
          <p className="truncate text-[13px] font-semibold">{title}</p>
          {subtitle ? (
            <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className={cn("bg-background", compact ? "p-4" : "p-4 sm:p-6")}>{children}</div>
    </div>
  );
}

export function Metric({
  value,
  label,
  suffix = "",
  icon: Icon,
}: {
  value: number;
  label: string;
  suffix?: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-xl border border-border bg-offwhite p-3 sm:p-4">
      <Icon className="mb-2 h-4 w-4 text-muted-foreground" aria-hidden />
      <p className="text-xl font-bold sm:text-2xl">
        <Counter value={value} suffix={suffix} />
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">{label}</p>
    </div>
  );
}

export function AiInsight({ text, title = "AI Insight" }: { text: string; title?: string }) {
  return (
    <div className="ai-glow flex items-start gap-3 rounded-xl border border-ai/25 bg-ai-soft p-4">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ai text-accent-foreground">
        <Sparkles className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold tracking-wide text-ai uppercase">{title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-foreground">{text}</p>
      </div>
    </div>
  );
}

export function BarChartMini({
  data,
  labels,
}: {
  data: number[];
  labels: string[];
}) {
  const { ref, visible } = useInView<HTMLDivElement>();
  const max = Math.max(...data);
  return (
    <div ref={ref} className="flex h-32 items-stretch gap-2">
      {data.map((d, i) => (
        <div key={labels[i]} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-foreground/85 transition-[height] duration-700 ease-out"
              style={{
                height: visible ? `${(d / max) * 100}%` : "0%",
                transitionDelay: `${i * 70}ms`,
              }}
            />
          </div>
          <span className="w-full truncate text-center text-[10px] text-muted-foreground">
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ProgressRow({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: number;
  tone?: "ink" | "ai" | "good";
}) {
  const { ref, visible } = useInView<HTMLDivElement>();
  return (
    <div ref={ref}>
      <div className="mb-1.5 flex items-center justify-between text-[13px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-softgray">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-1000 ease-out",
            tone === "ai" && "bg-ai",
            tone === "good" && "bg-good",
            tone === "ink" && "bg-foreground",
          )}
          style={{ width: visible ? `${value}%` : "0%" }}
        />
      </div>
    </div>
  );
}

export function LineChart({
  series,
  xLabels,
}: {
  series: { name: string; points: number[]; tone: "ai" | "ink" | "muted" | "warn" }[];
  xLabels: string[];
}) {
  const { ref, visible } = useInView<HTMLDivElement>();
  const w = 320;
  const h = 140;
  const all = series.flatMap((s) => s.points);
  const max = Math.max(...all) * 1.12;
  const min = Math.min(...all) * 0.85;
  const toPath = (pts: number[]) =>
    pts
      .map((p, i) => {
        const x = (i / (pts.length - 1)) * (w - 16) + 8;
        const y = h - 12 - ((p - min) / (max - min)) * (h - 30);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  const stroke = {
    ai: "var(--ai)",
    ink: "var(--ink)",
    muted: "var(--muted-foreground)",
    warn: "var(--warn)",
  } as const;

  return (
    <div ref={ref}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-36 w-full"
        role="img"
        aria-label="Grafik prediksi permintaan keahlian industri"
      >
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1="0"
            x2={w}
            y1={12 + i * 32}
            y2={12 + i * 32}
            stroke="var(--hairline)"
            strokeWidth="1"
          />
        ))}
        {series.map((s) => (
          <path
            key={s.name}
            d={toPath(s.points)}
            fill="none"
            stroke={stroke[s.tone]}
            strokeWidth={s.tone === "ai" ? 2.4 : 1.4}
            strokeLinecap="round"
            strokeDasharray="600"
            strokeDashoffset={visible ? 0 : 600}
            style={{ transition: "stroke-dashoffset 1.4s ease-out" }}
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[10px] text-muted-foreground">
        {xLabels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {series.map((s) => (
          <li key={s.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className="h-1.5 w-4 rounded-full"
              style={{ background: stroke[s.tone] }}
              aria-hidden
            />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HeroDashboard() {
  return (
    <DashboardChrome title="Overview Program Magang" subtitle="VokasiFlow AI — Admin">
      <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric value={1248} label="Siswa Aktif" icon={Users} />
            <Metric value={86} label="Sekolah" icon={GraduationCap} />
            <Metric value={142} label="Perusahaan Mitra" icon={Building2} />
            <Metric value={94} suffix="%" label="Penempatan Berhasil" icon={TrendingUp} />
          </div>
          <div className="rounded-xl border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-semibold">Internship Placement Overview</p>
              <span className="text-[11px] text-muted-foreground">6 periode terakhir</span>
            </div>
            <BarChartMini
              data={[42, 58, 51, 74, 88, 96]}
              labels={["P1", "P2", "P3", "P4", "P5", "P6"]}
            />
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 text-[13px] font-semibold">School Performance</p>
            <div className="space-y-3">
              <ProgressRow label="SMKN 2 Bandung" value={92} tone="good" />
              <ProgressRow label="SMK Mitra Industri" value={84} />
              <ProgressRow label="SMKN 5 Surabaya" value={78} />
            </div>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 text-[13px] font-semibold">Industry Demand Trend</p>
            <LineChart
              series={[
                { name: "Teknologi Informasi", points: [40, 52, 61, 78], tone: "ai" },
                { name: "Teknik Mesin", points: [48, 46, 52, 55], tone: "muted" },
              ]}
              xLabels={["Q1", "Q2", "Q3", "Q4"]}
            />
          </div>
          <AiInsight text="Permintaan keahlian Teknologi Informasi diproyeksikan meningkat 18% pada periode berikutnya." />
        </div>
      </div>
    </DashboardChrome>
  );
}

export function AiScoreCard() {
  const { ref, visible } = useInView<HTMLDivElement>();
  const score = 87;
  const circ = 2 * Math.PI * 52;
  return (
    <DashboardChrome title="AI School Performance Score" subtitle="Evaluasi periode berjalan">
      <div ref={ref} className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="relative mx-auto h-36 w-36">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--softgray)" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="var(--ai)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={visible ? circ * (1 - score / 100) : circ}
              style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="text-3xl font-bold">
                <Counter value={score} />
              </p>
              <p className="text-[11px] text-muted-foreground">/ 100</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ai-soft px-2.5 py-1 text-[11px] font-semibold text-ai">
            <Sparkles className="h-3 w-3" aria-hidden /> AI Generated Score
          </span>
          <ProgressRow label="Rasio Keberhasilan" value={92} tone="good" />
          <ProgressRow label="Nilai Industri" value={89} tone="ai" />
          <ProgressRow label="Kedisiplinan" value={81} />
          <p className="text-[11px] text-muted-foreground">
            Diperbarui setelah setiap periode magang selesai.
          </p>
        </div>
      </div>
    </DashboardChrome>
  );
}

export function ForecastCard() {
  const locations = [
    { city: "Jakarta", value: 92 },
    { city: "Bandung", value: 81 },
    { city: "Surabaya", value: 74 },
    { city: "Semarang", value: 63 },
  ];
  return (
    <DashboardChrome title="Forecast Permintaan Keahlian" subtitle="Proyeksi 2026 – 2028">
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-bold text-ai">+20%</p>
            <p className="text-[12px] text-muted-foreground">Prediksi pertumbuhan kebutuhan</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
            <TrendingUp className="h-3 w-3" aria-hidden /> Time-series
          </span>
        </div>
        <LineChart
          series={[
            { name: "Teknologi Informasi", points: [52, 68, 84], tone: "ai" },
            { name: "Teknik Mesin", points: [46, 50, 57], tone: "ink" },
            { name: "Administrasi Bisnis", points: [38, 41, 45], tone: "muted" },
            { name: "Elektronika", points: [30, 36, 44], tone: "warn" },
          ]}
          xLabels={["2026", "2027", "2028"]}
        />
        <div className="rounded-xl border border-border p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold">
            <MapPin className="h-3.5 w-3.5 text-ai" aria-hidden /> Rekomendasi Lokasi
          </p>
          <div className="space-y-2.5">
            {locations.map((l) => (
              <ProgressRow key={l.city} label={l.city} value={l.value} tone="ai" />
            ))}
          </div>
        </div>
        <AiInsight
          title="Rekomendasi AI"
          text="Tingkatkan kuota penempatan bidang Teknologi Informasi di wilayah Barat pada periode berikutnya."
        />
      </div>
    </DashboardChrome>
  );
}

export function AdminMiniDashboard() {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-soft">
      <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold">
        <LayoutDashboard className="h-3.5 w-3.5 text-ai" aria-hidden /> Admin Control Center
      </p>
      <div className="grid grid-cols-3 gap-2">
        <Metric value={1248} label="Total Siswa" icon={Users} />
        <Metric value={86} label="Sekolah Aktif" icon={GraduationCap} />
        <Metric value={142} label="Mitra" icon={Building2} />
      </div>
      <div className="mt-3 rounded-xl border border-border p-3">
        <p className="mb-2 text-[12px] font-semibold">Industry Demand</p>
        <BarChartMini data={[36, 52, 44, 68, 80]} labels={["TI", "Mesin", "Adm", "Elek", "Log"]} />
      </div>
    </div>
  );
}

export function TeacherMiniDashboard() {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-soft">
      <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold">
        <ClipboardList className="h-3.5 w-3.5 text-ai" aria-hidden /> School Internship Workspace
      </p>
      <div className="grid grid-cols-3 gap-2">
        <Metric value={218} label="Total Siswa" icon={Users} />
        <Metric value={176} label="Sudah Ditempatkan" icon={CalendarCheck} />
        <Metric value={12} label="Menunggu Approval" icon={BarChart3} />
      </div>
      <div className="mt-3 space-y-2.5 rounded-xl border border-border p-3">
        <p className="text-[12px] font-semibold">Kehadiran & Laporan</p>
        <ProgressRow label="Kehadiran bulan ini" value={96} tone="good" />
        <ProgressRow label="Laporan mingguan terkirim" value={88} tone="ai" />
        <ProgressRow label="Nilai akhir terinput" value={71} />
      </div>
    </div>
  );
}
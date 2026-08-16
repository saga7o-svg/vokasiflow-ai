import {
  ArrowRight,
  Database,
  Sparkles,
  Users,
  Activity,
  BarChart3,
  LineChart as LineChartIcon,
  MapPin,
  Layers,
  Brain,
} from "lucide-react";
import illoSchool from "@/assets/illo-school.png";
import illoIndustry from "@/assets/illo-industry.png";
import { Container, Cta, Eyebrow, Reveal, SectionHeading } from "./primitives";
import { AiScoreCard, ForecastCard, HeroDashboard } from "./dashboards";

export function Hero() {
  return (
    <section id="produk" className="relative overflow-hidden pt-14 pb-10 sm:pt-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--softgray),transparent_70%)]"
      />
      <Container>
        <div className="relative mx-auto max-w-3xl text-center">
          <img
            src={illoSchool}
            alt=""
            aria-hidden
            width={640}
            height={640}
            className="pointer-events-none absolute -top-4 -left-24 hidden w-32 opacity-80 xl:block"
          />
          <img
            src={illoIndustry}
            alt=""
            aria-hidden
            width={640}
            height={640}
            className="pointer-events-none absolute -top-2 -right-28 hidden w-32 opacity-80 xl:block"
          />
          <Reveal className="flex justify-center">
            <Eyebrow>
              <Sparkles className="h-3 w-3 text-ai" aria-hidden /> Platform Magang Vokasi + AI
            </Eyebrow>
          </Reveal>
          <Reveal delay={60}>
            <h1 className="mt-6 text-[clamp(2.5rem,6.4vw,4.6rem)] leading-[1.02] font-bold text-balance">
              Kelola Magang. Hubungkan Sekolah &amp; Industri.
              <span className="mt-2 block text-ai">Ambil Keputusan dengan AI.</span>
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-muted-foreground sm:text-[19px]">
              Platform manajemen magang vokasi yang membantu sekolah dan pengelola program mengelola
              penempatan, monitoring, evaluasi, dan perencanaan berbasis data.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Cta href="/auth" size="lg" className="w-full sm:w-auto">
                Mulai Sekarang{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Cta>
              <Cta href="#cara-kerja" variant="ghost" size="lg" className="w-full sm:w-auto">
                Lihat Cara Kerja
              </Cta>
            </div>
            <p className="mt-5 text-[13px] text-muted-foreground">
              Dibangun untuk ekosistem pendidikan vokasi yang lebih terstruktur dan data-driven.
            </p>
          </Reveal>
        </div>

        <Reveal delay={220} className="mt-14 sm:mt-16">
          <HeroDashboard />
        </Reveal>
      </Container>
    </section>
  );
}

const flow = [
  { label: "Data", icon: Database },
  { label: "Placement", icon: Users },
  { label: "Monitoring", icon: Activity },
  { label: "Evaluation", icon: BarChart3 },
  { label: "AI Insights", icon: Brain },
  { label: "Forecasting", icon: LineChartIcon },
];

export function ValueProposition() {
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <Reveal className="mx-auto max-w-4xl text-center">
          <h2 className="text-[clamp(1.9rem,4.6vw,3.5rem)] leading-[1.08] font-bold text-balance">
            “Satu platform untuk seluruh perjalanan magang vokasi.”
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[17px] text-muted-foreground">
            Dari data siswa hingga keputusan strategis, semua terhubung dalam satu ekosistem.
          </p>
        </Reveal>

        <Reveal delay={120} className="mt-14">
          <ol className="flex snap-x gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-6 md:gap-2 md:overflow-visible">
            {flow.map((f, i) => (
              <li
                key={f.label}
                className="relative flex min-w-[46%] snap-start flex-col items-center gap-3 rounded-2xl border border-border bg-offwhite px-4 py-6 text-center sm:min-w-[30%] md:min-w-0"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-background">
                  <f.icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-[13px] font-medium">{f.label}</span>
                {i < flow.length - 1 ? (
                  <ArrowRight
                    aria-hidden
                    className="absolute top-1/2 -right-3 hidden h-3.5 w-3.5 -translate-y-1/2 text-hairline md:block"
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

const features = [
  {
    n: "01",
    tag: "Master Data",
    title: "Siswa, Sekolah & Perusahaan",
    desc: "Kelola data utama secara terstruktur dalam satu sistem.",
    icon: Database,
  },
  {
    n: "02",
    tag: "Smart Placement",
    title: "Matching Penempatan Magang",
    desc: "Ajukan siswa berdasarkan keahlian dan ketersediaan perusahaan.",
    icon: Layers,
  },
  {
    n: "03",
    tag: "Monitoring",
    title: "Pantau Perjalanan Magang",
    desc: "Monitor aktivitas, kehadiran, kedisiplinan, dan perkembangan siswa.",
    icon: Activity,
  },
  {
    n: "04",
    tag: "Evaluation",
    title: "Evaluasi Performa Sekolah",
    desc: "Gunakan data industri, keberhasilan magang, dan kedisiplinan untuk melihat performa sekolah.",
    icon: BarChart3,
  },
  {
    n: "05",
    tag: "AI Analytics",
    title: "AI School Performance Score",
    desc: "AI menghasilkan skor performa sekolah dari 0–100 berdasarkan berbagai indikator.",
    icon: Brain,
  },
  {
    n: "06",
    tag: "AI Forecasting",
    title: "Prediksi Kebutuhan SDM",
    desc: "Identifikasi tren kebutuhan keahlian dan lokasi perusahaan di masa depan.",
    icon: MapPin,
  },
];

export function Features() {
  return (
    <section id="fitur" className="border-y border-border bg-offwhite py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow="Fitur"
          title="Semua yang dibutuhkan untuk mengelola program magang."
          desc="Kurangi pekerjaan administratif dan fokus pada hal yang lebih penting: memastikan siswa mendapatkan pengalaman industri yang tepat."
        />
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal as="li" key={f.n} delay={i * 60}>
              <article className="group h-full rounded-2xl border border-border bg-background p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-offwhite transition-colors group-hover:border-ai/40 group-hover:bg-ai-soft">
                    <f.icon className="h-4 w-4 transition-colors group-hover:text-ai" aria-hidden />
                  </span>
                  <span className="text-[12px] font-medium tracking-[0.14em] text-muted-foreground">
                    {f.n} — {f.tag}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{f.desc}</p>
              </article>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export function AiSchoolScore() {
  return (
    <section id="ai-insights" className="py-24 sm:py-32">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <SectionHeading
            align="left"
            eyebrow="AI School Performance"
            title="Ubah data magang menjadi insight performa sekolah."
            desc="AI membantu Admin mengevaluasi kualitas program magang sekolah secara objektif berdasarkan data aktual: rasio keberhasilan penempatan, nilai dari industri, dan kedisiplinan siswa."
          />
          <Reveal delay={120}>
            <AiScoreCard />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

export function AiForecasting() {
  return (
    <section className="border-y border-border bg-offwhite py-24 sm:py-32">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal className="order-2 lg:order-1">
            <ForecastCard />
          </Reveal>
          <div className="order-1 lg:order-2">
            <SectionHeading
              align="left"
              eyebrow="AI Forecasting"
              title="Lihat kebutuhan industri sebelum menjadi kebutuhan."
              desc="AI menganalisis data historis dan tren industri untuk membantu menentukan keahlian dan lokasi yang berpotensi memiliki permintaan tinggi."
            />
          </div>
        </div>
      </Container>
    </section>
  );
}

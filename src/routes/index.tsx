import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import {
  AiForecasting,
  AiSchoolScore,
  Features,
  Hero,
  ValueProposition,
} from "@/components/landing/sections-top";
import {
  DataDriven,
  FinalCta,
  Footer,
  Impact,
  ResponsiveSection,
  Roles,
  Trust,
  UseCases,
  Workflow,
} from "@/components/landing/sections-bottom";

const title = "VokasiFlow AI — Sistem Manajemen Magang Vokasi Berbasis AI";
const description =
  "Platform terpadu manajemen magang vokasi & SMK mitra. Optimalkan penempatan siswa, monitoring jurnal harian, evaluasi kinerja, serta forecasting keselarasan kurikulum berbasis Artificial Intelligence.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "keywords", content: "magang vokasi, manajemen magang smk, ai magang, pkl vokasi, portal magang, vokasiflow" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://vokasiflow-ai.web.app/" },
      { property: "og:image", content: "/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: "/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://vokasiflow-ai.web.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: title,
          description: description,
          url: "https://vokasiflow-ai.web.app/",
          inLanguage: "id-ID",
          isPartOf: {
            "@type": "WebSite",
            name: "VokasiFlow AI",
            url: "https://vokasiflow-ai.web.app/",
          },
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <ValueProposition />
        <Features />
        <AiSchoolScore />
        <AiForecasting />
        <Workflow />
        <Roles />
        <DataDriven />
        <ResponsiveSection />
        <Trust />
        <Impact />
        <UseCases />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

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

const title = "VokasiFlow AI — Manajemen Magang Vokasi Berbasis AI";
const description =
  "Platform manajemen magang vokasi untuk sekolah dan pengelola program: penempatan, monitoring, evaluasi, serta analitik dan forecasting berbasis AI.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

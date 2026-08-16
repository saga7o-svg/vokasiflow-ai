import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=5" },
      { title: "VokasiFlow AI — Sistem Manajemen Magang Vokasi Berbasis AI" },
      {
        name: "description",
        content:
          "Platform manajemen magang vokasi untuk sekolah & SMK mitra: penempatan presisi, monitoring real-time, evaluasi jurnal, serta forecasting analitik berbasis AI.",
      },
      {
        name: "keywords",
        content:
          "vokasiflow, magang vokasi, smk, manajemen magang, ai magang, penempatan magang, jurnal magang, industri mitra, pkl vokasi",
      },
      { name: "author", content: "VokasiFlow AI Team" },
      { name: "theme-color", content: "#0f172a" },

      // Open Graph / Facebook / WhatsApp / LinkedIn
      { property: "og:site_name", content: "VokasiFlow AI" },
      { property: "og:title", content: "VokasiFlow AI — Sistem Manajemen Magang Vokasi Berbasis AI" },
      {
        property: "og:description",
        content:
          "Kelola penempatan magang vokasi, evaluasi kinerja siswa, dan analitik keselarasan kurikulum industri berbasis AI secara terpusat.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "VokasiFlow AI Platform Interface Preview" },
      { property: "og:locale", content: "id_ID" },

      // Twitter Cards
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@VokasiFlow" },
      { name: "twitter:title", content: "VokasiFlow AI — Platform Magang Vokasi Berbasis AI" },
      {
        name: "twitter:description",
        content:
          "Kelola penempatan magang vokasi, evaluasi kinerja siswa, dan analitik keselarasan kurikulum industri berbasis AI.",
      },
      { name: "twitter:image", content: "/og-image.jpg" },

      // Crawling & Indexing default
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
    ],
    links: [
      { rel: "canonical", href: "https://www.cma-vocational.web.id/" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", href: "/vokasiCMA.png" },
      { rel: "apple-touch-icon", href: "/vokasiCMA.png" },
      { rel: "shortcut icon", href: "/favicon.ico" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "VokasiFlow AI",
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web Browser",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "IDR",
          },
          description:
            "Sistem Manajemen Magang Vokasi Berbasis AI untuk Penempatan, Monitoring, dan Forecasting Kinerja Magang SMK.",
          url: "https://www.cma-vocational.web.id/",
          publisher: {
            "@type": "Organization",
            name: "VokasiFlow AI",
            logo: "https://www.cma-vocational.web.id/og-image.jpg",
          },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}

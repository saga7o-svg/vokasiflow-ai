import { useState } from "react";
import {
  MapPin,
  Navigation,
  ExternalLink,
  Car,
  Clock,
  Building2,
  School,
  Layers,
  Compass,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GoogleMapsViewProps {
  originName: string;
  originAddress?: string | null | undefined;
  originCity?: string | null | undefined;
  destinationName?: string | null | undefined;
  destinationAddress?: string | null | undefined;
  destinationCity?: string | null | undefined;
  distanceKm?: number | null | undefined;
  travelTimeMinutes?: number | null | undefined;
  className?: string | undefined;
}

export function GoogleMapsView({
  originName,
  originAddress,
  originCity,
  destinationName,
  destinationAddress,
  destinationCity,
  distanceKm,
  travelTimeMinutes,
  className,
}: GoogleMapsViewProps) {
  const [viewMode, setViewMode] = useState<"DIRECTIONS" | "ORIGIN" | "DESTINATION">(
    destinationName ? "DIRECTIONS" : "ORIGIN",
  );

  // Construct full search terms
  const originQuery = [originName, originAddress, originCity].filter(Boolean).join(", ");
  const destQuery = destinationName
    ? [destinationName, destinationAddress, destinationCity].filter(Boolean).join(", ")
    : "";

  // Google Maps Embed URLs
  // Mode 1: Search / Place
  const originEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(originQuery)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  const destEmbedUrl = destinationName
    ? `https://maps.google.com/maps?q=${encodeURIComponent(destQuery)}&t=&z=14&ie=UTF8&iwloc=&output=embed`
    : originEmbedUrl;

  // Mode 2: Route / Directions Embed
  const directionsEmbedUrl = destinationName
    ? `https://maps.google.com/maps?saddr=${encodeURIComponent(originQuery)}&daddr=${encodeURIComponent(destQuery)}&output=embed`
    : originEmbedUrl;

  const currentEmbedUrl =
    viewMode === "ORIGIN"
      ? originEmbedUrl
      : viewMode === "DESTINATION" && destinationName
        ? destEmbedUrl
        : directionsEmbedUrl;

  // Direct Google Maps Web Navigation Link
  const googleMapsWebDirUrl = destinationName
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originQuery)}&destination=${encodeURIComponent(destQuery)}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(originQuery)}`;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card overflow-hidden shadow-sm transition-all",
        className,
      )}
    >
      {/* Map Header Controls */}
      <div className="p-4 bg-muted/40 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary font-bold">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>Peta Lokasi &amp; Rute Google Maps</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Live Maps
              </span>
            </h4>
            <p className="text-xs text-muted-foreground">
              {destinationName
                ? `Rute dari ${originName} menuju ${destinationName}`
                : `Lokasi Cabang PKT: ${originName}`}
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-background/80 p-1 rounded-xl border border-border text-xs font-semibold">
          {destinationName && (
            <button
              type="button"
              onClick={() => setViewMode("DIRECTIONS")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all",
                viewMode === "DIRECTIONS"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>Rute</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setViewMode("ORIGIN")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all",
              viewMode === "ORIGIN"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Cabang PKT</span>
          </button>

          {destinationName && (
            <button
              type="button"
              onClick={() => setViewMode("DESTINATION")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all",
                viewMode === "DESTINATION"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <School className="h-3.5 w-3.5" />
              <span>SMK</span>
            </button>
          )}
        </div>
      </div>

      {/* Origin & Destination Bar */}
      {destinationName && (
        <div className="px-4 py-2.5 bg-background/90 border-b border-border/80 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200 shrink-0" />
              <span className="font-semibold text-muted-foreground">Titik PKT:</span>
              <span className="font-bold">{originName}</span>
            </div>

            <span className="text-muted-foreground">➔</span>

            <div className="flex items-center gap-1.5 text-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200 shrink-0" />
              <span className="font-semibold text-muted-foreground">Tujuan SMK:</span>
              <span className="font-bold">{destinationName}</span>
            </div>
          </div>

          {(distanceKm !== undefined || travelTimeMinutes !== undefined) && (
            <div className="flex items-center gap-3 font-semibold text-primary shrink-0">
              {distanceKm !== undefined && (
                <span className="flex items-center gap-1">
                  <Car className="h-3.5 w-3.5" /> ±{distanceKm} km
                </span>
              )}
              {travelTimeMinutes !== undefined && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> ~{travelTimeMinutes} menit
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Embedded Map Frame */}
      <div className="relative w-full h-[340px] sm:h-[380px] bg-muted/20">
        <iframe
          title="Google Maps Location & Route"
          src={currentEmbedUrl}
          className="w-full h-full border-0"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />

        {/* Floating Quick Action */}
        <div className="absolute bottom-3 right-3 z-10">
          <a
            href={googleMapsWebDirUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-background/95 hover:bg-background text-foreground shadow-lg border border-border/80 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md"
          >
            <ExternalLink className="h-3.5 w-3.5 text-primary" />
            <span>Buka Petunjuk Arah di Google Maps</span>
          </a>
        </div>
      </div>
    </div>
  );
}

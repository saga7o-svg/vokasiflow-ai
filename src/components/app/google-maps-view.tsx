import { useState, useEffect, useRef } from "react";
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
  RotateCw,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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

// Decode Google Maps Encoded Polyline algorithm
function decodeGooglePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export function GoogleMapsView({
  originName,
  originAddress,
  originCity,
  destinationName,
  destinationAddress,
  destinationCity,
  distanceKm: initialDistanceKm,
  travelTimeMinutes: initialTravelTimeMinutes,
  className,
}: GoogleMapsViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const googleMapsKey = (
    (typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)
      : "") || ""
  ).trim();

  const hasValidGoogleKey = Boolean(googleMapsKey && googleMapsKey.length > 10);

  const [activeEngine, setActiveEngine] = useState<"GOOGLE_OFFICIAL" | "LEAFLET_INTERACTIVE">(
    hasValidGoogleKey ? "GOOGLE_OFFICIAL" : "LEAFLET_INTERACTIVE",
  );
  const [tileLayerType, setTileLayerType] = useState<"STREET" | "SATELLITE" | "DARK">("STREET");
  const [isRoutingLoading, setIsRoutingLoading] = useState<boolean>(false);
  const [routeInfo, setRouteInfo] = useState<{
    distanceKm: number;
    travelTimeMinutes: number;
    routeName?: string;
  } | null>(null);

  // Accurate Geocoding and Route Query Formulation
  const originQuery = [originName, originAddress, originCity, "Indonesia"]
    .filter(Boolean)
    .join(", ");

  const destQuery = destinationName
    ? [destinationName, destinationAddress, destinationCity, "Indonesia"]
        .filter(Boolean)
        .join(", ")
    : "";

  // Official Google Maps Embed API URLs
  const googleMapsEmbedUrl = destinationName
    ? `https://www.google.com/maps/embed/v1/directions?key=${googleMapsKey}&origin=${encodeURIComponent(
        originQuery,
      )}&destination=${encodeURIComponent(destQuery)}&mode=driving`
    : `https://www.google.com/maps/embed/v1/place?key=${googleMapsKey}&q=${encodeURIComponent(
        originQuery,
      )}`;

  // Web deep-link for Google Maps navigation app
  const googleMapsWebDirUrl = destinationName
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        originQuery,
      )}&destination=${encodeURIComponent(destQuery)}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(originQuery)}`;

  // Interactive Leaflet Map Route Fetching with Google Routes API v2
  useEffect(() => {
    if (activeEngine === "GOOGLE_OFFICIAL" && hasValidGoogleKey) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    let isCancelled = false;

    async function loadGoogleRouteOnMap() {
      if (!mapContainerRef.current) return;
      setIsRoutingLoading(true);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      let routePolylinePoints: [number, number][] = [];
      let originPoint: [number, number] = [-6.9175, 107.6191]; // Bandung
      let destPoint: [number, number] = [-7.3274, 108.2207]; // Tasikmalaya / West Java default

      // 1. Fetch exact real-road route and polyline from Google Routes API v2
      if (hasValidGoogleKey && destinationName) {
        try {
          const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": googleMapsKey,
              "X-Goog-FieldMask":
                "routes.distanceMeters,routes.duration,routes.description,routes.polyline.encodedPolyline",
            },
            body: JSON.stringify({
              origin: { address: originQuery },
              destination: { address: destQuery },
              travelMode: "DRIVE",
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.routes) && data.routes.length > 0) {
              const route = data.routes[0];
              const distMeters = Number(route.distanceMeters) || 0;
              const durSecs = parseInt(String(route.duration || "0").replace("s", ""), 10) || 0;
              const distKm = Math.round((distMeters / 1000) * 10) / 10;
              const durMin = Math.round(durSecs / 60);

                const decoded = decodeGooglePolyline(route.polyline.encodedPolyline);
                const firstPt = decoded[0];
                const lastPt = decoded[decoded.length - 1];
                if (firstPt && lastPt) {
                  routePolylinePoints = decoded;
                  originPoint = firstPt;
                  destPoint = lastPt;
                }

              setRouteInfo({
                distanceKm: distKm,
                travelTimeMinutes: durMin,
                routeName: route.description || undefined,
              });
            }
          }
        } catch (routeErr) {
          console.warn("Google Routes API failed in client map:", routeErr);
        }
      }

      if (isCancelled || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: originPoint,
        zoom: 12,
        zoomControl: false,
      });

      const tileUrls = {
        STREET: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        SATELLITE:
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        DARK: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      };

      L.tileLayer(tileUrls[tileLayerType], {
        attribution: "&copy; Google Maps Platform & OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);

      const pktIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div style="background: linear-gradient(135deg, #1d4ed8, #2563eb); color: white; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(37,99,235,0.45); border: 3px solid white; font-size: 18px;">
            🏢
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const smkIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div style="background: linear-gradient(135deg, #059669, #10b981); color: white; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(16,185,129,0.45); border: 3px solid white; font-size: 18px;">
            🏫
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const originMarker = L.marker(originPoint, { icon: pktIcon }).addTo(map);
      originMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px; min-width: 190px;">
          <div style="font-size: 11px; font-weight: bold; color: #1e40af; text-transform: uppercase; margin-bottom: 3px;">🏢 Titik Cabang PKT</div>
          <div style="font-size: 13px; font-weight: bold; color: #0f172a;">${originName}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${originAddress || originCity || "Indonesia"}</div>
        </div>
      `);

      if (destinationName) {
        const destMarker = L.marker(destPoint, { icon: smkIcon }).addTo(map);
        destMarker.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px; min-width: 190px;">
            <div style="font-size: 11px; font-weight: bold; color: #065f46; text-transform: uppercase; margin-bottom: 3px;">🏫 Sekolah Vokasi (SMK)</div>
            <div style="font-size: 13px; font-weight: bold; color: #0f172a;">${destinationName}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${destinationAddress || destinationCity || "Indonesia"}</div>
          </div>
        `);

        if (routePolylinePoints.length > 0) {
          const polyline = L.polyline(routePolylinePoints, {
            color: "#2563eb",
            weight: 5.5,
            opacity: 0.9,
            lineJoin: "round",
          }).addTo(map);

          const bounds = L.latLngBounds(routePolylinePoints);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        } else {
          const group = L.featureGroup([originMarker, destMarker]);
          map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 14 });
        }
      } else {
        map.setView(originPoint, 14);
      }

      setTimeout(() => {
        map.invalidateSize();
      }, 150);

      mapInstanceRef.current = map;
      setIsRoutingLoading(false);
    }

    loadGoogleRouteOnMap();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [
    activeEngine,
    hasValidGoogleKey,
    originName,
    originAddress,
    originCity,
    destinationName,
    destinationAddress,
    destinationCity,
    tileLayerType,
  ]);

  const displayDistance = routeInfo?.distanceKm ?? initialDistanceKm;
  const displayDuration = routeInfo?.travelTimeMinutes ?? initialTravelTimeMinutes;

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
              {hasValidGoogleKey ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-3 w-3" /> API Key Aktif
                </span>
              ) : (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Peta Terhubung
                </span>
              )}
            </h4>
            <p className="text-xs text-muted-foreground">
              {destinationName
                ? `Rute dari ${originName} menuju ${destinationName}`
                : `Lokasi Cabang PKT: ${originName}`}
            </p>
          </div>
        </div>

        {/* Engine Switcher */}
        <div className="flex items-center gap-1 bg-background/90 p-1 rounded-xl border border-border text-xs font-semibold">
          {hasValidGoogleKey && (
            <button
              type="button"
              onClick={() => setActiveEngine("GOOGLE_OFFICIAL")}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all",
                activeEngine === "GOOGLE_OFFICIAL"
                  ? "bg-primary text-primary-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Google Maps Resmi</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveEngine("LEAFLET_INTERACTIVE")}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all",
              activeEngine === "LEAFLET_INTERACTIVE" || !hasValidGoogleKey
                ? "bg-primary text-primary-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Peta Interaktif</span>
          </button>

          {activeEngine === "LEAFLET_INTERACTIVE" && (
            <div className="flex items-center pl-1 border-l border-border gap-0.5">
              <button
                type="button"
                onClick={() => setTileLayerType("STREET")}
                className={cn(
                  "px-2 py-1 rounded text-[11px] font-medium transition-all",
                  tileLayerType === "STREET"
                    ? "bg-primary/20 text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Jalan
              </button>
              <button
                type="button"
                onClick={() => setTileLayerType("SATELLITE")}
                className={cn(
                  "px-2 py-1 rounded text-[11px] font-medium transition-all",
                  tileLayerType === "SATELLITE"
                    ? "bg-primary/20 text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Satelit
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Origin & Destination Bar */}
      {destinationName && (
        <div className="px-4 py-2.5 bg-background/90 border-b border-border/80 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-foreground">
              <span className="h-3 w-3 rounded-full bg-blue-600 ring-2 ring-blue-200 shrink-0" />
              <span className="font-semibold text-muted-foreground">Titik PKT:</span>
              <span className="font-bold">{originName}</span>
              <span className="text-muted-foreground">
                ({originCity || originAddress || "Bandung"})
              </span>
            </div>

            <span className="text-muted-foreground font-bold">➔</span>

            <div className="flex items-center gap-1.5 text-foreground">
              <span className="h-3 w-3 rounded-full bg-emerald-600 ring-2 ring-emerald-200 shrink-0" />
              <span className="font-semibold text-muted-foreground">Tujuan SMK:</span>
              <span className="font-bold">{destinationName}</span>
              <span className="text-muted-foreground">
                ({destinationCity || destinationAddress || "Jawa Barat"})
              </span>
            </div>
          </div>

          {(displayDistance !== null || displayDuration !== null) && (
            <div className="flex items-center gap-3 font-semibold text-primary shrink-0 bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
              {displayDistance !== null && displayDistance !== undefined && (
                <span className="flex items-center gap-1">
                  <Car className="h-3.5 w-3.5" /> ±{displayDistance} km
                </span>
              )}
              {displayDuration !== null && displayDuration !== undefined && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> ~{displayDuration} menit
                </span>
              )}
              {routeInfo?.routeName && (
                <span className="hidden md:inline text-xs text-muted-foreground font-normal">
                  (via {routeInfo.routeName})
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Map Display Viewport */}
      <div className="relative w-full h-[390px] sm:h-[450px] bg-muted/10 overflow-hidden">
        {activeEngine === "GOOGLE_OFFICIAL" && hasValidGoogleKey ? (
          <iframe
            key={`${originQuery}-${destQuery}`}
            title="Official Google Maps Platform"
            src={googleMapsEmbedUrl}
            className="w-full h-full border-0"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div
            ref={mapContainerRef}
            className="w-full h-full z-0"
            style={{ minHeight: "390px" }}
          />
        )}

        {/* Floating Google Maps Direct Deep-Link */}
        <div className="absolute bottom-3 right-3 z-[1000]">
          <a
            href={googleMapsWebDirUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background/95 hover:bg-background text-foreground shadow-xl border border-border text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md ring-1 ring-black/5"
          >
            <ExternalLink className="h-4 w-4 text-primary" />
            <span>Buka Rute di Aplikasi Google Maps</span>
          </a>
        </div>
      </div>
    </div>
  );
}

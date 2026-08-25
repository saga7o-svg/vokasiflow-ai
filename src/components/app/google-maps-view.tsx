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
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
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

// Known Coordinates for common cities/regions in Indonesia
const CITY_COORDINATES: Record<string, [number, number]> = {
  sidoarjo: [-7.4478, 112.7183],
  surabaya: [-7.2575, 112.7521],
  gresik: [-7.1566, 112.6555],
  malang: [-7.9666, 112.6326],
  mojokerto: [-7.4726, 112.4381],
  pasuruan: [-7.6453, 112.9075],
  denpasar: [-8.6705, 115.2126],
  bali: [-8.4095, 115.1889],
  bandung: [-6.9175, 107.6191],
  jakarta: [-6.2088, 106.8456],
  "jakarta selatan": [-6.2615, 106.8106],
  "jakarta pusat": [-6.1805, 106.8284],
  "jakarta barat": [-6.1683, 106.7588],
  "jakarta utara": [-6.1384, 106.864],
  "jakarta timur": [-6.225, 106.9004],
  semarang: [-6.9667, 110.4167],
  yogyakarta: [-7.7956, 110.3695],
  jogja: [-7.7956, 110.3695],
  solo: [-7.5755, 110.8243],
  surakarta: [-7.5755, 110.8243],
  medan: [3.5952, 98.6722],
  makassar: [-5.1477, 119.4327],
  palembang: [-2.9761, 104.7754],
  balikpapan: [-1.2379, 116.8289],
  samarinda: [-0.5022, 117.1536],
};

function getCoordsForLocation(name: string, city?: string | null, address?: string | null, offsetIndex = 0): [number, number] {
  const combined = `${name} ${city || ""} ${address || ""}`.toLowerCase();
  
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (combined.includes(key)) {
      // Add slight deterministic jitter if offsetIndex > 0 so overlapping points in same city don't stack directly on top
      const latOffset = (offsetIndex * 0.012) - 0.006;
      const lngOffset = (offsetIndex * 0.015) - 0.007;
      return [coords[0] + latOffset, coords[1] + lngOffset];
    }
  }

  // Default coordinate (Sidoarjo/Surabaya region)
  return [-7.4478 + (offsetIndex * 0.015), 112.7183 + (offsetIndex * 0.015)];
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
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [tileLayerType, setTileLayerType] = useState<"STREET" | "SATELLITE" | "DARK">("STREET");
  const [googleMapsKey] = useState<string>(
    () => ((import.meta.env as Record<string, string | undefined>)["VITE_GOOGLE_MAPS_API_KEY"] || ""),
  );

  const originQuery = [originName, originAddress, originCity].filter(Boolean).join(", ");
  const destQuery = destinationName
    ? [destinationName, destinationAddress, destinationCity].filter(Boolean).join(", ")
    : "";

  const googleMapsWebDirUrl = destinationName
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originQuery)}&destination=${encodeURIComponent(destQuery)}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(originQuery)}`;

  // Initialize and update Leaflet interactive map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const originCoords = getCoordsForLocation(originName, originCity, originAddress, 0);
    const destCoords = destinationName
      ? getCoordsForLocation(destinationName, destinationCity, destinationAddress, 1)
      : null;

    // Create Map
    const map = L.map(mapContainerRef.current, {
      center: originCoords,
      zoom: 13,
      zoomControl: false,
    });

    // Add Tile Layer
    const tileUrls = {
      STREET: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      SATELLITE: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      DARK: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    };

    const tileAttributions = {
      STREET: "&copy; OpenStreetMap contributors | Google Maps Routes",
      SATELLITE: "&copy; Esri World Imagery",
      DARK: "&copy; CartoDB &copy; OpenStreetMap",
    };

    L.tileLayer(tileUrls[tileLayerType], {
      attribution: tileAttributions[tileLayerType],
      maxZoom: 19,
    }).addTo(map);

    // Zoom control
    L.control.zoom({ position: "topright" }).addTo(map);

    // Custom Icon for PKT (Origin)
    const pktIcon = L.divIcon({
      className: "custom-leaflet-marker",
      html: `
        <div style="background-color: #2563eb; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2.5px solid white; font-weight: bold; font-size: 14px;">
          🏢
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    // Custom Icon for SMK (Destination)
    const smkIcon = L.divIcon({
      className: "custom-leaflet-marker",
      html: `
        <div style="background-color: #10b981; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2.5px solid white; font-weight: bold; font-size: 14px;">
          🏫
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    // Add Origin Marker
    const originMarker = L.marker(originCoords, { icon: pktIcon }).addTo(map);
    originMarker.bindPopup(`
      <div style="font-family: sans-serif; padding: 4px;">
        <strong style="color: #1e3a8a; font-size: 13px;">🏢 Titik Cabang PKT</strong><br/>
        <span style="font-size: 12px; font-weight: bold;">${originName}</span><br/>
        <span style="font-size: 11px; color: #64748b;">${originAddress || originCity || ""}</span>
      </div>
    `);

    // Add Destination Marker & Route Polyline
    if (destCoords && destinationName) {
      const destMarker = L.marker(destCoords, { icon: smkIcon }).addTo(map);
      destMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px;">
          <strong style="color: #065f46; font-size: 13px;">🏫 Titik Sekolah Vokasi (SMK)</strong><br/>
          <span style="font-size: 12px; font-weight: bold;">${destinationName}</span><br/>
          <span style="font-size: 11px; color: #64748b;">${destinationAddress || destinationCity || ""}</span><br/>
          ${distanceKm ? `<strong style="font-size: 11px; color: #2563eb;">Jarak: ±${distanceKm} km (~${travelTimeMinutes || Math.round(distanceKm * 2.5)} menit)</strong>` : ""}
        </div>
      `);

      // Add connecting route polyline
      const routeLine = L.polyline([originCoords, destCoords], {
        color: "#2563eb",
        weight: 4,
        opacity: 0.85,
        dashArray: "8, 8",
      }).addTo(map);

      // Fit bounds to show both markers with padding
      const group = L.featureGroup([originMarker, destMarker, routeLine]);
      map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 15 });
    } else {
      map.setView(originCoords, 14);
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [
    originName,
    originAddress,
    originCity,
    destinationName,
    destinationAddress,
    destinationCity,
    distanceKm,
    travelTimeMinutes,
    tileLayerType,
  ]);

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
                Peta Interaktif Aktif
              </span>
            </h4>
            <p className="text-xs text-muted-foreground">
              {destinationName
                ? `Rute dari ${originName} menuju ${destinationName}`
                : `Lokasi Cabang PKT: ${originName}`}
            </p>
          </div>
        </div>

        {/* Layer / Map Style Switcher */}
        <div className="flex items-center gap-1 bg-background/90 p-1 rounded-xl border border-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTileLayerType("STREET")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all",
              tileLayerType === "STREET"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>Jalan</span>
          </button>

          <button
            type="button"
            onClick={() => setTileLayerType("SATELLITE")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all",
              tileLayerType === "SATELLITE"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>Satelit</span>
          </button>

          <button
            type="button"
            onClick={() => setTileLayerType("DARK")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all",
              tileLayerType === "DARK"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>Gelap</span>
          </button>
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
            </div>

            <span className="text-muted-foreground font-bold">➔</span>

            <div className="flex items-center gap-1.5 text-foreground">
              <span className="h-3 w-3 rounded-full bg-emerald-600 ring-2 ring-emerald-200 shrink-0" />
              <span className="font-semibold text-muted-foreground">Tujuan SMK:</span>
              <span className="font-bold">{destinationName}</span>
            </div>
          </div>

          {(distanceKm !== undefined && distanceKm !== null) && (
            <div className="flex items-center gap-3 font-semibold text-primary shrink-0 bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
              <span className="flex items-center gap-1">
                <Car className="h-3.5 w-3.5" /> ±{distanceKm} km
              </span>
              {(travelTimeMinutes !== undefined && travelTimeMinutes !== null) && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> ~{travelTimeMinutes} menit
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Interactive Map Canvas Container */}
      <div className="relative w-full h-[360px] sm:h-[400px] bg-muted/20">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Google Maps Direct Deep-Link */}
        <div className="absolute bottom-3 right-3 z-[1000]">
          <a
            href={googleMapsWebDirUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background/95 hover:bg-background text-foreground shadow-xl border border-border text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md ring-1 ring-black/5"
          >
            <ExternalLink className="h-4 w-4 text-primary" />
            <span>Buka Petunjuk Arah di Google Maps</span>
          </a>
        </div>
      </div>
    </div>
  );
}

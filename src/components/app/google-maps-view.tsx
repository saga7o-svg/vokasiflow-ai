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
  AlertCircle,
  LocateFixed,
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

// Known Anchor Coordinates for major Indonesian cities/regions
const CITY_COORDINATES: Record<string, [number, number]> = {
  sidoarjo: [-7.4478, 112.7183],
  surabaya: [-7.2575, 112.7521],
  gresik: [-7.1566, 112.6555],
  malang: [-7.9666, 112.6326],
  mojokerto: [-7.4726, 112.4381],
  pasuruan: [-7.6453, 112.9075],
  probolinggo: [-7.7543, 113.2159],
  jember: [-8.1724, 113.7007],
  banyuwangi: [-8.2192, 114.3691],
  madiun: [-7.6298, 111.5239],
  kediri: [-7.8228, 112.0119],
  blitar: [-8.0983, 112.1681],
  denpasar: [-8.6705, 115.2126],
  bali: [-8.4095, 115.1889],
  badung: [-8.5819, 115.1771],
  bandung: [-6.9175, 107.6191],
  cimahi: [-6.8723, 107.542],
  jakarta: [-6.2088, 106.8456],
  "jakarta selatan": [-6.2615, 106.8106],
  "jakarta pusat": [-6.1805, 106.8284],
  "jakarta barat": [-6.1683, 106.7588],
  "jakarta utara": [-6.1384, 106.864],
  "jakarta timur": [-6.225, 106.9004],
  bogor: [-6.5971, 106.806],
  depok: [-6.4025, 106.7942],
  tangerang: [-6.1783, 106.6319],
  bekasi: [-6.2383, 106.9756],
  semarang: [-6.9667, 110.4167],
  yogyakarta: [-7.7956, 110.3695],
  jogja: [-7.7956, 110.3695],
  solo: [-7.5755, 110.8243],
  surakarta: [-7.5755, 110.8243],
  medan: [3.5952, 98.6722],
  makassar: [-5.1477, 119.4327],
  palembang: [-2.9761, 104.7754],
  lampung: [-5.45, 105.2667],
  balikpapan: [-1.2379, 116.8289],
  samarinda: [-0.5022, 117.1536],
  banjarmasin: [-3.3194, 114.5908],
  pontianak: [-0.0263, 109.3425],
};

function getFallbackCoords(name: string, city?: string | null, address?: string | null, offsetIndex = 0): [number, number] {
  const combined = `${name} ${city || ""} ${address || ""}`.toLowerCase();
  
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (combined.includes(key)) {
      const latOffset = (offsetIndex * 0.01) - 0.005;
      const lngOffset = (offsetIndex * 0.01) - 0.005;
      return [coords[0] + latOffset, coords[1] + lngOffset];
    }
  }

  // Default coordinate (Sidoarjo/Surabaya region)
  return [-7.4478 + (offsetIndex * 0.015), 112.7183 + (offsetIndex * 0.015)];
}

// In-memory geocode cache to prevent redundant network calls
const geocodeCache = new Map<string, [number, number]>();

async function geocodeLocation(query: string, fallback: [number, number]): Promise<[number, number]> {
  const clean = query.trim();
  if (!clean) return fallback;
  if (geocodeCache.has(clean)) return geocodeCache.get(clean)!;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=id&q=${encodeURIComponent(clean)}`;
    const res = await fetch(url, {
      headers: {
        "Accept-Language": "id,en",
        "User-Agent": "VokasiFlow-AI/1.0",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
        const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        geocodeCache.set(clean, coords);
        return coords;
      }
    }
  } catch (err) {
    console.warn("Geocoding fetch error:", err);
  }

  return fallback;
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
  const [tileLayerType, setTileLayerType] = useState<"STREET" | "SATELLITE" | "DARK">("STREET");
  const [isRoutingLoading, setIsRoutingLoading] = useState<boolean>(false);
  const [realDistanceKm, setRealDistanceKm] = useState<number | null>(initialDistanceKm ?? null);
  const [realTravelTimeMin, setRealTravelTimeMin] = useState<number | null>(initialTravelTimeMinutes ?? null);

  const originQuery = [originAddress, originCity, originName].filter(Boolean).join(", ");
  const destQuery = destinationName
    ? [destinationAddress, destinationCity, destinationName].filter(Boolean).join(", ")
    : "";

  const googleMapsWebDirUrl = destinationName
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originQuery)}&destination=${encodeURIComponent(destQuery)}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(originQuery)}`;

  useEffect(() => {
    let isCancelled = false;

    async function loadMapAndRoute() {
      if (!mapContainerRef.current) return;
      setIsRoutingLoading(true);

      // Clean up previous map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // 1. Resolve Fallback Coordinates
      const originFallback = getFallbackCoords(originName, originCity, originAddress, 0);
      const destFallback = destinationName
        ? getFallbackCoords(destinationName, destinationCity, destinationAddress, 1)
        : null;

      // 2. Perform Real Dynamic Geocoding
      const originSearchQuery = [originAddress || originName, originCity, "Indonesia"].filter(Boolean).join(", ");
      const destSearchQuery = destinationName
        ? [destinationAddress || destinationName, destinationCity, "Indonesia"].filter(Boolean).join(", ")
        : "";

      const originCoords = await geocodeLocation(originSearchQuery, originFallback);
      const destCoords = destSearchQuery && destFallback
        ? await geocodeLocation(destSearchQuery, destFallback)
        : null;

      if (isCancelled || !mapContainerRef.current) return;

      // 3. Initialize Leaflet Map
      const map = L.map(mapContainerRef.current, {
        center: originCoords,
        zoom: 13,
        zoomControl: false,
      });

      const tileUrls = {
        STREET: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        SATELLITE: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        DARK: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      };

      const tileAttributions = {
        STREET: "&copy; OpenStreetMap contributors | Google Maps Platform",
        SATELLITE: "&copy; Esri World Imagery",
        DARK: "&copy; CartoDB",
      };

      L.tileLayer(tileUrls[tileLayerType], {
        attribution: tileAttributions[tileLayerType],
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);

      // Custom Icon for PKT
      const pktIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div style="background: linear-gradient(135deg, #1d4ed8, #2563eb); color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(37,99,235,0.4); border: 2.5px solid white; font-size: 16px;">
            🏢
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      // Custom Icon for SMK
      const smkIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div style="background: linear-gradient(135deg, #059669, #10b981); color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(16,185,129,0.4); border: 2.5px solid white; font-size: 16px;">
            🏫
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const originMarker = L.marker(originCoords, { icon: pktIcon }).addTo(map);
      originMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px; min-width: 180px;">
          <div style="font-size: 11px; font-weight: bold; color: #1e40af; text-transform: uppercase; margin-bottom: 2px;">🏢 Lokasi Cabang PKT</div>
          <div style="font-size: 13px; font-weight: bold; color: #0f172a;">${originName}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${originAddress || originCity || "Indonesia"}</div>
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(originQuery)}" target="_blank" rel="noreferrer" style="display: inline-block; margin-top: 6px; font-size: 11px; color: #2563eb; text-decoration: none; font-weight: bold;">Buka di Google Maps ➔</a>
        </div>
      `);

      if (destCoords && destinationName) {
        const destMarker = L.marker(destCoords, { icon: smkIcon }).addTo(map);
        destMarker.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px; min-width: 180px;">
            <div style="font-size: 11px; font-weight: bold; color: #065f46; text-transform: uppercase; margin-bottom: 2px;">🏫 Sekolah Vokasi (SMK)</div>
            <div style="font-size: 13px; font-weight: bold; color: #0f172a;">${destinationName}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${destinationAddress || destinationCity || "Indonesia"}</div>
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destQuery)}" target="_blank" rel="noreferrer" style="display: inline-block; margin-top: 6px; font-size: 11px; color: #059669; text-decoration: none; font-weight: bold;">Buka di Google Maps ➔</a>
          </div>
        `);

        // 4. Fetch Real Road Geometry via OSRM Driving Router
        let routeCoordinates: [number, number][] = [originCoords, destCoords];
        try {
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords[1]},${originCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`;
          const osrmRes = await fetch(osrmUrl);
          if (osrmRes.ok) {
            const osrmData = await osrmRes.json();
            if (osrmData.routes && osrmData.routes.length > 0) {
              const route = osrmData.routes[0];
              const geojsonCoords = route.geometry.coordinates; // [lng, lat]
              routeCoordinates = geojsonCoords.map((c: [number, number]) => [c[1], c[0]]);

              const calcKm = Math.round((route.distance / 1000) * 10) / 10;
              const calcMin = Math.round(route.duration / 60);
              setRealDistanceKm(calcKm);
              setRealTravelTimeMin(calcMin);
            }
          }
        } catch (err) {
          console.warn("OSRM routing error, using direct vector line:", err);
        }

        // Draw Route Polyline on Map
        const routeLine = L.polyline(routeCoordinates, {
          color: "#2563eb",
          weight: 5,
          opacity: 0.85,
        }).addTo(map);

        const group = L.featureGroup([originMarker, destMarker, routeLine]);
        map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 15 });
      } else {
        map.setView(originCoords, 14);
      }

      mapInstanceRef.current = map;
      setIsRoutingLoading(false);
    }

    loadMapAndRoute();

    return () => {
      isCancelled = true;
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
              <span>Peta Lokasi &amp; Rute Geospasial</span>
              {isRoutingLoading ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <RotateCw className="h-2.5 w-2.5 animate-spin" /> Menghitung Rute Nyata...
                </span>
              ) : (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Rute Jalan Riil
                </span>
              )}
            </h4>
            <p className="text-xs text-muted-foreground">
              {destinationName
                ? `Rute jalan dari ${originName} menuju ${destinationName}`
                : `Lokasi Cabang PKT: ${originName}`}
            </p>
          </div>
        </div>

        {/* Map Type Switcher */}
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

          {(realDistanceKm !== null || initialDistanceKm !== undefined) && (
            <div className="flex items-center gap-3 font-semibold text-primary shrink-0 bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
              <span className="flex items-center gap-1">
                <Car className="h-3.5 w-3.5" /> ±{realDistanceKm ?? initialDistanceKm} km
              </span>
              {(realTravelTimeMin !== null || initialTravelTimeMinutes !== undefined) && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> ~{realTravelTimeMin ?? initialTravelTimeMinutes} menit
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
            <span>Buka Petunjuk Arah Resmi di Google Maps</span>
          </a>
        </div>
      </div>
    </div>
  );
}

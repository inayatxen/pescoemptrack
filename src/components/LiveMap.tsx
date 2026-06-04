import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  color?: string;
  self?: boolean;
}

export default function LiveMap({ markers }: { markers: MapMarker[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const bounds = useMemo(
    () => (markers.length ? L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number])) : null),
    [markers],
  );

  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    markers.forEach((m) => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:32px;height:32px">
          <div style="position:absolute;inset:0;border-radius:9999px;background:${m.color ?? "#6366f1"};opacity:.35;animation:pulse 2s infinite"></div>
          <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:9999px;background:${m.color ?? "#6366f1"};border:2px solid white;box-shadow:0 0 12px ${m.color ?? "#6366f1"}"></div>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      L.marker([m.lat, m.lng], { icon }).addTo(layer).bindTooltip(m.label, { permanent: false, direction: "top" });
    });
    if (bounds && markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], Math.max(map.getZoom(), 14));
    } else if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [markers, bounds]);

  return (
    <>
      <style>{`@keyframes pulse{0%{transform:scale(.6);opacity:.6}100%{transform:scale(1.6);opacity:0}}`}</style>
      <div ref={containerRef} className="h-full w-full" />
    </>
  );
}
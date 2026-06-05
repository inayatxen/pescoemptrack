import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import L from "leaflet";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  SkipBack,
  History,
  Users,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/route-history")({
  head: () => ({ meta: [{ title: "Route History — Field Group Tracker" }] }),
  component: RouteHistory,
});

const COLORS = ["#f97316", "#22d3ee", "#f59e0b", "#ec4899", "#10b981", "#f43f5e", "#8b5cf6", "#14b8a6"];

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function RouteHistory() {
  const { user } = Route.useRouteContext();

  const today = toDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMember, setSelectedMember] = useState<string>(user.id);
  const [playbackIdx, setPlaybackIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: members } = useQuery({
    queryKey: ["history-members", user.id],
    queryFn: async () => {
      const { data: memberRows } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);
      const memberIds = (memberRows ?? []).map((r) => r.group_id);
      const { data: groups } = await supabase
        .from("groups")
        .select("id, admin_id")
        .or(`admin_id.eq.${user.id}${memberIds.length ? `,id.in.(${memberIds.join(",")})` : ""}`);
      const gIds = (groups ?? []).map((g) => g.id);
      if (!gIds.length) return [{ id: user.id, display_name: "Me" }];
      const { data: mems } = await supabase
        .from("group_members")
        .select("user_id")
        .in("group_id", gIds);
      const ids = Array.from(
        new Set([...(mems ?? []).map((m) => m.user_id), ...(groups ?? []).map((g) => g.admin_id)]),
      );
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);
      return (profs ?? []).sort((a, b) =>
        a.id === user.id ? -1 : b.id === user.id ? 1 : a.display_name.localeCompare(b.display_name),
      );
    },
  });

  const { data: trail, isLoading } = useQuery({
    queryKey: ["location-history", selectedMember, selectedDate],
    queryFn: async () => {
      const start = `${selectedDate}T00:00:00.000Z`;
      const end = `${selectedDate}T23:59:59.999Z`;
      const { data, error } = await supabase
        .from("location_history")
        .select("*")
        .eq("user_id", selectedMember)
        .gte("recorded_at", start)
        .lte("recorded_at", end)
        .order("recorded_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!selectedMember,
  });

  useEffect(() => {
    setPlaybackIdx(0);
    setPlaying(false);
  }, [trail]);

  useEffect(() => {
    if (playing && trail && trail.length > 0) {
      playRef.current = setInterval(() => {
        setPlaybackIdx((i) => {
          if (i >= trail.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, 400);
    }
    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [playing, trail]);

  const memberColor = useMemo(() => {
    const idx = (members ?? []).findIndex((m) => m.id === selectedMember);
    return COLORS[Math.max(0, idx) % COLORS.length];
  }, [members, selectedMember]);

  const currentPoint = trail && trail.length > 0 ? trail[playbackIdx] : null;
  const memberName = (members ?? []).find((m) => m.id === selectedMember)?.display_name ?? "Member";

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    if (d > new Date()) return;
    setSelectedDate(toDateStr(d));
  };

  const totalDistance = useMemo(() => {
    if (!trail || trail.length < 2) return 0;
    let dist = 0;
    for (let i = 1; i < trail.length; i++) {
      dist += haversine(
        trail[i - 1].latitude,
        trail[i - 1].longitude,
        trail[i].latitude,
        trail[i].longitude,
      );
    }
    return dist;
  }, [trail]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card px-1 py-1">
          <button
            onClick={() => changeDate(-1)}
            className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-32 bg-transparent text-sm font-medium outline-none"
          />
          <button
            onClick={() => changeDate(1)}
            disabled={selectedDate >= today}
            className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="bg-transparent text-sm outline-none"
          >
            {(members ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === user.id ? `${m.display_name} (you)` : m.display_name}
              </option>
            ))}
          </select>
        </div>

        {trail && trail.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {trail.length} points
            </span>
            <span>{totalDistance.toFixed(2)} km</span>
          </div>
        )}
      </div>

      <div className="relative flex-1">
        {isLoading ? (
          <div className="grid h-full place-items-center">
            <div className="text-sm text-muted-foreground">Loading trail…</div>
          </div>
        ) : !trail || trail.length === 0 ? (
          <div className="grid h-full place-items-center">
            <div className="text-center">
              <History className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No location data for this day.</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Location is recorded while tracking is enabled.
              </p>
            </div>
          </div>
        ) : (
          <TrailMap trail={trail} playbackIdx={playbackIdx} color={memberColor} />
        )}

        {trail && trail.length > 0 && (
          <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/95 px-5 py-3 shadow-lg backdrop-blur">
              <button
                onClick={() => {
                  setPlaybackIdx(0);
                  setPlaying(false);
                }}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPlaying((p) => !p)}
                className="grid h-9 w-9 place-items-center rounded-xl text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <div className="flex min-w-[140px] flex-col gap-1">
                <input
                  type="range"
                  min={0}
                  max={trail.length - 1}
                  value={playbackIdx}
                  onChange={(e) => {
                    setPlaying(false);
                    setPlaybackIdx(Number(e.target.value));
                  }}
                  className="w-full accent-[var(--primary)]"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>
                    {playbackIdx + 1}/{trail.length}
                  </span>
                  {currentPoint && (
                    <span>
                      {new Date(currentPoint.recorded_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="font-medium">{memberName}</div>
                {currentPoint?.speed != null && (
                  <div className="text-muted-foreground">
                    {(currentPoint.speed * 3.6).toFixed(1)} km/h
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type HistoryPoint = {
  latitude: number;
  longitude: number;
  speed: number | null;
  accuracy: number | null;
  recorded_at: string;
};

function TrailMap({
  trail,
  playbackIdx,
  color,
}: {
  trail: HistoryPoint[];
  playbackIdx: number;
  color: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const dotLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [20, 0], zoom: 2, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    dotLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const dotLayer = dotLayerRef.current;
    if (!map || !dotLayer || trail.length === 0) return;

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    dotLayer.clearLayers();

    const latlngs = trail.map((p) => [p.latitude, p.longitude] as [number, number]);

    polylineRef.current = L.polyline(latlngs, {
      color,
      weight: 3,
      opacity: 0.7,
      dashArray: "6 4",
    }).addTo(map);

    latlngs.forEach((ll, i) => {
      const dot = L.circleMarker(ll, {
        radius: 4,
        color: "white",
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.9,
      });
      dot.bindTooltip(
        new Date(trail[i].recorded_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        { direction: "top", permanent: false },
      );
      dotLayer.addLayer(dot);
    });

    map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40], maxZoom: 16 });
  }, [trail, color]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || trail.length === 0) return;
    const point = trail[playbackIdx];
    const ll: [number, number] = [point.latitude, point.longitude];

    const icon = L.divIcon({
      className: "",
      html: `<div style="position:relative;width:28px;height:28px">
        <div style="position:absolute;inset:0;border-radius:9999px;background:${color};opacity:.35;animation:pulse 2s infinite"></div>
        <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:9999px;background:${color};border:2.5px solid white;box-shadow:0 0 10px ${color}"></div>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng(ll).setIcon(icon);
    } else {
      markerRef.current = L.marker(ll, { icon }).addTo(map);
    }

    map.panTo(ll, { animate: true, duration: 0.3 });
  }, [playbackIdx, trail, color]);

  return (
    <>
      <style>{`@keyframes pulse{0%{transform:scale(.6);opacity:.6}100%{transform:scale(1.6);opacity:0}}`}</style>
      <div ref={containerRef} className="h-full w-full" />
    </>
  );
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

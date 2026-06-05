import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const HISTORY_INTERVAL_MS = 30_000; // record a breadcrumb at most every 30s

export function useShareLocation(enabled: boolean, userId: string) {
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const lastHistoryAt = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    setError(null);
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, speed, accuracy } = pos.coords;
        const now = Date.now();

        const { error: upErr } = await supabase.from("locations").upsert({
          user_id: userId,
          latitude,
          longitude,
          speed: speed ?? null,
          accuracy: accuracy ?? null,
          updated_at: new Date().toISOString(),
        });
        if (upErr) {
          setError(upErr.message);
          return;
        }

        setLastUpdate(new Date());

        // Write a breadcrumb into history at most every 30s
        if (now - lastHistoryAt.current >= HISTORY_INTERVAL_MS) {
          lastHistoryAt.current = now;
          await supabase.from("location_history").insert({
            user_id: userId,
            latitude,
            longitude,
            speed: speed ?? null,
            accuracy: accuracy ?? null,
            recorded_at: new Date().toISOString(),
          });
        }
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled, userId]);

  return { error, lastUpdate };
}

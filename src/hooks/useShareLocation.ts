import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useShareLocation(enabled: boolean, userId: string) {
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

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
        const { error: upErr } = await supabase.from("locations").upsert({
          user_id: userId,
          latitude,
          longitude,
          speed: speed ?? null,
          accuracy: accuracy ?? null,
          updated_at: new Date().toISOString(),
        });
        if (upErr) setError(upErr.message);
        else setLastUpdate(new Date());
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled, userId]);

  return { error, lastUpdate };
}
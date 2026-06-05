import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useShareLocation } from "@/hooks/useShareLocation";

type Ctx = {
  sharing: boolean;
  setSharing: (v: boolean) => void;
  toggle: () => void;
  error: string | null;
  lastUpdate: Date | null;
};

const SharingCtx = createContext<Ctx | null>(null);

export function SharingProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [sharing, setSharing] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("emp.sharing") === "1";
  });

  useEffect(() => {
    if (typeof window !== "undefined")
      window.localStorage.setItem("emp.sharing", sharing ? "1" : "0");
  }, [sharing]);

  const { error, lastUpdate } = useShareLocation(sharing, userId);

  return (
    <SharingCtx.Provider
      value={{ sharing, setSharing, toggle: () => setSharing((s) => !s), error, lastUpdate }}
    >
      {children}
    </SharingCtx.Provider>
  );
}

export function useSharing() {
  const v = useContext(SharingCtx);
  if (!v) throw new Error("useSharing must be used inside SharingProvider");
  return v;
}
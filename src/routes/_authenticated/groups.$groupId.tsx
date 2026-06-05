import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import LiveMap, { type MapMarker } from "@/components/LiveMap";
import { useSharing } from "@/contexts/SharingContext";
import { ArrowLeft, Radio, Copy, Users, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/groups/$groupId")({
  head: () => ({ meta: [{ title: "Live tracking — Emptracker" }] }),
  component: GroupPage,
});

const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#ec4899", "#10b981", "#f43f5e", "#8b5cf6", "#14b8a6"];

function GroupPage() {
  const { groupId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { sharing, toggle, error: locError, lastUpdate } = useSharing();
  const [showMembers, setShowMembers] = useState(false);

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("*").eq("id", groupId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: members } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);
      if (error) throw error;
      const ids = Array.from(new Set([...(rows ?? []).map((r) => r.user_id), group?.admin_id].filter(Boolean) as string[]));
      if (!ids.length) return [];
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      return (profiles ?? []).map((p) => ({ ...p, isAdmin: p.id === group?.admin_id }));
    },
    enabled: !!group,
  });

  const memberIds = useMemo(() => (members ?? []).map((m) => m.id), [members]);

  const { data: locations } = useQuery({
    queryKey: ["locations", groupId, memberIds.join(",")],
    queryFn: async () => {
      if (!memberIds.length) return [];
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .in("user_id", memberIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: memberIds.length > 0,
    refetchInterval: 15000,
  });

  // realtime
  useEffect(() => {
    if (!memberIds.length) return;
    const channel = supabase
      .channel(`loc-${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "locations" }, () => {
        qc.invalidateQueries({ queryKey: ["locations", groupId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, memberIds, qc]);

  const markers: MapMarker[] = useMemo(() => {
    return (locations ?? []).map((loc, idx) => {
      const member = members?.find((m) => m.id === loc.user_id);
      return {
        id: loc.user_id,
        lat: loc.latitude,
        lng: loc.longitude,
        label: `${member?.display_name ?? "Member"}${loc.user_id === user.id ? " (you)" : ""}`,
        color: loc.user_id === user.id ? "#a78bfa" : COLORS[idx % COLORS.length],
        self: loc.user_id === user.id,
      };
    });
  }, [locations, members, user.id]);

  const isAdmin = group?.admin_id === user.id;

  const copyCode = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.invite_code);
    toast.success("Invite code copied");
  };

  const leave = async () => {
    if (isAdmin) {
      if (!confirm("Delete this group? This removes all members.")) return;
      await supabase.from("groups").delete().eq("id", groupId);
    } else {
      await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
    }
    navigate({ to: "/dashboard" });
  };

  if (groupLoading || !group) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div className="absolute inset-0">
        <LiveMap markers={markers} />
      </div>

      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-[1000] flex items-center justify-between gap-2 p-3">
        <Link
          to="/dashboard"
          className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card/90 backdrop-blur hover:bg-card"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 rounded-xl border border-border bg-card/90 px-3 py-2 backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{group.name}</div>
              <div className="text-xs text-muted-foreground">{markers.length} live • {members?.length ?? 0} members</div>
            </div>
            <button onClick={copyCode} className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-mono tracking-wider hover:bg-accent">
              {group.invite_code}
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowMembers(true)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card/90 backdrop-blur hover:bg-card"
        >
          <Users className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom share-location panel */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] p-3">
        <div className="rounded-2xl border border-border bg-card/95 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${sharing ? "" : "opacity-40"}`} style={sharing ? { background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" } : { background: "var(--muted)" }}>
                <Radio className={`h-5 w-5 ${sharing ? "text-primary-foreground" : "text-muted-foreground"}`} />
              </div>
              <div>
                <div className="text-sm font-semibold">{sharing ? "Sharing live location" : "Location off"}</div>
                <div className="text-xs text-muted-foreground">
                  {locError ? locError : lastUpdate ? `Updated ${formatAgo(lastUpdate)}` : sharing ? "Waiting for GPS…" : "Tap to share"}
                </div>
              </div>
            </div>
            <button
              onClick={toggle}
              className={`relative h-7 w-12 rounded-full transition ${sharing ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${sharing ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Members sheet */}
      {showMembers && (
        <div className="absolute inset-0 z-[1100] bg-background/60 backdrop-blur-sm" onClick={() => setShowMembers(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-auto rounded-t-3xl border-t border-border bg-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-12 rounded bg-muted" />
            <h2 className="text-lg font-semibold">Members</h2>
            <ul className="mt-4 space-y-2">
              {members?.map((m, idx) => {
                const loc = locations?.find((l) => l.user_id === m.id);
                const color = m.id === user.id ? "#a78bfa" : COLORS[idx % COLORS.length];
                return (
                  <li key={m.id} className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full" style={{ background: color, boxShadow: loc ? `0 0 10px ${color}` : "none" }} />
                      <div>
                        <div className="text-sm font-medium">{m.display_name}{m.id === user.id && " (you)"}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.isAdmin && <span className="mr-2 rounded bg-primary/15 px-1.5 py-0.5 text-primary">Admin</span>}
                          {loc ? `Live · ${formatAgo(new Date(loc.updated_at))}` : "Offline"}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <button
              onClick={leave}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive hover:bg-destructive/20"
            >
              <LogOut className="h-4 w-4" />
              {isAdmin ? "Delete group" : "Leave group"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
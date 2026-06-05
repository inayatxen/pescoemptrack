import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  LogIn,
  WifiOff,
  Users,
  Activity,
  Navigation,
  MapPin,
  Battery,
  Clock,
} from "lucide-react";
import { useSharing } from "@/contexts/SharingContext";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Field Group Tracker" }] }),
  component: Dashboard,
});

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { sharing, toggle, lastUpdate } = useSharing();

  const { data: profile } = useQuery({
    queryKey: ["me-profile", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: groups } = useQuery({
    queryKey: ["my-groups", user.id],
    queryFn: async () => {
      const { data: memberRows } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);
      const memberIds = (memberRows ?? []).map((r) => r.group_id);
      const { data: gs } = await supabase
        .from("groups")
        .select("id, name, invite_code, admin_id, created_at")
        .or(`admin_id.eq.${user.id}${memberIds.length ? `,id.in.(${memberIds.join(",")})` : ""}`)
        .order("created_at", { ascending: false });
      return gs ?? [];
    },
  });

  const groupIds = (groups ?? []).map((g) => g.id);

  const { data: peers } = useQuery({
    queryKey: ["dashboard-peers", groupIds.join(",")],
    queryFn: async () => {
      if (!groupIds.length) return { members: [], locations: [] };
      const { data: memRows } = await supabase
        .from("group_members")
        .select("user_id, group_id")
        .in("group_id", groupIds);
      const adminIds = (groups ?? []).map((g) => g.admin_id);
      const idSet = new Set<string>([...(memRows ?? []).map((r) => r.user_id), ...adminIds]);
      const ids = Array.from(idSet);
      if (!ids.length) return { members: [], locations: [] };
      const [{ data: profs }, { data: locs }] = await Promise.all([
        supabase.from("profiles").select("id, display_name").in("id", ids),
        supabase.from("locations").select("*").in("user_id", ids),
      ]);
      return { members: profs ?? [], locations: locs ?? [] };
    },
    enabled: groupIds.length > 0,
    refetchInterval: 20000,
  });

  const members = peers?.members ?? [];
  const locations = peers?.locations ?? [];
  const now = Date.now();
  const recent = locations.filter(
    (l) => now - new Date(l.updated_at).getTime() < ONLINE_WINDOW_MS,
  );
  const onlineIds = new Set(recent.map((l) => l.user_id));
  const sharingMembers = recent.filter((l) =>
    members.some((m) => m.id === l.user_id),
  );

  const firstName = (profile?.display_name ?? "there").split(" ")[0];
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6 p-6">
      {/* Welcome row */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {profile?.display_name ?? firstName} <span className="ml-1">👋</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{today}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/groups/new"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            <Plus className="h-4 w-4" />
            Create Group
          </Link>
          <Link
            to="/groups/join"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition hover:bg-accent"
          >
            <LogIn className="h-4 w-4" />
            Join Group
          </Link>
        </div>
      </div>

      {/* Location Sharing banner */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <div
            className={`grid h-12 w-12 place-items-center rounded-xl ${
              sharing ? "" : "bg-muted text-muted-foreground"
            }`}
            style={sharing ? { background: "var(--gradient-primary)" } : undefined}
          >
            {sharing ? (
              <Navigation className="h-5 w-5 text-primary-foreground" />
            ) : (
              <WifiOff className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="font-semibold">Location Sharing</div>
            <div className="text-sm text-muted-foreground">
              {sharing
                ? lastUpdate
                  ? `Live · updated ${formatAgo(lastUpdate)}`
                  : "Acquiring GPS signal…"
                : "Your location is currently hidden"}
            </div>
          </div>
        </div>
        <button
          onClick={toggle}
          aria-label="Toggle location sharing"
          className={`relative h-7 w-12 rounded-full transition ${
            sharing ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
              sharing ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          value={groups?.length ?? 0}
          label="My Groups"
          color="text-primary"
        />
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          value={onlineIds.size}
          label="Online Members"
          color="text-emerald-400"
        />
        <StatCard
          icon={<Navigation className="h-5 w-5" />}
          value={sharingMembers.length}
          label="Sharing Location"
          color="text-amber-400"
        />
        <StatCard
          icon={<MapPin className="h-5 w-5" />}
          value={members.length}
          label="Total Members"
          color="text-rose-400"
        />
      </div>

      {/* Online + Sharing panels */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Online Members"
          count={onlineIds.size}
          dot="bg-emerald-400"
          empty="No one is online right now"
        >
          {members
            .filter((m) => onlineIds.has(m.id))
            .map((m) => {
              const loc = locations.find((l) => l.user_id === m.id);
              return (
                <MemberRow
                  key={m.id}
                  name={m.display_name}
                  meta={
                    loc ? `${formatAgo(new Date(loc.updated_at))}` : "—"
                  }
                  right={
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Battery className="h-3.5 w-3.5" /> 100%
                    </div>
                  }
                  dotClass="bg-emerald-400"
                />
              );
            })}
        </Panel>

        <Panel
          title="Sharing Location"
          icon={<Navigation className="h-4 w-4 text-primary" />}
          count={sharingMembers.length}
          dot="bg-primary"
          empty="No active GPS streams"
        >
          {sharingMembers.map((loc) => {
            const m = members.find((x) => x.id === loc.user_id);
            const speed = loc.speed ? `${(loc.speed * 3.6).toFixed(1)} km/h` : "0.0 km/h";
            return (
              <MemberRow
                key={loc.user_id}
                name={m?.display_name ?? "Member"}
                meta={`Updated ${formatAgo(new Date(loc.updated_at))}`}
                right={
                  <div className="text-right">
                    <div className="text-xs font-semibold">{speed}</div>
                    <div className="text-[10px] text-muted-foreground">100%</div>
                  </div>
                }
                dotClass="bg-primary"
              />
            );
          })}
        </Panel>
      </div>

      {/* My groups list */}
      {groups && groups.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">My Groups</h3>
            <Link to="/live-tracking" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  to="/groups/$groupId"
                  params={{ groupId: g.id }}
                  className="flex items-center justify-between rounded-xl border border-border bg-background/40 p-3 transition hover:border-primary/50"
                >
                  <div>
                    <div className="font-medium">{g.name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono tracking-wider">
                        {g.invite_code}
                      </span>
                      {g.admin_id === user.id && (
                        <span className="rounded bg-primary/15 px-1.5 py-0.5 text-primary">
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-center">
      <div className={`mx-auto flex h-9 w-9 items-center justify-center ${color}`}>{icon}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Panel({
  title,
  icon,
  count,
  dot,
  empty,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  count: number;
  dot: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon ?? <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />}
          <h3 className="font-semibold">{title}</h3>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {count}
        </span>
      </div>
      <ul className="space-y-2">
        {count === 0 ? (
          <li className="py-6 text-center text-sm text-muted-foreground">{empty}</li>
        ) : (
          children
        )}
      </ul>
    </div>
  );
}

function MemberRow({
  name,
  meta,
  right,
  dotClass,
}: {
  name: string;
  meta: string;
  right?: React.ReactNode;
  dotClass: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <li className="flex items-center justify-between rounded-xl border border-border bg-background/40 p-3">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
            {initial}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${dotClass}`}
          />
        </div>
        <div>
          <div className="text-sm font-medium">{name}</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {meta}
          </div>
        </div>
      </div>
      {right}
    </li>
  );
}

function formatAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Map,
  Users,
  History,
  FileText,
  Bell,
  TriangleAlert,
  User,
  Settings,
  MapPin,
  Radio,
  Palette,
  LogOut,
} from "lucide-react";
import { type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSharing } from "@/contexts/SharingContext";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/live-tracking", label: "Live Tracking", icon: Map },
  { to: "/members", label: "Members", icon: Users },
  { to: "/route-history", label: "Route History", icon: History },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/sos", label: "SOS Alert", icon: TriangleAlert, badge: true },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export default function AppShell({ userId, children }: { userId: string; children: ReactNode }) {
  const { location } = useRouterState();
  const navigate = useNavigate();
  const { sharing } = useSharing();

  const { data: profile } = useQuery({
    queryKey: ["me-profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      return data;
    },
  });

  const { data: isAdmin } = useQuery({
    queryKey: ["me-isAdmin", userId],
    queryFn: async () => {
      const { count } = await supabase
        .from("groups")
        .select("id", { count: "exact", head: true })
        .eq("admin_id", userId);
      return (count ?? 0) > 0;
    },
  });

  const title = pageTitle(location.pathname);
  const initial = (profile?.display_name ?? "U").trim().charAt(0).toUpperCase();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <div
            className="grid h-10 w-10 place-items-center rounded-xl"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            <MapPin className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">Field Group</div>
            <div className="text-xs text-muted-foreground">Tracker</div>
          </div>
        </div>

        <div className="mx-3 mb-3 flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{profile?.display_name ?? "User"}</div>
            <span className="mt-0.5 inline-block rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
              {isAdmin ? "Admin" : "Member"}
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.to ||
              (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-sidebar-accent font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive shadow-[0_0_8px] shadow-destructive" />
                )}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={signOut}
          className="m-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-sidebar-accent/60 hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-background/80 px-6 py-4 backdrop-blur">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <div className="flex items-center gap-2">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                sharing
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-border bg-muted text-muted-foreground"
              }`}
            >
              <Radio className={`h-3.5 w-3.5 ${sharing ? "animate-pulse" : ""}`} />
              {sharing ? "Tracking" : "Idle"}
            </div>
            <button className="relative grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground hover:bg-card hover:text-foreground">
              <Palette className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground hover:bg-card hover:text-foreground">
              <Bell className="h-4 w-4" />
            </button>
            <Link
              to="/profile"
              className="grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              {initial}
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function pageTitle(path: string) {
  if (path.startsWith("/live-tracking")) return "Live Tracking";
  if (path.startsWith("/members")) return "Members";
  if (path.startsWith("/route-history")) return "Route History";
  if (path.startsWith("/reports")) return "Reports";
  if (path.startsWith("/notifications")) return "Notifications";
  if (path.startsWith("/sos")) return "SOS Alert";
  if (path.startsWith("/profile")) return "Profile";
  if (path.startsWith("/settings")) return "Settings";
  if (path.startsWith("/groups")) return "Group";
  return "Dashboard";
}
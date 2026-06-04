import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Plus, UserPlus, LogOut, Users, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Emptracker" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();

  const { data: groups, isLoading } = useQuery({
    queryKey: ["my-groups", user.id],
    queryFn: async () => {
      const { data: memberRows } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);
      const memberIds = (memberRows ?? []).map((r) => r.group_id);
      const { data: gs, error } = await supabase
        .from("groups")
        .select("id, name, invite_code, admin_id, created_at")
        .or(`admin_id.eq.${user.id}${memberIds.length ? `,id.in.(${memberIds.join(",")})` : ""}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return gs ?? [];
    },
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
    toast.success("Signed out");
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
            <MapPin className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">Emptracker</span>
        </div>
        <button onClick={signOut} className="rounded-lg p-2 text-muted-foreground hover:bg-card hover:text-foreground">
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Your groups</h1>
          <p className="text-sm text-muted-foreground">Create a group or join one with a code.</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <Link
            to="/groups/new"
            className="flex flex-col items-start gap-2 rounded-2xl border border-border p-4 backdrop-blur transition hover:border-primary/50"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            <Plus className="h-5 w-5 text-primary-foreground" />
            <div>
              <div className="text-sm font-semibold text-primary-foreground">Create group</div>
              <div className="text-xs text-primary-foreground/80">Become an admin</div>
            </div>
          </Link>
          <Link
            to="/groups/join"
            className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-card/60 p-4 backdrop-blur transition hover:border-primary/50"
          >
            <UserPlus className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-semibold">Join group</div>
              <div className="text-xs text-muted-foreground">Use invite code</div>
            </div>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : !groups?.length ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No groups yet. Create one to get started.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  to="/groups/$groupId"
                  params={{ groupId: g.id }}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card/60 p-4 transition hover:border-primary/50 hover:bg-card"
                >
                  <div>
                    <div className="font-semibold">{g.name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono tracking-wider">{g.invite_code}</span>
                      {g.admin_id === user.id && <span className="rounded bg-primary/15 px-1.5 py-0.5 text-primary">Admin</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
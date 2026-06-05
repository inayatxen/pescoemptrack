import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Map, MapPin, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/live-tracking")({
  head: () => ({ meta: [{ title: "Live Tracking — Field Group Tracker" }] }),
  component: LiveTracking,
});

function LiveTracking() {
  const { user } = Route.useRouteContext();

  const { data: groups, isLoading } = useQuery({
    queryKey: ["my-groups-lt", user.id],
    queryFn: async () => {
      const { data: memberRows } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);
      const memberIds = (memberRows ?? []).map((r) => r.group_id);
      const { data } = await supabase
        .from("groups")
        .select("id, name, invite_code, admin_id")
        .or(`admin_id.eq.${user.id}${memberIds.length ? `,id.in.(${memberIds.join(",")})` : ""}`)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Live Tracking</h2>
        <p className="mt-1 text-sm text-muted-foreground">Open a group to see members on the live map.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !groups?.length ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <Users className="mx-auto mb-3 h-8 w-8" />
          You haven't joined any groups yet.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                to="/groups/$groupId"
                params={{ groupId: g.id }}
                className="flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50"
              >
                <div className="mb-6 flex items-center gap-3">
                  <div
                    className="grid h-10 w-10 place-items-center rounded-xl"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <Map className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="font-semibold">{g.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Code <span className="font-mono">{g.invite_code}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-primary">
                  <MapPin className="h-3.5 w-3.5" /> Open live map
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
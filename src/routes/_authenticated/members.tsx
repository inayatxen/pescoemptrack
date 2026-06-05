import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({ meta: [{ title: "Members — Field Group Tracker" }] }),
  component: MembersPage,
});

function MembersPage() {
  const { user } = Route.useRouteContext();

  const { data } = useQuery({
    queryKey: ["all-members", user.id],
    queryFn: async () => {
      const { data: memberRows } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);
      const memberIds = (memberRows ?? []).map((r) => r.group_id);
      const { data: groups } = await supabase
        .from("groups")
        .select("id, name, admin_id")
        .or(`admin_id.eq.${user.id}${memberIds.length ? `,id.in.(${memberIds.join(",")})` : ""}`);
      const gIds = (groups ?? []).map((g) => g.id);
      if (!gIds.length) return [];
      const { data: mems } = await supabase
        .from("group_members")
        .select("user_id, group_id")
        .in("group_id", gIds);
      const ids = Array.from(
        new Set([
          ...(mems ?? []).map((m) => m.user_id),
          ...(groups ?? []).map((g) => g.admin_id),
        ]),
      );
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);
      const { data: locs } = await supabase.from("locations").select("*").in("user_id", ids);
      return (profs ?? []).map((p) => {
        const loc = locs?.find((l) => l.user_id === p.id);
        const isAdmin = (groups ?? []).some((g) => g.admin_id === p.id);
        return { ...p, loc, isAdmin };
      });
    },
  });

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Members</h2>
        <p className="mt-1 text-sm text-muted-foreground">Everyone across the groups you belong to.</p>
      </div>
      <div className="rounded-2xl border border-border bg-card">
        {!data?.length ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Users className="mx-auto mb-3 h-8 w-8" />
            No members yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((m) => {
              const online =
                m.loc && Date.now() - new Date(m.loc.updated_at).getTime() < 5 * 60 * 1000;
              return (
                <li key={m.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                        {m.display_name.charAt(0).toUpperCase()}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
                          online ? "bg-emerald-400" : "bg-muted-foreground"
                        }`}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {m.display_name}
                        {m.id === user.id && (
                          <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {m.isAdmin ? "Admin" : "Member"} · {online ? "Online" : "Offline"}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
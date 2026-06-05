import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Field Group Tracker" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
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

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name);
  }, [profile?.display_name]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["me-profile", user.id] });
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">Update how others see you.</p>
      </div>
      <form onSubmit={save} className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <div className="mt-1 rounded-xl border border-border bg-background/50 px-4 py-3 text-sm text-muted-foreground">
            {user.email}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Display name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            required
            maxLength={60}
            className="mt-1 w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--gradient-primary)" }}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </button>
      </form>
    </div>
  );
}
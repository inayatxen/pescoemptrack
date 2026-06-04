import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateInviteCode } from "@/lib/inviteCode";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/groups/new")({
  head: () => ({ meta: [{ title: "Create group — Emptracker" }] }),
  component: NewGroup,
});

function NewGroup() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const invite_code = generateInviteCode();
      const { data, error } = await supabase
        .from("groups")
        .insert({ name, admin_id: user.id, invite_code })
        .select()
        .single();
      if (error) throw error;
      // admin doesn't need to be in group_members (policies handle it), but add for convenience
      await supabase.from("group_members").insert({ group_id: data.id, user_id: user.id });
      toast.success(`Group created — code ${invite_code}`);
      navigate({ to: "/groups/$groupId", params: { groupId: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-5 py-6" style={{ background: "var(--gradient-hero)" }}>
      <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight">Create a group</h1>
        <p className="mt-1 text-sm text-muted-foreground">You'll become the admin and get an invite code.</p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="text"
            placeholder="Group name (e.g. Field Team A)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={60}
            className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create group
          </button>
        </form>
      </div>
    </div>
  );
}
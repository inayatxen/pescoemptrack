import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/groups/join")({
  head: () => ({ meta: [{ title: "Join group — Emptracker" }] }),
  component: JoinGroup,
});

function JoinGroup() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: group, error } = await supabase
        .from("groups")
        .select("id, name")
        .eq("invite_code", code.toUpperCase().trim())
        .maybeSingle();
      if (error) throw error;
      if (!group) {
        toast.error("No group found with that code");
        return;
      }
      const { error: joinErr } = await supabase
        .from("group_members")
        .insert({ group_id: group.id, user_id: user.id });
      if (joinErr && !joinErr.message.includes("duplicate")) throw joinErr;
      toast.success(`Joined ${group.name}`);
      navigate({ to: "/groups/$groupId", params: { groupId: group.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join");
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
        <h1 className="text-2xl font-bold tracking-tight">Join a group</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter the 6-character invite code from your admin.</p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="text"
            placeholder="e.g. AB3K9P"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            maxLength={10}
            className="w-full rounded-xl border border-border bg-input px-4 py-3 text-center text-lg font-mono tracking-[0.4em] outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Join group
          </button>
        </form>
      </div>
    </div>
  );
}
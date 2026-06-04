import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { MapPin, Users, Radio, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Emptracker — Live group GPS tracking" },
      { name: "description", content: "Create groups, share live GPS location, and track your whole team on one map." },
      { property: "og:title", content: "Emptracker" },
      { property: "og:description", content: "Live group GPS tracking made simple." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
            <MapPin className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Emptracker</span>
        </div>
        <Link to="/auth" className="rounded-lg border border-border bg-card/60 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-card">
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-12 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
          <Radio className="h-3 w-3 text-primary" /> Live, real-time tracking
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
          Know where your team is, <span style={{ background: "var(--gradient-primary)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>right now</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
          Create a group, share a code, and watch every member move on one live map. Built for field teams, events, and field operations.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/auth"
            className="w-full rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 sm:w-auto"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            Get started — free
          </Link>
          <Link to="/auth" className="w-full rounded-xl border border-border bg-card/60 px-6 py-3 text-sm font-semibold backdrop-blur hover:bg-card sm:w-auto">
            I already have an account
          </Link>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Users, title: "Groups & invites", body: "Spin up a group, share a 6-letter code, members join instantly." },
            { icon: MapPin, title: "Live map", body: "See every member move in real time on an interactive map." },
            { icon: ShieldCheck, title: "Privacy-first", body: "Location is only visible to people inside your group." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-card/60 p-5 text-left backdrop-blur">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

import { createFileRoute, Outlet, redirect, useMatches } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { SharingProvider } from "@/contexts/SharingContext";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const matches = useMatches();
  // Group map page is a full-screen experience — render without the shell.
  const isFullscreen = matches.some((m) => m.routeId === "/_authenticated/groups/$groupId");

  return (
    <SharingProvider userId={user.id}>
      {isFullscreen ? (
        <Outlet />
      ) : (
        <AppShell userId={user.id}>
          <Outlet />
        </AppShell>
      )}
    </SharingProvider>
  );
}
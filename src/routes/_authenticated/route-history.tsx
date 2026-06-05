import { createFileRoute } from "@tanstack/react-router";
import Placeholder from "@/components/Placeholder";
import { History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/route-history")({
  head: () => ({ meta: [{ title: "Route History — Field Group Tracker" }] }),
  component: () => (
    <Placeholder
      icon={<History className="h-6 w-6" />}
      title="Route history coming soon"
      description="We'll store breadcrumb trails per member so you can replay any day on the map."
      cta={{ label: "Back to dashboard", to: "/dashboard" }}
    />
  ),
});
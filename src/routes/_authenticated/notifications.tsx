import { createFileRoute } from "@tanstack/react-router";
import Placeholder from "@/components/Placeholder";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Field Group Tracker" }] }),
  component: () => (
    <Placeholder
      icon={<Bell className="h-6 w-6" />}
      title="No notifications yet"
      description="You'll see join requests, SOS alerts and geofence events here."
    />
  ),
});
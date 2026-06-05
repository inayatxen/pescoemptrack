import { createFileRoute } from "@tanstack/react-router";
import Placeholder from "@/components/Placeholder";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — Field Group Tracker" }] }),
  component: () => (
    <Placeholder
      icon={<FileText className="h-6 w-6" />}
      title="Reports coming soon"
      description="Daily summaries, distance covered and time online — exportable to CSV."
      cta={{ label: "Back to dashboard", to: "/dashboard" }}
    />
  ),
});
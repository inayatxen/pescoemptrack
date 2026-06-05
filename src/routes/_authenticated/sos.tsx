import { createFileRoute } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sos")({
  head: () => ({ meta: [{ title: "SOS Alert — Field Group Tracker" }] }),
  component: SosPage,
});

function SosPage() {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] place-items-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-destructive/15 text-destructive">
          <TriangleAlert className="h-9 w-9" />
        </div>
        <h2 className="mt-5 text-2xl font-bold">Send SOS</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Holding the button broadcasts your live location and an alert to every group admin.
        </p>
        <button
          onClick={() => toast.error("SOS feature is not enabled yet")}
          className="mt-6 inline-flex h-32 w-32 items-center justify-center rounded-full bg-destructive text-lg font-bold text-destructive-foreground shadow-[0_0_40px] shadow-destructive/40 transition hover:scale-105"
        >
          SOS
        </button>
      </div>
    </div>
  );
}
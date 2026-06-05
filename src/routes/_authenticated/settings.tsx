import { createFileRoute } from "@tanstack/react-router";
import { useSharing } from "@/contexts/SharingContext";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Field Group Tracker" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { sharing, toggle } = useSharing();
  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Configure tracking behaviour.</p>
      </div>
      <div className="divide-y divide-border rounded-2xl border border-border bg-card">
        <Row
          title="Share my location"
          desc="When on, your live GPS is visible to your groups."
          checked={sharing}
          onToggle={toggle}
        />
        <Row
          title="Background tracking"
          desc="Browser limits apply when the tab is closed."
          checked={false}
          onToggle={() => {}}
          disabled
        />
        <Row
          title="High-accuracy mode"
          desc="Uses more battery for finer location."
          checked={true}
          onToggle={() => {}}
          disabled
        />
      </div>
    </div>
  );
}

function Row({
  title,
  desc,
  checked,
  onToggle,
  disabled,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-5">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`relative h-7 w-12 rounded-full transition disabled:opacity-40 ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
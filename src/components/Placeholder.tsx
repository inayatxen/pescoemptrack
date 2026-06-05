import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export default function Placeholder({
  icon,
  title,
  description,
  cta,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  cta?: { label: string; to: string };
}) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] place-items-center p-6">
      <div className="max-w-md text-center">
        <div
          className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-primary-foreground"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          {icon}
        </div>
        <h2 className="mt-5 text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {cta && (
          <Link
            to={cta.to as "/dashboard"}
            className="mt-5 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            {cta.label}
          </Link>
        )}
      </div>
    </div>
  );
}
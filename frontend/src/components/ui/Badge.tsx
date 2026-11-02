import type { ReactNode } from "react";

type Variant = "success" | "warning" | "danger" | "accent" | "neutral";

interface BadgeProps {
  variant?: Variant;
  children: ReactNode;
  dot?: boolean;
}

const DOT_COLOR: Record<Variant, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  danger:  "var(--danger)",
  accent:  "#818cf8",
  neutral: "var(--text-3)",
};

export default function Badge({ variant = "neutral", children, dot = false }: BadgeProps) {
  return (
    <span className={`badge badge-${variant}`}>
      {dot && (
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: DOT_COLOR[variant], display: "inline-block", flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  );
}

export function statusBadge(status: string) {
  const map: Record<string, { variant: Variant; label: string }> = {
    scored:    { variant: "success", label: "Scored" },
    completed: { variant: "accent",  label: "Completed" },
    active:    { variant: "warning", label: "Active" },
    pending:   { variant: "neutral", label: "Pending" },
  };
  const cfg = map[status] ?? { variant: "neutral", label: status };
  return <Badge variant={cfg.variant} dot>{cfg.label}</Badge>;
}

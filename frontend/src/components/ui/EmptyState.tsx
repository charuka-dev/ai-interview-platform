import type { ReactNode } from "react";
import Button from "./Button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "4rem 2rem", gap: "1rem",
      textAlign: "center", color: "var(--text-2)",
    }}>
      {icon && (
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: "var(--surface-3)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text-3)", marginBottom: "0.5rem",
        }}>
          {icon}
        </div>
      )}
      <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-1)" }}>{title}</p>
      {description && <p style={{ fontSize: "0.9rem", maxWidth: 340 }}>{description}</p>}
      {action && (
        <Button onClick={action.onClick} style={{ marginTop: "0.5rem" }}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

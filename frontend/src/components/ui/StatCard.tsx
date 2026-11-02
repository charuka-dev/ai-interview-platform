import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: string;
  trendUp?: boolean;
  accent?: boolean;
}

export default function StatCard({ label, value, icon, trend, trendUp, accent }: StatCardProps) {
  return (
    <div
      className="card stat-card"
      style={accent ? { borderColor: "var(--accent-ring)", background: "var(--accent-dim)" } : {}}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value" style={accent ? { color: "#a5b4fc" } : {}}>{value}</p>
          {trend && (
            <p style={{
              fontSize: "0.8125rem",
              color: trendUp ? "var(--success)" : "var(--danger)",
              marginTop: "0.25rem",
            }}>
              {trendUp ? "↑" : "↓"} {trend}
            </p>
          )}
        </div>
        {icon && (
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: accent ? "rgba(99,102,241,0.2)" : "var(--surface-3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: accent ? "#a5b4fc" : "var(--text-2)", flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

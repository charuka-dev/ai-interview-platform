import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "../components/ui/EmptyState";
import PageLoader from "../components/ui/PageLoader";
import { userApi, type RoadmapItem } from "../lib/apiClient";
import { ROUTES } from "../routes";
import { Map, Plus } from "lucide-react";

const PRIORITY_CONFIG = {
  high:   { label: "High",   color: "var(--danger)",  bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.2)"  },
  medium: { label: "Medium", color: "var(--warning)", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.2)" },
  low:    { label: "Low",    color: "var(--success)", bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.2)" },
};

export default function RoadmapPage() {
  const navigate = useNavigate();
  const [items, setItems]     = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    userApi.roadmap()
      .then(setItems)
      .catch(() => setError("Unable to load your roadmap"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <h1 className="page-title">Improvement Roadmap</h1>
        <p className="page-subtitle" style={{ marginBottom: "2rem" }}>
          Focus on the areas that will have the biggest impact on your next interview.
        </p>

        {loading ? <PageLoader message="Loading your roadmap…" />
        : error ? (
          <div className="card" style={{ padding: "1.25rem", color: "var(--danger)", fontSize: "0.875rem" }}>{error}</div>
        ) : items.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Map size={22} />}
              title="No roadmap data yet"
              description="Complete an interview to receive your personalized improvement roadmap."
              action={{ label: "Start an Interview", onClick: () => navigate(ROUTES.NEW_INTERVIEW) }}
            />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {items.map((item, i) => {
              const cfg = PRIORITY_CONFIG[item.priority];
              return (
                <motion.div key={item.topic} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, type: "spring", stiffness: 280, damping: 26 }}
                  className="card" style={{ padding: "1.375rem 1.5rem" }}
                >
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: "0.125rem",
                      background: cfg.bg, border: `1px solid ${cfg.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.8125rem", fontWeight: 700, color: cfg.color,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap", marginBottom: "0.375rem" }}>
                        <p style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-1)" }}>{item.topic}</p>
                        <span style={{
                          padding: "0.15rem 0.55rem", borderRadius: 9999, fontSize: "0.72rem",
                          fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                        }}>
                          {cfg.label} priority
                        </span>
                      </div>
                      <p style={{ fontSize: "0.875rem", color: "var(--text-2)", lineHeight: 1.65 }}>{item.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            <div className="card" style={{
              padding: "1.25rem 1.5rem", display: "flex", alignItems: "center",
              justifyContent: "space-between", flexWrap: "wrap", gap: "1rem",
              background: "var(--accent-dim)", borderColor: "var(--accent-ring)",
            }}>
              <div>
                <p style={{ fontWeight: 600, color: "var(--text-1)", fontSize: "0.9375rem" }}>Ready to put this into practice?</p>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-2)", marginTop: "0.125rem" }}>Start another interview focusing on your priority areas.</p>
              </div>
              <button onClick={() => navigate(ROUTES.NEW_INTERVIEW)} className="btn btn-primary btn-sm">
                <Plus size={14} /> New Interview
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

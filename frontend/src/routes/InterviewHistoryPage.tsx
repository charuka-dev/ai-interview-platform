import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/PageLoader";
import { statusBadge } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { userApi, type SessionHistoryItem } from "../lib/apiClient";
import { ROUTES } from "../routes";
import { Clock, Plus } from "lucide-react";

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function InterviewHistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    userApi.history()
      .then(setSessions)
      .catch(() => setError("Failed to load interview history"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = sessions.filter((s) =>
    !search || s.jobPosting?.jobRole?.toLowerCase().includes(search.toLowerCase())
  );

  const avgScore = (s: SessionHistoryItem) =>
    s.score
      ? Math.round((s.score.technicalAccuracy + s.score.communication + s.score.confidence) / 3)
      : null;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
          <div>
            <h1 className="page-title">My Interviews</h1>
            <p className="page-subtitle">Your complete interview history and results</p>
          </div>
          <Button icon={<Plus size={15} />} onClick={() => navigate(ROUTES.NEW_INTERVIEW)}>
            New Interview
          </Button>
        </div>

        {/* Search */}
        {!loading && sessions.length > 0 && (
          <input
            type="search"
            placeholder="Search by role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base"
            style={{ maxWidth: 320, marginBottom: "1.25rem" }}
          />
        )}

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {[1,2,3,4,5].map((i) => <Skeleton key={i} style={{ height: 64, borderRadius: 8 }} />)}
          </div>
        ) : error ? (
          <div className="card" style={{ padding: "1.25rem", color: "var(--danger)", fontSize: "0.875rem" }}>
            {error} — <button onClick={() => window.location.reload()} style={{ color: "#a5b4fc", background: "none", border: "none", cursor: "pointer" }}>Retry</button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Clock size={22} />}
              title="No interviews yet"
              description="Practice your first AI voice interview to see your history here."
              action={{ label: "Start Your First Interview", onClick: () => navigate(ROUTES.NEW_INTERVIEW) }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState title="No results" description={`No interviews matching "${search}".`} />
          </div>
        ) : (
          <div className="card" style={{ overflow: "hidden" }}>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 120px 90px 72px 80px",
              padding: "0.625rem 1.25rem",
              borderBottom: "1px solid var(--border)",
              fontSize: "0.75rem", fontWeight: 600, color: "var(--text-3)",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              <span>Role</span>
              <span>Date</span>
              <span>Status</span>
              <span style={{ textAlign: "right" }}>Score</span>
              <span style={{ textAlign: "right" }}>Action</span>
            </div>

            {filtered.map((s, i) => {
              const score = avgScore(s);
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  style={{
                    display: "grid", gridTemplateColumns: "1fr 120px 90px 72px 80px",
                    alignItems: "center", padding: "0.875rem 1.25rem",
                    borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <p style={{ fontWeight: 500, fontSize: "0.9rem", color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.jobPosting?.jobRole ?? "Interview"}
                  </p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-3)" }}>{fmt(s.createdAt)}</p>
                  <div>{statusBadge(s.status)}</div>
                  <p style={{
                    textAlign: "right", fontWeight: 700, fontSize: "0.9rem",
                    color: score !== null
                      ? score >= 70 ? "var(--success)" : score >= 45 ? "var(--warning)" : "var(--danger)"
                      : "var(--text-3)",
                  }}>
                    {score !== null ? score : "—"}
                  </p>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => navigate(ROUTES.RESULTS(s.id))}
                      style={{ fontSize: "0.8125rem", color: "#a5b4fc", background: "none", border: "none", cursor: "pointer" }}
                    >
                      View →
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

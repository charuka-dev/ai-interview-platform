import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/PageLoader";
import { statusBadge } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { useAuth } from "../lib/authContext";
import { userApi, type SessionHistoryItem, type RoadmapItem } from "../lib/apiClient";
import { ROUTES } from "../routes";
import { Plus, BarChart2, CheckCircle, TrendingUp, Award, Clock, ArrowRight } from "lucide-react";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function avgScore(sessions: SessionHistoryItem[]) {
  const scored = sessions.filter((s) => s.score);
  if (!scored.length) return 0;
  const avg = (s: SessionHistoryItem) =>
    ((s.score!.technicalAccuracy + s.score!.communication + s.score!.confidence) / 3);
  return Math.round(scored.reduce((sum, s) => sum + avg(s), 0) / scored.length);
}

function bestScore(sessions: SessionHistoryItem[]) {
  const scored = sessions.filter((s) => s.score);
  if (!scored.length) return 0;
  const avg = (s: SessionHistoryItem) =>
    ((s.score!.technicalAccuracy + s.score!.communication + s.score!.confidence) / 3);
  return Math.round(Math.max(...scored.map(avg)));
}

const QUICK_START = [
  { label: "Technical Interview",  icon: "💻", role: "Software Engineer" },
  { label: "Behavioral Interview",  icon: "🤝", role: "Behavioral Practice" },
  { label: "System Design",         icon: "🏗️", role: "System Design Engineer" },
  { label: "HR / Culture Fit",      icon: "🎯", role: "Culture Fit Interview" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory]         = useState<SessionHistoryItem[]>([]);
  const [roadmap, setRoadmap]         = useState<RoadmapItem[]>([]);
  const [loadingH, setLoadingH]       = useState(true);
  const [loadingR, setLoadingR]       = useState(true);
  const [errorH, setErrorH]           = useState<string | null>(null);
  const firstName = user?.name?.split(" ")[0] ?? "there";

  useEffect(() => {
    userApi.history()
      .then(setHistory).catch(() => setErrorH("Failed to load history"))
      .finally(() => setLoadingH(false));
    userApi.roadmap()
      .then(setRoadmap).catch(() => setRoadmap([]))
      .finally(() => setLoadingR(false));
  }, []);

  const completed = history.filter((s) => s.status === "scored" || s.status === "completed");

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{ marginBottom: "2rem" }}
      >
        <p style={{ fontSize: "0.875rem", color: "var(--text-3)", marginBottom: "0.25rem" }}>
          {greeting()},
        </p>
        <h1 className="page-title">{firstName} 👋</h1>
        <p className="page-subtitle">Ready to practice your next interview?</p>
      </motion.div>

      {/* ── CTA bar ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "1rem", marginBottom: "2rem",
          padding: "1.25rem 1.5rem", borderRadius: 12,
          background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.08) 100%)",
          border: "1px solid var(--accent-ring)",
        }}
      >
        <div>
          <p style={{ fontWeight: 600, color: "var(--text-1)", fontSize: "0.9375rem" }}>
            Start a new AI voice interview
          </p>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-2)", marginTop: "0.125rem" }}>
            Upload your resume, paste a job description, and start in under 2 minutes.
          </p>
        </div>
        <Button
          icon={<Plus size={16} />}
          onClick={() => navigate(ROUTES.NEW_INTERVIEW)}
          id="dashboard-new-interview-btn"
        >
          New Interview
        </Button>
      </motion.div>

      {/* ── Stats ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}
      >
        {loadingH ? (
          [1,2,3,4].map((i) => <Skeleton key={i} style={{ height: 88, borderRadius: 12 }} />)
        ) : (
          <>
            <StatCard label="Total Interviews" value={history.length} icon={<BarChart2 size={18} />} />
            <StatCard label="Completed"         value={completed.length} icon={<CheckCircle size={18} />} />
            <StatCard label="Average Score"     value={avgScore(history) || "—"} icon={<TrendingUp size={18} />} accent />
            <StatCard label="Best Score"        value={bestScore(history) || "—"} icon={<Award size={18} />} />
          </>
        )}
      </motion.div>

      {/* ── Quick Start ── */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        style={{ marginBottom: "2rem" }}
      >
        <h2 className="section-title" style={{ marginBottom: "0.875rem" }}>Quick Start</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.625rem" }}>
          {QUICK_START.map((q) => (
            <motion.button
              key={q.label}
              whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
              onClick={() => navigate(ROUTES.NEW_INTERVIEW)}
              className="card card-hover"
              style={{
                padding: "1rem 1.125rem", textAlign: "left", cursor: "pointer",
                background: "none", border: "1px solid var(--border)", width: "100%",
                display: "flex", alignItems: "center", gap: "0.75rem",
              }}
            >
              <span style={{ fontSize: "1.375rem" }}>{q.icon}</span>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-1)" }}>{q.label}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-3)", marginTop: "0.125rem" }}>{q.role}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ── Recent interviews ── */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        style={{ marginBottom: "2rem" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
          <h2 className="section-title">Recent Interviews</h2>
          {history.length > 0 && (
            <button
              onClick={() => navigate(ROUTES.HISTORY)}
              style={{ fontSize: "0.8125rem", color: "#a5b4fc", background: "none", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              View all <ArrowRight size={13} />
            </button>
          )}
        </div>

        {loadingH ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {[1,2,3].map((i) => <Skeleton key={i} style={{ height: 60, borderRadius: 8 }} />)}
          </div>
        ) : errorH ? (
          <div className="card" style={{ padding: "1.25rem", color: "var(--danger)", fontSize: "0.875rem" }}>
            {errorH}
          </div>
        ) : history.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Clock size={22} />}
              title="No interviews yet"
              description="Start your first AI voice interview to see your history here."
              action={{ label: "Start Interview", onClick: () => navigate(ROUTES.NEW_INTERVIEW) }}
            />
          </div>
        ) : (
          <div className="card" style={{ overflow: "hidden" }}>
            {history.slice(0, 5).map((s, i) => {
              const avg = s.score
                ? Math.round((s.score.technicalAccuracy + s.score.communication + s.score.confidence) / 3)
                : null;
              return (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center", gap: "1rem",
                  padding: "0.875rem 1.25rem",
                  borderBottom: i < Math.min(history.length - 1, 4) ? "1px solid var(--border)" : "none",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, fontSize: "0.9rem", color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.jobPosting?.jobRole ?? "Interview"}
                    </p>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-3)", marginTop: "0.125rem" }}>
                      {fmt(s.createdAt)}
                    </p>
                  </div>
                  {statusBadge(s.status)}
                  {avg !== null && (
                    <span style={{
                      fontSize: "0.9rem", fontWeight: 700,
                      color: avg >= 70 ? "var(--success)" : avg >= 45 ? "var(--warning)" : "var(--danger)",
                      minWidth: 32, textAlign: "right",
                    }}>
                      {avg}
                    </span>
                  )}
                  <button
                    onClick={() => navigate(ROUTES.RESULTS(s.id))}
                    style={{
                      fontSize: "0.8125rem", color: "#a5b4fc", background: "none",
                      border: "none", cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    View →
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* ── Roadmap snippet ── */}
      {!loadingR && roadmap.length > 0 && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
            <h2 className="section-title">Top Improvement Areas</h2>
            <button
              onClick={() => navigate(ROUTES.ROADMAP)}
              style={{ fontSize: "0.8125rem", color: "#a5b4fc", background: "none", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              Full roadmap <ArrowRight size={13} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {roadmap.slice(0, 3).map((item, i) => {
              const priority = { high: "var(--danger)", medium: "var(--warning)", low: "var(--success)" }[item.priority];
              return (
                <div key={item.topic} className="card" style={{
                  padding: "0.875rem 1.25rem", display: "flex",
                  alignItems: "flex-start", gap: "0.875rem",
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: `color-mix(in srgb, ${priority} 15%, transparent)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontWeight: 700, color: priority, flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: "0.9rem", color: "var(--text-1)" }}>{item.topic}</p>
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-3)", marginTop: "0.125rem" }}>{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>
      )}
    </div>
  );
}

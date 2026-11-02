import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SiriOrb from "../components/voice/SiriOrb";
import Button from "../components/ui/Button";
import { sessionApi, type Score } from "../lib/apiClient";
import { ROUTES } from "../routes";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";

const POLL_MS = 3000;

function ScoreBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-1)" }}>{label}</p>
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ height: 8, borderRadius: 9999, background: "var(--surface-3)", overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          style={{ height: "100%", borderRadius: 9999, background: color }}
        />
      </div>
    </div>
  );
}

function overall(score: Score) {
  return Math.round(
    ((score.technicalAccuracy ?? 0) + (score.communication ?? 0) + (score.confidence ?? 0)) / 3
  );
}

function overallColor(n: number) {
  if (n >= 75) return "var(--success)";
  if (n >= 50) return "var(--warning)";
  return "var(--danger)";
}

export default function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [score, setScore]               = useState<Score | null>(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!sessionId) return;
    async function poll() {
      try {
        const result = await sessionApi.getScore(sessionId!);
        if ((result as any).status === "failed") {
          setError("Scoring failed. The interview was too short or an error occurred.");
          setIsLoading(false);
          clearInterval(pollRef.current);
          return;
        }
        if (!result || (result as { status: number }).status === 202) return;
        setScore((result as any).score || result);
        setIsLoading(false);
        clearInterval(pollRef.current);
      } catch (err: any) {
        if (err.message && (err.message.includes("500") || err.message.includes("failed"))) {
          setError("Scoring failed. The interview was too short or an error occurred.");
          setIsLoading(false);
          clearInterval(pollRef.current);
        }
      }
    }
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [sessionId]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <button onClick={() => navigate(ROUTES.DASHBOARD)}
        style={{ fontSize: "0.875rem", color: "var(--text-3)", background: "none", border: "none",
          cursor: "pointer", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.375rem" }}
      >
        ← Back to dashboard
      </button>

      <AnimatePresence mode="wait">
        {error ? (
          <motion.div key="error"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem", padding: "4rem 0", textAlign: "center" }}
          >
            <div style={{ color: "var(--danger)", marginBottom: "1rem" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "1.125rem", color: "var(--text-1)" }}>
                {error}
              </p>
              <p style={{ fontSize: "0.875rem", color: "var(--text-2)", marginTop: "0.375rem" }}>
                Make sure to actually have a conversation with the AI.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
              <Button icon={<RotateCcw size={15} />} onClick={() => navigate(ROUTES.NEW_INTERVIEW)}>
                Try Again
              </Button>
            </div>
          </motion.div>
        ) : isLoading ? (
          <motion.div key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem", padding: "4rem 0", textAlign: "center" }}
          >
            <SiriOrb volume={0.2} status="idle" size={120} />
            <div>
              <p style={{ fontWeight: 600, fontSize: "1.125rem", color: "var(--text-1)" }}>
                Generating your feedback…
              </p>
              <p style={{ fontSize: "0.875rem", color: "var(--text-2)", marginTop: "0.375rem" }}>
                Our AI is analysing your interview transcript. This takes 10–30 seconds.
              </p>
            </div>
          </motion.div>
        ) : score ? (
          <motion.div key="results"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            {/* Overall score */}
            <div className="card" style={{ padding: "1.75rem", display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
              <div style={{ textAlign: "center", minWidth: 100 }}>
                <p style={{ fontSize: "3.5rem", fontWeight: 800, color: overallColor(overall(score)), letterSpacing: "-0.04em", lineHeight: 1 }}>
                  {overall(score)}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-3)", marginTop: "0.25rem" }}>OUT OF 100</p>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em" }}>
                  Interview Results
                </h1>
                <p style={{ fontSize: "0.875rem", color: "var(--text-2)", marginTop: "0.25rem" }}>
                  Your AI-generated performance report
                </p>
              </div>
            </div>

            {/* Score bars */}
            <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Score Breakdown
              </p>
              <ScoreBar value={score.technicalAccuracy ?? 0} label="Technical Accuracy" color="#818cf8" />
              <ScoreBar value={score.communication      ?? 0} label="Communication"       color="var(--success)" />
              <ScoreBar value={score.confidence         ?? 0} label="Confidence"          color="var(--warning)" />
            </div>

            {/* Reasoning */}
            {score.reasoning && (
              <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Detailed Feedback
                </p>
                {([ ["Technical Accuracy", score.reasoning.technicalAccuracy, "#818cf8"],
                    ["Communication",       score.reasoning.communication,      "#34d399"],
                    ["Confidence",          score.reasoning.confidence,         "#fbbf24"],
                  ] as const).map(([label, text, col]) => (
                  <div key={label} style={{ display: "flex", gap: "0.875rem" }}>
                    <div style={{ width: 3, borderRadius: 9999, background: col, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-1)", marginBottom: "0.25rem" }}>{label}</p>
                      <p style={{ fontSize: "0.875rem", color: "var(--text-2)", lineHeight: 1.65 }}>{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tips */}
            {score.improvementTips && score.improvementTips.length > 0 && (
              <div className="card" style={{ padding: "1.5rem" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>
                  Improvement Tips
                </p>
                <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {score.improvementTips.map((tip, i) => (
                    <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.06 }}
                      style={{ display: "flex", gap: "0.75rem", fontSize: "0.875rem", color: "var(--text-2)", alignItems: "flex-start" }}
                    >
                      <span style={{ color: "#34d399", marginTop: "0.1rem", flexShrink: 0 }}>✓</span>
                      {tip}
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}

            {/* Transcript */}
            {score.transcript && (
              <div className="card" style={{ overflow: "hidden" }}>
                <button
                  onClick={() => setShowTranscript((v) => !v)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "1rem 1.25rem", background: "none", border: "none", cursor: "pointer",
                    fontSize: "0.875rem", fontWeight: 500, color: "var(--text-1)",
                  }}
                  aria-expanded={showTranscript}
                >
                  Full Transcript
                  {showTranscript ? <ChevronUp size={16} color="var(--text-3)" /> : <ChevronDown size={16} color="var(--text-3)" />}
                </button>
                <AnimatePresence>
                  {showTranscript && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                      style={{ overflow: "hidden", borderTop: "1px solid var(--border)" }}
                    >
                      <pre style={{
                        padding: "1.25rem", fontSize: "0.8125rem", color: "var(--text-3)",
                        whiteSpace: "pre-wrap", lineHeight: 1.7, fontFamily: "inherit",
                      }}>
                        {score.transcript}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* CTAs */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Button icon={<RotateCcw size={15} />} onClick={() => navigate(ROUTES.NEW_INTERVIEW)} style={{ flex: 1 }}>
                Practice Again
              </Button>
              <Button variant="secondary" onClick={() => navigate(ROUTES.ROADMAP)} style={{ flex: 1 }}>
                View Roadmap
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

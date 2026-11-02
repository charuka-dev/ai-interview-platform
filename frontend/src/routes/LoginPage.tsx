import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../lib/authContext";
import { ROUTES } from "../routes";

const FEATURES = [
  { icon: "🎙️", title: "Voice-based interviews", desc: "Practice speaking, not typing" },
  { icon: "🤖", title: "AI-powered questions",   desc: "Tailored to your role and resume" },
  { icon: "📊", title: "Detailed scoring",        desc: "Get feedback on every answer" },
  { icon: "🗺️", title: "Improvement roadmap",     desc: "Know exactly what to work on" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout">
      {/* ── Left hero ── */}
      <div style={{
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "3rem 4rem", background: "var(--surface-1)",
        borderRight: "1px solid var(--border)",
      }}
        className="lg-only"
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "3rem" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "var(--accent)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: "1.125rem" }}>🎙️</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.125rem", color: "var(--text-1)" }}>InterviewAI</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: "2.25rem", fontWeight: 800, color: "var(--text-1)",
          letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: "1rem",
        }}>
          Prepare smarter.<br />
          <span style={{ color: "#a5b4fc" }}>Interview better.</span>
        </h1>
        <p style={{ fontSize: "1rem", color: "var(--text-2)", marginBottom: "2.5rem", maxWidth: 360, lineHeight: 1.7 }}>
          Practice realistic voice interviews with an AI interviewer and receive
          personalized feedback on every answer.
        </p>

        {/* Feature list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, background: "var(--surface-3)",
                border: "1px solid var(--border)", display: "flex",
                alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "1rem",
              }}>
                {f.icon}
              </div>
              <div>
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-1)" }}>{f.title}</p>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-3)" }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right — sign-in form ── */}
      <div style={{
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        padding: "2rem 1.5rem", background: "var(--bg)",
      }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ width: "100%", maxWidth: 420 }}
        >
          {/* Mobile logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2rem" }}
            className="mobile-only"
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: "1rem" }}>🎙️</span>
            </div>
            <span style={{ fontWeight: 700, color: "var(--text-1)" }}>InterviewAI</span>
          </div>

          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em" }}>
            Welcome back
          </h2>
          <p style={{ color: "var(--text-2)", fontSize: "0.9rem", marginTop: "0.375rem", marginBottom: "2rem" }}>
            Sign in to continue practicing
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <Input
              id="login-email"
              type="email"
              label="Email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="login-password"
              type="password"
              label="Password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: "0.75rem 1rem", borderRadius: 8,
                  background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)",
                  fontSize: "0.875rem", color: "#f87171",
                }}
                role="alert"
              >
                {error}
              </motion.div>
            )}

            <Button type="submit" loading={loading} size="lg" style={{ width: "100%", marginTop: "0.25rem" }}>
              Sign in
            </Button>
          </form>

          <p style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.875rem", color: "var(--text-2)" }}>
            Don't have an account?{" "}
            <Link to={ROUTES.REGISTER}
              style={{ color: "#a5b4fc", fontWeight: 500, textDecoration: "none" }}
            >
              Create account
            </Link>
          </p>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 1023px) { .lg-only { display: none !important; } }
        @media (min-width: 1024px) { .mobile-only { display: none !important; } }
      `}</style>
    </div>
  );
}

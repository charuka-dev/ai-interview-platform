import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../lib/authContext";
import { ROUTES } from "../routes";

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem" }}>
      <span style={{ color: met ? "var(--success)" : "var(--text-3)", fontSize: "0.75rem" }}>
        {met ? "✓" : "○"}
      </span>
      <span style={{ color: met ? "var(--text-2)" : "var(--text-3)" }}>{label}</span>
    </div>
  );
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const rules = {
    length:  password.length >= 8,
    upper:   /[A-Z]/.test(password),
    number:  /\d/.test(password),
    match:   password === confirm && password.length > 0,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!rules.length) { setError("Password must be at least 8 characters"); return; }
    if (!rules.match)  { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await register(email, password, name);
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout">
      {/* Left hero */}
      <div style={{
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "3rem 4rem", background: "var(--surface-1)",
        borderRight: "1px solid var(--border)",
      }}
        className="lg-only"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "3rem" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: "1.125rem" }}>🎙️</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.125rem", color: "var(--text-1)" }}>InterviewAI</span>
        </div>
        <h1 style={{
          fontSize: "2.25rem", fontWeight: 800, color: "var(--text-1)",
          letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: "1rem",
        }}>
          Start your interview<br />
          <span style={{ color: "#a5b4fc" }}>practice today.</span>
        </h1>
        <p style={{ fontSize: "1rem", color: "var(--text-2)", lineHeight: 1.7, maxWidth: 360 }}>
          Create your free account and get instant access to AI-powered voice
          interview practice with real-time scoring and personalized feedback.
        </p>
        <div style={{
          marginTop: "2rem", padding: "1.25rem", borderRadius: 12,
          background: "var(--surface-2)", border: "1px solid var(--border)",
        }}>
          <p style={{ fontSize: "0.875rem", color: "var(--text-2)", lineHeight: 1.7 }}>
            "InterviewAI helped me land my first software engineering role.
            The AI feedback was incredibly specific and actionable."
          </p>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-3)", marginTop: "0.75rem" }}>
            — University student, CS graduate
          </p>
        </div>
      </div>

      {/* Right — register form */}
      <div style={{
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        padding: "2rem 1.5rem", background: "var(--bg)", overflowY: "auto",
      }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ width: "100%", maxWidth: 420 }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em" }}>
            Create your account
          </h2>
          <p style={{ color: "var(--text-2)", fontSize: "0.9rem", marginTop: "0.375rem", marginBottom: "2rem" }}>
            Join InterviewAI and start practicing today
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
            <Input id="reg-name"  type="text"     label="Full name" placeholder="Jane Smith"
              autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input id="reg-email" type="email"    label="Email"     placeholder="you@example.com"
              autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input id="reg-pw"    type="password" label="Password"  placeholder="Min. 8 characters"
              autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Input id="reg-cpw"   type="password" label="Confirm password" placeholder="Repeat password"
              autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
              error={confirm.length > 0 && !rules.match ? "Passwords do not match" : undefined} />

            {/* Password rules */}
            {password.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", padding: "0.125rem 0" }}>
                <PasswordRule met={rules.length} label="At least 8 characters" />
                <PasswordRule met={rules.upper}  label="One uppercase letter" />
                <PasswordRule met={rules.number} label="One number" />
              </div>
            )}

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
              Create account
            </Button>
          </form>

          <p style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.875rem", color: "var(--text-2)" }}>
            Already have an account?{" "}
            <Link to={ROUTES.LOGIN} style={{ color: "#a5b4fc", fontWeight: 500, textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 1023px) { .lg-only { display: none !important; } }
      `}</style>
    </div>
  );
}

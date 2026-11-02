import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ResumeUpload from "../components/forms/ResumeUpload";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { resumeApi, jobPostingApi, sessionApi } from "../lib/apiClient";
import { ROUTES } from "../routes";
import { Briefcase, FileText, Loader2 } from "lucide-react";

type Step = "form" | "uploading" | "creating";

const STEP_LABELS: Record<Step, string> = {
  form:      "",
  uploading: "Uploading resume…",
  creating:  "Creating your personalized interview…",
};

export default function NewInterviewPage() {
  const navigate = useNavigate();
  const [jobRole, setJobRole]           = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeFile, setResumeFile]     = useState<File | null>(null);
  const [step, setStep]                 = useState<Step>("form");
  const [error, setError]               = useState<string | null>(null);

  const isSubmitting = step !== "form";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!jobRole.trim()) { setError("Job role is required."); return; }
    if (!resumeFile)     { setError("Please upload your resume."); return; }

    try {
      setStep("uploading");
      const resume = await resumeApi.upload(resumeFile);
      setStep("creating");
      const posting = await jobPostingApi.create(jobRole.trim(), jobDescription.trim());
      const session = await sessionApi.create(posting.id, resume.id);
      navigate(ROUTES.INTERVIEW(session.id), {
        state: { vapiAssistantId: session.vapiAssistantId },
        replace: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("form");
    }
  }

  /* ── Generating overlay ── */
  if (isSubmitting) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "60vh", gap: "1.25rem", textAlign: "center",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, background: "var(--accent-dim)",
          border: "1px solid var(--accent-ring)", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <Loader2 size={24} color="var(--accent)" className="animate-spin" />
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: "1.125rem", color: "var(--text-1)" }}>
            {STEP_LABELS[step]}
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--text-2)", marginTop: "0.375rem" }}>
            {step === "creating"
              ? "Analyzing your job description and resume to generate targeted questions…"
              : "Processing your file securely…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <button onClick={() => navigate(ROUTES.DASHBOARD)}
          style={{ fontSize: "0.875rem", color: "var(--text-3)", background: "none", border: "none",
            cursor: "pointer", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.375rem" }}
        >
          ← Back to dashboard
        </button>

        <h1 className="page-title">Create Your Interview</h1>
        <p className="page-subtitle" style={{ marginBottom: "2rem" }}>
          Fill in the details below to generate a personalized AI voice interview.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Section 1 — Job info */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.25rem" }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: "var(--accent-dim)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Briefcase size={16} color="#a5b4fc" />
              </div>
              <p style={{ fontWeight: 600, color: "var(--text-1)", fontSize: "0.9375rem" }}>Job Information</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Input
                id="job-role"
                type="text"
                label="Job Role *"
                placeholder="e.g. Senior Backend Engineer"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                required
              />
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: "0.375rem" }}>
                  Job Description
                  <span style={{ color: "var(--text-3)", fontWeight: 400, marginLeft: "0.375rem" }}>(optional — improves question targeting)</span>
                </label>
                <textarea
                  id="job-description"
                  rows={5}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here…"
                  className="input-base"
                  style={{ resize: "vertical", minHeight: 100 }}
                />
              </div>
            </div>
          </div>

          {/* Section 2 — Resume */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.25rem" }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: "var(--accent-dim)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <FileText size={16} color="#a5b4fc" />
              </div>
              <p style={{ fontWeight: 600, color: "var(--text-1)", fontSize: "0.9375rem" }}>Your Resume *</p>
            </div>
            <ResumeUpload file={resumeFile} onFile={setResumeFile} />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              style={{
                padding: "0.875rem 1rem", borderRadius: 8,
                background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)",
                fontSize: "0.875rem", color: "#f87171",
              }}
              role="alert"
            >
              {error}
            </motion.div>
          )}

          <Button type="submit" size="lg" style={{ width: "100%" }}>
            Generate Interview →
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

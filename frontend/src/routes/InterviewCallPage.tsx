import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import CallControls from "../components/voice/CallControls";
import CaptionOverlay from "../components/voice/CaptionOverlay";
import SiriOrb, { type OrbStatus } from "../components/voice/SiriOrb";
import Button from "../components/ui/Button";
import PageLoader from "../components/ui/PageLoader";
import { sessionApi, type Session } from "../lib/apiClient";
import { vapiClient } from "../lib/vapiClient";
import { ROUTES } from "../routes";
import { Mic, MicOff, Headphones, AlertCircle } from "lucide-react";
import React from "react";

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) return <div style={{color: 'red', padding: 50, background: 'black', height: '100vh', zIndex: 99999, position: 'relative'}}>{(this.state.error as Error).message}<br/><br/>{(this.state.error as Error).stack}</div>;
    return this.props.children;
  }
}

interface Caption {
  text: string;
  speaker: "user" | "assistant";
}

function useOrbSize() {
  const [size, setSize] = useState(Math.min(280, window.innerWidth * 0.55));
  useEffect(() => {
    function update() { setSize(Math.min(280, window.innerWidth * 0.55)); }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

export default function InterviewCallPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const orbSize = useOrbSize();

  const [session, setSession] = useState<Session | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [micGranted, setMicGranted] = useState<boolean | null>(null);

  // Call state
  const [orbStatus, setOrbStatus] = useState<OrbStatus>("connecting");
  const orbStatusRef = useRef<OrbStatus>("connecting");
  const [volume, setVolume] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(() => localStorage.getItem("captionsOn") !== "false");
  const [caption, setCaption] = useState<Caption>({ text: "", speaker: "assistant" });
  const [isEnding, setIsEnding] = useState(false);
  const endingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const assistantIdRef = useRef<string | null>(
    (location.state as { vapiAssistantId?: string } | null)?.vapiAssistantId ?? null
  );

  useEffect(() => {
    if (!sessionId) return;
    sessionApi.get(sessionId).then((s) => {
      setSession(s);
      assistantIdRef.current = s.vapiAssistantId;
    }).catch(console.error);

    // Pre-request mic permission
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        setMicGranted(true);
        stream.getTracks().forEach((t) => t.stop());
      })
      .catch(() => setMicGranted(false));
  }, [sessionId]);

  // Vapi event bindings
  useEffect(() => {
    if (!hasStarted) return;
    const vapi = vapiClient.vapi as any;

    let userSpeakingTimeout: ReturnType<typeof setTimeout> | undefined;
    let lastVolUpdate = 0;

    const onCallStart = () => { orbStatusRef.current = "ai-speaking"; setOrbStatus("ai-speaking"); };
    const onCallEnd = () => { orbStatusRef.current = "idle"; setOrbStatus("idle"); navigateToResults(); };
    const onSpeechStart = () => { orbStatusRef.current = "ai-speaking"; setOrbStatus("ai-speaking"); };
    const onSpeechEnd = () => { orbStatusRef.current = "idle"; setOrbStatus("idle"); };
    
    const onVolume = (level: number) => {
      const now = Date.now();
      if (now - lastVolUpdate > 100) {
        setVolume(level);
        lastVolUpdate = now;
      }

      if (level > 0.1) {
        if (orbStatusRef.current !== "ai-speaking" && orbStatusRef.current !== "user-speaking") {
          orbStatusRef.current = "user-speaking";
          setOrbStatus("user-speaking");
        }
        clearTimeout(userSpeakingTimeout);
        userSpeakingTimeout = setTimeout(() => {
          if (orbStatusRef.current === "user-speaking") {
            orbStatusRef.current = "idle";
            setOrbStatus("idle");
          }
        }, 1000);
      }
    };
    
    const onMsg = (msg: { type: string; role?: string; transcript?: string }) => {
      if (msg.type === "transcript" && msg.transcript) {
        setCaption({ text: msg.transcript, speaker: msg.role === "user" ? "user" : "assistant" });
      }
    };
    const onErr = (err: unknown) => console.error("Vapi error:", err);

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("volume-level", onVolume);
    vapi.on("message", onMsg);
    vapi.on("error", onErr);

    if (assistantIdRef.current) {
      vapiClient.startAssistant(assistantIdRef.current).catch(console.error);
    }

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("volume-level", onVolume);
      vapi.off("message", onMsg);
      vapi.off("error", onErr);
      clearTimeout(endingTimer.current);
      clearTimeout(userSpeakingTimeout);
    };
  }, [hasStarted]); // eslint-disable-line react-hooks/exhaustive-deps

  function navigateToResults() {
    if (!sessionId) return;
    endingTimer.current = setTimeout(() => {
      navigate(ROUTES.RESULTS(sessionId), { replace: true });
    }, 1800);
  }

  const handleEndCall = useCallback(() => {
    if (isEnding) return;
    setIsEnding(true);
    setOrbStatus("idle");
    vapiClient.stop();
    navigateToResults();
  }, [isEnding]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleMute = useCallback(() => {
    const next = !isMuted;
    vapiClient.setMuted(next);
    setIsMuted(next);
  }, [isMuted]);

  const handleToggleCaptions = useCallback(() => {
    setCaptionsOn((prev) => {
      const next = !prev;
      localStorage.setItem("captionsOn", String(next));
      return next;
    });
  }, []);

  const statusLabel: Record<OrbStatus, string> = {
    connecting: "Connecting to AI…",
    idle: "Listening…",
    "ai-speaking": "AI is speaking",
    "user-speaking": "You are speaking",
  };

  // ── Render Preparation Screen ───────────────────────────────────────────────
  if (!hasStarted) {
    if (!session) return <PageLoader message="Loading interview details…" />;
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "2rem", background: "var(--bg)"
      }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          style={{ width: "100%", maxWidth: 540 }}
        >
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: "var(--accent-dim)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem"
            }}>
              <Headphones size={24} color="#a5b4fc" />
            </div>
            <h1 className="page-title">Interview Ready</h1>
            <p className="page-subtitle" style={{ marginTop: "0.5rem" }}>
              Your AI interviewer is ready to begin.
            </p>
          </div>

          <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Role</p>
                <p style={{ fontSize: "1rem", fontWeight: 500, color: "var(--text-1)" }}>{session.jobPosting?.jobRole ?? "General Interview"}</p>
              </div>
              <div className="divider" />
              <div>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-1)", marginBottom: "0.5rem" }}>Instructions</p>
                <ul style={{ fontSize: "0.875rem", color: "var(--text-2)", paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  <li>Find a quiet place with minimal background noise.</li>
                  <li>Speak clearly and naturally at your normal pace.</li>
                  <li>Take your time to think before answering.</li>
                  <li>You can ask the AI to repeat a question if needed.</li>
                </ul>
              </div>
            </div>
          </div>

          {micGranted === false && (
            <div style={{
              padding: "1rem", borderRadius: 8, background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.2)", display: "flex", gap: "0.75rem", marginBottom: "1.5rem"
            }}>
              <AlertCircle size={20} color="var(--warning)" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--warning)" }}>Microphone Access Required</p>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-2)", marginTop: "0.25rem" }}>
                  Please allow microphone access in your browser to start the voice interview.
                </p>
              </div>
            </div>
          )}

          <Button
            size="lg"
            style={{ width: "100%" }}
            disabled={micGranted === false}
            onClick={() => setHasStarted(true)}
            icon={<Mic size={18} />}
          >
            Start Interview
          </Button>
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            style={{
              width: "100%", marginTop: "1rem", background: "none", border: "none",
              cursor: "pointer", color: "var(--text-3)", fontSize: "0.875rem"
            }}
          >
            Cancel and return to dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Render Active Call ────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
    <div style={{
      height: "100vh", width: "100vw", background: "var(--bg)", overflow: "hidden",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      position: "relative", userSelect: "none"
    }}>
      {/* Ambient background blur */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, rgba(30, 27, 75, 0.4) 0%, var(--bg) 70%)"
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: 600, height: 600, borderRadius: "50%", background: "rgba(99, 102, 241, 0.05)",
          filter: "blur(80px)"
        }} />
      </div>

      {/* Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        style={{ position: "relative", zIndex: 10, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: orbStatus === "connecting" ? "var(--warning)" : "var(--success)",
          animation: orbStatus === "connecting" ? "pulse 2s infinite" : "none"
        }} />
        <span style={{ fontSize: "0.875rem", color: "var(--text-2)", fontWeight: 500 }}>
          {statusLabel[orbStatus]}
        </span>
      </motion.div>

      {/* Orb */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.1 }}
        style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <SiriOrb volume={volume} status={orbStatus} size={orbSize} />
      </motion.div>

      {/* Captions area */}
      <div style={{
        position: "relative", zIndex: 10, marginTop: "2rem", width: "100%",
        padding: "0 1rem", display: "flex", justifyContent: "center", minHeight: 60
      }}>
        <CaptionOverlay visible={captionsOn} text={caption.text} speaker={caption.speaker} />
      </div>

      {/* Controls */}
      <div style={{ position: "relative", zIndex: 10, marginTop: "1.5rem" }}>
        <CallControls
          isMuted={isMuted} captionsOn={captionsOn}
          onToggleMute={handleToggleMute} onToggleCaptions={handleToggleCaptions}
          onEndCall={handleEndCall} isEnding={isEnding}
        />
      </div>

      {/* Muted Warning */}
      <AnimatePresence>
        {isMuted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: "absolute", bottom: "2rem", zIndex: 10,
              display: "flex", alignItems: "center", gap: "0.375rem",
              fontSize: "0.75rem", fontWeight: 600, color: "var(--warning)",
              background: "rgba(245, 158, 11, 0.1)", padding: "0.375rem 0.75rem", borderRadius: 9999
            }}
          >
            <MicOff size={14} /> Microphone muted
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}

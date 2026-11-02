import { motion } from "framer-motion";
import { Mic, MicOff, Captions, CaptionsOff, PhoneOff } from "lucide-react";

interface CallControlsProps {
  isMuted: boolean;
  captionsOn: boolean;
  onToggleMute: () => void;
  onToggleCaptions: () => void;
  onEndCall: () => void;
  isEnding?: boolean;
}

interface ControlButtonProps {
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}

function ControlButton({ onClick, active = false, danger = false, label, disabled = false, children }: ControlButtonProps) {
  let bg = "rgba(255, 255, 255, 0.06)";
  let hoverBg = "rgba(255, 255, 255, 0.12)";
  let color = "var(--text-2)";
  let border = "1px solid transparent";

  if (danger) {
    bg = "rgba(239, 68, 68, 0.9)";
    hoverBg = "rgba(239, 68, 68, 1)";
    color = "#fff";
  } else if (active) {
    bg = "var(--accent-dim)";
    hoverBg = "rgba(99, 102, 241, 0.2)";
    color = "#a5b4fc";
    border = "1px solid var(--accent-ring)";
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 60, height: 60, borderRadius: "50%",
        background: disabled ? "rgba(255, 255, 255, 0.03)" : bg,
        color: disabled ? "var(--text-3)" : color,
        border, cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.2s, color 0.2s",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = hoverBg;
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.background = bg;
      }}
    >
      {children}
    </motion.button>
  );
}

export default function CallControls({
  isMuted, captionsOn, onToggleMute, onToggleCaptions, onEndCall, isEnding = false,
}: CallControlsProps) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4, type: "spring", stiffness: 260, damping: 24 }}
      style={{
        display: "flex", alignItems: "center", gap: "1.25rem",
        padding: "1rem 2rem", borderRadius: 9999,
        background: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(12px)",
        border: "1px solid var(--border)",
      }}
    >
      <ControlButton onClick={onToggleMute} active={isMuted} label={isMuted ? "Unmute" : "Mute"}>
        {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
      </ControlButton>
      <ControlButton onClick={onEndCall} danger label="End interview" disabled={isEnding}>
        <PhoneOff size={24} />
      </ControlButton>
      <ControlButton onClick={onToggleCaptions} active={captionsOn} label={captionsOn ? "Hide captions" : "Show captions"}>
        {captionsOn ? <Captions size={22} /> : <CaptionsOff size={22} />}
      </ControlButton>
    </motion.div>
  );
}

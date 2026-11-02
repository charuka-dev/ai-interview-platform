import { AnimatePresence, motion } from "framer-motion";

interface CaptionOverlayProps {
  visible: boolean;
  text: string;
  speaker?: "user" | "assistant";
}

export default function CaptionOverlay({ visible, text, speaker = "assistant" }: CaptionOverlayProps) {
  return (
    <AnimatePresence>
      {visible && text && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{
            maxWidth: 600, width: "100%", padding: "0.875rem 1.5rem", borderRadius: 16,
            background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(8px)",
            border: "1px solid var(--border)", textAlign: "center",
          }}
          aria-live="polite" aria-atomic="true"
        >
          <p style={{ fontSize: "0.9375rem", lineHeight: 1.6, color: "var(--text-1)" }}>
            {speaker === "assistant" && <span style={{ color: "#a5b4fc", fontWeight: 600, marginRight: 8 }}>AI:</span>}
            {speaker === "user"      && <span style={{ color: "var(--success)", fontWeight: 600, marginRight: 8 }}>You:</span>}
            {text}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

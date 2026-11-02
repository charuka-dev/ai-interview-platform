import { motion } from "framer-motion";
import type { SessionHistoryItem } from "../../lib/apiClient";

interface SessionHistoryCardProps {
  session: SessionHistoryItem;
  onClick?: () => void;
}

const STATUS_COLOR: Record<string, string> = {
  scored: "text-emerald-400",
  completed: "text-brand-400",
  active: "text-amber-400",
  pending: "text-slate-500",
};

function ScoreBadge({ value, label }: { value: number; label: string }) {
  const color = value >= 70 ? "text-emerald-400" : value >= 45 ? "text-amber-400" : "text-red-400";
  return (
    <div className="text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

export default function SessionHistoryCard({ session, onClick }: SessionHistoryCardProps) {
  const date = new Date(session.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const hasScore = !!session.score;

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={[
        "bg-surface-2 rounded-xl border border-white/10 p-5 transition-colors duration-200",
        onClick ? "cursor-pointer hover:border-brand-500/50 hover:bg-surface-3" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-slate-100 truncate">
            {session.jobPosting?.jobRole ?? "Interview"}
          </p>
          <p className="text-sm text-slate-500 mt-0.5">{date}</p>
        </div>
        <span className={`text-xs font-medium uppercase tracking-wider shrink-0 ${STATUS_COLOR[session.status] ?? "text-slate-500"}`}>
          {session.status}
        </span>
      </div>

      {hasScore && session.score && (
        <div className="mt-4 pt-4 border-t border-white/10 flex gap-6">
          <ScoreBadge value={session.score.technicalAccuracy} label="Technical" />
          <ScoreBadge value={session.score.communication} label="Comms" />
          <ScoreBadge value={session.score.confidence} label="Confidence" />
        </div>
      )}
    </motion.div>
  );
}

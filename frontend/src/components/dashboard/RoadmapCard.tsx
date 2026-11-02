import { motion } from "framer-motion";
import type { RoadmapItem } from "../../lib/apiClient";

const PRIORITY_STYLES: Record<RoadmapItem["priority"], string> = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export default function RoadmapCard({ item, index }: { item: RoadmapItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 300, damping: 28 }}
      className="flex gap-4 p-4 bg-surface-2 rounded-xl border border-white/10"
    >
      <div className="shrink-0 mt-0.5">
        <span
          className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${PRIORITY_STYLES[item.priority]}`}
        >
          {item.priority}
        </span>
      </div>
      <div>
        <p className="font-semibold text-slate-200">{item.topic}</p>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{item.description}</p>
      </div>
    </motion.div>
  );
}

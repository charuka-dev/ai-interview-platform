/**
 * OrbPreviewPage — isolated SiriOrb test route at /orb-preview
 *
 * Use a volume slider to drive the orb manually and verify:
 *   - All 5 blob layers morph and pulse smoothly
 *   - Each OrbStatus changes color/glow correctly
 *   - 60fps with no jank (check browser DevTools Performance panel)
 *
 * This route is accessible without auth.
 */

import { useState } from "react";
import SiriOrb, { type OrbStatus } from "../components/voice/SiriOrb";
import { Link } from "react-router-dom";
import { ROUTES } from "../routes";

const STATUSES: OrbStatus[] = ["idle", "connecting", "ai-speaking", "user-speaking"];

const STATUS_LABELS: Record<OrbStatus, string> = {
  idle: "💤 Idle / Listening",
  connecting: "⏳ Connecting",
  "ai-speaking": "🤖 AI Speaking",
  "user-speaking": "🎤 User Speaking",
};

export default function OrbPreviewPage() {
  const [volume, setVolume] = useState(0.2);
  const [status, setStatus] = useState<OrbStatus>("idle");
  const [size, setSize] = useState(240);

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 gap-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-100 mb-1">SiriOrb Preview</h1>
        <p className="text-slate-500 text-sm">Adjust the controls below to validate animation quality.</p>
        <Link to={ROUTES.LOGIN} className="text-brand-400 hover:text-brand-300 text-sm mt-1 inline-block">
          ← Back to app
        </Link>
      </div>

      {/* The orb */}
      <div className="flex items-center justify-center" style={{ minHeight: size + 80 }}>
        <SiriOrb volume={volume} status={status} size={size} />
      </div>

      {/* Controls panel */}
      <div className="w-full max-w-sm bg-surface-2 rounded-2xl border border-white/10 p-6 space-y-6">
        {/* Volume slider */}
        <div>
          <label htmlFor="volume-slider" className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Volume level</span>
            <span className="text-brand-300 font-mono">{volume.toFixed(2)}</span>
          </label>
          <input
            id="volume-slider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full accent-brand-500"
          />
        </div>

        {/* Size slider */}
        <div>
          <label htmlFor="size-slider" className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Orb size</span>
            <span className="text-brand-300 font-mono">{size}px</span>
          </label>
          <input
            id="size-slider"
            type="range"
            min={100}
            max={360}
            step={10}
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value, 10))}
            className="w-full accent-brand-500"
          />
        </div>

        {/* Status selector */}
        <div>
          <p className="text-sm text-slate-400 mb-2">Status</p>
          <div className="grid grid-cols-2 gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={[
                  "text-xs py-2 px-3 rounded-lg border transition-colors duration-150 text-left",
                  status === s
                    ? "bg-brand-600/40 border-brand-500 text-brand-200"
                    : "bg-surface-3 border-white/10 text-slate-400 hover:border-white/20",
                ].join(" ")}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

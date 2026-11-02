/**
 * SiriOrb — Apple Siri-style orb with smooth, audio-reactive animation.
 *
 * Architecture (all details matter for 60fps):
 *
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │  3 × <motion.div> glow blob layers          (CSS transform) │  ← Framer Motion
 *  │  1 × <canvas> ribbon detail                 (Canvas 2D API) │  ← rAF loop
 *  │  1 × <canvas> outer ring / wisps            (same canvas)   │
 *  └─────────────────────────────────────────────────────────────┘
 *
 *  Volume pipeline:
 *    raw prop → targetVolumeRef (set from parent, or Vapi event)
 *    → EMA smoothing (α = 0.15) inside rAF → smoothedVolumeRef
 *    → Math.pow(v, 0.6) non-linear curve → reactive (0–1 boosted)
 *    → volumeMotionValue.set(reactive) → Framer Motion spring → glow layers
 *    → also drives Canvas ribbon amplitude directly (no spring needed, canvas is already smooth)
 *
 *  Only `transform` (scale) and `opacity` are animated on glow layers.
 *  The canvas draws into itself — zero layout/paint outside its bounds.
 */

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef } from "react";

export type OrbStatus = "idle" | "connecting" | "ai-speaking" | "user-speaking";

interface SiriOrbProps {
  /** Raw 0–1 volume level. Will be EMA-smoothed internally. */
  volume?: number;
  status?: OrbStatus;
  size?: number;
}

// ── Ribbon config ──────────────────────────────────────────────────────────────

interface Ribbon {
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
  speed: number;
  phaseOffset: number;
  freqMult: number;
  yOffset: number;   // fraction of radius
  thickness: number; // fraction of size
}

const BASE_RIBBONS: Ribbon[] = [
  { hue: 270, saturation: 90, lightness: 68, alpha: 0.88, speed: 0.018, phaseOffset: 0.0, freqMult: 1.8, yOffset: -0.15, thickness: 0.052 },
  { hue: 185, saturation: 95, lightness: 62, alpha: 0.82, speed: 0.022, phaseOffset: 1.1, freqMult: 2.2, yOffset:  0.10, thickness: 0.046 },
  { hue: 155, saturation: 90, lightness: 58, alpha: 0.76, speed: 0.015, phaseOffset: 2.3, freqMult: 1.5, yOffset:  0.32, thickness: 0.040 },
  { hue: 315, saturation: 95, lightness: 66, alpha: 0.72, speed: 0.025, phaseOffset: 3.7, freqMult: 2.6, yOffset: -0.35, thickness: 0.036 },
  { hue: 215, saturation: 95, lightness: 64, alpha: 0.68, speed: 0.012, phaseOffset: 5.0, freqMult: 1.2, yOffset:  0.05, thickness: 0.048 },
];

// Base energy floor per status (volume boosts above this)
const STATUS_ENERGY: Record<OrbStatus, number> = {
  idle:            0.22,
  connecting:      0.40,
  "ai-speaking":   0.72,
  "user-speaking": 0.88,
};

const STATUS_HUE_SHIFT: Record<OrbStatus, number> = {
  idle:            0,
  connecting:      20,
  "ai-speaking":   40,
  "user-speaking": -30,
};

// ── Glow layer definitions (3 layers, rendered as CSS divs) ───────────────────

interface GlowLayer {
  /** Size as multiple of the orb size */
  sizeMult: number;
  blurPx: number;
  /** Framer spring config — outer layer is springier */
  spring: { stiffness: number; damping: number; mass: number };
  /** Scale delta added on top of base reactive scale */
  scaleDelta: number;
  /** Base opacity (volume boosts this) */
  baseOpacity: number;
  /** Maximum opacity at full volume */
  maxOpacity: number;
}

const GLOW_LAYERS: GlowLayer[] = [
  // outermost — wide halo, very blurry, most responsive
  { sizeMult: 1.45, blurPx: 60, spring: { stiffness: 80,  damping: 14, mass: 0.8 }, scaleDelta: 0.22, baseOpacity: 0.30, maxOpacity: 0.65 },
  // mid — medium blur
  { sizeMult: 1.20, blurPx: 38, spring: { stiffness: 120, damping: 18, mass: 0.5 }, scaleDelta: 0.18, baseOpacity: 0.42, maxOpacity: 0.80 },
  // inner — tightest, sharpest
  { sizeMult: 1.00, blurPx: 18, spring: { stiffness: 180, damping: 22, mass: 0.3 }, scaleDelta: 0.12, baseOpacity: 0.55, maxOpacity: 0.92 },
];

// Gradient stops per status — [color1, color2, color3] for the radial gradient
const STATUS_GRADIENTS: Record<OrbStatus, [string, string, string]> = {
  idle:            ["#6366f1", "#8b5cf6", "#a78bfa"],
  connecting:      ["#7c3aed", "#a855f7", "#c084fc"],
  "ai-speaking":   ["#f59e0b", "#d97706", "#7c3aed"],
  "user-speaking": ["#10b981", "#06b6d4", "#6366f1"],
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function SiriOrb({ volume = 0, status = "idle", size = 240 }: SiriOrbProps) {
  // ── Refs: raw inputs, never cause re-renders ─────────────────────────────
  const targetVolumeRef  = useRef(volume);
  const smoothedVolumeRef = useRef(0);
  const statusRef        = useRef(status);
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const rafRef           = useRef<number>(0);
  const frameRef         = useRef(0);

  // Sync incoming props → refs (no re-render)
  useEffect(() => { targetVolumeRef.current  = volume; }, [volume]);
  useEffect(() => { statusRef.current        = status; }, [status]);

  // ── Framer Motion values (updated from rAF, never from React state) ──────
  // One shared reactive value (0–1) drives all three glow layers via separate springs
  const reactiveMotionVal = useMotionValue(0);

  // Build spring + derived values for each layer
  const layerSprings = GLOW_LAYERS.map((layer) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const spring  = useSpring(reactiveMotionVal, layer.spring);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const scale   = useTransform(spring, [0, 1], [1.0, 1.0 + layer.scaleDelta]);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const opacity = useTransform(spring, [0, 1], [layer.baseOpacity, layer.maxOpacity]);
    return { scale, opacity };
  });

  // ── rAF loop: EMA smoothing + Canvas draw + MotionValue update ───────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r  = size * 0.42;

    function draw() {
      frameRef.current++;
      const f = frameRef.current;

      // ── EMA smoothing (α = 0.15) ─────────────────────────────────────────
      smoothedVolumeRef.current +=
        (targetVolumeRef.current - smoothedVolumeRef.current) * 0.15;

      const sv = smoothedVolumeRef.current;
      const st = statusRef.current;

      // ── Non-linear curve: boost low/mid volume so movement reads clearly ─
      // Math.pow(x, 0.6): x=0.1 → 0.25, x=0.3 → 0.52, x=0.7 → 0.81
      const reactive = Math.pow(sv, 0.6);

      // ── Push to Framer Motion (no React re-render) ───────────────────────
      reactiveMotionVal.set(reactive);

      // ── Canvas energy = status floor + boosted volume delta ──────────────
      const energy = STATUS_ENERGY[st] + reactive * (1 - STATUS_ENERGY[st]);
      const hShift = STATUS_HUE_SHIFT[st];

      ctx.clearRect(0, 0, size, size);

      // 1. Dark sphere base
      const base = ctx.createRadialGradient(cx, cy - r * 0.2, r * 0.04, cx, cy, r);
      base.addColorStop(0,    "rgba(28, 18, 68, 0.97)");
      base.addColorStop(0.55, "rgba(14,  9, 42, 0.99)");
      base.addColorStop(1,    "rgba( 4,  2, 20, 1.00)");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = base;
      ctx.fill();

      // 2. Clip to sphere
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      // 3. Ribbon strands (two passes: glow + core)
      for (const ribbon of BASE_RIBBONS) {
        const phase     = f * ribbon.speed + ribbon.phaseOffset;
        // Amplitude: widens the 1.0–1.5× range the user asked for → wider wave swing
        const amplitude = r * 0.60 * energy;
        const yBase     = cy + ribbon.yOffset * r;
        const freq      = ribbon.freqMult;
        const lineW     = ribbon.thickness * size;
        const hue       = (ribbon.hue + hShift + 360) % 360;
        const step      = Math.max(1, size / 240); // pixel step scales with orb size

        // Glow pass — wide soft stroke
        ctx.beginPath();
        for (let x = cx - r; x <= cx + r; x += step) {
          const t = (x - (cx - r)) / (2 * r);
          const y = yBase + Math.sin(t * Math.PI * 2 * freq + phase) * amplitude;
          x === cx - r ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${hue},${ribbon.saturation}%,${ribbon.lightness}%,${ribbon.alpha * 0.28})`;
        ctx.lineWidth   = lineW * 3.2;
        ctx.lineCap     = "round";
        ctx.shadowColor = `hsla(${hue},100%,72%,0.9)`;
        ctx.shadowBlur  = size * 0.14;
        ctx.stroke();

        // Core pass — sharp bright line
        ctx.beginPath();
        for (let x = cx - r; x <= cx + r; x += step) {
          const t = (x - (cx - r)) / (2 * r);
          const y = yBase + Math.sin(t * Math.PI * 2 * freq + phase) * amplitude;
          x === cx - r ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${hue},${ribbon.saturation}%,${ribbon.lightness + 12}%,${ribbon.alpha})`;
        ctx.lineWidth   = lineW;
        ctx.shadowColor = `hsla(${hue},100%,78%,0.65)`;
        ctx.shadowBlur  = size * 0.07;
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.restore(); // un-clip

      // 4. Rim darkening + specular highlight (glass effect)
      const rim = ctx.createRadialGradient(cx, cy, r * 0.58, cx, cy, r);
      rim.addColorStop(0,    "rgba(0,0,0,0)");
      rim.addColorStop(0.72, "rgba(0,0,0,0.08)");
      rim.addColorStop(1,    "rgba(0,0,0,0.72)");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = rim;
      ctx.fill();

      const spec = ctx.createRadialGradient(
        cx - r * 0.33, cy - r * 0.36, 0,
        cx - r * 0.18, cy - r * 0.22, r * 0.52
      );
      spec.addColorStop(0,   "rgba(255,255,255,0.20)");
      spec.addColorStop(0.4, "rgba(255,255,255,0.07)");
      spec.addColorStop(1,   "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = spec;
      ctx.fill();

      // 5. Outer glowing ring (opacity scales with energy)
      const ringAlpha = 0.50 + energy * 0.45;
      const ringWidth = size * 0.011 + energy * size * 0.009;

      // Wide halo ring
      ctx.beginPath();
      ctx.arc(cx, cy, r + size * 0.022, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(160, 110, 255, ${ringAlpha * 0.32})`;
      ctx.lineWidth   = size * 0.045;
      ctx.shadowColor = "rgba(190, 130, 255, 0.9)";
      ctx.shadowBlur  = size * 0.09;
      ctx.stroke();

      // Crisp iridescent ring
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      const ringGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      ringGrad.addColorStop(0.00, `rgba(200,150,255,${ringAlpha})`);
      ringGrad.addColorStop(0.35, `rgba(100,220,255,${ringAlpha * 0.9})`);
      ringGrad.addColorStop(0.65, `rgba(80, 255,200,${ringAlpha * 0.85})`);
      ringGrad.addColorStop(1.00, `rgba(220,100,255,${ringAlpha})`);
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth   = ringWidth;
      ctx.shadowColor = "rgba(185,155,255,0.8)";
      ctx.shadowBlur  = size * 0.055;
      ctx.stroke();

      ctx.shadowBlur = 0;

      // 6. Connecting spinner
      if (st === "connecting") {
        const spinAngle = (f * 0.04) % (Math.PI * 2);
        ctx.beginPath();
        ctx.arc(cx, cy, r + size * 0.048, spinAngle, spinAngle + Math.PI * 1.2);
        ctx.strokeStyle = "rgba(210,185,255,0.72)";
        ctx.lineWidth   = size * 0.014;
        ctx.lineCap     = "round";
        ctx.shadowColor = "rgba(210,185,255,0.9)";
        ctx.shadowBlur  = size * 0.065;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 7. Energy wisps — escape tendrils, visible when active
      if (energy > 0.42) {
        for (let w = 0; w < 3; w++) {
          const wAngle = (f * 0.008 + (w * Math.PI * 2) / 3) % (Math.PI * 2);
          const wLen   = size * 0.075 * (energy - 0.3) * (0.8 + 0.4 * Math.sin(f * 0.03 + w));
          const wx1    = cx + Math.cos(wAngle) * (r + wLen * 0.2);
          const wy1    = cy + Math.sin(wAngle) * (r + wLen * 0.2);
          const wx2    = cx + Math.cos(wAngle) * (r + wLen);
          const wy2    = cy + Math.sin(wAngle) * (r + wLen);
          const wHue   = (270 + w * 60 + hShift) % 360;

          ctx.beginPath();
          ctx.moveTo(wx1, wy1);
          ctx.lineTo(wx2, wy2);
          ctx.strokeStyle = `hsla(${wHue},90%,72%,${0.50 * (energy - 0.3)})`;
          ctx.lineWidth   = size * 0.009;
          ctx.lineCap     = "round";
          ctx.shadowColor = `hsla(${wHue},100%,72%,0.7)`;
          ctx.shadowBlur  = size * 0.045;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  // ── Gradient string per status for glow layers ────────────────────────────
  const [c1, c2, c3] = STATUS_GRADIENTS[status];

  return (
    <div
      style={{ position: "relative", width: size, height: size }}
      aria-label={`Voice orb — ${status}`}
      role="img"
    >
      {/*
       * ── 3 Glow blob layers (CSS only — only transform + opacity animated) ──
       * Positioned absolutely, centred, clipped to a circle via border-radius.
       * Each driven by its own Framer Motion spring off the shared reactiveMotionVal.
       * blurPx is a STATIC style (never animated) — only scale/opacity change.
       */}
      {GLOW_LAYERS.map((layer, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            top:    "50%",
            left:   "50%",
            width:  size * layer.sizeMult,
            height: size * layer.sizeMult,
            marginTop:  -(size * layer.sizeMult) / 2,
            marginLeft: -(size * layer.sizeMult) / 2,
            borderRadius: "50%",
            background: `radial-gradient(ellipse at 40% 38%, ${c1}cc, ${c2}88, ${c3}44)`,
            filter: `blur(${layer.blurPx}px)`,
            // Only these two are animated — no layout triggers:
            scale:   layerSprings[i].scale,
            opacity: layerSprings[i].opacity,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Canvas — ribbon strands, glass sphere, ring, wisps */}
      <canvas
        ref={canvasRef}
        style={{
          position:     "absolute",
          top:          0,
          left:         0,
          borderRadius: "50%",
          display:      "block",
        }}
      />
    </div>
  );
}

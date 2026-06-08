/**
 * AxisEndpointLabels
 *
 * Renders semantic labels ("Autonomy", "Protection", …) near the projected
 * screen-space ends of each 3-D axis. Key behaviours:
 *
 *  • Reads projectedEndpointsRef every rAF frame – zero React re-renders for positioning.
 *  • Clamps label positions to a 48 px safe margin (screen_edge_clamp).
 *  • When clamped, draws a faint leader cue pointing toward the true endpoint.
 *  • Participates in the shared highlightedAxis hover system.
 *  • When axesRevealed becomes true, each label types out character by character.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AxisEndKey, ProjectedEndpointsData } from '../types';

type AxisId = 'x' | 'y' | 'z';

// ── Label definitions ────────────────────────────────────────────
interface LabelDef {
  key:    AxisEndKey;
  axisId: AxisId;
  text:   string;
}

// ── Per-conversation endpoint label sets ─────────────────────────
const LABELS_BY_CONV: Record<number, LabelDef[]> = {
  1: [
    { key: 'x-pos', axisId: 'x', text: 'Autonomy'      },
    { key: 'x-neg', axisId: 'x', text: 'Protection'    },
    { key: 'y-pos', axisId: 'y', text: 'Confrontation' },
    { key: 'y-neg', axisId: 'y', text: 'Negotiation'   },
    { key: 'z-pos', axisId: 'z', text: 'Time'          },
  ],
  3: [
    { key: 'x-pos', axisId: 'x', text: 'Closeness'  },
    { key: 'x-neg', axisId: 'x', text: 'Distance'   },
    { key: 'y-pos', axisId: 'y', text: 'Attack'      },
    { key: 'y-neg', axisId: 'y', text: 'Repair'      },
    { key: 'z-pos', axisId: 'z', text: 'Time'        },
  ],
  4: [
    { key: 'x-pos', axisId: 'x', text: 'Long-term'   },
    { key: 'x-neg', axisId: 'x', text: 'Short-term'  },
    { key: 'y-pos', axisId: 'y', text: 'Vision'      },
    { key: 'y-neg', axisId: 'y', text: 'Execution'   },
    { key: 'z-pos', axisId: 'z', text: 'Time'        },
  ],
};
LABELS_BY_CONV[2] = LABELS_BY_CONV[1]; // camping resolved uses same axes

// ── Constants (matching axis-annotation-system.json) ─────────────
const MARGIN     = 48;    // screen_edge_clamp.margin_px
const LEADER_LEN = 18;    // leader_cue_behavior.style.length_px
const LEADER_OP  = 0.30;  // leader_cue_behavior.style.opacity

// ── Opacity table (hover_interaction.highlight_style) ────────────
const OP_NORMAL    = 0.85;
const OP_HIGHLIGHT = 1.00;
const OP_DIM       = 0.75 * 0.4; // other_axes_dim 0.75 × base 0.4 ≈ 0.30

// ── Typewriter sub-component ─────────────────────────────────────
// Isolated so parent span's DOM node (positioned by rAF) is never replaced.
const TypewriterText: React.FC<{
  text:       string;
  active:     boolean;
  delay?:     number;
  charMs?:    number;
}> = ({ text, active, delay = 0, charMs = 48 }) => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!active) { setIdx(0); return; }
    let i = 0;
    setIdx(0);
    let charTimer: ReturnType<typeof setTimeout>;

    const startTimer = setTimeout(() => {
      const tick = () => {
        i++;
        setIdx(i);
        if (i < text.length) charTimer = setTimeout(tick, charMs);
      };
      tick();
    }, delay);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(charTimer);
    };
  }, [active, text, delay, charMs]);

  const shown   = text.slice(0, idx);
  const typing  = active && idx < text.length;
  // ▌ block cursor while typing
  return <>{shown}{typing ? '\u258c' : ''}</>;
};

// ─────────────────────────────────────────────────────────────────

interface AxisEndpointLabelsProps {
  projectedEndpointsRef: React.MutableRefObject<ProjectedEndpointsData>;
  highlightedAxis:       AxisId | null;
  onHighlight:           (axis: AxisId | null) => void;
  axesRevealed:          boolean;
  conversationId:        number;
}

export const AxisEndpointLabels: React.FC<AxisEndpointLabelsProps> = ({
  projectedEndpointsRef,
  highlightedAxis,
  onHighlight,
  axesRevealed,
  conversationId,
}) => {
  // Refs to DOM nodes — updated directly in rAF loop, no React state
  const labelRefs  = useRef<Partial<Record<AxisEndKey, HTMLSpanElement>>>({});
  const canvasRef  = useRef<HTMLCanvasElement>(null);

  // Keep highlightedAxis accessible inside the rAF closure without restarts
  const hlRef = useRef<AxisId | null>(highlightedAxis);
  useEffect(() => { hlRef.current = highlightedAxis; }, [highlightedAxis]);

  // ── rAF loop — position labels + draw leader cues ──────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Scale canvas for HiDPI
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    const ctx  = canvas.getContext('2d')!;

    let animId: number;

    const update = () => {
      animId = requestAnimationFrame(update);

      const { pts, w, h } = projectedEndpointsRef.current;
      if (w === 0 || h === 0) return;

      // Resize canvas if viewport changed
      if (canvas.clientWidth !== w || canvas.clientHeight !== h) {
        canvas.width  = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width  = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.scale(dpr, dpr);
      }

      ctx.clearRect(0, 0, w, h);

      const hl    = hlRef.current;
      const anyHl = hl !== null;

      const LABEL_DEFS = LABELS_BY_CONV[conversationId] || LABELS_BY_CONV[1];

      LABEL_DEFS.forEach(({ key, axisId }) => {
        const el = labelRefs.current[key];
        const pt = pts[key];

        if (!el) return;

        // ── Invisible / not-yet-revealed ─────────────────────────
        if (!pt?.visible) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          return;
        }

        // ── Opacity based on highlight state ─────────────────────
        const isHl  = hl === axisId;
        const isDim = anyHl && !isHl;
        const opacity = isHl ? OP_HIGHLIGHT : isDim ? OP_DIM : OP_NORMAL;

        // ── Screen-edge clamping (spec: margin_px = 48) ───────────
        const rawX = pt.sx;
        const rawY = pt.sy;
        // Account for approximate label half-size when clamping
        const halfW = 38; // estimated max half-label width in px
        const halfH = 9;
        const cx = Math.max(MARGIN + halfW, Math.min(w - MARGIN - halfW, rawX));
        const cy = Math.max(MARGIN + halfH, Math.min(h - MARGIN - halfH, rawY));
        const isClamped = Math.abs(cx - rawX) > 1 || Math.abs(cy - rawY) > 1;

        // Apply label position (centered on projected point)
        el.style.opacity        = String(opacity);
        el.style.pointerEvents  = 'auto';
        el.style.transform      = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;

        // ── Leader cue (canvas line) — only when clamped ──────────
        if (isClamped) {
          const dx  = rawX - cx;
          const dy  = rawY - cy;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx  = dx / len;
          const ny  = dy / len;

          ctx.beginPath();
          ctx.moveTo(cx + nx * (halfW + 4), cy + ny * (halfH + 4)); // start from label edge
          ctx.lineTo(cx + nx * (halfW + 4 + LEADER_LEN), cy + ny * (halfH + 4 + LEADER_LEN));
          ctx.strokeStyle = `rgba(140,140,140,${(LEADER_OP * opacity).toFixed(3)})`;
          ctx.lineWidth   = 0.8;
          ctx.stroke();
        }
      });
    };

    update();
    return () => cancelAnimationFrame(animId);
  }, [projectedEndpointsRef, conversationId]); // stable ref — never changes

  // ──────────────────────────────────────────────────────────────
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      {/* Leader-cue canvas (below labels in z-order) */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ display: 'block' }}
      />

      {/* Semantic endpoint labels */}
      {LABELS_BY_CONV[conversationId]?.map(({ key, axisId, text }, labelIdx) => (
        <span
          key={key}
          ref={el => { if (el) labelRefs.current[key] = el; }}
          onMouseEnter={() => onHighlight(axisId)}
          onMouseLeave={() => onHighlight(null)}
          className="absolute top-0 left-0 pointer-events-none select-none"
          style={{
            fontSize:       '9.5px',
            letterSpacing:  '0.09em',
            color:          '#3c3c3c',
            opacity:        0,
            willChange:     'transform, opacity',
            whiteSpace:     'nowrap',
            // smooth opacity transitions on highlight change
            transition:     'opacity 0.22s ease',
          }}
        >
          <TypewriterText
            text={text}
            active={axesRevealed}
            delay={labelIdx * 210}
            charMs={50}
          />
        </span>
      ))}
    </div>
  );
};
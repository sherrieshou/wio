/**
 * axis-legend.tsx
 * ──────────────────────────────────────────────────────────────────
 * Builds AXIS KEY rows and delegates all layout / motion to
 * LegendSection.  Only axis-specific concerns live here:
 *   - Typewriter label reveal
 *   - Highlight / dim on hover
 *   - AI-generation badge
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { LegendSection, LegendItemDef, LegendRowDef } from './legend-section';

type AxisId = 'x' | 'y' | 'z';

interface AxisDef {
  id:     AxisId;
  letter: string;
  label:  string;
  color:  string;
}

// ── Per-conversation axis definitions ─────────────────────────────
const AXES_BY_CONV: Record<number, AxisDef[]> = {
  1: [
    { id: 'x', letter: 'X', label: 'Autonomy ↔ Protection',       color: '#b07868' },
    { id: 'y', letter: 'Y', label: 'Negotiation ↔ Confrontation',  color: '#607898' },
    { id: 'z', letter: 'Z', label: 'Time',                          color: '#708870' },
  ],
  3: [
    { id: 'x', letter: 'X', label: 'Closeness ↔ Distance',         color: '#b07868' },
    { id: 'y', letter: 'Y', label: 'Repair ↔ Attack',               color: '#607898' },
    { id: 'z', letter: 'Z', label: 'Time',                          color: '#708870' },
  ],
  4: [
    { id: 'x', letter: 'X', label: 'Short-term ↔ Long-term',       color: '#b07868' },
    { id: 'y', letter: 'Y', label: 'Vision ↔ Execution',            color: '#607898' },
    { id: 'z', letter: 'Z', label: 'Time',                          color: '#708870' },
  ],
};
AXES_BY_CONV[2] = AXES_BY_CONV[1]; // same axes for both camping conversations

// ── Typewriter hook ───────────────────────────────────────────────
function useTypewriter(text: string, active: boolean, startDelay = 0, charMs = 46): string {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    if (!active) { setDisplayed(''); return; }
    let i = 0;
    setDisplayed('');
    let charTimer: ReturnType<typeof setTimeout>;

    const startTimer = setTimeout(() => {
      const tick = () => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i < text.length) charTimer = setTimeout(tick, charMs);
      };
      charTimer = setTimeout(tick, 0);
    }, startDelay);

    return () => { clearTimeout(startTimer); clearTimeout(charTimer); };
  }, [active, text, startDelay, charMs]);

  return displayed;
}

// ── Axis marker — colored letter in the 26×26 slot ───────────────
const AxisMarker: React.FC<{ letter: string; color: string; highlighted: boolean }> = ({
  letter, color, highlighted,
}) => (
  <span
    style={{
      fontFamily:    'var(--font-body)',
      fontSize:      '11px',
      letterSpacing: '0.06em',
      fontWeight:    highlighted ? 600 : 500,
      color:         highlighted
                       ? color
                       : `color-mix(in srgb, ${color} 70%, #b8b8b8)`,
      lineHeight:    1,
      transition:    'color 0.2s ease, font-weight 0.2s ease',
    }}
  >
    {letter}
  </span>
);

// ── Axis label with typewriter reveal ────────────────────────────
const AxisLabel: React.FC<{
  text:        string;
  active:      boolean;
  delay:       number;
  highlighted: boolean;
}> = ({ text, active, delay, highlighted }) => {
  const displayed = useTypewriter(text, active, delay);
  const isTyping  = active && displayed.length < text.length;

  return (
    <span
      style={{
        color:      highlighted ? '#3a3a3a' : '#6a6a6a',
        transition: 'color 0.2s ease',
      }}
    >
      {displayed}
      {isTyping && '\u258c' /* block cursor */}
    </span>
  );
};

// ── AI-generation spinning badge ──────────────────────────────────
const AiBadge: React.FC<{ isGenerating: boolean }> = ({ isGenerating }) => (
  <div
    className="relative pointer-events-auto cursor-default group/ai"
    style={{ lineHeight: 0 }}
  >
    <motion.svg
      width="9" height="9" viewBox="0 0 10 10" fill="none"
      style={{ display: 'block', originX: '50%', originY: '50%' }}
      animate={isGenerating ? { rotate: 360 } : { rotate: 0 }}
      transition={
        isGenerating
          ? { duration: 3, repeat: Infinity, ease: 'linear' }
          : { duration: 0.4, ease: 'easeOut' }
      }
    >
      <circle cx="5"   cy="1.6" r="1.1" fill="#555"/>
      <circle cx="1.4" cy="8.2" r="1.1" fill="#555"/>
      <circle cx="8.6" cy="8.2" r="1.1" fill="#555"/>
      <line x1="5"   y1="1.6" x2="1.4" y2="8.2" stroke="#888" strokeWidth="0.65"/>
      <line x1="5"   y1="1.6" x2="8.6" y2="8.2" stroke="#888" strokeWidth="0.65"/>
      <line x1="1.4" y1="8.2" x2="8.6" y2="8.2" stroke="#888" strokeWidth="0.65"/>
    </motion.svg>

    <div
      className="absolute left-0 top-5 hidden group-hover/ai:block z-50
                  bg-white border border-neutral-100 rounded-lg shadow-sm
                  px-2.5 py-1.5 whitespace-nowrap pointer-events-none"
      style={{ fontSize: '8px', letterSpacing: '0.04em', color: '#888' }}
    >
      generated from this conversation
    </div>
  </div>
);

// ── Public props ──────────────────────────────────────────────────
interface AxisLegendProps {
  highlightedAxis:  AxisId | null;
  onHighlight:      (axis: AxisId | null) => void;
  axesRevealed:     boolean;
  isGenerating:     boolean;
  conversationId?:  number;
}

export const AxisLegend: React.FC<AxisLegendProps> = ({
  highlightedAxis, onHighlight, axesRevealed, isGenerating, conversationId,
}) => {
  const axes = AXES_BY_CONV[conversationId ?? 1] ?? AXES_BY_CONV[1];
  // Build rows fresh each render so highlight/dim state is reflected
  // in the ReactNode props without needing separate motion state.
  const rows: LegendRowDef[] = axes.map((axis, idx): LegendItemDef => ({
    id:     axis.id,
    dimmed: highlightedAxis !== null && highlightedAxis !== axis.id,

    marker: (
      <AxisMarker
        letter={axis.letter}
        color={axis.color}
        highlighted={highlightedAxis === axis.id}
      />
    ),

    label: (
      <AxisLabel
        text={axis.label}
        active={axesRevealed}
        delay={idx * 280}
        highlighted={highlightedAxis === axis.id}
      />
    ),

    onMouseEnter: () => onHighlight(axis.id),
    onMouseLeave: () => onHighlight(null),
  }));

  return (
    <LegendSection
      title="Axis Key"
      badge={<AiBadge isGenerating={isGenerating} />}
      rows={rows}
      visible={axesRevealed}
      visibleDelay={0}
    />
  );
};
/**
 * point-legend.tsx
 * ──────────────────────────────────────────────────────────────────
 * Builds POINT KEY rows and delegates all layout / motion to
 * LegendSection.  Only point-specific concerns live here:
 *   - Dot / glow swatch components
 *   - Static item data (two groups separated by a divider)
 */

import React from 'react';
import { LegendSection, LegendRowDef } from './legend-section';

interface PointLegendProps {
  axesRevealed: boolean;
}

// ── Dot swatches ──────────────────────────────────────────────────

/** Solid filled circle */
const CoreDot: React.FC<{
  size?:    number;
  opacity?: number;
  color?:   string;
}> = ({ size = 10, opacity = 0.90, color = 'rgba(130,110,188,1)' }) => (
  <div
    className="rounded-full shrink-0"
    style={{ width: size, height: size, background: color, opacity }}
  />
);

/** Filled circle with a soft outer glow ring */
const GlowDot: React.FC<{
  size?:       number;
  glowSize?:   number;
  color?:      string;
  glowColor?:  string;
}> = ({
  size      = 10,
  glowSize  = 22,
  color     = 'rgba(125,105,182,0.85)',
  glowColor = 'rgba(140,115,200,0.28)',
}) => (
  <div
    className="relative shrink-0 flex items-center justify-center"
    style={{ width: glowSize, height: glowSize }}
  >
    <div
      className="absolute rounded-full"
      style={{
        inset:      0,
        background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
        filter:     'blur(3px)',
      }}
    />
    <div
      className="relative rounded-full"
      style={{ width: size, height: size, background: color }}
    />
  </div>
);

/** Small, heavily faded dot for temporal "past" state */
const PastDot: React.FC = () => (
  <div
    className="rounded-full shrink-0"
    style={{ width: 7, height: 7, background: 'rgba(170,160,180,0.38)' }}
  />
);

// ── Static row data ───────────────────────────────────────────────

const ROWS: LegendRowDef[] = [
  // ── Group 1: visual encoding ────────────────────────────────────
  {
    id:       'core',
    marker:   <CoreDot size={10} opacity={0.90} />,
    label:    'Core',
    sublabel: 'assertion · directness',
  },
  {
    id:       'glow',
    marker:   <GlowDot size={10} glowSize={22} />,
    label:    'Glow radius',
    sublabel: 'repair · empathy',
  },
  {
    id:       'drift',
    marker:   <CoreDot size={10} opacity={0.65} color="rgba(165,135,205,0.80)" />,
    label:    'Color drift',
    sublabel: 'vulnerability · openness',
  },

  // ── Divider ─────────────────────────────────────────────────────
  { type: 'divider', id: 'div-1' },

  // ── Group 2: temporal states ────────────────────────────────────
  {
    id:     'active',
    marker: (
      <GlowDot
        size={13} glowSize={26}
        color="rgba(115,95,178,0.95)"
        glowColor="rgba(130,105,195,0.38)"
      />
    ),
    label:    'Active',
    sublabel: 'current turn — breathing pulse',
  },
  {
    id:       'past',
    marker:   <PastDot />,
    label:    'Past',
    sublabel: 'depth-faded, slightly smaller',
  },
  {
    id:       'final',
    marker:   <CoreDot size={12} opacity={0.86} color="rgba(120,100,180,0.88)" />,
    label:    'Final',
    sublabel: 'full field, unified weight',
  },
];

// ── Main export ───────────────────────────────────────────────────
export const PointLegend: React.FC<PointLegendProps> = ({ axesRevealed }) => (
  <LegendSection
    title="Point Key"
    rows={ROWS}
    visible={axesRevealed}
    visibleDelay={0.15}
  />
);

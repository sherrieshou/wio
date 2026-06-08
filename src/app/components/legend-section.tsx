/**
 * legend-section.tsx
 * ──────────────────────────────────────────────────────────────────
 * Shared template for AXIS KEY and POINT KEY.
 *
 * Header layout:  [title + badge]  ·  [chevron]   (justify-between)
 * Item layout:    [20px marker col] · [flex-1 text, right-aligned]
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// ── Shared motion constants ────────────────────────────────────────
export const SECTION_DURATION = 0.2;
export const SECTION_EASE     = [0.4, 0, 0.2, 1] as const;

// ── Public types ──────────────────────────────────────────────────

export interface LegendItemDef {
  id:            string;
  marker:        React.ReactNode;
  label:         React.ReactNode;
  sublabel?:     React.ReactNode;
  dimmed?:       boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export interface LegendDividerDef {
  type: 'divider';
  id:   string;
}

export type LegendRowDef = LegendItemDef | LegendDividerDef;

interface LegendSectionProps {
  title:         string;
  badge?:        React.ReactNode;
  rows:          LegendRowDef[];
  visible?:      boolean;
  visibleDelay?: number;
}

// ── Chevron ───────────────────────────────────────────────────────
const Chevron: React.FC<{ collapsed: boolean }> = ({ collapsed }) => (
  <motion.svg
    width="8" height="8" viewBox="0 0 8 8" fill="none"
    animate={{ rotate: collapsed ? 180 : 0 }}
    transition={{ duration: SECTION_DURATION, ease: SECTION_EASE }}
    style={{ originX: '50%', originY: '50%', flexShrink: 0 }}
  >
    <path
      d="M1 5.5L4 2.5L7 5.5"
      stroke="rgba(0,0,0,0.28)"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </motion.svg>
);

// ── Within-group divider (e.g. between point groups) ──────────────
const InnerDivider: React.FC = () => (
  <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', width: '100%' }} />
);

// ── Single legend item ────────────────────────────────────────────
const LegendItem: React.FC<{ item: LegendItemDef }> = ({ item }) => (
  <div
    className="flex items-center gap-2 w-full"
    style={{
      opacity:       item.dimmed ? 0.28 : 1,
      transition:    `opacity ${SECTION_DURATION}s ease-out`,
      pointerEvents: (item.onMouseEnter || item.onMouseLeave) ? 'auto' : 'none',
      cursor:        (item.onMouseEnter || item.onMouseLeave) ? 'default' : undefined,
    }}
    onMouseEnter={item.onMouseEnter}
    onMouseLeave={item.onMouseLeave}
  >
    {/* ── Fixed 20 px marker column ────────────────────────────── */}
    <div
      style={{ width: 20, flexShrink: 0 }}
      className="flex items-center justify-center"
    >
      {item.marker}
    </div>

    {/* ── Text block — right-aligned to panel edge ─────────────── */}
    <div className="flex-1 flex flex-col items-end">
      <span
        style={{
          fontFamily:    'var(--font-body)',
          fontSize:      '10.5px',
          letterSpacing: '0.01em',
          color:         '#3a3a3a',
          lineHeight:    1.25,
          textAlign:     'right',
        }}
      >
        {item.label}
      </span>
      {item.sublabel && (
        <span
          style={{
            fontFamily:    'var(--font-body)',
            fontSize:      '8.5px',
            letterSpacing: '0.02em',
            color:         '#b0b0b0',
            lineHeight:    1.3,
            textAlign:     'right',
          }}
        >
          {item.sublabel}
        </span>
      )}
    </div>
  </div>
);

// ── Main export ───────────────────────────────────────────────────
export const LegendSection: React.FC<LegendSectionProps> = ({
  title,
  badge,
  rows,
  visible      = true,
  visibleDelay = 0,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.7, ease: 'easeOut', delay: visibleDelay }}
      className="flex flex-col w-full"
    >
      {/* ── Header: [title + badge] ————————————————— [chevron] ── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="pointer-events-auto flex items-center justify-between gap-3 w-full cursor-pointer"
        style={{ background: 'none', border: 'none', padding: 0, marginBottom: 10 }}
        aria-expanded={!collapsed}
        aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${title}`}
      >
        {/* Left: title + optional badge */}
        <div className="flex items-center gap-1.5">
          <span
            style={{
              fontFamily:    'var(--font-body)',
              fontSize:      '11px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color:         'rgba(0,0,0,0.65)',
              lineHeight:    1,
            }}
          >
            {title}
          </span>
          {badge && <div style={{ lineHeight: 0 }}>{badge}</div>}
        </div>

        {/* Right: chevron */}
        <Chevron collapsed={collapsed} />
      </button>

      {/* ── Collapsible content ───────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="content"
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{
              duration: SECTION_DURATION,
              ease:     SECTION_EASE,
              opacity:  { duration: SECTION_DURATION * 1.1 },
              y:        { duration: SECTION_DURATION },
            }}
            style={{ overflow: 'hidden' }}
          >
            <div className="flex flex-col gap-2.5">
              {rows.map(row => {
                if ('type' in row && row.type === 'divider') {
                  return <InnerDivider key={row.id} />;
                }
                return <LegendItem key={row.id} item={row as LegendItemDef} />;
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

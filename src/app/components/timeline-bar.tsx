/**
 * TimelineBar
 *
 * Two visual modes:
 *  - Live Mode  (replayMode=false): floating pill at bottom-center
 *  - Replay Mode (replayMode=true): full-width bottom panel — review-oriented
 *    with scrubber, playback controls, speed selection, and per-turn navigation
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { X, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { PlotPoint } from '../types';

// ── Speaker colors (matches global palette) ─────────────────────
const SP_COLOR: Record<string, string> = {
  teen:   '#c05942',
  mom:    '#5577a8',
  dad:    '#6a8f6a',
  a:      '#c47040',   // couple conflict speaker A — warm amber
  b:      '#5a8fa5',   // couple conflict speaker B — steel teal
  // Startup meeting
  maya:   '#c48030',
  daniel: '#5a8a96',
  serena: '#9a6a8a',
  alex:   '#4a6a9a',
  priya:  '#6a8a5a',
  leo:    '#c4603a',
  nina:   '#a06458',
};

// ── Node visual constants (live mode) ────────────────────────────
const NODE = {
  default:  { dotPx: 6,    opacity: 0.45, ringOpacity: 0,   glowOpacity: 0    },
  passed:   { dotPx: 6.5,  opacity: 0.62, ringOpacity: 0,   glowOpacity: 0    },
  hover:    { dotPx: 7.5,  opacity: 0.75, ringOpacity: 0.4, glowOpacity: 0.18 },
  selected: { dotPx: 9,    opacity: 1.0,  ringOpacity: 0.7, glowOpacity: 0.28 },
};

// ── Playback constants ────────────────────────────────────────────
const TURN_DURATION_MS = 2500; // ms per turn at 1× speed
const SPEEDS = [1, 2, 4] as const;
type Speed = typeof SPEEDS[number];

// ─────────────────────────────────────────────────────────────────

interface TurnNode {
  z:        number;
  turnNum:  number;
  speakers: string[];
}

export interface TimelineBarProps {
  plotPoints:       PlotPoint[];
  timelineSelZRef:  React.MutableRefObject<number | null>;
  timelineHovZRef:  React.MutableRefObject<number | null>;
  onHoverZChange?:  (z: number | null) => void;
  /** Fires whenever the replay-active turn changes (scrub, prev/next, auto-advance). */
  onActiveZChange?: (z: number | null) => void;
  onExit:           () => void;
  replayMode?:      boolean;
}

export const TimelineBar: React.FC<TimelineBarProps> = ({
  plotPoints,
  timelineSelZRef,
  timelineHovZRef,
  onHoverZChange,
  onActiveZChange,
  onExit,
  replayMode = false,
}) => {
  // ── Derive unique turns ───────────────────────────────────────
  const turns: TurnNode[] = useMemo(() => {
    const zMap = new Map<number, Set<string>>();
    plotPoints.forEach(p => {
      if (!zMap.has(p.z)) zMap.set(p.z, new Set());
      zMap.get(p.z)!.add(p.speaker);
    });
    return Array.from(zMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([z, set]) => ({ z, turnNum: z + 1, speakers: Array.from(set) }));
  }, [plotPoints]);

  // ── Shared state ─────────────────────────────────────────────
  const [selectedZ, setSelectedZ] = useState<number | null>(
    () => timelineSelZRef.current
  );
  const [hoveredZ, setHoveredZ] = useState<number | null>(null);

  // ── Replay-mode-specific state ────────────────────────────────
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [playbackSpeed,  setPlaybackSpeed]  = useState<Speed>(1);

  // Stable refs to avoid stale closures in effects
  const selectedZRef     = useRef(selectedZ);
  const onActiveZRef     = useRef(onActiveZChange);
  useEffect(() => { selectedZRef.current = selectedZ;         }, [selectedZ]);
  useEffect(() => { onActiveZRef.current = onActiveZChange;   }, [onActiveZChange]);

  // ── Notify parent whenever selectedZ changes (replay mode) ───
  const handleSelectAndNotify = useCallback((z: number) => {
    setSelectedZ(z);
    timelineSelZRef.current = z;
    onActiveZRef.current?.(z);
  }, [timelineSelZRef]);

  // Fire initial active-Z on mount so parent can emphasize correctly
  useEffect(() => {
    if (replayMode && selectedZ !== null) {
      onActiveZRef.current?.(selectedZ);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayMode]);

  // ── Live-mode hover handlers ──────────────────────────────────
  const handleHoverIn = (z: number) => {
    setHoveredZ(z);
    timelineHovZRef.current = z;
    onHoverZChange?.(z);
  };
  const handleHoverOut = () => {
    setHoveredZ(null);
    timelineHovZRef.current = null;
    onHoverZChange?.(null);
  };

  // ── Replay: prev / next ───────────────────────────────────────
  const selectedIdx = turns.findIndex(t => t.z === selectedZ);

  const handlePrev = useCallback(() => {
    const idx = turns.findIndex(t => t.z === selectedZRef.current);
    if (idx > 0) handleSelectAndNotify(turns[idx - 1].z);
  }, [turns, handleSelectAndNotify]);

  const handleNext = useCallback(() => {
    const idx = turns.findIndex(t => t.z === selectedZRef.current);
    if (idx !== -1 && idx < turns.length - 1) handleSelectAndNotify(turns[idx + 1].z);
  }, [turns, handleSelectAndNotify]);

  // ── Replay: auto-advance interval ────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const ms = TURN_DURATION_MS / playbackSpeed;
    const id = setInterval(() => {
      const curIdx = turns.findIndex(t => t.z === selectedZRef.current);
      if (curIdx === -1 || curIdx >= turns.length - 1) {
        setIsPlaying(false);
        return;
      }
      handleSelectAndNotify(turns[curIdx + 1].z);
    }, ms);
    return () => clearInterval(id);
  }, [isPlaying, playbackSpeed, turns, handleSelectAndNotify]);

  // ── Scrubber track ref + click handler ────────────────────────
  const trackRef = useRef<HTMLDivElement>(null);
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || turns.length === 0) return;
    const pct    = (e.clientX - rect.left) / rect.width;
    const idx    = Math.round(pct * (turns.length - 1));
    const clamped = Math.max(0, Math.min(turns.length - 1, idx));
    handleSelectAndNotify(turns[clamped].z);
  }, [turns, handleSelectAndNotify]);

  const progressPct = turns.length <= 1
    ? 100
    : (Math.max(0, selectedIdx) / (turns.length - 1)) * 100;

  if (turns.length === 0) return null;

  // ─────────────────────────────────────────────────────────────
  // REPLAY MODE — full-width bottom panel with review controls
  // ─────────────────────────────────────────────────────────────
  if (replayMode) {
    const canPrev  = selectedIdx > 0;
    const canNext  = selectedIdx !== -1 && selectedIdx < turns.length - 1;
    const atEnd    = selectedIdx === turns.length - 1;
    const primaryColor = selectedZ !== null
      ? (SP_COLOR[turns[selectedIdx]?.speakers[0]] ?? '#888')
      : '#999';

    return (
      <motion.div
        initial={{ y: 152, opacity: 0 }}
        animate={{ y: 0,   opacity: 1 }}
        exit={{    y: 152, opacity: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-0 left-0 right-0 pointer-events-auto"
        style={{
          height: '152px',
          background: 'rgba(250,249,247,0.97)',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 30,
        }}
      >
        {/* ── Thin progress strip at very top ─────────────────── */}
        <div
          className="absolute top-0 left-0 h-[1.5px] transition-[width] duration-500 ease-out"
          style={{
            width: `${progressPct}%`,
            background: `linear-gradient(to right, ${primaryColor}55, ${primaryColor}88)`,
          }}
        />

        {/* ── Inner layout ─────────────────────────────────────── */}
        <div
          className="flex flex-col h-full"
          style={{ padding: '14px 28px 12px' }}
        >

          {/* ── Row 1: info + exit ───────────────────────────── */}
          <div className="flex items-center justify-between flex-shrink-0" style={{ marginBottom: '8px' }}>
            {/* Left: mode label + turn counter */}
            <div className="flex items-center gap-3">
              <span
                className="text-[10px] uppercase tracking-widest text-neutral-400"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Timeline Review
              </span>
              {selectedZ !== null && (
                <>
                  <span className="w-px h-3 bg-neutral-200/70" />
                  <span
                    className="text-[10px] tabular-nums text-neutral-500"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Turn {String(selectedZ + 1).padStart(2, '0')} / {String(turns.length).padStart(2, '0')}
                  </span>
                  {isPlaying && (
                    <>
                      <span className="w-px h-3 bg-neutral-200/70" />
                      <span
                        className="text-[10px] uppercase tracking-widest"
                        style={{ fontFamily: 'var(--font-body)', color: primaryColor, opacity: 0.7 }}
                      >
                        Playing
                      </span>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Right: exit button */}
            <button
              onClick={onExit}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-200/60 bg-white/70 text-neutral-400 hover:text-neutral-600 hover:border-neutral-300 hover:bg-white transition-all duration-250 cursor-pointer"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
              }}
            >
              <X className="w-3 h-3" />
              Exit Timeline View
            </button>
          </div>

          {/* ── Row 2: scrubber track ─────────────────────────── */}
          <div
            className="relative flex-shrink-0 cursor-pointer"
            style={{ marginBottom: '10px', padding: '6px 0 14px' }}
            ref={trackRef}
            onClick={handleTrackClick}
          >
            {/* Background track line */}
            <div
              className="absolute"
              style={{
                top: 12, left: 0, right: 0, height: '1px',
                background: '#e8e8e8',
              }}
            />
            {/* Progress fill */}
            <div
              className="absolute transition-[width] duration-500 ease-out"
              style={{
                top: 12, left: 0, height: '1px',
                width: `${progressPct}%`,
                background: `linear-gradient(to right, ${primaryColor}50, ${primaryColor}80)`,
              }}
            />

            {/* Turn nodes — evenly distributed */}
            <div className="flex justify-between" style={{ position: 'relative' }}>
              {turns.map(({ z, turnNum, speakers }) => {
                const isSel  = z === selectedZ;
                const isHov  = z === hoveredZ;
                const isPast = selectedZ !== null && z < selectedZ;
                const color  = SP_COLOR[speakers[0]] ?? '#888';
                const dotSize = isSel ? 8 : isHov ? 7 : 5;
                const dotOpacity = isSel ? 1 : isHov ? 0.82 : isPast ? 0.60 : 0.30;

                return (
                  <div
                    key={z}
                    className="flex flex-col items-center cursor-pointer select-none"
                    style={{ gap: 5 }}
                    onClick={(e) => { e.stopPropagation(); handleSelectAndNotify(z); }}
                    onMouseEnter={() => handleHoverIn(z)}
                    onMouseLeave={handleHoverOut}
                  >
                    {/* Dot with optional ring */}
                    <div
                      className="relative flex items-center justify-center flex-shrink-0"
                      style={{ width: 14, height: 14 }}
                    >
                      {isSel && (
                        <div
                          className="absolute rounded-full"
                          style={{
                            width: 14, height: 14,
                            border: `1px solid ${color}50`,
                          }}
                        />
                      )}
                      <div
                        style={{
                          width: dotSize, height: dotSize,
                          borderRadius: '50%',
                          background: isSel || isPast ? color : '#c8c8c8',
                          opacity: dotOpacity,
                          transition: 'all 0.20s ease',
                          flexShrink: 0,
                        }}
                      />
                    </div>

                    {/* Turn label */}
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '10px',
                        letterSpacing: '0.04em',
                        color: isSel ? '#3a3a3a' : '#bdbdbd',
                        transition: 'color 0.20s ease',
                      }}
                    >
                      {String(turnNum).padStart(2, '0')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Row 3: playback controls + speed ─────────────── */}
          <div className="flex items-center justify-between flex-shrink-0">

            {/* Left: prev / play-pause / next */}
            <div className="flex items-center gap-2.5">
              {/* Prev */}
              <button
                onClick={handlePrev}
                disabled={!canPrev}
                className="flex items-center gap-1 cursor-pointer disabled:opacity-25 disabled:cursor-default transition-opacity"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: canPrev ? '#7a7a7a' : '#c0c0c0',
                }}
              >
                <SkipBack className="w-3 h-3" />
                <span>Prev</span>
              </button>

              {/* Play / Pause */}
              <button
                onClick={() => {
                  if (isPlaying) {
                    setIsPlaying(false);
                  } else {
                    // If at end, restart from beginning
                    if (atEnd && turns.length > 0) {
                      handleSelectAndNotify(turns[0].z);
                    }
                    setIsPlaying(true);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  background: isPlaying ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.04)',
                  color: isPlaying ? '#555' : '#666',
                  border: '1px solid rgba(0,0,0,0.07)',
                }}
              >
                {isPlaying
                  ? <Pause  className="w-3 h-3" />
                  : <Play   className="w-3 h-3" />
                }
                {isPlaying ? 'Pause' : atEnd ? 'Replay' : 'Play'}
              </button>

              {/* Next */}
              <button
                onClick={handleNext}
                disabled={!canNext}
                className="flex items-center gap-1 cursor-pointer disabled:opacity-25 disabled:cursor-default transition-opacity"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: canNext ? '#7a7a7a' : '#c0c0c0',
                }}
              >
                <span>Next</span>
                <SkipForward className="w-3 h-3" />
              </button>
            </div>

            {/* Right: speed selector */}
            <div className="flex items-center gap-1">
              <span
                className="text-[10px] uppercase tracking-widest text-neutral-300 mr-1"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Speed
              </span>
              {SPEEDS.map(s => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  className="flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '11px',
                    letterSpacing: '0.06em',
                    width: 32, height: 22,
                    background: playbackSpeed === s
                      ? 'rgba(0,0,0,0.07)'
                      : 'transparent',
                    color: playbackSpeed === s ? '#444' : '#bbb',
                    border: playbackSpeed === s
                      ? '1px solid rgba(0,0,0,0.10)'
                      : '1px solid transparent',
                  }}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // LIVE MODE — floating pill (unchanged)
  // ─────────────────────────────────────────────────────────────
  const renderLiveNodes = () =>
    turns.map(({ z, turnNum, speakers }, idx) => {
      const isSel  = z === selectedZ;
      const isHov  = z === hoveredZ;
      const isPast = selectedZ !== null && z < selectedZ;
      const state  = isSel ? NODE.selected : isHov ? NODE.hover : isPast ? NODE.passed : NODE.default;
      const primary = SP_COLOR[speakers[0]] ?? '#888';

      return (
        <div key={z} className="flex items-center">
          {idx > 0 && (
            <div
              style={{
                width: 18, height: 1, flexShrink: 0,
                background: isPast ? '#c8c8c8' : '#e5e5e5',
                transition: 'background 0.2s',
              }}
            />
          )}
          <div
            className="flex flex-col items-center cursor-pointer select-none"
            style={{ gap: 5, padding: '0 5px', minWidth: 28 }}
            onClick={() => { setSelectedZ(z); timelineSelZRef.current = z; }}
            onMouseEnter={() => handleHoverIn(z)}
            onMouseLeave={handleHoverOut}
          >
            <div className="relative flex items-center justify-center" style={{ width: 22, height: 22 }}>
              {state.glowOpacity > 0 && (
                <div className="absolute rounded-full" style={{
                  width: 18, height: 18, background: primary,
                  opacity: state.glowOpacity, filter: 'blur(5px)',
                  transition: 'opacity 0.2s',
                }} />
              )}
              {state.ringOpacity > 0 && (
                <div className="absolute rounded-full" style={{
                  width: isSel ? 16 : 13, height: isSel ? 16 : 13,
                  border: `1px solid ${primary}`, opacity: state.ringOpacity,
                  transition: 'all 0.18s ease',
                }} />
              )}
              {speakers.length === 1 ? (
                <div className="rounded-full flex-shrink-0" style={{
                  width: state.dotPx, height: state.dotPx,
                  background: primary, opacity: state.opacity,
                  transition: 'all 0.18s ease',
                }} />
              ) : (
                <div className="flex items-center" style={{ gap: 2 }}>
                  {speakers.slice(0, 3).map((sp, i) => (
                    <div key={i} className="rounded-full flex-shrink-0" style={{
                      width: isSel ? 4 : 3.5, height: isSel ? 4 : 3.5,
                      background: SP_COLOR[sp] ?? '#888', opacity: state.opacity,
                      transition: 'all 0.18s ease',
                    }} />
                  ))}
                </div>
              )}
            </div>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '10px',
              letterSpacing: '0.05em',
              color: isSel ? '#3c3c3c' : '#b0b0b0',
              transition: 'color 0.18s ease',
            }}>
              {String(turnNum).padStart(2, '0')}
            </span>
          </div>
        </div>
      );
    });

  return (
    <motion.div
      initial={{ y: 72, opacity: 0 }}
      animate={{ y: 0,  opacity: 1 }}
      exit={{    y: 72, opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-auto"
      style={{ zIndex: 30 }}
    >
      <div
        className="flex items-center bg-white/96 border border-neutral-100/60 rounded-full px-5 py-3 shadow-sm overflow-x-auto"
        style={{ fontFamily: 'var(--font-body)', backdropFilter: 'blur(12px)', scrollbarWidth: 'none', gap: 0 }}
      >
        {renderLiveNodes()}
      </div>
      <button
        onClick={onExit}
        className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/96 border border-neutral-200/60 rounded-full text-neutral-400 hover:text-neutral-700 hover:border-neutral-300 transition-all duration-300 cursor-pointer shadow-sm flex-shrink-0"
        style={{
          fontFamily: 'var(--font-body)', backdropFilter: 'blur(12px)',
          fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase',
        }}
      >
        <X className="w-2.5 h-2.5" />
        Exit
      </button>
    </motion.div>
  );
};

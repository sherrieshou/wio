import React, { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { Archive, Maximize2, Minimize2 } from 'lucide-react';
import { ChatBubbles } from './chat-bubbles';
import { ArchivePanel } from './archive-panel';
import { AxisLegend } from './axis-legend';
import { AxisEndpointLabels } from './axis-endpoint-labels';
import { OrientationWidget } from './orientation-widget';
import { TimelineBar } from './timeline-bar';
import { SpeakerLegend } from './speaker-legend';
import { PointLegend } from './point-legend';
import { PlotPoint, ProjectedEndpointsData } from '../types';

type AxisId = 'x' | 'y' | 'z';

interface UIOverlayProps {
  isStarted:              boolean;
  plotPoints:             PlotPoint[];
  onPlotPoint:            (p: PlotPoint) => void;
  activeConvId:           number;
  onSelectConversation:   (id: number) => void;
  highlightedAxis:        AxisId | null;
  onHighlightAxis:        (axis: AxisId | null) => void;
  cameraQuaternionRef:    React.MutableRefObject<THREE.Quaternion>;
  projectedEndpointsRef:  React.MutableRefObject<ProjectedEndpointsData>;
  // Timeline
  timelineActive:         boolean;
  onAllTurnsGenerated:    () => void;
  onTimelineExit:         () => void;
  onTimelineRecall?:      () => void;
  onRestart?:             () => void;
  timelineSelZRef:        React.MutableRefObject<number | null>;
  timelineHovZRef:        React.MutableRefObject<number | null>;
  /** True once turn 2 (z≥1) data appears — triggers axis typewriter reveals */
  axesRevealed:           boolean;
  // Appreciation Mode
  appreciationMode:       boolean;
  onToggleAppreciation:   () => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  isStarted, plotPoints, onPlotPoint, activeConvId, onSelectConversation,
  highlightedAxis, onHighlightAxis, cameraQuaternionRef, projectedEndpointsRef,
  timelineActive, onAllTurnsGenerated, onTimelineExit, onTimelineRecall, onRestart,
  timelineSelZRef, timelineHovZRef,
  axesRevealed,
  appreciationMode, onToggleAppreciation,
}) => {
  const [archiveOpen,      setArchiveOpen]      = useState(false);
  const [hoveredTurnZ,     setHoveredTurnZ]     = useState<number | null>(null);
  const [activeReplayZ,    setActiveReplayZ]    = useState<number | null>(null);
  const [hasShownTimeline, setHasShownTimeline] = useState(false);

  const handleActiveZChange = useCallback((z: number | null) => {
    setActiveReplayZ(z);
  }, []);

  // Reset activeReplayZ when leaving replay mode
  useEffect(() => {
    if (!timelineActive) setActiveReplayZ(null);
  }, [timelineActive]);

  // Remember once the timeline has been shown at least once
  useEffect(() => {
    if (timelineActive) setHasShownTimeline(true);
  }, [timelineActive]);

  if (!isStarted) return null;

  const isReplayMode = timelineActive;
  const showRecallBtn = hasShownTimeline && !timelineActive;

  // Derive selected turn label for review mode header
  const selectedZ = timelineSelZRef.current;
  const totalTurns = [...new Set(plotPoints.map(p => p.z))].length;
  const currentTurnNum = selectedZ !== null ? selectedZ + 1 : totalTurns;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ fontFamily: "var(--font-body)" }}>

      {/* ── APPRECIATION MODE: fullscreen clean view ──────────────── */}
      <AnimatePresence>
        {appreciationMode && (
          <motion.div
            key="appreciation-mode"
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeInOut' }}
          >
            {/* Exit button — appears after a short delay so the transition settles */}
            <motion.button
              onClick={onToggleAppreciation}
              className="pointer-events-auto absolute top-7 right-7 flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-neutral-200/50 bg-white/55 backdrop-blur-sm text-[10px] uppercase tracking-widest text-neutral-400 hover:text-neutral-700 hover:border-neutral-300 hover:bg-white/80 transition-all duration-300 cursor-pointer"
              style={{ fontFamily: "var(--font-body)" }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <Minimize2 className="w-3 h-3" />
              Exit View
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NORMAL UI (fades out in appreciation mode) ────────────── */}
      <AnimatePresence>
        {!appreciationMode && (
          <motion.div
            key="normal-ui"
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: 'easeInOut' }}
          >
            <ArchivePanel
              isOpen={archiveOpen}
              onClose={() => setArchiveOpen(false)}
              activeConvId={activeConvId}
              onSelect={onSelectConversation}
            />

            {/* ── Axis endpoint labels — full-viewport, behind other UI ─ */}
            <AxisEndpointLabels
              projectedEndpointsRef={projectedEndpointsRef}
              highlightedAxis={highlightedAxis}
              onHighlight={onHighlightAxis}
              axesRevealed={axesRevealed}
              conversationId={activeConvId}
            />

            {/* ── Top-left: project + archive ─────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1, duration: 1.5 }}
              className="absolute top-8 left-8 p-4 border-l border-neutral-200/60"
            >
              <button
                onClick={() => setArchiveOpen(true)}
                className="pointer-events-auto mb-3 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer group"
                style={{ fontFamily: "var(--font-body)" }}
              >
                <Archive className="w-3 h-3 group-hover:text-neutral-700 transition-colors" />
                History
              </button>
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1" style={{ fontFamily: "var(--font-body)" }}>
                Conversation {activeConvId}
              </p>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 300, fontSize: '15px', color: '#2a2a2a', maxWidth: 200, lineHeight: 1.3 }}>
                {({
                  1: 'The Camping Trip — Shutdown',
                  2: 'The Camping Trip — Resolved',
                  3: 'The Canceled Dinner',
                  4: 'The AI Speaking Partner',
                } as Record<number, string>)[activeConvId] ?? `Conversation ${activeConvId}`}
              </h2>

              {/* ── View (Appreciation Mode) button — inline under title ── */}
              <AnimatePresence>
                {axesRevealed && (
                  <motion.button
                    key="view-btn"
                    onClick={onToggleAppreciation}
                    className="pointer-events-auto mt-3 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer group"
                    style={{ fontFamily: "var(--font-body)" }}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Maximize2 className="w-3 h-3 group-hover:text-neutral-700 transition-colors" />
                    Full View
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── Top-center: Mode badge ─────────────────────────────────── */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-none" style={{ zIndex: 20 }}>
              <AnimatePresence mode="wait">
                {!isReplayMode ? (
                  /* ── LIVE badge ── */
                  <motion.div
                    key="live-badge"
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-neutral-200/50 bg-white/60 backdrop-blur-sm"
                  >
                    {/* Pulsing live dot */}
                    <span className="relative flex h-1.5 w-1.5">
                      <span
                        className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/60"
                        style={{ animation: 'ping 1.8s cubic-bezier(0,0,0.2,1) infinite' }}
                      />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500/70" />
                    </span>
                    <span
                      className="text-[10px] uppercase tracking-widest text-neutral-400"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      Live Session
                    </span>
                  </motion.div>
                ) : (
                  /* ── REVIEW badge ── */
                  <motion.div
                    key="review-badge"
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-neutral-300/50 bg-neutral-100/70 backdrop-blur-sm"
                  >
                    <span
                      className="text-[10px] uppercase tracking-widest text-neutral-500"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      Review Mode
                    </span>
                    {totalTurns > 0 && (
                      <>
                        <span className="w-px h-3 bg-neutral-300/60" />
                        <span
                          className="text-[10px] text-neutral-400 tabular-nums"
                          style={{ fontFamily: "var(--font-body)" }}
                        >
                          Turn {String(currentTurnNum).padStart(2, '0')} / {String(totalTurns).padStart(2, '0')}
                        </span>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Top-right: axis legend + point design legend (glass card) ── */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: axesRevealed ? 1 : 0, x: axesRevealed ? 0 : 20 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              className="absolute top-8 right-8 hidden lg:flex flex-col pointer-events-none"
              style={{
                width:           224,
                padding:         16,
                borderRadius:    12,
                background:      'rgba(255,255,255,0.62)',
                backdropFilter:  'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow:       '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)',
              }}
            >
              <AxisLegend
                highlightedAxis={highlightedAxis}
                onHighlight={onHighlightAxis}
                axesRevealed={axesRevealed}
                isGenerating={axesRevealed && !timelineActive}
                conversationId={activeConvId}
              />

              {/* Section separator */}
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 16, paddingTop: 16 }}>
                <PointLegend axesRevealed={axesRevealed} />
              </div>
            </motion.div>

            {/* ── Standalone orientation widget — free-floating bottom-right ── */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: axesRevealed ? 1 : 0, x: axesRevealed ? 0 : 20 }}
              transition={{ duration: 1.4, ease: 'easeOut', delay: 0.15 }}
              className="absolute right-8 hidden lg:flex flex-col items-end pointer-events-none"
              style={{
                bottom: timelineActive ? 220 : 136,
                transition: 'bottom 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <OrientationWidget
                cameraQuaternionRef={cameraQuaternionRef}
                highlightedAxis={highlightedAxis}
              />
            </motion.div>

            {/* ── Bottom-right: speaker legend ─────────────────────────── */}
            <motion.div
              className="absolute right-8 hidden lg:flex flex-col items-end pointer-events-none"
              animate={{ bottom: timelineActive ? 100 : 32 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <SpeakerLegend conversationId={activeConvId} axesRevealed={axesRevealed} />
            </motion.div>

            {/* ── Timeline recall button (shown in Live mode after timeline was visited) ── */}
            <AnimatePresence>
              {showRecallBtn && (
                <motion.div
                  key="timeline-recall"
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                >
                  <button
                    onClick={() => (onTimelineRecall ?? onAllTurnsGenerated)()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-neutral-200/60 bg-white/80 backdrop-blur-sm text-[10px] uppercase tracking-widest text-neutral-500 hover:text-neutral-800 hover:border-neutral-300 hover:bg-white transition-all duration-300 shadow-sm cursor-pointer"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    Open Review
                    <span className="text-neutral-300">→</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Timeline bar: Replay Mode full-width bottom panel ─────── */}
            <AnimatePresence>
              {timelineActive && (
                <TimelineBar
                  key="timeline"
                  plotPoints={plotPoints}
                  timelineSelZRef={timelineSelZRef}
                  timelineHovZRef={timelineHovZRef}
                  onHoverZChange={setHoveredTurnZ}
                  onActiveZChange={handleActiveZChange}
                  onExit={onTimelineExit}
                  replayMode
                />
              )}
            </AnimatePresence>

            {/* ── Chat bubbles ─────────────────────────────────────────── */}
            <ChatBubbles
              onPlotPoint={onPlotPoint}
              onComplete={onAllTurnsGenerated}
              onRestart={onRestart}
              scrollToTurnZ={isReplayMode ? (hoveredTurnZ ?? activeReplayZ) : hoveredTurnZ}
              conversationId={activeConvId}
              replayMode={isReplayMode}
              activeTurnZ={isReplayMode ? activeReplayZ : null}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
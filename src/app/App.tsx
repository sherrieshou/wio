import React, { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { AnimatePresence, motion } from 'motion/react';
import { RelationalScene } from './components/relational-scene';
import { UIOverlay } from './components/ui-overlay';
import { IntroScreen } from './components/intro-screen';
import { RecordingScreen } from './components/recording-screen';
import { PlotPoint, ProjectedEndpointsData, AxisEndKey } from './types';

type AxisId = 'x' | 'y' | 'z';

const makeEmptyProjections = (): ProjectedEndpointsData => {
  const empty = { sx: 0, sy: 0, visible: false };
  const keys: AxisEndKey[] = ['x-pos', 'x-neg', 'y-pos', 'y-neg', 'z-pos'];
  return {
    pts: Object.fromEntries(keys.map(k => [k, { ...empty }])) as ProjectedEndpointsData['pts'],
    w: 0, h: 0,
  };
};

function App() {
  // ── App-level state machine ──────────────────────────────────────
  // landing (default) → recording → session (3D)
  const [isRecording,     setIsRecording]    = useState(false);
  const [isStarted,       setIsStarted]      = useState(false);
  const [plotPoints,      setPlotPoints]     = useState<PlotPoint[]>([]);
  const [activeConvId,    setActiveConvId]   = useState<number>(2);
  const [highlightedAxis, setHighlightedAxis] = useState<AxisId | null>(null);
  const [timelineActive,  setTimelineActive] = useState(false);
  // Axes are hidden until turn 2 (first point at z ≥ 1)
  const axesRevealed = plotPoints.some(p => p.z >= 1);

  // ── Appreciation Mode ──────────────────────────────────────────
  const [appreciationMode, setAppreciationMode] = useState(false);
  const handleToggleAppreciation = useCallback(() => setAppreciationMode(p => !p), []);

  // ── Shared refs — written by scene, read by UI overlays ──────
  const cameraQuaternionRef   = useRef(new THREE.Quaternion());
  const projectedEndpointsRef = useRef<ProjectedEndpointsData>(makeEmptyProjections());

  // ── Timeline inspection refs — written by UIOverlay/TimelineBar,
  //    read by RelationalScene rAF loop every frame ─────────────
  const timelineModeRef = useRef(false);
  const timelineSelZRef = useRef<number | null>(null);
  const timelineHovZRef = useRef<number | null>(null);

  // Landing → Recording (State 1 → State 2/3 entry)
  const handleBegin = () => setIsRecording(true);

  // Recording → Session (State 3 → 3D)
  const handleBeginSession = useCallback(() => {
    setIsRecording(false);
    setIsStarted(true);
  }, []);

  // Recording → Landing (cancel, return to State 1)
  const handleCancelRecording = useCallback(() => setIsRecording(false), []);

  const handlePlotPoint = useCallback((p: PlotPoint) => {
    setPlotPoints(prev =>
      prev.find(x => x.id === p.id) ? prev : [...prev, p]
    );
  }, []);

  // Called ~1.4 s after the last line fires in ChatBubbles
  const handleTimelineEnter = useCallback(() => {
    const lastZ = plotPoints.length > 0
      ? Math.max(...plotPoints.map(p => p.z))
      : 9;
    timelineModeRef.current = true;
    timelineSelZRef.current = lastZ;
    timelineHovZRef.current = null;
    setTimelineActive(true);
  }, [plotPoints]);

  const handleTimelineExit = useCallback(() => {
    timelineModeRef.current = false;
    timelineSelZRef.current = null;
    timelineHovZRef.current = null;
    setTimelineActive(false);
  }, []);

  const handleSelectConversation = useCallback((id: number) => {
    setActiveConvId(id);
    setPlotPoints([]);
    // Reset timeline when switching conversations
    timelineModeRef.current = false;
    timelineSelZRef.current = null;
    timelineHovZRef.current = null;
    setTimelineActive(false);
  }, []);

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#faf9f7] selection:bg-neutral-100 selection:text-neutral-900" style={{ fontFamily: "var(--font-body)" }}>
      <AnimatePresence mode="wait">
        {/* ── State 1: Landing page ──────────────────────────────── */}
        {!isRecording && !isStarted ? (
          <motion.div
            key="intro"
            className="absolute inset-0 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
          >
            <IntroScreen onBegin={handleBegin} />
          </motion.div>

        ) : isRecording && !isStarted ? (
          /* ── State 3: Recording-start interface ────────────────── */
          <motion.div
            key="recording"
            className="absolute inset-0 z-20"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <RecordingScreen
              onBeginSession={handleBeginSession}
              onCancel={handleCancelRecording}
            />
          </motion.div>

        ) : (
          <motion.div
            key="session"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          >
            {/* 3D Scene — shrinks upward when Replay Mode panel appears at bottom */}
            <div
              className="absolute inset-x-0 top-0 z-0"
              style={{
                bottom: (!appreciationMode && timelineActive) ? '152px' : '0px',
                transition: 'bottom 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <RelationalScene
                isStarted={isStarted}
                plotPoints={plotPoints}
                highlightedAxis={highlightedAxis}
                cameraQuaternionRef={cameraQuaternionRef}
                projectedEndpointsRef={projectedEndpointsRef}
                timelineModeRef={timelineModeRef}
                timelineSelZRef={timelineSelZRef}
                timelineHovZRef={timelineHovZRef}
                timelineMode={timelineActive}
                conversationId={activeConvId}
                appreciationMode={appreciationMode}
              />
            </div>

            {/* UI Overlay */}
            <div className="relative z-10 w-full h-full pointer-events-none">
              <UIOverlay
                isStarted={isStarted}
                plotPoints={plotPoints}
                onPlotPoint={handlePlotPoint}
                activeConvId={activeConvId}
                onSelectConversation={handleSelectConversation}
                highlightedAxis={highlightedAxis}
                onHighlightAxis={setHighlightedAxis}
                cameraQuaternionRef={cameraQuaternionRef}
                projectedEndpointsRef={projectedEndpointsRef}
                timelineActive={timelineActive}
                onAllTurnsGenerated={handleTimelineEnter}
                onTimelineExit={handleTimelineExit}
                onTimelineRecall={handleTimelineEnter}
                onRestart={() => handleSelectConversation(activeConvId)}
                timelineSelZRef={timelineSelZRef}
                timelineHovZRef={timelineHovZRef}
                axesRevealed={axesRevealed}
                appreciationMode={appreciationMode}
                onToggleAppreciation={handleToggleAppreciation}
              />
            </div>

            {/* Atmosphere gradient — constrained to match 3D scene bounds */}
            <div
              className="absolute inset-x-0 top-0 pointer-events-none bg-gradient-to-t from-white via-transparent to-transparent opacity-40 z-[1]"
              style={{
                bottom: (!appreciationMode && timelineActive) ? '152px' : '0px',
                transition: 'bottom 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default App;
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, ArrowRight } from 'lucide-react';

// ── Waveform data — computed once, stable across renders ──────────
// Bar heights follow a bell-curve profile: taller in the middle,
// tapered at the edges, to resemble a natural speech waveform.
const NUM_BARS = 13;
const WAVE_BARS = Array.from({ length: NUM_BARS }, (_, i) => {
  const t       = (i - (NUM_BARS - 1) / 2) / ((NUM_BARS - 1) / 2); // –1 → +1
  const profile = 1 - t * t * 0.62;
  return {
    duration: 0.44 + (i % 5) * 0.088,
    delay:    i * 0.052,
    peak:     0.22 + profile * 0.78,
    floor:    0.07 + profile * 0.07,
  };
});

interface RecordingScreenProps {
  onBeginSession: () => void;
  onCancel:       () => void;
}

export const RecordingScreen: React.FC<RecordingScreenProps> = ({
  onBeginSession,
  onCancel,
}) => {
  const [elapsed,        setElapsed]        = useState(0);
  const [voicesDetected, setVoicesDetected] = useState(false);
  const [showCTA,        setShowCTA]        = useState(false);

  // ── Timer ────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Simulated voice-detection ────────────────────────────────────
  // In production this would be driven by the audio analysis pipeline.
  useEffect(() => {
    const t = setTimeout(() => setVoicesDetected(true), 1900);
    return () => clearTimeout(t);
  }, []);

  // ── Begin Analysis CTA appears after a brief "initializing" period
  useEffect(() => {
    const t = setTimeout(() => setShowCTA(true), 2800);
    return () => clearTimeout(t);
  }, []);

  const mm      = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss      = String(elapsed % 60).padStart(2, '0');
  const timeStr = `${mm}:${ss}`;

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        fontFamily: 'var(--font-body)',
        background: '#faf9f7',
      }}
    >
      {/* Subtle warm radial glow — suggests active listening */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background:
            'radial-gradient(ellipse 52% 44% at 50% 44%, rgba(64,169,167,0.07) 0%, transparent 65%)',
        }}
      />

      {/* ── Recording status badge ──────────────────────────────────── */}
      <motion.div
        className="absolute flex items-center gap-2"
        style={{ top: 36 }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
      >
        <motion.div
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1.35, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#40A9A7',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#40A9A7',
            fontWeight: 500,
          }}
        >
          Rec · {timeStr}
        </span>
      </motion.div>

      {/* ── Central recording indicator ─────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
        }}
      >
        {/* Expanding pulse rings */}
        {([0, 0.80, 1.60] as const).map((delay, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: 88, height: 88,
              borderRadius: '50%',
              border: `1.5px solid rgba(64,169,167,${0.22 - i * 0.055})`,
              pointerEvents: 'none',
            }}
            animate={{ scale: [1, 3.0], opacity: [0.55, 0] }}
            transition={{
              duration: 2.5,
              delay,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Core circle — warm tinted glass */}
        <motion.div
          initial={{ scale: 0.78, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: 88, height: 88,
            borderRadius: '50%',
            background:
              'linear-gradient(145deg, rgba(64,169,167,0.13) 0%, rgba(64,169,167,0.06) 100%)',
            border: '1.5px solid rgba(64,169,167,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
            <Mic
            style={{ width: 28, height: 28, color: '#40A9A7', opacity: 0.82 }}
            strokeWidth={1.5}
          />
        </motion.div>
      </div>

      {/* ── Waveform bars ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.3 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          height: 44,
          marginBottom: 26,
        }}
      >
        {WAVE_BARS.map((bar, i) => (
          <motion.div
            key={i}
            animate={{ scaleY: [bar.floor, bar.peak, bar.floor] }}
            transition={{
              duration: bar.duration,
              delay: bar.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              width: 3,
              height: '100%',
              background: 'rgba(64,169,167,0.36)',
              borderRadius: 2,
              transformOrigin: 'center',
            }}
          />
        ))}
      </motion.div>

      {/* ── Status text ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.35 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          marginBottom: 36,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 13,
            color: '#5a5a5a',
            letterSpacing: '0.01em',
            lineHeight: 1.5,
          }}
        >
          Listening to conversation…
        </p>

        <AnimatePresence>
          {voicesDetected && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontSize: 10.5,
                color: '#b0b0b0',
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
              }}
            >
              2 voices detected
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Begin Analysis CTA ───────────────────────────────────────── */}
      <AnimatePresence>
        {showCTA && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
            onClick={onBeginSession}
            className="pointer-events-auto flex items-center gap-2.5 cursor-pointer"
            style={{
              padding: '13px 30px',
              borderRadius: 999,
              background: '#1a1a1a',
              color: '#fff',
              border: 'none',
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              letterSpacing: '0.13em',
              textTransform: 'uppercase',
              marginBottom: 14,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e =>
              ((e.currentTarget as HTMLButtonElement).style.background = '#2d2d2d')
            }
            onMouseLeave={e =>
              ((e.currentTarget as HTMLButtonElement).style.background = '#1a1a1a')
            }
          >
            Begin Analysis
            <ArrowRight style={{ width: 13, height: 13 }} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Stop Recording link ──────────────────────────────────────── */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: showCTA ? 0.65 : 0 }}
        transition={{ duration: 0.4 }}
        onClick={onCancel}
        className="pointer-events-auto cursor-pointer flex items-center gap-1.5"
        style={{
          background: 'transparent',
          border: 'none',
          fontFamily: 'var(--font-body)',
          fontSize: 10.5,
          color: '#b0b0b0',
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
        }}
        whileHover={{ opacity: 1 }}
      >
        <MicOff style={{ width: 10, height: 10 }} />
        Stop Recording
      </motion.button>

      {/* ── Thin top rule — separates badge from content visually ──── */}
      <div
        style={{
          position: 'absolute',
          top: 64,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 32,
          height: 1,
          background: 'rgba(64,169,167,0.15)',
        }}
      />
    </div>
  );
};

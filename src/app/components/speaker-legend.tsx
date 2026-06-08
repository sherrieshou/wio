import React from 'react';
import { motion } from 'motion/react';

interface SpeakerDef {
  id: string;
  label: string;
  color: string;
  glowColor: string;
}

// ── Speaker sets per conversation ────────────────────────────────
const SPEAKERS_BY_CONV: Record<number, SpeakerDef[]> = {
  1: [
    { id: 'teen', label: 'Teen',   color: '#8b7bda', glowColor: 'rgba(139,123,218,0.32)' },
    { id: 'mom',  label: 'Mom',    color: '#3578a8', glowColor: 'rgba(53,120,168,0.32)'  },
    { id: 'dad',  label: 'Dad',    color: '#b7dce5', glowColor: 'rgba(183,220,229,0.32)' },
  ],
  3: [
    { id: 'a', label: 'A', color: '#c47040', glowColor: 'rgba(196,112,64,0.32)' },
    { id: 'b', label: 'B', color: '#5a8fa5', glowColor: 'rgba(90,143,165,0.32)' },
  ],
  4: [
    { id: 'maya',   label: 'Maya',   color: '#c48030', glowColor: 'rgba(196,128,48,0.30)'  },
    { id: 'leo',    label: 'Leo',    color: '#c4603a', glowColor: 'rgba(196,96,58,0.30)'   },
    { id: 'daniel', label: 'Daniel', color: '#5a8a96', glowColor: 'rgba(90,138,150,0.30)'  },
    { id: 'serena', label: 'Serena', color: '#9a6a8a', glowColor: 'rgba(154,106,138,0.30)' },
    { id: 'alex',   label: 'Alex',   color: '#4a6a9a', glowColor: 'rgba(74,106,154,0.30)'  },
    { id: 'priya',  label: 'Priya',  color: '#6a8a5a', glowColor: 'rgba(106,138,90,0.30)'  },
    { id: 'nina',   label: 'Nina',   color: '#a06458', glowColor: 'rgba(160,100,88,0.30)'  },
  ],
};
// Conversation 2 reuses conversation 1's speakers
SPEAKERS_BY_CONV[2] = SPEAKERS_BY_CONV[1];

interface SpeakerLegendProps {
  conversationId: number;
  axesRevealed:   boolean;
}

export const SpeakerLegend: React.FC<SpeakerLegendProps> = ({
  conversationId, axesRevealed,
}) => {
  const speakers = SPEAKERS_BY_CONV[conversationId] ?? SPEAKERS_BY_CONV[1];
  const isLarge  = speakers.length > 4; // compact 2-col for conv 4

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: axesRevealed ? 1 : 0 }}
      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
      className="flex flex-col gap-2"
    >
      {/* Section label */}
      <p
        style={{
          fontFamily:    'var(--font-body)',
          fontSize:      '9px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color:         '#bbb',
          textAlign:     'right',
        }}
      >
        Speakers
      </p>

      {/* Speaker rows — 2-col grid for large sets, single col otherwise */}
      <div
        className={isLarge ? 'grid grid-cols-2 gap-x-4 gap-y-2' : 'flex flex-col gap-2'}
        style={{ direction: 'rtl' }}  // keeps right-alignment for both layouts
      >
        {speakers.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: axesRevealed ? 1 : 0, x: axesRevealed ? 0 : 8 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.4 + i * 0.08 }}
            className="flex items-center gap-2 justify-end"
            style={{ direction: 'ltr' }}
          >
            {/* Label */}
            <span
              style={{
                fontFamily:    'var(--font-body)',
                fontSize:      '9px',
                letterSpacing: '0.06em',
                color:         '#999',
              }}
            >
              {s.label}
            </span>

            {/* Glow dot */}
            <div className="relative shrink-0" style={{ width: 10, height: 10 }}>
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: s.glowColor,
                  transform:  'scale(2.2)',
                  filter:     'blur(3px)',
                }}
              />
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: s.color,
                  transform:  'scale(0.7)',
                  boxShadow:  `0 0 4px 1px ${s.glowColor}`,
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

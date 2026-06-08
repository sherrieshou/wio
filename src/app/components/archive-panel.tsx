import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowUpRight, Check } from 'lucide-react';

interface ArchivedConversation {
  id: number;
  title: string;
  subtitle: string;
  participants: { label: string; color: string }[];
  turns: number;
  peakTension: string;
  tags: string[];
}

const ARCHIVE: ArchivedConversation[] = [
  {
    id: 1,
    title: 'The Camping Trip — Shutdown',
    subtitle: 'A failed negotiation that escalates into mutual withdrawal.',
    participants: [
      { label: 'Teen', color: '#8b7bda' },
      { label: 'Mom',  color: '#3578a8' },
      { label: 'Dad',  color: '#b7dce5' },
    ],
    turns: 10,
    peakTension: 'Turn 8 — maximum spatial distance',
    tags: ['Confrontation', 'Withdrawal', 'Shutdown'],
  },
  {
    id: 2,
    title: 'The Camping Trip — Resolved',
    subtitle: 'A negotiated compromise reached through vulnerability and evidence.',
    participants: [
      { label: 'Teen', color: '#8b7bda' },
      { label: 'Mom',  color: '#3578a8' },
      { label: 'Dad',  color: '#b7dce5' },
    ],
    turns: 10,
    peakTension: 'Turn 5 — fear articulated without blame',
    tags: ['Negotiation', 'Compromise', 'Resolution'],
  },
  {
    id: 3,
    title: 'The Canceled Dinner',
    subtitle: 'A couple conflict that oscillates between accusation, hurt, and gradual repair.',
    participants: [
      { label: 'A', color: '#c47040' },
      { label: 'B', color: '#5a8fa5' },
    ],
    turns: 20,
    peakTension: 'Turn 11 — strongest attack + avoidance framing',
    tags: ['Oscillatory', 'Vulnerability', 'Repair'],
  },
  {
    id: 4,
    title: 'The AI Speaking Partner',
    subtitle: 'A startup product meeting where seven stakeholders converge on a scoped launch.',
    participants: [
      { label: 'Maya',   color: '#c48030' },
      { label: 'Daniel', color: '#5a8a96' },
      { label: 'Serena', color: '#9a6a8a' },
      { label: 'Alex',   color: '#4a6a9a' },
      { label: 'Priya',  color: '#6a8a5a' },
      { label: 'Leo',    color: '#c4603a' },
      { label: 'Nina',   color: '#a06458' },
    ],
    turns: 10,
    peakTension: 'Round 4 — widest stakeholder dispersion',
    tags: ['Multi-party', 'Convergence', 'Compromise'],
  },
];

interface ArchivePanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeConvId: number;
  onSelect: (id: number) => void;
}

export const ArchivePanel: React.FC<ArchivePanelProps> = ({ isOpen, onClose, activeConvId, onSelect }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="archive-fullscreen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.32, 0, 0.16, 1] }}
          className="fixed inset-0 z-50 bg-[#faf9f7] flex flex-col pointer-events-auto"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {/* Close — top right */}
          <button
            onClick={onClose}
            aria-label="Close archive"
            className="absolute top-8 right-8 z-10 w-9 h-9 flex items-center justify-center rounded-full border border-neutral-200/60 bg-white/70 hover:bg-white hover:border-neutral-300 transition-all duration-200 cursor-pointer text-neutral-400 hover:text-neutral-700"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="px-8 pt-10 pb-6 border-b border-neutral-100/60">
            <div className="max-w-5xl mx-auto">
              <p className="text-[9px] uppercase tracking-widest text-neutral-400 mb-1">Archive</p>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 300, fontSize: 'clamp(22px, 3vw, 28px)', color: '#2a2a2a' }}>
                Saved Conversations
              </h3>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-8 py-8">
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              {ARCHIVE.map((conv, i) => {
                const isActive = conv.id === activeConvId;
                return (
                  <motion.button
                    key={conv.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 + 0.08, duration: 0.4 }}
                    onClick={() => { onSelect(conv.id); onClose(); }}
                    className={`group relative w-full text-left rounded-2xl border transition-all duration-300 p-5 cursor-pointer ${
                      isActive
                        ? 'border-neutral-200/80 bg-white shadow-sm'
                        : 'border-neutral-100/60 bg-white/60 hover:bg-white hover:border-neutral-200/80 hover:shadow-sm'
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-neutral-400 mb-0.5">
                          Conversation {conv.id}
                        </p>
                        <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 300, fontSize: '14px', color: '#2a2a2a' }}>{conv.title}</h4>
                      </div>
                      {isActive
                        ? <Check className="w-3 h-3 text-neutral-500 mt-0.5 flex-shrink-0" />
                        : <ArrowUpRight className="w-3 h-3 text-neutral-300 group-hover:text-neutral-500 transition-colors mt-0.5 flex-shrink-0" />
                      }
                    </div>

                    {/* Subtitle */}
                    <p className="text-[10px] text-neutral-400 leading-relaxed mb-3">
                      {conv.subtitle}
                    </p>

                    {/* Participants */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {conv.participants.map((p) => (
                        <div key={p.label} className="flex items-center gap-1">
                          <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: p.color }}
                          />
                          <span className="text-[9px] uppercase tracking-widest text-neutral-400">
                            {p.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Tags + turn count */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5 flex-wrap">
                        {conv.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-neutral-100/80 text-neutral-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-[9px] text-neutral-300 flex-shrink-0 ml-2">{conv.turns} turns</span>
                    </div>

                    {/* Peak tension */}
                    <div className="mt-2.5 pt-2.5 border-t border-neutral-100">
                      <p className="text-[9px] text-neutral-300 uppercase tracking-widest">
                        Peak — <span className="text-neutral-400">{conv.peakTension}</span>
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-neutral-100/60">
            <p className="max-w-5xl mx-auto text-[9px] uppercase tracking-widest text-neutral-300">
              {ARCHIVE.length} conversations archived
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

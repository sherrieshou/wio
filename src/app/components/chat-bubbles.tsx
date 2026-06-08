import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pause, Play } from 'lucide-react';
import { PlotPoint, VisualParams, SemanticFactors, OverlapState } from '../types';

// ── Data model ──────────────────────────────────────────────────
interface TurnLine {
  speaker: string;
  text: string;
  coords: { x: number; y: number; z: number };
  /** seconds after the turn's local clock starts before this line appears */
  offsetSec: number;
  /** emotional intensity radius — controls halo pulse range */
  radius: number;
  /** Optional per-utterance visual parameters (from semantic model) */
  visual?: VisualParams;
  /** Semantic analysis factors driving visual modulation */
  semantic?: SemanticFactors;
  /** Relational overlap state with other speakers at this moment */
  overlapState?: OverlapState;
  /** Which speakers this point overlaps with */
  overlapWith?: string[];
  /** Marks a line that will be cut short by an interruption.
   *  case_a: only 1-2 words left when cut — those words are never shown.
   *  case_b: ~half the sentence left — the rest is continued after the interrupter. */
  interruptType?: 'case_a' | 'case_b';
  /** For case_a: word index (0-based) at which reveal stops (last word never shown). */
  interruptedAtWord?: number;
  /** Marks the line that does the interrupting — no special timing, purely semantic. */
  isInterruption?: boolean;
  /** case_b continuation: resumes after the interrupter finishes. No new 3D point. */
  isContinuation?: boolean;
  /** Skip emitting a 3D plot point for this line (used for continuation lines). */
  noBroadcast?: boolean;
}

interface Turn {
  turn: number;
  lines: TurnLine[];
}

// ── Conversation 1 — Shutdown (confrontational) ──────────────────
const TURNS_1: Turn[] = [
  {
    turn: 1,
    lines: [
      { speaker: 'teen', text: "Mom, I want to go camping this weekend with my friends. We already picked the site. It's just one night.", coords: { x: 4, y: -2, z: 0 }, offsetSec: 0.8, radius: 18 },
      { speaker: 'mom',  text: "No, absolutely not. A bunch of teenagers going camping without adults? I'm not okay with that.", coords: { x: -5, y: 1, z: 0 }, offsetSec: 4.0, radius: 38 },
    ],
  },
  {
    turn: 2,
    lines: [
      { speaker: 'teen', text: "It's not like I just brought it up. I mentioned it last week. You just didn't take it seriously.", coords: { x: 3, y: 1, z: 1 }, offsetSec: 0.8, radius: 30 },
      { speaker: 'mom',  text: "You 'mentioned it' in passing. That's not the same as actually talking it through.", coords: { x: -3, y: 0, z: 1 }, offsetSec: 4.2, radius: 28 },
    ],
  },
  {
    turn: 3,
    lines: [
      { speaker: 'teen', text: "It's a real campground, not just some random woods. It's like two hours away, there are staff there, and we'll have cell service.", coords: { x: 3, y: -3, z: 2 }, offsetSec: 0.8, radius: 22 },
      { speaker: 'dad',  text: "Who's driving? Whose car? And is any parent going with you?", coords: { x: -2, y: -4, z: 2 }, offsetSec: 4.5, radius: 18 },
    ],
  },
  {
    turn: 4,
    lines: [
      { speaker: 'teen', text: "No parent is going, but we're in high school, not little kids. We can handle one night.", coords: { x: 5, y: 0, z: 3 }, offsetSec: 0.8, radius: 28 },
      { speaker: 'mom',  text: "That's exactly the problem. No adults, overnight, out in the middle of nowhere? If something happens, then what?", coords: { x: -5, y: 2, z: 3 }, offsetSec: 4.2, radius: 36 },
    ],
  },
  {
    turn: 5,
    lines: [
      { speaker: 'teen', text: "Why do you always assume something bad is going to happen? Other parents are letting their kids go.", coords: { x: 3, y: 3, z: 4 }, offsetSec: 0.8, radius: 36 },
      { speaker: 'mom',  text: "I don't care what other parents are doing. I'm responsible for you, not them.", coords: { x: -4, y: 2, z: 4 }, offsetSec: 4.2, radius: 32 },
    ],
  },
  {
    turn: 6,
    lines: [
      { speaker: 'teen', text: "This is why I never ask for anything. You always say you trust me, but the second I want any freedom, it's automatically no.", coords: { x: 4, y: 4, z: 5 }, offsetSec: 0.8, radius: 44 },
      { speaker: 'dad',  text: "Trust has nothing to do with it. This is about safety. You're acting like we're ruining your life over one camping trip.", coords: { x: -4, y: 2, z: 5 }, offsetSec: 4.5, radius: 34 },
    ],
  },
  {
    turn: 7,
    lines: [
      // Interruption edge case A: teen is cut off with ~2 words left ("everything.")
      // interruptedAtWord caps reveal at word 28; the last 2 words are never shown.
      { speaker: 'teen', text: "Because you are! You act like I can't do anything on my own. I'm old enough to hang out with my friends for one night without you hovering over everything.", coords: { x: 5, y: 4, z: 6 }, offsetSec: 0.8, radius: 48, interruptType: 'case_a', interruptedAtWord: 28 },
      { speaker: 'mom',  text: "We are not hovering. We are being parents. There's a difference.", coords: { x: -4, y: 2, z: 6 }, offsetSec: 4.5, radius: 30, isInterruption: true },
    ],
  },
  {
    turn: 8,
    lines: [
      // Interruption edge case B: teen is cut off mid-sentence (~half remaining).
      // The pre-split text is Part 1; the resume appears after mom finishes.
      { speaker: 'teen', text: "No, you just want control over everything. Who I go with,", coords: { x: 5, y: 5, z: 7 }, offsetSec: 0.8, radius: 46, interruptType: 'case_b' },
      { speaker: 'mom',  text: "And you only see the fun part. I'm thinking about weather, driving at night, people making stupid decisions, and nobody there to step in if things go wrong.", coords: { x: -5, y: 3, z: 7 }, offsetSec: 4.5, radius: 40, isInterruption: true },
      // Teen resumes the rest of the same sentence — still in the same turn/round.
      { speaker: 'teen', text: "where I go, when I come home — it's always something.", coords: { x: 5, y: 5, z: 7 }, offsetSec: 8.5, radius: 46, isContinuation: true, noBroadcast: true },
    ],
  },
  {
    turn: 9,
    lines: [
      { speaker: 'teen', text: "You don't actually listen to me. You already decided no before I even explained anything.", coords: { x: 4, y: 4, z: 8 }, offsetSec: 0.8, radius: 42 },
      { speaker: 'dad',  text: "Because from what you've explained, it still sounds like a bad idea. If there were adults going, that would be different.", coords: { x: -3, y: 1, z: 8 }, offsetSec: 4.5, radius: 26 },
    ],
  },
  {
    turn: 10,
    lines: [
      { speaker: 'teen', text: "So basically the answer was never going to be yes.", coords: { x: 3, y: 4, z: 9 }, offsetSec: 0.8, radius: 38 },
      { speaker: 'mom',  text: "Not for this trip, no.", coords: { x: -4, y: 1, z: 9 }, offsetSec: 3.5, radius: 20 },
      { speaker: 'teen', text: "Fine. Next time I won't even bother asking.", coords: { x: 2, y: 5, z: 9 }, offsetSec: 6.5, radius: 44 },
    ],
  },
];

// ── Conversation 2 — Resolved (negotiation) ──────────────────────
const TURNS_2: Turn[] = [
  {
    turn: 1,
    lines: [
      { speaker: 'teen', text: "Mom, I want to go camping this weekend with my friends. We already picked the site. It's just one night.", coords: { x: 4, y: -2, z: 0 }, offsetSec: 0.8, radius: 18, visual: { core_intensity: 0.74, glow_radius: 0.36, glow_softness: 0.42, hue_shift: 0.08, blend_openness: 0.20, line_opacity: 0.74, line_stability: 0.70, line_tension: 0.24 }, semantic: { assertion: 0.82, defensiveness: 0.08, vulnerability: 0.16, repair: 0.18, control: 0.12, empathy: 0.10 }, overlapState: 'none', overlapWith: [] },
      { speaker: 'mom',  text: "I really don't love the idea. A group of teenagers going without adults makes me nervous.", coords: { x: -4, y: 0, z: 0 }, offsetSec: 4.0, radius: 28, visual: { core_intensity: 0.72, glow_radius: 0.50, glow_softness: 0.50, hue_shift: 0.06, blend_openness: 0.22, line_opacity: 0.66, line_stability: 0.74, line_tension: 0.52 }, semantic: { assertion: 0.68, defensiveness: 0.22, vulnerability: 0.48, repair: 0.12, control: 0.66, empathy: 0.18 }, overlapState: 'none', overlapWith: [] },
    ],
  },
  {
    turn: 2,
    lines: [
      { speaker: 'teen', text: "I get why you're worried, but it's an actual campground, not just random woods. There are staff there, and we'll have cell service.", coords: { x: 3, y: -3, z: 1 }, offsetSec: 0.8, radius: 20, visual: { core_intensity: 0.58, glow_radius: 0.48, glow_softness: 0.60, hue_shift: 0.36, blend_openness: 0.58, line_opacity: 0.62, line_stability: 0.68, line_tension: 0.22 }, semantic: { assertion: 0.64, defensiveness: 0.34, vulnerability: 0.20, repair: 0.54, control: 0.10, empathy: 0.62 }, overlapState: 'contact_only', overlapWith: ['mom'] },
      { speaker: 'dad',  text: "Okay, slow down. Who exactly is going, and how are you getting there?", coords: { x: -1, y: -3, z: 1 }, offsetSec: 4.5, radius: 15, visual: { core_intensity: 0.46, glow_radius: 0.40, glow_softness: 0.56, hue_shift: 0.16, blend_openness: 0.42, line_opacity: 0.50, line_stability: 0.62, line_tension: 0.24 }, semantic: { assertion: 0.42, defensiveness: 0.08, vulnerability: 0.14, repair: 0.46, control: 0.42, empathy: 0.34 }, overlapState: 'guided_alignment', overlapWith: ['teen'] },
    ],
  },
  {
    turn: 3,
    lines: [
      { speaker: 'teen', text: "Me, Evan, Lucas, and Maya. Evan's older sister is driving us there, and her mom knows the plan.", coords: { x: 2, y: -3, z: 2 }, offsetSec: 0.8, radius: 16, visual: { core_intensity: 0.50, glow_radius: 0.48, glow_softness: 0.62, hue_shift: 0.22, blend_openness: 0.56, line_opacity: 0.56, line_stability: 0.66, line_tension: 0.18 }, semantic: { assertion: 0.56, defensiveness: 0.18, vulnerability: 0.18, repair: 0.62, control: 0.06, empathy: 0.42 }, overlapState: 'soft_merge', overlapWith: ['dad'] },
      { speaker: 'mom',  text: "That's better than I thought, but I still don't like that no parent is staying overnight.", coords: { x: -3, y: -1, z: 2 }, offsetSec: 4.5, radius: 24, visual: { core_intensity: 0.62, glow_radius: 0.42, glow_softness: 0.48, hue_shift: 0.12, blend_openness: 0.30, line_opacity: 0.58, line_stability: 0.68, line_tension: 0.40 }, semantic: { assertion: 0.58, defensiveness: 0.18, vulnerability: 0.34, repair: 0.32, control: 0.58, empathy: 0.26 }, overlapState: 'contact_only', overlapWith: ['teen'] },
    ],
  },
  {
    turn: 4,
    lines: [
      { speaker: 'teen', text: "I know, but we're not trying to do anything reckless. I can send you the campsite link, our schedule, and everyone's numbers.", coords: { x: 2, y: -4, z: 3 }, offsetSec: 0.8, radius: 22, visual: { core_intensity: 0.48, glow_radius: 0.62, glow_softness: 0.72, hue_shift: 0.40, blend_openness: 0.70, line_opacity: 0.54, line_stability: 0.70, line_tension: 0.16 }, semantic: { assertion: 0.52, defensiveness: 0.42, vulnerability: 0.28, repair: 0.76, control: 0.08, empathy: 0.64 }, overlapState: 'soft_merge', overlapWith: ['dad', 'mom'] },
      { speaker: 'dad',  text: "That actually helps. If we had the location and contact info, I'd feel a lot better.", coords: { x: 0, y: -4, z: 3 }, offsetSec: 4.5, radius: 20, visual: { core_intensity: 0.38, glow_radius: 0.68, glow_softness: 0.78, hue_shift: 0.34, blend_openness: 0.76, line_opacity: 0.44, line_stability: 0.60, line_tension: 0.12 }, semantic: { assertion: 0.34, defensiveness: 0.06, vulnerability: 0.44, repair: 0.72, control: 0.26, empathy: 0.58 }, overlapState: 'guided_alignment', overlapWith: ['teen'] },
    ],
  },
  {
    turn: 5,
    lines: [
      { speaker: 'mom',  text: "My issue isn't that I think you're irresponsible. I'm thinking about weather, driving at night, and what happens if someone makes a dumb decision.", coords: { x: -3, y: -1, z: 4 }, offsetSec: 0.8, radius: 36, visual: { core_intensity: 0.64, glow_radius: 0.56, glow_softness: 0.62, hue_shift: 0.18, blend_openness: 0.42, line_opacity: 0.60, line_stability: 0.72, line_tension: 0.34 }, semantic: { assertion: 0.62, defensiveness: 0.18, vulnerability: 0.52, repair: 0.44, control: 0.54, empathy: 0.34 }, overlapState: 'contact_only', overlapWith: ['dad'] },
      { speaker: 'teen', text: "That's fair. We can leave before dark, and I can check the weather with you tonight if you want.", coords: { x: 1, y: -3, z: 4 }, offsetSec: 4.5, radius: 26, visual: { core_intensity: 0.38, glow_radius: 0.74, glow_softness: 0.84, hue_shift: 0.48, blend_openness: 0.86, line_opacity: 0.46, line_stability: 0.66, line_tension: 0.08 }, semantic: { assertion: 0.42, defensiveness: 0.08, vulnerability: 0.30, repair: 0.84, control: 0.08, empathy: 0.74 }, overlapState: 'soft_merge', overlapWith: ['mom'] },
    ],
  },
  {
    turn: 6,
    lines: [
      { speaker: 'dad', text: "See, that's the kind of stuff we need to hear.", coords: { x: 1, y: -3, z: 5 }, offsetSec: 0.8, radius: 16, visual: { core_intensity: 0.40, glow_radius: 0.54, glow_softness: 0.72, hue_shift: 0.26, blend_openness: 0.68, line_opacity: 0.46, line_stability: 0.64, line_tension: 0.10 }, semantic: { assertion: 0.40, defensiveness: 0.04, vulnerability: 0.16, repair: 0.68, control: 0.22, empathy: 0.46 }, overlapState: 'guided_alignment', overlapWith: ['teen', 'mom'] },
      { speaker: 'mom', text: "I'm still uneasy. I don't want this to turn into one of those situations where everyone says 'it'll be fine' and then nobody has a plan.", coords: { x: -3, y: 0, z: 5 }, offsetSec: 3.5, radius: 34, visual: { core_intensity: 0.64, glow_radius: 0.50, glow_softness: 0.54, hue_shift: 0.10, blend_openness: 0.28, line_opacity: 0.58, line_stability: 0.74, line_tension: 0.48 }, semantic: { assertion: 0.56, defensiveness: 0.14, vulnerability: 0.58, repair: 0.28, control: 0.62, empathy: 0.20 }, overlapState: 'tense_collision', overlapWith: ['teen', 'dad'] },
    ],
  },
  {
    turn: 7,
    lines: [
      { speaker: 'teen', text: "Okay, then let's make an actual plan. I can share my location, text when we get there, and call before lights out. If anything changes, you pick me up.", coords: { x: 1, y: -4, z: 6 }, offsetSec: 0.8, radius: 32, visual: { core_intensity: 0.42, glow_radius: 0.82, glow_softness: 0.90, hue_shift: 0.54, blend_openness: 0.92, line_opacity: 0.48, line_stability: 0.72, line_tension: 0.06 }, semantic: { assertion: 0.48, defensiveness: 0.06, vulnerability: 0.40, repair: 0.92, control: 0.10, empathy: 0.80 }, overlapState: 'soft_merge', overlapWith: ['mom', 'dad'] },
      { speaker: 'dad',  text: "That sounds reasonable.", coords: { x: 1, y: -3, z: 6 }, offsetSec: 4.5, radius: 12, visual: { core_intensity: 0.24, glow_radius: 0.52, glow_softness: 0.76, hue_shift: 0.28, blend_openness: 0.70, line_opacity: 0.30, line_stability: 0.58, line_tension: 0.04 }, semantic: { assertion: 0.24, defensiveness: 0.02, vulnerability: 0.14, repair: 0.62, control: 0.08, empathy: 0.50 }, overlapState: 'guided_alignment', overlapWith: ['teen'] },
      { speaker: 'mom',  text: "Maybe. I just need to know you understand why this is a big deal to me.", coords: { x: -2, y: -1, z: 6 }, offsetSec: 6.5, radius: 38, visual: { core_intensity: 0.48, glow_radius: 0.72, glow_softness: 0.82, hue_shift: 0.16, blend_openness: 0.52, line_opacity: 0.46, line_stability: 0.60, line_tension: 0.22 }, semantic: { assertion: 0.46, defensiveness: 0.08, vulnerability: 0.72, repair: 0.46, control: 0.36, empathy: 0.30 }, overlapState: 'contact_only', overlapWith: ['teen'] },
    ],
  },
  {
    turn: 8,
    lines: [
      { speaker: 'teen', text: "I do. I know you're not just trying to control me. I know you're worried something could go wrong. I just want a chance to prove I can handle something like this.", coords: { x: 1, y: -5, z: 7 }, offsetSec: 0.8, radius: 42, visual: { core_intensity: 0.34, glow_radius: 0.94, glow_softness: 0.98, hue_shift: 0.72, blend_openness: 0.98, line_opacity: 0.42, line_stability: 0.74, line_tension: 0.02 }, semantic: { assertion: 0.38, defensiveness: 0.04, vulnerability: 0.78, repair: 0.96, control: 0.02, empathy: 0.96 }, overlapState: 'soft_merge', overlapWith: ['mom'] },
      { speaker: 'mom',  text: "…Okay. That's different from how you were saying it before.", coords: { x: -1, y: -3, z: 7 }, offsetSec: 5.0, radius: 35, visual: { core_intensity: 0.22, glow_radius: 0.74, glow_softness: 0.88, hue_shift: 0.38, blend_openness: 0.82, line_opacity: 0.32, line_stability: 0.54, line_tension: 0.06 }, semantic: { assertion: 0.22, defensiveness: 0.06, vulnerability: 0.52, repair: 0.74, control: 0.12, empathy: 0.58 }, overlapState: 'soft_merge', overlapWith: ['teen'] },
    ],
  },
  {
    turn: 9,
    lines: [
      { speaker: 'dad',  text: "What if we make this a trial run? One night only, no changing locations, and if they don't stick to the plan, no more trips like this for a while.", coords: { x: 0, y: -4, z: 8 }, offsetSec: 0.8, radius: 28, visual: { core_intensity: 0.60, glow_radius: 0.62, glow_softness: 0.74, hue_shift: 0.32, blend_openness: 0.70, line_opacity: 0.58, line_stability: 0.82, line_tension: 0.18 }, semantic: { assertion: 0.54, defensiveness: 0.02, vulnerability: 0.18, repair: 0.82, control: 0.62, empathy: 0.60 }, overlapState: 'guided_alignment', overlapWith: ['teen', 'mom'] },
      { speaker: 'teen', text: "That's fair. I can do that.", coords: { x: 1, y: -4, z: 8 }, offsetSec: 4.5, radius: 16, visual: { core_intensity: 0.28, glow_radius: 0.68, glow_softness: 0.84, hue_shift: 0.42, blend_openness: 0.88, line_opacity: 0.36, line_stability: 0.62, line_tension: 0.04 }, semantic: { assertion: 0.32, defensiveness: 0.02, vulnerability: 0.22, repair: 0.84, control: 0.04, empathy: 0.68 }, overlapState: 'soft_merge', overlapWith: ['dad', 'mom'] },
      { speaker: 'mom',  text: "And I want the sister's number, the campground info, and a check-in when you arrive and before bed.", coords: { x: -1, y: -2, z: 8 }, offsetSec: 7.0, radius: 22, visual: { core_intensity: 0.70, glow_radius: 0.46, glow_softness: 0.60, hue_shift: 0.20, blend_openness: 0.54, line_opacity: 0.60, line_stability: 0.82, line_tension: 0.24 }, semantic: { assertion: 0.58, defensiveness: 0.04, vulnerability: 0.22, repair: 0.64, control: 0.72, empathy: 0.42 }, overlapState: 'guided_alignment', overlapWith: ['dad', 'teen'] },
    ],
  },
  {
    turn: 10,
    lines: [
      { speaker: 'teen', text: "Deal. Thank you for actually hearing me out.", coords: { x: 0, y: -5, z: 9 }, offsetSec: 0.8, radius: 24, visual: { core_intensity: 0.16, glow_radius: 0.80, glow_softness: 0.94, hue_shift: 0.48, blend_openness: 0.94, line_opacity: 0.26, line_stability: 0.56, line_tension: 0.00 }, semantic: { assertion: 0.18, defensiveness: 0.00, vulnerability: 0.36, repair: 0.92, control: 0.00, empathy: 0.78 }, overlapState: 'soft_merge', overlapWith: ['mom', 'dad'] },
      { speaker: 'mom',  text: "Thank you for actually talking to us instead of just getting mad.", coords: { x: 0, y: -4, z: 9 }, offsetSec: 3.5, radius: 26, visual: { core_intensity: 0.18, glow_radius: 0.76, glow_softness: 0.92, hue_shift: 0.42, blend_openness: 0.90, line_opacity: 0.28, line_stability: 0.56, line_tension: 0.02 }, semantic: { assertion: 0.20, defensiveness: 0.02, vulnerability: 0.34, repair: 0.88, control: 0.02, empathy: 0.72 }, overlapState: 'soft_merge', overlapWith: ['teen'] },
      { speaker: 'dad',  text: "Great. Nobody's thrilled, everybody's slightly uncomfortable, which probably means this is a decent compromise.", coords: { x: 0, y: -3, z: 9 }, offsetSec: 6.5, radius: 20, visual: { core_intensity: 0.32, glow_radius: 0.64, glow_softness: 0.84, hue_shift: 0.34, blend_openness: 0.82, line_opacity: 0.40, line_stability: 0.68, line_tension: 0.06 }, semantic: { assertion: 0.34, defensiveness: 0.00, vulnerability: 0.22, repair: 0.80, control: 0.16, empathy: 0.64 }, overlapState: 'shared_field', overlapWith: ['teen', 'mom'] },
    ],
  },
];

// ── Conversation 3 — Couple conflict: canceled dinner ───────────
// 20 turns, oscillatory trajectory with a strong repair turn at 15–17
const TURNS_3: Turn[] = [
  {
    turn: 1,
    lines: [
      { speaker: 'a', text: "Are you seriously canceling on me again tonight?", coords: { x: -3.2, y: 3.0, z: 0 }, offsetSec: 0.8, radius: 36, visual: { core_intensity: 0.78, glow_radius: 0.52, glow_softness: 0.42, hue_shift: 0.06, blend_openness: 0.15, line_opacity: 0.72, line_stability: 0.68, line_tension: 0.58 }, semantic: { assertion: 0.88, defensiveness: 0.12, vulnerability: 0.12, repair: 0.06, control: 0.72, empathy: 0.08 }, overlapState: 'none', overlapWith: [] },
      { speaker: 'b', text: "I'm not \u201ccanceling on you.\u201d I told you work ran late.", coords: { x: -2.4, y: 2.2, z: 0 }, offsetSec: 4.2, radius: 28, visual: { core_intensity: 0.72, glow_radius: 0.46, glow_softness: 0.48, hue_shift: 0.08, blend_openness: 0.18, line_opacity: 0.68, line_stability: 0.70, line_tension: 0.50 }, semantic: { assertion: 0.76, defensiveness: 0.68, vulnerability: 0.08, repair: 0.10, control: 0.60, empathy: 0.10 }, overlapState: 'none', overlapWith: [] },
    ],
  },
  {
    turn: 2,
    lines: [
      { speaker: 'a', text: "You sent one dry text an hour after we were supposed to meet.", coords: { x: -3.4, y: 3.1, z: 1 }, offsetSec: 0.8, radius: 34, visual: { core_intensity: 0.80, glow_radius: 0.48, glow_softness: 0.40, hue_shift: 0.05, blend_openness: 0.12, line_opacity: 0.74, line_stability: 0.66, line_tension: 0.62 }, semantic: { assertion: 0.84, defensiveness: 0.10, vulnerability: 0.14, repair: 0.04, control: 0.68, empathy: 0.06 }, overlapState: 'none', overlapWith: [] },
      { speaker: 'b', text: "Because I was busy, not because I was trying to disrespect you.", coords: { x: -1.6, y: 1.4, z: 1 }, offsetSec: 4.2, radius: 22, visual: { core_intensity: 0.58, glow_radius: 0.44, glow_softness: 0.52, hue_shift: 0.12, blend_openness: 0.28, line_opacity: 0.62, line_stability: 0.72, line_tension: 0.38 }, semantic: { assertion: 0.62, defensiveness: 0.58, vulnerability: 0.18, repair: 0.22, control: 0.44, empathy: 0.24 }, overlapState: 'contact_only', overlapWith: ['a'] },
    ],
  },
  {
    turn: 3,
    lines: [
      { speaker: 'a', text: "It doesn't feel like that. It feels like I'm always the thing that gets pushed aside.", coords: { x: -0.6, y: 2.2, z: 2 }, offsetSec: 0.8, radius: 30, visual: { core_intensity: 0.64, glow_radius: 0.58, glow_softness: 0.62, hue_shift: 0.18, blend_openness: 0.38, line_opacity: 0.66, line_stability: 0.64, line_tension: 0.42 }, semantic: { assertion: 0.62, defensiveness: 0.18, vulnerability: 0.56, repair: 0.22, control: 0.28, empathy: 0.20 }, overlapState: 'contact_only', overlapWith: ['b'] },
      { speaker: 'b', text: "That's not fair. You act like one bad night means I don't care about you at all.", coords: { x: -2.0, y: 2.0, z: 2 }, offsetSec: 4.2, radius: 26, visual: { core_intensity: 0.70, glow_radius: 0.44, glow_softness: 0.46, hue_shift: 0.10, blend_openness: 0.20, line_opacity: 0.66, line_stability: 0.68, line_tension: 0.44 }, semantic: { assertion: 0.72, defensiveness: 0.64, vulnerability: 0.16, repair: 0.14, control: 0.52, empathy: 0.18 }, overlapState: 'contact_only', overlapWith: ['a'] },
    ],
  },
  {
    turn: 4,
    lines: [
      { speaker: 'a', text: "It's not one bad night though. It's the same pattern every time you get stressed.", coords: { x: -3.0, y: 3.2, z: 3 }, offsetSec: 0.8, radius: 38, visual: { core_intensity: 0.82, glow_radius: 0.50, glow_softness: 0.40, hue_shift: 0.06, blend_openness: 0.14, line_opacity: 0.76, line_stability: 0.62, line_tension: 0.64 }, semantic: { assertion: 0.86, defensiveness: 0.14, vulnerability: 0.12, repair: 0.06, control: 0.74, empathy: 0.10 }, overlapState: 'none', overlapWith: [] },
      { speaker: 'b', text: "And every time I get stressed, you make it about the relationship instead of what I'm dealing with.", coords: { x: -3.1, y: 3.0, z: 3 }, offsetSec: 4.2, radius: 36, visual: { core_intensity: 0.80, glow_radius: 0.48, glow_softness: 0.42, hue_shift: 0.08, blend_openness: 0.16, line_opacity: 0.74, line_stability: 0.60, line_tension: 0.60 }, semantic: { assertion: 0.82, defensiveness: 0.72, vulnerability: 0.10, repair: 0.08, control: 0.64, empathy: 0.12 }, overlapState: 'tense_collision', overlapWith: ['a'] },
    ],
  },
  {
    turn: 5,
    lines: [
      { speaker: 'a', text: "Because I'm in the relationship too. I don't just disappear because you're overwhelmed.", coords: { x: 0.4, y: 2.1, z: 4 }, offsetSec: 0.8, radius: 26, visual: { core_intensity: 0.66, glow_radius: 0.54, glow_softness: 0.56, hue_shift: 0.22, blend_openness: 0.38, line_opacity: 0.64, line_stability: 0.64, line_tension: 0.42 }, semantic: { assertion: 0.70, defensiveness: 0.20, vulnerability: 0.28, repair: 0.32, control: 0.40, empathy: 0.32 }, overlapState: 'contact_only', overlapWith: ['b'] },
      { speaker: 'b', text: "I'm not asking you to disappear. I'm asking you not to make everything heavier the second I'm already drowning.", coords: { x: 0.8, y: 1.3, z: 4 }, offsetSec: 4.2, radius: 24, visual: { core_intensity: 0.62, glow_radius: 0.56, glow_softness: 0.60, hue_shift: 0.20, blend_openness: 0.40, line_opacity: 0.60, line_stability: 0.66, line_tension: 0.36 }, semantic: { assertion: 0.60, defensiveness: 0.44, vulnerability: 0.42, repair: 0.28, control: 0.36, empathy: 0.30 }, overlapState: 'contact_only', overlapWith: ['a'] },
    ],
  },
  {
    turn: 6,
    lines: [
      { speaker: 'a', text: "See? That's exactly it. The second I tell you I'm hurt, you act like I'm a burden.", coords: { x: 1.2, y: 2.8, z: 5 }, offsetSec: 0.8, radius: 32, visual: { core_intensity: 0.70, glow_radius: 0.60, glow_softness: 0.58, hue_shift: 0.24, blend_openness: 0.34, line_opacity: 0.66, line_stability: 0.60, line_tension: 0.50 }, semantic: { assertion: 0.72, defensiveness: 0.14, vulnerability: 0.48, repair: 0.18, control: 0.44, empathy: 0.22 }, overlapState: 'contact_only', overlapWith: ['b'] },
      { speaker: 'b', text: "I didn't say you were a burden. I said your timing is awful.", coords: { x: -2.2, y: 2.6, z: 5 }, offsetSec: 4.2, radius: 30, visual: { core_intensity: 0.74, glow_radius: 0.44, glow_softness: 0.44, hue_shift: 0.08, blend_openness: 0.16, line_opacity: 0.70, line_stability: 0.64, line_tension: 0.54 }, semantic: { assertion: 0.78, defensiveness: 0.62, vulnerability: 0.10, repair: 0.08, control: 0.62, empathy: 0.10 }, overlapState: 'none', overlapWith: [] },
    ],
  },
  {
    turn: 7,
    lines: [
      { speaker: 'a', text: "Wow. Okay. So now there\u2019s a \u201cright time\u201d for me to have feelings?", coords: { x: -2.4, y: 3.8, z: 6 }, offsetSec: 0.8, radius: 42, visual: { core_intensity: 0.84, glow_radius: 0.54, glow_softness: 0.44, hue_shift: 0.06, blend_openness: 0.12, line_opacity: 0.78, line_stability: 0.58, line_tension: 0.68 }, semantic: { assertion: 0.86, defensiveness: 0.16, vulnerability: 0.14, repair: 0.04, control: 0.68, empathy: 0.06 }, overlapState: 'none', overlapWith: [] },
      { speaker: 'b', text: "Don't twist what I said. I'm saying I needed understanding for one night.", coords: { x: 1.0, y: 1.2, z: 6 }, offsetSec: 4.2, radius: 22, visual: { core_intensity: 0.56, glow_radius: 0.58, glow_softness: 0.62, hue_shift: 0.20, blend_openness: 0.42, line_opacity: 0.58, line_stability: 0.64, line_tension: 0.30 }, semantic: { assertion: 0.58, defensiveness: 0.52, vulnerability: 0.34, repair: 0.34, control: 0.38, empathy: 0.28 }, overlapState: 'none', overlapWith: [] },
    ],
  },
  {
    turn: 8,
    lines: [
      { speaker: 'a', text: "I have been understanding. I'm just tired of pretending it doesn't affect me.", coords: { x: 2.0, y: -0.6, z: 7 }, offsetSec: 0.8, radius: 30, visual: { core_intensity: 0.52, glow_radius: 0.72, glow_softness: 0.74, hue_shift: 0.38, blend_openness: 0.62, line_opacity: 0.54, line_stability: 0.64, line_tension: 0.20 }, semantic: { assertion: 0.56, defensiveness: 0.10, vulnerability: 0.68, repair: 0.54, control: 0.14, empathy: 0.50 }, overlapState: 'soft_merge', overlapWith: ['b'] },
      { speaker: 'b', text: "And I'm tired of feeling like I'm being graded every time I mess something up.", coords: { x: 1.8, y: 0.8, z: 7 }, offsetSec: 4.2, radius: 28, visual: { core_intensity: 0.56, glow_radius: 0.66, glow_softness: 0.70, hue_shift: 0.26, blend_openness: 0.54, line_opacity: 0.56, line_stability: 0.60, line_tension: 0.26 }, semantic: { assertion: 0.52, defensiveness: 0.38, vulnerability: 0.56, repair: 0.44, control: 0.22, empathy: 0.40 }, overlapState: 'soft_merge', overlapWith: ['a'] },
    ],
  },
  {
    turn: 9,
    lines: [
      { speaker: 'a', text: "This isn't about grading you. I wanted one dinner with you that actually felt important.", coords: { x: 3.8, y: -2.8, z: 8 }, offsetSec: 0.8, radius: 28, visual: { core_intensity: 0.40, glow_radius: 0.82, glow_softness: 0.86, hue_shift: 0.52, blend_openness: 0.80, line_opacity: 0.46, line_stability: 0.68, line_tension: 0.10 }, semantic: { assertion: 0.44, defensiveness: 0.04, vulnerability: 0.76, repair: 0.84, control: 0.06, empathy: 0.72 }, overlapState: 'soft_merge', overlapWith: ['b'] },
      { speaker: 'b', text: "It is important. You are important. I just couldn't do tonight.", coords: { x: 3.6, y: -2.6, z: 8 }, offsetSec: 4.2, radius: 26, visual: { core_intensity: 0.38, glow_radius: 0.80, glow_softness: 0.88, hue_shift: 0.48, blend_openness: 0.78, line_opacity: 0.44, line_stability: 0.66, line_tension: 0.08 }, semantic: { assertion: 0.36, defensiveness: 0.06, vulnerability: 0.50, repair: 0.86, control: 0.08, empathy: 0.74 }, overlapState: 'guided_alignment', overlapWith: ['a'] },
    ],
  },
  {
    turn: 10,
    lines: [
      { speaker: 'a', text: "Then why didn't you call? Why do I always get the bare minimum version of you when things get hard?", coords: { x: -2.6, y: 3.9, z: 9 }, offsetSec: 0.8, radius: 44, visual: { core_intensity: 0.82, glow_radius: 0.54, glow_softness: 0.44, hue_shift: 0.06, blend_openness: 0.14, line_opacity: 0.78, line_stability: 0.58, line_tension: 0.66 }, semantic: { assertion: 0.86, defensiveness: 0.14, vulnerability: 0.20, repair: 0.06, control: 0.70, empathy: 0.08 }, overlapState: 'none', overlapWith: [] },
      { speaker: 'b', text: "Because if I called, it would\u2019ve turned into exactly this.", coords: { x: -2.2, y: 2.8, z: 9 }, offsetSec: 4.2, radius: 32, visual: { core_intensity: 0.76, glow_radius: 0.46, glow_softness: 0.44, hue_shift: 0.08, blend_openness: 0.18, line_opacity: 0.72, line_stability: 0.60, line_tension: 0.58 }, semantic: { assertion: 0.74, defensiveness: 0.74, vulnerability: 0.12, repair: 0.10, control: 0.54, empathy: 0.14 }, overlapState: 'none', overlapWith: [] },
    ],
  },
  {
    turn: 11,
    lines: [
      { speaker: 'a', text: "That's such a coward answer. You avoided me because you didn't want to deal with my reaction.", coords: { x: -4.2, y: 4.8, z: 10 }, offsetSec: 0.8, radius: 50, visual: { core_intensity: 0.92, glow_radius: 0.58, glow_softness: 0.40, hue_shift: 0.04, blend_openness: 0.08, line_opacity: 0.84, line_stability: 0.54, line_tension: 0.78 }, semantic: { assertion: 0.94, defensiveness: 0.12, vulnerability: 0.08, repair: 0.02, control: 0.80, empathy: 0.04 }, overlapState: 'tense_collision', overlapWith: ['b'] },
      { speaker: 'b', text: "I avoided a fight, yeah. Because lately every conversation turns into one.", coords: { x: -3.6, y: 4.1, z: 10 }, offsetSec: 4.2, radius: 44, visual: { core_intensity: 0.86, glow_radius: 0.52, glow_softness: 0.42, hue_shift: 0.06, blend_openness: 0.12, line_opacity: 0.80, line_stability: 0.56, line_tension: 0.72 }, semantic: { assertion: 0.82, defensiveness: 0.78, vulnerability: 0.10, repair: 0.06, control: 0.58, empathy: 0.08 }, overlapState: 'tense_collision', overlapWith: ['a'] },
    ],
  },
  {
    turn: 12,
    lines: [
      { speaker: 'a', text: "Maybe because I keep feeling like I have to beg for basic consideration.", coords: { x: -0.4, y: 2.7, z: 11 }, offsetSec: 0.8, radius: 32, visual: { core_intensity: 0.68, glow_radius: 0.60, glow_softness: 0.62, hue_shift: 0.22, blend_openness: 0.36, line_opacity: 0.66, line_stability: 0.60, line_tension: 0.44 }, semantic: { assertion: 0.66, defensiveness: 0.16, vulnerability: 0.54, repair: 0.20, control: 0.38, empathy: 0.22 }, overlapState: 'contact_only', overlapWith: ['b'] },
      { speaker: 'b', text: "And maybe because no matter what I do, you only remember the part where I failed.", coords: { x: 0.2, y: 2.0, z: 11 }, offsetSec: 4.2, radius: 28, visual: { core_intensity: 0.66, glow_radius: 0.58, glow_softness: 0.60, hue_shift: 0.18, blend_openness: 0.34, line_opacity: 0.64, line_stability: 0.58, line_tension: 0.40 }, semantic: { assertion: 0.64, defensiveness: 0.46, vulnerability: 0.52, repair: 0.24, control: 0.32, empathy: 0.28 }, overlapState: 'contact_only', overlapWith: ['a'] },
    ],
  },
  {
    turn: 13,
    lines: [
      { speaker: 'a', text: "That's not true. I notice what you do. I just don't know why it's so hard for you to show up when I actually need you.", coords: { x: 1.8, y: 0.2, z: 12 }, offsetSec: 0.8, radius: 24, visual: { core_intensity: 0.54, glow_radius: 0.64, glow_softness: 0.68, hue_shift: 0.32, blend_openness: 0.52, line_opacity: 0.58, line_stability: 0.62, line_tension: 0.28 }, semantic: { assertion: 0.58, defensiveness: 0.12, vulnerability: 0.46, repair: 0.48, control: 0.24, empathy: 0.44 }, overlapState: 'soft_merge', overlapWith: ['b'] },
      { speaker: 'b', text: "I do show up. Just not always in the exact way you want.", coords: { x: 1.2, y: 0.8, z: 12 }, offsetSec: 4.2, radius: 20, visual: { core_intensity: 0.52, glow_radius: 0.58, glow_softness: 0.64, hue_shift: 0.24, blend_openness: 0.46, line_opacity: 0.56, line_stability: 0.62, line_tension: 0.30 }, semantic: { assertion: 0.54, defensiveness: 0.48, vulnerability: 0.26, repair: 0.36, control: 0.30, empathy: 0.34 }, overlapState: 'soft_merge', overlapWith: ['a'] },
    ],
  },
  {
    turn: 14,
    lines: [
      { speaker: 'a', text: "You know what? Maybe we just need completely different things from each other.", coords: { x: -4.6, y: 2.9, z: 13 }, offsetSec: 0.8, radius: 46, visual: { core_intensity: 0.84, glow_radius: 0.52, glow_softness: 0.44, hue_shift: 0.06, blend_openness: 0.12, line_opacity: 0.80, line_stability: 0.56, line_tension: 0.70 }, semantic: { assertion: 0.80, defensiveness: 0.22, vulnerability: 0.24, repair: 0.04, control: 0.76, empathy: 0.08 }, overlapState: 'none', overlapWith: [] },
      { speaker: 'b', text: "Don't do that. Don't jump straight from one argument to \u201cmaybe we\u2019re wrong for each other.\u201d", coords: { x: 2.6, y: -0.8, z: 13 }, offsetSec: 4.2, radius: 28, visual: { core_intensity: 0.52, glow_radius: 0.72, glow_softness: 0.74, hue_shift: 0.36, blend_openness: 0.66, line_opacity: 0.54, line_stability: 0.66, line_tension: 0.18 }, semantic: { assertion: 0.56, defensiveness: 0.14, vulnerability: 0.38, repair: 0.72, control: 0.28, empathy: 0.52 }, overlapState: 'none', overlapWith: [] },
    ],
  },
  {
    turn: 15,
    lines: [
      { speaker: 'a', text: "I'm not trying to be dramatic. I'm saying I feel lonely even when I'm with you sometimes.", coords: { x: 3.6, y: -3.8, z: 14 }, offsetSec: 0.8, radius: 36, visual: { core_intensity: 0.36, glow_radius: 0.86, glow_softness: 0.90, hue_shift: 0.58, blend_openness: 0.86, line_opacity: 0.42, line_stability: 0.70, line_tension: 0.08 }, semantic: { assertion: 0.40, defensiveness: 0.04, vulnerability: 0.86, repair: 0.80, control: 0.04, empathy: 0.74 }, overlapState: 'soft_merge', overlapWith: ['b'] },
      { speaker: 'b', text: "\u2026Okay. That I can hear. That\u2019s different.", coords: { x: 3.4, y: -3.0, z: 14 }, offsetSec: 4.2, radius: 24, visual: { core_intensity: 0.32, glow_radius: 0.76, glow_softness: 0.86, hue_shift: 0.46, blend_openness: 0.80, line_opacity: 0.40, line_stability: 0.66, line_tension: 0.06 }, semantic: { assertion: 0.28, defensiveness: 0.04, vulnerability: 0.54, repair: 0.84, control: 0.06, empathy: 0.76 }, overlapState: 'guided_alignment', overlapWith: ['a'] },
    ],
  },
  {
    turn: 16,
    lines: [
      { speaker: 'a', text: "Different how?", coords: { x: 3.0, y: -3.0, z: 15 }, offsetSec: 0.8, radius: 14, visual: { core_intensity: 0.28, glow_radius: 0.70, glow_softness: 0.84, hue_shift: 0.50, blend_openness: 0.82, line_opacity: 0.36, line_stability: 0.68, line_tension: 0.06 }, semantic: { assertion: 0.26, defensiveness: 0.02, vulnerability: 0.46, repair: 0.76, control: 0.04, empathy: 0.68 }, overlapState: 'soft_merge', overlapWith: ['b'] },
      { speaker: 'b', text: "Because that\u2019s you telling me what\u2019s actually underneath the anger instead of just coming at me.", coords: { x: 3.8, y: -3.6, z: 15 }, offsetSec: 4.2, radius: 22, visual: { core_intensity: 0.34, glow_radius: 0.78, glow_softness: 0.88, hue_shift: 0.44, blend_openness: 0.84, line_opacity: 0.38, line_stability: 0.70, line_tension: 0.06 }, semantic: { assertion: 0.32, defensiveness: 0.02, vulnerability: 0.42, repair: 0.88, control: 0.06, empathy: 0.82 }, overlapState: 'guided_alignment', overlapWith: ['a'] },
    ],
  },
  {
    turn: 17,
    lines: [
      { speaker: 'a', text: "Fine. Underneath the anger, I feel stupid for caring this much when I'm not sure you care the same way back.", coords: { x: 4.6, y: -4.2, z: 16 }, offsetSec: 0.8, radius: 42, visual: { core_intensity: 0.30, glow_radius: 0.94, glow_softness: 0.96, hue_shift: 0.68, blend_openness: 0.94, line_opacity: 0.36, line_stability: 0.72, line_tension: 0.04 }, semantic: { assertion: 0.34, defensiveness: 0.02, vulnerability: 0.94, repair: 0.88, control: 0.02, empathy: 0.72 }, overlapState: 'soft_merge', overlapWith: ['b'] },
      { speaker: 'b', text: "I do care. I think I just shut down when I feel like I'm already failing.", coords: { x: 4.4, y: -4.0, z: 16 }, offsetSec: 4.2, radius: 38, visual: { core_intensity: 0.28, glow_radius: 0.90, glow_softness: 0.94, hue_shift: 0.64, blend_openness: 0.92, line_opacity: 0.34, line_stability: 0.72, line_tension: 0.04 }, semantic: { assertion: 0.30, defensiveness: 0.04, vulnerability: 0.86, repair: 0.86, control: 0.04, empathy: 0.76 }, overlapState: 'shared_field', overlapWith: ['a'] },
    ],
  },
  {
    turn: 18,
    lines: [
      { speaker: 'a', text: "Then tell me that instead of disappearing. I can handle tired. I can handle overwhelmed. I can't handle silence.", coords: { x: 4.0, y: -3.2, z: 17 }, offsetSec: 0.8, radius: 30, visual: { core_intensity: 0.44, glow_radius: 0.78, glow_softness: 0.84, hue_shift: 0.46, blend_openness: 0.78, line_opacity: 0.48, line_stability: 0.72, line_tension: 0.12 }, semantic: { assertion: 0.56, defensiveness: 0.04, vulnerability: 0.64, repair: 0.78, control: 0.16, empathy: 0.62 }, overlapState: 'soft_merge', overlapWith: ['b'] },
      { speaker: 'b', text: "That's fair. And I need you not to assume the worst version of me every time I mess up.", coords: { x: 4.1, y: -3.7, z: 17 }, offsetSec: 4.2, radius: 28, visual: { core_intensity: 0.42, glow_radius: 0.76, glow_softness: 0.82, hue_shift: 0.44, blend_openness: 0.76, line_opacity: 0.46, line_stability: 0.72, line_tension: 0.12 }, semantic: { assertion: 0.50, defensiveness: 0.08, vulnerability: 0.56, repair: 0.80, control: 0.18, empathy: 0.66 }, overlapState: 'soft_merge', overlapWith: ['a'] },
    ],
  },
  {
    turn: 19,
    lines: [
      { speaker: 'a', text: "I can try that. But I need more than \u201cI\u2019m busy.\u201d I need something that actually sounds like you still see me.", coords: { x: 4.2, y: -4.1, z: 18 }, offsetSec: 0.8, radius: 26, visual: { core_intensity: 0.32, glow_radius: 0.86, glow_softness: 0.90, hue_shift: 0.56, blend_openness: 0.90, line_opacity: 0.40, line_stability: 0.72, line_tension: 0.06 }, semantic: { assertion: 0.44, defensiveness: 0.02, vulnerability: 0.76, repair: 0.88, control: 0.08, empathy: 0.78 }, overlapState: 'soft_merge', overlapWith: ['b'] },
      { speaker: 'b', text: "Okay. Next time I call, even if it\u2019s short. And I don\u2019t cancel without actually talking to you.", coords: { x: 4.0, y: -4.6, z: 18 }, offsetSec: 4.2, radius: 24, visual: { core_intensity: 0.30, glow_radius: 0.84, glow_softness: 0.92, hue_shift: 0.54, blend_openness: 0.92, line_opacity: 0.38, line_stability: 0.74, line_tension: 0.06 }, semantic: { assertion: 0.46, defensiveness: 0.02, vulnerability: 0.52, repair: 0.94, control: 0.18, empathy: 0.76 }, overlapState: 'guided_alignment', overlapWith: ['a'] },
    ],
  },
  {
    turn: 20,
    lines: [
      { speaker: 'a', text: "Okay. I'm still mad, but I feel better than I did twenty minutes ago.", coords: { x: 3.4, y: -3.8, z: 19 }, offsetSec: 0.8, radius: 22, visual: { core_intensity: 0.24, glow_radius: 0.80, glow_softness: 0.88, hue_shift: 0.50, blend_openness: 0.86, line_opacity: 0.32, line_stability: 0.70, line_tension: 0.06 }, semantic: { assertion: 0.30, defensiveness: 0.04, vulnerability: 0.54, repair: 0.82, control: 0.06, empathy: 0.70 }, overlapState: 'soft_merge', overlapWith: ['b'] },
      { speaker: 'b', text: "Same. Can we try again tomorrow? Properly this time?", coords: { x: 4.0, y: -4.0, z: 19 }, offsetSec: 4.2, radius: 20, visual: { core_intensity: 0.22, glow_radius: 0.78, glow_softness: 0.86, hue_shift: 0.48, blend_openness: 0.88, line_opacity: 0.30, line_stability: 0.70, line_tension: 0.04 }, semantic: { assertion: 0.28, defensiveness: 0.02, vulnerability: 0.44, repair: 0.90, control: 0.08, empathy: 0.74 }, overlapState: 'soft_merge', overlapWith: ['a'] },
    ],
  },
];

// ── Conversation 4 — Startup Product Meeting (AI Speaking Partner) ──
const TURNS_4: Turn[] = [
  {
    turn: 1,
    lines: [
      { speaker: 'maya',   text: "I really think this is the feature people will associate us with. If we keep waiting until it feels perfect, we're going to miss the window.", coords: { x: -2.2, y: 4.4, z: 0 }, offsetSec: 0.8, radius: 34, visual: { core_intensity: 0.78, glow_radius: 0.46, glow_softness: 0.38, hue_shift: 0.10, blend_openness: 0.24, line_opacity: 0.74, line_stability: 0.66, line_tension: 0.38 }, semantic: { assertion: 0.84, defensiveness: 0.12, vulnerability: 0.22, repair: 0.14, control: 0.66, empathy: 0.16 }, overlapState: 'none', overlapWith: [] },
      { speaker: 'alex',   text: "I get the urgency, but right now it only feels magical in the best-case demo. In normal use, it's still pretty fragile.", coords: { x: 2.0, y: -4.0, z: 0 }, offsetSec: 3.8, radius: 26, visual: { core_intensity: 0.64, glow_radius: 0.44, glow_softness: 0.52, hue_shift: 0.14, blend_openness: 0.40, line_opacity: 0.62, line_stability: 0.72, line_tension: 0.36 }, semantic: { assertion: 0.66, defensiveness: 0.30, vulnerability: 0.18, repair: 0.28, control: 0.42, empathy: 0.38 }, overlapState: 'none', overlapWith: [] },
      { speaker: 'daniel', text: "I think the real question is whether we're debating the full vision or a scoped first version.", coords: { x: 0.2, y: -0.6, z: 0 }, offsetSec: 6.8, radius: 18, visual: { core_intensity: 0.42, glow_radius: 0.54, glow_softness: 0.70, hue_shift: 0.30, blend_openness: 0.74, line_opacity: 0.52, line_stability: 0.68, line_tension: 0.18 }, semantic: { assertion: 0.44, defensiveness: 0.06, vulnerability: 0.16, repair: 0.72, control: 0.22, empathy: 0.58 }, overlapState: 'contact_only', overlapWith: ['maya', 'alex'] },
    ],
  },
  {
    turn: 2,
    lines: [
      { speaker: 'leo',    text: "From a launch perspective, this is the strongest story we've had in a while. It's clear, exciting, and easy to explain.", coords: { x: -4.2, y: 4.6, z: 1 }, offsetSec: 0.8, radius: 40, visual: { core_intensity: 0.84, glow_radius: 0.42, glow_softness: 0.36, hue_shift: 0.08, blend_openness: 0.18, line_opacity: 0.78, line_stability: 0.62, line_tension: 0.42 }, semantic: { assertion: 0.88, defensiveness: 0.10, vulnerability: 0.12, repair: 0.10, control: 0.72, empathy: 0.14 }, overlapState: 'soft_merge', overlapWith: ['maya'] },
      { speaker: 'serena', text: "It's easy to explain until the user actually tries it and feels embarrassed by it. Speaking is already vulnerable. A rough experience here lands harder than a rough experience somewhere else.", coords: { x: 3.6, y: 1.8, z: 1 }, offsetSec: 3.8, radius: 32, visual: { core_intensity: 0.62, glow_radius: 0.70, glow_softness: 0.74, hue_shift: 0.40, blend_openness: 0.60, line_opacity: 0.60, line_stability: 0.70, line_tension: 0.30 }, semantic: { assertion: 0.64, defensiveness: 0.12, vulnerability: 0.58, repair: 0.46, control: 0.22, empathy: 0.72 }, overlapState: 'none', overlapWith: [] },
      { speaker: 'maya',   text: "I'm not saying quality doesn't matter. I'm saying the value of getting this in people's hands is also real.", coords: { x: -2.6, y: 4.0, z: 1 }, offsetSec: 6.8, radius: 28, visual: { core_intensity: 0.70, glow_radius: 0.44, glow_softness: 0.42, hue_shift: 0.12, blend_openness: 0.30, line_opacity: 0.68, line_stability: 0.64, line_tension: 0.34 }, semantic: { assertion: 0.72, defensiveness: 0.22, vulnerability: 0.26, repair: 0.32, control: 0.54, empathy: 0.30 }, overlapState: 'soft_merge', overlapWith: ['leo'] },
    ],
  },
  {
    turn: 3,
    lines: [
      { speaker: 'priya',  text: "My concern is not just roughness. It's whether the feedback is pedagogically sound. If the AI gives a correction that is technically plausible but not actually helpful for learning, that creates confusion.", coords: { x: 4.2, y: -4.2, z: 2 }, offsetSec: 0.8, radius: 38, visual: { core_intensity: 0.72, glow_radius: 0.52, glow_softness: 0.50, hue_shift: 0.18, blend_openness: 0.32, line_opacity: 0.68, line_stability: 0.74, line_tension: 0.40 }, semantic: { assertion: 0.76, defensiveness: 0.14, vulnerability: 0.24, repair: 0.36, control: 0.52, empathy: 0.40 }, overlapState: 'soft_merge', overlapWith: ['alex'] },
      { speaker: 'alex',   text: "Yes, and some of that confusion comes from the model sounding more confident than it should.", coords: { x: 2.8, y: -3.8, z: 2 }, offsetSec: 3.8, radius: 24, visual: { core_intensity: 0.60, glow_radius: 0.46, glow_softness: 0.56, hue_shift: 0.14, blend_openness: 0.44, line_opacity: 0.60, line_stability: 0.74, line_tension: 0.32 }, semantic: { assertion: 0.62, defensiveness: 0.20, vulnerability: 0.16, repair: 0.34, control: 0.38, empathy: 0.42 }, overlapState: 'soft_merge', overlapWith: ['priya'] },
      { speaker: 'daniel', text: "So one issue is feature quality, and another is how authoritative the feature feels.", coords: { x: 1.6, y: -0.8, z: 2 }, offsetSec: 6.8, radius: 20, visual: { core_intensity: 0.44, glow_radius: 0.54, glow_softness: 0.66, hue_shift: 0.28, blend_openness: 0.70, line_opacity: 0.50, line_stability: 0.68, line_tension: 0.20 }, semantic: { assertion: 0.46, defensiveness: 0.06, vulnerability: 0.14, repair: 0.66, control: 0.24, empathy: 0.54 }, overlapState: 'contact_only', overlapWith: ['alex', 'priya'] },
    ],
  },
  {
    turn: 4,
    lines: [
      { speaker: 'nina',   text: "From the support side, I can already tell you the first wave of tickets. 'The app marked my sentence wrong.' 'The app didn't understand my accent.' 'Why is it correcting me differently each time?'", coords: { x: -3.8, y: -4.0, z: 3 }, offsetSec: 0.8, radius: 42, visual: { core_intensity: 0.74, glow_radius: 0.48, glow_softness: 0.44, hue_shift: 0.10, blend_openness: 0.28, line_opacity: 0.70, line_stability: 0.68, line_tension: 0.50 }, semantic: { assertion: 0.78, defensiveness: 0.14, vulnerability: 0.28, repair: 0.22, control: 0.54, empathy: 0.46 }, overlapState: 'none', overlapWith: [] },
      { speaker: 'leo',    text: "But we also shouldn't underestimate how many users will forgive imperfections if the feature feels new and useful.", coords: { x: -3.6, y: 4.2, z: 3 }, offsetSec: 3.8, radius: 34, visual: { core_intensity: 0.76, glow_radius: 0.40, glow_softness: 0.38, hue_shift: 0.08, blend_openness: 0.22, line_opacity: 0.72, line_stability: 0.60, line_tension: 0.44 }, semantic: { assertion: 0.80, defensiveness: 0.14, vulnerability: 0.14, repair: 0.16, control: 0.68, empathy: 0.20 }, overlapState: 'none', overlapWith: [] },
      { speaker: 'serena', text: "They'll forgive imperfection more than they'll forgive humiliation.", coords: { x: 4.0, y: 1.4, z: 3 }, offsetSec: 6.8, radius: 28, visual: { core_intensity: 0.64, glow_radius: 0.64, glow_softness: 0.68, hue_shift: 0.36, blend_openness: 0.56, line_opacity: 0.62, line_stability: 0.68, line_tension: 0.28 }, semantic: { assertion: 0.68, defensiveness: 0.08, vulnerability: 0.52, repair: 0.44, control: 0.18, empathy: 0.68 }, overlapState: 'none', overlapWith: [] },
    ],
  },
  {
    turn: 5,
    lines: [
      { speaker: 'maya',   text: "What if we launch it explicitly as beta? That gives us room to learn without pretending it's final.", coords: { x: -3.0, y: 3.2, z: 4 }, offsetSec: 0.8, radius: 30, visual: { core_intensity: 0.68, glow_radius: 0.50, glow_softness: 0.48, hue_shift: 0.16, blend_openness: 0.36, line_opacity: 0.66, line_stability: 0.64, line_tension: 0.32 }, semantic: { assertion: 0.70, defensiveness: 0.18, vulnerability: 0.30, repair: 0.42, control: 0.52, empathy: 0.28 }, overlapState: 'none', overlapWith: [] },
      { speaker: 'nina',   text: "'Beta' helps internally more than externally. Most users won't calibrate their expectations the way we want them to.", coords: { x: -3.2, y: -3.8, z: 4 }, offsetSec: 3.8, radius: 32, visual: { core_intensity: 0.66, glow_radius: 0.50, glow_softness: 0.50, hue_shift: 0.12, blend_openness: 0.36, line_opacity: 0.62, line_stability: 0.66, line_tension: 0.38 }, semantic: { assertion: 0.70, defensiveness: 0.20, vulnerability: 0.24, repair: 0.30, control: 0.46, empathy: 0.42 }, overlapState: 'none', overlapWith: [] },
      { speaker: 'priya',  text: "Also, 'beta' doesn't solve the teaching problem. If it gives shaky feedback, it still shapes learner behavior.", coords: { x: 4.4, y: -4.0, z: 4 }, offsetSec: 6.8, radius: 34, visual: { core_intensity: 0.70, glow_radius: 0.52, glow_softness: 0.52, hue_shift: 0.16, blend_openness: 0.34, line_opacity: 0.66, line_stability: 0.72, line_tension: 0.40 }, semantic: { assertion: 0.72, defensiveness: 0.12, vulnerability: 0.22, repair: 0.32, control: 0.50, empathy: 0.36 }, overlapState: 'none', overlapWith: [] },
      { speaker: 'daniel', text: "I think we need to separate 'can we label it carefully' from 'is the experience responsible enough to ship.'", coords: { x: 1.2, y: -0.6, z: 4 }, offsetSec: 9.8, radius: 22, visual: { core_intensity: 0.46, glow_radius: 0.56, glow_softness: 0.68, hue_shift: 0.28, blend_openness: 0.72, line_opacity: 0.52, line_stability: 0.68, line_tension: 0.22 }, semantic: { assertion: 0.50, defensiveness: 0.06, vulnerability: 0.18, repair: 0.70, control: 0.26, empathy: 0.56 }, overlapState: 'contact_only', overlapWith: ['maya', 'nina', 'priya'] },
    ],
  },
  {
    turn: 6,
    lines: [
      { speaker: 'alex',   text: "If we cut real-time correction, the whole thing gets a lot safer. Live interruption is where the system feels smartest in demos, but also where it fails most visibly.", coords: { x: -0.8, y: -3.6, z: 5 }, offsetSec: 0.8, radius: 28, visual: { core_intensity: 0.58, glow_radius: 0.54, glow_softness: 0.60, hue_shift: 0.24, blend_openness: 0.54, line_opacity: 0.58, line_stability: 0.72, line_tension: 0.30 }, semantic: { assertion: 0.62, defensiveness: 0.14, vulnerability: 0.20, repair: 0.56, control: 0.40, empathy: 0.44 }, overlapState: 'contact_only', overlapWith: ['serena'] },
      { speaker: 'serena', text: "I actually agree. Live correction is impressive, but it also feels the most judgmental.", coords: { x: 2.8, y: 0.8, z: 5 }, offsetSec: 3.8, radius: 24, visual: { core_intensity: 0.54, glow_radius: 0.62, glow_softness: 0.70, hue_shift: 0.36, blend_openness: 0.64, line_opacity: 0.56, line_stability: 0.70, line_tension: 0.22 }, semantic: { assertion: 0.56, defensiveness: 0.08, vulnerability: 0.46, repair: 0.58, control: 0.16, empathy: 0.66 }, overlapState: 'contact_only', overlapWith: ['alex'] },
      { speaker: 'leo',    text: "It's also the most marketable part. If we remove that, are we weakening the hook too much?", coords: { x: -3.4, y: 4.0, z: 5 }, offsetSec: 6.8, radius: 36, visual: { core_intensity: 0.72, glow_radius: 0.42, glow_softness: 0.38, hue_shift: 0.08, blend_openness: 0.22, line_opacity: 0.70, line_stability: 0.60, line_tension: 0.46 }, semantic: { assertion: 0.76, defensiveness: 0.18, vulnerability: 0.14, repair: 0.14, control: 0.64, empathy: 0.18 }, overlapState: 'none', overlapWith: [] },
    ],
  },
  {
    turn: 7,
    lines: [
      { speaker: 'daniel', text: "Not necessarily. We could position the first release as 'conversation practice plus recap,' not 'instant speaking coach.'", coords: { x: 0.8, y: -0.1, z: 6 }, offsetSec: 0.8, radius: 26, visual: { core_intensity: 0.52, glow_radius: 0.58, glow_softness: 0.72, hue_shift: 0.32, blend_openness: 0.76, line_opacity: 0.54, line_stability: 0.68, line_tension: 0.18 }, semantic: { assertion: 0.54, defensiveness: 0.06, vulnerability: 0.20, repair: 0.78, control: 0.28, empathy: 0.62 }, overlapState: 'soft_merge', overlapWith: ['maya', 'priya'] },
      { speaker: 'maya',   text: "That makes sense to me if the recap still feels differentiated.", coords: { x: 0.4, y: 1.8, z: 6 }, offsetSec: 3.8, radius: 26, visual: { core_intensity: 0.56, glow_radius: 0.52, glow_softness: 0.58, hue_shift: 0.24, blend_openness: 0.52, line_opacity: 0.58, line_stability: 0.64, line_tension: 0.22 }, semantic: { assertion: 0.58, defensiveness: 0.14, vulnerability: 0.30, repair: 0.58, control: 0.36, empathy: 0.44 }, overlapState: 'soft_merge', overlapWith: ['daniel'] },
      { speaker: 'priya',  text: "I'd be much more comfortable with post-session reflection than constant in-the-moment correction.", coords: { x: 2.4, y: -1.8, z: 6 }, offsetSec: 6.8, radius: 24, visual: { core_intensity: 0.50, glow_radius: 0.56, glow_softness: 0.68, hue_shift: 0.28, blend_openness: 0.60, line_opacity: 0.52, line_stability: 0.70, line_tension: 0.18 }, semantic: { assertion: 0.52, defensiveness: 0.08, vulnerability: 0.28, repair: 0.70, control: 0.24, empathy: 0.54 }, overlapState: 'soft_merge', overlapWith: ['daniel'] },
    ],
  },
  {
    turn: 8,
    lines: [
      { speaker: 'leo',    text: "My concern is that we keep sanding it down until it sounds safe but unremarkable. We do need something people want to talk about.", coords: { x: -1.8, y: 2.8, z: 7 }, offsetSec: 0.8, radius: 30, visual: { core_intensity: 0.60, glow_radius: 0.46, glow_softness: 0.44, hue_shift: 0.12, blend_openness: 0.30, line_opacity: 0.62, line_stability: 0.62, line_tension: 0.36 }, semantic: { assertion: 0.64, defensiveness: 0.22, vulnerability: 0.20, repair: 0.22, control: 0.54, empathy: 0.26 }, overlapState: 'contact_only', overlapWith: ['serena'] },
      { speaker: 'alex',   text: "And my concern is that we launch something people talk about for the wrong reason.", coords: { x: 0.6, y: -2.4, z: 7 }, offsetSec: 3.8, radius: 22, visual: { core_intensity: 0.52, glow_radius: 0.52, glow_softness: 0.60, hue_shift: 0.20, blend_openness: 0.50, line_opacity: 0.54, line_stability: 0.70, line_tension: 0.28 }, semantic: { assertion: 0.56, defensiveness: 0.18, vulnerability: 0.22, repair: 0.40, control: 0.34, empathy: 0.44 }, overlapState: 'contact_only', overlapWith: ['serena'] },
      { speaker: 'serena', text: "There's probably a middle ground where the experience still feels alive, but doesn't overclaim competence.", coords: { x: 1.8, y: 1.0, z: 7 }, offsetSec: 6.8, radius: 24, visual: { core_intensity: 0.50, glow_radius: 0.64, glow_softness: 0.74, hue_shift: 0.42, blend_openness: 0.72, line_opacity: 0.52, line_stability: 0.70, line_tension: 0.16 }, semantic: { assertion: 0.52, defensiveness: 0.06, vulnerability: 0.38, repair: 0.72, control: 0.16, empathy: 0.70 }, overlapState: 'guided_alignment', overlapWith: ['leo', 'alex'] },
    ],
  },
  {
    turn: 9,
    lines: [
      { speaker: 'nina',   text: "If we do this, I want clear expectation-setting in the UI. Not buried in a help article—actually in the flow.", coords: { x: -1.4, y: -2.0, z: 8 }, offsetSec: 0.8, radius: 24, visual: { core_intensity: 0.48, glow_radius: 0.56, glow_softness: 0.64, hue_shift: 0.22, blend_openness: 0.58, line_opacity: 0.50, line_stability: 0.68, line_tension: 0.24 }, semantic: { assertion: 0.54, defensiveness: 0.10, vulnerability: 0.26, repair: 0.64, control: 0.36, empathy: 0.50 }, overlapState: 'soft_merge', overlapWith: ['daniel', 'alex'] },
      { speaker: 'daniel', text: "We can do that. We can constrain the first set of scenarios too—travel, ordering food, small talk—where the conversational patterns are more predictable.", coords: { x: 0.3, y: -0.1, z: 8 }, offsetSec: 3.8, radius: 22, visual: { core_intensity: 0.46, glow_radius: 0.58, glow_softness: 0.72, hue_shift: 0.30, blend_openness: 0.78, line_opacity: 0.50, line_stability: 0.70, line_tension: 0.14 }, semantic: { assertion: 0.48, defensiveness: 0.04, vulnerability: 0.18, repair: 0.82, control: 0.26, empathy: 0.64 }, overlapState: 'guided_alignment', overlapWith: ['nina', 'alex'] },
      { speaker: 'alex',   text: "That would help a lot. Narrower scenarios mean fewer edge cases and more stable performance.", coords: { x: 1.4, y: -1.8, z: 8 }, offsetSec: 6.8, radius: 20, visual: { core_intensity: 0.46, glow_radius: 0.54, glow_softness: 0.66, hue_shift: 0.22, blend_openness: 0.66, line_opacity: 0.50, line_stability: 0.72, line_tension: 0.14 }, semantic: { assertion: 0.48, defensiveness: 0.08, vulnerability: 0.18, repair: 0.74, control: 0.26, empathy: 0.56 }, overlapState: 'guided_alignment', overlapWith: ['nina', 'daniel'] },
    ],
  },
  {
    turn: 10,
    lines: [
      { speaker: 'maya',   text: "Okay, I think I'm hearing a path. We launch a clearly scoped first version next month: limited scenarios, no live correction, supportive recap afterward, and very explicit expectation-setting.", coords: { x: -0.2, y: 1.0, z: 9 }, offsetSec: 0.8, radius: 26, visual: { core_intensity: 0.46, glow_radius: 0.62, glow_softness: 0.72, hue_shift: 0.38, blend_openness: 0.72, line_opacity: 0.48, line_stability: 0.68, line_tension: 0.12 }, semantic: { assertion: 0.50, defensiveness: 0.06, vulnerability: 0.36, repair: 0.82, control: 0.28, empathy: 0.62 }, overlapState: 'soft_merge', overlapWith: ['leo', 'serena', 'daniel'] },
      { speaker: 'leo',    text: "I can live with that if we still frame it as a meaningful new speaking experience, not just a hidden experiment.", coords: { x: -0.8, y: 1.4, z: 9 }, offsetSec: 3.8, radius: 20, visual: { core_intensity: 0.40, glow_radius: 0.58, glow_softness: 0.70, hue_shift: 0.34, blend_openness: 0.68, line_opacity: 0.44, line_stability: 0.66, line_tension: 0.12 }, semantic: { assertion: 0.44, defensiveness: 0.14, vulnerability: 0.30, repair: 0.68, control: 0.26, empathy: 0.52 }, overlapState: 'soft_merge', overlapWith: ['maya', 'serena', 'daniel'] },
      { speaker: 'serena', text: "I'm on board if the tone stays encouraging and non-punitive.", coords: { x: 1.0, y: 0.8, z: 9 }, offsetSec: 6.8, radius: 18, visual: { core_intensity: 0.38, glow_radius: 0.62, glow_softness: 0.80, hue_shift: 0.44, blend_openness: 0.80, line_opacity: 0.42, line_stability: 0.68, line_tension: 0.08 }, semantic: { assertion: 0.38, defensiveness: 0.04, vulnerability: 0.40, repair: 0.84, control: 0.12, empathy: 0.76 }, overlapState: 'soft_merge', overlapWith: ['maya', 'leo', 'daniel'] },
      { speaker: 'daniel', text: "Great. Then the decision is not 'ship the full vision or wait.' It's 'ship the right first slice.'", coords: { x: 0.2, y: 0.0, z: 9 }, offsetSec: 9.8, radius: 22, visual: { core_intensity: 0.50, glow_radius: 0.56, glow_softness: 0.74, hue_shift: 0.34, blend_openness: 0.82, line_opacity: 0.52, line_stability: 0.68, line_tension: 0.10 }, semantic: { assertion: 0.52, defensiveness: 0.04, vulnerability: 0.22, repair: 0.90, control: 0.20, empathy: 0.72 }, overlapState: 'shared_field', overlapWith: ['maya', 'leo', 'serena'] },
    ],
  },
];

export const CONVERSATIONS: Record<number, Turn[]> = {
  1: TURNS_1,
  2: TURNS_2,
  3: TURNS_3,
  4: TURNS_4,
};

// Flatten to a single timeline
interface ScheduledLine extends TurnLine {
  id: number;            // globally unique
  absoluteSec: number;   // seconds from global start
}

function buildTimeline(turns: Turn[]): ScheduledLine[] {
  const timeline: ScheduledLine[] = [];
  let cursor   = 0;
  let globalId = 0;

  turns.forEach(turn => {
    const turnStart = cursor;
    turn.lines.forEach(line => {
      timeline.push({
        ...line,
        id:          ++globalId,
        absoluteSec: turnStart + line.offsetSec,
      });
    });
    const lastOffset = Math.max(...turn.lines.map(l => l.offsetSec));
    cursor = turnStart + lastOffset + 3.5;
  });

  return timeline;
}

// ── Speaker identity map ────────────────────────────────────────
const SPEAKER_META: Record<string, { label: string; color: string }> = {
  teen:   { label: 'Teen',   color: '#c05942' },
  mom:    { label: 'Mom',    color: '#5577a8' },
  dad:    { label: 'Dad',    color: '#6a8f6a' },
  a:      { label: 'A',      color: '#c47040' },
  b:      { label: 'B',      color: '#5a8fa5' },
  // Startup meeting
  maya:   { label: 'Maya',   color: '#c48030' },
  daniel: { label: 'Daniel', color: '#5a8a96' },
  serena: { label: 'Serena', color: '#9a6a8a' },
  alex:   { label: 'Alex',   color: '#4a6a9a' },
  priya:  { label: 'Priya',  color: '#6a8a5a' },
  leo:    { label: 'Leo',    color: '#c4603a' },
  nina:   { label: 'Nina',   color: '#a06458' },
};

// ── Transcript reveal speed ──────────────────────────────────────
// Words revealed per second — produces a speech-transcription pace.
const WORDS_PER_SEC = 3.8;

// ── Voice waveform bars ──────────────────────────────────────────
// 4 bars with staggered organic keyframe sequences
const WAVE_FRAMES = [
  [2, 9, 4, 12, 6],
  [7, 3, 11, 4, 8],
  [4, 11, 3, 9, 5],
  [10, 5, 8, 2, 10],
];

const VoiceWave: React.FC<{ color: string; isActive: boolean }> = ({ color, isActive }) => (
  <div className="flex items-end gap-[2.5px]" style={{ height: 14, width: 28, flexShrink: 0 }}>
    {WAVE_FRAMES.map((kf, i) => (
      <motion.div
        key={i}
        animate={isActive
          ? { height: kf.map(h => `${h}px`) }
          : { height: '2px' }
        }
        transition={isActive
          ? { duration: 0.6 + i * 0.08, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: i * 0.1 }
          : { duration: 0.4, ease: 'easeOut' }
        }
        style={{
          width: 2.5,
          background: color,
          borderRadius: 2,
          flexShrink: 0,
          opacity: isActive ? 0.65 : 0.2,
          transition: 'opacity 0.4s',
        }}
      />
    ))}
  </div>
);

// ── Component ───────────────────────────────────────────────────
interface ChatBubblesProps {
  onPlotPoint?: (p: PlotPoint) => void;
  onComplete?:  () => void;
  onRestart?:   () => void;
  /** When set, smoothly scrolls the bubble list to the matching turn. */
  scrollToTurnZ?: number | null;
  conversationId: number;
  /** When true: compact transcript panel positioned above the Replay Mode timeline. */
  replayMode?: boolean;
  /**
   * Replay Mode only: the currently active turn Z (from scrubbing / playback).
   * Active turn is fully visible; others are visually muted.
   */
  activeTurnZ?: number | null;
}

export const ChatBubbles: React.FC<ChatBubblesProps> = ({ onPlotPoint, onComplete, onRestart, scrollToTurnZ, conversationId, replayMode = false, activeTurnZ }) => {
  const turns    = useMemo(() => CONVERSATIONS[conversationId] ?? TURNS_2, [conversationId]);
  const TIMELINE = useMemo(() => buildTimeline(turns), [turns]);

  const [visible,        setVisible]        = useState<number[]>([]);
  const [isPaused,       setIsPaused]       = useState(false);
  const [isCompleted,    setIsCompleted]    = useState(false);
  const [revealedWords,  setRevealedWords]  = useState<Record<number, number>>({});
  /** ID of the line currently revealing its text (one at a time). */
  const [activeRevealId, setActiveRevealId] = useState<number | null>(null);
  /** Incremented whenever a line completes reveal — forces re-render from ref mutations. */
  const [revealVersion,  setRevealVersion]  = useState(0);

  const isPausedRef     = useRef(false);
  const startTimeRef    = useRef(Date.now());
  const pausedAtRef     = useRef<number | null>(null);
  const firedRef        = useRef<Set<number>>(new Set());
  const scrollRef       = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const completedRef    = useRef(false);

  // Sequential-reveal refs (read/written synchronously inside setInterval)
  const completedRevealRef   = useRef(new Set<number>()); // lines that finished revealing
  const interruptedRevealRef = useRef(new Set<number>()); // lines in interrupted-complete state
  const activeRevealRef      = useRef<number | null>(null); // currently revealing line ID
  const pendingQueueRef      = useRef<number[]>([]);        // arrived lines waiting for the queue
  const revealStartRef       = useRef<Record<number, number>>({}); // elapsed when each line started
  const queuedRef            = useRef(new Set<number>());   // lines already added to visible

  // Reset everything when conversation switches
  useEffect(() => {
    setVisible([]);
    setIsPaused(false);
    setIsCompleted(false);
    setRevealedWords({});
    setActiveRevealId(null);
    setRevealVersion(0);
    isPausedRef.current    = false;
    pausedAtRef.current    = null;
    startTimeRef.current   = Date.now();
    firedRef.current       = new Set();
    userScrolledRef.current = false;
    completedRef.current    = false;
    completedRevealRef.current.clear();
    interruptedRevealRef.current.clear();
    activeRevealRef.current = null;
    pendingQueueRef.current = [];
    revealStartRef.current  = {};
    queuedRef.current       = new Set();
  }, [conversationId]);

  useEffect(() => {
    const id = setInterval(() => {
      if (isPausedRef.current) return;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;

      // ── Step 1: Detect newly arrived lines ──────────────────────
      // A line "arrives" when its absoluteSec has passed and it hasn't been
      // queued yet.  Arrived lines may enter an immediate-reveal state (queue
      // free) or a pending "···" state (another line is currently revealing).
      const toQueue = TIMELINE.filter(
        l => elapsed >= l.absoluteSec && !queuedRef.current.has(l.id)
      );
      toQueue.forEach(l => queuedRef.current.add(l.id));

      if (toQueue.length > 0) {
        // Route: if the queue is free start immediately; if busy, hold silently.
        // A bubble is ONLY added to visible when the line becomes the active
        // revealer — never shown as a placeholder before its turn.
        const toEmit: typeof toQueue = [];
        const newlyActive: typeof toQueue = [];

        toQueue.forEach(l => {
          const queueFree =
            activeRevealRef.current === null ||
            completedRevealRef.current.has(activeRevealRef.current) ||
            interruptedRevealRef.current.has(activeRevealRef.current);

          if (queueFree) {
            activeRevealRef.current    = l.id;
            revealStartRef.current[l.id] = elapsed;
            setActiveRevealId(l.id);
            newlyActive.push(l);
            if (!l.noBroadcast) toEmit.push(l);
          } else {
            // Hold in queue; bubble appears only when this line becomes active
            pendingQueueRef.current.push(l.id);
          }
        });

        // Show bubbles only for lines that just became active
        if (newlyActive.length > 0) {
          setVisible(prev => {
            const next = [...prev];
            newlyActive.forEach(l => { if (!next.includes(l.id)) next.push(l.id); });
            return next.length !== prev.length ? next : prev;
          });
        }

        // Emit 3D plot points for lines that just became active
        toEmit.forEach(l => {
          firedRef.current.add(l.id);
          onPlotPoint?.({
            id: l.id, speaker: l.speaker,
            x: l.coords.x, y: l.coords.y, z: l.coords.z,
            radius: l.radius, visual: l.visual, semantic: l.semantic,
            overlapState: l.overlapState, overlapWith: l.overlapWith,
          });
        });
      }

      // ── Step 2: Advance word-reveal for the active line ──────────
      const activeId = activeRevealRef.current;
      if (
        activeId !== null &&
        !completedRevealRef.current.has(activeId) &&
        !interruptedRevealRef.current.has(activeId)
      ) {
        const activeLine = TIMELINE.find(l => l.id === activeId);
        if (activeLine) {
          const words      = activeLine.text.split(' ');
          const maxWords   = activeLine.interruptedAtWord ?? words.length;
          const sinceStart = elapsed - (revealStartRef.current[activeId] ?? elapsed);
          const wordCount  = Math.min(
            // +1 so the first word appears on the same tick the line becomes active
            Math.floor(sinceStart * WORDS_PER_SEC) + 1,
            maxWords
          );

          setRevealedWords(prev =>
            (prev[activeId] ?? 0) === wordCount ? prev : { ...prev, [activeId]: wordCount }
          );

          // Check completion
          if (wordCount >= maxWords) {
            if (activeLine.interruptType) {
              interruptedRevealRef.current.add(activeId);
            } else {
              completedRevealRef.current.add(activeId);
            }
            setRevealVersion(v => v + 1);

            // Advance to the next line in the pending queue
            if (pendingQueueRef.current.length > 0) {
              const nextId   = pendingQueueRef.current.shift()!;
              const nextLine = TIMELINE.find(l => l.id === nextId);
              activeRevealRef.current      = nextId;
              revealStartRef.current[nextId] = elapsed;
              setActiveRevealId(nextId);

              // This line was queued but never added to visible — show it now
              setVisible(prev => prev.includes(nextId) ? prev : [...prev, nextId]);

              // Emit 3D plot point for the newly-activated line (skip continuations)
              if (nextLine && !nextLine.noBroadcast && !firedRef.current.has(nextId)) {
                firedRef.current.add(nextId);
                onPlotPoint?.({
                  id: nextLine.id, speaker: nextLine.speaker,
                  x: nextLine.coords.x, y: nextLine.coords.y, z: nextLine.coords.z,
                  radius: nextLine.radius, visual: nextLine.visual, semantic: nextLine.semantic,
                  overlapState: nextLine.overlapState, overlapWith: nextLine.overlapWith,
                });
              }
            } else {
              activeRevealRef.current = null;
              setActiveRevealId(null);
            }
          }
        }
      }
    }, 100);
    return () => clearInterval(id);
  }, [onPlotPoint, conversationId]);

  const handlePause = () => {
    isPausedRef.current = true;
    pausedAtRef.current = Date.now();
    setIsPaused(true);
  };

  const handleResume = () => {
    if (pausedAtRef.current !== null) {
      startTimeRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current   = null;
    }
    isPausedRef.current = false;
    setIsPaused(false);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || userScrolledRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [visible]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
      userScrolledRef.current = !atBottom;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const visibleLines = TIMELINE.filter(l => visible.includes(l.id));

  // Fire onComplete once every line has finished revealing (not just appeared)
  useEffect(() => {
    if (
      TIMELINE.length > 0 &&
      completedRevealRef.current.size + interruptedRevealRef.current.size >= TIMELINE.length &&
      !completedRef.current
    ) {
      completedRef.current = true;
      setIsCompleted(true);
      const t = setTimeout(() => onComplete?.(), 1400);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealVersion]);

  // ── Scroll to turn on timeline hover (live mode) or active turn (replay mode) ──
  const scrollTarget = replayMode
    ? (scrollToTurnZ ?? activeTurnZ ?? null)
    : scrollToTurnZ;

  useEffect(() => {
    if (scrollTarget === null || scrollTarget === undefined) return;
    const el = scrollRef.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>(`[data-turn-z="${scrollTarget}"]`);
    if (!target) return;
    const relTop = target.offsetTop - (el.offsetTop ?? 0);
    el.scrollTo({ top: relTop - 24, behavior: 'smooth' });
  }, [scrollTarget, replayMode]);

  // ── Derived rendering values ─────────────────────────────────
  // isAnyTyping: true while a line is actively revealing its words.
  const isAnyTyping = activeRevealId !== null;

  const activeColor = (() => {
    const id = activeRevealId ?? (visible.length > 0 ? visible[visible.length - 1] : null);
    if (id === null) return '#aaaaaa';
    const line = TIMELINE.find(l => l.id === id);
    return line ? (SPEAKER_META[line.speaker]?.color ?? '#aaaaaa') : '#aaaaaa';
  })();

  return (
    <div
      className="absolute left-8 flex flex-col gap-0"
      style={{
        fontFamily: "var(--font-body)",
        bottom: replayMode ? '176px' : '32px',
        width: replayMode ? '420px' : '560px',
        transition: 'bottom 0.7s cubic-bezier(0.22, 1, 0.36, 1), width 0.5s ease',
      }}
    >
      {/* Scrolling bubble area */}
      <div
        ref={scrollRef}
        className="flex flex-col overflow-y-auto pointer-events-auto"
        style={{
          gap: 28,
          maxHeight: replayMode ? '38vh' : '56vh',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 22%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 22%)',
          scrollbarWidth: 'none',
          opacity: replayMode ? 0.7 : 1,
          paddingBottom: '6px',
          transition: 'max-height 0.5s ease, opacity 0.5s ease',
        }}
      >
        {turns.map((turn) => {
          const turnLines = TIMELINE.filter(
            l => turn.lines.some(tl => tl.text === l.text && tl.speaker === l.speaker)
          );
          const anyVisible = turnLines.some(l => visible.includes(l.id));
          if (!anyVisible) return null;

          // ── Replay emphasis: active turn full, others muted ──
          const turnZ      = turn.turn - 1;
          const isActiveTurn = replayMode && activeTurnZ !== null && activeTurnZ !== undefined && turnZ === activeTurnZ;
          const isPastTurn   = replayMode && activeTurnZ !== null && activeTurnZ !== undefined && turnZ < activeTurnZ;
          const turnOpacity =
            !replayMode                        ? 1.0
            : activeTurnZ === null || activeTurnZ === undefined ? 0.72
            : isActiveTurn                     ? 1.0
            : isPastTurn                       ? 0.45
            :                                    0.30;

          return (
            <motion.div
              key={turn.turn}
              data-turn-z={turn.turn - 1}
              initial={{ opacity: 0 }}
              animate={{ opacity: turnOpacity }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="flex flex-col"
              style={{
                gap: 20,
                borderLeft: isActiveTurn ? '2px solid rgba(0,0,0,0.07)' : '2px solid transparent',
                paddingLeft: isActiveTurn ? '8px' : '0px',
                marginLeft: isActiveTurn ? '-10px' : '0px',
                transition: 'border-color 0.35s ease, padding-left 0.35s ease, margin-left 0.35s ease',
              }}
            >
              <div style={{ maxWidth: 'min(30vw, 560px)' }}>
                <div className="flex items-center gap-2">
                  <div className="h-[1px] w-4 bg-neutral-200/60" />
                  <span
                    className="uppercase text-neutral-400"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      opacity: 0.6,
                    }}
                  >
                    Turn {turn.turn}
                  </span>
                  <div className="flex-1 h-[1px] bg-neutral-200/60" />
                </div>
              </div>

              {turnLines.map(line => {
                if (!visible.includes(line.id)) return null;

                // ── Per-line state flags ──────────────────────────────
                const isActiveReveal    = !replayMode && line.id === activeRevealId;
                const isCompletedReveal =
                  completedRevealRef.current.has(line.id) ||
                  interruptedRevealRef.current.has(line.id);
                const isInterruptedLine = !replayMode && interruptedRevealRef.current.has(line.id);
                // Gentle breathing pulse on the very last completed bubble when idle
                const shouldBreathe    = !replayMode && !isAnyTyping &&
                                         line.id === visible[visible.length - 1] &&
                                         isCompletedReveal;

                // ── Text computation ──────────────────────────────────
                const words      = line.text.split(' ');
                const revCount   = revealedWords[line.id] ?? 0;
                const maxReveal  = line.interruptedAtWord ?? words.length;
                const displayText = replayMode
                  ? line.text
                  : words.slice(0, Math.min(revCount, maxReveal)).join(' ');
                const speakerColor = SPEAKER_META[line.speaker]?.color ?? '#888';

                return (
                  <motion.div
                    key={line.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.38, ease: 'easeOut' }}
                    className="flex items-start"
                    style={{ gap: 12 }}
                  >
                    {/* Speaker dot */}
                    <div
                      className="rounded-full flex-shrink-0"
                      style={{
                        width: 7,
                        height: 7,
                        marginTop: 7,
                        background: speakerColor,
                      }}
                    />

                    {/* message-group: speaker + bubble share the same left edge */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 6,
                        minWidth: 0,
                      }}
                    >
                      {/* Speaker label */}
                      <span
                        style={{
                          color: speakerColor,
                          fontSize: 14,
                          fontWeight: 400,
                          letterSpacing: '0.02em',
                          opacity: 0.8,
                          fontFamily: 'var(--font-body)',
                          lineHeight: 1,
                        }}
                      >
                        {line.isContinuation && (
                          <span style={{ opacity: 0.45, marginRight: 5, fontWeight: 400 }}>↳</span>
                        )}
                        {SPEAKER_META[line.speaker]?.label ?? line.speaker}
                      </span>

                      {/* Bubble card — shrinks to text width, wraps at max-width */}
                      <motion.div
                        animate={shouldBreathe ? { scale: [1, 1.003, 1] } : { scale: 1 }}
                        transition={
                          shouldBreathe
                            ? { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
                            : { duration: 0.3 }
                        }
                        style={{
                          display: 'inline-block',
                          width: 'fit-content',
                          maxWidth: 'min(30vw, 560px)',
                          fontFamily: 'var(--font-body)',
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: 'rgb(64 64 64)',
                          padding: '10px 16px',
                          borderRadius: 18,
                          borderTopLeftRadius: 4,
                          background:
                            isActiveReveal
                              ? 'rgba(255,255,255,0.99)'
                              : shouldBreathe
                              ? 'rgba(255,255,255,0.96)'
                              : 'rgba(255,255,255,0.88)',
                          border:
                            isActiveReveal
                              ? `1px solid ${speakerColor}22`
                              : shouldBreathe
                              ? `1px solid ${speakerColor}16`
                              : '1px solid rgba(0,0,0,0.06)',
                          boxShadow:
                            isActiveReveal
                              ? `0 2px 14px ${speakerColor}14`
                              : shouldBreathe
                              ? `0 1px 8px ${speakerColor}0d`
                              : '0 1px 3px rgba(0,0,0,0.04)',
                          minHeight: isActiveReveal ? '2.6rem' : 'auto',
                          transition: 'background 0.4s, border-color 0.45s, box-shadow 0.45s',
                        }}
                      >
                        {displayText}
                        {/* Interruption marker on lines cut short */}
                        {isInterruptedLine && (
                          <span style={{ opacity: 0.22, marginLeft: 4, fontWeight: 400 }}>—</span>
                        )}
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          );
        })}
      </div>

      {/* ── Unified voice + control strip (Live Mode only) ─────── */}
      {!replayMode && (
        <motion.div
          className="pointer-events-auto mt-2.5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.7, ease: 'easeOut' }}
        >
          {/* Message-width wrapper — same constraints as a bubble card */}
          <div
            style={{
              display: 'inline-block',
              width: 'fit-content',
              maxWidth: 'min(30vw, 560px)',
            }}
          >
          <div
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl"
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.92)',
              border: `1px solid ${activeColor}1a`,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: `0 1px 10px ${activeColor}0d`,
              transition: 'border-color 0.5s ease, box-shadow 0.5s ease',
            }}
          >
            {/* Animated voice waveform */}
            <VoiceWave color={activeColor} isActive={isAnyTyping && !isPaused} />

            {/* Connector line — colored by active speaker */}
            <div
              className="flex-1 h-px"
              style={{ background: `${activeColor}20`, transition: 'background 0.5s' }}
            />

            {/* Playback control */}
            <button
              onClick={
                isCompleted
                  ? () => onRestart?.()
                  : isPaused ? handleResume : handlePause
              }
              className="flex items-center gap-1.5 cursor-pointer"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: isPaused || isCompleted ? activeColor : '#b8b8b8',
                transition: 'color 0.35s',
              }}
            >
              <AnimatePresence mode="wait">
                {isCompleted ? (
                  <motion.span
                    key="done"
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-1.5"
                  >
                    <Play className="w-2 h-2" />
                    Restart
                  </motion.span>
                ) : isPaused ? (
                  <motion.span
                    key="paused"
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-1.5"
                  >
                    <Play className="w-2 h-2" />
                    Resume
                  </motion.span>
                ) : (
                  <motion.span
                    key="playing"
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-1.5"
                  >
                    <Pause className="w-2 h-2" />
                    Pause
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
          </div>{/* end message-width wrapper */}
        </motion.div>
      )}
    </div>
  );
};
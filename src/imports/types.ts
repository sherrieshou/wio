Please make the following changes across two files to wire semantic_factors and overlap_state into the visual system.

---

# FILE 1: `src/app/types.ts`

## Change 1: Add SemanticFactors and OverlapState to the type definitions

Find:
```
export interface VisualParams {
  core_intensity: number;   // 0–1  core dot opacity/brightness
  glow_radius:    number;   // 0–1  glow sprite scale multiplier
  glow_softness:  number;   // 0–1  glow texture softness
  hue_shift:      number;   // 0–1  color shift toward blend palette
  blend_openness: number;   // 0–1  openness to blending with neighbors
  line_opacity:   number;   // 0–1  trajectory line opacity
  line_stability: number;   // 0–1  trajectory smoothness
  line_tension:   number;   // 0–1  tension in cross-band connections
}

export interface PlotPoint {
  id: number;
  speaker: 'teen' | 'mom' | 'dad';
  x: number;
  y: number;
  z: number;
  radius?: number;
  visual?: VisualParams;
}
```

Replace with:
```
export interface VisualParams {
  core_intensity: number;   // 0–1  core dot opacity/brightness
  glow_radius:    number;   // 0–1  glow sprite scale multiplier
  glow_softness:  number;   // 0–1  glow texture softness
  hue_shift:      number;   // 0–1  color shift toward blend palette
  blend_openness: number;   // 0–1  openness to blending with neighbors
  line_opacity:   number;   // 0–1  trajectory line opacity
  line_stability: number;   // 0–1  trajectory smoothness
  line_tension:   number;   // 0–1  tension in cross-band connections
}

export interface SemanticFactors {
  assertion:    number;   // 0–1  directness of claim-making
  defensiveness: number;  // 0–1  resistance / self-protection
  vulnerability: number;  // 0–1  emotional exposure / openness
  repair:       number;   // 0–1  active attempt to fix tension
  control:      number;   // 0–1  attempt to direct outcome
  empathy:      number;   // 0–1  recognition of other's experience
}

export type OverlapState =
  | 'none'
  | 'contact_only'
  | 'soft_merge'
  | 'guided_alignment'
  | 'tense_collision'
  | 'shared_field';

export interface PlotPoint {
  id: number;
  speaker: 'teen' | 'mom' | 'dad';
  x: number;
  y: number;
  z: number;
  radius?: number;
  visual?: VisualParams;
  semantic?: SemanticFactors;
  overlapState?: OverlapState;
  overlapWith?: string[];
}
```

---

# FILE 2: `src/app/components/chat-bubbles.tsx`

## Change 2: Add semantic and overlapState fields to TurnLine interface

Find:
```
interface TurnLine {
  speaker: 'teen' | 'mom' | 'dad';
  text: string;
  coords: { x: number; y: number; z: number };
  /** seconds after the turn's local clock starts before this line appears */
  offsetSec: number;
  /** emotional intensity radius — controls halo pulse range */
  radius: number;
  /** Optional per-utterance visual parameters (from semantic model) */
  visual?: VisualParams;
}
```

Replace with:
```
interface TurnLine {
  speaker: 'teen' | 'mom' | 'dad';
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
}
```

## Change 3: Add import for new types at the top of chat-bubbles.tsx

Find:
```
import { PlotPoint, VisualParams } from '../types';
```

Replace with:
```
import { PlotPoint, VisualParams, SemanticFactors, OverlapState } from '../types';
```

## Change 4: Add semantic and overlapState data to TURNS_2 lines

Find the TURNS_2 array first line definition:
```
      { speaker: 'teen', text: "Mom, I want to go camping this weekend with my friends. We already picked the site. It's just one night.", coords: { x: 4, y: -2, z: 0 }, offsetSec: 0.8, radius: 18, visual: { core_intensity: 0.74, glow_radius: 0.36, glow_softness: 0.42, hue_shift: 0.08, blend_openness: 0.20, line_opacity: 0.74, line_stability: 0.70, line_tension: 0.24 } },
      { speaker: 'mom',  text: "I really don't love the idea. A group of teenagers going without adults makes me nervous.", coords: { x: -4, y: 0, z: 0 }, offsetSec: 4.0, radius: 28, visual: { core_intensity: 0.72, glow_radius: 0.50, glow_softness: 0.50, hue_shift: 0.06, blend_openness: 0.22, line_opacity: 0.66, line_stability: 0.74, line_tension: 0.52 } },
```

Replace with:
```
      { speaker: 'teen', text: "Mom, I want to go camping this weekend with my friends. We already picked the site. It's just one night.", coords: { x: 4, y: -2, z: 0 }, offsetSec: 0.8, radius: 18, visual: { core_intensity: 0.74, glow_radius: 0.36, glow_softness: 0.42, hue_shift: 0.08, blend_openness: 0.20, line_opacity: 0.74, line_stability: 0.70, line_tension: 0.24 }, semantic: { assertion: 0.82, defensiveness: 0.08, vulnerability: 0.16, repair: 0.18, control: 0.12, empathy: 0.10 }, overlapState: 'none', overlapWith: [] },
      { speaker: 'mom',  text: "I really don't love the idea. A group of teenagers going without adults makes me nervous.", coords: { x: -4, y: 0, z: 0 }, offsetSec: 4.0, radius: 28, visual: { core_intensity: 0.72, glow_radius: 0.50, glow_softness: 0.50, hue_shift: 0.06, blend_openness: 0.22, line_opacity: 0.66, line_stability: 0.74, line_tension: 0.52 }, semantic: { assertion: 0.68, defensiveness: 0.22, vulnerability: 0.48, repair: 0.12, control: 0.66, empathy: 0.18 }, overlapState: 'none', overlapWith: [] },
```

Find:
```
      { speaker: 'teen', text: "I get why you're worried, but it's an actual campground, not just random woods. There are staff there, and we'll have cell service.", coords: { x: 3, y: -3, z: 1 }, offsetSec: 0.8, radius: 20, visual: { core_intensity: 0.58, glow_radius: 0.48, glow_softness: 0.60, hue_shift: 0.36, blend_openness: 0.58, line_opacity: 0.62, line_stability: 0.68, line_tension: 0.22 } },
      { speaker: 'dad',  text: "Okay, slow down. Who exactly is going, and how are you getting there?", coords: { x: -1, y: -3, z: 1 }, offsetSec: 4.5, radius: 15, visual: { core_intensity: 0.46, glow_radius: 0.40, glow_softness: 0.56, hue_shift: 0.16, blend_openness: 0.42, line_opacity: 0.50, line_stability: 0.62, line_tension: 0.24 } },
```

Replace with:
```
      { speaker: 'teen', text: "I get why you're worried, but it's an actual campground, not just random woods. There are staff there, and we'll have cell service.", coords: { x: 3, y: -3, z: 1 }, offsetSec: 0.8, radius: 20, visual: { core_intensity: 0.58, glow_radius: 0.48, glow_softness: 0.60, hue_shift: 0.36, blend_openness: 0.58, line_opacity: 0.62, line_stability: 0.68, line_tension: 0.22 }, semantic: { assertion: 0.64, defensiveness: 0.34, vulnerability: 0.20, repair: 0.54, control: 0.10, empathy: 0.62 }, overlapState: 'contact_only', overlapWith: ['mom'] },
      { speaker: 'dad',  text: "Okay, slow down. Who exactly is going, and how are you getting there?", coords: { x: -1, y: -3, z: 1 }, offsetSec: 4.5, radius: 15, visual: { core_intensity: 0.46, glow_radius: 0.40, glow_softness: 0.56, hue_shift: 0.16, blend_openness: 0.42, line_opacity: 0.50, line_stability: 0.62, line_tension: 0.24 }, semantic: { assertion: 0.42, defensiveness: 0.08, vulnerability: 0.14, repair: 0.46, control: 0.42, empathy: 0.34 }, overlapState: 'guided_alignment', overlapWith: ['teen'] },
```

Find:
```
      { speaker: 'teen', text: "Me, Evan, Lucas, and Maya. Evan's older sister is driving us there, and her mom knows the plan.", coords: { x: 2, y: -3, z: 2 }, offsetSec: 0.8, radius: 16, visual: { core_intensity: 0.50, glow_radius: 0.48, glow_softness: 0.62, hue_shift: 0.22, blend_openness: 0.56, line_opacity: 0.56, line_stability: 0.66, line_tension: 0.18 } },
      { speaker: 'mom',  text: "That's better than I thought, but I still don't like that no parent is staying overnight.", coords: { x: -3, y: -1, z: 2 }, offsetSec: 4.5, radius: 24, visual: { core_intensity: 0.62, glow_radius: 0.42, glow_softness: 0.48, hue_shift: 0.12, blend_openness: 0.30, line_opacity: 0.58, line_stability: 0.68, line_tension: 0.40 } },
```

Replace with:
```
      { speaker: 'teen', text: "Me, Evan, Lucas, and Maya. Evan's older sister is driving us there, and her mom knows the plan.", coords: { x: 2, y: -3, z: 2 }, offsetSec: 0.8, radius: 16, visual: { core_intensity: 0.50, glow_radius: 0.48, glow_softness: 0.62, hue_shift: 0.22, blend_openness: 0.56, line_opacity: 0.56, line_stability: 0.66, line_tension: 0.18 }, semantic: { assertion: 0.56, defensiveness: 0.18, vulnerability: 0.18, repair: 0.62, control: 0.06, empathy: 0.42 }, overlapState: 'soft_merge', overlapWith: ['dad'] },
      { speaker: 'mom',  text: "That's better than I thought, but I still don't like that no parent is staying overnight.", coords: { x: -3, y: -1, z: 2 }, offsetSec: 4.5, radius: 24, visual: { core_intensity: 0.62, glow_radius: 0.42, glow_softness: 0.48, hue_shift: 0.12, blend_openness: 0.30, line_opacity: 0.58, line_stability: 0.68, line_tension: 0.40 }, semantic: { assertion: 0.58, defensiveness: 0.18, vulnerability: 0.34, repair: 0.32, control: 0.58, empathy: 0.26 }, overlapState: 'contact_only', overlapWith: ['teen'] },
```

Find:
```
      { speaker: 'teen', text: "I know, but we're not trying to do anything reckless. I can send you the campsite link, our schedule, and everyone's numbers.", coords: { x: 2, y: -4, z: 3 }, offsetSec: 0.8, radius: 22, visual: { core_intensity: 0.48, glow_radius: 0.62, glow_softness: 0.72, hue_shift: 0.40, blend_openness: 0.70, line_opacity: 0.54, line_stability: 0.70, line_tension: 0.16 } },
      { speaker: 'dad',  text: "That actually helps. If we had the location and contact info, I'd feel a lot better.", coords: { x: 0, y: -4, z: 3 }, offsetSec: 4.5, radius: 20, visual: { core_intensity: 0.38, glow_radius: 0.68, glow_softness: 0.78, hue_shift: 0.34, blend_openness: 0.76, line_opacity: 0.44, line_stability: 0.60, line_tension: 0.12 } },
```

Replace with:
```
      { speaker: 'teen', text: "I know, but we're not trying to do anything reckless. I can send you the campsite link, our schedule, and everyone's numbers.", coords: { x: 2, y: -4, z: 3 }, offsetSec: 0.8, radius: 22, visual: { core_intensity: 0.48, glow_radius: 0.62, glow_softness: 0.72, hue_shift: 0.40, blend_openness: 0.70, line_opacity: 0.54, line_stability: 0.70, line_tension: 0.16 }, semantic: { assertion: 0.52, defensiveness: 0.42, vulnerability: 0.28, repair: 0.76, control: 0.08, empathy: 0.64 }, overlapState: 'soft_merge', overlapWith: ['dad', 'mom'] },
      { speaker: 'dad',  text: "That actually helps. If we had the location and contact info, I'd feel a lot better.", coords: { x: 0, y: -4, z: 3 }, offsetSec: 4.5, radius: 20, visual: { core_intensity: 0.38, glow_radius: 0.68, glow_softness: 0.78, hue_shift: 0.34, blend_openness: 0.76, line_opacity: 0.44, line_stability: 0.60, line_tension: 0.12 }, semantic: { assertion: 0.34, defensiveness: 0.06, vulnerability: 0.44, repair: 0.72, control: 0.26, empathy: 0.58 }, overlapState: 'guided_alignment', overlapWith: ['teen'] },
```

Find:
```
      { speaker: 'mom',  text: "My issue isn't that I think you're irresponsible. I'm thinking about weather, driving at night, and what happens if someone makes a dumb decision.", coords: { x: -3, y: -1, z: 4 }, offsetSec: 0.8, radius: 36, visual: { core_intensity: 0.64, glow_radius: 0.56, glow_softness: 0.62, hue_shift: 0.18, blend_openness: 0.42, line_opacity: 0.60, line_stability: 0.72, line_tension: 0.34 } },
      { speaker: 'teen', text: "That's fair. We can leave before dark, and I can check the weather with you tonight if you want.", coords: { x: 1, y: -3, z: 4 }, offsetSec: 4.5, radius: 26, visual: { core_intensity: 0.38, glow_radius: 0.74, glow_softness: 0.84, hue_shift: 0.48, blend_openness: 0.86, line_opacity: 0.46, line_stability: 0.66, line_tension: 0.08 } },
```

Replace with:
```
      { speaker: 'mom',  text: "My issue isn't that I think you're irresponsible. I'm thinking about weather, driving at night, and what happens if someone makes a dumb decision.", coords: { x: -3, y: -1, z: 4 }, offsetSec: 0.8, radius: 36, visual: { core_intensity: 0.64, glow_radius: 0.56, glow_softness: 0.62, hue_shift: 0.18, blend_openness: 0.42, line_opacity: 0.60, line_stability: 0.72, line_tension: 0.34 }, semantic: { assertion: 0.62, defensiveness: 0.18, vulnerability: 0.52, repair: 0.44, control: 0.54, empathy: 0.34 }, overlapState: 'contact_only', overlapWith: ['dad'] },
      { speaker: 'teen', text: "That's fair. We can leave before dark, and I can check the weather with you tonight if you want.", coords: { x: 1, y: -3, z: 4 }, offsetSec: 4.5, radius: 26, visual: { core_intensity: 0.38, glow_radius: 0.74, glow_softness: 0.84, hue_shift: 0.48, blend_openness: 0.86, line_opacity: 0.46, line_stability: 0.66, line_tension: 0.08 }, semantic: { assertion: 0.42, defensiveness: 0.08, vulnerability: 0.30, repair: 0.84, control: 0.08, empathy: 0.74 }, overlapState: 'soft_merge', overlapWith: ['mom'] },
```

Find:
```
      { speaker: 'dad', text: "See, that's the kind of stuff we need to hear.", coords: { x: 1, y: -3, z: 5 }, offsetSec: 0.8, radius: 16, visual: { core_intensity: 0.40, glow_radius: 0.54, glow_softness: 0.72, hue_shift: 0.26, blend_openness: 0.68, line_opacity: 0.46, line_stability: 0.64, line_tension: 0.10 } },
      { speaker: 'mom', text: "I'm still uneasy. I don't want this to turn into one of those situations where everyone says 'it'll be fine' and then nobody has a plan.", coords: { x: -3, y: 0, z: 5 }, offsetSec: 3.5, radius: 34, visual: { core_intensity: 0.64, glow_radius: 0.50, glow_softness: 0.54, hue_shift: 0.10, blend_openness: 0.28, line_opacity: 0.58, line_stability: 0.74, line_tension: 0.48 } },
```

Replace with:
```
      { speaker: 'dad', text: "See, that's the kind of stuff we need to hear.", coords: { x: 1, y: -3, z: 5 }, offsetSec: 0.8, radius: 16, visual: { core_intensity: 0.40, glow_radius: 0.54, glow_softness: 0.72, hue_shift: 0.26, blend_openness: 0.68, line_opacity: 0.46, line_stability: 0.64, line_tension: 0.10 }, semantic: { assertion: 0.40, defensiveness: 0.04, vulnerability: 0.16, repair: 0.68, control: 0.22, empathy: 0.46 }, overlapState: 'guided_alignment', overlapWith: ['teen', 'mom'] },
      { speaker: 'mom', text: "I'm still uneasy. I don't want this to turn into one of those situations where everyone says 'it'll be fine' and then nobody has a plan.", coords: { x: -3, y: 0, z: 5 }, offsetSec: 3.5, radius: 34, visual: { core_intensity: 0.64, glow_radius: 0.50, glow_softness: 0.54, hue_shift: 0.10, blend_openness: 0.28, line_opacity: 0.58, line_stability: 0.74, line_tension: 0.48 }, semantic: { assertion: 0.56, defensiveness: 0.14, vulnerability: 0.58, repair: 0.28, control: 0.62, empathy: 0.20 }, overlapState: 'tense_collision', overlapWith: ['teen', 'dad'] },
```

Find:
```
      { speaker: 'teen', text: "Okay, then let's make an actual plan. I can share my location, text when we get there, and call before lights out. If anything changes, you pick me up.", coords: { x: 1, y: -4, z: 6 }, offsetSec: 0.8, radius: 32, visual: { core_intensity: 0.42, glow_radius: 0.82, glow_softness: 0.90, hue_shift: 0.54, blend_openness: 0.92, line_opacity: 0.48, line_stability: 0.72, line_tension: 0.06 } },
      { speaker: 'dad',  text: "That sounds reasonable.", coords: { x: 1, y: -3, z: 6 }, offsetSec: 4.5, radius: 12, visual: { core_intensity: 0.24, glow_radius: 0.52, glow_softness: 0.76, hue_shift: 0.28, blend_openness: 0.70, line_opacity: 0.30, line_stability: 0.58, line_tension: 0.04 } },
      { speaker: 'mom',  text: "Maybe. I just need to know you understand why this is a big deal to me.", coords: { x: -2, y: -1, z: 6 }, offsetSec: 6.5, radius: 38, visual: { core_intensity: 0.48, glow_radius: 0.72, glow_softness: 0.82, hue_shift: 0.16, blend_openness: 0.52, line_opacity: 0.46, line_stability: 0.60, line_tension: 0.22 } },
```

Replace with:
```
      { speaker: 'teen', text: "Okay, then let's make an actual plan. I can share my location, text when we get there, and call before lights out. If anything changes, you pick me up.", coords: { x: 1, y: -4, z: 6 }, offsetSec: 0.8, radius: 32, visual: { core_intensity: 0.42, glow_radius: 0.82, glow_softness: 0.90, hue_shift: 0.54, blend_openness: 0.92, line_opacity: 0.48, line_stability: 0.72, line_tension: 0.06 }, semantic: { assertion: 0.48, defensiveness: 0.06, vulnerability: 0.40, repair: 0.92, control: 0.10, empathy: 0.80 }, overlapState: 'soft_merge', overlapWith: ['mom', 'dad'] },
      { speaker: 'dad',  text: "That sounds reasonable.", coords: { x: 1, y: -3, z: 6 }, offsetSec: 4.5, radius: 12, visual: { core_intensity: 0.24, glow_radius: 0.52, glow_softness: 0.76, hue_shift: 0.28, blend_openness: 0.70, line_opacity: 0.30, line_stability: 0.58, line_tension: 0.04 }, semantic: { assertion: 0.24, defensiveness: 0.02, vulnerability: 0.14, repair: 0.62, control: 0.08, empathy: 0.50 }, overlapState: 'guided_alignment', overlapWith: ['teen'] },
      { speaker: 'mom',  text: "Maybe. I just need to know you understand why this is a big deal to me.", coords: { x: -2, y: -1, z: 6 }, offsetSec: 6.5, radius: 38, visual: { core_intensity: 0.48, glow_radius: 0.72, glow_softness: 0.82, hue_shift: 0.16, blend_openness: 0.52, line_opacity: 0.46, line_stability: 0.60, line_tension: 0.22 }, semantic: { assertion: 0.46, defensiveness: 0.08, vulnerability: 0.72, repair: 0.46, control: 0.36, empathy: 0.30 }, overlapState: 'contact_only', overlapWith: ['teen'] },
```

Find:
```
      { speaker: 'teen', text: "I do. I know you're not just trying to control me. I know you're worried something could go wrong. I just want a chance to prove I can handle something like this.", coords: { x: 1, y: -5, z: 7 }, offsetSec: 0.8, radius: 42, visual: { core_intensity: 0.34, glow_radius: 0.94, glow_softness: 0.98, hue_shift: 0.72, blend_openness: 0.98, line_opacity: 0.42, line_stability: 0.74, line_tension: 0.02 } },
      { speaker: 'mom',  text: "…Okay. That's different from how you were saying it before.", coords: { x: -1, y: -3, z: 7 }, offsetSec: 5.0, radius: 35, visual: { core_intensity: 0.22, glow_radius: 0.74, glow_softness: 0.88, hue_shift: 0.38, blend_openness: 0.82, line_opacity: 0.32, line_stability: 0.54, line_tension: 0.06 } },
```

Replace with:
```
      { speaker: 'teen', text: "I do. I know you're not just trying to control me. I know you're worried something could go wrong. I just want a chance to prove I can handle something like this.", coords: { x: 1, y: -5, z: 7 }, offsetSec: 0.8, radius: 42, visual: { core_intensity: 0.34, glow_radius: 0.94, glow_softness: 0.98, hue_shift: 0.72, blend_openness: 0.98, line_opacity: 0.42, line_stability: 0.74, line_tension: 0.02 }, semantic: { assertion: 0.38, defensiveness: 0.04, vulnerability: 0.78, repair: 0.96, control: 0.02, empathy: 0.96 }, overlapState: 'soft_merge', overlapWith: ['mom'] },
      { speaker: 'mom',  text: "…Okay. That's different from how you were saying it before.", coords: { x: -1, y: -3, z: 7 }, offsetSec: 5.0, radius: 35, visual: { core_intensity: 0.22, glow_radius: 0.74, glow_softness: 0.88, hue_shift: 0.38, blend_openness: 0.82, line_opacity: 0.32, line_stability: 0.54, line_tension: 0.06 }, semantic: { assertion: 0.22, defensiveness: 0.06, vulnerability: 0.52, repair: 0.74, control: 0.12, empathy: 0.58 }, overlapState: 'soft_merge', overlapWith: ['teen'] },
```

Find:
```
      { speaker: 'dad',  text: "What if we make this a trial run? One night only, no changing locations, and if they don't stick to the plan, no more trips like this for a while.", coords: { x: 0, y: -4, z: 8 }, offsetSec: 0.8, radius: 28, visual: { core_intensity: 0.60, glow_radius: 0.62, glow_softness: 0.74, hue_shift: 0.32, blend_openness: 0.70, line_opacity: 0.58, line_stability: 0.82, line_tension: 0.18 } },
      { speaker: 'teen', text: "That's fair. I can do that.", coords: { x: 1, y: -4, z: 8 }, offsetSec: 4.5, radius: 16, visual: { core_intensity: 0.28, glow_radius: 0.68, glow_softness: 0.84, hue_shift: 0.42, blend_openness: 0.88, line_opacity: 0.36, line_stability: 0.62, line_tension: 0.04 } },
      { speaker: 'mom',  text: "And I want the sister's number, the campground info, and a check-in when you arrive and before bed.", coords: { x: -1, y: -2, z: 8 }, offsetSec: 7.0, radius: 22, visual: { core_intensity: 0.70, glow_radius: 0.46, glow_softness: 0.60, hue_shift: 0.20, blend_openness: 0.54, line_opacity: 0.60, line_stability: 0.82, line_tension: 0.24 } },
```

Replace with:
```
      { speaker: 'dad',  text: "What if we make this a trial run? One night only, no changing locations, and if they don't stick to the plan, no more trips like this for a while.", coords: { x: 0, y: -4, z: 8 }, offsetSec: 0.8, radius: 28, visual: { core_intensity: 0.60, glow_radius: 0.62, glow_softness: 0.74, hue_shift: 0.32, blend_openness: 0.70, line_opacity: 0.58, line_stability: 0.82, line_tension: 0.18 }, semantic: { assertion: 0.54, defensiveness: 0.02, vulnerability: 0.18, repair: 0.82, control: 0.62, empathy: 0.60 }, overlapState: 'guided_alignment', overlapWith: ['teen', 'mom'] },
      { speaker: 'teen', text: "That's fair. I can do that.", coords: { x: 1, y: -4, z: 8 }, offsetSec: 4.5, radius: 16, visual: { core_intensity: 0.28, glow_radius: 0.68, glow_softness: 0.84, hue_shift: 0.42, blend_openness: 0.88, line_opacity: 0.36, line_stability: 0.62, line_tension: 0.04 }, semantic: { assertion: 0.32, defensiveness: 0.02, vulnerability: 0.22, repair: 0.84, control: 0.04, empathy: 0.68 }, overlapState: 'soft_merge', overlapWith: ['dad', 'mom'] },
      { speaker: 'mom',  text: "And I want the sister's number, the campground info, and a check-in when you arrive and before bed.", coords: { x: -1, y: -2, z: 8 }, offsetSec: 7.0, radius: 22, visual: { core_intensity: 0.70, glow_radius: 0.46, glow_softness: 0.60, hue_shift: 0.20, blend_openness: 0.54, line_opacity: 0.60, line_stability: 0.82, line_tension: 0.24 }, semantic: { assertion: 0.58, defensiveness: 0.04, vulnerability: 0.22, repair: 0.64, control: 0.72, empathy: 0.42 }, overlapState: 'guided_alignment', overlapWith: ['dad', 'teen'] },
```

Find:
```
      { speaker: 'teen', text: "Deal. Thank you for actually hearing me out.", coords: { x: 0, y: -5, z: 9 }, offsetSec: 0.8, radius: 24, visual: { core_intensity: 0.16, glow_radius: 0.80, glow_softness: 0.94, hue_shift: 0.48, blend_openness: 0.94, line_opacity: 0.26, line_stability: 0.56, line_tension: 0.00 } },
      { speaker: 'mom',  text: "Thank you for actually talking to us instead of just getting mad.", coords: { x: 0, y: -4, z: 9 }, offsetSec: 3.5, radius: 26, visual: { core_intensity: 0.18, glow_radius: 0.76, glow_softness: 0.92, hue_shift: 0.42, blend_openness: 0.90, line_opacity: 0.28, line_stability: 0.56, line_tension: 0.02 } },
      { speaker: 'dad',  text: "Great. Nobody's thrilled, everybody's slightly uncomfortable, which probably means this is a decent compromise.", coords: { x: 0, y: -3, z: 9 }, offsetSec: 6.5, radius: 20, visual: { core_intensity: 0.32, glow_radius: 0.64, glow_softness: 0.84, hue_shift: 0.34, blend_openness: 0.82, line_opacity: 0.40, line_stability: 0.68, line_tension: 0.06 } },
```

Replace with:
```
      { speaker: 'teen', text: "Deal. Thank you for actually hearing me out.", coords: { x: 0, y: -5, z: 9 }, offsetSec: 0.8, radius: 24, visual: { core_intensity: 0.16, glow_radius: 0.80, glow_softness: 0.94, hue_shift: 0.48, blend_openness: 0.94, line_opacity: 0.26, line_stability: 0.56, line_tension: 0.00 }, semantic: { assertion: 0.18, defensiveness: 0.00, vulnerability: 0.36, repair: 0.92, control: 0.00, empathy: 0.78 }, overlapState: 'soft_merge', overlapWith: ['mom', 'dad'] },
      { speaker: 'mom',  text: "Thank you for actually talking to us instead of just getting mad.", coords: { x: 0, y: -4, z: 9 }, offsetSec: 3.5, radius: 26, visual: { core_intensity: 0.18, glow_radius: 0.76, glow_softness: 0.92, hue_shift: 0.42, blend_openness: 0.90, line_opacity: 0.28, line_stability: 0.56, line_tension: 0.02 }, semantic: { assertion: 0.20, defensiveness: 0.02, vulnerability: 0.34, repair: 0.88, control: 0.02, empathy: 0.72 }, overlapState: 'soft_merge', overlapWith: ['teen'] },
      { speaker: 'dad',  text: "Great. Nobody's thrilled, everybody's slightly uncomfortable, which probably means this is a decent compromise.", coords: { x: 0, y: -3, z: 9 }, offsetSec: 6.5, radius: 20, visual: { core_intensity: 0.32, glow_radius: 0.64, glow_softness: 0.84, hue_shift: 0.34, blend_openness: 0.82, line_opacity: 0.40, line_stability: 0.68, line_tension: 0.06 }, semantic: { assertion: 0.34, defensiveness: 0.00, vulnerability: 0.22, repair: 0.80, control: 0.16, empathy: 0.64 }, overlapState: 'shared_field', overlapWith: ['teen', 'mom'] },
```

## Change 5: Pass semantic and overlapState through when firing PlotPoints

Find:
```
          onPlotPoint?.({
            id:      line.id,
            speaker: line.speaker,
            x:       line.coords.x,
            y:       line.coords.y,
            z:       line.coords.z,
            radius:  line.radius,
            visual:  line.visual,
          });
```

Replace with:
```
          onPlotPoint?.({
            id:           line.id,
            speaker:      line.speaker,
            x:            line.coords.x,
            y:            line.coords.y,
            z:            line.coords.z,
            radius:       line.radius,
            visual:       line.visual,
            semantic:     line.semantic,
            overlapState: line.overlapState,
            overlapWith:  line.overlapWith,
          });
```

---

# FILE 3: `src/app/components/relational-scene.tsx`

## Change 6: Use semantic factors to modulate glow color at dot creation time

Find this block inside the `plotPoints.forEach(pt => {` loop:
```
      // Apply hue_shift: blend speaker color toward neutral convergence target
      const baseColor = hexToColor(color);
      if (pt.visual && pt.visual.hue_shift > 0) {
        baseColor.lerp(BLEND_TARGET, pt.visual.hue_shift * 0.45); // max 45% shift
      }
```

Replace with:
```
      // Apply hue_shift from visual params, amplified by semantic factors
      const baseColor = hexToColor(color);
      const sem = pt.semantic;
      // vulnerability + empathy → stronger color softening (hue_shift)
      const semHueBoost = sem ? (sem.vulnerability * 0.3 + sem.empathy * 0.2) : 0;
      // defensiveness + control → reduce hue shift (keep speaker color sharp)
      const semHueDamp  = sem ? (sem.defensiveness * 0.15 + sem.control * 0.10) : 0;
      const effectiveHueShift = pt.visual
        ? Math.max(0, Math.min(1, pt.visual.hue_shift + semHueBoost - semHueDamp))
        : semHueBoost;
      if (effectiveHueShift > 0) {
        baseColor.lerp(BLEND_TARGET, effectiveHueShift * 0.45);
      }
```

## Change 7: Use semantic factors to modulate glow radius at dot creation time

Find:
```
      const { min, max, opacityMax } = radiusToGlowScale(pt.radius ?? 24);
      dotBirthRef.current.set(pt.id, {
        core, glow,
        born: clock.getElapsedTime(),
        z: pt.z,
        glowScaleMin: min, glowScaleMax: max, glowOpacityMax: opacityMax,
        visual: pt.visual,
      });
```

Replace with:
```
      // Semantic modulation of glow radius:
      // repair + empathy expand the glow (relational openness)
      // defensiveness + control shrink it (closed/guarded)
      const semGlowBoost = sem ? (sem.repair * 0.25 + sem.empathy * 0.20) : 0;
      const semGlowDamp  = sem ? (sem.defensiveness * 0.15 + sem.control * 0.10) : 0;
      const semRadiusBoost = semGlowBoost - semGlowDamp;
      const effectiveRadius = Math.max(10, (pt.radius ?? 24) + semRadiusBoost * 20);
      const { min, max, opacityMax } = radiusToGlowScale(effectiveRadius);
      dotBirthRef.current.set(pt.id, {
        core, glow,
        born: clock.getElapsedTime(),
        z: pt.z,
        glowScaleMin: min, glowScaleMax: max, glowOpacityMax: opacityMax,
        visual: pt.visual,
      });
```

## Change 8: Use overlapState to modulate cross-band line and fill opacity

Find this block inside the `crossBandsRef.current.forEach((band) => {` section in the animation loop:
```
          const boFactor = 0.4 + band.avgBlendOpenness * 0.6;   // 0.4–1.0
          const ltFactor = 1.0 - band.avgLineTension * 0.5;     // 0.5–1.0 (high tension → lower fill)
          band.lines.forEach((line) => {
            const mat = line.material as THREE.LineBasicMaterial;
            mat.opacity += ((isLit ? 0.90 * boFactor : 0.22) - mat.opacity) * AXIS_LERP;
          });
          if (band.fill) {
            const mat = band.fill.material as THREE.MeshBasicMaterial;
            mat.opacity += ((isLit ? 0.48 * boFactor * ltFactor : 0.10) - mat.opacity) * AXIS_LERP;
          }
```

Replace with:
```
          const boFactor = 0.4 + band.avgBlendOpenness * 0.6;   // 0.4–1.0
          const ltFactor = 1.0 - band.avgLineTension * 0.5;     // 0.5–1.0

          // overlapState multiplier: how strongly the cross-band connection renders
          const overlapMult = (() => {
            switch (band.overlapState) {
              case 'shared_field':      return 1.00;  // full three-way convergence
              case 'soft_merge':        return 0.85;  // open mutual blending
              case 'guided_alignment':  return 0.70;  // procedural bridge
              case 'contact_only':      return 0.45;  // proximity without merge
              case 'tense_collision':   return 0.30;  // compressed, resistant
              case 'none':              return 0.10;  // no meaningful connection
              default:                  return 0.50;
            }
          })();

          band.lines.forEach((line) => {
            const mat = line.material as THREE.LineBasicMaterial;
            mat.opacity += ((isLit ? 0.90 * boFactor * overlapMult : 0.22) - mat.opacity) * AXIS_LERP;
          });
          if (band.fill) {
            const mat = band.fill.material as THREE.MeshBasicMaterial;
            mat.opacity += ((isLit ? 0.48 * boFactor * ltFactor * overlapMult : 0.08) - mat.opacity) * AXIS_LERP;
          }
```

## Change 9: Add overlapState to CrossBand interface and store it when building bands

Find:
```
  interface CrossBand { z: number; lines: THREE.Line[]; fill?: THREE.Mesh; avgBlendOpenness: number; avgLineTension: number; }
```

Replace with:
```
  interface CrossBand { z: number; lines: THREE.Line[]; fill?: THREE.Mesh; avgBlendOpenness: number; avgLineTension: number; overlapState: string; }
```

Find:
```
      crossBandsRef.current.push({ z: band.z, lines, fill, avgBlendOpenness: avgBO, avgLineTension: avgLT });
```

Replace with:
```
      // Determine dominant overlapState for this band (prefer strongest merge state)
      const overlapPriority = ['shared_field', 'soft_merge', 'guided_alignment', 'tense_collision', 'contact_only', 'none'];
      const bandOverlapStates = band.pts.map(p => p.overlapState ?? 'none');
      const dominantOverlap = overlapPriority.find(s => bandOverlapStates.includes(s)) ?? 'none';

      crossBandsRef.current.push({ z: band.z, lines, fill, avgBlendOpenness: avgBO, avgLineTension: avgLT, overlapState: dominantOverlap });
```

## Change 10: Add overlapState and semantic to PlotPoint type used in crossBand builder

Find this line near the top of the crossBand useEffect (inside `bands.forEach`):
```
      const bySpeaker = new Map<string, PlotPoint>();
      band.pts.forEach(pt => { if (!bySpeaker.has(pt.speaker)) bySpeaker.set(pt.speaker, pt); });
```

No change needed here — the PlotPoint type already carries overlapState after Change 1.
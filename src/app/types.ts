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
  speaker: string;
  x: number;
  y: number;
  z: number;
  radius?: number;
  visual?: VisualParams;
  semantic?: SemanticFactors;
  overlapState?: OverlapState;
  overlapWith?: string[];
}

// ── Axis endpoint projection ─────────────────────────────────────
// Written by RelationalScene every frame; read by AxisEndpointLabels.
export type AxisEndKey = 'x-pos' | 'x-neg' | 'y-pos' | 'y-neg' | 'z-pos';

export interface ProjectedEndpointItem {
  sx:      number;   // logical-pixel screen x (pre-clamp)
  sy:      number;   // logical-pixel screen y (pre-clamp)
  visible: boolean;  // false when behind camera or axis not yet revealed
}

export interface ProjectedEndpointsData {
  pts: Record<AxisEndKey, ProjectedEndpointItem>;
  w:   number;   // current renderer logical width
  h:   number;   // current renderer logical height
}
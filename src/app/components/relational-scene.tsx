import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PlotPoint, ProjectedEndpointsData, VisualParams } from '../types';

export interface RelationalSceneProps {
  isStarted:               boolean;
  plotPoints:              PlotPoint[];
  highlightedAxis?:        'x' | 'y' | 'z' | null;
  cameraQuaternionRef?:    React.MutableRefObject<THREE.Quaternion>;
  projectedEndpointsRef?:  React.MutableRefObject<ProjectedEndpointsData>;
  timelineModeRef?:        React.MutableRefObject<boolean>;
  timelineSelZRef?:        React.MutableRefObject<number | null>;
  timelineHovZRef?:        React.MutableRefObject<number | null>;
  timelineMode?:           boolean;
  /** Active conversation id — used to pick the correct final-Z threshold */
  conversationId?:         number;
  /** Appreciation Mode — hide UI, center + subtle zoom camera */
  appreciationMode?:       boolean;
}

// ── Per-conversation final-Z (= max z of the last turn) ──────────
// When maxZ reaches this value all live-mode trajectories fade to
// their "completed" state before the user enters Timeline View.
const CONV_FINAL_Z: Record<number, number> = {
  1: 9,   // 10 turns (z 0–9)
  2: 9,
  3: 19,  // 20 turns (z 0–19)
  4: 9,   // 10 rounds (z 0–9)
};

// ── Speaker color palette ────────────────────────────────────────
// Saturated vivid colors — NOT pale pastels
const SPEAKER_COLOR: Record<string, number> = {
  teen:   0x8B7BDA,   // matches teen-color-system center color
  mom:    0x3578a8,   // deeper vivid blue
  dad:    0xB7DCE5,   // matches dad-color-system center color
  a:      0xC47040,   // warm amber — couple conflict speaker A
  b:      0x5A8FA5,   // steel teal — couple conflict speaker B
  // Startup meeting
  maya:   0xC48030,   // warm gold — Founder / CEO
  daniel: 0x5A8A96,   // slate teal — PM / bridge
  serena: 0x9A6A8A,   // soft mauve — Design Lead
  alex:   0x4A6A9A,   // steel blue — Engineering Lead
  priya:  0x6A8A5A,   // sage green — Learning Content Lead
  leo:    0xC4603A,   // coral orange — Growth Lead
  nina:   0xA06458,   // warm terracotta — Customer Support Lead
};

// ── Blend target color for hue_shift (warm neutral convergence) ──
const BLEND_TARGET = new THREE.Color(0xd4c8e8);  // soft lavender neutral

// hex → THREE.Color
function hexToColor(h: number): THREE.Color {
  return new THREE.Color(
    ((h >> 16) & 0xff) / 255,
    ((h >>  8) & 0xff) / 255,
    ( h        & 0xff) / 255,
  );
}

// hex → [r, g, b] in 0-1 range (for vertex color buffers)
function hexToF(h: number): [number, number, number] {
  return [
    ((h >> 16) & 0xff) / 255,
    ((h >>  8) & 0xff) / 255,
    ( h        & 0xff) / 255,
  ];
}

// ── Per-speaker multi-hue spectral gradient ──────────────────────
// Each stop: [offset 0-1, r, g, b, alpha]
// KEY PRINCIPLE: Keep the speaker's OWN saturated hue throughout.
// Only reduce alpha toward edges — do NOT shift to pale/white colors.
// This produces dense, color-rich clouds instead of washed-out halos.
const SPEAKER_GRADIENT: Record<string, [number, number, number, number, number][]> = {
  teen: [
    [0.00, 120,  90, 210, 1.00],   // strong purple core
    [0.20, 120,  90, 210, 0.95],
    [0.40, 200, 130, 210, 0.85],   // vivid pink-purple mid
    [0.60, 240, 200, 120, 0.65],   // warm amber outer
    [0.80, 240, 210, 140, 0.30],
    [1.00, 240, 210, 140, 0.00],
  ],
  mom: [
    [0.00,  40, 100, 180, 1.00],   // strong blue core
    [0.20,  40, 100, 180, 0.95],
    [0.45,  70, 150, 220, 0.80],
    [0.70, 120, 190, 240, 0.50],
    [0.90, 150, 210, 245, 0.20],
    [1.00, 150, 210, 245, 0.00],
  ],
  dad: [
    [0.00, 100, 190, 210, 1.00],   // strong teal core
    [0.20, 100, 190, 210, 0.95],
    [0.45, 180, 235, 160, 0.80],   // vivid yellow-green mid
    [0.70, 190, 225, 140, 0.50],   // grass green outer
    [0.90, 200, 230, 150, 0.20],
    [1.00, 200, 230, 150, 0.00],
  ],
  // ── Couple conflict speakers ─────────────────────────────────
  a: [
    [0.00, 196, 112,  64, 1.00],   // deep amber core
    [0.20, 196, 112,  64, 0.95],
    [0.40, 220, 150,  80, 0.80],   // lighter amber mid
    [0.65, 235, 185, 110, 0.55],   // golden outer
    [0.85, 240, 210, 150, 0.22],
    [1.00, 240, 210, 150, 0.00],
  ],
  b: [
    [0.00,  60, 120, 165, 1.00],   // deep blue-teal core
    [0.20,  60, 120, 165, 0.95],
    [0.45,  90, 155, 195, 0.80],   // medium teal-blue mid
    [0.70, 130, 185, 215, 0.50],   // lighter teal outer
    [0.90, 165, 205, 225, 0.20],
    [1.00, 165, 205, 225, 0.00],
  ],
  // ── Startup meeting speakers ──────────────────────────────────
  maya: [
    [0.00, 210, 145,  60, 1.00],   // warm gold core
    [0.20, 210, 145,  60, 0.95],
    [0.45, 230, 175,  90, 0.80],   // lighter amber mid
    [0.70, 240, 200, 130, 0.50],
    [0.90, 245, 220, 165, 0.20],
    [1.00, 245, 220, 165, 0.00],
  ],
  daniel: [
    [0.00,  80, 145, 165, 1.00],   // slate teal core
    [0.20,  80, 145, 165, 0.95],
    [0.45, 110, 170, 185, 0.80],
    [0.70, 145, 195, 210, 0.50],
    [0.90, 175, 215, 225, 0.20],
    [1.00, 175, 215, 225, 0.00],
  ],
  serena: [
    [0.00, 165, 115, 155, 1.00],   // soft mauve core
    [0.20, 165, 115, 155, 0.95],
    [0.45, 185, 140, 175, 0.80],
    [0.70, 205, 168, 198, 0.50],
    [0.90, 220, 195, 215, 0.20],
    [1.00, 220, 195, 215, 0.00],
  ],
  alex: [
    [0.00,  80, 115, 175, 1.00],   // steel blue core
    [0.20,  80, 115, 175, 0.95],
    [0.45, 110, 145, 200, 0.80],
    [0.70, 145, 175, 215, 0.50],
    [0.90, 175, 200, 230, 0.20],
    [1.00, 175, 200, 230, 0.00],
  ],
  priya: [
    [0.00, 110, 155,  90, 1.00],   // sage green core
    [0.20, 110, 155,  90, 0.95],
    [0.45, 140, 180, 115, 0.80],
    [0.70, 168, 200, 148, 0.50],
    [0.90, 195, 218, 178, 0.20],
    [1.00, 195, 218, 178, 0.00],
  ],
  leo: [
    [0.00, 210,  98,  60, 1.00],   // coral orange core
    [0.20, 210,  98,  60, 0.95],
    [0.45, 228, 128,  80, 0.80],
    [0.70, 238, 162, 115, 0.50],
    [0.90, 245, 195, 155, 0.20],
    [1.00, 245, 195, 155, 0.00],
  ],
  nina: [
    [0.00, 175, 112,  98, 1.00],   // warm terracotta core
    [0.20, 175, 112,  98, 0.95],
    [0.45, 195, 138, 120, 0.80],
    [0.70, 215, 165, 148, 0.50],
    [0.90, 230, 192, 178, 0.20],
    [1.00, 230, 192, 178, 0.00],
  ],
};
const SPEAKER_GRADIENT_DEFAULT = SPEAKER_GRADIENT['teen'];

// ── Glow scale factor ────────────────────────────────────────────
const GLOW_SF = 4.5;

// ── Other animation constants ────────────────────────────────────
const LERP_SPEED            = 0.06;
const AXIS_LERP             = 0.10;
// FINAL_Z is now per-conversation — see CONV_FINAL_Z above the props interface
const Z_AXIS_TARGET_OPACITY = 0.7;
const Z_AXIS_FADE_DURATION  = 1.8;

// ── Axis highlight opacity table ─────────────────────────────────
const AX = {
  lineNormal:   0.48, lineHigh: 0.92, lineDim:   0.18,
  spriteNormal: 0,    sprHigh:  0,    sprDim:    0,
};

// ── Visual emphasis targets ──────────────────────────────────────
// global_glow_rendering: dense_atmospheric_blob
// core_opacity: 0.9, glow_opacity: 0.76, outer_glow_opacity: 0.52, color_density: 0.86
const VIS = {
  active: {
    core:           0.95,
    coreScaleMin:   0.80, coreScaleMax: 0.95,
    glowOpacityMin: 0.82, glowOpacityMax: 1.00,
    glowScaleMin:   1.10, glowScaleMax:   1.55,
    pulsePeriod:    1.8,
  },
  history:    { core: 0.88, scale: 1.0, glow: 1.00, glowScale: 1.10 },
  normalized: { core: 0.92, scale: 1.0, glow: 1.00, glowScale: 1.15 },
};

// ── Radius → glow scale helper ───────────────────────────────────
// Floor raised: even small-radius dots get dense visible glows
function radiusToGlowScale(r: number): { min: number; max: number; opacityMax: number } {
  const rr = r ?? 24;
  const t = Math.max(0, Math.min(1, (rr - 10) / 40));
  return {
    min:        1.10 + t * 0.40,
    max:        1.20 + t * 3.40,
    opacityMax: 0.94 + t * 0.06,   // floor 0.94 → ceiling 1.0
  };
}

// ── Seeded RNG (mulberry32 variant) ──────────────────────────────
function seededRng(seed: number): () => number {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
    s ^= s >>> 16;
    return (s >>> 0) / 0x100000000;
  };
}

// ── Per-dot texture cache (keyed speaker+id) ─────────────────────
const _glowTexCache: Record<string, THREE.CanvasTexture> = {};

// ── Ambient star decoration SVG shapes ───────────────────────────
// star1 uses <rect> elements (drawn manually); star2–7 use a single <path>
const STAR_PATHS: Record<string, string | null> = {
  star1: null,  // drawn via fillRect + rotation
  star2: 'M9.6 0H14.4V6L19.2 1.2L22.8 4.8L18 9.6H24V14.4H18L22.8 19.2L19.2 22.8L14.4 18V24H9.6V18L4.8 22.8L1.2 19.2L6 14.4H0V9.6H6L1.2 4.8L4.8 1.2L9.6 6V0Z',
  star3: 'M9 0H15L24 9V15L15 24H9L0 15V9L9 0ZM10.2 2.4L2.4 10.2V13.8L10.2 21.6H13.8L21.6 13.8V10.2L13.8 2.4H10.2Z',
  star4: 'M13.2 0H10.8V7.2L8.4 4.8L6.6 6.6L10.8 10.8H0V13.2H10.8L6.6 17.4L8.4 19.2L10.8 16.8V24H13.2V16.8L15.6 19.2L17.4 17.4L13.2 13.2H24V10.8H13.2L17.4 6.6L15.6 4.8L13.2 7.2V0Z',
  star5: 'M12 0L14.8284 9.17157L24 12L14.8284 14.8284L12 24L9.17157 14.8284L0 12L9.17157 9.17157L12 0Z',
  star6: 'M14.1602 7.29395L15.8184 5.63574L18.3633 8.18164L16.7051 9.83984H24V14.1602H16.7061L18.3643 15.8184L15.8184 18.3633L14.1602 16.7051V24H9.83984V16.7051L8.18164 18.3633L5.63574 15.8184L7.29395 14.1602H0V9.83984H7.29395L5.63574 8.18164L8.18164 5.63574L9.83984 7.29395V0H14.1602V7.29395Z',
  star7: 'M13.3823 10.6177H23.52V13.3823H13.3823V23.52H10.6177V13.3823H0.47998V10.6177H10.6177V0.47998H13.3823V10.6177Z',
};

const STAR_COLORS: Record<string, string> = {
  star1: '#E8849A',
  star2: '#FF9BD0',
  star3: '#F28060',
  star4: '#92BF5C',
  star5: '#B083E8',
  star6: '#5AC4C2',
  star7: '#C4A820',
};

function createStarTexture(key: string): THREE.CanvasTexture {
  const SIZE  = 128;
  const PAD   = 10;
  const DRAW  = SIZE - PAD * 2;
  const SC    = DRAW / 24;

  const canvas = document.createElement('canvas');
  canvas.width  = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, SIZE, SIZE);

  ctx.save();
  ctx.translate(PAD, PAD);
  ctx.scale(SC, SC);
  ctx.fillStyle = STAR_COLORS[key] ?? '#ffffff';

  if (key === 'star1') {
    ctx.fillRect(0.5, 10.34, 23, 3.32);
    ctx.fillRect(10.34, 0.5, 3.32, 23);
    ctx.save();
    ctx.translate(6.343, 15.818); ctx.rotate(-Math.PI / 4); ctx.translate(-6.343, -15.818);
    ctx.fillRect(6.343, 15.818, 13.4, 2.6);
    ctx.restore();
    ctx.save();
    ctx.translate(8.181, 6.343); ctx.rotate(Math.PI / 4); ctx.translate(-8.181, -6.343);
    ctx.fillRect(8.181, 6.343, 13.4, 2.6);
    ctx.restore();
  } else {
    const pathData = STAR_PATHS[key];
    if (pathData) ctx.fill(new Path2D(pathData));
  }

  ctx.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const _starTexCache: Record<string, THREE.CanvasTexture> = {};

// ── Organic multi-layer glow sprite texture ──────────────────────
function createSpeakerGlowTexture(speaker: string, seed = 0): THREE.CanvasTexture {
  const FULL  = 1024;
  const PAD   = 200;          // increased padding so gradient fades well inside canvas
  const R     = (FULL - PAD * 2) / 2;
  const CX    = FULL / 2;
  const BLUR  = 80;
  const stops = SPEAKER_GRADIENT[speaker] ?? SPEAKER_GRADIENT_DEFAULT;
  const rng   = seededRng(seed);

  const canvas = document.createElement('canvas');
  canvas.width = FULL; canvas.height = FULL;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, FULL, FULL);

  const drawLayer = (
    opacityMul: number,
    cx: number, cy: number,
    radius: number,
    scaleX: number, scaleY: number,
    composite: GlobalCompositeOperation,
  ) => {
    ctx.save();
    ctx.globalCompositeOperation = composite;
    ctx.translate(cx, cy);
    ctx.scale(scaleX, scaleY);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    stops.forEach(([t, r, g, b, a]) =>
      grad.addColorStop(t as number, `rgba(${r},${g},${b},${(a as number) * opacityMul})`));
    ctx.fillStyle = grad;
    // Clip fill to circle to prevent square edges
    ctx.beginPath();
    ctx.arc(0, 0, radius + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Organic blob: screen blend creates luminous glow layering
  // Layer 1: core — main identity glow
  const asp1 = 0.95 + rng() * 0.20;
  drawLayer(0.85, CX, CX, R, 1.0, asp1, 'source-over');

  // Layer 2: mid glow — organic asymmetry
  const ox2  = (rng() - 0.5) * 30;
  const oy2  = (rng() - 0.5) * 26;
  const asp2 = 0.88 + rng() * 0.25;
  drawLayer(0.55, CX + ox2, CX + oy2, R * 0.82, 1.0, asp2, 'source-over');

  // Layer 3: outer glow — ambient color spread
  const ox3  = (rng() - 0.5) * 40;
  const oy3  = (rng() - 0.5) * 34;
  const asp3 = 0.90 + rng() * 0.30;
  drawLayer(0.32, CX + ox3, CX + oy3, R * 1.18, 1.0, asp3, 'source-over');

  // Blur pass: soften boundary into organic cloud shape
  // Use enough blur to remove hard circle edge, but not kill color
  const pass1 = document.createElement('canvas');
  pass1.width = FULL; pass1.height = FULL;
  const p1 = pass1.getContext('2d')!;
  p1.filter = `blur(${BLUR}px)`;
  p1.drawImage(canvas, 0, 0);

  // Reinforce: screen composite keeps luminous glow quality through blur
  p1.globalCompositeOperation = 'source-over';
  p1.globalAlpha = 0.65;
  p1.filter = 'none';
  p1.drawImage(canvas, 0, 0);
  p1.globalAlpha = 1.0;

  // Second gentle blur pass — smooth the reinforcement edges
  const final = document.createElement('canvas');
  final.width = FULL; final.height = FULL;
  const fc = final.getContext('2d')!;
  fc.filter = `blur(${Math.round(BLUR * 0.38)}px)`;
  fc.drawImage(pass1, 0, 0);

  const tex = new THREE.CanvasTexture(final);
  tex.needsUpdate = true;
  return tex;
}

// ── Faceted geometry helper ──────────────────────────────────────
function createCoreGeometry(x: number, y: number, radius: number): THREE.IcosahedronGeometry {
  const dist = Math.sqrt(x * x + y * y);
  const detail = dist < 2.5 ? 2 : dist < 5.0 ? 1 : 0;
  return new THREE.IcosahedronGeometry(radius, detail);
}

// ── Trajectory geometry ──────────────────────────────────────────
const TRAJ_TUBE_RADIUS = 0.0168;
const TRAJ_RADIAL_SEGS = 6;

function buildTrajectoryGeometry(pts: THREE.Vector3[]): THREE.TubeGeometry {
  const verts = pts.length < 2
    ? [pts[0], pts[0].clone().addScaledVector(new THREE.Vector3(0, 0.001, 0.001), 1)]
    : pts;
  const curve       = new THREE.CatmullRomCurve3(verts, false, 'catmullrom', 0.5);
  const tubularSegs = Math.max(32, verts.length * 14);
  return new THREE.TubeGeometry(curve, tubularSegs, TRAJ_TUBE_RADIUS, TRAJ_RADIAL_SEGS, false);
}

interface TrajectoryState {
  mesh:    THREE.Mesh;
  points:  THREE.Vector3[];
  latestZ: number;
}

const TRAJ_VIS = {
  active:    0.32,
  past:      0.22,
  completed: 0.28,
  hidden:    0.0,
};

// ── Billboard label sprite ───────────────────────────────────────
function makeAxisLabelSprite(letter: string): THREE.Sprite {
  const size   = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(80,80,80,0.90)';
  ctx.font = '300 46px system-ui, -apple-system, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, size / 2, size / 2);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, opacity: 0,
    depthTest: false, sizeAttenuation: true,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.55, 0.55, 0.55);
  return sprite;
}

// ── Per-axis material buckets ────────────────────────────────────
interface AxisMatBucket {
  line:   THREE.Material[];
  sprite: THREE.SpriteMaterial[];
}
interface ZAxisMatBucket {
  line:   THREE.Material[];
  mesh:   THREE.Material[];
  sprite: THREE.SpriteMaterial[];
}

// ── Cross-band gradient geometry helpers ─────────────────────────
// Build a gradient line between two speaker positions.
function buildGradientLine(
  posA: THREE.Vector3, colA: number,
  posB: THREE.Vector3, colB: number,
): THREE.Line {
  const geo = new THREE.BufferGeometry().setFromPoints([posA, posB]);
  const [ar, ag, ab] = hexToF(colA);
  const [br, bg, bb] = hexToF(colB);
  geo.setAttribute('color', new THREE.Float32BufferAttribute([
    ar, ag, ab,
    br, bg, bb,
  ], 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,      // white base, vertex colors tint it
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  return new THREE.Line(geo, mat);
}

// Build a gradient triangle fill connecting all speaker positions.
function buildGradientFill(
  positions: THREE.Vector3[],
  hexColors: number[],
): THREE.Mesh {
  const centroid = new THREE.Vector3();
  positions.forEach(p => centroid.add(p));
  centroid.divideScalar(positions.length);

  // Centroid color = average of all speaker colors
  let avgR = 0, avgG = 0, avgB = 0;
  hexColors.forEach(h => {
    const [r, g, b] = hexToF(h);
    avgR += r; avgG += g; avgB += b;
  });
  avgR /= hexColors.length;
  avgG /= hexColors.length;
  avgB /= hexColors.length;

  const verts: number[] = [];
  const cols:  number[] = [];

  for (let i = 0; i < positions.length; i++) {
    const next = (i + 1) % positions.length;
    const [ci0, ci1, ci2] = hexToF(hexColors[i]);
    const [cn0, cn1, cn2] = hexToF(hexColors[next]);
    // fan triangle: centroid → vertex i → vertex next
    verts.push(centroid.x,          centroid.y,          centroid.z);
    cols.push(avgR, avgG, avgB);
    verts.push(positions[i].x,      positions[i].y,      positions[i].z);
    cols.push(ci0, ci1, ci2);
    verts.push(positions[next].x,   positions[next].y,   positions[next].z);
    cols.push(cn0, cn1, cn2);
  }

  const fillGeo = new THREE.BufferGeometry();
  fillGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  fillGeo.setAttribute('color',    new THREE.Float32BufferAttribute(cols,  3));

  const fillMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,      // white base, vertex colors tint it
    vertexColors: true,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return new THREE.Mesh(fillGeo, fillMat);
}

export const RelationalScene: React.FC<RelationalSceneProps> = ({
  isStarted, plotPoints, highlightedAxis, cameraQuaternionRef, projectedEndpointsRef,
  timelineModeRef, timelineSelZRef, timelineHovZRef,
  timelineMode, conversationId, appreciationMode,
}) => {
  const mountRef         = useRef<HTMLDivElement>(null);
  const isStartedRef     = useRef(isStarted);
  const highlightedRef   = useRef<string | null>(highlightedAxis ?? null);

  const sceneRef    = useRef<THREE.Scene | null>(null);
  const clockRef    = useRef<THREE.Clock | null>(null);
  const dotGroupRef = useRef<THREE.Group | null>(null);
  const dotBirthRef = useRef(new Map<number, {
    core: THREE.Mesh; glow: THREE.Sprite; born: number; z: number;
    glowScaleMin: number; glowScaleMax: number; glowOpacityMax: number;
    visual?: VisualParams;
    baseColor: THREE.Color;   // original saturated color for temporal fade
  }>());

  const trajGroupRef = useRef<THREE.Group | null>(null);
  const trajStateRef = useRef(new Map<string, TrajectoryState>());

  interface CrossBand { z: number; lines: THREE.Line[]; fill?: THREE.Mesh; avgBlendOpenness: number; avgLineTension: number; overlapState: string; }
  const crossGroupRef = useRef<THREE.Group | null>(null);
  const crossBandsRef = useRef<CrossBand[]>([]);

  interface StarDecor { sprite: THREE.Sprite; baseOpacity: number; phase: number; }
  const starGroupRef  = useRef<THREE.Group | null>(null);
  const starDecorsRef = useRef<StarDecor[]>([]);

  const xMatsRef = useRef<AxisMatBucket>({ line: [], sprite: [] });
  const yMatsRef = useRef<AxisMatBucket>({ line: [], sprite: [] });
  const zMatsRef = useRef<ZAxisMatBucket>({ line: [], mesh: [], sprite: [] });

  const showZAxisRef       = useRef(false);
  const zAxisRevealTimeRef = useRef<number | null>(null);
  const allZMatsRef        = useRef<THREE.Material[]>([]);

  const showXYAxesRef  = useRef(false);
  const xyFadeRef      = useRef(0);
  const xyOtherMatsRef = useRef<{ mat: THREE.Material; base: number }[]>([]);

  const lookAtTargetRef       = useRef(new THREE.Vector3(0, 0, 0));
  const lookAtCurrentRef      = useRef(new THREE.Vector3(0, 0, 0));
  const appreciationModeRef   = useRef(false);
  const userRadiusRef         = useRef(15); // user scroll zoom target
  const appreciationLookAtRef = useRef(new THREE.Vector3(0, 0, 4.5));
  const activeZRef       = useRef<number>(-1);
  const finalStateRef    = useRef(false);
  const plotPointsRef    = useRef<PlotPoint[]>([]);

  useEffect(() => { isStartedRef.current       = isStarted;              }, [isStarted]);
  useEffect(() => { highlightedRef.current     = highlightedAxis ?? null; }, [highlightedAxis]);
  useEffect(() => { plotPointsRef.current      = plotPoints;             }, [plotPoints]);
  useEffect(() => { appreciationModeRef.current = appreciationMode ?? false; }, [appreciationMode]);

  // ── Main Three.js setup ──────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0xffffff, 1);
    mount.appendChild(renderer.domElement);

    // Flush stale glow textures from previous hot-reload
    Object.keys(_glowTexCache).forEach(k => {
      _glowTexCache[k].dispose();
      delete _glowTexCache[k];
    });

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xffffff, 10, 60);
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 100);
    // Default framing: oblique, elevated, zoomed out — matches the reference composition.
    // r=20 provides enough negative space; phi=1.05 lifts the camera ~30° above equatorial
    // so Z-depth is clearly readable; theta=-0.52 rotates the plot into the center-right area.
    const spherical = new THREE.Spherical(15, 1.05, -0.52);
    const updateCamera = () => {
      const lc = lookAtCurrentRef.current;
      camera.position.setFromSpherical(spherical);
      camera.position.add(lc);
      camera.lookAt(lc);
    };
    updateCamera();

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const pointLight = new THREE.PointLight(0xffffff, 1.0, 60);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);


    // ── X / Y axes ───────────────────────────────────────────
    const axesGroup = new THREE.Group();
    const AXIS_LEN  = 8;
    const COL       = 0x999999;

    const mkLineMat = (bucket: AxisMatBucket) => {
      const m = new THREE.LineBasicMaterial({ color: COL, transparent: true, opacity: 0 });
      bucket.line.push(m);
      return m;
    };
    const mkMeshMat = (bucket: AxisMatBucket) => {
      const m = new THREE.MeshBasicMaterial({ color: COL, transparent: true, opacity: 0 });
      bucket.line.push(m);
      return m;
    };

    axesGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-AXIS_LEN, 0, 0), new THREE.Vector3(AXIS_LEN, 0, 0),
      ]), mkLineMat(xMatsRef.current)
    ));
    const xArrPos = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 8), mkMeshMat(xMatsRef.current));
    xArrPos.position.set(AXIS_LEN, 0, 0); xArrPos.rotation.z = -Math.PI / 2;
    axesGroup.add(xArrPos);
    const xArrNeg = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 8), mkMeshMat(xMatsRef.current));
    xArrNeg.position.set(-AXIS_LEN, 0, 0); xArrNeg.rotation.z = Math.PI / 2;
    axesGroup.add(xArrNeg);
    const xSprite = makeAxisLabelSprite('X');
    xSprite.position.set(AXIS_LEN + 0.6, 0.1, 0);
    axesGroup.add(xSprite);
    xMatsRef.current.sprite.push(xSprite.material as THREE.SpriteMaterial);

    axesGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -AXIS_LEN, 0), new THREE.Vector3(0, AXIS_LEN, 0),
      ]), mkLineMat(yMatsRef.current)
    ));
    const yArrPos = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 8), mkMeshMat(yMatsRef.current));
    yArrPos.position.set(0, AXIS_LEN, 0);
    axesGroup.add(yArrPos);
    const yArrNeg = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 8), mkMeshMat(yMatsRef.current));
    yArrNeg.position.set(0, -AXIS_LEN, 0); yArrNeg.rotation.z = Math.PI;
    axesGroup.add(yArrNeg);
    const ySprite = makeAxisLabelSprite('Y');
    ySprite.position.set(0.1, AXIS_LEN + 0.6, 0);
    axesGroup.add(ySprite);
    yMatsRef.current.sprite.push(ySprite.material as THREE.SpriteMaterial);

    const tickMat = new THREE.LineBasicMaterial({ color: 0xbbbbbb, transparent: true, opacity: 0 });
    xyOtherMatsRef.current.push({ mat: tickMat, base: 0.35 });
    for (let t = -AXIS_LEN + 1; t <= AXIS_LEN - 1; t += 2) {
      if (t === 0) continue;
      axesGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(t, -0.15, 0), new THREE.Vector3(t, 0.15, 0),
        ]), tickMat
      ));
      axesGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-0.15, t, 0), new THREE.Vector3(0.15, t, 0),
        ]), tickMat
      ));
    }
    const originMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0 });
    xyOtherMatsRef.current.push({ mat: originMat, base: 0.55 });
    axesGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), originMat));
    scene.add(axesGroup);

    // ── Z axis ───────────────────────────────────────────────
    const zAxisGroup = new THREE.Group();
    const allZ: THREE.Material[] = [];

    const zMkLine = (extra: object = {}) => {
      const m = new THREE.LineBasicMaterial({ color: COL, transparent: true, opacity: 0, ...extra } as any);
      zMatsRef.current.line.push(m); allZ.push(m); return m;
    };
    const zMkMesh = () => {
      const m = new THREE.MeshBasicMaterial({ color: COL, transparent: true, opacity: 0 });
      zMatsRef.current.mesh.push(m); allZ.push(m); return m;
    };

    const Z_LEN = 14;
    zAxisGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, Z_LEN),
      ]), zMkLine()
    ));
    const zArrow = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 8), zMkMesh());
    zArrow.position.set(0, 0, Z_LEN); zArrow.rotation.x = Math.PI / 2;
    zAxisGroup.add(zArrow);
    for (let z = 1; z <= 10; z++) {
      zAxisGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-0.15, 0, z), new THREE.Vector3(0.15, 0, z),
        ]), zMkLine({ color: 0xbbbbbb })
      ));
    }
    const zSprite = makeAxisLabelSprite('Z');
    zSprite.position.set(0, 0.55, Z_LEN + 0.5);
    zAxisGroup.add(zSprite);
    zMatsRef.current.sprite.push(zSprite.material as THREE.SpriteMaterial);
    allZ.push(zSprite.material as THREE.SpriteMaterial);

    scene.add(zAxisGroup);
    allZMatsRef.current = allZ;

    // ── Groups ───────────────────────────────────────────────
    const trajGroup = new THREE.Group();
    scene.add(trajGroup);
    trajGroupRef.current = trajGroup;

    const dotGroup = new THREE.Group();
    scene.add(dotGroup);
    dotGroupRef.current = dotGroup;

    const crossGroup = new THREE.Group();
    scene.add(crossGroup);
    crossGroupRef.current = crossGroup;

    // ── Ambient star decorations ──────────────────────────────────
    const starGroup = new THREE.Group();
    scene.add(starGroup);
    starGroupRef.current = starGroup;

    const starRng   = seededRng(137);
    const STAR_KEYS = ['star1','star2','star3','star4','star5','star6','star7'] as const;
    const decors: StarDecor[] = [];

    // 16 stars placed in a hand-tuned seeded layout — varied but not cluttered
    for (let i = 0; i < 16; i++) {
      // Cycle through all 7 shapes in order then repeat, so types stay varied
      const key = STAR_KEYS[i % 7];
      if (!_starTexCache[key]) _starTexCache[key] = createStarTexture(key);

      const baseOpacity = 0.60;   // 60% opacity
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map:             _starTexCache[key],
          transparent:     true,
          opacity:         baseOpacity,
          depthWrite:      false,
          sizeAttenuation: true,
        })
      );

      // Scattered throughout the scene space, slightly beyond the data cluster
      const x = (starRng() - 0.5) * 22;   // −11 to +11
      const y = (starRng() - 0.5) * 16;   // −8  to +8
      const z = -2 + starRng() * 26;       // −2  to +24
      sprite.position.set(x, y, z);

      // Varied sizes — mix of small and mid, nothing oversized
      const scale = 0.06 + starRng() * 0.14;   // 0.06–0.20 world units
      sprite.scale.setScalar(scale);
      sprite.renderOrder = -2;   // behind glow and icon sprites

      starGroup.add(sprite);
      decors.push({ sprite, baseOpacity, phase: starRng() * Math.PI * 2 });
    }
    starDecorsRef.current = decors;

    const clock = new THREE.Clock();
    clockRef.current = clock;

    // ── Interaction ──────────────────────────────────────────
    let isDragging = false;
    let prevMouse  = { x: 0, y: 0 };
    let autoAngle  = -0.52; // kept in sync with initial spherical.theta

    const onMouseDown = (e: MouseEvent) => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      spherical.theta -= dx * 0.005;
      spherical.phi    = Math.max(0.3, Math.min(Math.PI - 0.3, spherical.phi - dy * 0.005));
      prevMouse = { x: e.clientX, y: e.clientY };
      updateCamera();
    };
    const onMouseUp   = () => { isDragging = false; };
    const onWheel = (e: WheelEvent) => {
      userRadiusRef.current = Math.max(5, Math.min(30, userRadiusRef.current + e.deltaY * 0.02));
    };

    let prevTouch = { x: 0, y: 0 };
    const onTouchStart = (e: TouchEvent) => { isDragging = true; prevTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
    const onTouchMove  = (e: TouchEvent) => {
      if (!isDragging) return;
      const dx = e.touches[0].clientX - prevTouch.x;
      const dy = e.touches[0].clientY - prevTouch.y;
      spherical.theta -= dx * 0.005;
      spherical.phi    = Math.max(0.3, Math.min(Math.PI - 0.3, spherical.phi - dy * 0.005));
      prevTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      updateCamera();
    };
    const onTouchEnd = () => { isDragging = false; };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // ── Render loop ──────────────────────────────────────────
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Appreciation mode: center model, subtle zoom; normal mode: standard offset
      const isAppreciation = appreciationModeRef.current;
      const effectiveLookAt = isAppreciation ? appreciationLookAtRef.current : lookAtTargetRef.current;
      lookAtCurrentRef.current.lerp(effectiveLookAt, 0.035);
      // Smoothly transition radius: zoom in for appreciation, restore user radius otherwise
      const rTarget = isAppreciation ? 11 : userRadiusRef.current;
      spherical.radius += (rTarget - spherical.radius) * 0.035;
      if (!isStartedRef.current && !isDragging) {
        autoAngle += 0.003; spherical.theta = autoAngle;
      }
      updateCamera();

      if (cameraQuaternionRef) cameraQuaternionRef.current.copy(camera.quaternion);

      const isTimelineMode = timelineModeRef?.current ?? false;

      if (isTimelineMode) {
        const focusZ = timelineHovZRef?.current ?? timelineSelZRef?.current ?? null;

        dotBirthRef.current.forEach(({ core, glow, z }) => {
          const coreMat = core.material as THREE.MeshPhongMaterial;
          const glowMat = glow.material as THREE.SpriteMaterial;
          const lit = focusZ === null || z === focusZ;
          coreMat.opacity += ((lit ? 1.00 : 0.20) - coreMat.opacity) * AXIS_LERP;
          glowMat.opacity += ((lit ? 0.60 : 0.05) - glowMat.opacity) * AXIS_LERP;
          const tScale = lit ? 1.18 : 1.0;
          core.scale.setScalar(core.scale.x + (tScale        - core.scale.x) * AXIS_LERP);
          glow.scale.setScalar(glow.scale.x + (tScale * GLOW_SF - glow.scale.x) * AXIS_LERP);
        });

        trajStateRef.current.forEach((state) => {
          const mat = state.mesh.material as THREE.MeshPhongMaterial;
          mat.opacity += (0.0 - mat.opacity) * AXIS_LERP;
        });

        // Separate selected Z from hover Z so the fill can distinguish them
        const selZ = timelineSelZRef?.current ?? null;

        crossBandsRef.current.forEach((band) => {
          const isLit      = focusZ === null || Math.abs(band.z - focusZ) < 0.5;
          const isSelected = selZ !== null && Math.abs(band.z - selZ) < 0.5;

          // blend_openness controls line visibility; line_tension reduces fill opacity
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
            // Selected turn: fill at full opacity so the surface reads clearly in review.
            // Hovered (non-selected): existing lit formula. Muted: 0.08.
            const fillTarget = isSelected
              ? 1.0
              : isLit
                ? 0.48 * boFactor * ltFactor * overlapMult
                : 0.08;
            mat.opacity += (fillTarget - mat.opacity) * AXIS_LERP;
          }
        });

      } else {
        const activeZ = activeZRef.current;
        const isFinal = finalStateRef.current;

        // Compute Z range for temporal depth-fade
        // depthFade: 0 = current/newest dot, 1 = oldest dot
        const minZ = Math.min(...Array.from(dotBirthRef.current.values()).map(d => d.z));
        const zRange = Math.max(activeZ - minZ, 1); // avoid division by zero
        const WHITE = new THREE.Color(1, 1, 1);
        const _fadedColor = new THREE.Color(); // reusable temp

        dotBirthRef.current.forEach(({ core, glow, born, z, glowScaleMin, glowScaleMax, glowOpacityMax, visual, baseColor }) => {
          const coreMat = core.material as THREE.MeshPhongMaterial;
          const glowMat = glow.material as THREE.SpriteMaterial;
          const t       = Math.min((elapsed - born) / 0.9, 1);
          const eased   = 1 - Math.pow(1 - t, 3);

          // ── Temporal depth-fade ──────────────────────────
          // Older dots (farther from activeZ) fade toward white
          // depthFade: 0 = current active dot, 1 = oldest dot
          const depthFade = isFinal
            ? 0  // in final state, apply uniform mild fade based on total count
            : Math.max(0, Math.min(1, (activeZ - z) / zRange));
          // Color: lerp toward white (0 = full color, 0.7 = almost white)
          const colorFadeFactor = depthFade * 0.65;
          _fadedColor.copy(baseColor).lerp(WHITE, colorFadeFactor);
          coreMat.color.lerp(_fadedColor, 0.08); // smooth transition
          // Opacity reduction for older dots (keep minimum 0.25 so they don't vanish)
          const depthOpacityMul = 1.0 - depthFade * 0.55; // range 1.0 → 0.45

          // ── Visual-param–driven targets ──────────────────
          // Dense atmospheric blob: high floor ensures strong glow presence
          // even for low-intensity semantic values. Color density ≥ 0.72.
          const vCI = visual ? visual.core_intensity : 1.0;
          const vGR = visual ? visual.glow_radius    : 0.5;
          const vGS = visual ? visual.glow_softness  : 0.5;

          // Modulated targets — raised floor (0.78+) prevents faint glows
          const mCoreOpacity  = VIS.active.core * (0.78 + vCI * 0.22) * depthOpacityMul;
          const mGlowScaleMax = glowScaleMax * (0.75 + vGR * 0.55);
          const mGlowScaleMin = glowScaleMin * (0.75 + vGR * 0.55);
          const mGlowOpMax    = glowOpacityMax * (0.90 + vGS * 0.10) * depthOpacityMul;
          const mHistCore     = VIS.history.core * (0.78 + vCI * 0.22) * depthOpacityMul;
          const mHistGlow     = VIS.history.glow * (0.90 + vGS * 0.10) * depthOpacityMul;
          const mHistGlowSc   = VIS.history.glowScale * (0.75 + vGR * 0.55);
          const mNormCore     = VIS.normalized.core * (0.78 + vCI * 0.22) * (1.0 - depthFade * 0.35);
          const mNormGlow     = VIS.normalized.glow * (0.90 + vGS * 0.10) * (1.0 - depthFade * 0.35);
          const mNormGlowSc   = VIS.normalized.glowScale * (0.75 + vGR * 0.55);
          // Glow scale shrinks slightly for older dots
          const depthGlowShrink = 1.0 - depthFade * 0.25; // oldest → 75% glow size

          if (t < 1) {
            core.scale.setScalar(eased * VIS.active.coreScaleMax);
            glow.scale.setScalar(eased * mGlowScaleMax * GLOW_SF);
            coreMat.opacity = eased * mCoreOpacity;
            glowMat.opacity = eased * mGlowOpMax;
          } else if (isFinal) {
            coreMat.opacity += (mNormCore       - coreMat.opacity) * LERP_SPEED;
            glowMat.opacity += (mNormGlow       - glowMat.opacity) * LERP_SPEED;
            core.scale.setScalar(core.scale.x + (VIS.normalized.scale - core.scale.x) * LERP_SPEED);
            glow.scale.setScalar(glow.scale.x + (mNormGlowSc * GLOW_SF * depthGlowShrink - glow.scale.x) * LERP_SPEED);
          } else if (z === activeZ) {
            const pulse = Math.sin((elapsed / VIS.active.pulsePeriod) * Math.PI * 2) * 0.5 + 0.5;
            coreMat.opacity += (mCoreOpacity - coreMat.opacity) * LERP_SPEED;
            const glowOpMin  = mGlowOpMax * 0.55;
            glowMat.opacity += (glowOpMin + (mGlowOpMax - glowOpMin) * pulse - glowMat.opacity) * LERP_SPEED;
            const coreTarget = VIS.active.coreScaleMin + (VIS.active.coreScaleMax - VIS.active.coreScaleMin) * pulse;
            core.scale.setScalar(core.scale.x + (coreTarget - core.scale.x) * LERP_SPEED);
            const glowTarget = (mGlowScaleMin + (mGlowScaleMax - mGlowScaleMin) * pulse) * GLOW_SF;
            glow.scale.setScalar(glow.scale.x + (glowTarget - glow.scale.x) * LERP_SPEED);
          } else {
            coreMat.opacity += (mHistCore       - coreMat.opacity) * LERP_SPEED;
            glowMat.opacity += (mHistGlow       - glowMat.opacity) * LERP_SPEED;
            core.scale.setScalar(core.scale.x + (VIS.history.scale     - core.scale.x) * LERP_SPEED);
            glow.scale.setScalar(glow.scale.x + (mHistGlowSc * GLOW_SF * depthGlowShrink - glow.scale.x) * LERP_SPEED);
          }
        });

        // ── Trajectory opacity modulated by visual line_opacity ───
        trajStateRef.current.forEach((state, speaker) => {
          const mat = state.mesh.material as THREE.MeshPhongMaterial;
          // Find the latest point for this speaker to get its visual params
          const latestPt = plotPointsRef.current
            .filter(p => p.speaker === speaker)
            .sort((a, b) => b.z - a.z)[0];
          const vLO = latestPt?.visual?.line_opacity ?? 1.0;
          const baseTarget = isFinal       ? TRAJ_VIS.completed
            : state.latestZ === activeZ ? TRAJ_VIS.active
            : state.latestZ >= 0        ? TRAJ_VIS.past
            : TRAJ_VIS.hidden;
          // Modulate trajectory opacity by line_opacity factor
          const target = baseTarget * (0.5 + vLO * 0.5);
          mat.opacity += (target - mat.opacity) * LERP_SPEED;
        });
      }

      // ── Axis opacity ─────────────────────────────────────
      const hl    = highlightedRef.current;
      const anyHl = hl !== null;

      const xyFadeTarget = showXYAxesRef.current ? 1 : 0;
      xyFadeRef.current += (xyFadeTarget - xyFadeRef.current) * 0.018;
      const xyF = xyFadeRef.current;

      const xLT = (hl === 'x' ? AX.lineHigh : anyHl ? AX.lineDim : AX.lineNormal) * xyF;
      const xST = (hl === 'x' ? AX.sprHigh  : anyHl ? AX.sprDim  : AX.spriteNormal) * xyF;
      xMatsRef.current.line.forEach(m   => { (m as any).opacity += (xLT - (m as any).opacity) * AXIS_LERP; });
      xMatsRef.current.sprite.forEach(m => { (m as any).opacity += (xST - (m as any).opacity) * AXIS_LERP; });

      const yLT = (hl === 'y' ? AX.lineHigh : anyHl ? AX.lineDim : AX.lineNormal) * xyF;
      const yST = (hl === 'y' ? AX.sprHigh  : anyHl ? AX.sprDim  : AX.spriteNormal) * xyF;
      yMatsRef.current.line.forEach(m   => { (m as any).opacity += (yLT - (m as any).opacity) * AXIS_LERP; });
      yMatsRef.current.sprite.forEach(m => { (m as any).opacity += (yST - (m as any).opacity) * AXIS_LERP; });

      xyOtherMatsRef.current.forEach(({ mat, base }) => {
        (mat as any).opacity += (base * xyF - (mat as any).opacity) * AXIS_LERP;
      });

      let zFade = 0;
      if (showZAxisRef.current && zAxisRevealTimeRef.current !== null) {
        const age = elapsed - zAxisRevealTimeRef.current;
        zFade = 1 - Math.pow(1 - Math.min(age / Z_AXIS_FADE_DURATION, 1), 2);
      }
      const zFactor = hl === 'z' ? 1.45 : anyHl ? 0.28 : 1.0;
      const zLineT  = Math.min(zFade * Z_AXIS_TARGET_OPACITY * 0.75 * zFactor, 1);
      const zMeshT  = Math.min(zFade * Z_AXIS_TARGET_OPACITY        * zFactor, 1);
      const zSprT   = Math.min(zFade * AX.spriteNormal               * zFactor, 1);
      zMatsRef.current.line.forEach(m   => { (m as any).opacity += (zLineT - (m as any).opacity) * AXIS_LERP; });
      zMatsRef.current.mesh.forEach(m   => { (m as any).opacity += (zMeshT - (m as any).opacity) * AXIS_LERP; });
      zMatsRef.current.sprite.forEach(m => { (m as any).opacity += (zSprT  - (m as any).opacity) * AXIS_LERP; });

      // ── Ambient star gentle pulse (stays close to 80% base) ──
      starDecorsRef.current.forEach(({ sprite, baseOpacity, phase }) => {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 0.35 + phase);
        (sprite.material as THREE.SpriteMaterial).opacity = baseOpacity * (0.88 + 0.12 * pulse);
      });

      renderer.render(scene, camera);

      // ── Project axis endpoints ───────────────────────────
      if (projectedEndpointsRef) {
        const sw = renderer.domElement.clientWidth;
        const sh = renderer.domElement.clientHeight;
        const project = (wx: number, wy: number, wz: number) => {
          const v = new THREE.Vector3(wx, wy, wz);
          v.project(camera);
          return { sx: (v.x + 1) * 0.5 * sw, sy: (1 - (v.y + 1) * 0.5) * sh, visible: v.z <= 1 };
        };
        const p      = projectedEndpointsRef.current;
        const xyRevd = showXYAxesRef.current;
        const xPosRaw = project( 9.2,  0, 0);
        const xNegRaw = project(-9.2,  0, 0);
        const yPosRaw = project( 0,  9.2, 0);
        const yNegRaw = project( 0, -9.2, 0);
        p.pts['x-pos'] = { ...xPosRaw, visible: xPosRaw.visible && xyRevd };
        p.pts['x-neg'] = { ...xNegRaw, visible: xNegRaw.visible && xyRevd };
        p.pts['y-pos'] = { ...yPosRaw, visible: yPosRaw.visible && xyRevd };
        p.pts['y-neg'] = { ...yNegRaw, visible: yNegRaw.visible && xyRevd };
        const zRaw     = project(0, 0.4, 15.0);
        p.pts['z-pos'] = { ...zRaw, visible: zRaw.visible && showZAxisRef.current };
        p.w = sw;
        p.h = sh;
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Add dots + update trajectories when plotPoints change ───
  useEffect(() => {
    const scene     = sceneRef.current;
    const dotGroup  = dotGroupRef.current;
    const trajGroup = trajGroupRef.current;
    const clock     = clockRef.current;
    if (!scene || !dotGroup || !trajGroup || !clock) return;

    if (plotPoints.length === 0) {
      while (dotGroup.children.length > 0) {
        const c = dotGroup.children[0] as THREE.Mesh;
        c.geometry?.dispose();
        (Array.isArray(c.material) ? c.material : [c.material]).forEach((m: THREE.Material) => m.dispose());
        dotGroup.remove(c);
      }
      dotBirthRef.current.clear();
      while (trajGroup.children.length > 0) {
        const c = trajGroup.children[0] as THREE.Mesh;
        c.geometry?.dispose();
        (Array.isArray(c.material) ? c.material : [c.material]).forEach((m: THREE.Material) => m.dispose());
        trajGroup.remove(c);
      }
      trajStateRef.current.clear();
      showZAxisRef.current = false; zAxisRevealTimeRef.current = null;
      allZMatsRef.current.forEach(m => { (m as any).opacity = 0; });
      showXYAxesRef.current = false; xyFadeRef.current = 0;
      xMatsRef.current.line.forEach(m => { (m as any).opacity = 0; });
      yMatsRef.current.line.forEach(m => { (m as any).opacity = 0; });
      xyOtherMatsRef.current.forEach(({ mat }) => { (mat as any).opacity = 0; });
      lookAtTargetRef.current.set(-5, 0, 0); lookAtCurrentRef.current.set(-5, 0, 0);
      activeZRef.current = -1; finalStateRef.current = false;
      return;
    }

    const bySpeaker = new Map<string, PlotPoint[]>();
    plotPoints.forEach(pt => {
      if (!bySpeaker.has(pt.speaker)) bySpeaker.set(pt.speaker, []);
      bySpeaker.get(pt.speaker)!.push(pt);
    });
    bySpeaker.forEach(pts => pts.sort((a, b) => a.z - b.z));

    plotPoints.forEach(pt => {
      if (dotBirthRef.current.has(pt.id)) return;
      const color = SPEAKER_COLOR[pt.speaker] ?? 0x888888;

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

      const core = new THREE.Mesh(
        createCoreGeometry(pt.x, pt.y, 0.084),
        new THREE.MeshPhongMaterial({
          color: baseColor, transparent: true, opacity: 0,
          depthWrite: false, flatShading: true, shininess: 18,
        })
      );
      core.position.set(pt.x, pt.y, pt.z);
      core.scale.setScalar(0);

      const cacheKey = `${pt.speaker}_${pt.id}`;
      if (!_glowTexCache[cacheKey]) {
        _glowTexCache[cacheKey] = createSpeakerGlowTexture(pt.speaker, pt.id);
      }
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: _glowTexCache[cacheKey],
          color: 0xffffff, transparent: true, opacity: 0,
          sizeAttenuation: true, depthWrite: false, depthTest: false,
        })
      );
      glow.position.copy(core.position);
      glow.scale.setScalar(0);
      glow.renderOrder = -1;

      dotGroup.add(core);
      dotGroup.add(glow);

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
        baseColor,
      });
    });

    bySpeaker.forEach((pts, speaker) => {
      if (pts.length === 0) return;
      const color   = SPEAKER_COLOR[speaker] ?? 0x888888;
      const verts   = pts.map(p => new THREE.Vector3(p.x, p.y, p.z));
      const latestZ = pts[pts.length - 1].z;
      const existing = trajStateRef.current.get(speaker);
      if (!existing) {
        const mesh = new THREE.Mesh(
          buildTrajectoryGeometry(verts),
          new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0, depthWrite: false, shininess: 28 })
        );
        trajGroup.add(mesh);
        trajStateRef.current.set(speaker, { mesh, points: verts, latestZ });
      } else {
        existing.mesh.geometry.dispose();
        existing.mesh.geometry = buildTrajectoryGeometry(verts);
        existing.points = verts; existing.latestZ = latestZ;
      }
    });

    const maxZ    = Math.max(...plotPoints.map(p => p.z));
    const finalZ  = CONV_FINAL_Z[conversationId ?? 1] ?? 9;
    activeZRef.current = maxZ;
    lookAtTargetRef.current.set(-5, 0, maxZ);
    // Keep appreciation look-at centered on mid-Z of data so model frames well
    appreciationLookAtRef.current.set(0, 0, maxZ * 0.5);
    if (maxZ >= finalZ) finalStateRef.current = true;
    const hasZGe1 = plotPoints.some(p => p.z >= 1);
    if (hasZGe1 && !showZAxisRef.current) {
      showZAxisRef.current = true;
      zAxisRevealTimeRef.current = clock.getElapsedTime() + 0.3;
    }
    if (hasZGe1 && !showXYAxesRef.current) {
      showXYAxesRef.current = true;
    }
  }, [plotPoints]);

  // ── Build cross-band gradient connections on timeline toggle ─
  useEffect(() => {
    const crossGroup = crossGroupRef.current;
    if (!crossGroup) return;

    // Clear previous cross-band objects
    while (crossGroup.children.length > 0) {
      const c = crossGroup.children[0] as any;
      c.geometry?.dispose();
      (Array.isArray(c.material) ? c.material : [c.material]).forEach((m: THREE.Material) => m.dispose());
      crossGroup.remove(c);
    }
    crossBandsRef.current = [];

    if (!timelineMode || plotPoints.length === 0) return;

    // Group points into z-bands
    const Z_THRESH = 0.45;
    const bands: { z: number; pts: PlotPoint[] }[] = [];
    const sorted = [...plotPoints].sort((a, b) => a.z - b.z);
    sorted.forEach(pt => {
      const band = bands.find(b => Math.abs(b.z - pt.z) <= Z_THRESH);
      if (band) { band.pts.push(pt); }
      else       { bands.push({ z: pt.z, pts: [pt] }); }
    });

    bands.forEach(band => {
      // Deduplicate by speaker, keep first occurrence
      const bySpeaker = new Map<string, PlotPoint>();
      band.pts.forEach(pt => { if (!bySpeaker.has(pt.speaker)) bySpeaker.set(pt.speaker, pt); });
      if (bySpeaker.size < 2) return;

      const entries   = Array.from(bySpeaker.entries());
      const positions = entries.map(([, p]) => new THREE.Vector3(p.x, p.y, p.z));
      const hexColors = entries.map(([spk]) => SPEAKER_COLOR[spk] ?? 0x888888);

      const lines: THREE.Line[] = [];
      let fill: THREE.Mesh | undefined;

      // Gradient line between every pair of speakers
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const line = buildGradientLine(
            positions[i], hexColors[i],
            positions[j], hexColors[j],
          );
          crossGroup.add(line);
          lines.push(line);
        }
      }

      // Gradient filled triangle for 3 speakers
      if (positions.length >= 3) {
        fill = buildGradientFill(positions, hexColors);
        crossGroup.add(fill);
      }

      // Compute average visual params for this band
      const visuals = band.pts.map(p => p.visual).filter(Boolean) as VisualParams[];
      const avgBO = visuals.length > 0
        ? visuals.reduce((s, v) => s + v.blend_openness, 0) / visuals.length
        : 0.5;
      const avgLT = visuals.length > 0
        ? visuals.reduce((s, v) => s + v.line_tension, 0) / visuals.length
        : 0.5;

      // Determine dominant overlapState for this band (prefer strongest merge state)
      const overlapPriority = ['shared_field', 'soft_merge', 'guided_alignment', 'tense_collision', 'contact_only', 'none'];
      const bandOverlapStates = band.pts.map(p => p.overlapState ?? 'none');
      const dominantOverlap = overlapPriority.find(s => bandOverlapStates.includes(s)) ?? 'none';

      crossBandsRef.current.push({ z: band.z, lines, fill, avgBlendOpenness: avgBO, avgLineTension: avgLT, overlapState: dominantOverlap });
    });
  }, [timelineMode, plotPoints]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={mountRef} className="w-full h-full" style={{ cursor: 'grab' }} />;
};
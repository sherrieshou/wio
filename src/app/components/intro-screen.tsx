import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence, useAnimation } from 'motion/react';
import { ArrowRight, Archive } from 'lucide-react';
import { ArchivePanel } from './archive-panel';

interface IntroScreenProps {
  onBegin: () => void;
  activeConvId: number;
  onSelectFromArchive: (id: number) => void;
}

// ── Star definitions ───────────────────────────────────────────────
type StarShape = 'sparkle' | 'angular' | 'diamond';

interface StarDef {
  angle:      number;      // degrees, from positive-x axis
  r:          number;      // radius fraction of min(w,h)/2
  size:       number;      // rendered size in px
  delay:      number;      // burst delay (s)
  opacity:    number;      // settled opacity
  color:      string;
  shape:      StarShape;
  spin:       number;      // final rotation deg
  idleAmp:    number;      // idle float amplitude px
  idleDelay:  number;      // idle anim phase delay (s)
}

// Three concentric rings — inner / middle / outer — kept "错落有致"
// (varied but harmonious: angles are non-uniform, sizes mix small/large)
const STARS: StarDef[] = [
  // ── Inner ring ────────────────────────────────────────────────
  { angle: 22,  r: 0.14, size:  8, delay: 0.00, opacity: 0.52, color: '#a78bca', shape: 'sparkle',  spin:  15, idleAmp: 3, idleDelay: 0.0  },
  { angle: 74,  r: 0.12, size:  6, delay: 0.07, opacity: 0.38, color: '#7ba7c8', shape: 'angular',  spin: -20, idleAmp: 4, idleDelay: 0.6  },
  { angle: 138, r: 0.16, size:  9, delay: 0.13, opacity: 0.55, color: '#c8a882', shape: 'sparkle',  spin:  36, idleAmp: 3, idleDelay: 1.2  },
  { angle: 186, r: 0.13, size:  7, delay: 0.05, opacity: 0.43, color: '#6abcb8', shape: 'sparkle',  spin: -12, idleAmp: 5, idleDelay: 0.3  },
  { angle: 244, r: 0.15, size:  8, delay: 0.18, opacity: 0.48, color: '#a78bca', shape: 'angular',  spin:  28, idleAmp: 4, idleDelay: 0.9  },
  { angle: 304, r: 0.11, size:  6, delay: 0.10, opacity: 0.36, color: '#7ba7c8', shape: 'sparkle',  spin: -40, idleAmp: 3, idleDelay: 1.5  },
  { angle: 350, r: 0.17, size:  9, delay: 0.16, opacity: 0.50, color: '#6abcb8', shape: 'diamond',  spin:  20, idleAmp: 5, idleDelay: 0.5  },

  // ── Middle ring ───────────────────────────────────────────────
  { angle: 12,  r: 0.24, size: 13, delay: 0.21, opacity: 0.42, color: '#a78bca', shape: 'sparkle',  spin: -18, idleAmp: 5, idleDelay: 0.2  },
  { angle: 50,  r: 0.27, size: 10, delay: 0.30, opacity: 0.30, color: '#c8d0d8', shape: 'angular',  spin:  55, idleAmp: 4, idleDelay: 1.0  },
  { angle: 90,  r: 0.22, size: 15, delay: 0.24, opacity: 0.46, color: '#7ba7c8', shape: 'sparkle',  spin: -35, idleAmp: 6, idleDelay: 0.4  },
  { angle: 118, r: 0.29, size: 11, delay: 0.36, opacity: 0.34, color: '#6abcb8', shape: 'sparkle',  spin:  22, idleAmp: 4, idleDelay: 1.4  },
  { angle: 148, r: 0.25, size: 16, delay: 0.19, opacity: 0.50, color: '#a78bca', shape: 'sparkle',  spin: -28, idleAmp: 7, idleDelay: 0.7  },
  { angle: 196, r: 0.23, size: 10, delay: 0.42, opacity: 0.30, color: '#c8a882', shape: 'angular',  spin:  45, idleAmp: 4, idleDelay: 1.1  },
  { angle: 228, r: 0.28, size: 12, delay: 0.32, opacity: 0.40, color: '#7ba7c8', shape: 'sparkle',  spin: -50, idleAmp: 5, idleDelay: 0.2  },
  { angle: 268, r: 0.21, size: 17, delay: 0.26, opacity: 0.52, color: '#6abcb8', shape: 'sparkle',  spin:  32, idleAmp: 6, idleDelay: 1.6  },
  { angle: 312, r: 0.26, size: 11, delay: 0.38, opacity: 0.33, color: '#d0c8d8', shape: 'diamond',  spin: -22, idleAmp: 4, idleDelay: 0.8  },
  { angle: 340, r: 0.24, size: 13, delay: 0.23, opacity: 0.44, color: '#a78bca', shape: 'sparkle',  spin:  18, idleAmp: 5, idleDelay: 0.3  },

  // ── Outer ring ────────────────────────────────────────────────
  { angle: 28,  r: 0.37, size: 18, delay: 0.44, opacity: 0.28, color: '#7ba7c8', shape: 'sparkle',  spin:  30, idleAmp: 7, idleDelay: 0.5  },
  { angle: 62,  r: 0.40, size: 12, delay: 0.54, opacity: 0.20, color: '#a78bca', shape: 'angular',  spin: -42, idleAmp: 5, idleDelay: 1.2  },
  { angle: 106, r: 0.35, size: 20, delay: 0.39, opacity: 0.32, color: '#6abcb8', shape: 'sparkle',  spin:  48, idleAmp: 8, idleDelay: 0.0  },
  { angle: 143, r: 0.43, size: 14, delay: 0.57, opacity: 0.22, color: '#c8a882', shape: 'sparkle',  spin: -18, idleAmp: 5, idleDelay: 1.8  },
  { angle: 182, r: 0.34, size: 16, delay: 0.46, opacity: 0.30, color: '#a78bca', shape: 'sparkle',  spin:  36, idleAmp: 6, idleDelay: 0.7  },
  { angle: 220, r: 0.41, size: 11, delay: 0.62, opacity: 0.18, color: '#7ba7c8', shape: 'angular',  spin: -58, idleAmp: 4, idleDelay: 1.3  },
  { angle: 258, r: 0.38, size: 19, delay: 0.49, opacity: 0.30, color: '#6abcb8', shape: 'sparkle',  spin:  42, idleAmp: 8, idleDelay: 0.4  },
  { angle: 296, r: 0.44, size: 13, delay: 0.64, opacity: 0.20, color: '#d0c8d8', shape: 'diamond',  spin: -28, idleAmp: 5, idleDelay: 1.0  },
  { angle: 325, r: 0.36, size: 15, delay: 0.51, opacity: 0.25, color: '#a78bca', shape: 'sparkle',  spin:  24, idleAmp: 6, idleDelay: 0.2  },
];

// ── SVG shapes ────────────────────────────────────────────────────
const SparkleShape: React.FC<{ size: number }> = ({ size }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    {/* 4-pointed lens / soft sparkle */}
    <path d="M12 2C12 7 17 12 22 12C17 12 12 17 12 22C12 17 7 12 2 12C7 12 12 7 12 2Z" />
  </svg>
);

const AngularShape: React.FC<{ size: number }> = ({ size }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    {/* Crisper 4-pointed star with concave sides */}
    <path d="M12 2L13.5 10.5L22 12L13.5 13.5L12 22L10.5 13.5L2 12L10.5 10.5Z" />
  </svg>
);

const DiamondShape: React.FC<{ size: number }> = ({ size }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    {/* Tall slender diamond */}
    <path d="M12 1L15 12L12 23L9 12Z M1 12L12 9L23 12L12 15Z" fillRule="evenodd" />
  </svg>
);

const StarSVG: React.FC<{ shape: StarShape; size: number }> = ({ shape, size }) => {
  if (shape === 'angular') return <AngularShape size={size} />;
  if (shape === 'diamond')  return <DiamondShape size={size} />;
  return <SparkleShape size={size} />;
};

// ── Individual animated star ───────────────────────────────────────
const StarParticle: React.FC<{ star: StarDef; minDim: number }> = ({ star, minDim }) => {
  const controls  = useAnimation();
  const rad       = (star.angle * Math.PI) / 180;
  const tx        = Math.cos(rad) * star.r * minDim;
  const ty        = Math.sin(rad) * star.r * minDim;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Phase 1: burst outward from centre
      await controls.start({
        x:       tx,
        y:       ty,
        opacity: star.opacity,
        scale:   1,
        rotate:  star.spin,
        transition: {
          delay:    star.delay,
          duration: 1.55,
          ease:     [0.16, 1, 0.3, 1],
          opacity:  { duration: 1.05, delay: star.delay, ease: 'easeOut' },
          scale: {
            duration: 1.25,
            delay:    star.delay,
            ease:     [0.34, 1.56, 0.64, 1], // spring overshoot
          },
          rotate: { duration: 1.45, delay: star.delay, ease: [0.16, 1, 0.3, 1] },
        },
      });
      if (cancelled) return;
      // Phase 2: gentle idle drift (loops forever)
      controls.start({
        y: [ty, ty - star.idleAmp, ty + star.idleAmp * 0.55, ty],
        opacity: [star.opacity, star.opacity * 1.18, star.opacity * 0.88, star.opacity],
        transition: {
          duration:   3.8 + star.idleDelay * 0.8,
          repeat:     Infinity,
          ease:       'easeInOut',
          delay:      star.idleDelay,
        },
      });
    };
    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx, ty]);

  return (
    <motion.div
      animate={controls}
      initial={{ x: 0, y: 0, opacity: 0, scale: 0, rotate: star.spin * -0.3 }}
      style={{
        position:    'absolute',
        left:        '50%',
        top:         '50%',
        marginLeft:  -(star.size / 2),
        marginTop:   -(star.size / 2),
        width:       star.size,
        height:      star.size,
        color:       star.color,
        pointerEvents: 'none',
      }}
    >
      <StarSVG shape={star.shape} size={star.size} />
    </motion.div>
  );
};

// ── Main StarBurst layer ───────────────────────────────────────────
const StarBurst: React.FC<{ minDim: number }> = ({ minDim }) => (
  <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
    {STARS.map((star, i) => (
      <StarParticle key={i} star={star} minDim={minDim} />
    ))}
  </div>
);

// ── Per-particle orbital data ──────────────────────────────────────
interface OrbitalSys {
  pts:    THREE.Points;
  geo:    THREE.BufferGeometry;
  pos:    Float32Array;
  phase:  Float32Array;
  radius: Float32Array;
  freqX:  Float32Array;
  freqY:  Float32Array;
  count:  number;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onBegin, activeConvId, onSelectFromArchive }) => {
  const mountRef   = useRef<HTMLDivElement>(null);
  const [textVisible, setTextVisible] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  // Viewport dims for star positioning
  const [minDim, setMinDim] = useState(() =>
    typeof window !== 'undefined'
      ? Math.min(window.innerWidth, window.innerHeight)
      : 900
  );

  useEffect(() => {
    const onResize = () => setMinDim(Math.min(window.innerWidth, window.innerHeight));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setTextVisible(true), 2400);
    return () => clearTimeout(t);
  }, []);

  // ── Three.js ambient animation ────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 1.2, 13);
    camera.lookAt(0, 0, 0);

    const cv  = document.createElement('canvas');
    cv.width  = 64; cv.height = 64;
    const ctx = cv.getContext('2d')!;
    const g   = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0,    'rgba(255,255,255,1)');
    g.addColorStop(0.28, 'rgba(255,255,255,0.60)');
    g.addColorStop(0.60, 'rgba(255,255,255,0.14)');
    g.addColorStop(1,    'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    const spriteTex = new THREE.CanvasTexture(cv);

    const makeSys = (
      color: number, count: number, size: number, opacity: number,
      rMin: number, rMax: number, freqBias = 1.0,
    ): OrbitalSys => {
      const pos    = new Float32Array(count * 3);
      const phase  = new Float32Array(count);
      const radius = new Float32Array(count);
      const freqX  = new Float32Array(count);
      const freqY  = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        phase[i]  = Math.random() * Math.PI * 2;
        freqX[i]  = 0.025 + Math.random() * 0.10;
        freqY[i]  = freqX[i] * (freqBias * 0.96 + Math.random() * 0.10);
        radius[i] = rMin + (rMax - rMin) * Math.pow(Math.random(), 0.65);
        pos[i * 3]     = Math.cos(phase[i]) * radius[i];
        pos[i * 3 + 1] = Math.sin(phase[i]) * radius[i];
        pos[i * 3 + 2] = (Math.random() - 0.5) * radius[i] * 0.8;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color, size, transparent: true, opacity,
        map: spriteTex, depthWrite: false,
        blending: THREE.NormalBlending, sizeAttenuation: true,
      });
      const pts = new THREE.Points(geo, mat);
      scene.add(pts);
      return { pts, geo, pos, phase, radius, freqX, freqY, count };
    };

    const updateSys = (sys: OrbitalSys, t: number, cx: number, cy: number) => {
      const { pos, phase, radius, freqX, freqY, count } = sys;
      for (let i = 0; i < count; i++) {
        const a = t * freqX[i] + phase[i];
        const b = t * freqY[i] + phase[i] * 1.6180;
        const r = radius[i];
        const stretch = 1 + 0.28 * Math.sin(phase[i] * 3.1);
        pos[i * 3]     = cx + r * Math.cos(a) * stretch;
        pos[i * 3 + 1] = cy + r * Math.sin(b) / Math.max(stretch, 0.55);
        pos[i * 3 + 2] = r * 0.48 * Math.sin(t * freqX[i] * 0.52 + phase[i] * 2.1);
      }
      (sys.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    };

    const A = 0xc05942;
    const aNucleus = makeSys(A, 24, 0.085, 0.72, 0.0, 0.75, 0.97);
    const aBody    = makeSys(A, 58, 0.165, 0.28, 0.3, 2.3,  0.95);
    const aHalo    = makeSys(A, 28, 0.310, 0.09, 1.3, 4.0,  0.93);

    const B = 0x5577a8;
    const bNucleus = makeSys(B, 20, 0.090, 0.66, 0.0, 0.90, 1.05);
    const bBody    = makeSys(B, 58, 0.165, 0.24, 0.4, 2.7,  1.06);
    const bHalo    = makeSys(B, 32, 0.310, 0.08, 1.5, 4.5,  1.07);

    const DUST_COUNT = 80;
    const dustPos   = new Float32Array(DUST_COUNT * 3);
    const dustHome  = new Float32Array(DUST_COUNT * 3);
    const dustPhase = new Float32Array(DUST_COUNT);
    const dustFreq  = new Float32Array(DUST_COUNT);
    const dustAmp   = new Float32Array(DUST_COUNT);

    for (let i = 0; i < DUST_COUNT; i++) {
      const hx = (Math.random() - 0.5) * 22;
      const hy = (Math.random() - 0.5) * 14;
      const hz = (Math.random() - 0.5) * 5;
      dustHome[i * 3] = hx; dustHome[i * 3 + 1] = hy; dustHome[i * 3 + 2] = hz;
      dustPos[i * 3]  = hx; dustPos[i * 3 + 1]  = hy; dustPos[i * 3 + 2]  = hz;
      dustPhase[i] = Math.random() * Math.PI * 2;
      dustFreq[i]  = 0.008 + Math.random() * 0.016;
      dustAmp[i]   = 0.4   + Math.random() * 0.8;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x999999, size: 0.065, transparent: true, opacity: 0.13,
      map: spriteTex, depthWrite: false,
      blending: THREE.NormalBlending, sizeAttenuation: true,
    });
    scene.add(new THREE.Points(dustGeo, dustMat));

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = Date.now() * 0.001;

      const approach = Math.sin(t * 0.17) * 1.30 + Math.sin(t * 0.41) * 0.32;
      const sway     = Math.sin(t * 0.23) * 0.45 + Math.cos(t * 0.37) * 0.18;
      const float_a  = Math.sin(t * 0.13) * 0.52 + Math.sin(t * 0.29) * 0.18;
      const float_b  = Math.cos(t * 0.13) * 0.52 - Math.cos(t * 0.29) * 0.18;

      const axCX = -2.5 + approach  + sway * 0.4;
      const axCY =        float_a   - sway * 0.25;
      const bxCX =  2.5 - approach  - sway * 0.4;
      const bxCY =        float_b   + sway * 0.25;

      updateSys(aNucleus, t, axCX, axCY);
      updateSys(aBody,    t, axCX, axCY);
      updateSys(aHalo,    t, axCX, axCY);
      updateSys(bNucleus, t, bxCX, bxCY);
      updateSys(bBody,    t, bxCX, bxCY);
      updateSys(bHalo,    t, bxCX, bxCY);

      for (let i = 0; i < DUST_COUNT; i++) {
        const p = dustPhase[i]; const f = dustFreq[i]; const a = dustAmp[i];
        dustPos[i * 3]     = dustHome[i * 3]     + a * Math.sin(t * f         + p);
        dustPos[i * 3 + 1] = dustHome[i * 3 + 1] + a * Math.cos(t * f * 1.31 + p);
      }
      (dustGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      camera.position.x = Math.sin(t * 0.038) * 0.55;
      camera.position.y = 1.2 + Math.sin(t * 0.055) * 0.35;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-white flex flex-col items-center justify-center overflow-hidden select-none">

      <ArchivePanel
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        activeConvId={activeConvId}
        onSelect={onSelectFromArchive}
      />

      {/* Three.js canvas — bottom of stack */}
      <div ref={mountRef} className="absolute inset-0 z-0" />

      {/* ── Star burst layer — sits above canvas, behind vignette ── */}
      <StarBurst minDim={minDim} />

      {/* Vignette — fades canvas edges AND outer stars softly */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background: [
            'radial-gradient(ellipse 85% 70% at 50% 50%,',
            '  transparent 8%,',
            '  rgba(250,249,247,0.55) 58%,',
            '  rgba(250,249,247,0.94) 100%)',
          ].join(' '),
        }}
      />

      {/* Content column */}
      <AnimatePresence>
        {textVisible && (
          <motion.div
            key="intro-text"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex flex-col items-center text-center px-6"
          >
            <p
              className="mb-7"
              style={{ fontFamily: "var(--font-body)", fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#a0a0a0' }}
            >
              TITLE
            </p>

            <h1
              className="tracking-tight mb-3 max-w-lg"
              style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 1.12, letterSpacing: '-0.01em', color: '#2a2a2a' }}
            >
              Many sides.<br />One conversation.
            </h1>
            <h1
              className="tracking-tight mb-10 max-w-lg"
              style={{ fontFamily: "var(--font-display)", fontWeight: 300, fontSize: 'clamp(24px, 3.5vw, 32px)', lineHeight: 1.22, color: '#9a9a9a' }}
            >
              Let's see what's really happening.
            </h1>

            <p
              className="mb-10 max-w-xs"
              style={{ fontFamily: "var(--font-body)", fontSize: '11px', letterSpacing: '0.04em', color: '#a0a0a0', lineHeight: 1.65 }}
            >
              By continuing, both participants consent to recording and AI analysis.
              Private to your session.
            </p>

            <button
              onClick={onBegin}
              className="pointer-events-auto flex items-center gap-3 px-9 py-3.5 rounded-full hover:bg-neutral-800 active:scale-[0.97] transition-all duration-300 cursor-pointer"
              style={{ fontFamily: "var(--font-body)", fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', background: '#1a1a1a', color: '#fff' }}
            >
              Begin Exploration
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setArchiveOpen(true)}
              className="pointer-events-auto mt-5 flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-neutral-400 hover:text-neutral-700 transition-colors duration-300 cursor-pointer group"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <Archive className="w-3 h-3 group-hover:text-neutral-700 transition-colors" />
              <span className="group-hover:underline underline-offset-[5px] decoration-neutral-400 group-hover:decoration-neutral-600">
                Archive
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type AxisId = 'x' | 'y' | 'z';

interface OrientationWidgetProps {
  cameraQuaternionRef: React.MutableRefObject<THREE.Quaternion>;
  highlightedAxis:     AxisId | null;
}

const AXIS_DEFS = [
  { id: 'x' as AxisId, world: new THREE.Vector3(1, 0, 0), color: '#b07868' },
  { id: 'y' as AxisId, world: new THREE.Vector3(0, 1, 0), color: '#607898' },
  { id: 'z' as AxisId, world: new THREE.Vector3(0, 0, 1), color: '#708870' },
] as const;

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

const SIZE    = 80;   // canvas px
const CX      = SIZE / 2;
const CY      = SIZE / 2;
const RADIUS  = 24;   // arrow shaft length in px
const RING    = 34;   // outer ring radius

export const OrientationWidget: React.FC<OrientationWidgetProps> = ({
  cameraQuaternionRef, highlightedAxis,
}) => {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const hlRef         = useRef<AxisId | null>(highlightedAxis);

  // Keep hlRef in sync without restarting the animation loop
  useEffect(() => { hlRef.current = highlightedAxis; }, [highlightedAxis]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    // Retina / HiDPI
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    canvas.width  = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.style.width  = `${SIZE}px`;
    canvas.style.height = `${SIZE}px`;
    ctx.scale(dpr, dpr);

    let animId: number;

    const draw = () => {
      animId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, SIZE, SIZE);

      const hl      = hlRef.current;
      const anyHl   = hl !== null;
      const quat    = cameraQuaternionRef.current;
      const invQuat = quat.clone().invert();

      // Project each world axis into camera space
      // camera space: +X = right, +Y = up, -Z = forward (into screen)
      const projected = AXIS_DEFS.map(({ id, world, color }) => {
        const cam = world.clone().applyQuaternion(invQuat);
        return {
          id,
          color,
          sx:    cam.x,        // screen right component
          sy:   -cam.y,        // screen down component (canvas Y flipped)
          depth: cam.z,        // positive = behind viewer, negative = in front
        };
      });

      // Sort back-to-front so front axes render on top
      projected.sort((a, b) => b.depth - a.depth);

      // Background ring
      ctx.beginPath();
      ctx.arc(CX, CY, RING, 0, Math.PI * 2);
      ctx.fillStyle   = 'rgba(255,255,255,0.84)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.07)';
      ctx.lineWidth   = 0.8;
      ctx.stroke();

      // Origin dot
      ctx.beginPath();
      ctx.arc(CX, CY, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fill();

      projected.forEach(({ id, color, sx, sy, depth }) => {
        const isHl   = hl === id;
        const isDim  = anyHl && !isHl;
        const alpha  = isHl ? 1.0 : isDim ? 0.28 : 0.72;
        const rgba   = hexToRgba(color, alpha);

        const ex = CX + sx * RADIUS;
        const ey = CY + sy * RADIUS;

        // Shaft
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = rgba;
        ctx.lineWidth   = isHl ? 2 : 1.4;
        ctx.stroke();

        // End marker:
        // depth < 0 = axis coming toward viewer → filled dot
        // depth > 0 = axis going away            → hollow circle  
        // near 0    = axis perpendicular to view  → small arrowhead
        const absDepth  = Math.abs(depth);
        const dotR      = isHl ? 3.8 : 2.8;
        const ringR     = isHl ? 3.2 : 2.4;

        ctx.beginPath();
        ctx.arc(ex, ey, depth < -0.15 ? dotR : ringR, 0, Math.PI * 2);
        if (depth < -0.15) {
          ctx.fillStyle = rgba;
          ctx.fill();
        } else {
          ctx.strokeStyle = rgba;
          ctx.lineWidth   = absDepth < 0.15 ? 1.6 : 0.9;
          ctx.stroke();
        }

        // Axis letter label, offset slightly beyond marker
        const lx = CX + sx * (RADIUS + 11);
        const ly = CY + sy * (RADIUS + 11);
        ctx.fillStyle  = hexToRgba(color, isHl ? 1.0 : isDim ? 0.28 : 0.78);
        ctx.font       = `${isHl ? 600 : 400} 8px system-ui, sans-serif`;
        ctx.textAlign  = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(id.toUpperCase(), lx, ly);
      });
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [cameraQuaternionRef]); // only re-run if the ref object itself changes

  return (
    <div className="flex flex-col items-end gap-1.5">
      <p style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#bbb' }}>
        View
      </p>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
};

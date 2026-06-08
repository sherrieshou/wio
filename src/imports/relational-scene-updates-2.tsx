The colors are still too light. The root cause is that `screen` blend mode washes out on a white background. Please make the following changes to `src/app/components/relational-scene.tsx`:

---

## Change 1: Revert blend mode back to source-over (screen doesn't work on white backgrounds)

Find:
```
  drawLayer(0.85, CX, CX, R, 1.0, asp1, 'screen');
```
Replace with:
```
  drawLayer(0.85, CX, CX, R, 1.0, asp1, 'source-over');
```

Find:
```
  drawLayer(0.55, CX + ox2, CX + oy2, R * 0.82, 1.0, asp2, 'screen');
```
Replace with:
```
  drawLayer(0.55, CX + ox2, CX + oy2, R * 0.82, 1.0, asp2, 'source-over');
```

Find:
```
  drawLayer(0.32, CX + ox3, CX + oy3, R * 1.18, 1.0, asp3, 'screen');
```
Replace with:
```
  drawLayer(0.32, CX + ox3, CX + oy3, R * 1.18, 1.0, asp3, 'source-over');
```

Find:
```
  p1.globalCompositeOperation = 'screen';
```
Replace with:
```
  p1.globalCompositeOperation = 'source-over';
```

---

## Change 2: Make SPEAKER_GRADIENT colors much more saturated and opaque

Find the entire SPEAKER_GRADIENT block and replace with:
```
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
};
```

---

## Change 3: Increase glow sprite opacity floors in the animation loop

Find:
```
          const mGlowOpMax    = glowOpacityMax * (0.76 + vGS * 0.24);       // floor 0.76 → never thin
```
Replace with:
```
          const mGlowOpMax    = glowOpacityMax * (0.90 + vGS * 0.10);       // floor 0.90 → strong glow
```

Find:
```
          const mHistGlow     = VIS.history.glow * (0.76 + vGS * 0.24);
```
Replace with:
```
          const mHistGlow     = VIS.history.glow * (0.90 + vGS * 0.10);
```

Find:
```
          const mNormGlow     = VIS.normalized.glow * (0.76 + vGS * 0.24);
```
Replace with:
```
          const mNormGlow     = VIS.normalized.glow * (0.90 + vGS * 0.10);
```

---

## Change 4: Increase VIS glow opacity values

Find:
```
  history:    { core: 0.82, scale: 1.0, glow: 0.96, glowScale: 1.05 },
  normalized: { core: 0.88, scale: 1.0, glow: 0.98, glowScale: 1.10 },
```
Replace with:
```
  history:    { core: 0.88, scale: 1.0, glow: 1.00, glowScale: 1.10 },
  normalized: { core: 0.92, scale: 1.0, glow: 1.00, glowScale: 1.15 },
```

---

## Change 5: Reduce BLUR so color isn't spread too thin

Find:
```
  const BLUR  = 120;
```
Replace with:
```
  const BLUR  = 80;
```
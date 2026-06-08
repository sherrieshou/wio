Please make the following code changes to `src/app/components/relational-scene.tsx`:

---

## Change 1: Replace SPEAKER_COLOR

Find this exact block:
```
const SPEAKER_COLOR: Record<string, number> = {
  teen: 0x7b5cc7,   // deeper vivid purple
  mom:  0x3578a8,   // deeper vivid blue
  dad:  0x5aadba,   // saturated teal (was too pale)
};
```

Replace with:
```
const SPEAKER_COLOR: Record<string, number> = {
  teen: 0x8B7BDA,   // matches teen-color-system center color
  mom:  0x3578a8,   // deeper vivid blue
  dad:  0xB7DCE5,   // matches dad-color-system center color
};
```

---

## Change 2: Replace SPEAKER_GRADIENT

Find this exact block (the entire SPEAKER_GRADIENT constant):
```
const SPEAKER_GRADIENT: Record<string, [number, number, number, number, number][]> = {
  teen: [
    [0.00, 123,  92, 199, 1.00],   // deep vivid purple core
    [0.15, 123,  92, 199, 1.00],
    [0.30, 139, 110, 210, 0.95],   // still very saturated purple
    [0.50, 150, 120, 215, 0.85],
    [0.65, 155, 128, 218, 0.65],
    [0.78, 160, 135, 220, 0.42],
    [0.90, 165, 140, 222, 0.18],
    [1.00, 165, 140, 222, 0.00],
  ],
  mom: [
    [0.00,  53, 120, 168, 1.00],   // deep vivid blue core
    [0.15,  53, 120, 168, 1.00],
    [0.30,  65, 132, 180, 0.95],   // still very saturated blue
    [0.50,  78, 142, 190, 0.85],
    [0.65,  88, 150, 198, 0.65],
    [0.78,  98, 158, 205, 0.42],
    [0.90, 108, 165, 210, 0.18],
    [1.00, 108, 165, 210, 0.00],
  ],
  dad: [
    [0.00,  60, 160, 175, 1.00],   // saturated teal core (NOT pale)
    [0.15,  60, 160, 175, 1.00],
    [0.30,  72, 170, 182, 0.95],   // still very saturated teal
    [0.50,  82, 178, 188, 0.85],
    [0.65,  90, 185, 193, 0.65],
    [0.78,  98, 190, 198, 0.42],
    [0.90, 105, 195, 202, 0.18],
    [1.00, 105, 195, 202, 0.00],
  ],
};
```

Replace with:
```
const SPEAKER_GRADIENT: Record<string, [number, number, number, number, number][]> = {
  teen: [
    [0.00, 139, 123, 218, 0.90],   // #8B7BDA core purple
    [0.25, 139, 123, 218, 0.70],   // #8B7BDA still purple
    [0.45, 230, 180, 234, 0.60],   // #E6B4EA pink-purple mid
    [0.70, 243, 235, 165, 0.35],   // #F3EBA5 warm yellow outer
    [0.90, 243, 235, 165, 0.12],   // #F3EBA5 fading
    [1.00, 243, 235, 165, 0.00],   // transparent edge
  ],
  mom: [
    [0.00,  53, 120, 168, 0.90],
    [0.25,  53, 120, 168, 0.70],
    [0.50,  88, 160, 210, 0.55],
    [0.75, 140, 195, 230, 0.30],
    [0.90, 160, 210, 240, 0.10],
    [1.00, 160, 210, 240, 0.00],
  ],
  dad: [
    [0.00, 183, 220, 229, 0.90],   // #B7DCE5 light teal core
    [0.25, 183, 220, 229, 0.70],   // #B7DCE5
    [0.50, 240, 255, 197, 0.60],   // #F0FFC5 yellow-green mid
    [0.75, 215, 235, 171, 0.35],   // #D7EBAB grass green outer
    [1.00, 215, 235, 171, 0.00],   // transparent edge
  ],
};
```

---

## Change 3: Update BLUR value

Find:
```
  const BLUR  = 72;
```

Replace with:
```
  const BLUR  = 120;
```

---

## Change 4: Update the three drawLayer calls and their blend modes

Find this exact block (the three drawLayer calls plus the blur reinforcement composite):
```
  // Dense atmospheric blob: solid opaque core, strong mid/outer layers
  // All layers use source-over (NOT lighter) to preserve color saturation
  // Layer 1: core — full density, solid color center
  const asp1 = 0.95 + rng() * 0.20;
  drawLayer(1.00, CX, CX, R, 1.0, asp1, 'source-over');

  // Layer 2: mid glow — strong color presence (source-over keeps saturation)
  const ox2  = (rng() - 0.5) * 30;
  const oy2  = (rng() - 0.5) * 26;
  const asp2 = 0.88 + rng() * 0.25;
  drawLayer(0.90, CX + ox2, CX + oy2, R * 0.85, 1.0, asp2, 'source-over');

  // Layer 3: outer glow — extends the cloud, still saturated
  const ox3  = (rng() - 0.5) * 40;
  const oy3  = (rng() - 0.5) * 34;
  const asp3 = 0.90 + rng() * 0.30;
  drawLayer(0.75, CX + ox3, CX + oy3, R * 1.12, 1.0, asp3, 'source-over');
```

Replace with:
```
  // Organic blob: screen blend creates luminous glow layering
  // Layer 1: core — main identity glow
  const asp1 = 0.95 + rng() * 0.20;
  drawLayer(0.85, CX, CX, R, 1.0, asp1, 'screen');

  // Layer 2: mid glow — organic asymmetry
  const ox2  = (rng() - 0.5) * 30;
  const oy2  = (rng() - 0.5) * 26;
  const asp2 = 0.88 + rng() * 0.25;
  drawLayer(0.55, CX + ox2, CX + oy2, R * 0.82, 1.0, asp2, 'screen');

  // Layer 3: outer glow — ambient color spread
  const ox3  = (rng() - 0.5) * 40;
  const oy3  = (rng() - 0.5) * 34;
  const asp3 = 0.90 + rng() * 0.30;
  drawLayer(0.32, CX + ox3, CX + oy3, R * 1.18, 1.0, asp3, 'screen');
```

---

## Change 5: Update blur reinforcement composite mode

Find:
```
  // Reinforce: composite original (sharp) back at high alpha
  // This keeps the center solid/opaque through the blur
  p1.globalCompositeOperation = 'source-over';
```

Replace with:
```
  // Reinforce: screen composite keeps luminous glow quality through blur
  p1.globalCompositeOperation = 'screen';
```
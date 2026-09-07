import { NOTE_PALETTE, hexToRgb01 } from "@/lib/notePalette";

// NOTE_PALETTE as a GLSL ramp: noteHue(t), t 0..1, one stop per key.
// Own module to avoid an import cycle through index.ts → presets → fragments.
const stops = NOTE_PALETTE.map((hex, i) => {
  const [r, g, b] = hexToRgb01(hex);
  return `  vec3 c${i} = vec3(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)});`;
}).join("\n");

const last = NOTE_PALETTE.length - 1;

// Branches, not an array: GLSL ES 1.00 can't index arrays dynamically.
const branches = NOTE_PALETTE.slice(0, last)
  .map((_, i) =>
    `  ${i === 0 ? "if" : "else if"} (i < ${(i + 0.5).toFixed(1)}) return mix(c${i}, c${i + 1}, f);`,
  )
  .join("\n");

export const NOTE_HUE_GLSL = /* glsl */ `
vec3 noteHue(float t) {
  float x = clamp(t, 0.0, 1.0) * ${last.toFixed(1)};
  float i = floor(x);
  float f = smoothstep(0.0, 1.0, fract(x));
${stops}
${branches}
  else return c${last};  // t == 1.0
}
`;

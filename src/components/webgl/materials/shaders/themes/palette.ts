import { NOTE_PALETTE, hexToRgb01 } from "@/lib/notePalette";

/**
 * The note palette as a GLSL chunk — one stop per playable key, compiled from
 * `NOTE_PALETTE` so the colour a cap shows and the colour the background throws
 * are literally the same list.
 *
 * Interpolate it into a fragment source and call `noteHue(t)` with a 0..1
 * position on the ramp; `uNoteFreqNorms` carries one per sounding voice, and
 * `noteColorNorm()` puts each note exactly on its own stop — the mixes below
 * collapse to the stop colour at those values, so a played note is its key's
 * colour and nothing else. Feeding it a value between stops (Rhythm sweeps the
 * ribbon that way) still reads as a continuous gradient.
 *
 * Shared as a chunk rather than duplicated per theme, so themes that are meant
 * to look related cannot drift apart.
 *
 * Kept in its own module: `themes/index.ts` would be the natural home, but it
 * imports the presets, which import the fragments, which would import it back.
 */
const stops = NOTE_PALETTE.map((hex, i) => {
  const [r, g, b] = hexToRgb01(hex);
  return `  vec3 c${i} = vec3(${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)});`;
}).join("\n");

const last = NOTE_PALETTE.length - 1;

// One branch per segment. An array + dynamic index would be shorter, but GLSL
// ES 1.00 — which is what Three compiles these to — has no array constructors
// and won't index an array with a non-constant expression.
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
  // t == 1.0 exactly: x lands past the last segment, so there's nothing left to
  // mix toward.
  else return c${last};
}
`;

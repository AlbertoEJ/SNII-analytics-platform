export type PaletteName = "state" | "area" | "institution";

// Single-hue palettes expressed as [lightest HSL, darkest HSL] pairs.
// Shading is interpolated between the two endpoints based on ratio in [0, 1].
const PALETTES: Record<PaletteName, { light: [number, number, number]; dark: [number, number, number] }> = {
  state:       { light: [212, 85, 92], dark: [212, 90, 42] }, // blue
  area:        { light: [160, 55, 90], dark: [160, 70, 32] }, // green/teal
  institution: { light: [270, 55, 92], dark: [270, 70, 45] }, // violet
};

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Returns an HSL color string for a palette, with lightness/saturation mixed
 * between its "light" and "dark" endpoints based on ratio.
 *
 * ratio = 1 → darkest (top of the list)
 * ratio = 0 → lightest (bottom of the list)
 *
 * Consumers should pass `count / maxCountInList` as the ratio.
 */
export function intensityShade(palette: PaletteName, ratio: number): string {
  const t = clamp(ratio, 0, 1);
  const p = PALETTES[palette];
  const h = lerp(p.light[0], p.dark[0], t);
  const s = lerp(p.light[1], p.dark[1], t);
  const l = lerp(p.light[2], p.dark[2], t);
  return `hsl(${h.toFixed(0)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`;
}

/** The solid "anchor" color for a palette — used for treemap tiles, headline accents, etc. */
export function paletteAnchor(palette: PaletteName): string {
  return intensityShade(palette, 1);
}

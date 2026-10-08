// Dimensions, floorplan and scroll choreography for the hero chip.
// Units: 1 unit = 2.5 mm, so the 4-unit package is a 10 mm LQFP-64.

import type { DieBlockId } from "@/content/experience";

/**
 * Scene background and fog: a deep charcoal stage in both page themes. ACES tone
 * mapping darkens it, so this renders as --stage (#121214); sampled to check.
 */
export const BG = "#242426";

export const PKG = {
  half: 2.0,
  standoff: 0.06,
  parting: 0.32, // base top / lid bottom; leads exit the mold here
  top: 0.62,
  leadsPerSide: 16,
  pitch: 0.2,
  leadWidth: 0.085,
  leadThickness: 0.032,
  padInner: 2.2,
  padOuter: 2.6,
  padWidth: 0.13,
} as const;

export const DIE = {
  half: 0.95,
  paddleTop: 0.332,
  top: 0.378,
  padPitch: 0.105,
  padInset: 0.062,
  fingerTip: 1.22,
  fingerTipPitch: 0.15,
} as const;

/** Lateral offset of lead `i` (0..15) along its side. */
export const leadOffset = (i: number) => (i - (PKG.leadsPerSide - 1) / 2) * PKG.pitch;

/**
 * Frame for package side k (0:+x, 1:+z, 2:-x, 3:-z).
 * World XZ = a * out + b * lat; objects modelled along local +X use rotation.y = rotY.
 */
export function sideFrame(k: number) {
  const th = (k * Math.PI) / 2;
  const c = Math.round(Math.cos(th));
  const s = Math.round(Math.sin(th));
  return {
    rotY: -th,
    toWorld: (a: number, b: number): [number, number] => [a * c - b * s, a * s + b * c],
  };
}

// ---------------------------------------------------------------------------
// Die floorplan, normalised [0..1] die coordinates (u → +x, v → +z).
// The four highlighted blocks map one-to-one to the industry roles.
// ---------------------------------------------------------------------------
export type Rect = [u0: number, v0: number, u1: number, v1: number];

// `color` is the dark-theme step, used in the 3D die (always dark); `cat` is the
// matching CSS variable for page UI, which switches steps with the theme.
export const BLOCKS: Record<DieBlockId, { rect: Rect; color: string; cat: string; etch: string }> = {
  riscv: { rect: [0.12, 0.12, 0.47, 0.46], color: "#de3951", cat: "var(--cat-1)", etch: "RV32IM CORE" },
  cnn: { rect: [0.52, 0.12, 0.88, 0.5], color: "#c48300", cat: "var(--cat-2)", etch: "PE ARRAY 16x16" },
  ddr4: { rect: [0.12, 0.76, 0.88, 0.88], color: "#906eb5", cat: "var(--cat-3)", etch: "DDR4 PHY x16" },
  bridge: { rect: [0.52, 0.54, 0.66, 0.7], color: "#0e8c6d", cat: "var(--cat-4)", etch: "AHB2APB" },
};

export const SUPPORT_BLOCKS: Record<string, Rect> = {
  sram0: [0.12, 0.5, 0.29, 0.71],
  sram1: [0.31, 0.5, 0.47, 0.71],
  periph: [0.68, 0.54, 0.88, 0.71],
};

export function uvToWorld(u: number, v: number): [number, number] {
  return [(u - 0.5) * 2 * DIE.half, (v - 0.5) * 2 * DIE.half];
}

export function blockCenter(id: DieBlockId): [number, number, number] {
  const [u0, v0, u1, v1] = BLOCKS[id].rect;
  const [x, z] = uvToWorld((u0 + u1) / 2, (v0 + v1) / 2);
  return [x, DIE.top, z];
}

export function blockSize(id: DieBlockId): [number, number] {
  const [u0, v0, u1, v1] = BLOCKS[id].rect;
  return [(u1 - u0) * 2 * DIE.half, (v1 - v0) * 2 * DIE.half];
}

// ---------------------------------------------------------------------------
// Scroll choreography (hero progress 0..1)
// ---------------------------------------------------------------------------
export const PHASE = {
  introEnd: 0.1, // hero copy fades out
  decapStart: 0.14,
  lidGone: 0.4,
  dieOverview: 0.44,
  outroStart: 0.9,
} as const;

/** Spotlight windows on the die, newest role first. */
export const STAGES: { block: DieBlockId; start: number; end: number }[] = [
  { block: "riscv", start: 0.48, end: 0.585 },
  { block: "cnn", start: 0.585, end: 0.69 },
  { block: "ddr4", start: 0.69, end: 0.795 },
  { block: "bridge", start: 0.795, end: 0.9 },
];

import { mulberry32 } from "./rng";
import { BLOCKS, DIE, PKG, SUPPORT_BLOCKS, sideFrame, type Rect } from "./spec";

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type PaintTarget = HTMLCanvasElement | OffscreenCanvas;
type Box = [x: number, y: number, w: number, h: number];

/**
 * Paints the die floorplan into three canvases:
 *  map – albedo, rm – roughness (G) / metalness (B), em – emissive mask.
 * Everything is authored at 2048px and scaled by `k` for other sizes.
 * Pure 2D-canvas code (no three.js) so it can run inside a Web Worker.
 */
export function paintDie(size: number, make: (size: number) => PaintTarget): [PaintTarget, PaintTarget, PaintTarget] {
  const S = size;
  const k = S / 2048;
  const rand = mulberry32(2026);

  const cMap = make(S);
  const cRm = make(S);
  const cEm = make(S);
  const g = cMap.getContext("2d") as Ctx;
  const r = cRm.getContext("2d") as Ctx;
  const e = cEm.getContext("2d") as Ctx;

  const box = (rc: Rect): Box => [rc[0] * S, rc[1] * S, (rc[2] - rc[0]) * S, (rc[3] - rc[1]) * S];
  const rm = (rough: number, metal: number) => `rgb(0,${Math.round(rough * 255)},${Math.round(metal * 255)})`;

  // 1. substrate ---------------------------------------------------------
  g.fillStyle = "#161616";
  g.fillRect(0, 0, S, S);
  r.fillStyle = rm(0.5, 0.25);
  r.fillRect(0, 0, S, S);
  e.fillStyle = "#000";
  e.fillRect(0, 0, S, S);

  const core: Rect = [0.105, 0.105, 0.895, 0.895];
  const coreBox = box(core);

  // 2. sea of standard cells (glue logic) --------------------------------
  stdCells(g, coreBox, 7 * k, ["#252525", "#2a2a2a", "#222222", "#2d2d2d", "#202020"], rand, k);
  rails(g, r, coreBox, 7 * k, k, rm(0.32, 0.9));

  // 3. macros -------------------------------------------------------------
  for (const id of ["sram0", "sram1"] as const) sram(g, r, box(SUPPORT_BLOCKS[id]), rand, k, rm);
  riscv(g, r, e, box(BLOCKS.riscv.rect), rand, k, rm);
  cnn(g, r, e, box(BLOCKS.cnn.rect), rand, k, rm);
  ddr4(g, r, e, box(BLOCKS.ddr4.rect), rand, k, rm);

  const br = box(BLOCKS.bridge.rect);
  stdCells(g, br, 5 * k, ["#1f3a2e", "#244435", "#1b3328", "#29503c"], rand, k);
  rails(g, r, br, 5 * k, k, rm(0.32, 0.9));
  const pe = box(SUPPORT_BLOCKS.periph);
  stdCells(g, pe, 6 * k, ["#2a2a2a", "#303030", "#262626"], rand, k);
  rails(g, r, pe, 6 * k, k, rm(0.32, 0.9));

  // block outlines (+ faint emissive outline in the block's colour)
  for (const b of Object.values(BLOCKS)) {
    const [x, y, w, h] = box(b.rect);
    g.strokeStyle = "rgba(205,205,205,0.55)";
    g.lineWidth = 2.2 * k;
    g.strokeRect(x, y, w, h);
    e.strokeStyle = hexA(b.color, 0.55);
    e.lineWidth = 3 * k;
    e.strokeRect(x, y, w, h);
  }
  for (const rc of Object.values(SUPPORT_BLOCKS)) {
    const [x, y, w, h] = box(rc);
    g.strokeStyle = "rgba(205,205,205,0.4)";
    g.lineWidth = 2 * k;
    g.strokeRect(x, y, w, h);
  }

  // 4. top-metal power straps over the whole core ------------------------
  for (let x = coreBox[0] + 38 * k; x < coreBox[0] + coreBox[2]; x += 104 * k) {
    g.fillStyle = "rgba(190,190,190,0.3)";
    g.fillRect(x, coreBox[1], 9 * k, coreBox[3]);
    r.fillStyle = rm(0.4, 0.6);
    r.fillRect(x, coreBox[1], 9 * k, coreBox[3]);
  }
  for (let y = coreBox[1] + 52 * k; y < coreBox[1] + coreBox[3]; y += 128 * k) {
    g.fillStyle = "rgba(190,190,190,0.2)";
    g.fillRect(coreBox[0], y, coreBox[2], 7 * k);
    r.fillStyle = rm(0.42, 0.55);
    r.fillRect(coreBox[0], y, coreBox[2], 7 * k);
  }

  // 5. core power rings, I/O ring, bond pads, seal ring ------------------
  for (const [inset, col] of [
    [-10, "#929292"],
    [-28, "#7a7a7a"],
  ] as const) {
    const lw = 12 * k;
    g.strokeStyle = col;
    g.lineWidth = lw;
    g.strokeRect(coreBox[0] + inset * k, coreBox[1] + inset * k, coreBox[2] - 2 * inset * k, coreBox[3] - 2 * inset * k);
    r.strokeStyle = rm(0.22, 1);
    r.lineWidth = lw;
    r.strokeRect(coreBox[0] + inset * k, coreBox[1] + inset * k, coreBox[2] - 2 * inset * k, coreBox[3] - 2 * inset * k);
  }

  const padHalf = 0.031 * S;
  const mid = (PKG.leadsPerSide - 1) / 2;
  for (let side = 0; side < 4; side++) {
    const f = sideFrame(side);
    for (let j = 0; j < PKG.leadsPerSide; j++) {
      const m = j - mid;
      const [px, pz] = f.toWorld(DIE.half - DIE.padInset, m * DIE.padPitch);
      const [cx, cz] = f.toWorld(DIE.half - 0.15, m * DIE.padPitch);
      const u = (px / (2 * DIE.half) + 0.5) * S;
      const v = (pz / (2 * DIE.half) + 0.5) * S;
      const iu = (cx / (2 * DIE.half) + 0.5) * S;
      const iv = (cz / (2 * DIE.half) + 0.5) * S;
      // I/O driver cell between pad and core
      g.fillStyle = "#2c2c2c";
      g.fillRect(iu - padHalf * 0.9, iv - padHalf * 0.9, padHalf * 1.8, padHalf * 1.8);
      g.fillStyle = "#363636";
      for (let s = 0; s < 6; s++) {
        const o = -padHalf * 0.8 + s * padHalf * 0.3;
        if (side % 2 === 0) g.fillRect(iu - padHalf * 0.9, iv + o, padHalf * 1.8, padHalf * 0.12);
        else g.fillRect(iu + o, iv - padHalf * 0.9, padHalf * 0.12, padHalf * 1.8);
      }
      // bond pad: bare aluminium with passivation opening
      g.fillStyle = "#c8c8c8";
      g.fillRect(u - padHalf, v - padHalf, padHalf * 2, padHalf * 2);
      g.fillStyle = "#b0b0b0";
      g.fillRect(u - padHalf + 6 * k, v - padHalf + 6 * k, padHalf * 2 - 12 * k, padHalf * 2 - 12 * k);
      r.fillStyle = rm(0.18, 1);
      r.fillRect(u - padHalf, v - padHalf, padHalf * 2, padHalf * 2);
    }
  }

  g.strokeStyle = "#949494";
  g.lineWidth = 5 * k;
  g.strokeRect(7 * k, 7 * k, S - 14 * k, S - 14 * k);
  g.lineWidth = 3 * k;
  g.strokeRect(17 * k, 17 * k, S - 34 * k, S - 34 * k);
  r.strokeStyle = rm(0.2, 1);
  r.lineWidth = 16 * k;
  r.strokeRect(10 * k, 10 * k, S - 20 * k, S - 20 * k);

  // 6. etched labels + chip art --------------------------------------------
  g.fillStyle = "rgba(222,222,222,0.85)";
  g.textBaseline = "top";
  g.font = `bold ${Math.round(17 * k)}px monospace`;
  for (const b of Object.values(BLOCKS)) {
    const [x, y] = box(b.rect);
    g.fillText(b.etch, x + 10 * k, y + 9 * k);
  }
  g.font = `bold ${Math.round(14 * k)}px monospace`;
  g.fillText("SRAM 16KB", box(SUPPORT_BLOCKS.sram0)[0] + 8 * k, box(SUPPORT_BLOCKS.sram0)[1] + 8 * k);
  g.fillText("SRAM 16KB", box(SUPPORT_BLOCKS.sram1)[0] + 8 * k, box(SUPPORT_BLOCKS.sram1)[1] + 8 * k);
  g.fillText("APB PERIPH", box(SUPPORT_BLOCKS.periph)[0] + 8 * k, box(SUPPORT_BLOCKS.periph)[1] + 8 * k);

  g.font = `bold ${Math.round(13 * k)}px monospace`;
  g.fillStyle = "rgba(222,222,222,0.7)";
  g.fillText("VP-SILICON  ·  VAISHNAVI PATIL  ·  NEU 2026  ·  RTL>GDSII", coreBox[0] + 14 * k, 0.9 * S - 2 * k);

  return [cMap, cRm, cEm];
}

// ---------------------------------------------------------------------------
// painters
// ---------------------------------------------------------------------------
function stdCells(g: Ctx, [x, y, w, h]: Box, rowH: number, palette: string[], rand: () => number, k: number) {
  for (let yy = y; yy < y + h - 1; yy += rowH) {
    const hh = Math.min(rowH - 1.3 * k, y + h - yy);
    let xx = x;
    while (xx < x + w) {
      const cw = (2.5 + rand() * 11) * k;
      g.fillStyle = palette[(rand() * palette.length) | 0];
      g.fillRect(xx, yy, Math.max(0.5, Math.min(cw, x + w - xx) - 0.7 * k), hh);
      xx += cw;
    }
  }
}

function rails(g: Ctx, r: Ctx, [x, y, w, h]: Box, rowH: number, k: number, metal: string) {
  for (let yy = y + rowH - 1.3 * k; yy < y + h; yy += rowH) {
    g.fillStyle = "#4a4a4a";
    g.fillRect(x, yy, w, 1.3 * k);
    r.fillStyle = metal;
    r.fillRect(x, yy, w, 1.3 * k);
  }
}

function grid(g: Ctx, [x, y, w, h]: Box, step: number, base: string, line: string, dark: string, k: number) {
  g.fillStyle = base;
  g.fillRect(x, y, w, h);
  g.fillStyle = line;
  for (let xx = x; xx < x + w; xx += step) g.fillRect(xx, y, 1.6 * k, h);
  g.fillStyle = dark;
  for (let yy = y; yy < y + h; yy += step) g.fillRect(x, yy, w, 1.3 * k);
}

function sram(g: Ctx, r: Ctx, b: Box, rand: () => number, k: number, rm: (a: number, m: number) => string) {
  const [x, y, w, h] = b;
  grid(g, [x, y, w, h * 0.88], 4 * k, "#2e2e2e", "#383838", "rgba(20,20,20,0.55)", k);
  stdCells(g, [x + w * 0.46, y, w * 0.08, h * 0.88], 4 * k, ["#3e3e3e", "#474747", "#363636"], rand, k);
  stdCells(g, [x, y + h * 0.88, w, h * 0.12], 4 * k, ["#3e3e3e", "#474747", "#333333"], rand, k);
  r.fillStyle = rm(0.36, 0.5);
  r.fillRect(x, y, w, h);
}

function riscv(g: Ctx, r: Ctx, e: Ctx, b: Box, rand: () => number, k: number, rm: (a: number, m: number) => string) {
  const [x, y, w, h] = b;
  stdCells(g, b, 6 * k, ["#2e2224", "#35262a", "#291e20", "#3b2a2e", "#2f2326"], rand, k);
  rails(g, r, b, 6 * k, k, rm(0.32, 0.9));
  // register file + instruction / data caches
  const rf: Box = [x + w * 0.05, y + h * 0.1, w * 0.3, h * 0.24];
  const ic: Box = [x + w * 0.66, y + h * 0.1, w * 0.29, h * 0.36];
  const dc: Box = [x + w * 0.66, y + h * 0.52, w * 0.29, h * 0.36];
  for (const m of [rf, ic, dc]) {
    grid(g, m, 4 * k, "#3d2a2e", "#4a3237", "rgba(30,16,18,0.5)", k);
    g.strokeStyle = "rgba(240,200,205,0.45)";
    g.lineWidth = 1.6 * k;
    g.strokeRect(...m);
    r.fillStyle = rm(0.36, 0.5);
    r.fillRect(...m);
  }
  // 32 bit-slices of the ALU datapath
  const dp: Box = [x + w * 0.05, y + h * 0.58, w * 0.56, h * 0.32];
  const n = 32;
  const sw = dp[2] / n;
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? "#40292d" : "#4a2f34";
    g.fillRect(dp[0] + i * sw, dp[1], sw - 1.2 * k, dp[3]);
    g.fillStyle = "rgba(255,220,225,0.18)";
    for (let s = 0; s < 6; s++) g.fillRect(dp[0] + i * sw, dp[1] + (s + 0.5) * (dp[3] / 6), sw - 1.2 * k, 2 * k);
  }
  e.fillStyle = "rgba(222,57,81,0.2)";
  e.fillRect(...dp);
}

function cnn(g: Ctx, r: Ctx, e: Ctx, b: Box, rand: () => number, k: number, rm: (a: number, m: number) => string) {
  const [x, y, w, h] = b;
  g.fillStyle = "#1a1812";
  g.fillRect(x, y, w, h);
  const n = 16;
  const gap = 3.4 * k;
  const tw = (w - gap * (n + 1)) / n;
  const th = (h - gap * (n + 1)) / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const tx = x + gap + i * (tw + gap);
      const ty = y + gap + j * (th + gap);
      stdCells(g, [tx, ty, tw, th], 3.4 * k, ["#3b3224", "#43392a", "#352d20"], rand, k);
      g.fillStyle = "#5a4b2e";
      g.fillRect(tx + tw * 0.08, ty + th * 0.1, tw * 0.5, th * 0.5); // multiplier
      g.fillStyle = "#6e5c34";
      g.fillRect(tx + tw * 0.68, ty + th * 0.1, tw * 0.2, th * 0.8); // accumulator
      e.fillStyle = "rgba(230,160,40,0.2)";
      e.fillRect(tx + tw * 0.08, ty + th * 0.1, tw * 0.5, th * 0.5);
    }
  }
  // systolic links between neighbouring PEs
  g.fillStyle = "rgba(214,182,120,0.45)";
  for (let i = 1; i < n; i++) {
    g.fillRect(x + i * (tw + gap) + gap * 0.25, y, gap * 0.5, h);
    g.fillRect(x, y + i * (th + gap) + gap * 0.25, w, gap * 0.5);
  }
  r.fillStyle = rm(0.4, 0.4);
  r.fillRect(x, y, w, h);
}

function ddr4(g: Ctx, r: Ctx, e: Ctx, b: Box, rand: () => number, k: number, rm: (a: number, m: number) => string) {
  const [x, y, w, h] = b;
  g.fillStyle = "#1f1a26";
  g.fillRect(x, y, w, h);
  // DLL / PLL: concentric analog structure on the left
  const pw = w * 0.075;
  for (let i = 0; i < 6; i++) {
    g.strokeStyle = i % 2 ? "#4a3f5c" : "#625478";
    g.lineWidth = 3 * k;
    const inset = 6 * k + i * 7 * k;
    g.strokeRect(x + inset, y + inset, pw - 2 * inset, h - 2 * inset);
  }
  // 16 DQ slices: driver fingers / delay line / logic
  const n = 16;
  const sx = x + pw + 6 * k;
  const sw = (w - pw - 6 * k) / n;
  for (let i = 0; i < n; i++) {
    const ox = sx + i * sw;
    for (let f = 0; f < 7; f++) {
      g.fillStyle = f % 2 ? "#33293f" : "#4a3c5c";
      g.fillRect(ox + 4 * k + f * ((sw - 10 * k) / 7), y + 5 * k, (sw - 10 * k) / 7 - 1.5 * k, h * 0.42);
    }
    for (let s = 0; s < 8; s++) {
      g.fillStyle = s % 2 ? "#2c2436" : "#3d3250";
      g.fillRect(ox + 4 * k, y + h * 0.5 + s * 3.2 * k, sw - 10 * k, 2 * k);
    }
    stdCells(g, [ox + 4 * k, y + h * 0.76, sw - 10 * k, h * 0.2], 3.5 * k, ["#2b2335", "#342a40", "#241d2c"], rand, k);
    e.fillStyle = "rgba(160,120,205,0.2)";
    e.fillRect(ox + 4 * k, y + 5 * k, sw - 10 * k, h * 0.42);
  }
  r.fillStyle = rm(0.34, 0.6);
  r.fillRect(x, y, w, h);
}

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

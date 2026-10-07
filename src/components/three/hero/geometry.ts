import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { mulberry32 } from "./rng";
import { DIE, PKG, leadOffset, sideFrame } from "./spec";


// ---------------------------------------------------------------------------
// Gull-wing lead: a side profile swept across the lead width.
// Local frame: x = distance out from the package face, y = height.
// ---------------------------------------------------------------------------
export function createLeadGeometry() {
  const t = PKG.leadThickness;
  const y0 = PKG.parting;
  const foot = t / 2;

  // The control points keep each bend tangent-continuous with the steep leg.
  const path = new THREE.Path();
  path.moveTo(-0.08, y0);
  path.lineTo(0.08, y0);
  path.quadraticCurveTo(0.1585, y0, 0.175, 0.25);
  path.lineTo(0.215, 0.08);
  path.quadraticCurveTo(0.2301, foot, 0.29, foot);
  path.lineTo(0.5, foot);

  const pts = path.getSpacedPoints(72);
  const outer: THREE.Vector2[] = [];
  const inner: THREE.Vector2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    outer.push(new THREE.Vector2(pts[i].x + (nx * t) / 2, pts[i].y + (ny * t) / 2));
    inner.push(new THREE.Vector2(pts[i].x - (nx * t) / 2, pts[i].y - (ny * t) / 2));
  }
  const shape = new THREE.Shape([...outer, ...inner.reverse()]);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: PKG.leadWidth,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1,
  });
  geo.translate(0, 0, -PKG.leadWidth / 2);
  return geo;
}

/** Instance matrices for all 64 leads (also reused for solder pads). */
export function leadMatrices(a: number) {
  const out: THREE.Matrix4[] = [];
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  for (let k = 0; k < 4; k++) {
    const f = sideFrame(k);
    q.setFromAxisAngle(up, f.rotY);
    for (let i = 0; i < PKG.leadsPerSide; i++) {
      const [x, z] = f.toWorld(a, leadOffset(i));
      out.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), q.clone(), new THREE.Vector3(1, 1, 1)));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// PCB escape routing. Each lead leaves straight, jogs 45° outward (outer
// leads jog first, so the fan-out never crosses), then runs straight again.
// ---------------------------------------------------------------------------
export type Trace = { pts: [number, number][]; seed: number; width: number };
export type Via = { x: number; z: number; r: number };

export function routeBoard(seed = 11) {
  const rand = mulberry32(seed);
  const traces: Trace[] = [];
  const vias: Via[] = [];
  const n = PKG.leadsPerSide;
  const mid = (n - 1) / 2;
  const r0 = PKG.padInner + 0.06;
  const rPad = PKG.padOuter;
  const d0 = 0.14;
  const dStep = 0.1;
  const e = d0 + mid * dStep + 0.18;

  for (let k = 0; k < 4; k++) {
    const f = sideFrame(k);
    for (let i = 0; i < n; i++) {
      const s = leadOffset(i);
      const m = Math.abs(i - mid);
      const sigma = Math.sign(s);
      const d = d0 + (mid - m) * dStep;
      const lat = s + sigma * (e - d);

      let end: number;
      if (k === 0) end = 6.08; // memory bus into the DDR4 package
      else if (k === 2) end = 9.5 + rand() * 4; // long runs into the fog
      else end = rPad + e + 0.45 + (i % 2) * 0.42 + rand() * 1.6;

      const local: [number, number][] = [
        [r0, s],
        [rPad + d, s],
        [rPad + e, lat],
        [end, lat],
      ];
      traces.push({ pts: local.map(([a, b]) => f.toWorld(a, b)), seed: rand(), width: 0.05 });
      if (k === 1 || k === 3) {
        const [x, z] = f.toWorld(end, lat);
        vias.push({ x, z, r: 0.07 });
      }
    }
  }

  // A few wider power traces + stitched vias in the free corner quadrants.
  const corner = (sx: number, sz: number) => {
    for (let j = 0; j < 3; j++) {
      const a = 3.0 + j * 0.42;
      traces.push({
        pts: [
          [sx * a, sz * 2.7],
          [sx * a, sz * (3.3 + j * 0.25)],
          [sx * (a + 0.9), sz * (4.2 + j * 0.25)],
        ],
        seed: rand(),
        width: 0.09,
      });
      vias.push({ x: sx * a, z: sz * 2.7, r: 0.085 });
      vias.push({ x: sx * (a + 0.9), z: sz * (4.2 + j * 0.25), r: 0.085 });
    }
  };
  corner(-1, -1);
  corner(1, -1);

  return { traces, vias };
}

/**
 * Flat ribbon mesh for many polylines (one draw call). Attributes:
 * aDist = distance along the trace, aSide = -1..1 across it, aSeed = per-trace random.
 */
export function buildRibbons(traces: Trace[], y: number) {
  const pos: number[] = [];
  const dist: number[] = [];
  const side: number[] = [];
  const seed: number[] = [];
  const idx: number[] = [];
  let base = 0;

  for (const tr of traces) {
    const p = tr.pts;
    const hw = tr.width / 2;
    let acc = 0;
    for (let i = 0; i < p.length; i++) {
      if (i > 0) acc += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      const dPrev = i > 0 ? norm(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]) : null;
      const dNext = i < p.length - 1 ? norm(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]) : null;
      let nx: number;
      let nz: number;
      let scale = 1;
      if (dPrev && dNext) {
        const ax = -dPrev[1] + -dNext[1];
        const az = dPrev[0] + dNext[0];
        const l = Math.hypot(ax, az) || 1;
        nx = ax / l;
        nz = az / l;
        scale = 1 / Math.max(0.3, nx * -dPrev[1] + nz * dPrev[0]);
      } else {
        const d = (dPrev ?? dNext)!;
        nx = -d[1];
        nz = d[0];
      }
      const ox = nx * hw * scale;
      const oz = nz * hw * scale;
      pos.push(p[i][0] + ox, y, p[i][1] + oz, p[i][0] - ox, y, p[i][1] - oz);
      dist.push(acc, acc);
      side.push(1, -1);
      seed.push(tr.seed, tr.seed);
      if (i > 0) {
        const a = base + (i - 1) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    base += p.length * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("aDist", new THREE.Float32BufferAttribute(dist, 1));
  geo.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1));
  geo.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return geo;
}

function norm(x: number, z: number): [number, number] {
  const l = Math.hypot(x, z) || 1;
  return [x / l, z / l];
}

// ---------------------------------------------------------------------------
// Bond pads on the die, lead-frame fingers, and gold wire bonds between them.
// ---------------------------------------------------------------------------
export function bondPoints() {
  const pads: THREE.Vector3[] = [];
  const tips: THREE.Vector3[] = [];
  const edges: THREE.Vector3[] = [];
  const mid = (PKG.leadsPerSide - 1) / 2;
  for (let k = 0; k < 4; k++) {
    const f = sideFrame(k);
    for (let j = 0; j < PKG.leadsPerSide; j++) {
      const m = j - mid;
      const [px, pz] = f.toWorld(DIE.half - DIE.padInset, m * DIE.padPitch);
      const [tx, tz] = f.toWorld(DIE.fingerTip, m * DIE.fingerTipPitch);
      const [ex, ez] = f.toWorld(PKG.half - 0.02, m * PKG.pitch);
      pads.push(new THREE.Vector3(px, DIE.top + 0.002, pz));
      tips.push(new THREE.Vector3(tx, PKG.parting + 0.012, tz));
      edges.push(new THREE.Vector3(ex, PKG.parting + 0.012, ez));
    }
  }
  return { pads, tips, edges };
}

export function buildWireBonds(pads: THREE.Vector3[], tips: THREE.Vector3[]) {
  const parts: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  pads.forEach((p, i) => {
    const t = tips[i];
    const dir = new THREE.Vector3(t.x - p.x, 0, t.z - p.z);
    const L = dir.length();
    dir.normalize();
    const loop = 0.13 + (i % 3) * 0.012;
    const curve = new THREE.CatmullRomCurve3(
      [
        p.clone(),
        p.clone().addScaledVector(up, loop * 0.7).addScaledVector(dir, 0.012),
        p.clone().addScaledVector(up, loop).addScaledVector(dir, L * 0.28),
        p.clone().addScaledVector(up, loop * 0.55).addScaledVector(dir, L * 0.72),
        t.clone().addScaledVector(up, 0.006),
      ],
      false,
      "centripetal",
    );
    parts.push(new THREE.TubeGeometry(curve, 28, 0.0045, 6, false));
  });
  const merged = mergeGeometries(parts)!;
  parts.forEach((g) => g.dispose());
  return merged;
}

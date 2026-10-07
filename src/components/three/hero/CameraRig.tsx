"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { DieBlockId } from "@/content/experience";
import { introProgress } from "./Board";
import { easeOutCubic, heroState, smoothstep } from "./heroState";
import { blockCenter } from "./spec";

type Key = { p: number; pos: THREE.Vector3; target: THREE.Vector3; shift: number };

const key = (p: number, pos: [number, number, number], target: [number, number, number], shift = 0): Key => ({
  p,
  pos: new THREE.Vector3(...pos),
  target: new THREE.Vector3(...target),
  shift,
});

/** Camera hovering over a die block; `h`/`back` set height and pull-back. */
const over = (p: number, id: DieBlockId, h: number, back: number) => {
  const [x, y, z] = blockCenter(id);
  return key(p, [x + 0.04, y + h, z + back], [x, y, z]);
};

// Pairs of identical keys create "holds" where the camera rests while a caption is read.
const KEYS: Key[] = [
  key(0, [6.6, 4.3, 8.4], [0, 0.2, 0], 1),
  key(0.1, [6.0, 4.6, 7.6], [0, 0.2, 0], 1),
  key(0.27, [3.0, 6.3, 5.4], [0, 0.3, 0.1], 0.35),
  key(0.42, [0.3, 4.0, 2.8], [0, 0.36, 0.1]),
  over(0.48, "riscv", 1.15, 0.85),
  over(0.56, "riscv", 1.1, 0.8),
  over(0.6, "cnn", 1.15, 0.85),
  over(0.665, "cnn", 1.1, 0.8),
  over(0.71, "ddr4", 1.45, 1.1),
  over(0.77, "ddr4", 1.4, 1.05),
  over(0.815, "bridge", 0.8, 0.58),
  over(0.875, "bridge", 0.76, 0.55),
  key(0.95, [0.0, 3.3, 2.45], [0, 0.36, 0.1]),
  key(1, [0.0, 3.2, 2.35], [0, 0.36, 0.1]),
];

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const tmp = useMemo(() => ({ pos: new THREE.Vector3(), target: new THREE.Vector3(), off: new THREE.Vector3() }), []);
  const pointer = useRef({ x: 0, y: 0 });
  const shift = useRef(1);

  // Runs before everything else so all components read the same damped progress.
  useFrame((_, dt) => {
    easing.damp(heroState, "smooth", heroState.progress, 0.12, dt);
  }, -2);

  useFrame((state, dt) => {
    const p = heroState.smooth;
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
    const a = KEYS[i];
    const b = KEYS[i + 1];
    const t = smoothstep(a.p, b.p, p);
    tmp.pos.lerpVectors(a.pos, b.pos, t);
    tmp.target.lerpVectors(a.target, b.target, t);
    const s = a.shift + (b.shift - a.shift) * t;

    // Narrow (portrait) viewports see less horizontally: back the camera off to keep framing.
    const aspect = size.width / size.height;
    const fit = THREE.MathUtils.clamp(0.9 / aspect, 1, 2);
    heroState.fogScale = fit;
    const fog = state.scene.fog;
    if (fog instanceof THREE.Fog) {
      fog.near = 13 * fit;
      fog.far = 30 * fit;
    }

    // Power-on dolly: start further out, glide in when the loader finishes.
    const intro = easeOutCubic(introProgress());
    tmp.off.subVectors(tmp.pos, tmp.target).multiplyScalar(fit * (1 + 0.42 * (1 - intro)));
    tmp.pos.addVectors(tmp.target, tmp.off);

    // Idle drift + pointer parallax, only while viewing the whole package.
    const calm = 1 - smoothstep(0.1, 0.38, p);
    if (!heroState.reducedMotion) {
      easing.damp(pointer.current, "x", heroState.pointerX, 0.35, dt);
      easing.damp(pointer.current, "y", heroState.pointerY, 0.35, dt);
      const ang = (Math.sin(state.clock.elapsedTime * 0.11) * 0.06 + pointer.current.x * 0.09) * calm;
      tmp.off.subVectors(tmp.pos, tmp.target).applyAxisAngle(THREE.Object3D.DEFAULT_UP, ang);
      tmp.pos.addVectors(tmp.target, tmp.off);
      tmp.pos.y += pointer.current.y * 0.3 * calm;
    }

    camera.position.copy(tmp.pos);
    camera.lookAt(tmp.target);

    // Lens shift: chip sits right of the copy on wide screens, above it on tall ones.
    easing.damp(shift, "current", s, 0.25, dt);
    const wide = aspect > 1.1;
    const ox = wide ? -0.17 * size.width * shift.current : 0;
    const oy = wide ? 0 : size.height * (0.17 * shift.current + 0.1 * (1 - shift.current));
    camera.setViewOffset(size.width, size.height, ox, oy, size.width, size.height);
  });

  return null;
}

"use client";

import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";

/** An emissive panel in the reflection environment, like drei's <Lightformer>. */
export type StudioPanel = {
  form?: "rect" | "ring";
  intensity: number;
  position: [number, number, number];
  scale: number | [number, number];
  color?: string;
};

/**
 * Reflection environment built synchronously when the canvas mounts, before
 * <ShaderWarmup> runs. drei's <Environment> only renders its cube on the first
 * frame, which is after the shaders were pre-compiled, so every PBR material
 * then recompiled with an env-map variant in one blocking ~0.4 s stall. Built up
 * front, the materials compile once, off-thread, with their final variant.
 * Keep `size` at 64: PMREM's blur shaders grow with it, and at 128 they took
 * ~0.4 s to compile on Windows/ANGLE (64 is near-instant and looks the same on
 * rough materials). `panels` must be a stable (module-level) array.
 */
export function StudioEnvironment({ panels, size = 64, intensity = 1 }: { panels: StudioPanel[]; size?: number; intensity?: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useLayoutEffect(() => {
    // same rule as ShaderWarmup, applied before PMREM compiles its shaders
    gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
    const room = new THREE.Scene();
    const owned: { dispose(): void }[] = [];
    for (const p of panels) {
      const geo = p.form === "ring" ? new THREE.RingGeometry(0.25, 0.5, 64) : new THREE.PlaneGeometry(1, 1);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(p.color ?? "#ffffff").multiplyScalar(p.intensity),
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      if (Array.isArray(p.scale)) mesh.scale.set(p.scale[0], p.scale[1], 1);
      else mesh.scale.setScalar(p.scale);
      mesh.position.set(...p.position);
      mesh.lookAt(0, 0, 0);
      room.add(mesh);
      owned.push(geo, mat);
    }
    const pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromScene(room, 0, 0.1, 1000, { size });
    pmrem.dispose();
    owned.forEach((o) => o.dispose());
    scene.environment = target.texture;
    scene.environmentIntensity = intensity;
    return () => {
      if (scene.environment === target.texture) scene.environment = null;
      target.dispose();
    };
  }, [gl, scene, panels, size, intensity]);

  return null;
}

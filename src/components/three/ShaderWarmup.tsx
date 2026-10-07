"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";

/**
 * Compiles every material in the scene before the first frame. compileAsync uses
 * KHR_parallel_shader_compile where available, so shader linking happens off the
 * main thread instead of freezing the page on the first render. Render once
 * `onReady` fires (keep the canvas frameloop at "never" until then).
 *
 * `offscreen`: set when the scene is drawn through an EffectComposer. The
 * composer renders into a render target (no tone mapping, linear output), which
 * is a different shader variant from on-screen rendering, so we compile with a
 * render target bound to warm up exactly the programs that will be used.
 */
export function ShaderWarmup({ onReady, offscreen = false }: { onReady: () => void; offscreen?: boolean }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    // Synchronous shader-error checks stall on every program; keep them for development only.
    gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
    let alive = true;

    const previous = gl.getRenderTarget();
    const target = offscreen ? new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }) : null;
    if (target) gl.setRenderTarget(target);
    // Program variants are chosen synchronously inside compileAsync, so the
    // render target only needs to be bound for this call.
    const pending = gl.compileAsync(scene, camera);
    if (target) gl.setRenderTarget(previous);

    pending
      .catch(() => undefined)
      .then(() => {
        target?.dispose();
        if (alive) onReady();
      });
    return () => {
      alive = false;
    };
  }, [gl, scene, camera, onReady, offscreen]);

  return null;
}

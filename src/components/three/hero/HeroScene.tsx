"use client";

import { ContactShadows, Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ShaderWarmup } from "../ShaderWarmup";
import { Board } from "./Board";
import { CameraRig } from "./CameraRig";
import { Chip } from "./Chip";
import { heroState, sceneReady } from "./heroState";
import { BG } from "./spec";

/** Marks the scene ready (the canvas fades in) after fonts load, shaders compile and a few frames render. */
function ReadySignal() {
  const frames = useRef(0);
  useFrame(() => {
    if (++frames.current === 3) sceneReady.set();
  });
  return null;
}

function Lights({ lite }: { lite: boolean }) {
  return (
    <>
      <ambientLight intensity={0.06} />
      <directionalLight position={[4, 10, 6]} intensity={1.1} color="#ffffff" />
      <spotLight position={[1.5, 9, 3]} angle={0.5} penumbra={1} intensity={110} decay={2} color="#ffffff" />
      <pointLight position={[-6, 1.6, -4.5]} intensity={5} distance={14} color="#c87533" />
      <pointLight position={[5.5, 2.2, -4.5]} intensity={8} distance={16} color="#ffffff" />
      <Environment resolution={lite ? 128 : 256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 7, 1]} scale={[10, 6, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[-7, 2.5, 3]} scale={[6, 1.6, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[7, 2.5, -2]} scale={[6, 1.6, 1]} />
        <Lightformer form="ring" intensity={5} position={[3, 3, -7]} scale={2.6} color="#ffffff" />
        <Lightformer form="rect" intensity={1.6} position={[-7, 0.8, 1.5]} scale={[4, 0.8, 1]} color="#c87533" />
        <Lightformer form="rect" intensity={0.9} position={[0, 5, -5]} scale={[8, 4, 1]} />
      </Environment>
    </>
  );
}

// Phones / touch devices skip MSAA and run bloom at half resolution.
function Effects({ lite }: { lite: boolean }) {
  return (
    <EffectComposer multisampling={lite ? 0 : 4}>
      <Bloom
        mipmapBlur
        intensity={0.85}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.25}
        radius={0.72}
        resolutionScale={lite ? 0.5 : 1}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.28} darkness={0.72} />
      <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.035} />
    </EffectComposer>
  );
}

export default function HeroScene({ active }: { active: boolean }) {
  // "lite" = small screens or touch devices: cheaper settings for mobile GPUs.
  const [lite] = useState(() => window.matchMedia("(max-width: 768px), (pointer: coarse)").matches);
  const maxDpr = Math.min(lite ? 1.5 : 2, window.devicePixelRatio);
  const [dpr, setDpr] = useState(() => Math.min(lite ? 1.25 : 1.5, window.devicePixelRatio));
  const [warm, setWarm] = useState(false);
  const onWarm = useCallback(() => setWarm(true), []);

  useEffect(() => {
    heroState.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onMove = (e: PointerEvent) => {
      heroState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      heroState.pointerY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <Canvas
      dpr={dpr}
      frameloop={active && warm ? "always" : "never"}
      gl={{ antialias: false, powerPreference: "high-performance", stencil: false, alpha: false }}
      camera={{ fov: 32, near: 0.05, far: 90, position: [6.6, 4.3, 8.4] }}
      aria-hidden
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 13, 30]} />
      <PerformanceMonitor
        onDecline={() => setDpr(1)}
        onIncline={() => setDpr(maxDpr)}
      />
      <Lights lite={lite} />
      <CameraRig />
      <Suspense fallback={null}>
        <Board />
        <Chip dieTextureSize={lite ? 1024 : 2048} />
        <ContactShadows position={[0, 0.013, 0]} scale={7} blur={2.4} far={0.9} opacity={0.75} resolution={lite ? 256 : 512} frames={1} />
        <ReadySignal />
        <ShaderWarmup onReady={onWarm} offscreen />
      </Suspense>
      <Effects lite={lite} />
    </Canvas>
  );
}

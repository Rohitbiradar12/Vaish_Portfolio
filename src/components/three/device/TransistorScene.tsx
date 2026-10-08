"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { cn } from "@/lib/format";
import { ShaderWarmup } from "../ShaderWarmup";
import { StudioEnvironment, type StudioPanel } from "../StudioEnvironment";
import { driveStrength, type DeviceState } from "./model";

// Cross-section of an n-type FDSOI transistor drawn as a technical illustration:
// crisp boxes with hairline edges, glassy oxides and metal gate / contacts.
// Performance: no post-processing (the glow comes from additive sprites), the
// electron stream is animated entirely on the GPU (one draw call, no per-frame
// JS), and the canvas is transparent over a CSS backdrop.

const W = 5.6; // device length (source → drain), x
const D = 2.6; // device width, z
const FILM_Y = -0.25; // centre of the silicon film
const FILM_H = 0.11;
const SPAN = W - 1.0; // electron path length along the channel

type LayerId = "sub" | "bg" | "box" | "film" | "hk" | "gate" | "cont" | "m1";
const LAYER_IDS: LayerId[] = ["sub", "bg", "box", "film", "hk", "gate", "cont", "m1"];

// Explode offsets (y) per layer group; label anchors are in the layer's local frame.
// `short` labels are used on phones, where the long ones would run off the viewer.
const LAYERS: Record<LayerId, { label: string; short: string; explode: number; labelAt: [number, number, number] }> = {
  sub: { label: "Si substrate", short: "Substrate", explode: -1.35, labelAt: [W / 2, -1.55, 0] },
  bg: { label: "Back gate · V_BB", short: "Back gate", explode: -0.95, labelAt: [W / 2, -0.84, 0] },
  box: { label: "Buried oxide (BOX)", short: "BOX", explode: -0.55, labelAt: [W / 2, -0.44, 0] },
  film: { label: "Si film ~7 nm · raised S/D", short: "Si film · S/D", explode: 0, labelAt: [W / 2, FILM_Y, 0] },
  hk: { label: "High-k HfO₂", short: "HfO₂", explode: 0.42, labelAt: [0.63, -0.18, D / 2] },
  gate: { label: "Metal gate · SiN spacers", short: "Gate", explode: 0.85, labelAt: [0.88, 0.5, D / 2] },
  cont: { label: "W contacts", short: "W", explode: 1.35, labelAt: [2.1, 0.85, 0] },
  m1: { label: "M1 copper", short: "M1 Cu", explode: 1.8, labelAt: [2.45, 1.38, 0] },
};

// Reflection softboxes (built before shader warm-up, see StudioEnvironment).
const STUDIO: StudioPanel[] = [
  { intensity: 2, position: [0, 6, 2], scale: [10, 5] },
  { intensity: 2.6, position: [0, 6, -6], scale: [12, 5] },
  { intensity: 1.2, position: [-6, 1, 4], scale: [5, 2] },
  { form: "ring", intensity: 3, position: [5, 2, -5], scale: 2 },
];

type LabelRefs = React.RefObject<Partial<Record<LayerId, HTMLDivElement | null>>>;
type DragRef = React.RefObject<{ yaw: number }>;

/** Electrons: GPU-animated points with a soft additive glow (no bloom pass needed). */
function createElectronMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uDrive: { value: 0 }, uScale: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uDrive;
      uniform float uScale;
      attribute vec4 aSeed; // phase, lane, depth, rank
      varying float vAlpha;
      void main() {
        float speed = 0.75 + fract(aSeed.x * 7.31) * 0.5;
        float x = (fract(aSeed.x + uTime * 0.18 * speed * (0.4 + uDrive)) - 0.5) * ${SPAN.toFixed(2)};
        float on = step(aSeed.w, uDrive);
        vAlpha = on * clamp((${(SPAN / 2).toFixed(2)} - abs(x)) * 3.0, 0.0, 1.0);
        vec3 p = vec3(x, ${FILM_Y.toFixed(3)} + (aSeed.y - 0.5) * ${(FILM_H * 0.8).toFixed(3)}, ${(D / 2 + 0.012).toFixed(3)} + aSeed.z * 0.05);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = on * uScale * (0.7 + aSeed.z * 0.6) / -mv.z;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        float r2 = dot(c, c);
        if (r2 > 1.0) discard;
        float core = exp(-r2 * 10.0);
        float halo = exp(-r2 * 2.6) * 0.32;
        gl_FragColor = vec4(mix(vec3(0.62, 1.0, 0.88), vec3(1.0), core) * (core + halo) * vAlpha, 1.0);
      }
    `,
  });
}

/** Inversion channel: a soft green sheet on the cut face that flows source → drain. */
function createChannelMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uDrive: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uDrive;
      varying vec2 vUv;
      void main() {
        float band = pow(1.0 - abs(vUv.y * 2.0 - 1.0), 1.6);
        float flow = 0.78 + 0.22 * sin(vUv.x * 22.0 - uTime * 3.2);
        float ends = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
        gl_FragColor = vec4(vec3(0.16, 0.78, 0.6) * band * flow * ends * uDrive * 0.6, 1.0);
      }
    `,
  });
}

/** Soft round shadow under the stack. */
function blobTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 6, 64, 64, 64);
  grad.addColorStop(0, "rgba(0,0,0,0.7)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A mesh plus its hairline edges. */
function Part({
  geometry,
  outline,
  material,
  edges,
  position,
}: {
  geometry: THREE.BufferGeometry;
  outline: THREE.BufferGeometry;
  material: THREE.Material;
  edges: THREE.LineBasicMaterial;
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      <mesh geometry={geometry} material={material} />
      <lineSegments geometry={outline} material={edges} />
    </group>
  );
}

function Device({ state, labels, drag, lite, active }: { state: React.RefObject<DeviceState>; labels: LabelRefs; drag: DragRef; lite: boolean; active: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const viewport = useThree((s) => s.viewport);
  const groups = useRef<Partial<Record<LayerId, THREE.Group | null>>>({});
  const root = useRef<THREE.Group>(null);
  const anim = useRef({ explode: 0, drive: 0, yaw: 0, intro: 0 });
  const shown = useRef<Partial<Record<LayerId, string>>>({});
  const count = lite ? 200 : 360;

  const geo = useMemo(
    () => ({
      sub: new THREE.BoxGeometry(W, 0.9, D),
      bg: new THREE.BoxGeometry(W, 0.52, D),
      box: new THREE.BoxGeometry(W, 0.28, D),
      film: new THREE.BoxGeometry(W - 0.8, FILM_H, D),
      sd: new THREE.BoxGeometry(1.45, 0.5, D),
      sti: new THREE.BoxGeometry(0.4, 0.2, D),
      hk: new THREE.BoxGeometry(1.25, 0.06, D),
      gate: new THREE.BoxGeometry(1.25, 0.72, D),
      spacer: new THREE.BoxGeometry(0.24, 0.74, D),
      contS: new THREE.CylinderGeometry(0.14, 0.14, 0.92, 28),
      contG: new THREE.CylinderGeometry(0.14, 0.14, 0.72, 28),
      m1: new THREE.BoxGeometry(0.95, 0.2, 1.3),
      channel: new THREE.PlaneGeometry(W - 0.8, FILM_H * 1.7),
      blob: new THREE.PlaneGeometry(W * 1.35, D * 2.1).rotateX(-Math.PI / 2),
    }),
    [],
  );

  // hairline outlines, one per shape (shared by repeated parts)
  const outline = useMemo(() => {
    const m = new Map<THREE.BufferGeometry, THREE.EdgesGeometry>();
    for (const g of Object.values(geo)) m.set(g, new THREE.EdgesGeometry(g, 25));
    return (g: THREE.BufferGeometry) => m.get(g)!;
  }, [geo]);

  const electrons = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const rnd = mulberry(42);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) seeds.set([rnd(), rnd(), rnd(), i / count], i * 4);
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);
    return g;
  }, [count]);

  const mats = useMemo(
    () => ({
      sub: new THREE.MeshStandardMaterial({ color: "#1d1d20", roughness: 0.82, metalness: 0.1 }),
      bg: new THREE.MeshStandardMaterial({ color: "#2b2437", roughness: 0.55, emissive: "#906eb5", emissiveIntensity: 0 }),
      box: new THREE.MeshPhysicalMaterial({ color: "#e8eaef", roughness: 0.2, transparent: true, opacity: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, depthWrite: false }),
      film: new THREE.MeshStandardMaterial({ color: "#1d5a4b", roughness: 0.36, emissive: "#0e8c6d", emissiveIntensity: 0 }),
      sd: new THREE.MeshPhysicalMaterial({ color: "#9b2f3d", roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
      sti: new THREE.MeshPhysicalMaterial({ color: "#eef0f4", roughness: 0.18, transparent: true, opacity: 0.28, depthWrite: false }),
      // glossy clear-coat rather than iridescence: the thin-film shader cost a
      // ~0.4 s compile stall on desktop for a layer this thin
      hk: new THREE.MeshPhysicalMaterial({ color: "#906eb5", roughness: 0.18, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 }),
      gate: new THREE.MeshStandardMaterial({ color: "#a6a6ad", metalness: 0.9, roughness: 0.32 }),
      spacer: new THREE.MeshPhysicalMaterial({ color: "#f2f2f5", roughness: 0.28, transparent: true, opacity: 0.38, depthWrite: false }),
      w: new THREE.MeshStandardMaterial({ color: "#b4b6bc", metalness: 0.9, roughness: 0.42 }),
      cu: new THREE.MeshStandardMaterial({ color: "#b5652e", metalness: 0.92, roughness: 0.33 }),
      edges: new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.17, depthWrite: false }),
      electron: createElectronMaterial(),
      channel: createChannelMaterial(),
      blob: new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false }),
    }),
    [],
  );

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => {
        outline(g).dispose();
        g.dispose();
      });
      electrons.dispose();
      mats.blob.map?.dispose();
      Object.values(mats).forEach((m) => m.dispose());
    },
    [geo, outline, electrons, mats],
  );

  // Electron sprite size in px per world unit at unit depth (depends on canvas height).
  useEffect(() => {
    const dpr = viewport.dpr;
    mats.electron.uniforms.uScale.value = (0.115 * size.height * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  }, [size.height, viewport.dpr, camera.fov, mats]);

  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((s, dt) => {
    const st = state.current;
    const a = anim.current;
    easing.damp(a, "explode", st.exploded ? 1 : 0, 0.35, dt);
    easing.damp(a, "drive", driveStrength(st), 0.25, dt);
    easing.damp(a, "yaw", drag.current.yaw, 0.25, dt);
    if (active) easing.damp(a, "intro", 1, 0.6, dt);
    const { explode: ex, drive: dr } = a;
    const t = s.clock.elapsedTime;

    // gentle dolly-in when the viewer first appears; pull back as the stack
    // separates (further on narrow viewers, which also slide the model left so
    // the layer labels fit on its right)
    const narrow = size.width < 560;
    const fit = THREE.MathUtils.clamp(1.45 / (size.width / size.height), 1, 1.45); // squarer viewers see less width
    const back = (1 + 0.22 * (1 - a.intro)) * fit * (narrow ? 1 + 0.12 * ex : 1);
    camera.position.set(0, (2.0 + 0.9 * ex) * back, (9.4 + 4.4 * ex) * back);
    camera.lookAt(0, 0.15 * ex, 0);
    camera.setViewOffset(size.width, size.height, narrow ? 0.16 * size.width * ex : 0, 0, size.width, size.height);

    // idle sway + pointer tilt + drag to rotate
    const r = root.current;
    if (r) {
      easing.dampE(r.rotation, [0.42 - s.pointer.y * 0.1, -0.55 + Math.sin(t * 0.25) * 0.1 + s.pointer.x * 0.18 + a.yaw, 0], 0.4, dt);
      r.updateMatrixWorld();
    }

    // explode layers and pin each DOM label to its projected anchor (DOM is only
    // touched when a value actually changes)
    const labelOpacity = THREE.MathUtils.clamp((ex - 0.35) * 2.2, 0, 1);
    for (const id of LAYER_IDS) {
      const g = groups.current[id];
      if (!g) continue;
      g.position.y = LAYERS[id].explode * ex;
      const el = labels.current[id];
      if (!el) continue;
      let style = `0|`;
      if (labelOpacity > 0) {
        g.updateMatrixWorld();
        tmp.set(...LAYERS[id].labelAt);
        g.localToWorld(tmp).project(camera);
        const x = Math.round((tmp.x * 0.5 + 0.5) * size.width);
        const y = Math.round((-tmp.y * 0.5 + 0.5) * size.height);
        style = `${labelOpacity.toFixed(2)}|translate3d(${x}px, ${y}px, 0) translateY(-50%)`;
      }
      if (shown.current[id] === style) continue;
      shown.current[id] = style;
      const [o, tr] = style.split("|");
      el.style.opacity = o;
      if (tr) el.style.transform = tr;
    }

    mats.film.emissiveIntensity = dr * 0.9;
    mats.bg.emissiveIntensity = Math.max(0, st.vbb) * 0.9 + 0.04;
    mats.electron.uniforms.uTime.value = t;
    mats.electron.uniforms.uDrive.value = dr;
    mats.channel.uniforms.uTime.value = t;
    mats.channel.uniforms.uDrive.value = dr;
  });

  const layer = (id: LayerId) => (el: THREE.Group | null) => {
    groups.current[id] = el;
  };
  const e = mats.edges;

  return (
    <group ref={root} position={[0, -0.05, 0]}>
      <group ref={layer("sub")}>
        <mesh geometry={geo.blob} material={mats.blob} position={[0, -2.03, 0.15]} />
        <Part geometry={geo.sub} outline={outline(geo.sub)} material={mats.sub} edges={e} position={[0, -1.55, 0]} />
      </group>
      <group ref={layer("bg")}>
        <Part geometry={geo.bg} outline={outline(geo.bg)} material={mats.bg} edges={e} position={[0, -0.84, 0]} />
      </group>
      <group ref={layer("box")}>
        <Part geometry={geo.box} outline={outline(geo.box)} material={mats.box} edges={e} position={[0, -0.44, 0]} />
      </group>
      <group ref={layer("film")}>
        <Part geometry={geo.film} outline={outline(geo.film)} material={mats.film} edges={e} position={[0, FILM_Y, 0]} />
        {[-1, 1].map((sgn) => (
          <group key={sgn}>
            <Part geometry={geo.sd} outline={outline(geo.sd)} material={mats.sd} edges={e} position={[sgn * 1.95, 0, 0]} />
            <Part geometry={geo.sti} outline={outline(geo.sti)} material={mats.sti} edges={e} position={[sgn * (W / 2 - 0.2), -0.2, 0]} />
          </group>
        ))}
        <mesh geometry={geo.channel} material={mats.channel} position={[0, FILM_Y, D / 2 + 0.004]} />
        <points geometry={electrons} material={mats.electron} frustumCulled={false} />
      </group>
      <group ref={layer("hk")}>
        <Part geometry={geo.hk} outline={outline(geo.hk)} material={mats.hk} edges={e} position={[0, -0.165, 0]} />
      </group>
      <group ref={layer("gate")}>
        <Part geometry={geo.gate} outline={outline(geo.gate)} material={mats.gate} edges={e} position={[0, 0.225, 0]} />
        {[-1, 1].map((sgn) => (
          <Part key={sgn} geometry={geo.spacer} outline={outline(geo.spacer)} material={mats.spacer} edges={e} position={[sgn * 0.75, 0.17, 0]} />
        ))}
      </group>
      <group ref={layer("cont")}>
        {[-1.95, 0, 1.95].map((x) => (
          <Part key={x} geometry={x === 0 ? geo.contG : geo.contS} outline={outline(x === 0 ? geo.contG : geo.contS)} material={mats.w} edges={e} position={[x, x === 0 ? 0.93 : 0.8, 0]} />
        ))}
      </group>
      <group ref={layer("m1")}>
        {[-1.95, 0, 1.95].map((x) => (
          <Part key={x} geometry={geo.m1} outline={outline(geo.m1)} material={mats.cu} edges={e} position={[x, 1.38, 0]} />
        ))}
      </group>
    </group>
  );
}

/**
 * Renders a few frames as soon as shaders are compiled, even before the viewer
 * is on screen (frameloop "demand"), then reports ready so the canvas fades in
 * already drawn.
 */
function ReadyAfterFrames({ onReady }: { onReady: () => void }) {
  const invalidate = useThree((s) => s.invalidate);
  const n = useRef(0);
  useEffect(() => invalidate(), [invalidate]);
  useFrame(() => {
    n.current++;
    if (n.current < 3) invalidate();
    else if (n.current === 3) onReady();
  });
  return null;
}

// Memoised: the controls re-render the section on every slider step, but the
// scene reads the bias from the `state` ref, so the canvas never needs to.
export default memo(function TransistorScene({ state, active }: { state: React.RefObject<DeviceState>; active: boolean }) {
  const labels = useRef<Partial<Record<LayerId, HTMLDivElement | null>>>({});
  const [lite] = useState(() => window.matchMedia("(max-width: 768px), (pointer: coarse)").matches);
  const maxDpr = Math.min(lite ? 1.5 : 1.75, window.devicePixelRatio);
  const [dpr, setDpr] = useState(maxDpr);
  const [warm, setWarm] = useState(false);
  const [ready, setReady] = useState(false);
  const [dragged, setDragged] = useState(false);
  const onWarm = useCallback(() => setWarm(true), []);
  const onReady = useCallback(() => setReady(true), []);

  // drag to rotate (horizontal; vertical touch still scrolls the page)
  const drag = useRef({ yaw: 0 });
  const pointer = useRef<{ id: number; x: number } | null>(null);

  return (
    <div
      className="relative h-full w-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
      onPointerDown={(e) => {
        pointer.current = { id: e.pointerId, x: e.clientX };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const p = pointer.current;
        if (!p || p.id !== e.pointerId) return;
        drag.current.yaw = THREE.MathUtils.clamp(drag.current.yaw + (e.clientX - p.x) * 0.006, -1.2, 1.2);
        p.x = e.clientX;
        if (!dragged) setDragged(true);
      }}
      onPointerUp={() => (pointer.current = null)}
      onPointerCancel={() => (pointer.current = null)}
    >
      <div className={cn("absolute inset-0 transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}>
        <Canvas
          dpr={dpr}
          // paused until shaders compile off-thread, then a few pre-rendered frames,
          // then a live loop only while the viewer is on screen
          frameloop={!warm ? "never" : active ? "always" : "demand"}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ fov: 30, position: [0, 2.0, 9.4], near: 0.1, far: 60 }}
          aria-hidden
        >
          <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(maxDpr)} />
          <ambientLight intensity={0.3} />
          <directionalLight position={[4, 8, 6]} intensity={1.5} />
          <pointLight position={[-5, 2, 3]} intensity={7} color="#ffffff" distance={14} />
          <pointLight position={[5, -1, 4]} intensity={6} color="#c87533" distance={14} />
          <StudioEnvironment panels={STUDIO} intensity={0.72} />
          <Device state={state} labels={labels} drag={drag} lite={lite} active={active && ready} />
          <ShaderWarmup onReady={onWarm} />
          {warm && <ReadyAfterFrames onReady={onReady} />}
        </Canvas>
      </div>

      {/* exploded-view labels: dot on the layer, hairline, tag */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {LAYER_IDS.map((id) => (
          <div
            key={id}
            ref={(el) => {
              labels.current[id] = el;
            }}
            className="absolute left-0 top-0 flex items-center whitespace-nowrap"
            style={{ opacity: 0 }}
          >
            <span className="size-1.5 rounded-full bg-white shadow-[0_0_8px_rgb(255_255_255/0.8)]" />
            <span className="h-px w-3 bg-white/40 sm:w-5" />
            <span className="rounded-md border border-white/10 bg-black/70 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-white/90 backdrop-blur-sm sm:px-2 sm:py-1 sm:text-[0.6rem] sm:tracking-[0.12em]">
              <span className="hidden sm:inline">{LAYERS[id].label}</span>
              <span className="sm:hidden">{LAYERS[id].short}</span>
            </span>
          </div>
        ))}
      </div>

      {/* hint, gone after the first drag */}
      <p
        className={cn(
          "pointer-events-none absolute right-4 top-4 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-white/45 transition-opacity duration-500",
          ready && !dragged ? "opacity-100" : "opacity-0",
        )}
      >
        ⟲ drag to rotate
      </p>
    </div>
  );
});

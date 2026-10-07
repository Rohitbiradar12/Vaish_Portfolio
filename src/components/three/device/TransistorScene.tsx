"use client";

import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { easing } from "maath";
import { ToneMappingMode } from "postprocessing";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { DEVICE_BG, driveStrength, type DeviceState } from "./model";

const W = 5.6; // device length (source → drain), x
const D = 2.6; // device width, z
const FILM_Y = -0.25; // centre of the silicon film
const FILM_H = 0.11;
const ELECTRONS = 170;

type LayerId = "sub" | "bg" | "box" | "film" | "hk" | "gate" | "cont" | "m1";
const LAYER_IDS: LayerId[] = ["sub", "bg", "box", "film", "hk", "gate", "cont", "m1"];

// Explode offsets (y) per layer group; label anchors are in the layer's local frame.
const LAYERS: Record<LayerId, { label: string; explode: number; labelAt: [number, number, number] }> = {
  sub: { label: "Si substrate", explode: -1.35, labelAt: [W / 2, -1.55, 0] },
  bg: { label: "Back gate · V_BB", explode: -0.95, labelAt: [W / 2, -0.84, 0] },
  box: { label: "Buried oxide (BOX)", explode: -0.55, labelAt: [W / 2, -0.44, 0] },
  film: { label: "Si film ~7 nm · raised S/D", explode: 0, labelAt: [W / 2, FILM_Y, 0] },
  hk: { label: "High-k HfO₂", explode: 0.42, labelAt: [0.63, -0.18, D / 2] },
  gate: { label: "Metal gate · SiN spacers", explode: 0.85, labelAt: [0.88, 0.5, D / 2] },
  cont: { label: "W contacts", explode: 1.35, labelAt: [2.1, 0.85, 0] },
  m1: { label: "M1 copper", explode: 1.8, labelAt: [2.45, 1.38, 0] },
};

type LabelRefs = React.RefObject<Partial<Record<LayerId, HTMLDivElement | null>>>;

function Device({ state, labels }: { state: React.RefObject<DeviceState>; labels: LabelRefs }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const groups = useRef<Partial<Record<LayerId, THREE.Group | null>>>({});
  const root = useRef<THREE.Group>(null);
  const electrons = useRef<THREE.InstancedMesh>(null);
  const anim = useRef({ explode: 0, drive: 0 });

  const mats = useMemo(
    () => ({
      sub: new THREE.MeshStandardMaterial({ color: "#2a3344", roughness: 0.8 }),
      bg: new THREE.MeshStandardMaterial({ color: "#3b2a73", roughness: 0.6, emissive: "#7a5cff", emissiveIntensity: 0 }),
      box: new THREE.MeshPhysicalMaterial({ color: "#a9dcff", roughness: 0.12, transparent: true, opacity: 0.55, clearcoat: 1 }),
      film: new THREE.MeshStandardMaterial({ color: "#2f7d63", roughness: 0.4, emissive: "#00e5ff", emissiveIntensity: 0 }),
      sd: new THREE.MeshStandardMaterial({ color: "#c0474f", roughness: 0.45 }),
      hk: new THREE.MeshPhysicalMaterial({
        color: "#a77bff",
        roughness: 0.2,
        metalness: 0.2,
        iridescence: 1,
        iridescenceIOR: 1.8,
        iridescenceThicknessRange: [200, 600],
      }),
      gate: new THREE.MeshStandardMaterial({ color: "#c9d0da", metalness: 0.85, roughness: 0.3 }),
      spacer: new THREE.MeshPhysicalMaterial({ color: "#e4ebf3", roughness: 0.3, transparent: true, opacity: 0.45 }),
      sti: new THREE.MeshPhysicalMaterial({ color: "#a9dcff", roughness: 0.15, transparent: true, opacity: 0.35 }),
      w: new THREE.MeshStandardMaterial({ color: "#d0d5dc", metalness: 0.9, roughness: 0.32 }),
      cu: new THREE.MeshStandardMaterial({ color: "#e39a5e", metalness: 0.9, roughness: 0.3 }),
      e: new THREE.MeshBasicMaterial({ color: new THREE.Color("#00e5ff").multiplyScalar(4) }),
    }),
    [],
  );

  // Electrons travel along the exposed front (cut) face of the film so the stream stays visible.
  const seeds = useMemo(() => {
    const rnd = mulberry(42);
    return Array.from({ length: ELECTRONS }, (_, i) => ({
      x: rnd(),
      z: D / 2 + 0.01 + rnd() * 0.05,
      y: rnd(),
      speed: 0.75 + rnd() * 0.5,
      rank: i / ELECTRONS,
    }));
  }, []);

  useLayoutEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const tmp = useMemo(() => ({ o: new THREE.Object3D(), v: new THREE.Vector3() }), []);

  useFrame((s, dt) => {
    const st = state.current;
    const t = s.clock.elapsedTime;
    easing.damp(anim.current, "explode", st.exploded ? 1 : 0, 0.35, dt);
    easing.damp(anim.current, "drive", driveStrength(st), 0.25, dt);
    const { explode: ex, drive: dr } = anim.current;

    // pull the camera back as the stack separates so every layer stays in frame
    camera.position.set(0, 2.0 + 0.9 * ex, 9.4 + 4.4 * ex);
    camera.lookAt(0, 0.15 * ex, 0);

    // idle sway + pointer tilt
    const r = root.current;
    if (r) {
      easing.dampE(r.rotation, [0.42 - s.pointer.y * 0.12, -0.55 + Math.sin(t * 0.25) * 0.12 + s.pointer.x * 0.25, 0], 0.4, dt);
      r.updateMatrixWorld();
    }

    // explode layers and pin each DOM label to its projected anchor
    const labelOpacity = THREE.MathUtils.clamp((ex - 0.35) * 2.2, 0, 1);
    for (const id of LAYER_IDS) {
      const g = groups.current[id];
      if (!g) continue;
      g.position.y = LAYERS[id].explode * ex;
      g.updateMatrixWorld();
      const el = labels.current[id];
      if (!el) continue;
      el.style.opacity = String(labelOpacity);
      if (labelOpacity <= 0) continue;
      tmp.v.set(...LAYERS[id].labelAt);
      g.localToWorld(tmp.v).project(camera);
      const x = (tmp.v.x * 0.5 + 0.5) * size.width;
      const y = (-tmp.v.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${x + 12}px, ${y}px, 0) translateY(-50%)`;
    }

    mats.film.emissiveIntensity = dr * 1.8;
    mats.bg.emissiveIntensity = Math.max(0, st.vbb) * 0.9 + 0.05;

    const mesh = electrons.current;
    if (mesh) {
      const span = W - 1.0;
      seeds.forEach((e, i) => {
        const x = ((e.x + t * 0.18 * e.speed * (0.4 + dr)) % 1) * span - span / 2;
        tmp.o.position.set(x, FILM_Y + (e.y - 0.5) * FILM_H * 0.8, e.z);
        const edgeFade = Math.min(1, (span / 2 - Math.abs(x)) * 3);
        tmp.o.scale.setScalar(e.rank < dr ? 0.04 * Math.max(0.2, edgeFade) : 0.0001);
        tmp.o.updateMatrix();
        mesh.setMatrixAt(i, tmp.o.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  const layer = (id: LayerId) => (el: THREE.Group | null) => {
    groups.current[id] = el;
  };

  return (
    <group ref={root} position={[0, -0.05, 0]}>
      <group ref={layer("sub")}>
        <mesh position={[0, -1.55, 0]} material={mats.sub}>
          <boxGeometry args={[W, 0.9, D]} />
        </mesh>
      </group>
      <group ref={layer("bg")}>
        <mesh position={[0, -0.84, 0]} material={mats.bg}>
          <boxGeometry args={[W, 0.52, D]} />
        </mesh>
      </group>
      <group ref={layer("box")}>
        <mesh position={[0, -0.44, 0]} material={mats.box}>
          <boxGeometry args={[W, 0.28, D]} />
        </mesh>
      </group>
      <group ref={layer("film")}>
        <mesh position={[0, FILM_Y, 0]} material={mats.film}>
          <boxGeometry args={[W - 0.8, FILM_H, D]} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s}>
            <RoundedBox args={[1.45, 0.5, D]} radius={0.06} smoothness={3} position={[s * 1.95, 0.0, 0]} material={mats.sd} />
            <mesh position={[s * (W / 2 - 0.2), -0.2, 0]} material={mats.sti}>
              <boxGeometry args={[0.4, 0.2, D]} />
            </mesh>
          </group>
        ))}
        <instancedMesh ref={electrons} args={[undefined, mats.e, ELECTRONS]} frustumCulled={false}>
          <sphereGeometry args={[1, 10, 8]} />
        </instancedMesh>
      </group>
      <group ref={layer("hk")}>
        <mesh position={[0, -0.165, 0]} material={mats.hk}>
          <boxGeometry args={[1.25, 0.06, D]} />
        </mesh>
      </group>
      <group ref={layer("gate")}>
        <RoundedBox args={[1.25, 0.72, D]} radius={0.03} smoothness={3} position={[0, 0.225, 0]} material={mats.gate} />
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.75, 0.17, 0]} material={mats.spacer}>
            <boxGeometry args={[0.24, 0.74, D]} />
          </mesh>
        ))}
      </group>
      <group ref={layer("cont")}>
        {[-1.95, 0, 1.95].map((x) => (
          <mesh key={x} position={[x, x === 0 ? 0.93 : 0.8, 0]} material={mats.w}>
            <cylinderGeometry args={[0.14, 0.14, x === 0 ? 0.72 : 0.92, 24]} />
          </mesh>
        ))}
      </group>
      <group ref={layer("m1")}>
        {[-1.95, 0, 1.95].map((x) => (
          <RoundedBox key={x} args={[0.95, 0.2, 1.3]} radius={0.04} smoothness={3} position={[x, 1.38, 0]} material={mats.cu} />
        ))}
      </group>
    </group>
  );
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

export default function TransistorScene({ state, active }: { state: React.RefObject<DeviceState>; active: boolean }) {
  const labels = useRef<Partial<Record<LayerId, HTMLDivElement | null>>>({});
  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={[1, 1.75]}
        frameloop={active ? "always" : "never"}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{ fov: 30, position: [0, 2.0, 9.4], near: 0.1, far: 60 }}
        aria-hidden
      >
        <color attach="background" args={[DEVICE_BG]} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[4, 8, 6]} intensity={1.6} />
        <pointLight position={[-5, 2, 3]} intensity={10} color="#00e5ff" distance={14} />
        <pointLight position={[5, -1, 4]} intensity={8} color="#c87533" distance={14} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2} position={[0, 6, 2]} scale={[10, 5, 1]} />
          <Lightformer form="rect" intensity={2.6} position={[0, 6, -6]} scale={[12, 5, 1]} />
          <Lightformer form="rect" intensity={1.2} position={[-6, 1, 4]} scale={[5, 2, 1]} />
          <Lightformer form="ring" intensity={3} position={[5, 2, -5]} scale={2} color="#00e5ff" />
        </Environment>
        <Device state={state} labels={labels} />
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.85} radius={0.6} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Canvas>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {LAYER_IDS.map((id) => (
          <div
            key={id}
            ref={(el) => {
              labels.current[id] = el;
            }}
            className="absolute left-0 top-0 whitespace-nowrap rounded border border-line-strong bg-ink/85 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-fg/90"
            style={{ opacity: 0 }}
          >
            {LAYERS[id].label}
          </div>
        ))}
      </div>
    </div>
  );
}

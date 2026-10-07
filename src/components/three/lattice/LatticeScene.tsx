"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ShaderWarmup } from "../ShaderWarmup";
import * as THREE from "three";

const N = 2; // unit cells per edge
const BOND = Math.sqrt(3) / 4; // nearest-neighbour distance in units of a

/** Diamond-cubic silicon: FCC lattice + (¼,¼,¼) basis, clipped to an N³ block. */
function buildLattice() {
  const fcc = [
    [0, 0, 0],
    [0, 0.5, 0.5],
    [0.5, 0, 0.5],
    [0.5, 0.5, 0],
  ];
  const pts: THREE.Vector3[] = [];
  const key = new Set<string>();
  const add = (x: number, y: number, z: number) => {
    if (x > N + 1e-6 || y > N + 1e-6 || z > N + 1e-6) return;
    const k = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    if (key.has(k)) return;
    key.add(k);
    pts.push(new THREE.Vector3(x, y, z));
  };
  for (let i = 0; i <= N; i++)
    for (let j = 0; j <= N; j++)
      for (let k = 0; k <= N; k++)
        for (const [a, b, c] of fcc) {
          add(i + a, j + b, k + c);
          add(i + a + 0.25, j + b + 0.25, k + c + 0.25);
        }
  const bonds: [number, number][] = [];
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++) if (Math.abs(pts[i].distanceTo(pts[j]) - BOND) < 1e-3) bonds.push([i, j]);
  // keep atoms that participate in at least one bond (drops lonely corner atoms)
  const used = new Set(bonds.flat());
  const remap = new Map<number, number>();
  const atoms: THREE.Vector3[] = [];
  pts.forEach((p, i) => {
    if (!used.has(i)) return;
    remap.set(i, atoms.length);
    atoms.push(p.clone().subScalar(N / 2));
  });
  return { atoms, bonds: bonds.map(([a, b]) => [remap.get(a)!, remap.get(b)!] as [number, number]) };
}

function Lattice() {
  const { atoms, bonds } = useMemo(() => buildLattice(), []);
  const group = useRef<THREE.Group>(null);
  const atomMesh = useRef<THREE.InstancedMesh>(null);
  const bondMesh = useRef<THREE.InstancedMesh>(null);

  const mats = useMemo(
    () => ({
      atom: new THREE.MeshPhysicalMaterial({ color: "#ffffff", metalness: 0.35, roughness: 0.22, clearcoat: 0.8 }),
      bond: new THREE.MeshStandardMaterial({ color: "#1d6f80", emissive: "#00e5ff", emissiveIntensity: 0.35, roughness: 0.4 }),
    }),
    [],
  );

  useLayoutEffect(() => {
    const am = atomMesh.current;
    const bm = bondMesh.current;
    if (!am || !bm) return;
    const o = new THREE.Object3D();
    atoms.forEach((p, i) => {
      o.position.copy(p);
      o.scale.setScalar(1);
      o.quaternion.identity();
      o.updateMatrix();
      am.setMatrixAt(i, o.matrix);
      am.setColorAt(i, new THREE.Color("#9fb3c8"));
    });
    const up = new THREE.Vector3(0, 1, 0);
    bonds.forEach(([a, b], i) => {
      const pa = atoms[a];
      const pb = atoms[b];
      o.position.addVectors(pa, pb).multiplyScalar(0.5);
      o.quaternion.setFromUnitVectors(up, pb.clone().sub(pa).normalize());
      o.scale.set(1, pa.distanceTo(pb), 1);
      o.updateMatrix();
      bm.setMatrixAt(i, o.matrix);
    });
    am.instanceMatrix.needsUpdate = true;
    bm.instanceMatrix.needsUpdate = true;
    if (am.instanceColor) am.instanceColor.needsUpdate = true;
    return () => Object.values(mats).forEach((m) => m.dispose());
  }, [atoms, bonds, mats]);

  const base = useMemo(() => new THREE.Color("#8fa3ba"), []);
  const hot = useMemo(() => new THREE.Color("#00e5ff"), []);
  const c = useMemo(() => new THREE.Color(), []);

  useFrame((s, dt) => {
    const t = s.clock.elapsedTime;
    const g = group.current;
    if (g) {
      g.rotation.y += dt * 0.18;
      g.rotation.x = 0.5 + Math.sin(t * 0.3) * 0.08;
    }
    // an "energy wave" sweeping through the crystal
    const am = atomMesh.current;
    if (am) {
      atoms.forEach((p, i) => {
        const w = Math.exp(-Math.pow(((p.x + p.y + p.z + 3 - ((t * 0.9) % 6)) * 1.6), 2));
        am.setColorAt(i, c.copy(base).lerp(hot, w * 0.85));
      });
      if (am.instanceColor) am.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group ref={group} scale={1.12}>
      <instancedMesh ref={atomMesh} args={[undefined, mats.atom, atoms.length]}>
        <sphereGeometry args={[0.085, 24, 16]} />
      </instancedMesh>
      <instancedMesh ref={bondMesh} args={[undefined, mats.bond, bonds.length]}>
        <cylinderGeometry args={[0.018, 0.018, 1, 8]} />
      </instancedMesh>
    </group>
  );
}

export default function LatticeScene({ active }: { active: boolean }) {
  const [lite] = useState(() => window.matchMedia("(max-width: 768px), (pointer: coarse)").matches);
  const [warm, setWarm] = useState(false);
  const onWarm = useCallback(() => setWarm(true), []);
  return (
    <Canvas
      dpr={[1, lite ? 1.5 : 1.75]}
      frameloop={active && warm ? "always" : "never"}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 32, position: [0, 0.5, 6.8] }}
      aria-hidden
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} />
      <pointLight position={[-4, -1, 3]} intensity={8} color="#00e5ff" distance={12} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 5, 3]} scale={[6, 4, 1]} />
        <Lightformer form="ring" intensity={2} position={[-4, 1, -3]} scale={2} color="#c87533" />
      </Environment>
      <Lattice />
      <ShaderWarmup onReady={onWarm} />
    </Canvas>
  );
}

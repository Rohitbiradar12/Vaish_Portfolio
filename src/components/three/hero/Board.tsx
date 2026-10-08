"use client";

import { RoundedBox, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { FONT_DISPLAY, FONT_MONO } from "./Chip";
import { buildRibbons, leadMatrices, routeBoard } from "./geometry";
import { clamp01, easeOutCubic, heroState } from "./heroState";
import { createNoiseTexture, createTraceMaterial } from "./materials";
import { PKG } from "./spec";

const UP = new THREE.Vector3(0, 1, 0);

/** 0..1 power-on progress, starting once the scene is ready (see Hero). */
export function introProgress(now = performance.now()) {
  if (heroState.introStart < 0) return 0;
  return clamp01((now - heroState.introStart) / 2600);
}

function useMatrices(ref: React.RefObject<THREE.InstancedMesh | null>, matrices: THREE.Matrix4[]) {
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    matrices.forEach((mx, i) => m.setMatrixAt(i, mx));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [ref, matrices]);
}

const place = (x: number, y: number, z: number, rotY = 0, s: [number, number, number] = [1, 1, 1]) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(UP, rotY),
    new THREE.Vector3(...s),
  );

/** 0402 passive: ceramic body + two tinned terminations (3 material groups). */
function passiveGeometry() {
  const L = 0.42;
  const W = 0.21;
  const H = 0.2;
  const cap = 0.085;
  const body = new THREE.BoxGeometry(L - 2 * cap, H * 0.96, W * 0.96);
  body.translate(0, H / 2, 0);
  const endA = new THREE.BoxGeometry(cap, H, W);
  endA.translate(-(L - cap) / 2, H / 2, 0);
  const endB = endA.clone();
  endB.translate(L - cap, 0, 0);
  return mergeGeometries([body, endA, endB], true)!;
}

// Component placement (x, z, rotY). Corner quadrants are free of escape routing.
const CAPS: [number, number, number][] = [
  [2.47, 2.47, Math.PI / 4],
  [-2.47, 2.47, -Math.PI / 4],
  [2.47, -2.47, -Math.PI / 4],
  [-2.47, -2.47, Math.PI / 4],
  [3.05, 2.85, 0],
  [3.05, 3.25, 0],
  [-3.1, 2.9, Math.PI / 2],
  [-2.75, 2.9, Math.PI / 2],
  [5.55, 2.85, Math.PI / 2],
  [5.55, -2.85, Math.PI / 2],
  [5.2, 3.15, 0],
  [5.2, -3.15, 0],
  [-3.3, -4.9, 0],
  [3.4, -4.9, 0],
];
const RESISTORS: [number, number, number][] = [
  [-2.9, 4.55, 0],
  [-2.9, 4.95, 0],
  [3.05, 4.8, Math.PI / 2],
  [3.4, 4.8, Math.PI / 2],
];

export function Board() {
  const routing = useMemo(() => routeBoard(), []);
  const traceGeo = useMemo(() => buildRibbons(routing.traces, 0.003), [routing]);
  const traceMat = useMemo(() => createTraceMaterial(), []);
  const noise = useMemo(() => {
    const t = createNoiseTexture(256, 9);
    t.repeat.set(40, 40);
    return t;
  }, []);

  const mats = useMemo(
    () => ({
      board: new THREE.MeshStandardMaterial({ color: "#0c0c0c", roughness: 0.92, metalness: 0, roughnessMap: noise }),
      enig: new THREE.MeshStandardMaterial({ color: "#e0bd68", metalness: 1, roughness: 0.34 }),
      hole: new THREE.MeshBasicMaterial({ color: "#020202" }),
      silk: new THREE.MeshBasicMaterial({ color: "#dedede", transparent: true, opacity: 0.55 }),
      ceramic: new THREE.MeshStandardMaterial({ color: "#a8875c", roughness: 0.7 }),
      resistor: new THREE.MeshStandardMaterial({ color: "#16171a", roughness: 0.55 }),
      tin: new THREE.MeshStandardMaterial({ color: "#d9d9d9", metalness: 1, roughness: 0.32 }),
      pkg: new THREE.MeshPhysicalMaterial({ color: "#151515", roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.5 }),
      ferrite: new THREE.MeshStandardMaterial({ color: "#2d2d2d", roughness: 0.78 }),
      can: new THREE.MeshStandardMaterial({ color: "#cccccc", metalness: 1, roughness: 0.38 }),
      crystalBase: new THREE.MeshStandardMaterial({ color: "#c5b593", roughness: 0.6 }),
      ledBody: new THREE.MeshStandardMaterial({ color: "#e9e6dd", roughness: 0.5 }),
      ledLens: new THREE.MeshStandardMaterial({ color: "#1f1f1f", emissive: "#ffffff", emissiveIntensity: 0, roughness: 0.2 }),
      marking: new THREE.MeshBasicMaterial({ color: "#949494" }),
    }),
    [noise],
  );

  // ------------------------------------------------------------ instanced bits
  const padMats = useMemo(
    () => leadMatrices((PKG.padInner + PKG.padOuter) / 2).map((m) => m.clone()),
    [],
  );
  const viaMats = useMemo(
    () => routing.vias.map((v) => place(v.x, 0.0045, v.z, 0, [v.r / 0.07, 1, v.r / 0.07])),
    [routing],
  );
  const passiveGeo = useMemo(() => passiveGeometry(), []);
  const capMats = useMemo(() => CAPS.map(([x, z, r]) => place(x, 0.004, z, r)), []);
  const resMats = useMemo(() => RESISTORS.map(([x, z, r]) => place(x, 0.004, z, r)), []);
  const pmicPadMats = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    for (let k = 0; k < 4; k++) {
      for (let i = 0; i < 4; i++) {
        const lat = (i - 1.5) * 0.24;
        const a = 0.6;
        const th = (k * Math.PI) / 2;
        const x = a * Math.cos(th) - lat * Math.sin(th);
        const z = a * Math.sin(th) + lat * Math.cos(th);
        out.push(place(-3.7 + x, 0.03, 3.75 + z, -th));
      }
    }
    return out;
  }, []);

  const padsRef = useRef<THREE.InstancedMesh>(null);
  const viaRingRef = useRef<THREE.InstancedMesh>(null);
  const viaHoleRef = useRef<THREE.InstancedMesh>(null);
  const capsRef = useRef<THREE.InstancedMesh>(null);
  const resRef = useRef<THREE.InstancedMesh>(null);
  const pmicPadsRef = useRef<THREE.InstancedMesh>(null);
  useMatrices(padsRef, padMats);
  useMatrices(viaRingRef, viaMats);
  useMatrices(viaHoleRef, viaMats);
  useMatrices(capsRef, capMats);
  useMatrices(resRef, resMats);
  useMatrices(pmicPadsRef, pmicPadMats);

  useLayoutEffect(
    () => () => {
      traceGeo.dispose();
      traceMat.dispose();
      passiveGeo.dispose();
      noise.dispose();
      Object.values(mats).forEach((m) => m.dispose());
    },
    [traceGeo, traceMat, passiveGeo, noise, mats],
  );

  useFrame((state) => {
    const intro = easeOutCubic(introProgress());
    traceMat.uniforms.uTime.value = state.clock.elapsedTime;
    traceMat.uniforms.uReveal.value = intro;
    traceMat.uniforms.uActivity.value = heroState.reducedMotion ? 0.35 : 1;
    traceMat.uniforms.uFogNear.value = 12 * heroState.fogScale;
    traceMat.uniforms.uFogFar.value = 30 * heroState.fogScale;
    if (state.scene.fog) traceMat.uniforms.uFogColor.value.copy(state.scene.fog.color);
    mats.ledLens.emissiveIntensity = intro * 5;
  });

  const silk = (txt: string, x: number, z: number, size = 0.13, rot = 0) => (
    <Text
      key={`${txt}-${x}-${z}`}
      font={FONT_MONO}
      fontSize={size}
      position={[x, 0.006, z]}
      rotation={[-Math.PI / 2, 0, rot]}
      anchorX="center"
      anchorY="middle"
      letterSpacing={0.06}
      material={mats.silk}
    >
      {txt}
    </Text>
  );

  // silkscreen corner brackets around U1
  const brackets = useMemo(() => {
    const out: { pos: [number, number, number]; size: [number, number] }[] = [];
    const a = 2.74;
    const len = 0.42;
    const w = 0.022;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        out.push({ pos: [sx * (a - len / 2), 0.006, sz * a], size: [len, w] });
        out.push({ pos: [sx * a, 0.006, sz * (a - len / 2)], size: [w, len] });
      }
    return out;
  }, []);

  return (
    <group>
      {/* solder-mask board */}
      <mesh rotation-x={-Math.PI / 2} material={mats.board} receiveShadow>
        <planeGeometry args={[70, 70]} />
      </mesh>

      {/* copper traces with travelling signal pulses */}
      <mesh geometry={traceGeo} material={traceMat} />

      {/* ENIG land pads under every lead */}
      <instancedMesh ref={padsRef} args={[undefined, mats.enig, padMats.length]}>
        <boxGeometry args={[PKG.padOuter - PKG.padInner, 0.012, PKG.padWidth]} />
      </instancedMesh>

      {/* vias */}
      <instancedMesh ref={viaRingRef} args={[undefined, mats.enig, viaMats.length]}>
        <cylinderGeometry args={[0.07, 0.07, 0.009, 24]} />
      </instancedMesh>
      <instancedMesh ref={viaHoleRef} args={[undefined, mats.hole, viaMats.length]} position-y={0.0012}>
        <cylinderGeometry args={[0.03, 0.03, 0.009, 16]} />
      </instancedMesh>

      {/* 0402 decoupling caps + resistors */}
      <instancedMesh ref={capsRef} args={[passiveGeo, [mats.ceramic, mats.tin, mats.tin], capMats.length]} castShadow />
      <instancedMesh ref={resRef} args={[passiveGeo, [mats.resistor, mats.tin, mats.tin], resMats.length]} castShadow />

      {/* U2: DDR4-3200 memory (her Centum work) on the +x memory bus */}
      <group position={[7.55, 0, 0]}>
        <RoundedBox args={[2.9, 0.42, 4.5]} radius={0.04} smoothness={3} position={[0, 0.25, 0]} material={mats.pkg} castShadow />
        <group position={[0, 0.462, 0]} rotation-x={-Math.PI / 2}>
          <Text font={FONT_DISPLAY} fontSize={0.36} position={[-1.15, 0.9, 0]} anchorX="left" material={mats.marking}>
            DDR4-3200
          </Text>
          <Text font={FONT_MONO} fontSize={0.15} position={[-1.15, 0.38, 0]} anchorX="left" letterSpacing={0.05} material={mats.marking}>
            8Gb x16 · 1.2V
          </Text>
          <Text font={FONT_MONO} fontSize={0.15} position={[-1.15, 0.12, 0]} anchorX="left" letterSpacing={0.05} material={mats.marking}>
            VP-MEM 2620
          </Text>
          <mesh position={[-1.15, -1.85, 0.001]} material={mats.marking}>
            <circleGeometry args={[0.08, 24]} />
          </mesh>
        </group>
      </group>

      {/* U3: 1.0 V DC/DC regulator + L1 inductor + power LED */}
      <group>
        <RoundedBox args={[1.2, 0.3, 1.2]} radius={0.03} smoothness={3} position={[-3.7, 0.17, 3.75]} material={mats.pkg} castShadow />
        <instancedMesh ref={pmicPadsRef} args={[undefined, mats.tin, pmicPadMats.length]}>
          <boxGeometry args={[0.1, 0.05, 0.13]} />
        </instancedMesh>
        <group position={[-3.7, 0.322, 3.75]} rotation-x={-Math.PI / 2}>
          <Text font={FONT_MONO} fontSize={0.17} position={[0, 0.12, 0]} anchorX="center" material={mats.marking}>
            VP1V0
          </Text>
          <Text font={FONT_MONO} fontSize={0.11} position={[0, -0.14, 0]} anchorX="center" material={mats.marking}>
            DC/DC
          </Text>
        </group>
        <RoundedBox args={[1.5, 0.72, 1.5]} radius={0.14} smoothness={4} position={[-5.4, 0.36, 3.3]} material={mats.ferrite} castShadow />
        <Text font={FONT_MONO} fontSize={0.26} position={[-5.4, 0.725, 3.3]} rotation-x={-Math.PI / 2} anchorX="center" anchorY="middle" material={mats.silk}>
          1R0
        </Text>
        <mesh position={[-3.45, 0.09, 4.75]} material={mats.ledBody}>
          <boxGeometry args={[0.42, 0.16, 0.22]} />
        </mesh>
        <mesh position={[-3.45, 0.175, 4.75]} material={mats.ledLens}>
          <boxGeometry args={[0.26, 0.02, 0.16]} />
        </mesh>
      </group>

      {/* Y1: reference crystal */}
      <group position={[4.0, 0, 3.9]}>
        <mesh position={[0, 0.06, 0]} material={mats.crystalBase} castShadow>
          <boxGeometry args={[1.28, 0.12, 1.0]} />
        </mesh>
        <RoundedBox args={[1.12, 0.16, 0.86]} radius={0.05} smoothness={3} position={[0, 0.2, 0]} material={mats.can} castShadow />
        <group position={[0, 0.281, 0]} rotation-x={-Math.PI / 2}>
          <Text font={FONT_MONO} fontSize={0.17} position={[0, 0.08, 0]} anchorX="center" material={mats.marking}>
            100.000
          </Text>
          <Text font={FONT_MONO} fontSize={0.11} position={[0, -0.16, 0]} anchorX="center" material={mats.marking}>
            VP26 MHz
          </Text>
        </group>
      </group>

      {/* silkscreen */}
      {brackets.map((b, i) => (
        <mesh key={i} position={b.pos} rotation-x={-Math.PI / 2} material={mats.silk}>
          <planeGeometry args={b.size} />
        </mesh>
      ))}
      <mesh position={[-2.62, 0.006, 2.95]} rotation-x={-Math.PI / 2} material={mats.silk}>
        <circleGeometry args={[0.07, 20]} />
      </mesh>
      {silk("U1", -3.05, -2.2, 0.2)}
      {silk("U2", 7.55, -2.62, 0.2)}
      {silk("U3", -3.7, 2.85, 0.16)}
      {silk("L1", -5.4, 4.35, 0.16)}
      {silk("Y1", 4.0, 3.15, 0.16)}
      {silk("D1 PWR", -3.45, 5.12, 0.11)}
      <Text
        font={FONT_MONO}
        fontSize={0.15}
        position={[2.9, 0.006, 5.4]}
        rotation={[-Math.PI / 2, 0, 0]}
        anchorX="left"
        anchorY="middle"
        letterSpacing={0.06}
        material={mats.silk}
      >
        VP-SILICON-2026 · REV A · DESIGNED IN BOSTON
      </Text>
    </group>
  );
}

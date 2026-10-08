"use client";

import { RoundedBox, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { DieBlockId } from "@/content/experience";
import { loadDieTextures, placeholderDieTextures, type DieTextures } from "./dieTexture";
import { bondPoints, buildWireBonds, createLeadGeometry, leadMatrices } from "./geometry";
import { clamp01, easeInOutCubic, heroState, smoothstep } from "./heroState";
import { createHighlightMaterial, createNoiseTexture } from "./materials";
import { BLOCKS, DIE, PHASE, PKG, STAGES, blockCenter, blockSize } from "./spec";

export const FONT_MONO = "/fonts/JetBrainsMono-Medium.woff";
export const FONT_DISPLAY = "/fonts/SpaceGrotesk-SemiBold.woff";

type TroikaText = THREE.Mesh & { fillOpacity: number };

function useInstanceMatrices(ref: React.RefObject<THREE.InstancedMesh | null>, matrices: THREE.Matrix4[]) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, matrices]);
}

export function Chip({ dieTextureSize }: { dieTextureSize: number }) {
  const gl = useThree((s) => s.gl);

  // ---------------------------------------------------------------- materials
  const noise = useMemo(() => {
    const t = createNoiseTexture(256, 5);
    t.repeat.set(6, 6);
    return t;
  }, []);

  const mats = useMemo(() => {
    const epoxy = new THREE.MeshPhysicalMaterial({
      color: "#151515",
      roughness: 0.6,
      metalness: 0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.5,
      bumpMap: noise,
      bumpScale: 0.35,
    });
    const lid = epoxy.clone();
    lid.transparent = true;
    return {
      epoxy,
      lid,
      lead: new THREE.MeshStandardMaterial({ color: "#dcdcdc", metalness: 1, roughness: 0.3 }),
      frame: new THREE.MeshStandardMaterial({ color: "#d7d7d7", metalness: 1, roughness: 0.26 }),
      gold: new THREE.MeshStandardMaterial({ color: "#f3c766", metalness: 1, roughness: 0.2 }),
      paddle: new THREE.MeshStandardMaterial({ color: "#bebebe", metalness: 1, roughness: 0.35 }),
      dieSide: new THREE.MeshStandardMaterial({ color: "#2c2c2c", metalness: 0.4, roughness: 0.35 }),
      marking: new THREE.MeshStandardMaterial({ color: "#a9a9a9", roughness: 0.9, metalness: 0, transparent: true }),
      dimple: new THREE.MeshStandardMaterial({ color: "#0c0c0c", roughness: 0.22, metalness: 0, transparent: true }),
      ejector: new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.85, metalness: 0, transparent: true }),
    };
  }, [noise]);

  // The die starts with 1×1 placeholder maps (it is hidden under the lid at first);
  // the real floorplan is painted in a worker and swapped in below.
  const die = useMemo(() => {
    const t: DieTextures = placeholderDieTextures();
    const mat = new THREE.MeshPhysicalMaterial({
      map: t.map,
      roughnessMap: t.rm,
      metalnessMap: t.rm,
      roughness: 1,
      metalness: 1,
      emissive: new THREE.Color("#ffffff"),
      emissiveMap: t.em,
      emissiveIntensity: 0,
      iridescence: 0.8,
      iridescenceIOR: 1.45,
      iridescenceThicknessRange: [180, 560],
      clearcoat: 0.5,
      clearcoatRoughness: 0.12,
    });
    return { mat, textures: t };
  }, []);

  useEffect(() => {
    let alive = true;
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    loadDieTextures(dieTextureSize, aniso).then((t) => {
      if (!alive) {
        Object.values(t).forEach((x) => x.dispose());
        return;
      }
      const old = die.textures;
      die.mat.map = t.map;
      die.mat.roughnessMap = t.rm;
      die.mat.metalnessMap = t.rm;
      die.mat.emissiveMap = t.em;
      die.textures = t;
      Object.values(old).forEach((x) => x.dispose());
    });
    return () => {
      alive = false;
    };
  }, [die, dieTextureSize, gl]);

  // ---------------------------------------------------------------- geometry
  const leadGeo = useMemo(() => createLeadGeometry(), []);
  const leadMats = useMemo(() => leadMatrices(PKG.half), []);
  const bonds = useMemo(() => bondPoints(), []);
  const wireGeo = useMemo(() => buildWireBonds(bonds.pads, bonds.tips), [bonds]);

  const fingerMats = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    return bonds.tips.map((t, i) => {
      const e = bonds.edges[i];
      const dx = e.x - t.x;
      const dz = e.z - t.z;
      const len = Math.hypot(dx, dz);
      return new THREE.Matrix4().compose(
        new THREE.Vector3((t.x + e.x) / 2, PKG.parting + 0.006, (t.z + e.z) / 2),
        new THREE.Quaternion().setFromAxisAngle(up, Math.atan2(-dz, dx)),
        new THREE.Vector3(len + 0.05, 1, 1),
      );
    });
  }, [bonds]);

  const ballMats = useMemo(
    () =>
      bonds.pads.map((p) =>
        new THREE.Matrix4().compose(p, new THREE.Quaternion(), new THREE.Vector3(1, 0.55, 1)),
      ),
    [bonds],
  );

  const leadsRef = useRef<THREE.InstancedMesh>(null);
  const fingersRef = useRef<THREE.InstancedMesh>(null);
  const ballsRef = useRef<THREE.InstancedMesh>(null);
  useInstanceMatrices(leadsRef, leadMats);
  useInstanceMatrices(fingersRef, fingerMats);
  useInstanceMatrices(ballsRef, ballMats);

  // block highlight overlays
  const highlights = useMemo(
    () =>
      (Object.keys(BLOCKS) as DieBlockId[]).map((id) => {
        const size = blockSize(id);
        return { id, size, center: blockCenter(id), mat: createHighlightMaterial(BLOCKS[id].color, size) };
      }),
    [],
  );

  useLayoutEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
      die.mat.dispose();
      Object.values(die.textures).forEach((t) => t.dispose());
      highlights.forEach((h) => h.mat.dispose());
      noise.dispose();
    },
    [mats, die, highlights, noise],
  );

  // ---------------------------------------------------------------- animation
  const hingeRef = useRef<THREE.Group>(null);
  const textRefs = useRef<(TroikaText | null)[]>([]);

  useFrame((state) => {
    const p = heroState.smooth;
    const t = state.clock.elapsedTime;

    // Lid opens on a hinge along the back edge, then fades away.
    const open = easeInOutCubic(clamp01((p - PHASE.decapStart) / (PHASE.lidGone - PHASE.decapStart)));
    const fade = 1 - smoothstep(PHASE.decapStart + 0.12, PHASE.lidGone, p);
    const hinge = hingeRef.current;
    if (hinge) {
      hinge.rotation.x = -open * 1.75;
      hinge.position.y = PKG.top + open * 0.45;
      hinge.visible = fade > 0.004;
    }
    mats.lid.opacity = fade;
    mats.marking.opacity = 0.9 * fade;
    mats.dimple.opacity = fade;
    mats.ejector.opacity = fade;
    for (const tx of textRefs.current) if (tx) tx.fillOpacity = fade;

    // Die "powers on" as it is revealed.
    die.mat.emissiveIntensity = smoothstep(0.3, 0.46, p) * (0.85 + 0.15 * Math.sin(t * 2.2));

    // Each role's block lights up in turn and stays dimly lit afterwards.
    const outro = smoothstep(PHASE.outroStart, 0.97, p);
    for (const h of highlights) {
      const st = STAGES.find((s) => s.block === h.id)!;
      const on = smoothstep(st.start - 0.03, st.start + 0.01, p);
      const spot = on * (1 - smoothstep(st.end - 0.01, st.end + 0.03, p));
      h.mat.uniforms.uIntensity.value = on * 0.26 + spot * 0.8 + outro * 0.4;
      h.mat.uniforms.uTime.value = t;
    }
  });

  const setText = (i: number) => (el: TroikaText | null) => {
    textRefs.current[i] = el;
  };

  const baseH = PKG.parting - PKG.standoff;
  const lidH = PKG.top - PKG.parting;

  return (
    <group>
      {/* mold compound: bottom half */}
      <RoundedBox
        args={[PKG.half * 2, baseH, PKG.half * 2]}
        radius={0.03}
        smoothness={3}
        position={[0, PKG.standoff + baseH / 2, 0]}
        material={mats.epoxy}
        castShadow
      />

      {/* gull-wing leads */}
      <instancedMesh ref={leadsRef} args={[leadGeo, mats.lead, leadMats.length]} castShadow />

      {/* lead frame fingers + die paddle */}
      <instancedMesh ref={fingersRef} args={[undefined, mats.frame, fingerMats.length]}>
        <boxGeometry args={[1, 0.012, 0.055]} />
      </instancedMesh>
      <mesh position={[0, PKG.parting + 0.006, 0]} material={mats.paddle}>
        <boxGeometry args={[DIE.half * 2 + 0.12, 0.012, DIE.half * 2 + 0.12]} />
      </mesh>

      {/* silicon die */}
      <mesh position={[0, (DIE.paddleTop + DIE.top) / 2, 0]} material={mats.dieSide}>
        <boxGeometry args={[DIE.half * 2, DIE.top - DIE.paddleTop, DIE.half * 2]} />
      </mesh>
      <mesh position={[0, DIE.top + 0.0004, 0]} rotation-x={-Math.PI / 2} material={die.mat}>
        <planeGeometry args={[DIE.half * 2, DIE.half * 2]} />
      </mesh>

      {highlights.map((h) => (
        <mesh
          key={h.id}
          position={[h.center[0], DIE.top + 0.003, h.center[2]]}
          rotation-x={-Math.PI / 2}
          material={h.mat}
          renderOrder={2}
        >
          <planeGeometry args={h.size} />
        </mesh>
      ))}

      {/* gold wire bonds + ball bonds */}
      <mesh geometry={wireGeo} material={mats.gold} />
      <instancedMesh ref={ballsRef} args={[undefined, mats.gold, ballMats.length]}>
        <sphereGeometry args={[0.012, 10, 8]} />
      </instancedMesh>

      {/* mold compound: lid, hinged on its back edge */}
      <group ref={hingeRef} position={[0, PKG.top, -PKG.half]}>
        <group position={[0, -PKG.top, PKG.half]}>
          <RoundedBox
            args={[PKG.half * 2, lidH, PKG.half * 2]}
            radius={0.045}
            smoothness={4}
            position={[0, PKG.parting + lidH / 2, 0]}
            material={mats.lid}
            castShadow
          />
          {/* laser marking, lying on the top face */}
          <group position={[0, PKG.top + 0.0015, 0]} rotation-x={-Math.PI / 2}>
            <Text ref={setText(0)} font={FONT_DISPLAY} fontSize={0.3} position={[-1.6, 0.55, 0]} anchorX="left" anchorY="middle" letterSpacing={0.015}>
              VAISHNAVI PATIL
              <primitive object={mats.marking} attach="material" />
            </Text>
            <Text ref={setText(1)} font={FONT_MONO} fontSize={0.145} position={[-1.6, 0.15, 0]} anchorX="left" anchorY="middle" letterSpacing={0.04}>
              VLSI · RTL-GDSII · 28NM
              <primitive object={mats.marking} attach="material" />
            </Text>
            <Text ref={setText(2)} font={FONT_MONO} fontSize={0.115} position={[-1.6, -0.15, 0]} anchorX="left" anchorY="middle" letterSpacing={0.05}>
              MS ECE · MICROSYSTEMS · NEU
              <primitive object={mats.marking} attach="material" />
            </Text>
            <Text ref={setText(3)} font={FONT_MONO} fontSize={0.115} position={[-1.6, -0.38, 0]} anchorX="left" anchorY="middle" letterSpacing={0.05}>
              2620 · BOSTON MA · REV A
              <primitive object={mats.marking} attach="material" />
            </Text>
            {/* pin-1 dimple and ejector-pin marks */}
            <mesh position={[-1.5, -1.5, 0.0005]} material={mats.dimple}>
              <circleGeometry args={[0.11, 32]} />
            </mesh>
            <mesh position={[1.32, 1.32, 0.0003]} material={mats.ejector}>
              <circleGeometry args={[0.3, 48]} />
            </mesh>
            <mesh position={[1.32, -1.32, 0.0003]} material={mats.ejector}>
              <circleGeometry args={[0.3, 48]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

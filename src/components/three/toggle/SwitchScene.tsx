"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type SwitchTone = "light" | "dark";

// A miniature 3-position slide switch: glossy pill housing, an inlaid track with
// the three modes engraved (sun · monitor · moon) and a chrome knob that springs
// between the detents. Rendered on demand only (frameloop="demand").

const GAP = 1; // distance between detents
const STOPS = [-GAP, 0, GAP]; // light, system, dark
const KNOB_R = 0.36;
const KNOB_H = 0.2;

const ICONS = [
  // sun
  ["M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8Z", "M12 2.5v2M12 19.5v2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M2.5 12h2M19.5 12h2M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"],
  // monitor
  ["M5 4.5h14a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z", "M8.5 20h7M12 16v4"],
  // moon
  ["M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"],
];

// Dark tone: polished chrome knob on gloss black. Light tone: satin aluminium
// knob on white ceramic (full chrome would mirror the dark room and look grey).
const TONES: Record<SwitchTone, { housing: string; track: string; engrave: string; knob: string; metal: number; rough: number; mark: string; glow: number }> = {
  dark: { housing: "#1a1a1d", track: "#0b0b0d", engrave: "#77777d", knob: "#d9d9de", metal: 1, rough: 0.2, mark: "#141416", glow: 1.1 },
  light: { housing: "#f4f4f5", track: "#e0e0e4", engrave: "#86868c", knob: "#f4f4f6", metal: 0.5, rough: 0.3, mark: "#18181b", glow: 0 },
};

function stadium(halfLen: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(-halfLen, -r);
  s.lineTo(halfLen, -r);
  s.absarc(halfLen, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(-halfLen, r);
  s.absarc(-halfLen, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false);
  return s;
}

/** White stroke icon on a transparent canvas; tinted by the material colour. */
function iconTexture(paths: string[]) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.scale(256 / 24, 256 / 24);
  g.strokeStyle = "#fff";
  g.lineWidth = 2;
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const d of paths) g.stroke(new Path2D(d));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Soft round shadow under the knob. */
function blobTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grad.addColorStop(0, "rgba(0,0,0,0.55)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function Switch({ index, hover, tone, onReady }: { index: number; hover: number | null; tone: SwitchTone; onReady: () => void }) {
  const invalidate = useThree((s) => s.invalidate);
  const knob = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.PointLight>(null);
  const motion = useRef({ x: STOPS[index], v: 0, started: false, reported: false });
  const reduced = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  const geo = useMemo(() => {
    const housing = new THREE.ExtrudeGeometry(stadium(1.08, 0.6), {
      depth: 0.26,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 8,
      curveSegments: 32,
    });
    housing.rotateX(-Math.PI / 2);
    housing.translate(0, -0.34, 0); // top face at y = 0
    const track = new THREE.ShapeGeometry(stadium(GAP, 0.44), 32);
    track.rotateX(-Math.PI / 2);
    const profile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(KNOB_R, 0),
      new THREE.Vector2(KNOB_R, KNOB_H - 0.06),
      new THREE.Vector2(KNOB_R - 0.018, KNOB_H - 0.018),
      new THREE.Vector2(KNOB_R - 0.06, KNOB_H),
      new THREE.Vector2(0, KNOB_H),
    ];
    const knobGeo = new THREE.LatheGeometry(profile, 64);
    const icon = new THREE.PlaneGeometry(0.3, 0.3).rotateX(-Math.PI / 2);
    const cap = new THREE.CircleGeometry(0.21, 48).rotateX(-Math.PI / 2);
    const blob = new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2);
    return { housing, track, knobGeo, icon, cap, blob };
  }, []);

  const tex = useMemo(() => ({ icons: ICONS.map(iconTexture), blob: blobTexture() }), []);

  const mats = useMemo(
    () => ({
      housing: new THREE.MeshPhysicalMaterial({ roughness: 0.36, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.18 }),
      track: new THREE.MeshPhysicalMaterial({ roughness: 0.3, metalness: 0.1, clearcoat: 0.6 }),
      engrave: tex.icons.map((map) => new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0.7, depthWrite: false })),
      knob: new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.2, clearcoat: 0.4 }),
      // the knob's icon is swapped per frame to match the nearest detent
      mark: new THREE.MeshBasicMaterial({ map: tex.icons[0], transparent: true, depthWrite: false }),
      blob: new THREE.MeshBasicMaterial({ map: tex.blob, transparent: true, depthWrite: false }),
    }),
    [tex],
  );

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      tex.icons.forEach((t) => t.dispose());
      tex.blob.dispose();
      [mats.housing, mats.track, mats.knob, mats.mark, mats.blob, ...mats.engrave].forEach((m) => m.dispose());
    },
    [geo, tex, mats],
  );

  // Colours follow the tone (light page, or dark page / over the hero).
  useEffect(() => {
    const t = TONES[tone];
    mats.housing.color.set(t.housing);
    mats.track.color.set(t.track);
    mats.engrave.forEach((m) => m.color.set(t.engrave));
    mats.knob.color.set(t.knob);
    mats.knob.metalness = t.metal;
    mats.knob.roughness = t.rough;
    mats.mark.color.set(t.mark);
    if (glow.current) glow.current.intensity = t.glow;
    invalidate();
  }, [tone, mats, invalidate]);

  useEffect(() => invalidate(), [index, hover, invalidate]);

  useFrame((_, delta) => {
    const s = motion.current;
    const dt = Math.min(delta, 1 / 30);
    // the knob leans a little toward a hovered detent
    const target = STOPS[index] + (hover !== null && hover !== index ? Math.sign(hover - index) * 0.09 : 0);
    if (reduced || !s.started) {
      s.x = target;
      s.v = 0;
      s.started = true;
    } else {
      s.v += ((target - s.x) * 210 - s.v * 19) * dt;
      s.x += s.v * dt;
    }
    const k = knob.current;
    if (k) {
      k.position.x = s.x;
      k.rotation.z = THREE.MathUtils.clamp(-s.v * 0.035, -0.22, 0.22);
      const lift = hover !== null ? 0.035 : 0;
      k.position.y += (lift - k.position.y) * Math.min(1, dt * 14);
    }
    if (shadow.current) shadow.current.position.x = s.x;
    if (glow.current) glow.current.position.x = s.x;
    // the knob shows the icon of the detent it is closest to
    const near = THREE.MathUtils.clamp(Math.round(s.x / GAP) + 1, 0, 2);
    if (mats.mark.map !== tex.icons[near]) mats.mark.map = tex.icons[near];

    const settling = Math.abs(target - s.x) > 1e-4 || Math.abs(s.v) > 1e-4 || (k && Math.abs((hover !== null ? 0.035 : 0) - k.position.y) > 1e-4);
    if (settling) invalidate();
    else if (!s.reported) {
      s.reported = true;
      onReady();
    }
  });

  return (
    <group rotation-x={0.02}>
      <mesh geometry={geo.housing} material={mats.housing} />
      <mesh geometry={geo.track} material={mats.track} position-y={0.002} />
      {STOPS.map((x, i) => (
        <mesh key={i} geometry={geo.icon} material={mats.engrave[i]} position={[x, 0.004, 0]} />
      ))}
      <mesh ref={shadow} geometry={geo.blob} material={mats.blob} position-y={0.006} />
      <group ref={knob}>
        <mesh geometry={geo.knobGeo} material={mats.knob} position-y={0.008} />
        <mesh geometry={geo.cap} material={mats.mark} position-y={KNOB_H + 0.01} />
      </group>
      <pointLight ref={glow} position={[0, 0.5, 0.25]} distance={1.6} decay={2} color="#ffffff" />
    </group>
  );
}

export default function SwitchScene(props: { index: number; hover: number | null; tone: SwitchTone; onReady: () => void }) {
  return (
    <Canvas
      flat
      frameloop="demand"
      dpr={[1.5, 2.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ fov: 15.5, position: [0, 3.1, 4.5] }}
      onCreated={({ camera }) => camera.lookAt(0, -0.06, 0)}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[2.5, 5, 3]} intensity={1.6} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, 1.5]} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-4, 1.5, 2]} scale={[3, 1, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[4, 1.5, -1]} scale={[3, 1, 1]} />
        <Lightformer form="ring" intensity={0.8} position={[0, 2, -4]} scale={2} />
      </Environment>
      <Switch {...props} />
    </Canvas>
  );
}

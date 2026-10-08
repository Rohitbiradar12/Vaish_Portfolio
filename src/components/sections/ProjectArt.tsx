// Procedural layout illustrations used until real screenshots arrive.
// Drawn as a dark EDA layout view in both themes; layers use Virtuoso-style colours.

import { useId } from "react";
import type { Project } from "@/content/projects";

const C = {
  bg: "#0a0a0a",
  m1: "#4c8dff",
  m2: "#e05cff",
  m3: "#ffd24a",
  poly: "#ff5a5f",
  diff: "#36d399",
  nwell: "#7a5cff",
  via: "#ededed",
  sig: "#f2f2f2",
  dim: "#6b6b6b",
  oxide: "#d6d6d6",
  sub: "#2c2c2c",
};

const Label = ({ x, y, children, anchor = "start", fill = C.dim }: { x: number; y: number; children: string; anchor?: "start" | "middle" | "end"; fill?: string }) => (
  <text x={x} y={y} fill={fill} fontSize="8" fontFamily="var(--font-jetbrains-mono)" letterSpacing="0.08em" textAnchor={anchor}>
    {children}
  </text>
);

function Xor() {
  const gates = [70, 104, 138, 182, 216, 250];
  return (
    <>
      <rect x="0" y="8" width="320" height="10" fill={C.m1} opacity="0.75" />
      <rect x="0" y="182" width="320" height="10" fill={C.m1} opacity="0.75" />
      <rect x="22" y="24" width="276" height="78" fill={C.nwell} fillOpacity="0.07" stroke={C.nwell} strokeDasharray="4 3" />
      <rect x="44" y="42" width="232" height="36" fill={C.diff} fillOpacity="0.22" stroke={C.diff} />
      <rect x="44" y="124" width="232" height="36" fill={C.diff} fillOpacity="0.22" stroke={C.diff} />
      {gates.map((x) => (
        <rect key={x} x={x - 3} y="32" width="6" height="138" fill={C.poly} opacity="0.9" />
      ))}
      {[54, 87, 121, 160, 199, 233, 266].map((x) => (
        <g key={x}>
          <rect x={x - 3} y="56" width="6" height="6" fill={C.via} />
          <rect x={x - 3} y="138" width="6" height="6" fill={C.via} />
        </g>
      ))}
      <path d="M54 59 V13 M121 59 V13 M199 59 V13 M266 59 V13" stroke={C.m1} strokeWidth="5" opacity="0.8" />
      <path d="M54 141 V187 M160 141 V187 M266 141 V187" stroke={C.m1} strokeWidth="5" opacity="0.8" />
      <path d="M87 59 V100 H233 V141 M233 59 V100" stroke={C.m1} strokeWidth="5" fill="none" opacity="0.85" />
      <path className="anim-dash" d="M87 59 V100 H233 V141 M233 100 H300" stroke={C.sig} strokeWidth="2" fill="none" />
      <Label x={300} y={96} anchor="end" fill={C.sig}>Y = A⊕B</Label>
      <Label x={70} y={180} anchor="middle">A</Label>
      <Label x={104} y={180} anchor="middle">B</Label>
      <Label x={6} y={30}>VDD</Label>
      <Label x={6} y={178}>GND</Label>
    </>
  );
}

function Alu() {
  const rows = [
    { y: 30, label: "ADD", color: C.m3 },
    { y: 70, label: "LOGIC", color: C.m1 },
    { y: 110, label: "MUX", color: C.m2 },
    { y: 150, label: "CMP", color: C.diff },
  ];
  const slices = 24;
  return (
    <>
      {rows.map((r) => (
        <g key={r.label}>
          <Label x={10} y={r.y + 18}>{r.label}</Label>
          {Array.from({ length: slices }, (_, i) => (
            <rect
              key={i}
              x={52 + i * 10.6}
              y={r.y}
              width="8.6"
              height="28"
              fill={r.color}
              fillOpacity={0.14 + ((i * 7 + r.y) % 5) * 0.04}
              stroke={r.color}
              strokeOpacity="0.55"
              strokeWidth="0.6"
            />
          ))}
        </g>
      ))}
      <path d="M52 44 H306" stroke={C.m3} strokeWidth="1.2" opacity="0.6" />
      <path className="anim-dash-slow" d="M306 44 H52" stroke={C.sig} strokeWidth="2.2" fill="none" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={52 + i * 42.4} y="22" width="2.4" height="160" fill={C.via} opacity="0.12" />
      ))}
      <Label x={306} y={192} anchor="end">32 BIT-SLICES · 180nm</Label>
      <Label x={306} y={18} anchor="end" fill={C.sig}>CARRY →</Label>
    </>
  );
}

function OpAmp() {
  const finger = (x: number, y: number, n: number, color: string) =>
    Array.from({ length: n }, (_, i) => <rect key={i} x={x + i * 7} y={y} width="3" height="34" fill={color} opacity="0.85" />);
  return (
    <>
      <rect x="18" y="20" width="118" height="92" fill="none" stroke={C.diff} strokeWidth="5" opacity="0.5" />
      {[
        [30, 30, "A"],
        [80, 30, "B"],
        [30, 70, "B"],
        [80, 70, "A"],
      ].map(([x, y, t]) => (
        <g key={`${x}-${y}`}>
          <rect x={x as number} y={y as number} width="42" height="34" fill={t === "A" ? C.m1 : C.m2} fillOpacity="0.18" stroke={t === "A" ? C.m1 : C.m2} />
          {finger((x as number) + 6, y as number, 5, C.poly)}
          <Label x={(x as number) + 21} y={(y as number) + 22} anchor="middle" fill="#ededed">{t as string}</Label>
        </g>
      ))}
      <Label x={77} y={124} anchor="middle">DIFF PAIR · ABBA</Label>
      <rect x="160" y="20" width="140" height="86" fill={C.m3} fillOpacity="0.08" stroke={C.m3} />
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={`M${168 + i * 15} 28 V98`} stroke={C.m3} strokeOpacity="0.35" />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <path key={i} d={`M168 ${34 + i * 15} H292`} stroke={C.m2} strokeOpacity="0.35" />
      ))}
      <Label x={230} y={120} anchor="middle">Cc · MIM</Label>
      <rect x="18" y="140" width="118" height="44" fill={C.m1} fillOpacity="0.1" stroke={C.m1} strokeOpacity="0.7" />
      {finger(26, 145, 15, C.poly)}
      <Label x={77} y={196} anchor="middle">MIRROR</Label>
      <rect x="160" y="140" width="140" height="44" fill={C.diff} fillOpacity="0.1" stroke={C.diff} strokeOpacity="0.7" />
      {finger(168, 145, 18, C.poly)}
      <Label x={230} y={196} anchor="middle">OUTPUT STAGE</Label>
      <path className="anim-dash" d="M136 66 H150 V162 H160" stroke={C.sig} strokeWidth="2" fill="none" />
    </>
  );
}

function GateOxide({ uid }: { uid: string }) {
  const stack = (x: number, oxideH: number, oxideColor: string, gate: string, gateLabel: string, oxLabel: string, leak: boolean) => (
    <g>
      <rect x={x} y="132" width="130" height="50" fill={C.sub} />
      <rect x={x + 16} y={132 - oxideH} width="98" height={oxideH} fill={oxideColor} opacity="0.85" />
      <rect x={x + 16} y={132 - oxideH - 52} width="98" height="52" fill={gate} />
      <Label x={x + 65} y={132 - oxideH - 22} anchor="middle" fill="#0a0a0a">{gateLabel}</Label>
      <Label x={x + 65} y={198} anchor="middle">{oxLabel}</Label>
      {leak &&
        [36, 62, 88].map((dx) => (
          <path key={dx} className="anim-dash-fast" d={`M${x + dx} 150 V${132 - oxideH - 6}`} stroke={C.sig} strokeWidth="1.6" fill="none" />
        ))}
    </g>
  );
  return (
    <>
      {stack(18, 5, "#e2e2e2", C.poly, "POLY", "SiO₂ · k≈3.9 · leaky", true)}
      {stack(172, 16, "#b98cff", "#b3b3b3", "METAL", "HfO₂ · k≈25 · high-k", false)}
      <Label x={83} y={24} anchor="middle" fill={C.dim}>THEN</Label>
      <Label x={237} y={24} anchor="middle" fill={C.sig}>NOW</Label>
      <path d="M152 100 L166 100" stroke={C.dim} strokeWidth="1.5" markerEnd={`url(#${uid}-arrow)`} />
    </>
  );
}

function Fdsoi() {
  return (
    <>
      <rect x="10" y="160" width="300" height="30" fill={C.sub} />
      <rect x="10" y="144" width="300" height="16" fill={C.nwell} opacity="0.45" />
      <rect x="10" y="128" width="300" height="16" fill={C.oxide} opacity="0.5" />
      <rect x="10" y="120" width="300" height="8" fill={C.diff} opacity="0.9" />
      <rect x="34" y="94" width="66" height="26" fill={C.poly} opacity="0.7" />
      <rect x="220" y="94" width="66" height="26" fill={C.poly} opacity="0.7" />
      <rect x="132" y="114" width="56" height="6" fill="#b98cff" />
      <rect x="132" y="64" width="56" height="50" fill="#b3b3b3" />
      <rect x="120" y="64" width="12" height="56" fill="#a4a4a4" opacity="0.35" />
      <rect x="188" y="64" width="12" height="56" fill="#a4a4a4" opacity="0.35" />
      {[67, 160, 253].map((x) => (
        <rect key={x} x={x - 5} y="24" width="10" height={x === 160 ? 40 : 70} fill={C.m3} opacity="0.75" />
      ))}
      <rect x="10" y="16" width="300" height="10" fill={C.m1} opacity="0.7" />
      <path className="anim-dash" d="M100 124 H220" stroke={C.sig} strokeWidth="2.5" fill="none" />
      <Label x={67} y={88} anchor="middle" fill="#ededed">S</Label>
      <Label x={253} y={88} anchor="middle" fill="#ededed">D</Label>
      <Label x={160} y={93} anchor="middle" fill="#0a0a0a">G</Label>
      <Label x={306} y={140} anchor="end">BOX</Label>
      <Label x={306} y={156} anchor="end">BACK GATE · V_BB</Label>
      <Label x={14} y={116}>Si film ~7nm</Label>
    </>
  );
}

function Ahb({ uid }: { uid: string }) {
  const st = [
    { x: 160, y: 50, t: "IDLE", cls: "fsm-a" },
    { x: 238, y: 140, t: "ENABLE", cls: "fsm-c" },
    { x: 82, y: 140, t: "SETUP", cls: "fsm-b" },
  ];
  return (
    <>
      <path d="M10 30 H40 M10 50 H40 M10 70 H40" stroke={C.m1} strokeWidth="3" opacity="0.7" />
      <path d="M280 120 H310 M280 140 H310 M280 160 H310" stroke={C.m2} strokeWidth="3" opacity="0.7" />
      <Label x={10} y={20}>AHB</Label>
      <Label x={310} y={110} anchor="end">APB</Label>
      <path d="M172 76 L222 118" stroke={C.dim} strokeWidth="1.5" markerEnd={`url(#${uid}-arrow)`} />
      <path d="M208 146 L114 146" stroke={C.dim} strokeWidth="1.5" markerEnd={`url(#${uid}-arrow)`} />
      <path d="M96 116 L146 76" stroke={C.dim} strokeWidth="1.5" markerEnd={`url(#${uid}-arrow)`} />
      {st.map((s) => (
        <g key={s.t}>
          <circle cx={s.x} cy={s.y} r="27" fill="#111111" stroke={C.dim} />
          <circle className={s.cls} cx={s.x} cy={s.y} r="27" fill={C.m3} fillOpacity="0.12" stroke={C.m3} strokeWidth="2" />
          <Label x={s.x} y={s.y + 3} anchor="middle" fill="#ededed">{s.t}</Label>
        </g>
      ))}
    </>
  );
}

const ART: Record<Project["art"], (p: { uid: string }) => React.JSX.Element> = {
  xor: Xor,
  alu: Alu,
  opamp: OpAmp,
  gateoxide: GateOxide,
  fdsoi: Fdsoi,
  ahb: Ahb,
};

export function ProjectArt({ art, className }: { art: Project["art"]; className?: string }) {
  const Art = ART[art];
  const uid = `art${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-hidden>
      <defs>
        <marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={C.dim} />
        </marker>
        <pattern id={`${uid}-grid`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0 H0 V10" fill="none" stroke="#ffffff" strokeOpacity="0.035" />
        </pattern>
      </defs>
      <rect width="320" height="200" fill={C.bg} />
      <rect width="320" height="200" fill={`url(#${uid}-grid)`} />
      <Art uid={uid} />
    </svg>
  );
}

"use client";

import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { profile } from "@/content/profile";
import { publications, scholar } from "@/content/publications";
import { cn } from "@/lib/format";

// The Google Scholar profile rendered as a small PCB: an IC (U1) whose output
// pins drive three 7-segment displays (DS1-DS3), a status LED and a tactile
// switch (SW1), with edge-connector fingers feeding the paper list below.
// Desktop uses one fixed 1072×440 coordinate space (SVG + % positioned HTML,
// text in container units) so traces always line up; phones get a stacked board.

const W = 1072;
const H = 440;
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

const firstAuthor = publications.filter((p) => p.authors[0] === profile.name).length;
const latest = publications[0];
const metric = (label: string) => scholar.metrics.find((m) => m.label === label)!.value;

const LEDS = [
  { color: "#00e5ff", text: `${publications.length} PAPERS` },
  { color: "#ffc94a", text: `${firstAuthor} × FIRST AUTHOR` },
  { color: "#e05cff", text: `${latest.publisher?.toUpperCase() ?? latest.venue?.toUpperCase()} '${String(latest.year).slice(2)}` },
];

// --------------------------------------------------------------------------
// 7-segment digits
// --------------------------------------------------------------------------
const SEG = {
  a: "5.5,4 9.5,0 46.5,0 50.5,4 46.5,8 9.5,8",
  b: "52,5.5 56,9.5 56,44.5 52,48.5 48,44.5 48,9.5",
  c: "52,51.5 56,55.5 56,90.5 52,94.5 48,90.5 48,55.5",
  d: "5.5,96 9.5,92 46.5,92 50.5,96 46.5,100 9.5,100",
  e: "4,51.5 8,55.5 8,90.5 4,94.5 0,90.5 0,55.5",
  f: "4,5.5 8,9.5 8,44.5 4,48.5 0,44.5 0,9.5",
  g: "5.5,50 9.5,46 46.5,46 50.5,50 46.5,54 9.5,54",
} as const;
const GLYPH: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abged",
  "3": "abgcd",
  "4": "fgbc",
  "5": "afgcd",
  "6": "afgedc",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
  " ": "",
};

function Digit({ ch }: { ch: string }) {
  const lit = GLYPH[ch] ?? "";
  const keys = Object.keys(SEG) as (keyof typeof SEG)[];
  return (
    <svg viewBox="-8 -2 72 104" className="h-full w-auto" aria-hidden>
      <g transform="skewX(-7) translate(6 0)">
        {keys.map((k) => (
          <polygon key={k} points={SEG[k]} fill="#0c2a30" opacity={lit.includes(k) ? 0 : 0.55} />
        ))}
        <g className="seg-lit">
          {keys
            .filter((k) => lit.includes(k))
            .map((k) => (
              <polygon key={k} points={SEG[k]} fill="#00e5ff" />
            ))}
        </g>
      </g>
    </svg>
  );
}

/** Counts up when `run` flips true: a short power-on scramble, then an eased climb. */
function useCountUp(target: number, run: boolean) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = now - t0;
      if (t < 320) {
        setV(Math.floor(Math.random() * (target >= 10 ? 100 : 10)));
      } else {
        const k = Math.min(1, (t - 320) / 1200);
        setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
        if (k >= 1) return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target]);
  return v;
}

function SegDisplay({ label, value, run, className }: { label: string; value: number; run: boolean; className?: string }) {
  const reduced = useReducedMotion();
  const counted = useCountUp(value, run && !reduced);
  const shown = reduced ? value : counted;
  const text = String(shown).padStart(2, " ").slice(-2);
  return (
    <div className={cn("seg-module", className)} role="img" aria-label={`${label}: ${value}`}>
      <span className="seg-screw left-[6%] top-[8%]" />
      <span className="seg-screw right-[6%] top-[8%]" />
      <span className="seg-screw bottom-[8%] left-[6%]" />
      <span className="seg-screw bottom-[8%] right-[6%]" />
      <div className="seg-glass">
        {text.split("").map((ch, i) => (
          <Digit key={i} ch={ch} />
        ))}
      </div>
    </div>
  );
}

function Tactile({ className }: { className?: string }) {
  return (
    <a href={scholar.url} target="_blank" rel="noreferrer" className={cn("tactile group", className)}>
      <span className="tactile-dome" aria-hidden />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="tactile-label">View on Google Scholar ↗</span>
        <span className="tactile-sub">SW1 · press to open profile</span>
      </span>
    </a>
  );
}

function ChipMarking({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("chip-epoxy", compact && "chip-epoxy--compact")}>
      <span className="chip-pin1" aria-hidden />
      <div className="chip-mark">
        <p className="chip-mark-title">VP-SCHOLAR</p>
        <p className="chip-mark-sub">Research co-processor</p>
        <span className="chip-mark-rule" />
        <p className="chip-mark-name">{profile.name}</p>
        <p className="chip-mark-sub">{scholar.affiliation}</p>
        <p className="chip-mark-sub chip-mark-verified">Google Scholar · verified</p>
      </div>
      <p className="chip-mark-lot">2620 · REV A</p>
    </div>
  );
}

// --------------------------------------------------------------------------
// Desktop board (one coordinate space)
// --------------------------------------------------------------------------
const CHIP = { x: 150, y: 110, w: 300, h: 220 };
const PIN_Y = Array.from({ length: 6 }, (_, i) => CHIP.y + (CHIP.h / 6) * (i + 0.5));
const LEFT_PINS = [...scholar.interests.map((s) => s.replace("Digital Electronics", "Digital elec.").replace("Physical Design", "Phys. design").toUpperCase()), "GND"].slice(0, 6);
const RIGHT_PINS = ["VDD", "I10", "H_IDX", "CIT", "PAPERS", "OUT"];
const DISPLAYS = [
  { x: 560, label: "DS1 · CITATIONS", metric: "Citations" },
  { x: 730, label: "DS2 · h-INDEX", metric: "h-index" },
  { x: 900, label: "DS3 · i10-INDEX", metric: "i10-index" },
];
const DS = { y: 100, w: 150, h: 120 };
const BTN = { x: 560, y: 340, w: 490, h: 58 };
const BOTTOM_X = [0, 1, 2, 3].map((i) => CHIP.x + (CHIP.w / 4) * (i + 0.5));

// Orthogonal routes; channel/lane spacing keeps the bus crossing-free.
const TRACES = [
  `M474 ${PIN_Y[0]} H492 V66 H1046`,
  `M474 ${PIN_Y[1]} H506 V78 H${DISPLAYS[2].x + DS.w / 2} V${DS.y}`,
  `M474 ${PIN_Y[2]} H520 V86 H${DISPLAYS[1].x + DS.w / 2} V${DS.y}`,
  `M474 ${PIN_Y[3]} H534 V94 H${DISPLAYS[0].x + DS.w / 2} V${DS.y}`,
  `M474 ${PIN_Y[4]} H548 V300 H566`,
  `M474 ${PIN_Y[5]} H540 V${BTN.y + BTN.h / 2} H${BTN.x}`,
  ...BOTTOM_X.map((x) => `M${x} 352 V412`),
];

function BoardSvg() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="sb-mask" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0b1d16" />
          <stop offset="0.55" stopColor="#07130e" />
          <stop offset="1" stopColor="#050d0a" />
        </linearGradient>
        <radialGradient id="sb-light" cx="0.3" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#1f5a46" stopOpacity="0.35" />
          <stop offset="1" stopColor="#1f5a46" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sb-pin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1f3f6" />
          <stop offset="1" stopColor="#8f97a2" />
        </linearGradient>
        <linearGradient id="sb-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6d77a" />
          <stop offset="1" stopColor="#b98a2e" />
        </linearGradient>
        <pattern id="sb-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.9" fill="#9fe3c9" fillOpacity="0.08" />
        </pattern>
        <filter id="sb-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      <rect width={W} height={H} rx="18" fill="url(#sb-mask)" />
      <rect width={W} height={H} rx="18" fill="url(#sb-light)" />
      <rect width={W} height={H} rx="18" fill="url(#sb-grid)" />
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="18" fill="none" stroke="#1f3b30" />

      {/* mounting holes */}
      {[
        [20, 20],
        [W - 20, 20],
        [20, H - 20],
        [W - 20, H - 20],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="8.5" fill="#020504" stroke="url(#sb-gold)" strokeWidth="3.5" />
        </g>
      ))}

      {/* copper traces under the mask + travelling pulses */}
      {TRACES.map((d, i) => (
        <path key={`t${i}`} d={d} fill="none" stroke="#7a5532" strokeOpacity="0.75" strokeWidth="3" strokeLinejoin="round" />
      ))}
      <g filter="url(#sb-glow)" opacity="0.9">
        {TRACES.slice(0, 6).map((d, i) => (
          <path key={`g${i}`} d={d} fill="none" stroke="#00e5ff" strokeWidth="3" className="sb-pulse" style={{ animationDelay: `${i * -0.45}s` }} />
        ))}
      </g>
      {TRACES.slice(0, 6).map((d, i) => (
        <path key={`p${i}`} d={d} fill="none" stroke="#bff8ff" strokeWidth="1.6" className="sb-pulse" style={{ animationDelay: `${i * -0.45}s` }} />
      ))}

      {/* vias */}
      {[
        [1046, 66],
        [506, 78],
        [520, 86],
        [534, 94],
      ].map(([x, y]) => (
        <g key={`v${x}-${y}`}>
          <circle cx={x} cy={y} r="5" fill="#d9b660" />
          <circle cx={x} cy={y} r="2" fill="#030806" />
        </g>
      ))}

      {/* U1 pins */}
      {PIN_Y.map((y) => (
        <g key={`pin${y}`}>
          <rect x="126" y={y - 4} width="26" height="8" rx="1.5" fill="url(#sb-pin)" />
          <rect x={CHIP.x + CHIP.w - 2} y={y - 4} width="26" height="8" rx="1.5" fill="url(#sb-pin)" />
        </g>
      ))}
      {BOTTOM_X.map((x) => (
        <rect key={`bp${x}`} x={x - 4} y={CHIP.y + CHIP.h - 2} width="8" height="26" rx="1.5" fill="url(#sb-pin)" />
      ))}

      {/* edge-connector fingers → paper cards [1]-[4] */}
      {BOTTOM_X.map((x, i) => (
        <g key={`f${x}`}>
          <rect x={x - 13} y="412" width="26" height="24" rx="3" fill="url(#sb-gold)" />
          <text x={x + 19} y="404" className="sb-silk" fontSize="11">
            [{i + 1}]
          </text>
        </g>
      ))}

      {/* silkscreen */}
      <g className="sb-silk" fontSize="11">
        {LEFT_PINS.map((t, i) => (
          <text key={t} x="116" y={PIN_Y[i] + 4} textAnchor="end">
            {t}
          </text>
        ))}
        {RIGHT_PINS.map((t, i) => (
          <text key={t} x="480" y={PIN_Y[i] - 6} fontSize="8.5" opacity="0.8">
            {t}
          </text>
        ))}
        <text x={CHIP.x} y={CHIP.y - 10} fontSize="12">
          U1
        </text>
        {DISPLAYS.map((d) => (
          <text key={d.label} x={d.x + DS.w / 2} y={DS.y + DS.h + 22} textAnchor="middle" fontSize="11.5">
            {d.label}
          </text>
        ))}
        <text x={BTN.x} y={BTN.y - 8} fontSize="10">
          SW1
        </text>
        <text x="40" y="404" fontSize="10" opacity="0.75">
          J2 · PAPERS ↓
        </text>
        <text x={W - 40} y={H - 16} fontSize="10" textAnchor="end" opacity="0.75">
          VP-RESEARCH-BRD · REV A
        </text>
      </g>

      {/* status LEDs */}
      {LEDS.map((l, i) => {
        const x = 575 + i * 160;
        return (
          <g key={l.text}>
            <circle cx={x} cy="300" r="11" fill={l.color} opacity="0.35" filter="url(#sb-glow)" className="sb-led" style={{ animationDelay: `${i * 0.6}s` }} />
            <circle cx={x} cy="300" r="6" fill={l.color} />
            <circle cx={x - 1.8} cy="298" r="1.8" fill="#ffffff" opacity="0.8" />
            <text x={x + 16} y="304" className="sb-silk" fontSize="11.5" fill="#e6edf3">
              {l.text}
            </text>
            <text x={x - 6} y="285" className="sb-silk" fontSize="8.5" opacity="0.7">
              D{i + 2}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DesktopBoard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  return (
    <div ref={ref} className="@container relative hidden w-full lg:block" style={{ aspectRatio: `${W} / ${H}` }}>
      <BoardSvg />

      {/* header silkscreen */}
      <div className="absolute flex items-center gap-[1.2cqw]" style={{ left: pct(40, W), top: pct(26, H) }}>
        <span className="sb-kicker">Google Scholar · research board</span>
        <span className="flex items-center gap-[0.6cqw] font-mono text-[max(10px,1cqw)] text-fg/80">
          <span className="sb-led-dot" /> verified · {scholar.verifiedDomain}
        </span>
      </div>
      <p className="absolute font-mono text-[max(9px,0.9cqw)] uppercase tracking-[0.16em] text-dim" style={{ right: pct(40, W), top: pct(30, H) }}>
        src scholar.google.com · {scholar.asOf}
      </p>

      {/* U1 */}
      <div className="absolute" style={{ left: pct(CHIP.x, W), top: pct(CHIP.y, H), width: pct(CHIP.w, W), height: pct(CHIP.h, H) }}>
        <ChipMarking />
      </div>

      {/* DS1-DS3 */}
      {DISPLAYS.map((d) => (
        <div key={d.label} className="absolute" style={{ left: pct(d.x, W), top: pct(DS.y, H), width: pct(DS.w, W), height: pct(DS.h, H) }}>
          <SegDisplay label={d.metric} value={metric(d.metric)} run={inView} className="h-full w-full" />
        </div>
      ))}

      {/* SW1 */}
      <div className="absolute" style={{ left: pct(BTN.x, W), top: pct(BTN.y, H), width: pct(BTN.w, W), height: pct(BTN.h, H) }}>
        <Tactile className="h-full w-full" />
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Phone / tablet board
// --------------------------------------------------------------------------
function CompactBoard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  return (
    <div ref={ref} className="sb-compact space-y-5 p-5 sm:p-6 lg:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="sb-kicker">Google Scholar</span>
        <span className="flex items-center gap-2 font-mono text-[0.68rem] text-fg/80">
          <span className="sb-led-dot" /> verified · {scholar.verifiedDomain}
        </span>
      </div>

      <div className="relative mx-auto aspect-[300/220] w-[78%] max-w-[340px]">
        <span className="sb-compact-pins sb-compact-pins--l" aria-hidden />
        <span className="sb-compact-pins sb-compact-pins--r" aria-hidden />
        <ChipMarking compact />
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {scholar.interests.map((t) => (
          <span key={t} className="chip-tag !text-fg/85">
            {t}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {DISPLAYS.map((d) => (
          <div key={d.label} className="space-y-1.5 text-center">
            <SegDisplay label={d.metric} value={metric(d.metric)} run={inView} className="aspect-[150/120] w-full" />
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-[#d9ddd2]/70">{d.metric}</p>
          </div>
        ))}
      </div>

      <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        {LEDS.map((l) => (
          <li key={l.text} className="flex items-center gap-2 font-mono text-[0.66rem] text-fg/85">
            <span className="h-2 w-2 rounded-full" style={{ background: l.color, boxShadow: `0 0 8px ${l.color}` }} />
            {l.text}
          </li>
        ))}
      </ul>

      <Tactile className="min-h-[58px] w-full" />
      <p className="text-center font-mono text-[0.6rem] uppercase tracking-[0.14em] text-dim">
        src scholar.google.com · {scholar.asOf}
      </p>
    </div>
  );
}

export function ScholarBoard() {
  return (
    <div className="relative overflow-hidden rounded-[18px] shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)]">
      <DesktopBoard />
      <CompactBoard />
    </div>
  );
}

"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { relCurrent, thresholdV, VG_ON } from "@/components/three/device/model";
import { cn } from "@/lib/format";

// Live I_D–V_G transfer curve (log scale) for the Device Lab: the curve at the
// current back-gate bias against the zero-bias reference, the operating point,
// V_T, and a crosshair readout. Plain SVG sized to its box in CSS pixels, so the
// text never scales; everything here is cheap enough to redraw on every slider step.

const MINUS = "−";
const FIGURE_SPACE = " "; // digit-wide, keeps unsigned values aligned with signed ones
const SUP: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

/** 0.4 → "+0.40", -0.4 → "−0.40", 0 → " 0.00" (figure space). */
export const signed = (v: number, digits = 2) => (v > 0 ? "+" : v < 0 ? MINUS : FIGURE_SPACE) + Math.abs(v).toFixed(digits);

const pow10 = (e: number) => `10${[...String(e)].map((c) => SUP[c]).join("")}`;

/** 1.41 → "1.41", 3.1e-6 → "3.1×10⁻⁶", 5.5e6 → "5.5×10⁶". */
export function sci(v: number) {
  if (v >= 0.01 && v < 1000) return v.toPrecision(3);
  let e = Math.floor(Math.log10(v));
  let m = (v / 10 ** e).toFixed(1);
  if (m === "10.0") {
    m = "1.0";
    e += 1;
  }
  return `${m}×${pow10(e)}`;
}

/** A change factor: 1.41 → "1.41×", 0.061 → "0.061×". */
export const ratio = (r: number) => `${r.toPrecision(r >= 1 ? 3 : 2)}×`;

const VG_MAX = 1;
const LOG_MIN = -8.6;
const LOG_MAX = 0.6;
const H = 208;
const PAD = { l: 48, r: 10, t: 10, b: 26 }; // data starts at l; grid and axis lead in from GRID_X
const GRID_X = PAD.l - 10;
const SAMPLES = 100;
const SNAP = 0.02; // crosshair step, V
const DECADES = [-8, -6, -4, -2, 0];
const VG_TICKS = [0, 0.2, 0.4, 0.6, 0.8, 1];

const clamp01 = (v: number) => Math.min(VG_MAX, Math.max(0, v));
const snap = (v: number) => Math.round(clamp01(v) / SNAP) * SNAP;

/** Width of an element in CSS px, tracked with a ResizeObserver. */
function useWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Legend / tooltip key: a short stroke that mirrors the line it names. */
export function LineKey({ dashed = false }: { dashed?: boolean }) {
  return (
    <svg width="16" height="6" viewBox="0 0 16 6" className="shrink-0" aria-hidden>
      <line
        x1="1"
        x2="15"
        y1="3"
        y2="3"
        strokeLinecap="round"
        strokeWidth={dashed ? 1.5 : 2}
        strokeDasharray={dashed ? "2.5 3" : undefined}
        className={dashed ? "stroke-dim" : "stroke-fg"}
      />
    </svg>
  );
}

export function TransferCurve({ vbb, gateOn }: { vbb: number; gateOn: boolean }) {
  const [box, width] = useWidth(320);
  const reduced = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);

  const iw = Math.max(width - PAD.l - PAD.r, 1);
  const ih = H - PAD.t - PAD.b;
  const sx = useCallback((vg: number) => PAD.l + (vg / VG_MAX) * iw, [iw]);
  const sy = useCallback((i: number) => PAD.t + ((LOG_MAX - Math.log10(Math.max(i, 1e-12))) / (LOG_MAX - LOG_MIN)) * ih, [ih]);
  const curve = useCallback(
    (b: number) =>
      Array.from({ length: SAMPLES + 1 }, (_, k) => {
        const vg = (k / SAMPLES) * VG_MAX;
        return `${sx(vg).toFixed(1)},${sy(relCurrent(vg, b)).toFixed(1)}`;
      }),
    [sx, sy],
  );
  const ref0 = useMemo(() => curve(0), [curve]);
  const live = useMemo(() => curve(vbb), [curve, vbb]);
  // the wash between the two curves shows how far the bias moved the device
  const band = `M${live.join("L")}L${[...ref0].reverse().join("L")}Z`;
  const vt = thresholdV(vbb);

  // Operating point: slides along the live curve when the gate switches. Driven
  // straight on the DOM node so the tween costs no React renders.
  const target = gateOn ? VG_ON : 0;
  const dot = useRef<SVGGElement>(null);
  const opVg = useRef(target);
  useLayoutEffect(() => {
    const place = () => dot.current?.setAttribute("transform", `translate(${sx(opVg.current).toFixed(1)} ${sy(relCurrent(opVg.current, vbb)).toFixed(1)})`);
    if (reduced) opVg.current = target;
    place();
    if (opVg.current === target) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      opVg.current += (target - opVg.current) * (1 - Math.exp(-dt * 8));
      if (Math.abs(target - opVg.current) < 0.002) opVg.current = target;
      place();
      if (opVg.current !== target) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, vbb, sx, sy, reduced]);

  const pick = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (r) setHover(snap((clientX - r.left - PAD.l) / iw));
  };
  const read = hover ?? target;
  const exp = (v: number) => v.toExponential(1);
  const readout = (vg: number) => `Gate ${vg.toFixed(2)} volts: current ${exp(relCurrent(vg, vbb))} at this bias, ${exp(relCurrent(vg, 0))} at zero bias`;
  const tipX = hover === null ? 0 : sx(hover);
  const flip = tipX > width - 170;

  return (
    <div>
      <div
        ref={box}
        role="slider"
        tabIndex={0}
        aria-label="Transfer curve readout"
        aria-valuemin={0}
        aria-valuemax={VG_MAX}
        aria-valuenow={Number(read.toFixed(2))}
        aria-valuetext={readout(read)}
        className="relative touch-pan-y select-none rounded-lg"
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setHover(null)}
        onFocus={() => setHover((h) => h ?? target)}
        onBlur={() => setHover(null)}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.1 : SNAP;
          const now = hover ?? target;
          const next =
            e.key === "ArrowRight" || e.key === "ArrowUp" ? now + step : e.key === "ArrowLeft" || e.key === "ArrowDown" ? now - step : e.key === "Home" ? 0 : e.key === "End" ? VG_MAX : null;
          if (next === null) return;
          e.preventDefault();
          setHover(snap(next));
        }}
      >
        <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} className="block overflow-visible font-mono" aria-hidden>
          {/* decade gridlines + labels */}
          {DECADES.map((d) => (
            <g key={d}>
              <line x1={GRID_X} x2={width - PAD.r} y1={sy(10 ** d)} y2={sy(10 ** d)} className="stroke-line" />
              <text x={GRID_X - 6} y={sy(10 ** d)} dy="0.32em" textAnchor="end" className="fill-dim text-[10px]">
                {d === 0 ? "1" : pow10(d)}
              </text>
            </g>
          ))}
          {/* V_G axis */}
          <line x1={GRID_X} x2={width - PAD.r} y1={PAD.t + ih} y2={PAD.t + ih} className="stroke-line-strong" />
          {VG_TICKS.map((v) => (
            <g key={v}>
              <line x1={sx(v)} x2={sx(v)} y1={PAD.t + ih} y2={PAD.t + ih + 4} className="stroke-line-strong" />
              <text x={sx(v)} y={H - 6} textAnchor={v === VG_MAX ? "end" : "middle"} className="fill-dim text-[10px]">
                {v === VG_MAX ? "1.0 V" : v === 0 ? "0" : v.toFixed(1)}
              </text>
            </g>
          ))}

          {/* threshold marker */}
          <line x1={sx(vt)} x2={sx(vt)} y1={PAD.t + ih} y2={sy(relCurrent(vt, vbb))} className="stroke-line-strong" />
          <text x={sx(vt) + 4} y={PAD.t + ih - 6} className="fill-dim text-[10px]">
            V<tspan dy="2.5" className="text-[8px]">T</tspan>
          </text>

          <path d={band} className="fill-fg opacity-[0.07]" />
          <polyline points={ref0.join(" ")} fill="none" strokeWidth={1.5} strokeDasharray="2.5 3" strokeLinecap="round" className="stroke-dim" />
          <polyline points={live.join(" ")} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="stroke-fg" />

          {/* crosshair: snaps to the nearest step, one marker per series */}
          {hover !== null && (
            <g>
              <line x1={tipX} x2={tipX} y1={PAD.t} y2={PAD.t + ih} className="stroke-muted opacity-60" />
              <circle cx={tipX} cy={sy(relCurrent(hover, 0))} r={4} strokeWidth={2} className="fill-dim stroke-panel" />
              <circle cx={tipX} cy={sy(relCurrent(hover, vbb))} r={4} strokeWidth={2} className="fill-fg stroke-panel" />
            </g>
          )}

          {/* operating point (8px+ dot, 2px surface ring, soft halo) */}
          <g ref={dot} transform={`translate(${sx(target).toFixed(1)} ${sy(relCurrent(target, vbb)).toFixed(1)})`}>
            <circle r={10} className="fill-fg opacity-[0.12]" />
            <circle r={5} strokeWidth={2} className="fill-fg stroke-panel" />
          </g>
        </svg>

        {/* one tooltip, every series; values lead */}
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-1 z-10 w-max rounded-lg border border-line-strong bg-panel px-3 py-2 font-mono text-[0.68rem] leading-relaxed shadow-[0_12px_32px_-14px_var(--shadow)]"
            style={{ left: tipX, transform: flip ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
          >
            <p className="text-dim">
              V<sub>G</sub> {hover.toFixed(2)} V
            </p>
            <p className="mt-0.5 flex items-center gap-2">
              <LineKey />
              <span className="font-semibold tabular-nums text-fg">{sci(relCurrent(hover, vbb))}</span>
              <span className="text-dim">now</span>
            </p>
            <p className="flex items-center gap-2">
              <LineKey dashed />
              <span className="font-semibold tabular-nums text-fg">{sci(relCurrent(hover, 0))}</span>
              <span className="text-dim">zero bias</span>
            </p>
          </div>
        )}
      </div>

      {/* the same numbers as a table, for screen readers (sr-only goes on a wrapper:
          a table ignores the 1px width and would widen the page) */}
      <div className="sr-only">
        <table>
          <caption>Drain current relative to the zero-bias on-current</caption>
          <thead>
            <tr>
              <th scope="col">Gate voltage (V)</th>
              <th scope="col">Back-gate bias {signed(vbb)} V</th>
              <th scope="col">Zero bias</th>
            </tr>
          </thead>
          <tbody>
            {VG_TICKS.map((v) => (
              <tr key={v}>
                <th scope="row">{v.toFixed(1)}</th>
                <td>{sci(relCurrent(v, vbb))}</td>
                <td>{sci(relCurrent(v, 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Live readouts derived from the same model as the curve. */
export function DeviceReadouts({ vbb, className }: { vbb: number; className?: string }) {
  const dvt = (thresholdV(vbb) - thresholdV(0)) * 1000;
  const tiles = [
    { k: <>Threshold V<sub>T</sub></>, v: `${thresholdV(vbb).toFixed(3)} V`, sub: vbb === 0 ? "nominal" : `${signed(dvt, 0)} mV` },
    { k: <>On-current I<sub>on</sub></>, v: ratio(relCurrent(VG_ON, vbb)), sub: "vs zero bias" },
    { k: <>Leakage I<sub>off</sub></>, v: ratio(relCurrent(0, vbb) / relCurrent(0, 0)), sub: "vs zero bias" },
    { k: <>On / off ratio</>, v: sci(relCurrent(VG_ON, vbb) / relCurrent(0, vbb)), sub: <>I<sub>on</sub> ÷ I<sub>off</sub></> },
  ];
  return (
    <dl className={cn("grid gap-px overflow-hidden rounded-xl border border-line bg-line", className)}>
      {tiles.map((t, i) => (
        <div key={i} className="flex flex-col justify-center bg-panel px-3.5 py-2.5">
          <dt className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-dim [&_sub]:normal-case">{t.k}</dt>
          {/* value over its note in the 2- and 4-up grids; side by side in the narrow column beside the chart */}
          <dd className="mt-0.5 flex flex-col @2xl:flex-row @2xl:items-baseline @2xl:justify-between @2xl:gap-2">
            <span className="font-mono text-[1.05rem] font-medium tabular-nums tracking-tight text-fg">{t.v}</span>
            <span className="font-mono text-[0.64rem] tabular-nums text-dim">{t.sub}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

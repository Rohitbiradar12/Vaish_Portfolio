"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { BODY_FACTOR, DEVICE_BG, SWING, thresholdV, VT0, type DeviceState } from "@/components/three/device/model";
import { LazyMount } from "@/components/three/LazyMount";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { cn } from "@/lib/format";
import { DeviceReadouts, LineKey, signed, TransferCurve } from "./TransferCurve";

const TransistorScene = dynamic(() => import("@/components/three/device/TransistorScene"), { ssr: false });

const DEFAULTS: DeviceState = { gateOn: true, vbb: 0, exploded: false };

const PRESETS = [
  { v: -1, label: "Low leakage" },
  { v: 0, label: "Nominal" },
  { v: 1, label: "Boost" },
];

const NOTES = [
  "Undoped, fully-depleted film: better electrostatics and less variability.",
  "Back-gate bias trades speed for leakage at run time.",
  "High-k / metal gate: thicker physical oxide, lower gate leakage than SiO₂.",
];

type Option<T extends string> = { value: T; label: string; hint?: string; icon: React.ReactNode };

/** Two-way segmented control: native radios (arrow keys for free) under a sliding thumb. */
function Segmented<T extends string>({
  name,
  label,
  aside,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  aside?: React.ReactNode;
  value: T;
  options: [Option<T>, Option<T>];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span id={`${name}-label`} className="text-[0.82rem] font-medium text-fg">
          {label}
        </span>
        {aside && <span className="font-mono text-[0.66rem] text-dim">{aside}</span>}
      </div>
      <div role="radiogroup" aria-labelledby={`${name}-label`} className="relative mt-2 grid grid-cols-2 rounded-xl border border-line bg-ink p-1">
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-[0.6rem] border border-line-strong bg-panel-2 shadow-[inset_0_1px_0_var(--edge),0_6px_16px_-10px_var(--shadow)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none [[data-theme=light]_&]:bg-panel",
            value === options[1].value && "translate-x-full",
          )}
        />
        {options.map((o) => {
          const on = o.value === value;
          return (
            <label
              key={o.value}
              className={cn(
                "relative flex cursor-pointer items-center justify-center gap-2 rounded-[0.6rem] px-3 py-2 text-[0.8rem] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal",
                on ? "text-fg" : "text-dim hover:text-muted",
              )}
            >
              <input type="radio" name={name} value={o.value} checked={on} onChange={() => onChange(o.value)} className="sr-only" />
              {o.icon}
              <span className="font-medium">{o.label}</span>
              {o.hint && <span className="font-mono text-[0.66rem] tabular-nums text-dim">{o.hint}</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Bipolar fader: fills out from the 0 V detent, ticks every 0.25 V. */
function BiasFader({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const t = (value + 1) / 2;
  const mode = value > 0 ? "forward body bias" : value < 0 ? "reverse body bias" : "zero body bias";
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <label htmlFor="vbb" className="block">
          <span className="block text-[0.82rem] font-medium text-fg">Back-gate bias</span>
          <span className="mt-0.5 block font-mono text-[0.66rem] text-dim">
            V<sub>BB</sub> · under the buried oxide
          </span>
        </label>
        <output htmlFor="vbb" className="shrink-0 font-mono text-[1.6rem] font-medium leading-none tabular-nums tracking-tight text-fg">
          {signed(value)}
          <span className="ml-1 text-[0.8rem] text-muted">V</span>
        </output>
      </div>

      <div className="relative mt-5">
        {/* track inset by half the knob, so 0–100% lines up with the knob's centre */}
        <div className="pointer-events-none absolute inset-x-[9px] top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-line-strong" aria-hidden>
          <div className="absolute inset-y-0 rounded-full bg-fg" style={{ left: `${Math.min(t, 0.5) * 100}%`, right: `${(1 - Math.max(t, 0.5)) * 100}%` }} />
          <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-muted" />
        </div>
        <input
          id="vbb"
          type="range"
          min={-1}
          max={1}
          step={0.05}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={`${value.toFixed(2)} volts, ${mode}`}
          className={cn(
            "relative block h-[18px] w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none!",
            "[&::-webkit-slider-runnable-track]:h-[18px] [&::-webkit-slider-runnable-track]:bg-transparent",
            "[&::-webkit-slider-thumb]:size-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-fg [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_var(--panel),0_4px_14px_var(--shadow)] [&::-webkit-slider-thumb]:transition-transform active:[&::-webkit-slider-thumb]:scale-110 focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_4px_var(--panel),0_0_0_6px_var(--signal)]",
            "[&::-moz-range-track]:h-[18px] [&::-moz-range-track]:bg-transparent",
            "[&::-moz-range-thumb]:size-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-fg [&::-moz-range-thumb]:shadow-[0_0_0_4px_var(--panel),0_4px_14px_var(--shadow)] focus-visible:[&::-moz-range-thumb]:shadow-[0_0_0_4px_var(--panel),0_0_0_6px_var(--signal)]",
          )}
        />
      </div>
      <div className="mx-[9px] mt-2.5 flex justify-between" aria-hidden>
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className={cn("w-px", i % 4 === 0 ? "h-2 bg-muted" : "h-1 bg-line-strong")} />
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-3 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-dim" aria-hidden>
        <span>−1 V · RBB</span>
        <span className="text-center">0</span>
        <span className="text-right">FBB · +1 V</span>
      </div>
    </div>
  );
}

function StackIcon({ spread }: { spread: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 fill-current" aria-hidden>
      {(spread ? [1.5, 6.6, 11.7] : [3.4, 6.65, 9.9]).map((y) => (
        <rect key={y} x="2" y={y} width="12" height="2.75" rx="0.8" />
      ))}
    </svg>
  );
}

const Led = ({ lit }: { lit: boolean }) => (
  <span className={cn("size-1.5 rounded-full transition", lit ? "bg-ok shadow-[0_0_6px_var(--ok)]" : "bg-dim/50")} aria-hidden />
);

/** One live value in the viewer's status strip. */
const Meter = ({ k, v, className }: { k: string; v: string; className?: string }) => (
  <div className={cn("flex items-baseline gap-1.5 px-2 py-1", className)}>
    <dt className="text-dim">
      V<sub>{k}</sub>
    </dt>
    <dd className="tabular-nums text-fg">{v} V</dd>
  </div>
);

export function DeviceLab() {
  const [gateOn, setGateOn] = useState(DEFAULTS.gateOn);
  const [vbb, setVbb] = useState(DEFAULTS.vbb);
  const [exploded, setExploded] = useState(DEFAULTS.exploded);
  const state = useRef<DeviceState>({ gateOn, vbb, exploded });

  useEffect(() => {
    state.current = { gateOn, vbb, exploded };
  }, [gateOn, vbb, exploded]);

  const isDefault = gateOn === DEFAULTS.gateOn && vbb === DEFAULTS.vbb && exploded === DEFAULTS.exploded;
  const reset = () => {
    setGateOn(DEFAULTS.gateOn);
    setVbb(DEFAULTS.vbb);
    setExploded(DEFAULTS.exploded);
  };
  const mode =
    vbb > 0 ? (
      <>
        Forward bias: V<sub>T</sub> drops, so the device switches faster but leaks more.
      </>
    ) : vbb < 0 ? (
      <>
        Reverse bias: V<sub>T</sub> rises, leakage falls steeply and the device slows.
      </>
    ) : (
      <>Zero bias: the nominal device. Slide either way to trade speed for leakage.</>
    );

  return (
    <Section id="device-lab" wide>
      <SectionHeader
        id="device-lab"
        title={
          <>
            Device lab: an <span className="text-muted">FDSOI transistor</span> you can bias.
          </>
        }
        lead="In 22nm FDSOI the channel is a thin silicon film on buried oxide, so the substrate becomes a second gate. Switch the gate, sweep the back-gate bias and watch the channel respond. This is the physics behind my FDSOI and gate-oxide projects."
      />

      {/* lg+: viewer and console share a row (the viewer takes the console's height);
          the transfer curve and model notes sit beneath them */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:gap-5">
        <Reveal className="lg:col-start-1 lg:row-start-1">
          <div className="panel relative h-full overflow-hidden p-0">
            {/* the 3D viewer is a dark instrument screen in both themes */}
            <div data-theme="dark" className="relative isolate h-full bg-[radial-gradient(120%_95%_at_50%_38%,#1c1c20_0%,#0d0d0f_55%,#060607_100%)]">
              {/* stage: faint grid, floor glow and corner ticks behind the transparent canvas */}
              <div className="bg-pcb-grid pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_55%,#000,transparent)]" aria-hidden />
              <div className="pointer-events-none absolute inset-x-[15%] bottom-[8%] -z-10 h-1/3 rounded-[50%] bg-[radial-gradient(closest-side,rgb(255_255_255/0.06),transparent)]" aria-hidden />
              <div className="hud-corners pointer-events-none absolute inset-3 opacity-70" aria-hidden />
              <LazyMount margin="1200px" className="aspect-square w-full sm:aspect-[4/3] md:aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[35rem]">
                {(visible) => <TransistorScene state={state} active={visible} />}
              </LazyMount>
              <div className="pointer-events-none absolute inset-0" style={{ boxShadow: `inset 0 0 70px 10px ${DEVICE_BG}` }} aria-hidden />

              <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 py-1 pl-2 pr-2.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted sm:left-4 sm:top-4">
                <Led lit={gateOn} />
                n-FET · 22nm FDSOI<span className="hidden text-dim sm:inline"> · illustrative</span>
              </div>

              {/* status strip: live bias values on the screen itself */}
              <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-3 font-mono text-[0.64rem] sm:inset-x-4 sm:bottom-4">
                <span className="flex items-center gap-2 text-muted">
                  S
                  <span className="relative h-px w-9 bg-white/15">
                    <span
                      className={cn(
                        "absolute inset-0 bg-linear-to-r from-transparent via-[#9ff7dc] to-transparent transition-opacity duration-500",
                        gateOn ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </span>
                  D<span className="ml-1 hidden text-dim sm:inline">{gateOn ? "electrons flowing" : "channel off"}</span>
                </span>
                <dl className="flex divide-x divide-white/10 overflow-hidden rounded-md border border-white/10 bg-black/60">
                  <Meter k="G" v={gateOn ? "0.80" : "0.00"} />
                  <Meter k="BB" v={signed(vbb)} />
                  <Meter k="T" v={thresholdV(vbb).toFixed(3)} className="hidden sm:flex" />
                </dl>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.06} className="lg:col-start-2 lg:row-start-1">
          {/* when the row is taller than the console, its sections share the extra height */}
          <div className="panel flex h-full flex-col divide-y divide-line px-5">
            <div className="flex items-center justify-between gap-3 py-4">
              <p className="kicker">Bias console</p>
              <button
                type="button"
                onClick={reset}
                disabled={isDefault}
                className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted transition hover:text-fg disabled:pointer-events-none disabled:opacity-40"
              >
                <svg viewBox="0 0 16 16" className="size-3 fill-none stroke-current" strokeWidth={1.6} strokeLinecap="round" aria-hidden>
                  <path d="M3.5 8a4.5 4.5 0 1 0 1.4-3.26" />
                  <path d="M3.2 2.6v2.6h2.6" />
                </svg>
                Reset
              </button>
            </div>

            <div className="flex grow flex-col justify-center py-4">
              <Segmented
                name="gate"
                label="Front gate"
                aside={gateOn ? "channel inverted" : "channel off"}
                value={gateOn ? "on" : "off"}
                onChange={(v) => setGateOn(v === "on")}
                options={[
                  { value: "off", label: "Off", hint: "0 V", icon: <Led lit={false} /> },
                  { value: "on", label: "On", hint: "0.8 V", icon: <Led lit={gateOn} /> },
                ]}
              />
            </div>

            <div className="flex grow flex-col justify-center gap-4 py-4">
              <BiasFader value={vbb} onChange={setVbb} />
              <div className="grid grid-cols-3 gap-1.5">
                {PRESETS.map((p) => {
                  const on = vbb === p.v;
                  return (
                    <button
                      key={p.v}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setVbb(p.v)}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-center transition-colors",
                        on ? "border-line-strong bg-fg/[0.06] text-fg" : "border-line text-muted hover:border-line-strong hover:text-fg",
                      )}
                    >
                      <span className="block text-[0.72rem] font-medium">{p.label}</span>
                      <span className="block font-mono text-[0.6rem] tabular-nums text-dim">{signed(p.v, 0)} V</span>
                    </button>
                  );
                })}
              </div>
              <p className="min-h-[2.5em] text-[0.78rem] leading-snug text-muted" aria-live="polite">
                {mode}
              </p>
            </div>

            <div className="flex grow flex-col justify-center py-4">
              <Segmented
                name="view"
                label="View"
                aside="drag the model to rotate"
                value={exploded ? "exploded" : "assembled"}
                onChange={(v) => setExploded(v === "exploded")}
                options={[
                  { value: "assembled", label: "Assembled", icon: <StackIcon spread={false} /> },
                  { value: "exploded", label: "Exploded", icon: <StackIcon spread /> },
                ]}
              />
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="lg:col-start-1 lg:row-start-2">
          <div className="panel @container h-full p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div>
                <p className="kicker">Transfer curve</p>
                <p className="mt-1.5 text-[0.8rem] text-muted">
                  I<sub>D</sub> vs V<sub>G</sub> on a log scale, relative to the zero-bias on-current.
                </p>
              </div>
              <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[0.66rem] text-muted">
                <li className="flex items-center gap-2">
                  <LineKey />
                  <span className="tabular-nums">
                    now · V<sub>BB</sub> {signed(vbb)} V
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <LineKey dashed />
                  zero bias
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-fg ring-2 ring-panel" aria-hidden />
                  bias point
                </li>
              </ul>
            </div>
            <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 @2xl:grid-cols-[minmax(0,1fr)_13.5rem] @2xl:items-center">
              <TransferCurve vbb={vbb} gateOn={gateOn} />
              <DeviceReadouts vbb={vbb} className="grid-cols-2 @lg:grid-cols-4 @2xl:grid-cols-1" />
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.14} className="lg:col-start-2 lg:row-start-2">
          <div className="panel flex h-full flex-col p-5">
            <p className="kicker">Why FDSOI</p>
            <ol className="mt-4 space-y-3 text-[0.86rem] leading-relaxed text-fg/85">
              {NOTES.map((n, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-[0.2rem] font-mono text-[0.66rem] text-dim">{String(i + 1).padStart(2, "0")}</span>
                  {n}
                </li>
              ))}
            </ol>
            <div className="min-h-5 flex-1" />
            <p className="border-t border-line pt-4 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-dim">Model · illustrative</p>
            <dl className="mt-2.5 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 font-mono text-[0.7rem]">
              <dt className="text-muted">Subthreshold swing</dt>
              <dd className="text-right tabular-nums text-fg">{Math.round(SWING * 1000)} mV/dec</dd>
              <dt className="text-muted">Body factor</dt>
              <dd className="text-right tabular-nums text-fg">{Math.round(BODY_FACTOR * 1000)} mV/V</dd>
              <dt className="text-muted">
                V<sub>T</sub> at zero bias
              </dt>
              <dd className="text-right tabular-nums text-fg">{VT0.toFixed(3)} V</dd>
            </dl>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

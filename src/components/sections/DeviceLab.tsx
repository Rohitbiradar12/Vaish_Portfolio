"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { BODY_FACTOR, DEVICE_BG, driveStrength, VT0, type DeviceState } from "@/components/three/device/model";
import { LazyMount } from "@/components/three/LazyMount";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { cn } from "@/lib/format";

const TransistorScene = dynamic(() => import("@/components/three/device/TransistorScene"), { ssr: false });

function Toggle({ on, onClick, label, sub }: { on: boolean; onClick: () => void; label: string; sub: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition",
        on ? "border-signal/50 bg-signal/[0.07]" : "border-line-strong hover:border-line-strong/80",
      )}
    >
      <span>
        <span className="block text-sm font-medium text-fg">{label}</span>
        <span className="block font-mono text-[0.68rem] text-dim">{sub}</span>
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", on ? "bg-signal" : "bg-line-strong")}>
        <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-ink transition-all", on ? "left-6" : "left-1")} />
      </span>
    </button>
  );
}

export function DeviceLab() {
  const [gateOn, setGateOn] = useState(true);
  const [vbb, setVbb] = useState(0);
  const [exploded, setExploded] = useState(false);
  const state = useRef<DeviceState>({ gateOn, vbb, exploded });

  useEffect(() => {
    state.current = { gateOn, vbb, exploded };
  }, [gateOn, vbb, exploded]);

  const vt = VT0 - BODY_FACTOR * vbb;
  const drive = driveStrength({ gateOn, vbb });
  const mode = vbb > 0.05 ? "Forward body bias · faster, leakier" : vbb < -0.05 ? "Reverse body bias · slower, low leakage" : "Zero body bias";

  return (
    <Section id="device-lab" wide>
      <SectionHeader
        id="device-lab"
        title={
          <>
            Device lab: an <span className="text-signal">FDSOI transistor</span> you can bias.
          </>
        }
        lead="In 22nm FDSOI the channel is a thin silicon film on buried oxide, so the substrate becomes a second gate. Switch the gate, sweep the back-gate bias and watch the channel respond. This is the physics behind her FDSOI and gate-oxide projects."
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Reveal>
          <div className="panel relative overflow-hidden p-0">
            <LazyMount className="aspect-[4/3] w-full md:aspect-[16/10]">
              {(visible) => <TransistorScene state={state} active={visible} />}
            </LazyMount>
            <div className="pointer-events-none absolute inset-0" style={{ boxShadow: `inset 0 0 80px 20px ${DEVICE_BG}` }} />
            <div className="pointer-events-none absolute left-4 top-4 font-mono text-[0.64rem] uppercase tracking-[0.16em] text-dim">
              n-FET · 22nm FDSOI · illustrative
            </div>
            <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex items-end justify-between font-mono text-[0.68rem] text-muted">
              <span>
                S <span className="text-dim">→</span> D
              </span>
              <span className="text-right">
                electrons {gateOn ? "flowing" : "blocked"} · V_G = {gateOn ? "0.8" : "0.0"} V
              </span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="flex flex-col gap-4">
          <div className="panel space-y-3 p-5">
            <Toggle on={gateOn} onClick={() => setGateOn((v) => !v)} label="Gate voltage" sub={gateOn ? "V_G = 0.8 V · channel inverted" : "V_G = 0 V · off state"} />
            <Toggle on={exploded} onClick={() => setExploded((v) => !v)} label="Exploded view" sub="separate the stack, label each layer" />

            <div className="rounded-xl border border-line-strong px-4 py-3.5">
              <div className="flex items-baseline justify-between">
                <label htmlFor="vbb" className="text-sm font-medium text-fg">
                  Back-gate bias
                </label>
                <span className="font-mono text-sm text-signal">
                  {vbb > 0 ? "+" : ""}
                  {vbb.toFixed(2)} V
                </span>
              </div>
              <input
                id="vbb"
                type="range"
                min={-1}
                max={1}
                step={0.05}
                value={vbb}
                onChange={(e) => setVbb(Number(e.target.value))}
                className="mt-3 w-full accent-[var(--color-signal)]"
              />
              <div className="mt-1 flex justify-between font-mono text-[0.62rem] uppercase tracking-[0.1em] text-dim">
                <span>RBB</span>
                <span>0</span>
                <span>FBB</span>
              </div>
              <p className="mt-2 text-[0.8rem] text-muted">{mode}</p>
            </div>
          </div>

          <div className="panel grid grid-cols-2 gap-px overflow-hidden bg-line p-0">
            <div className="bg-panel px-4 py-3.5">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-dim">Threshold V_T</p>
              <p className="mt-1 font-mono text-xl font-semibold text-fg">{vt.toFixed(3)} V</p>
            </div>
            <div className="bg-panel px-4 py-3.5">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-dim">Drive I_D (rel.)</p>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-line-strong">
                <div className="h-full rounded-full bg-signal transition-[width] duration-300" style={{ width: `${Math.round(drive * 100)}%` }} />
              </div>
              <p className="mt-1.5 font-mono text-[0.7rem] text-muted">{Math.round(drive * 100)}%</p>
            </div>
          </div>

          <ul className="panel space-y-2.5 p-5 text-[0.88rem] leading-relaxed text-fg/80">
            <li className="flex gap-3">
              <span className="mt-[0.5rem] h-1.5 w-1.5 shrink-0 rotate-45 bg-diff" />
              Undoped, fully-depleted film: better electrostatics, less variability.
            </li>
            <li className="flex gap-3">
              <span className="mt-[0.5rem] h-1.5 w-1.5 shrink-0 rotate-45 bg-nwell" />
              Back-gate bias trades speed for leakage at run time.
            </li>
            <li className="flex gap-3">
              <span className="mt-[0.5rem] h-1.5 w-1.5 shrink-0 rotate-45 bg-m2" />
              High-k / metal gate: thicker physical oxide, lower gate leakage than SiO₂.
            </li>
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}

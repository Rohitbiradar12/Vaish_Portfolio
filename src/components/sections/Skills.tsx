"use client";

import { useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { pinGroups, toolchain, type PinGroup } from "@/content/skills";
import { cn } from "@/lib/format";

const GROUP_COLOR: Record<string, string> = {
  pd: "#00e5ff",
  rtl: "#ffd24a",
  analog: "#e05cff",
  device: "#36d399",
};

// Datasheet convention: pins count down the left side, then up the right side.
const LEFT = [pinGroups.find((g) => g.id === "pd")!, pinGroups.find((g) => g.id === "device")!];
const RIGHT = [pinGroups.find((g) => g.id === "rtl")!, pinGroups.find((g) => g.id === "analog")!];
const leftPins = LEFT.flatMap((g) => g.pins.map((name) => ({ name, group: g })));
const rightPins = RIGHT.flatMap((g) => g.pins.map((name) => ({ name, group: g })));
const N = leftPins.length + rightPins.length;

type Pin = { name: string; group: PinGroup };

function PinRow({
  pin,
  number,
  side,
  active,
  onHover,
}: {
  pin: Pin;
  number: number;
  side: "left" | "right";
  active: string | null;
  onHover: (id: string | null) => void;
}) {
  const c = GROUP_COLOR[pin.group.id];
  const lit = active === null || active === pin.group.id;
  return (
    <li
      className={cn("flex h-[30px] items-center gap-2 transition-opacity duration-300", side === "right" && "flex-row-reverse", !lit && "opacity-25")}
      onMouseEnter={() => onHover(pin.group.id)}
      onMouseLeave={() => onHover(null)}
    >
      <span className={cn("flex-1 truncate text-[0.88rem] text-fg/85", side === "left" ? "text-right" : "text-left")}>{pin.name}</span>
      <span className="w-6 text-center font-mono text-[0.66rem] text-dim">{number}</span>
      <span
        className="h-[7px] w-9 rounded-[1px] transition-shadow duration-300"
        style={{
          background: "linear-gradient(180deg,#e2e5ea,#9aa1ab)",
          boxShadow: active === pin.group.id ? `0 0 12px ${c}, 0 0 2px ${c}` : undefined,
        }}
      />
    </li>
  );
}

export function Skills() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <Section id="skills">
      <SectionHeader
        id="skills"
        title={
          <>
            Pin configuration: <span className="text-signal">32 skills</span>, four sides.
          </>
        }
        lead="Grouped like a datasheet pinout. Hover a group on the package to light up its pins."
      />

      {/* desktop pinout */}
      <Reveal className="hidden md:block">
        <div className="panel bg-pcb-grid px-6 py-10 lg:px-10">
          <div className="mx-auto grid max-w-5xl grid-cols-[1fr_250px_1fr] items-stretch">
            <ul>
              {leftPins.map((p, i) => (
                <PinRow key={p.name} pin={p} number={i + 1} side="left" active={active} onHover={setActive} />
              ))}
            </ul>

            <div className="relative rounded-md border border-[#2a3140] bg-[linear-gradient(160deg,#17191d,#0e0f12)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_30px_60px_-20px_rgba(0,0,0,0.8)]">
              <span className="absolute left-4 top-4 h-3 w-3 rounded-full bg-[#090a0c] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)]" />
              <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
                <div>
                  <p className="font-display text-xl font-semibold tracking-wide text-[#a3a9b2]">VP-SKILLS</p>
                  <p className="mt-1 font-mono text-[0.66rem] tracking-[0.18em] text-[#6f7680]">32-LQFP · REV A</p>
                </div>
                <ul className="w-full space-y-2">
                  {pinGroups.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(g.id)}
                        onMouseLeave={() => setActive(null)}
                        onFocus={() => setActive(g.id)}
                        onBlur={() => setActive(null)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-[0.8rem] transition",
                          active === g.id ? "border-line-strong bg-white/[0.04] text-fg" : "border-transparent text-[#9aa1ab]",
                        )}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: GROUP_COLOR[g.id], boxShadow: `0 0 8px ${GROUP_COLOR[g.id]}` }} />
                        <span className="flex-1">{g.label}</span>
                        <span className="font-mono text-[0.62rem] text-[#6f7680]">{g.short}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <ul>
              {rightPins.map((p, i) => (
                <PinRow key={p.name} pin={p} number={N - i} side="right" active={active} onHover={setActive} />
              ))}
            </ul>
          </div>
        </div>
      </Reveal>

      {/* mobile: grouped lists */}
      <div className="grid gap-4 md:hidden">
        {pinGroups.map((g) => (
          <Reveal key={g.id} className="panel p-5">
            <p className="flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.14em]" style={{ color: GROUP_COLOR[g.id] }}>
              <span className="h-2 w-2 rounded-full" style={{ background: GROUP_COLOR[g.id] }} />
              {g.label}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {g.pins.map((p) => (
                <span key={p} className="chip-tag !text-fg/85">
                  {p}
                </span>
              ))}
            </div>
          </Reveal>
        ))}
      </div>

      {/* toolchain rails */}
      <Reveal className="mt-8 grid gap-4">
        {(
          [
            ["VDD_EDA", "EDA & simulation", toolchain.eda],
            ["VDD_LANG", "Languages & scripting", toolchain.languages],
            ["VDD_LAB", "Lab & test", toolchain.lab],
          ] as const
        ).map(([net, label, items]) => (
          <div key={net} className="panel flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:gap-6">
            <div className="flex shrink-0 items-center gap-3 md:w-56">
              <span className="font-mono text-[0.7rem] font-semibold tracking-[0.12em] text-copper">{net}</span>
              <span className="text-[0.8rem] text-dim">{label}</span>
            </div>
            <div className="relative flex flex-1 flex-wrap gap-2">
              {items.map((t) => (
                <span key={t} className="chip-tag !text-fg/85">
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </Reveal>
    </Section>
  );
}

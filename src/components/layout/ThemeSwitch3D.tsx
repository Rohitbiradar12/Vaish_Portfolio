"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { setThemePref, type ThemePref } from "@/lib/theme";
import { useTheme, useThemePref } from "@/lib/useTheme";
import { cn } from "@/lib/format";

const SwitchScene = dynamic(() => import("@/components/three/toggle/SwitchScene"), { ssr: false });

const OPTIONS: { value: ThemePref; label: string; zone: string }[] = [
  { value: "light", label: "Light", zone: "left-0" },
  { value: "system", label: "System", zone: "left-1/3" },
  { value: "dark", label: "Dark", zone: "left-2/3" },
];

/**
 * Theme control: a three.js slide switch (light · system · dark). The 3D scene
 * loads when the browser is idle; until then (or without WebGL) a CSS stand-in
 * shows, its knob placed from <html data-theme-pref> so it's right before
 * hydration. Three invisible radio buttons on top handle input and a11y.
 */
export function ThemeSwitch3D() {
  const pref = useThemePref();
  const theme = useTheme();
  const index = Math.max(0, OPTIONS.findIndex((o) => o.value === pref));
  const [hover, setHover] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setMounted(true), { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setMounted(true), 1200);
    return () => clearTimeout(id);
  }, []);

  const choose = (i: number) => {
    const r = buttons.current[i]?.getBoundingClientRect();
    setThemePref(OPTIONS[i].value, r && { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  };

  // Radio-group keyboard pattern: arrows move the selection and focus.
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + OPTIONS.length) % OPTIONS.length;
    buttons.current[next]?.focus();
    choose(next);
  };

  return (
    <div role="radiogroup" aria-label="Colour theme" className="group relative h-11 w-28 shrink-0" onPointerLeave={() => setHover(null)}>
      {/* CSS stand-in */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-2 inset-y-2 rounded-full border border-line-strong bg-linear-to-b from-panel-2 to-panel shadow-[inset_0_1px_3px_rgb(0_0_0/0.3)] transition-opacity duration-500",
          ready && "opacity-0",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-5 -translate-y-1/2 rounded-full bg-linear-to-b from-[#f5f5f5] to-[#b8b8b8] shadow-[0_1px_3px_rgb(0_0_0/0.45)] transition-[left] duration-500 ease-out",
            "left-[calc(100%-1.5rem)] [:root[data-theme-pref=light]_&]:left-1 [:root[data-theme-pref=system]_&]:left-[calc(50%-0.625rem)]",
          )}
        />
      </div>

      {mounted && (
        <div aria-hidden className={cn("pointer-events-none absolute inset-0 transition-opacity duration-500", ready ? "opacity-100" : "opacity-0")}>
          <SwitchScene index={index} hover={hover} tone={theme} onReady={() => setReady(true)} />
        </div>
      )}

      {OPTIONS.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            buttons.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={pref === o.value}
          aria-label={o.label}
          tabIndex={pref === o.value ? 0 : -1}
          onClick={() => choose(i)}
          onKeyDown={(e) => onKeyDown(e, i)}
          onPointerEnter={() => setHover(i)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(null)}
          className={cn("absolute inset-y-1 w-1/3 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-signal/50", o.zone)}
        />
      ))}

      {/* hover / focus label */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 rounded-md border border-line-strong bg-panel/95 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] whitespace-nowrap text-muted opacity-0 shadow-sm backdrop-blur transition-opacity duration-200 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
      >
        {OPTIONS[hover ?? index].label}
      </span>
    </div>
  );
}

"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { bootDone, heroState, sceneReady } from "@/components/three/hero/heroState";

const LINES: [string, string][] = [
  ["POWER ON", "OK"],
  ["VDD 1.0 V RAIL", "STABLE"],
  ["PLL LOCK @ 1.0 GHz", "OK"],
  ["LOAD VAISHNAVI_PATIL.GDS", "100%"],
  ["DRC / LVS", "CLEAN"],
];
const MAX_WAIT_MS = 7000;

export function BootLoader() {
  const [visible, setVisible] = useState(true);
  const [shown, setShown] = useState(0);
  const ready = useSyncExternalStore(sceneReady.subscribe, sceneReady.get, () => false);

  // Print the boot log; faster on repeat visits in the same session.
  useEffect(() => {
    let step = 230;
    try {
      if (sessionStorage.getItem("vp-booted")) step = 70;
    } catch {}
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) step = 30;
    const timers = LINES.map((_, i) => window.setTimeout(() => setShown(i + 1), step * (i + 1)));
    const bail = window.setTimeout(() => sceneReady.set(), MAX_WAIT_MS);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(bail);
    };
  }, []);

  useEffect(() => {
    if (!visible || shown < LINES.length || !ready) return;
    const t = window.setTimeout(() => {
      setVisible(false);
      heroState.introStart = performance.now();
      bootDone.set();
      document.documentElement.dataset.boot = "done";
      try {
        sessionStorage.setItem("vp-booted", "1");
      } catch {}
    }, 260);
    return () => clearTimeout(t);
  }, [visible, shown, ready]);

  const pct = Math.round((shown / LINES.length) * 82 + (ready ? 18 : 0));

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="boot"
          key="boot"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.7, ease: [0.65, 0, 0.35, 1] } }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink"
          role="status"
          aria-label="Loading"
        >
          <div className="bg-pcb-grid absolute inset-0 opacity-40" />
          <div className="relative w-[min(88vw,440px)] font-mono text-[0.78rem] text-muted">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-md border border-line-strong bg-panel text-[0.7rem] font-bold text-signal">
                VP
              </span>
              <span className="tracking-[0.2em] text-fg">VP-SILICON BOOT</span>
            </div>
            <ul className="space-y-1.5">
              {LINES.map(([label, status], i) => (
                <li
                  key={label}
                  className="flex justify-between gap-4 transition-opacity duration-200"
                  style={{ opacity: i < shown ? 1 : 0 }}
                >
                  <span>
                    <span className="text-signal">&gt;</span> {label}
                  </span>
                  <span className="text-ok">{status}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 h-px w-full bg-line-strong">
              <div className="h-px bg-signal transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[0.68rem] text-dim">
              <span>{ready ? "SCENE READY" : "COMPILING SHADERS"}</span>
              <span>{pct}%</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

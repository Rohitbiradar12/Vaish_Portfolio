"use client";

import { motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { heroState, sceneReady } from "@/components/three/hero/heroState";
import { BLOCKS, PHASE, STAGES } from "@/components/three/hero/spec";
import { roles } from "@/content/experience";
import { profile } from "@/content/profile";
import { scholar } from "@/content/publications";

const citations = scholar.metrics.find((m) => m.label === "Citations")?.value;

const HeroScene = dynamic(() => import("@/components/three/hero/HeroScene"), { ssr: false });

// WebGL support never changes during a session: probe once, cache, and expose it
// through useSyncExternalStore so SSR renders the no-canvas shell.
let webglSupport: boolean | null = null;
function hasWebGL() {
  if (webglSupport === null) {
    try {
      const c = document.createElement("canvas");
      webglSupport = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const noopSubscribe = () => () => {};

const roleFor = (block: string) => roles.find((r) => r.dieBlock === block)!;
const yearSpan = (start: string, end: string) => {
  const a = start.slice(0, 4);
  const b = end.slice(0, 4);
  return a === b ? a : `${a}–${b.slice(2)}`;
};

/** One caption per stage on the die, timed to the camera holds. */
function StageCaption({ progress, index }: { progress: MotionValue<number>; index: number }) {
  const st = STAGES[index];
  const role = roleFor(st.block);
  const color = BLOCKS[st.block].color;
  const opacity = useTransform(progress, [st.start - 0.012, st.start + 0.012, st.end - 0.018, st.end + 0.004], [0, 1, 1, 0]);
  const y = useTransform(progress, [st.start - 0.012, st.start + 0.012], [18, 0]);
  return (
    <motion.div style={{ opacity, y }} className="pointer-events-none absolute inset-x-4 bottom-24 md:inset-x-auto md:bottom-auto md:left-12 md:top-1/2 md:w-[400px] md:-translate-y-1/2">
      <div className="panel p-5 md:p-6" style={{ borderColor: `${color}55` }}>
        <p className="font-mono text-[0.7rem] tracking-[0.18em] uppercase" style={{ color }}>
          Block {String(index + 1).padStart(2, "0")} · {role.org} · {yearSpan(role.start, role.end)}
        </p>
        <h3 className="mt-2 font-display text-2xl font-semibold text-fg md:text-[1.7rem]">{role.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted md:text-[0.95rem]">{role.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {role.metrics.slice(0, 3).map((m) => (
            <span key={m.label} className="chip-tag">
              <span className="text-dim">{m.label}</span>
              <span className="text-fg">{m.value}</span>
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Hud({ progress }: { progress: MotionValue<number> }) {
  const mag = useTransform(progress, [0, 0.12, 0.42, 0.5, 0.9, 1], [1, 1.2, 8, 42, 60, 24]);
  const magText = useTransform(mag, (v) => `×${v < 10 ? v.toFixed(1) : Math.round(v)}`);
  const stage = useTransform(progress, (p): string =>
    p < PHASE.decapStart ? "PACKAGE" : p < PHASE.lidGone ? "DECAP" : p < STAGES[0].start ? "DIE" : p < PHASE.outroStart ? "PROBE" : "DIE",
  );
  const bar = useTransform(progress, [0, 1], ["0%", "100%"]);
  return (
    <div className="pointer-events-none absolute inset-3 md:inset-6">
      <div className="hud-corners absolute inset-0 opacity-70" />
      <div className="absolute right-4 top-16 hidden flex-col items-end gap-1 font-mono text-[0.68rem] tracking-[0.16em] text-muted md:flex">
        <span>
          STAGE <motion.span className="text-signal">{stage}</motion.span>
        </span>
        <span>
          MAG <motion.span className="text-fg">{magText}</motion.span>
        </span>
        <span>
          VDD <span className="text-fg">1.0 V</span> · CLK <span className="text-fg">1.0 GHz</span>
        </span>
      </div>
      <div className="absolute bottom-4 right-4 hidden w-44 md:block">
        <div className="mb-1 flex justify-between font-mono text-[0.6rem] tracking-[0.16em] text-dim">
          <span>PKG</span>
          <span>DIE</span>
          <span>PROBE</span>
        </div>
        <div className="h-px w-full bg-line-strong">
          <motion.div className="h-px bg-signal" style={{ width: bar }} />
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(true);
  const webgl = useSyncExternalStore(noopSubscribe, hasWebGL, () => null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    heroState.progress = v;
  });

  useEffect(() => {
    if (!hasWebGL()) sceneReady.set();
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const introOpacity = useTransform(scrollYProgress, [0, 0.05, PHASE.introEnd], [1, 1, 0]);
  const introY = useTransform(scrollYProgress, [0, PHASE.introEnd], [0, -70]);
  const decapOpacity = useTransform(scrollYProgress, [0.15, 0.19, 0.38, 0.43], [0, 1, 1, 0]);
  const outroOpacity = useTransform(scrollYProgress, [0.905, 0.94, 1], [0, 1, 1]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.03], [1, 0]);

  return (
    <section id="top" ref={ref} className="relative h-[500vh] md:h-[620vh]" aria-label="Introduction">
      <div className="sticky top-0 h-svh overflow-hidden">
        <div className="absolute inset-0">
          {webgl && <HeroScene active={active} />}
          {webgl === false && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_45%,#12202a,transparent_60%)]" />
          )}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,11,0.88)_0%,rgba(5,8,11,0.45)_38%,transparent_62%)] max-md:bg-[linear-gradient(0deg,rgba(5,8,11,0.95)_0%,rgba(5,8,11,0.5)_45%,transparent_70%)]" />

        <Hud progress={scrollYProgress} />

        {/* intro copy */}
        <motion.div
          style={{ opacity: introOpacity, y: introY }}
          className="absolute inset-x-5 bottom-[12vh] md:inset-x-auto md:bottom-auto md:left-[6vw] md:top-1/2 md:max-w-[560px] md:-translate-y-1/2"
        >
          <p className="kicker">VP-2026 · {profile.role} · {profile.location}</p>
          <h1 className="mt-4 font-display text-[clamp(2.9rem,7.4vw,6.4rem)] font-semibold leading-[0.95] tracking-[-0.02em] text-fg">
            {profile.name}
          </h1>
          <p className="mt-5 font-display text-[clamp(1.25rem,2.4vw,1.9rem)] text-fg/90">{profile.tagline}</p>
          <p className="mt-4 max-w-md text-[0.98rem] leading-relaxed text-muted">{profile.intro}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#experience"
              className="rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-ink shadow-[0_0_30px_-6px_rgba(0,229,255,0.7)] transition hover:brightness-110"
            >
              View experience
            </a>
            <a
              href="#resume"
              className="rounded-full border border-line-strong bg-panel/70 px-5 py-2.5 text-sm font-semibold text-fg backdrop-blur transition hover:border-signal/60"
            >
              Resume
            </a>
          </div>
          <div className="mt-8 hidden flex-wrap gap-2 md:flex">
            <span className="chip-tag">MS ECE · Northeastern · 3.9</span>
            <span className="chip-tag">RISC-V · 1.0 GHz · 28nm</span>
            <span className="chip-tag">CNN accel · 2.4 TOPS</span>
            <a href="#publications" className="chip-tag !text-fg/90 transition hover:!border-signal/60">
              <span className="h-1.5 w-1.5 rounded-full bg-ok shadow-[0_0_8px_var(--color-ok)]" />
              Google Scholar · {citations} citations
            </a>
          </div>
        </motion.div>

        {/* decap caption */}
        <motion.div
          style={{ opacity: decapOpacity }}
          className="pointer-events-none absolute inset-x-5 bottom-24 md:inset-x-auto md:bottom-auto md:left-12 md:top-1/2 md:w-[380px] md:-translate-y-1/2"
        >
          <p className="kicker">01 · Decap</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-fg md:text-4xl">Inside the package</h2>
          <p className="mt-3 text-muted">
            Four industry roles, mapped onto one die. Keep scrolling to probe each block.
          </p>
        </motion.div>

        {STAGES.map((_, i) => (
          <StageCaption key={i} progress={scrollYProgress} index={i} />
        ))}

        {/* outro */}
        <motion.div
          style={{ opacity: outroOpacity }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-[linear-gradient(0deg,rgba(5,8,11,0.96)_0%,rgba(5,8,11,0.75)_45%,transparent_100%)]"
        />
        <motion.div
          style={{ opacity: outroOpacity }}
          className="pointer-events-none absolute inset-x-5 bottom-24 text-center md:bottom-[14vh]"
        >
          <p className="kicker">Signoff clean</p>
          <h2 className="mx-auto mt-3 max-w-2xl font-display text-3xl font-semibold text-fg md:text-5xl">
            {profile.tagline}
          </h2>
          <p className="mt-3 text-muted">That&apos;s the chip. Here&apos;s the engineer.</p>
        </motion.div>

        {/* scroll hint */}
        <motion.div
          style={{ opacity: hintOpacity }}
          className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 font-mono text-[0.65rem] tracking-[0.2em] text-muted md:flex"
        >
          <span>SCROLL TO DECAP</span>
          <span className="relative h-10 w-px overflow-hidden bg-line-strong">
            <span className="absolute inset-x-0 top-0 h-1/2 animate-scan bg-signal" />
          </span>
          <a href="#about" className="pointer-events-auto mt-1 text-dim underline-offset-4 hover:text-fg hover:underline">
            skip intro
          </a>
        </motion.div>
      </div>
    </section>
  );
}

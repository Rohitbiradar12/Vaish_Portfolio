"use client";

import { motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { heroState, sceneReady } from "@/components/three/hero/heroState";
import { BLOCKS, PHASE, STAGES } from "@/components/three/hero/spec";
import { cn } from "@/lib/format";
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

// Caption placement: stacked above the bottom edge on portrait screens,
// vertically centred on the left on wide (landscape) screens.
const CAPTION_POS =
  "pointer-events-none absolute inset-x-4 bottom-24 sm:inset-x-10 wide:inset-x-auto wide:bottom-auto wide:left-12 wide:top-1/2 wide:-translate-y-1/2";

/** One caption per role, timed to the camera resting on that role's block. */
function StageCaption({ progress, index }: { progress: MotionValue<number>; index: number }) {
  const st = STAGES[index];
  const role = roleFor(st.block);
  const color = BLOCKS[st.block].color;
  const opacity = useTransform(progress, [st.start - 0.012, st.start + 0.012, st.end - 0.018, st.end + 0.004], [0, 1, 1, 0]);
  const y = useTransform(progress, [st.start - 0.012, st.start + 0.012], [18, 0]);
  return (
    <motion.div style={{ opacity, y }} className={`${CAPTION_POS} wide:w-[25rem]`}>
      <div className="panel p-5 wide:p-6 short:p-4" style={{ borderColor: `${color}55` }}>
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em]" style={{ color }}>
          {role.org} · {yearSpan(role.start, role.end)}
        </p>
        <h3 className="mt-2 font-display text-2xl font-semibold text-fg wide:text-[1.7rem] short:text-xl">{role.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted wide:text-[0.95rem] short:hidden">{role.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2 short:mt-3">
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

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(true);
  const webgl = useSyncExternalStore(noopSubscribe, hasWebGL, () => null);
  const ready = useSyncExternalStore(sceneReady.subscribe, sceneReady.get, () => false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    heroState.progress = v;
  });

  // Content never waits for WebGL: the chip fades in and "powers on" once it has rendered.
  useEffect(() => {
    if (!ready) return;
    heroState.introStart = performance.now();
  }, [ready]);

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
  const overviewOpacity = useTransform(scrollYProgress, [0.15, 0.19, 0.38, 0.43], [0, 1, 1, 0]);
  const outroOpacity = useTransform(scrollYProgress, [0.905, 0.94, 1], [0, 1, 1]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.03], [1, 0]);

  return (
    <section id="top" ref={ref} className="relative h-[500vh] md:h-[620vh]" aria-label="Introduction">
      <div className="sticky top-0 h-svh overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_68%_42%,#0f1a22,transparent_62%)]" />
        <div className={cn("absolute inset-0 transition-opacity duration-1000", ready ? "opacity-100" : "opacity-0")}>
          {webgl && <HeroScene active={active} />}
          {webgl === false && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_45%,#12202a,transparent_60%)]" />
          )}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgba(5,8,11,0.95)_0%,rgba(5,8,11,0.5)_45%,transparent_70%)] wide:bg-[linear-gradient(90deg,rgba(5,8,11,0.88)_0%,rgba(5,8,11,0.45)_38%,transparent_62%)]" />

        {/* subtle frame */}
        <div className="hud-corners pointer-events-none absolute inset-3 opacity-60 wide:inset-6" aria-hidden />

        {/* intro copy */}
        <motion.div
          style={{ opacity: introOpacity, y: introY }}
          className="absolute inset-x-5 bottom-[10vh] sm:inset-x-10 wide:inset-x-auto wide:bottom-auto wide:left-[6vw] wide:top-1/2 wide:max-w-[35rem] wide:-translate-y-1/2 wide:short:top-[55%]"
        >
          <p className="kicker">
            {profile.role} · {profile.location}
          </p>
          <h1 className="mt-4 font-display text-[clamp(2.9rem,7.4vw,6.4rem)] font-semibold leading-[0.95] tracking-[-0.02em] text-fg short:mt-2 short:text-[2.4rem]">
            {profile.name}
          </h1>
          <p className="mt-5 font-display text-[clamp(1.25rem,2.4vw,1.9rem)] text-fg/90 short:mt-2 short:text-lg">{profile.tagline}</p>
          <p className="mt-4 max-w-md text-[0.98rem] leading-relaxed text-muted short:hidden">{profile.intro}</p>
          <div className="mt-7 flex flex-wrap gap-3 short:mt-4">
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
          <div className="mt-8 hidden flex-wrap gap-2 sm:flex short:hidden">
            <span className="chip-tag">MS ECE · Northeastern · 3.9</span>
            <span className="chip-tag">RISC-V · 1.0 GHz · 28nm</span>
            <span className="chip-tag">CNN accel · 2.4 TOPS</span>
            <a href="#publications" className="chip-tag !text-fg/90 transition hover:!border-signal/60">
              <span className="h-1.5 w-1.5 rounded-full bg-ok shadow-[0_0_8px_var(--color-ok)]" />
              Google Scholar · {citations} citations
            </a>
          </div>
        </motion.div>

        {/* experience overview (lid opening) */}
        <motion.div style={{ opacity: overviewOpacity }} className={`${CAPTION_POS} wide:w-[24rem]`}>
          <p className="kicker">Experience at a glance</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-fg wide:text-4xl short:text-2xl">Four industry roles, one chip</h2>
          <p className="mt-3 text-muted short:text-sm">
            Each highlighted block on this die is a role she held. Keep scrolling to explore them.
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
          className="pointer-events-none absolute inset-x-5 bottom-24 text-center wide:bottom-[14vh] short:bottom-6"
        >
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold text-fg wide:text-5xl short:text-2xl">{profile.tagline}</h2>
          <p className="mt-3 text-muted">Experience, projects and research below.</p>
        </motion.div>

        {/* scroll hint */}
        <motion.div
          style={{ opacity: hintOpacity }}
          className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 font-mono text-[0.65rem] tracking-[0.2em] text-muted wide:flex short:hidden"
        >
          <span>SCROLL TO EXPLORE</span>
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

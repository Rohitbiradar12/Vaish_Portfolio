"use client";

import { useLenis } from "lenis/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { levelMeta, projects, type Project, type ProjectLevel } from "@/content/projects";
import { cn } from "@/lib/format";
import { ProjectArt } from "./ProjectArt";

const FILTERS: ("All" | ProjectLevel)[] = ["All", "Layout", "Analog", "Device", "RTL"];

function Visual({ p, className }: { p: Project; className?: string }) {
  if (p.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.image} alt={`${p.title} screenshot`} className={cn("h-full w-full object-cover", className)} />;
  }
  return <ProjectArt art={p.art} className={cn("h-full w-full", className)} />;
}

function LevelTag({ level }: { level: ProjectLevel }) {
  const m = levelMeta[level];
  return (
    <span className="chip-tag" style={{ color: m.color, borderColor: `color-mix(in oklab, ${m.color} 40%, transparent)` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

function ProjectDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const lenis = useLenis();

  useEffect(() => {
    lenis?.stop();
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [lenis, onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/80 p-0 backdrop-blur-md md:items-center md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-title"
        data-lenis-prevent
        className="panel max-h-[92svh] w-full max-w-4xl overflow-y-auto rounded-b-none md:rounded-b-[14px]"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[16/9] border-b border-line md:aspect-[16/7]">
          <Visual p={project} />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full border border-line-strong bg-ink/80 px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-fg backdrop-blur hover:border-signal"
          >
            Close · Esc
          </button>
        </div>
        <div className="grid gap-8 p-6 md:grid-cols-[minmax(0,1fr)_240px] md:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <LevelTag level={project.level} />
              {project.node && <span className="chip-tag">{project.node}</span>}
              <span className="font-mono text-[0.72rem] text-dim">{project.period}</span>
            </div>
            <h3 id="project-title" className="mt-4 font-display text-2xl font-semibold text-fg md:text-3xl">
              {project.title}
            </h3>
            <p className="mt-3 leading-relaxed text-fg/80">{project.summary}</p>
            <ul className="mt-6 space-y-3">
              {project.highlights.map((h) => (
                <li key={h} className="flex gap-3 leading-relaxed text-fg/85">
                  <span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rotate-45" style={{ background: levelMeta[project.level].color }} />
                  {h}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-dim">Tools</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.tools.map((t) => (
                <span key={t} className="chip-tag">
                  {t}
                </span>
              ))}
            </div>
            <p className="mt-6 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-dim">Category</p>
            <p className="mt-2 text-sm text-muted">{levelMeta[project.level].blurb}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function Projects() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [open, setOpen] = useState<Project | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const shown = projects.filter((p) => filter === "All" || p.level === filter);

  return (
    <Section id="projects" wide>
      <SectionHeader
        id="projects"
        title={
          <>
            Taped out in the lab: <span className="text-signal">layouts to devices</span>.
          </>
        }
        lead="Academic projects from 180nm full-custom layout down to 22nm FDSOI device behaviour."
        aside={
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter projects by category">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 font-mono text-[0.72rem] uppercase tracking-[0.12em] transition",
                  filter === f ? "border-signal/70 bg-signal/10 text-fg" : "border-line-strong text-muted hover:text-fg",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        }
      />

      <motion.div layout className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((p, i) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.35 }}
            >
              <Reveal delay={(i % 3) * 0.06} className="h-full">
                <button
                  type="button"
                  onClick={() => setOpen(p)}
                  className="group panel flex h-full w-full flex-col overflow-hidden text-left transition duration-300 hover:-translate-y-1 hover:border-line-strong"
                >
                  <div className="relative aspect-[16/10] overflow-hidden border-b border-line">
                    <Visual p={p} className="transition duration-700 group-hover:scale-[1.04]" />
                    <span className="absolute left-3 top-3 rounded-md bg-ink/75 px-2 py-1 font-mono text-[0.62rem] tracking-[0.14em] text-dim backdrop-blur">
                      {String(projects.indexOf(p) + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <LevelTag level={p.level} />
                      {p.node && <span className="chip-tag">{p.node}</span>}
                    </div>
                    <h3 className="mt-4 font-display text-xl font-semibold leading-snug text-fg">{p.title}</h3>
                    <p className="mt-1 font-mono text-[0.72rem] text-dim">{p.period}</p>
                    <p className="mt-3 line-clamp-3 text-[0.93rem] leading-relaxed text-muted">{p.summary}</p>
                    <span className="mt-auto pt-5 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-signal opacity-80 transition group-hover:opacity-100">
                      Open details →
                    </span>
                  </div>
                </button>
              </Reveal>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>{open && <ProjectDialog project={open} onClose={close} />}</AnimatePresence>
    </Section>
  );
}

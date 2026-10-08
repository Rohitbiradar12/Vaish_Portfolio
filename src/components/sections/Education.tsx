"use client";

import dynamic from "next/dynamic";
import { LazyMount } from "@/components/three/LazyMount";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { degrees } from "@/content/education";

const LatticeScene = dynamic(() => import("@/components/three/lattice/LatticeScene"), { ssr: false });

export function Education() {
  return (
    <Section id="education">
      <SectionHeader
        id="education"
        title={
          <>
            Education &amp; <span className="text-muted">coursework</span>.
          </>
        }
        lead="The bottom of the stack: materials, devices and fabrication, on top of a VLSI-focused undergraduate degree."
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <Reveal>
          <figure className="panel relative overflow-hidden p-0">
            <LazyMount className="aspect-square w-full">{(visible) => <LatticeScene active={visible} />}</LazyMount>
            <figcaption className="absolute inset-x-0 bottom-0 flex justify-between border-t border-line bg-ink/60 px-4 py-3 font-mono text-[0.64rem] uppercase tracking-[0.14em] text-dim backdrop-blur">
              <span>Si · diamond cubic</span>
              <span>a = 5.431 Å</span>
            </figcaption>
          </figure>
        </Reveal>

        <div className="grid gap-6">
          {degrees.map((d, i) => (
            <Reveal key={d.id} delay={i * 0.08}>
              <article className="panel p-6 md:p-7">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div>
                    <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-signal">{d.degree}</p>
                    <h3 className="mt-2 font-display text-2xl font-semibold text-fg">{d.school}</h3>
                    <p className="mt-1 text-muted">{d.field}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-mono text-lg font-semibold text-fg">{d.score}</p>
                    <p className="font-mono text-[0.72rem] text-dim">
                      {d.date} · {d.location}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {d.coursework.map((c) => (
                    <span key={c} className="chip-tag !text-fg/80">
                      {c}
                    </span>
                  ))}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}

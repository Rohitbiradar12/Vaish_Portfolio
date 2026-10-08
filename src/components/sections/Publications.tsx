"use client";

import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { publications } from "@/content/publications";
import { PaperCard } from "./PaperCard";
import { ScholarBoard } from "./ScholarBoard";

const featured = publications.filter((p) => p.featured);
const others = publications.filter((p) => !p.featured);

export function Publications() {
  return (
    <Section id="publications">
      <SectionHeader
        id="publications"
        title={
          <>
            Research &amp; <span className="text-muted">publications</span>.
          </>
        }
        lead="Four papers from my undergraduate research in embedded systems, FPGA design and IoT."
      />

      <Reveal>
        <ScholarBoard />
      </Reveal>

      {featured.map((p) => (
        <Reveal key={p.id} className="mt-6">
          <PaperCard p={p} index={publications.indexOf(p) + 1} />
        </Reveal>
      ))}

      {others.length > 0 && (
        <div className="mb-6 mt-14 flex items-center gap-4">
          <p className="kicker">Journal articles</p>
          <span className="h-px flex-1 bg-line" />
          <span className="font-mono text-[0.7rem] text-dim">{others.length} papers</span>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        {others.map((p) => (
          <Reveal key={p.id}>
            <PaperCard p={p} index={publications.indexOf(p) + 1} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

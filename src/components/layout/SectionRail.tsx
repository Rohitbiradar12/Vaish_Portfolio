"use client";

import { useEffect, useState } from "react";
import { sections, type SectionId } from "@/content/sections";
import { cn } from "@/lib/format";

const ITEMS = sections.filter((s) => s.id !== "top");

/** Section index on very wide screens, shown once the hero has scrolled away. */
export function SectionRail() {
  const [active, setActive] = useState<SectionId | null>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id as SectionId);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const visible = active !== null && active !== "top";

  return (
    <nav
      aria-label="Sections"
      className={cn(
        "fixed left-6 top-1/2 z-40 hidden -translate-y-1/2 transition-opacity duration-500 2xl:block",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <ol className="relative space-y-3 border-l border-line pl-4">
        {ITEMS.map((s) => {
          const on = s.id === active;
          return (
            <li key={s.id}>
              <a href={`#${s.id}`} className="group flex items-center gap-2.5 font-mono text-[0.62rem] uppercase tracking-[0.16em]">
                <span
                  className={cn(
                    "absolute -left-[3.5px] h-[7px] w-[7px] rounded-full border transition",
                    on ? "border-signal bg-signal shadow-[0_0_10px_var(--glow)]" : "border-line-strong bg-ink",
                  )}
                />
                <span className={cn("transition", on ? "text-signal" : "text-dim group-hover:text-muted")}>{s.code}</span>
                <span className={cn("transition", on ? "text-fg" : "text-dim group-hover:text-muted")}>{s.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

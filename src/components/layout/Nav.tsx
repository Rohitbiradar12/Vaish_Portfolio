"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
import { profile } from "@/content/profile";
import { sections } from "@/content/sections";
import { cn } from "@/lib/format";

const LINKS = sections.filter((s) => s.nav);

export function Nav() {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => setSolid(y > 40));

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background,border-color,backdrop-filter] duration-300",
          solid ? "border-b border-line bg-ink/70 backdrop-blur-xl" : "border-b border-transparent",
        )}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8" aria-label="Main">
          <a href="#top" className="flex items-center gap-3" aria-label={`${profile.name}, back to top`}>
            <span className="relative grid h-8 w-8 place-items-center rounded-md border border-line-strong bg-panel font-mono text-[0.62rem] font-bold text-fg">
              {profile.initials}
              <span className="absolute bottom-1 left-1 h-1 w-1 rounded-full bg-signal" />
            </span>
            <span className="hidden font-display text-[0.95rem] font-semibold tracking-tight text-fg sm:block">{profile.name}</span>
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <li key={l.id}>
                <a href={`#${l.id}`} className="rounded-full px-3 py-1.5 text-[0.84rem] text-muted transition hover:bg-white/[0.04] hover:text-fg">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <a
              href="#contact"
              className="hidden rounded-full border border-signal/50 bg-signal/10 px-4 py-1.5 text-[0.84rem] font-medium text-fg transition hover:bg-signal/20 sm:block"
            >
              Get in touch
            </a>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              className="grid h-9 w-9 place-items-center rounded-md border border-line-strong bg-panel/70 lg:hidden"
            >
              <span className="sr-only">Menu</span>
              <span className="relative block h-3 w-4">
                <span className={cn("absolute left-0 h-px w-4 bg-fg transition", open ? "top-1.5 rotate-45" : "top-0")} />
                <span className={cn("absolute left-0 top-1.5 h-px w-4 bg-fg transition", open && "opacity-0")} />
                <span className={cn("absolute left-0 h-px w-4 bg-fg transition", open ? "top-1.5 -rotate-45" : "top-3")} />
              </span>
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="fixed inset-0 z-40 bg-ink/95 px-6 pt-24 backdrop-blur-xl lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ul className="space-y-1">
              {LINKS.map((l, i) => (
                <motion.li key={l.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <a href={`#${l.id}`} onClick={() => setOpen(false)} className="flex items-baseline gap-4 border-b border-line py-4">
                    <span className="font-mono text-[0.7rem] text-signal">{l.code}</span>
                    <span className="font-display text-2xl text-fg">{l.label}</span>
                    <span className="ml-auto font-mono text-[0.62rem] uppercase tracking-[0.14em] text-dim">{l.level}</span>
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

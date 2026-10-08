"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useSyncExternalStore } from "react";
import { profile } from "@/content/profile";
import { sections } from "@/content/sections";
import { cn } from "@/lib/format";
import { useTheme } from "@/lib/useTheme";
import { ThemeSwitch3D } from "./ThemeSwitch3D";

const LINKS = sections.filter((s) => s.nav);

function subscribeScroll(cb: () => void) {
  window.addEventListener("scroll", cb, { passive: true });
  window.addEventListener("resize", cb);
  return () => {
    window.removeEventListener("scroll", cb);
    window.removeEventListener("resize", cb);
  };
}

const isScrolled = () => window.scrollY > 40;

export function Nav() {
  const scrolled = useSyncExternalStore(subscribeScroll, isScrolled, () => false);
  const theme = useTheme();
  // Dark theme: transparent over the hero, frosted once scrolled. Light theme: a
  // white bar from the start, since the hero below it is dark in both themes.
  const solid = scrolled || theme === "light";
  const [open, setOpen] = useState(false);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background,border-color,backdrop-filter] duration-300",
          !solid && "border-b border-transparent",
          solid && "border-b border-line backdrop-blur-xl",
          // light: opaque white (a translucent bar would turn grey over the dark hero)
          solid && (theme === "light" ? "bg-panel" : "bg-panel/90"),
        )}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8" aria-label="Main">
          <a href="#top" className="font-display text-[0.95rem] font-semibold tracking-tight text-fg">
            {profile.name}
            <span className="sr-only">, back to top</span>
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <li key={l.id}>
                <a href={`#${l.id}`} className="rounded-full px-3 py-1.5 text-[0.84rem] text-muted transition hover:bg-fg/[0.05] hover:text-fg">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <ThemeSwitch3D />
            {/* hidden at lg, where the full link list leaves no room for it */}
            <a
              href="#contact"
              className="hidden rounded-full border border-signal/50 bg-signal/10 px-4 py-1.5 text-[0.84rem] font-medium text-fg transition hover:bg-signal/20 sm:block lg:hidden xl:block"
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
                    <span className="font-mono text-[0.7rem] text-dim">{l.code}</span>
                    <span className="font-display text-2xl text-fg">{l.label}</span>
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

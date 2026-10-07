"use client";

import { motion, useReducedMotion } from "motion/react";

/** Fade-and-rise on first view. Renders statically when reduced motion is requested. */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  const reduced = useReducedMotion();
  const Comp = motion[as];
  if (reduced) return <Comp className={className}>{children}</Comp>;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Comp>
  );
}

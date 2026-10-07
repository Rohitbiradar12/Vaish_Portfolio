"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Mounts its children only once the container nears the viewport, and tells
 * them whether they are currently visible so WebGL loops can pause.
 */
export function LazyMount({
  children,
  className,
  margin = "400px",
}: {
  children: (visible: boolean) => React.ReactNode;
  className?: string;
  margin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const near = new IntersectionObserver(([e]) => e.isIntersecting && setMounted(true), { rootMargin: margin });
    const vis = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "60px" });
    near.observe(el);
    vis.observe(el);
    return () => {
      near.disconnect();
      vis.disconnect();
    };
  }, [margin]);

  return (
    <div ref={ref} className={className}>
      {mounted && children(visible)}
    </div>
  );
}

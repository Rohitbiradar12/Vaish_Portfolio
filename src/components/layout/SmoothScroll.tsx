"use client";

import { ReactLenis } from "lenis/react";
import { useState } from "react";

export function SmoothScroll() {
  const [reduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  return (
    <ReactLenis
      root
      options={{
        lerp: reduced ? 1 : 0.1,
        smoothWheel: !reduced,
        anchors: { offset: -64 },
        autoRaf: true,
      }}
    />
  );
}

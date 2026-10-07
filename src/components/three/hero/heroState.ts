// Mutable state shared between the DOM (scroll, loader, pointer) and the
// render loop. Written outside React and read inside useFrame, so scrolling
// never triggers React re-renders.

export const heroState = {
  /** raw scroll progress through the hero section, 0..1 */
  progress: 0,
  /** damped progress, updated once per frame by the scene */
  smooth: 0,
  /** performance.now() when the power-on intro starts; -1 until the scene is ready */
  introStart: -1,
  /** pointer in normalised device coords (-1..1) */
  pointerX: 0,
  pointerY: 0,
  reducedMotion: false,
  /** camera distance multiplier for narrow viewports; fog scales with it */
  fogScale: 1,
};

type Listener = () => void;

function createFlag() {
  let value = false;
  const listeners = new Set<Listener>();
  return {
    get: () => value,
    set: () => {
      if (value) return;
      value = true;
      listeners.forEach((l) => l());
    },
    subscribe: (l: Listener) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

/** Flips once the WebGL scene has rendered its first frames (or WebGL is unavailable). */
export const sceneReady = createFlag();

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

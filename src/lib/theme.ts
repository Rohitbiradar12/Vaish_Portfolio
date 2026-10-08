// Colour theme: the visitor picks light, dark or system. Every visit starts in
// dark mode: the choice is kept in sessionStorage, so it lasts through reloads
// in that tab but a new visit opens dark again. It's mirrored on <html> as
// data-theme-pref (the choice) and data-theme (the resolved light/dark value
// that the CSS keys off).

export type ThemePref = "light" | "dark" | "system";
export type Theme = "light" | "dark";

export const THEME_KEY = "theme";
export const DEFAULT_PREF: ThemePref = "dark";

/** Page background per theme; keep in sync with --color-ink in globals.css. */
export const THEME_BG: Record<Theme, string> = { dark: "#000000", light: "#f5f5f5" };

/**
 * Runs in <head> before the first paint (layout.tsx), so the page never
 * flashes the wrong theme. Mirrors `apply` below. Also drops the localStorage
 * copy that older versions saved, so nobody is pinned to an old choice.
 */
export const themeScript = `(function(){try{localStorage.removeItem("${THEME_KEY}")}catch(e){}try{var p=sessionStorage.getItem("${THEME_KEY}");if(p!=="light"&&p!=="dark"&&p!=="system")p="${DEFAULT_PREF}";var t=p==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):p;var r=document.documentElement;r.dataset.theme=t;r.dataset.themePref=p;r.style.colorScheme=t}catch(e){}})()`;

const isPref = (v: unknown): v is ThemePref => v === "light" || v === "dark" || v === "system";

const systemLight = () => window.matchMedia("(prefers-color-scheme: light)").matches;

export const resolveTheme = (p: ThemePref): Theme => (p === "system" ? (systemLight() ? "light" : "dark") : p);

export const getThemePref = (): ThemePref => {
  const p = document.documentElement.dataset.themePref;
  return isPref(p) ? p : DEFAULT_PREF;
};

export const getTheme = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

const listeners = new Set<() => void>();

function apply(p: ThemePref) {
  const t = resolveTheme(p);
  const root = document.documentElement;
  root.dataset.theme = t;
  root.dataset.themePref = p;
  root.style.colorScheme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_BG[t]);
  listeners.forEach((l) => l());
}

/**
 * Saves and applies a preference. When the visible theme changes and the
 * browser supports View Transitions, the new theme is revealed as a circle
 * growing from `origin` (the switch button).
 */
export function setThemePref(p: ThemePref, origin?: { x: number; y: number }) {
  try {
    sessionStorage.setItem(THEME_KEY, p);
  } catch {}
  const changes = resolveTheme(p) !== getTheme();
  const animate =
    changes && origin && "startViewTransition" in document && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!animate) return apply(p);

  const { x, y } = origin;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(() => apply(p));
  vt.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 600, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => undefined);
}

function onSystemChange() {
  if (getThemePref() === "system") apply("system");
}

/** useSyncExternalStore subscriber: theme changes from the switch or the OS. */
export function subscribeTheme(cb: () => void) {
  if (listeners.size === 0) window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", onSystemChange);
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) window.matchMedia("(prefers-color-scheme: light)").removeEventListener("change", onSystemChange);
  };
}

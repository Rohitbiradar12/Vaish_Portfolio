import { useSyncExternalStore } from "react";
import { DEFAULT_PREF, getTheme, getThemePref, subscribeTheme, type Theme, type ThemePref } from "./theme";

/** The visitor's choice: light, dark or system. */
export const useThemePref = (): ThemePref => useSyncExternalStore(subscribeTheme, getThemePref, () => DEFAULT_PREF);

/** The theme actually showing (system resolved to light or dark). */
export const useTheme = (): Theme => useSyncExternalStore(subscribeTheme, getTheme, () => (DEFAULT_PREF === "light" ? "light" : "dark"));

import { BLOCKS } from "@/components/three/hero/spec";
import type { Role } from "@/content/experience";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2025-05" → months since year 0 (for timeline maths). */
export const monthIndex = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
};

export const fmtMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

export const fmtIndex = (idx: number) => `${MONTHS[((idx % 12) + 12) % 12]} ${Math.floor(idx / 12)}`;

export const durationMonths = (start: string, end: string) => monthIndex(end) - monthIndex(start) + 1;

export const fmtDuration = (months: number) => {
  if (months < 12) return `${months} mo`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y} yr ${m} mo` : `${y} yr`;
};

/** Each role shares its colour with the die block it lights up in the hero. */
export const roleColor = (role: Role) => (role.dieBlock ? BLOCKS[role.dieBlock].color : "#8a94a6");

export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { roles, timeline, type Role } from "@/content/experience";
import { cn, durationMonths, fmtDuration, fmtIndex, fmtMonth, monthIndex, roleColor } from "@/lib/format";

const T0 = monthIndex(timeline.start);
const T1 = monthIndex(timeline.end);
const SPAN = T1 - T0;
const toPct = (idx: number) => ((idx - T0) / SPAN) * 100;

const span = (r: Role) => ({ x0: toPct(monthIndex(r.start)), x1: toPct(monthIndex(r.end) + 1) });

const YEARS = Array.from({ length: Math.floor(T1 / 12) - Math.ceil(T0 / 12) + 1 }, (_, i) => Math.ceil(T0 / 12) + i)
  .map((y) => ({ y, x: toPct(y * 12) }))
  .filter((t) => t.x > 1 && t.x < 99);

function Trace({ role, selected }: { role: Role; selected: boolean }) {
  const { x0, x1 } = span(role);
  const c = roleColor(role);
  const hi = 7;
  const lo = 31;
  return (
    <svg viewBox="0 0 100 38" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
      <rect x={x0} y={hi} width={x1 - x0} height={lo - hi} fill={c} opacity={selected ? 0.2 : 0.09} />
      <path
        d={`M0 ${lo} H${x0} V${hi} H${x1} V${lo} H100`}
        fill="none"
        stroke={c}
        strokeWidth={selected ? 2 : 1.4}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="miter"
        style={{ filter: selected ? `drop-shadow(0 0 6px ${c})` : undefined }}
      />
    </svg>
  );
}

export function Experience() {
  const [selected, setSelected] = useState(roles[0].id);
  const [cursor, setCursor] = useState<number | null>(null);
  const [showMore, setShowMore] = useState(false);
  const role = useMemo(() => roles.find((r) => r.id === selected)!, [selected]);
  const color = roleColor(role);

  const cursorIdx = cursor === null ? null : Math.round(T0 + (cursor / 100) * SPAN);
  const isHigh = (r: Role, idx: number | null) =>
    idx !== null && idx >= monthIndex(r.start) && idx <= monthIndex(r.end);

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    setCursor(Math.min(100, Math.max(0, ((e.clientX - b.left) / b.width) * 100)));
  };

  const select = (id: string) => {
    setSelected(id);
    setShowMore(false);
  };

  return (
    <Section id="experience" wide>
      <SectionHeader
        id="experience"
        title={
          <>
            Career, captured as a <span className="text-signal">waveform</span>.
          </>
        }
        lead="Each role is a signal, high while it was active. Hover to scrub the timeline and select a role to see the details. Colours match the blocks on the chip above."
      />

      <Reveal>
        <div className="panel overflow-hidden">
          {/* toolbar */}
          <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-dim md:px-5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
              <span className="ml-3 normal-case tracking-normal text-muted">career.vcd</span>
            </div>
            <span className="hidden sm:inline">
              timescale 1 month · cursor{" "}
              <span className="text-fg">{cursorIdx === null ? "—" : fmtIndex(cursorIdx)}</span>
            </span>
          </div>

          <div className="overflow-x-auto" data-lenis-prevent-wheel>
            <div className="grid grid-cols-[84px_1fr] sm:min-w-[600px] sm:grid-cols-[150px_30px_1fr] md:min-w-[760px] md:grid-cols-[176px_34px_1fr]" onPointerLeave={() => setCursor(null)}>
              {/* header row: time axis */}
              <div className="border-b border-line px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-dim sm:px-4">Signal</div>
              <div className="hidden border-b border-l border-line py-2 text-center font-mono text-[0.62rem] text-dim sm:block">val</div>
              <div className="relative border-b border-l border-line">
                {YEARS.map((t) => (
                  <span
                    key={t.y}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[0.66rem] text-muted"
                    style={{ left: `${t.x}%` }}
                  >
                    {t.y}
                  </span>
                ))}
              </div>

              {/* rows */}
              {roles.map((r, row) => {
                const active = r.id === selected;
                const c = roleColor(r);
                const high = isHigh(r, cursorIdx);
                const { x0, x1 } = span(r);
                return (
                  <div key={r.id} className="contents">
                    <button
                      type="button"
                      onClick={() => select(r.id)}
                      aria-pressed={active}
                      className={cn(
                        "flex min-w-0 items-center gap-2 border-b border-line px-3 text-left font-mono text-[0.72rem] transition-colors sm:px-4 sm:text-[0.74rem]",
                        active ? "bg-panel-2 text-fg" : "text-muted hover:text-fg",
                      )}
                    >
                      <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: c }} />
                      <span className="truncate sm:hidden">{r.signal.split(".")[0]}</span>
                      <span className="hidden truncate sm:inline">{r.signal}</span>
                    </button>
                    <div
                      className={cn(
                        "hidden place-items-center border-b border-l border-line font-mono text-[0.74rem] sm:grid",
                        high ? "text-fg" : "text-dim",
                      )}
                      style={high ? { color: c } : undefined}
                    >
                      {cursorIdx === null ? "·" : high ? "1" : "0"}
                    </div>
                    <button
                      type="button"
                      onClick={() => select(r.id)}
                      onPointerMove={onMove}
                      aria-label={`${r.title} at ${r.org}`}
                      className={cn("relative h-[46px] cursor-crosshair border-b border-l border-line", active && "bg-panel-2/60")}
                    >
                      <Trace role={r} selected={active} />
                      {cursor !== null && (
                        <span className="pointer-events-none absolute inset-y-0 w-px bg-warn/80" style={{ left: `${cursor}%` }}>
                          {row === 0 && cursorIdx !== null && (
                            <span className="absolute left-1.5 top-0.5 whitespace-nowrap rounded bg-warn px-1.5 py-0.5 font-mono text-[0.6rem] font-semibold text-ink">
                              {fmtIndex(cursorIdx)}
                            </span>
                          )}
                        </span>
                      )}
                      {x1 - x0 > 8 && (
                        <span
                          className="pointer-events-none absolute top-1/2 hidden -translate-y-1/2 truncate px-2 text-left font-mono text-[0.64rem] uppercase tracking-[0.08em] sm:block"
                          style={{ left: `${x0}%`, width: `${x1 - x0}%`, color: c }}
                        >
                          {r.org.replace(" Ltd", "")}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}

            </div>
          </div>
        </div>
      </Reveal>

      {/* probed role */}
      <AnimatePresence mode="wait">
        <motion.article
          key={role.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="panel mt-6 grid gap-8 p-6 md:p-8 lg:grid-cols-[minmax(0,1fr)_320px]"
          style={{ borderColor: `${color}40` }}
        >
          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em]" style={{ color }}>
              {role.kind}
            </p>
            <h3 className="mt-3 font-display text-2xl font-semibold text-fg md:text-3xl">{role.title}</h3>
            <p className="mt-1.5 text-muted">
              <span className="text-fg/90">{role.org}</span> · {role.location}
            </p>
            <p className="mt-1 font-mono text-[0.78rem] text-dim">
              {fmtMonth(role.start)} – {fmtMonth(role.end)} · {fmtDuration(durationMonths(role.start, role.end))}
            </p>

            <ul className="mt-6 space-y-3">
              {role.highlights.map((h) => (
                <li key={h} className="flex gap-3 leading-relaxed text-fg/85">
                  <span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rotate-45" style={{ background: color }} />
                  {h}
                </li>
              ))}
              {showMore &&
                role.more.map((h) => (
                  <li key={h} className="flex gap-3 leading-relaxed text-fg/75">
                    <span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rotate-45 bg-dim" />
                    {h}
                  </li>
                ))}
            </ul>
            {role.more.length > 0 && (
              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                className="mt-5 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-muted underline-offset-4 hover:text-fg hover:underline"
              >
                {showMore ? "− fewer details" : `+ ${role.more.length} more`}
              </button>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-dim">Key results</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {role.metrics.map((m) => (
                  <div key={m.label} className="rounded-lg border border-line bg-ink/50 px-3 py-2.5">
                    <p className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-dim">{m.label}</p>
                    <p className="mt-0.5 font-mono text-[0.95rem] font-semibold text-fg">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
            {role.tools.length > 0 && (
              <div>
                <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-dim">Tools</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {role.tools.map((t) => (
                    <span key={t} className="chip-tag">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.article>
      </AnimatePresence>
    </Section>
  );
}

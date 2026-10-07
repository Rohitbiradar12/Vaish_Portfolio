"use client";

import { Fragment, useState } from "react";
import { profile } from "@/content/profile";
import type { FlowIcon, FlowStep, Publication } from "@/content/publications";
import { cn } from "@/lib/format";

// ---------------------------------------------------------------------------
// citation formats
// ---------------------------------------------------------------------------
const isRange = (pages?: string) => !!pages && /[–-]/.test(pages);

const abbreviate = (name: string) => {
  const parts = name.replace(/\./g, ". ").split(/\s+/).filter(Boolean);
  const last = parts.pop()!;
  return [...parts.map((p) => `${p[0].toUpperCase()}.`), last].join(" ");
};

const listAuthors = (names: string[]) =>
  names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;

export function ieeeCitation(p: Publication) {
  const parts = [
    `${listAuthors(p.authors.map(abbreviate))}, "${p.title},"`,
    p.venueAbbrev ?? p.venue,
    p.volume && `vol. ${p.volume}`,
    p.issue && `no. ${p.issue}`,
    p.pages && (isRange(p.pages) ? `pp. ${p.pages}` : `Art. no. ${p.pages}`),
    `${p.date.split(" ")[0]}. ${p.year}`,
    p.doi && `doi: ${p.doi}`,
  ].filter(Boolean);
  return `${parts.join(", ").replace(',",', ',"')}.`;
}

export function bibtexCitation(p: Publication) {
  const conf = p.kind === "Conference paper";
  const key = `patil${p.year}${p.id.split("-")[0]}`;
  const fields: [string, string | number | undefined][] = [
    // LaTeX treats a bare "&" as an alignment character
    ["title", p.title.replace(/&/g, "\\&")],
    ["author", p.authors.join(" and ")],
    [conf ? "booktitle" : "journal", p.venue],
    ["volume", p.volume],
    ["number", p.issue],
    ["pages", p.pages?.replace("–", "--")],
    ["publisher", p.publisher],
    ["year", p.year],
    ["doi", p.doi],
    ["issn", p.issn],
  ];
  const body = fields
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `  ${k} = {${v}}`)
    .join(",\n");
  return `@${conf ? "inproceedings" : "article"}{${key},\n${body}\n}`;
}

function CopyChip({ label, text }: { label: string; text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {}
      }}
      className="px-3.5 py-2 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted transition hover:text-fg"
    >
      {done ? "✓ copied" : label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// illustrated first page of the paper
// ---------------------------------------------------------------------------
function wrap(text: string, max: number) {
  const lines: string[] = [];
  let line = "";
  for (const w of text.split(" ")) {
    if ((line + " " + w).trim().length > max) {
      lines.push(line.trim());
      line = w;
    } else line += ` ${w}`;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

const SERIF = "Georgia, 'Times New Roman', serif";

function PaperThumb({ p }: { p: Publication }) {
  const titleLines = wrap(p.title, 35).slice(0, 5);
  const authorLines = wrap(p.authors.join(", "), 62).slice(0, 2);
  // Long bilingual titles ("Tuijin Jishu / Journal of …") keep only the English part,
  // and drop the abbreviation from the right-hand code so the header never collides.
  const headVenue = (p.venue ?? p.kind).split(" / ").pop()!;
  const longVenue = headVenue.length > 28;
  const code = `${!longVenue && p.venueAbbrev ? p.venueAbbrev.toUpperCase() : "VOL."} ${p.volume ?? ""}${p.issue ? `(${p.issue})` : ""}, ${p.pages ?? ""} (${p.year})`;
  const firstPage = isRange(p.pages) ? p.pages!.split(/[–-]/)[0] : `${p.pages}-1`;
  const ty = 56;
  const ay = ty + titleLines.length * 16 + 6;
  const ab = ay + authorLines.length * 9.5 + (p.affiliation ? 18 : 8);
  const n = p.flow.length;
  const box = Math.min(16, (106 - (n - 1) * 6) / n);
  const lines = (x: number, y0: number, count: number, seed: number) =>
    Array.from({ length: count }, (_, i) => (
      <rect key={`${x}-${y0}-${i}`} x={x} y={y0 + i * 7} width={i % 6 === 5 ? 70 : 118 - ((i * seed) % 9) * 2} height="3" rx="1" fill="#cfd2d8" />
    ));
  const bodyTop = ab + 44;
  const leftRows = Math.max(4, Math.floor((370 - bodyTop) / 7));
  return (
    <div className="paper-stack">
      <div className="paper-back" aria-hidden />
      <svg viewBox="0 0 300 388" className="paper-front" role="img" aria-label={`First page of "${p.title}"`}>
        <rect width="300" height="388" fill="#f6f6f3" />
        <text x="22" y="24" fontFamily={SERIF} fontStyle="italic" fontSize="8.5" fill="#5b6270">
          {headVenue}
        </text>
        <text x="278" y="24" textAnchor="end" fontFamily="ui-monospace, monospace" fontSize="6" fill="#8a909b">
          {code}
        </text>
        <line x1="22" y1="31" x2="278" y2="31" stroke="#c9ccd3" />
        <text fontFamily={SERIF} fontWeight="700" fontSize="13" fill="#14171c">
          {titleLines.map((l, i) => (
            <tspan key={`${l}-${i}`} x="22" y={ty + i * 16}>
              {l}
            </tspan>
          ))}
        </text>
        <text fontFamily={SERIF} fontSize="7.2" fill="#3f4652">
          {authorLines.map((l, i) => (
            <tspan key={`${l}-${i}`} x="22" y={ay + i * 9.5}>
              {l}
            </tspan>
          ))}
        </text>
        {p.affiliation && (
          <text x="22" y={ay + authorLines.length * 9.5 + 6} fontFamily={SERIF} fontStyle="italic" fontSize="6.2" fill="#6b7280">
            Dept. of ECE, Dayananda Sagar College of Engineering, Bengaluru
          </text>
        )}
        <text x="22" y={ab + 6} fontFamily={SERIF} fontWeight="700" fontSize="7.4" fill="#14171c">
          Abstract.
        </text>
        {[208, 256, 240, 252, 180].map((w, i) => (
          <rect key={i} x={i === 0 ? 62 : 22} y={ab + 1 + i * 7} width={w} height="3" rx="1" fill="#c4c8cf" />
        ))}
        {lines(22, bodyTop, leftRows, 3)}
        {lines(160, bodyTop, 3, 5)}
        <g transform={`translate(160 ${bodyTop + 24})`}>
          <rect width="118" height="58" rx="3" fill="#eef0f3" stroke="#d5d8de" />
          {p.flow.map((s, i) => {
            const x = 6 + i * (box + 6) + (106 - (n * box + (n - 1) * 6)) / 2;
            return (
              <g key={s.id}>
                <rect x={x} y="18" width={box} height={box} rx="2" fill="#1b2230" />
                <rect x={x + box / 4} y={18 + box / 2 - 2} width={box / 2} height="4" rx="1" fill="#00c8e0" />
                {i < n - 1 && <path d={`M${x + box} ${18 + box / 2} h6`} stroke="#0aa6bd" strokeWidth="1.3" />}
              </g>
            );
          })}
          <text x="59" y="50" textAnchor="middle" fontFamily={SERIF} fontSize="5.6" fill="#5b6270">
            FIG. 1. {p.flowSource === "abstract" ? "System flow." : "Concept."}
          </text>
        </g>
        {lines(160, bodyTop + 90, Math.max(2, leftRows - 13), 7)}
        <text x="150" y="380" textAnchor="middle" fontFamily={SERIF} fontSize="6.5" fill="#8a909b">
          {firstPage}
        </text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// signal-flow diagram
// ---------------------------------------------------------------------------
const ICONS: Record<FlowIcon, React.ReactNode> = {
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
      <path d="M10.5 18.5h3M9.5 7h2v2h-2zM12.5 7h2v2h-2zM9.5 10h2v2h-2z" />
    </>
  ),
  screen: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M3 8h18M8 21h8M12 17v4" />
    </>
  ),
  antenna: (
    <>
      <path d="M5.5 9.5a9 9 0 0 1 13 0M8 12.5a5.5 5.5 0 0 1 8 0" />
      <rect x="7" y="15" width="10" height="5.5" rx="1.5" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="M6.5 10.5h4M6.5 13.5h6M18.5 9a4.5 4.5 0 0 1 0 6M20.8 7a7.5 7.5 0 0 1 0 10" />
    </>
  ),
  cup: <path d="M5 10h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 11.5h1.5a2.5 2.5 0 0 1 0 5H16M9 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3" />,
  code: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />,
  wave: <path d="M2 16h4V8h5v8h4V8h7" />,
  chip: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M10 4v3M14 4v3M10 17v3M14 17v3M4 10h3M4 14h3M17 10h3M17 14h3" />
    </>
  ),
  car: (
    <>
      <path d="M4 15l1.6-4.4A2 2 0 0 1 7.5 9.3h9a2 2 0 0 1 1.9 1.3L20 15M4 15h16v3h-2.5M4 15v3h2.5M9.5 18h5" />
      <circle cx="7.5" cy="18" r="1.6" />
      <circle cx="16.5" cy="18" r="1.6" />
    </>
  ),
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </>
  ),
  wheel: (
    <>
      <circle cx="9" cy="4.5" r="1.6" />
      <path d="M9 7.5v5.5h5.5l2.5 5.5M9 10h5" />
      <circle cx="10" cy="16.5" r="4.5" />
    </>
  ),
  scale: (
    <>
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M12 7v3M5 10h14" />
      <rect x="4" y="14" width="16" height="6" rx="1.5" />
    </>
  ),
  plc: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="1.5" />
      <path d="M7 5v-2M10 5v-2M14 5v-2M17 5v-2M7 19v2M10 19v2M14 19v2M17 19v2M8 10h8M8 14h5" />
    </>
  ),
  sheet: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M4 8h16M4 13h16M10 3v18" />
    </>
  ),
  network: (
    <>
      <rect x="3" y="4" width="8" height="6" rx="1" />
      <rect x="13" y="4" width="8" height="6" rx="1" />
      <path d="M7 10v4h10v-4M12 14v4M9 20h6" />
    </>
  ),
};

function Icon({ name }: { name: FlowIcon }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

function SignalFlow({ flow }: { flow: FlowStep[] }) {
  return (
    <ol className="mt-5 flex flex-col md:flex-row md:items-stretch">
      {flow.map((step, i) => (
        <Fragment key={step.id}>
          <li className="flow-node">
            <span className="flow-desig">U{i + 1}</span>
            <div className="flow-chip">
              <span className="text-signal">
                <Icon name={step.icon} />
              </span>
              <div className="min-w-0">
                <p className="text-[0.88rem] font-semibold text-fg">{step.label}</p>
                <p className="mt-0.5 text-[0.74rem] leading-snug text-muted">{step.detail}</p>
              </div>
            </div>
          </li>
          {i < flow.length - 1 && (
            <li className="flow-link" aria-hidden>
              <span className="flow-link-label">{step.link}</span>
            </li>
          )}
        </Fragment>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
export function PaperCard({ p, index }: { p: Publication; index: number }) {
  const firstAuthor = p.authors[0] === profile.name;
  const meta = (
    [
      ["Venue", p.venueAbbrev ?? p.venue],
      ["Volume", [p.volume, p.issue && `Issue ${p.issue}`].filter(Boolean).join(" · ")],
      [isRange(p.pages) ? "Pages" : "Article", p.pages],
      ["Published", p.publishedOn ?? p.date],
      ["ISSN", p.issn],
      ["Cited by", String(p.citations)],
    ] as [string, string | undefined][]
  ).filter((m): m is [string, string] => !!m[1]);

  return (
    <article className={cn("panel overflow-hidden p-0", p.featured ? "featured-paper" : "paper-card")}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5 md:px-8">
        <p className="flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.18em]">
          <span className="text-signal">[{index}]</span>
          {p.featured ? (
            <span className="flex items-center gap-2 text-gold">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                <path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.9l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor" />
              </svg>
              Featured publication
            </span>
          ) : (
            <span className="text-muted">{p.kind}</span>
          )}
        </p>
        {p.doi ? (
          <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer" className="font-mono text-[0.72rem] tracking-[0.06em] text-muted transition hover:text-fg">
            DOI <span className="text-fg/90">{p.doi}</span> ↗
          </a>
        ) : (
          <a href={p.url} target="_blank" rel="noreferrer" className="font-mono text-[0.72rem] tracking-[0.06em] text-muted transition hover:text-fg">
            Google Scholar record ↗
          </a>
        )}
      </header>

      <div className="grid gap-8 p-5 md:p-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <a href={p.url} target="_blank" rel="noreferrer" className="group mx-auto block w-[210px] self-start pt-2 lg:w-full" aria-label={`Open "${p.title}" on ${p.urlLabel}`}>
          <PaperThumb p={p} />
        </a>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip-tag !text-fg/85">{p.kind}</span>
            <span className="chip-tag">{p.publisher ?? p.topic}</span>
            {firstAuthor && (
              <span className="chip-tag !border-gold/50 !text-gold">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" /> First author
              </span>
            )}
          </div>

          <h3 className="mt-4 font-display text-[1.35rem] font-semibold leading-[1.22] text-fg md:text-[1.65rem]">
            <a href={p.url} target="_blank" rel="noreferrer" className="transition hover:text-signal">
              {p.title}
            </a>
          </h3>
          <p className="mt-3 text-[0.92rem] text-muted">
            {p.authors.map((a, j) => (
              <span key={a}>
                {a === profile.name ? <strong className="font-semibold text-fg">{a}</strong> : a}
                {j < p.authors.length - 1 && ", "}
              </span>
            ))}
          </p>
          {p.affiliation && <p className="mt-1 text-[0.8rem] italic text-dim">{p.affiliation}</p>}

          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
            {meta.map(([k, v]) => (
              <div key={k} className="bg-panel px-4 py-3">
                <dt className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-dim">{k}</dt>
                <dd className="mt-1 text-[0.95rem] font-semibold text-fg">{v}</dd>
              </div>
            ))}
          </dl>

          <figure className="relative mt-6 rounded-xl border border-line bg-ink/50 px-5 pb-5 pt-4 md:px-6">
            <span className="pointer-events-none absolute -top-3 right-5 font-display text-6xl leading-none text-signal/25" aria-hidden>
              &rdquo;
            </span>
            <figcaption className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-dim">
              {p.summaryKind === "Abstract" ? "Abstract (excerpt)" : "Summary · based on the title"}
            </figcaption>
            <blockquote className="mt-2 text-[0.95rem] leading-relaxed text-fg/85">{p.summary}</blockquote>
          </figure>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="mr-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-dim">Keywords</span>
            {p.keywords.map((k) => (
              <span key={k} className="rounded-md border border-line-strong bg-panel-2 px-2.5 py-1 text-[0.78rem] text-fg/80">
                {k}
              </span>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "rounded-full px-5 py-2.5 text-sm font-semibold transition",
                p.featured
                  ? "bg-signal text-ink shadow-[0_0_30px_-8px_rgba(0,229,255,0.7)] hover:brightness-110"
                  : "border border-signal/50 bg-signal/10 text-fg hover:bg-signal/20",
              )}
            >
              Read on {p.urlLabel} ↗
            </a>
            <div className="flex items-center rounded-full border border-line-strong">
              <span className="pl-4 pr-1 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-dim">Cite</span>
              <CopyChip label="IEEE" text={ieeeCitation(p)} />
              <span className="h-4 w-px bg-line-strong" />
              <CopyChip label="BibTeX" text={bibtexCitation(p)} />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-line bg-ink/40 px-5 py-6 md:px-8 md:py-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="kicker">{p.flowSource === "abstract" ? "System flow · as described in the paper" : "Concept flow · from the paper's title"}</p>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-dim">Fig. 1 · {p.flowSource === "abstract" ? "signal path" : "illustrative"}</p>
        </div>
        <SignalFlow flow={p.flow} />
      </div>
    </article>
  );
}

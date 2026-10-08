import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { profile } from "@/content/profile";

const CONTENTS = ["Education", "Technical skills", "4 industry roles", "Projects"];
const PAGES = [
  ["Education", "Technical skills", "Work experience"],
  ["Work experience", "Projects"],
];

/** Stylised two-page preview of the resume, built from its real section headings. */
function DocPreview() {
  return (
    <div className="relative mx-auto h-[300px] w-[230px]" aria-hidden>
      {PAGES.map((headings, pi) => (
        <div
          key={pi}
          className="absolute h-[280px] w-[210px] rounded-md border border-line-strong bg-panel p-4 shadow-[0_30px_60px_-25px_var(--shadow)]"
          style={{ left: pi * 20, top: pi === 0 ? 20 : 0, zIndex: 2 - pi, transform: `rotate(${pi === 0 ? -2 : 3}deg)` }}
        >
          {pi === 0 && (
            <>
              <div className="mx-auto h-2.5 w-24 rounded-sm bg-fg/70" />
              <div className="mx-auto mt-1.5 h-1 w-32 rounded-sm bg-fg/20" />
            </>
          )}
          {headings.map((h) => (
            <div key={h} className="mt-3.5">
              <p className="font-mono text-[0.45rem] uppercase tracking-[0.18em] text-signal">{h}</p>
              <div className="mt-1 h-px w-full bg-line-strong" />
              {[0.92, 0.8, 0.86, 0.6].map((w, i) => (
                <div key={i} className="mt-1 h-[3px] rounded-sm bg-fg/15" style={{ width: `${w * 100}%` }} />
              ))}
            </div>
          ))}
          {pi === 0 && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-md">
              <div className="h-1/3 w-full animate-scan bg-gradient-to-b from-transparent via-signal/10 to-transparent" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function Resume() {
  return (
    <Section id="resume">
      <SectionHeader
        id="resume"
        title={
          <>
            Download the <span className="text-muted">resume</span>.
          </>
        }
        lead="The full resume as a PDF: education, skills, four industry roles and every project, on two pages."
      />

      <Reveal>
        <div className="panel grid items-center gap-10 overflow-hidden p-7 md:grid-cols-[minmax(0,1fr)_280px] md:p-10">
          <div>
            <p className="kicker">Resume · PDF</p>
            <p className="mt-4 break-all font-display text-2xl font-semibold text-fg md:text-3xl">{profile.resume.fileName}</p>
            <p className="mt-2 font-mono text-[0.78rem] text-dim">
              PDF · {profile.resume.pages} pages · updated {profile.resume.updated}
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {CONTENTS.map((c) => (
                <li key={c} className="chip-tag !text-fg/85">
                  <span className="text-ok">✓</span> {c}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={profile.resume.href}
                download={profile.resume.fileName}
                className="btn-primary rounded-full px-6 py-3 text-sm font-semibold"
              >
                Download PDF
              </a>
              <a
                href={profile.resume.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line-strong px-6 py-3 text-sm font-semibold text-fg transition hover:border-signal/60"
              >
                Open in new tab ↗
              </a>
            </div>
          </div>
          <DocPreview />
        </div>
      </Reveal>
    </Section>
  );
}

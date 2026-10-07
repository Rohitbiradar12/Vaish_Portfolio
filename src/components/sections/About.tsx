import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { bio, profile } from "@/content/profile";

/** Her portrait once `profile.photo` is set; until then a styled "die photo" placeholder. */
function Portrait() {
  return (
    <div className="panel relative aspect-[4/5] overflow-hidden p-0 lg:aspect-auto lg:h-full lg:min-h-[400px]">
      {profile.photo ? (
        <>
          <Image
            src={profile.photo}
            alt={`Portrait of ${profile.name}`}
            fill
            sizes="(min-width: 1024px) 320px, 300px"
            className="object-cover object-[center_28%]"
          />
          {/* probe-camera framing: soft vignette, caption fade and HUD corners */}
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(5,8,11,0.55)]" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/85 to-transparent" aria-hidden />
          <div className="hud-corners pointer-events-none absolute inset-3 opacity-60" aria-hidden />
        </>
      ) : (
        <svg viewBox="0 0 400 500" className="absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <pattern id="rows" width="400" height="7" patternUnits="userSpaceOnUse">
              <rect width="400" height="5.6" fill="#161c27" />
            </pattern>
            <radialGradient id="glow" cx="50%" cy="42%" r="60%">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="500" fill="#0b1016" />
          <rect x="40" y="60" width="320" height="380" fill="url(#rows)" opacity="0.8" />
          {Array.from({ length: 6 }, (_, i) => (
            <rect key={i} x={70 + i * 52} y="60" width="6" height="380" fill="#8a94a6" opacity="0.12" />
          ))}
          <rect x="40" y="60" width="320" height="380" fill="none" stroke="#2a3442" strokeWidth="2" />
          <rect x="52" y="72" width="296" height="356" fill="none" stroke="#2a3442" strokeWidth="1" />
          <rect width="400" height="500" fill="url(#glow)" />
          <polygon points="200,175 252,205 252,265 200,295 148,265 148,205" fill="none" stroke="#00e5ff" strokeOpacity="0.8" strokeWidth="2" />
          <text x="200" y="248" textAnchor="middle" fontFamily="var(--font-jetbrains-mono)" fontSize="38" fontWeight="700" fill="#e6edf3">
            {profile.initials}
          </text>
        </svg>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-line bg-ink/70 px-4 py-3 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-dim backdrop-blur">
        <span>{profile.photo ? profile.name : "Die photo"}</span>
        <span>{profile.location}</span>
      </div>
    </div>
  );
}

export function About() {
  return (
    <Section id="about">
      <SectionHeader
        id="about"
        title={
          <>
            One engineer, <span className="text-signal">every layer</span> of the chip.
          </>
        }
        lead="Device physics, full-custom layout, RTL and RTL-to-GDSII physical design: the whole stack, written up like a part datasheet."
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:items-stretch lg:gap-12">
        <Reveal className="h-full">
          <div className="mx-auto w-full max-w-[300px] lg:h-full lg:max-w-none">
            <Portrait />
          </div>
        </Reveal>

        <Reveal delay={0.08} className="h-full">
          <article className="panel flex h-full flex-col overflow-hidden">
            <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-6 py-5 md:px-8">
              <div>
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-signal">VP-2026 · {profile.role}</p>
                <p className="mt-1 font-display text-xl font-semibold text-fg">{profile.name}</p>
              </div>
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-dim">Datasheet · Rev A</p>
            </header>

            <section className="flex flex-1 flex-col justify-center px-6 py-7 md:px-8 md:py-9">
              <h3 className="ds-heading">General description</h3>
              <div className="mt-5 space-y-4 text-[1.02rem] leading-relaxed text-fg/85">
                {bio.map((p) => (
                  <p key={p.slice(0, 24)}>{p}</p>
                ))}
              </div>
            </section>

            <footer className="flex flex-wrap justify-between gap-2 border-t border-line px-6 py-3.5 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-dim md:px-8">
              <span>{profile.location}</span>
              <span>Page 1 of 1</span>
            </footer>
          </article>
        </Reveal>
      </div>
    </Section>
  );
}

import { sectionMeta, type SectionId } from "@/content/sections";
import { cn } from "@/lib/format";

export function Section({
  id,
  children,
  className,
  wide = false,
}: {
  id: SectionId;
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <section id={id} className={cn("relative scroll-mt-16 px-5 py-24 md:px-10 md:py-32", className)}>
      <div className={cn("mx-auto", wide ? "max-w-7xl" : "max-w-6xl")}>{children}</div>
    </section>
  );
}

export function SectionHeader({
  id,
  title,
  lead,
  aside,
}: {
  id: SectionId;
  title: React.ReactNode;
  lead?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  const s = sectionMeta(id);
  return (
    <header className="mb-12 flex flex-col gap-6 md:mb-16 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[0.72rem] uppercase tracking-[0.18em]">
          <span className="text-signal">{s.code}</span>
          <span className="h-px w-10 bg-line-strong" />
          <span className="text-muted">{s.label}</span>
        </div>
        <h2 className="mt-5 max-w-3xl font-display text-[clamp(2.1rem,4.6vw,3.6rem)] font-semibold leading-[1.03] tracking-[-0.02em] text-fg">
          {title}
        </h2>
        {lead && <p className="mt-5 max-w-2xl text-[1.02rem] leading-relaxed text-muted">{lead}</p>}
      </div>
      {aside}
    </header>
  );
}

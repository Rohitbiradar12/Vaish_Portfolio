import { profile } from "@/content/profile";

// Static on purpose: Cache Components prerendering disallows reading the clock here.
const YEAR = 2026;

export function Footer() {
  return (
    <footer className="border-t border-line px-5 py-10 md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-dim md:flex-row md:items-center md:justify-between">
        <p>
          © {YEAR} {profile.name} · {profile.location}
        </p>
        <a href="#top" className="self-start text-muted hover:text-fg md:self-auto">
          Back to top ↑
        </a>
      </div>
    </footer>
  );
}

"use client";

import { useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { profile } from "@/content/profile";

const PROMPT = "vaishnavi@vp-silicon:~$";

function Line({ cmd, out }: { cmd: string; out?: string }) {
  return (
    <div className="space-y-1">
      <p>
        <span className="text-ok">{PROMPT}</span> <span className="text-fg">{cmd}</span>
      </p>
      {out && <p className="text-muted">{out}</p>}
    </div>
  );
}

export function Contact() {
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = `Portfolio: message from ${name || "a visitor"}`;
    const body = `${msg}\n\n— ${name}${from ? ` (${from})` : ""}`;
    window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const field =
    "w-full rounded-md border border-line bg-ink/60 px-3 py-2 text-fg outline-none transition placeholder:text-dim focus:border-signal/60";

  return (
    <Section id="contact">
      <SectionHeader
        id="contact"
        title={
          <>
            Get in <span className="text-signal">touch</span>.
          </>
        }
        lead="Hiring for physical design, RTL design or verification? Send a message or reach out directly."
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Reveal>
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-2.5 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-dim">
              <span>uart0 · 115200 8N1</span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-ok shadow-[0_0_8px_var(--color-ok)]" /> connected
              </span>
            </div>
            <div className="space-y-4 p-5 font-mono text-[0.82rem] leading-relaxed md:p-6">
              <Line cmd="whoami" out={`${profile.name}: ${profile.role.toLowerCase()} (PD · RTL · DV)`} />
              <Line cmd="cat status.txt" out={profile.availability} />
              <Line cmd={`./send_message --to ${profile.firstName.toLowerCase()}`} />

              <form onSubmit={submit} className="space-y-3 pt-1">
                <label className="grid gap-1.5 sm:grid-cols-[88px_1fr] sm:items-center">
                  <span className="text-signal">--name</span>
                  <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" required autoComplete="name" />
                </label>
                <label className="grid gap-1.5 sm:grid-cols-[88px_1fr] sm:items-center">
                  <span className="text-signal">--email</span>
                  <input className={field} type="email" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="you@company.com" autoComplete="email" />
                </label>
                <label className="grid gap-1.5 sm:grid-cols-[88px_1fr]">
                  <span className="pt-2 text-signal">--msg</span>
                  <textarea className={`${field} min-h-28 resize-y`} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="We're hiring for…" required />
                </label>
                <div className="flex flex-wrap items-center gap-4 pt-2 sm:pl-[100px]">
                  <button
                    type="submit"
                    className="rounded-md bg-signal px-5 py-2 font-semibold text-ink shadow-[0_0_26px_-6px_rgba(0,229,255,0.7)] transition hover:brightness-110"
                  >
                    SEND ↵
                  </button>
                  {sent && <span className="text-ok">✓ handed off to your mail client</span>}
                </div>
              </form>
              <p className="text-dim">
                <span className="text-ok">{PROMPT}</span> <span className="animate-blink">▍</span>
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="grid content-start gap-3">
          <button type="button" onClick={copyEmail} className="panel group p-5 text-left transition hover:border-line-strong">
            <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-dim">Email</p>
            <p className="mt-1.5 break-all text-fg">{profile.email}</p>
            <p className="mt-2 font-mono text-[0.68rem] text-signal">{copied ? "✓ copied" : "click to copy"}</p>
          </button>
          <a href={profile.links.linkedin} target="_blank" rel="noreferrer" className="panel p-5 transition hover:border-line-strong">
            <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-dim">LinkedIn</p>
            <p className="mt-1.5 text-fg">in/vaishnavi-patil ↗</p>
          </a>
          {profile.links.scholar && (
            <a href={profile.links.scholar} target="_blank" rel="noreferrer" className="panel p-5 transition hover:border-line-strong">
              <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-dim">Google Scholar</p>
              <p className="mt-1.5 text-fg">Publications ↗</p>
            </a>
          )}
          <a href="#resume" className="panel p-5 transition hover:border-line-strong">
            <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-dim">Resume</p>
            <p className="mt-1.5 text-fg">Download the datasheet →</p>
          </a>
          <div className="panel p-5">
            <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-dim">Location</p>
            <p className="mt-1.5 text-fg">{profile.location}</p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

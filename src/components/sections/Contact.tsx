"use client";

import { useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { profile } from "@/content/profile";
import { type EmailJSConfig, mailtoHref, sendContactMessage } from "@/lib/contact";

const PROMPT = "vaishnavi@vp-silicon:~$";

// "opened" = handed to the visitor's email app (used when EmailJS isn't configured).
type Status = "idle" | "sending" | "sent" | "opened" | "throttled" | "failed";

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

/** `emailjs` is null when the keys aren't set; the form then opens the visitor's email app. */
export function Contact({ emailjs }: { emailjs: EmailJSConfig | null }) {
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [sentTo, setSentTo] = useState("");
  const [copied, setCopied] = useState(false);

  const draft = { name, email: from, message: msg };

  const submit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "sending") return;
    if (!emailjs) {
      window.location.assign(mailtoHref(draft));
      setStatus("opened");
      return;
    }
    setStatus("sending");
    try {
      await sendContactMessage(emailjs, draft);
      setSentTo(from);
      setName("");
      setFrom("");
      setMsg("");
      setStatus("sent");
    } catch (err) {
      console.error("Contact form: message not sent", err);
      setStatus((err as { status?: number } | null)?.status === 429 ? "throttled" : "failed");
    }
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
            Get in <span className="text-muted">touch</span>.
          </>
        }
        lead="Hiring for physical design, RTL design or verification? Send me a message or reach out directly."
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Reveal>
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-2.5 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-dim">
              <span>uart0 · 115200 8N1</span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-ok shadow-[0_0_8px_var(--ok)]" /> connected
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
                  <input className={field} type="email" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="you@company.com" required autoComplete="email" />
                </label>
                <label className="grid gap-1.5 sm:grid-cols-[88px_1fr]">
                  <span className="pt-2 text-signal">--msg</span>
                  <textarea className={`${field} min-h-28 resize-y`} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="We're hiring for…" required />
                </label>
                <div className="pt-2 sm:pl-[100px]">
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="btn-primary rounded-md px-5 py-2 font-semibold disabled:cursor-wait disabled:opacity-70"
                  >
                    {status === "sending" ? "SENDING…" : "SEND ↵"}
                  </button>
                </div>
                <p role="status" className="sm:pl-[100px]">
                  {status === "sent" && (
                    <span className="text-ok">
                      ✓ Message sent. I&apos;ll reply to {sentTo}.
                    </span>
                  )}
                  {status === "opened" && <span className="text-muted">Opening your email app… Nothing opened? Copy the address from the Email card.</span>}
                  {status === "throttled" && <span className="text-warn">✗ Please wait a few seconds before trying again.</span>}
                  {status === "failed" && (
                    <span className="text-warn">
                      ✗ The message couldn&apos;t be sent.{" "}
                      <a href={mailtoHref(draft)} className="text-fg underline decoration-line-strong underline-offset-4 hover:decoration-signal">
                        Send it from your email app
                      </a>{" "}
                      instead, or copy the address from the Email card.
                    </span>
                  )}
                </p>
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
            <p className="mt-1.5 text-fg">Download the resume →</p>
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

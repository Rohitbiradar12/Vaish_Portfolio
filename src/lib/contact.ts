import { profile } from "@/content/profile";

/**
 * EmailJS keys, read on the server by `getEmailJSConfig` (emailjsConfig.ts) and
 * passed to the contact form. They are public by design: they reach the browser.
 */
export type EmailJSConfig = { serviceId: string; templateId: string; publicKey: string };

export type ContactMessage = { name: string; email: string; message: string };

const subjectFor = (m: ContactMessage) => `Portfolio: message from ${m.name || "a visitor"}`;

// {{time}} in the email, in her time zone (Boston): "Oct 7, 2026, 2:05 PM EDT".
const sentAt = () =>
  new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });

/** A mailto: link with the message pre-filled. */
export function mailtoHref(m: ContactMessage) {
  const body = `${m.message}\n\n— ${m.name}${m.email ? ` (${m.email})` : ""}`;
  return `mailto:${profile.email}?subject=${encodeURIComponent(subjectFor(m))}&body=${encodeURIComponent(body)}`;
}

/**
 * Sends the message through EmailJS. The template's recipient is fixed to her
 * inbox in the EmailJS dashboard, and `email` becomes the Reply-To address (and
 * the recipient of the auto-reply linked to the template). The params match
 * EmailJS's "Contact Us" and "Auto-Reply" pre-built templates.
 * Rejects with EmailJS's `{ status, text }`; 429 means a send from this browser
 * happened less than 10 s ago.
 */
export async function sendContactMessage(config: EmailJSConfig, m: ContactMessage) {
  const emailjs = await import("@emailjs/browser");
  return emailjs.send(
    config.serviceId,
    config.templateId,
    { title: subjectFor(m), name: m.name, email: m.email, message: m.message, time: sentAt() },
    { publicKey: config.publicKey, blockHeadless: true, limitRate: { id: "contact", throttle: 10_000 } },
  );
}

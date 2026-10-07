import "server-only";
import type { EmailJSConfig } from "./contact";

/**
 * Reads the EmailJS keys (names in .env.example). Without a NEXT_PUBLIC_ prefix
 * Next keeps env vars on the server, so the page reads them here (at build time
 * for the static page) and passes them to the contact form as a prop.
 * Returns null if any key is missing; the form then opens the visitor's email app.
 */
export function getEmailJSConfig(): EmailJSConfig | null {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  return serviceId && templateId && publicKey ? { serviceId, templateId, publicKey } : null;
}

// Page sections in scroll order (nav, side rail and section headers).

export const sections = [
  { id: "top", label: "Home", code: "00", nav: false },
  { id: "about", label: "About", code: "01", nav: true },
  { id: "experience", label: "Experience", code: "02", nav: true },
  { id: "skills", label: "Skills", code: "03", nav: true },
  { id: "projects", label: "Projects", code: "04", nav: true },
  { id: "device-lab", label: "Device Lab", code: "05", nav: false },
  { id: "education", label: "Education", code: "06", nav: true },
  { id: "publications", label: "Publications", code: "07", nav: true },
  { id: "resume", label: "Resume", code: "08", nav: true },
  { id: "contact", label: "Contact", code: "09", nav: true },
] as const;

export type SectionId = (typeof sections)[number]["id"];

export function sectionMeta(id: SectionId) {
  const s = sections.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown section ${id}`);
  return s;
}

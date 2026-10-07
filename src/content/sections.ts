// Page sections in scroll order. `level` is the zoom level on the
// abstraction stack, shown in the side rail and section headers.

export const sections = [
  { id: "top", label: "Chip", code: "00", level: "Package", nav: false },
  { id: "about", label: "About", code: "01", level: "Die", nav: true },
  { id: "experience", label: "Experience", code: "02", level: "SoC", nav: true },
  { id: "skills", label: "Skills", code: "03", level: "RTL", nav: true },
  { id: "projects", label: "Projects", code: "04", level: "Layout", nav: true },
  { id: "device-lab", label: "Device Lab", code: "05", level: "Device", nav: false },
  { id: "education", label: "Education", code: "06", level: "Material", nav: true },
  { id: "publications", label: "Publications", code: "07", level: "Signoff", nav: true },
  { id: "resume", label: "Resume", code: "08", level: "Tape-out", nav: true },
  { id: "contact", label: "Contact", code: "09", level: "I/O", nav: true },
] as const;

export type SectionId = (typeof sections)[number]["id"];

export function sectionMeta(id: SectionId) {
  const s = sections.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown section ${id}`);
  return s;
}

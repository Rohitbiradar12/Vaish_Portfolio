// Single source of truth for personal details shown across the site.
// Source: resume (Patil_Vaishnavi.pdf) + LinkedIn export. Edit here, not in components.

export const profile = {
  name: "Vaishnavi Patil",
  firstName: "Vaishnavi",
  initials: "VP",
  role: "VLSI Engineer",
  tagline: "From transistor to tape-out.",
  intro:
    "VLSI engineer working across the whole silicon stack: device physics, full-custom layout, RTL design and RTL-to-GDSII physical design.",
  degree: "MS ECE · Microsystems, Materials & Devices",
  school: "Northeastern University",
  location: "Boston, MA",
  email: "patil.vaishnavi2110@gmail.com",
  // Portrait for the About section (file: public/Images/Vaish.jpeg, 852×1280).
  // Paths are case-sensitive once deployed, so keep "Images" capitalised here.
  photo: "/Images/Vaish.jpeg" as string | null,
  // TODO(client): confirm what she is looking for now that the MS is complete.
  availability: "Open to full-time roles: physical design · RTL design · verification",
  links: {
    linkedin: "https://www.linkedin.com/in/vaishnavi-patil-011273226",
    scholar: "https://scholar.google.com/citations?hl=en&user=jyYA2uYAAAAJ" as string | null,
    github: null as string | null,
  },
  // Public resume. The file lives in /public/resume (gitignored until the
  // phone-number decision is made; see PORTFOLIO_PLAN.md).
  resume: {
    href: "/resume/Vaishnavi_Patil_Resume.pdf",
    fileName: "Vaishnavi_Patil_Resume.pdf",
    updated: "May 2026",
    pages: 2,
  },
} as const;

/** "General description" paragraphs for the datasheet-style About section. */
export const bio = [
  "I'm a VLSI engineer with an MS in Electrical & Computer Engineering from Northeastern University, specializing in Microsystems, Materials & Devices. I like working at every level of a chip, and I've done real work at most of them.",
  "In industry I've taken a 32-bit RISC-V core from RTL to GDSII at 1.0 GHz in 28nm, designed a 2.4 TOPS systolic-array CNN accelerator, and done physical design on DDR4 subsystems for automotive SoCs. In the lab I've hand-built analog and digital layouts in 180nm CMOS, and studied FDSOI body biasing and high-k gate dielectrics. That device-level grounding shapes how I think about timing, power and reliability higher up the stack.",
];

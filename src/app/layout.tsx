import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { profile } from "@/content/profile";
import { DEFAULT_PREF, THEME_BG, themeScript } from "@/lib/theme";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const grotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], display: "swap" });

const description =
  "Vaishnavi Patil, VLSI engineer: RTL-to-GDSII physical design, RTL design & verification, full-custom layout and device physics. MS ECE (Microsystems, Materials & Devices), Northeastern University.";

export const metadata: Metadata = {
  title: `${profile.name} · ${profile.role}`,
  description,
  authors: [{ name: profile.name }],
  keywords: ["VLSI", "physical design", "RTL", "GDSII", "ASIC", "verification", "Cadence", "FDSOI", "portfolio"],
  openGraph: {
    title: `${profile.name} · ${profile.role}`,
    description,
    type: "profile",
  },
};

export const viewport: Viewport = {
  themeColor: THEME_BG.dark,
  colorScheme: "dark light",
};

// The server renders the default theme; the inline script swaps in the saved
// one before the first paint, hence suppressHydrationWarning on <html>.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme={DEFAULT_PREF === "light" ? "light" : "dark"}
      data-theme-pref={DEFAULT_PREF}
      className={`${inter.variable} ${grotesk.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}

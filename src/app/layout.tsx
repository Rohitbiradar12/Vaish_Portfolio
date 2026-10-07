import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import { BootLoader } from "@/components/layout/BootLoader";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { profile } from "@/content/profile";

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
  themeColor: "#05080b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable} ${mono.variable}`}>
      <body>
        <noscript>
          <style>{`#boot{display:none!important}`}</style>
        </noscript>
        <SmoothScroll />
        <BootLoader />
        {children}
      </body>
    </html>
  );
}

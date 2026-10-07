import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/layout/Nav";
import { SectionRail } from "@/components/layout/SectionRail";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { DeviceLab } from "@/components/sections/DeviceLab";
import { Education } from "@/components/sections/Education";
import { Experience } from "@/components/sections/Experience";
import { Hero } from "@/components/sections/Hero";
import { Projects } from "@/components/sections/Projects";
import { Publications } from "@/components/sections/Publications";
import { Resume } from "@/components/sections/Resume";
import { Skills } from "@/components/sections/Skills";

export default function Page() {
  return (
    <>
      <Nav />
      <SectionRail />
      <main>
        <Hero />
        <div className="relative bg-ink">
          <div className="bg-pcb-grid pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:linear-gradient(180deg,transparent,black_8%,black_92%,transparent)]" />
          <div className="relative">
            <About />
            <Experience />
            <Skills />
            <Projects />
            <DeviceLab />
            <Education />
            <Publications />
            <Resume />
            <Contact />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

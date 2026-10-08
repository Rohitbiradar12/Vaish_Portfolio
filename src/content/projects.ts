// Academic projects from the resume. `level` places each project on the
// abstraction stack; `art` picks the procedural layout illustration used until
// real screenshots (Virtuoso layouts, waveforms, plots) arrive from the client.

export type ProjectLevel = "Layout" | "Analog" | "Device" | "RTL";

export type Project = {
  id: string;
  title: string;
  period: string;
  level: ProjectLevel;
  node?: string;
  tools: string[];
  summary: string;
  highlights: string[];
  art: "xor" | "alu" | "opamp" | "gateoxide" | "fdsoi" | "ahb";
  /** Optional real image in /public/projects; replaces the procedural art when set. */
  image?: string;
};

export const projects: Project[] = [
  {
    id: "xor-180",
    title: "CMOS XOR Gate: Schematic to GDSII",
    period: "Jan – May 2026",
    level: "Layout",
    node: "180nm",
    tools: ["Cadence Virtuoso", "DRC / LVS", "PEX"],
    summary:
      "Transistor-level XOR taken through schematic, custom layout, physical verification and parasitic extraction to a fabrication-ready GDSII.",
    highlights: [
      "Schematic capture and full-custom layout in Cadence Virtuoso (180nm CMOS)",
      "Clean DRC/LVS, then parasitic extraction for accurate post-layout validation",
      "Optimized transistor placement, routing and layer connectivity for a compact, rule-compliant layout",
      "Post-layout timing, power and signal-integrity analysis for tape-out readiness",
    ],
    art: "xor",
  },
  {
    id: "alu-32",
    title: "32-bit ALU in 180nm CMOS",
    period: "Sep – Dec 2025",
    level: "Layout",
    node: "180nm",
    tools: ["Cadence Virtuoso", "Spectre"],
    summary:
      "A transistor-level 32-bit ALU (adder, multiplexer, logic unit, comparator) integrated into a full datapath layout.",
    highlights: [
      "Custom schematics for each functional block, simulated before integration",
      "Datapath layout with well-tap insertion, metal-routing optimization and DRC/LVS compliance",
      "Pre- and post-layout Spectre simulation to meet area, power and timing targets",
    ],
    art: "alu",
  },
  {
    id: "gate-oxide",
    title: "Evolution of Gate Oxide Technology in MOSFETs",
    period: "Aug – Dec 2025",
    level: "Device",
    tools: ["Device physics", "Literature study"],
    summary:
      "A study of the move from SiO₂ to high-k / metal-gate stacks, and the scaling limits that forced it.",
    highlights: [
      "Gate-oxide scaling challenges: leakage, short-channel effects, tunneling, oxide reliability",
      "Impact on transistor performance, power consumption and device reliability",
      "High-k / metal-gate integration and future dielectric technologies for nanoscale CMOS",
    ],
    art: "gateoxide",
  },
  {
    id: "opamp-741",
    title: "741 Op-Amp Physical Design",
    period: "Jan – Apr 2025",
    level: "Analog",
    node: "180nm",
    tools: ["Cadence Virtuoso", "Spectre"],
    summary:
      "Full-custom layout of the classic 741 operational amplifier, verified against its open-loop gain, slew rate and bandwidth.",
    highlights: [
      "Full-custom layout with DRC/LVS compliance",
      "Pre- vs post-layout Spectre simulation of gain, slew rate and bandwidth",
      "Layout optimized for minimum area and parasitic capacitance, robust across PVT",
    ],
    art: "opamp",
  },
  {
    id: "fdsoi-22",
    title: "Design & Analysis of FDSOI CMOS",
    period: "Sep – Dec 2024",
    level: "Device",
    node: "22nm FDSOI",
    tools: ["SPICE", "Process-variation analysis"],
    summary:
      "Digital CMOS circuits in 22nm fully-depleted SOI, using body biasing for dynamic threshold-voltage control.",
    highlights: [
      "Body biasing for dynamic V_T control and low-power operation",
      "Delay, leakage, dynamic power and noise immunity compared with bulk CMOS",
      "SPICE-level process-variation analysis of scalability and reliability",
    ],
    art: "fdsoi",
  },
  {
    id: "ahb2apb",
    title: "AMBA AHB → APB Bridge",
    period: "Oct – Dec 2022",
    level: "RTL",
    tools: ["Verilog", "ModelSim"],
    summary:
      "A synthesizable protocol bridge between high-performance AHB masters and low-power APB peripherals, verified in simulation.",
    highlights: [
      "3-state FSM (IDLE → SETUP → ENABLE) driving APB transfer phases",
      "Address decoder, read/write data paths and ready/valid handshake logic",
      "ModelSim testbench for transfer integrity, latency and protocol corner cases",
    ],
    art: "ahb",
  },
];

export const levelMeta: Record<ProjectLevel, { label: string; color: string; blurb: string }> = {
  Layout: { label: "Layout", color: "var(--cat-1)", blurb: "Full-custom digital layout" },
  Analog: { label: "Analog", color: "var(--cat-3)", blurb: "Analog circuit layout" },
  Device: { label: "Device", color: "var(--cat-4)", blurb: "Transistor & materials physics" },
  RTL: { label: "RTL", color: "var(--cat-2)", blurb: "Logic design & verification" },
};

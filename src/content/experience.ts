// Work history, condensed from the resume (primary source).
// `signal` is the name shown in the waveform viewer; `dieBlock` links a role
// to the block that lights up on the 3D die in the hero.

export type DieBlockId = "riscv" | "cnn" | "ddr4" | "bridge";

export type Role = {
  id: string;
  signal: string;
  title: string;
  org: string;
  location: string;
  /** ISO year-month, inclusive */
  start: string;
  end: string;
  kind: "Industry" | "Internship" | "Teaching";
  summary: string;
  highlights: string[];
  more: string[];
  metrics: { label: string; value: string }[];
  tools: string[];
  dieBlock?: DieBlockId;
};

export const roles: Role[] = [
  {
    id: "qbit",
    signal: "qbit.backend_pd",
    title: "Backend VLSI Engineer",
    org: "QBit Semiconductor Ltd",
    location: "Massachusetts, USA",
    start: "2025-05",
    end: "2025-08",
    kind: "Industry",
    summary: "Owned the full RTL-to-GDSII implementation of a 32-bit RISC-V processor in 28nm CMOS.",
    highlights: [
      "Executed full RTL-to-GDSII of a 32-bit RISC-V core in 28nm CMOS (Cadence Genus → Innovus → PrimeTime), hitting 1.0 GHz with clean signoff.",
      "Built the floorplan and power grid with optimized macro placement and congestion-aware routing, reaching 68% core utilization.",
      "Implemented CTS and routing for 1.0 GHz with 80 ps clock skew, closing every DRC, antenna and connectivity violation for clean Calibre DRC/LVS.",
      "Ran multi-corner STA (SS/TT/FF) in PrimeTime, cutting timing violations by 30% through ECO fixes and Tcl automation.",
    ],
    more: [
      "Synthesized the RTL in Genus with timing-, power- and area-driven optimization, producing an area-efficient netlist for physical-design handoff.",
      "Reduced routing overflow by 22% with hotspot mitigation, buffer insertion and density-aware placement.",
      "Tcl automation delivered a 25% faster backend runtime with positive WNS/TNS closure.",
    ],
    metrics: [
      { label: "Fmax", value: "1.0 GHz" },
      { label: "node", value: "28 nm" },
      { label: "skew", value: "80 ps" },
      { label: "util", value: "68 %" },
      { label: "overflow", value: "−22 %" },
      { label: "violations", value: "−30 %" },
    ],
    tools: ["Genus", "Innovus", "PrimeTime", "Calibre", "Tcl"],
    dieBlock: "riscv",
  },
  {
    id: "micron",
    signal: "micron.rtl_design",
    title: "Digital Design Engineer",
    org: "Micron Technology",
    location: "Hyderabad, India",
    start: "2023-10",
    end: "2024-07",
    kind: "Industry",
    summary: "Designed a 16×16 systolic-array CNN accelerator for power-constrained edge-AI workloads.",
    highlights: [
      "Designed a 16×16 systolic-array CNN accelerator in Verilog/SystemVerilog with pipelined MAC PEs: 2.4 TOPS at 900 MHz in 28nm CMOS.",
      "Wrote parameterized RTL for control FSMs, buffering and memory scheduling, cutting external memory-access overhead by 32%.",
      "Built self-checking SystemVerilog testbenches in Cadence Xcelium, catching and fixing 15+ RTL mismatches before synthesis handoff.",
      "Closed timing at 900 MHz in Genus (+0.11 ns WNS, 18% lower critical-path delay) with timing-driven SDC constraints.",
    ],
    more: [
      "Defined multicycle paths, clock gating and I/O delay constraints in SDC, giving zero constraint mismatches across SS/TT/FF for a clean PD handoff.",
      "Automated the RTL-to-synthesis flow in Python across PVT corners, reducing design-iteration runtime by 25%.",
    ],
    metrics: [
      { label: "throughput", value: "2.4 TOPS" },
      { label: "clock", value: "900 MHz" },
      { label: "array", value: "16×16 PE" },
      { label: "mem access", value: "−32 %" },
      { label: "WNS", value: "+0.11 ns" },
      { label: "bugs caught", value: "15+" },
    ],
    tools: ["Verilog", "SystemVerilog", "Xcelium", "Genus", "SDC", "Python"],
    dieBlock: "cnn",
  },
  {
    id: "centum",
    signal: "centum.pd_intern",
    title: "Physical Design Engineer Intern",
    org: "Centum Electronics",
    location: "Bengaluru, India",
    start: "2023-04",
    end: "2023-09",
    kind: "Internship",
    summary: "Physical design of high-speed blocks for automotive-grade SoCs under ISO 26262.",
    highlights: [
      "Supported the RTL-to-GDSII physical-design flow for high-speed digital blocks in automotive-grade SoCs, compliant with ISO 26262.",
      "Optimized floorplanning, power planning and placement for DDR4 memory subsystems to reach 3200 MT/s at 1.2 V.",
      "Ran STA across PVT corners to fix setup/hold violations, and resolved CTS skew and insertion-delay issues.",
      "Worked with DRC/LVS verification teams to close design-rule and connectivity violations for tape-out-ready signoff.",
    ],
    more: [
      "Collaborated with RTL, synthesis and physical-verification teams to improve backend design efficiency.",
    ],
    metrics: [
      { label: "DDR4", value: "3200 MT/s" },
      { label: "VDD", value: "1.2 V" },
      { label: "safety", value: "ISO 26262" },
      { label: "STA", value: "multi-PVT" },
    ],
    tools: ["PD flow", "CTS", "STA", "DRC / LVS"],
    dieBlock: "ddr4",
  },
  {
    id: "maven",
    signal: "maven.dv_intern",
    title: "Design Verification Intern",
    org: "Maven Silicon",
    location: "Bengaluru, India",
    start: "2022-10",
    end: "2022-12",
    kind: "Internship",
    summary: "Designed and verified an AMBA AHB-to-APB bridge.",
    highlights: [
      "Designed and verified an AHB2APB bridge in Verilog, linking high-performance AHB masters to low-power APB peripherals.",
      "Built a 3-state FSM (IDLE → SETUP → ENABLE) with address decoding, read/write data paths and ready/valid handshakes for APB compliance.",
      "Created a ModelSim testbench to validate transfer integrity, latency and protocol correctness across corner cases.",
      "Debugged timing mismatches and edge-triggered failures through waveform inspection, then refined the bridge FSM.",
    ],
    more: ["Built a synthesizable top level with interface wrappers and AHB/APB signal synchronization."],
    metrics: [
      { label: "bus", value: "AMBA AHB/APB" },
      { label: "FSM", value: "3-state" },
      { label: "sim", value: "ModelSim" },
    ],
    tools: ["Verilog", "ModelSim"],
    dieBlock: "bridge",
  },
  {
    // TODO(client): confirm she wants teaching shown + name of the Jul 2025 – Apr 2026 course.
    id: "neu-ta",
    signal: "neu.teaching",
    title: "Graduate Teaching Assistant",
    org: "Northeastern University",
    location: "Boston, MA",
    start: "2025-01",
    end: "2026-04",
    kind: "Teaching",
    summary: "Three terms supporting core ECE courses.",
    highlights: [
      "Digital Design & Computer Architecture (Jan – May 2025).",
      "Fundamentals of Linear Systems (May – Jul 2025).",
      "Graduate Teaching Assistant (Jul 2025 – Apr 2026).",
    ],
    more: [],
    metrics: [
      { label: "terms", value: "3" },
      { label: "since", value: "Jan 2025" },
    ],
    tools: [],
  },
];

/** Waveform time axis bounds (ISO year-month). */
export const timeline = { start: "2022-09", end: "2026-06" };

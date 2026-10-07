// Skills regrouped for the chip-pinout diagram. Each group is one side of the
// package; `toolchain` renders as the power / clock rail underneath.

export type PinGroup = {
  id: string;
  side: "top" | "right" | "bottom" | "left";
  label: string;
  short: string;
  pins: string[];
};

export const pinGroups: PinGroup[] = [
  {
    id: "pd",
    side: "top",
    label: "Physical Design & Signoff",
    short: "PD",
    pins: ["Floorplanning", "Power planning", "Placement", "CTS", "Routing", "Multi-corner STA", "ECO", "DRC / LVS"],
  },
  {
    id: "rtl",
    side: "right",
    label: "Digital Design & Verification",
    short: "RTL",
    pins: ["Verilog", "SystemVerilog", "VHDL", "RTL design", "FSMs", "AHB / APB", "SoC integration", "SV testbenches"],
  },
  {
    id: "analog",
    side: "bottom",
    label: "Analog & Custom Layout",
    short: "ANA",
    pins: ["Schematic design", "SPICE / Spectre", "Op-amps", "DC/DC converters", "Data converters", "Full-custom layout", "Parasitic extraction", "Timing closure"],
  },
  {
    id: "device",
    side: "left",
    label: "Devices, Materials & Process",
    short: "DEV",
    pins: ["Silvaco TCAD", "FDSOI", "High-k / metal gate", "Thin films", "Micro/nano fab", "MEMS design", "Wafer processing", "IC packaging & test"],
  },
];

export const toolchain = {
  eda: ["Cadence Genus", "Cadence Innovus", "Cadence Virtuoso", "Cadence Xcelium", "Spectre", "Synopsys PrimeTime", "Calibre", "Xilinx Vivado", "ModelSim", "PSPICE", "KiCad"],
  languages: ["Python", "Tcl", "Perl", "C", "C++", "LabVIEW"],
  lab: ["Oscilloscope", "Multimeter", "Soldering", "Wafer probe & final test"],
};

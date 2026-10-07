// Sources (fetched 2026-10-06):
//  - Google Scholar profile: https://scholar.google.com/citations?hl=en&user=jyYA2uYAAAAJ
//  - AIP publisher page for the conference paper (DOI 10.1063/5.0225345)
//  - Crossref for the SCADA paper (DOI 10.52783/tjjpt.v44.i3.389, with abstract)
// The FPGA and wheelchair papers have no DOI or abstract anywhere we could find,
// so they carry title-based summaries and diagrams labelled "from the title".
//
// Three 2023 records list "Tuijin Jishu/Journal of Propulsion Technology", a
// title that appears on Retraction Watch's Hijacked Journal Checker (clone
// site: propulsiontechjournal.com). Those records also embed "Scopus Q3 / SJR"
// claims in the journal name; the site deliberately does not repeat them.
// See PORTFOLIO_PLAN.md before changing how these are presented.

export const scholar = {
  url: "https://scholar.google.com/citations?hl=en&user=jyYA2uYAAAAJ",
  affiliation: "Northeastern University",
  verifiedDomain: "northeastern.edu",
  interests: ["FPGA", "VLSI", "Digital Electronics", "ASIC Design", "Physical Design"],
  metrics: [
    { label: "Citations", value: 29 },
    { label: "h-index", value: 3 },
    { label: "i10-index", value: 1 },
  ],
  asOf: "Oct 2026",
};

export type FlowStep = { id: string; label: string; detail: string; link?: string; icon: FlowIcon };
export type FlowIcon = "phone" | "screen" | "antenna" | "card" | "cup" | "code" | "wave" | "chip" | "car" | "cpu" | "wheel" | "scale" | "plc" | "sheet" | "network";

export type Publication = {
  id: string;
  title: string;
  kind: "Conference paper" | "Journal article";
  topic: string;
  /** In published order; her own name is highlighted in the UI. */
  authors: string[];
  venue?: string;
  venueAbbrev?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  issn?: string;
  doi?: string;
  date: string;
  publishedOn?: string;
  year: number;
  citations: number;
  affiliation?: string;
  /** Verbatim abstract excerpt where one exists, otherwise a summary of the title. */
  summary: string;
  summaryKind: "Abstract" | "Summary";
  keywords: string[];
  /** Signal-flow diagram; `flowSource` says whether it comes from the abstract or only the title. */
  flow: FlowStep[];
  flowSource: "abstract" | "title";
  url: string;
  urlLabel: string;
  featured?: boolean;
};

const scholarView = (id: string) =>
  `https://scholar.google.com/citations?view_op=view_citation&hl=en&user=jyYA2uYAAAAJ&citation_for_view=jyYA2uYAAAAJ:${id}`;

const TUIJIN = {
  venue: "Tuijin Jishu / Journal of Propulsion Technology",
  venueAbbrev: "Tuijin Jishu",
  volume: "44",
  issue: "3",
  issn: "1001-4055",
} as const;

export const publications: Publication[] = [
  {
    id: "mug-magic",
    // Verified on the publisher page (pubs.aip.org). Crossref lists volume "3203";
    // that is a registry error, the publisher shows 3149(1).
    title: "Mug magic - Design & development of low-cost mini beverages machine vending using AI-M-DL concepts",
    kind: "Conference paper",
    topic: "IoT · Embedded AI",
    authors: ["Vaishnavi Patil", "V. K. Vaibhav", "B. G. Thyagaraj", "G. Suprith Gowda", "G. Pavithra", "T. C. Manjunath"],
    venue: "AIP Conference Proceedings",
    venueAbbrev: "AIP Conf. Proc.",
    volume: "3149",
    issue: "1",
    pages: "140027",
    publisher: "AIP Publishing",
    issn: "0094-243X",
    doi: "10.1063/5.0225345",
    date: "Aug 2024",
    publishedOn: "19 Aug 2024",
    year: 2024,
    citations: 1,
    affiliation: "Dept. of Electronics & Communication Engg., Dayananda Sagar College of Engineering, Bengaluru",
    summary:
      "This system involves a pre-installed mobile app scanning a QR code on a vending machine, accessing a web-based virtual machine, allowing users to choose items, initiating digital payments through an IoT gateway, and dispensing tea or coffee upon successful RFID-based payment. This paper presents the design and development of a cost-effective mini tea and coffee machine, aiming to meet the specific needs of consumers, particularly in small-scale sectors.",
    summaryKind: "Abstract",
    keywords: ["Internet of Things", "RFID payments", "QR-code ordering", "Contactless vending", "Embedded systems"],
    flowSource: "abstract",
    flow: [
      { id: "app", icon: "phone", label: "Mobile app", detail: "Scans the machine's QR code", link: "QR" },
      { id: "vm", icon: "screen", label: "Web VM", detail: "User picks tea or coffee", link: "ORDER" },
      { id: "gw", icon: "antenna", label: "IoT gateway", detail: "Initiates digital payment", link: "PAY" },
      { id: "rfid", icon: "card", label: "RFID auth", detail: "Payment verified", link: "OK" },
      { id: "out", icon: "cup", label: "Dispenser", detail: "Pours the drink" },
    ],
    url: "https://doi.org/10.1063/5.0225345",
    urlLabel: "AIP Publishing",
    featured: true,
  },
  {
    id: "fpga-automotive",
    title:
      "Simulation & design of a VLSI embedded system using Verilog coding with ModelSim approach in FPGA scenarios for AI applications in automotive sectors",
    kind: "Journal article",
    topic: "FPGA · Automotive AI",
    authors: ["Vaishnavi Patil", "G. Pavithra", "T. C. Manjunath"],
    ...TUIJIN,
    pages: "862–870",
    date: "Jul 2023",
    year: 2023,
    citations: 7,
    summary: "A Verilog-designed FPGA embedded system, simulated and verified in ModelSim, aimed at AI workloads in automotive applications.",
    summaryKind: "Summary",
    keywords: ["Verilog HDL", "ModelSim", "FPGA", "Automotive AI", "Embedded systems"],
    flowSource: "title",
    flow: [
      { id: "rtl", icon: "code", label: "Verilog RTL", detail: "Design captured in Verilog", link: "SIM" },
      { id: "sim", icon: "wave", label: "ModelSim", detail: "Simulation & verification", link: "SYNTH" },
      { id: "fpga", icon: "chip", label: "FPGA", detail: "Hardware implementation", link: "DEPLOY" },
      { id: "ai", icon: "car", label: "Automotive AI", detail: "Target application" },
    ],
    url: scholarView("2osOgNQ5qMEC"),
    urlLabel: "Google Scholar",
  },
  {
    id: "scada-plc",
    // Crossref record supplies the DOI, abstract and author order (she is first author;
    // Scholar's record for this paper is malformed). Published title spells "Implemention".
    title:
      "Design, development of a diversified implementation of a Supervisory Control and Data Acquisition based VLSI system (SCADA) framework utilizing microcontroller-based programmable logic controllers",
    kind: "Journal article",
    topic: "VLSI · Industrial control",
    authors: ["Vaishnavi Patil", "G. Pavithra", "T. C. Manjunath"],
    ...TUIJIN,
    pages: "879–890",
    doi: "10.52783/tjjpt.v44.i3.389",
    date: "Jul 2023",
    year: 2023,
    citations: 12,
    summary:
      "In this paper, the designing & implementing of a supervisory control and data acquisition system (SCADA) framework utilizing microcontroller based programmable logic controllers is presented in brief with some of the simulated results. This article shows the automation of a process by interfacing a weighing balance with Supervisory Control And Data Acquisition System (SCADA) through a Programmable Logic Controller (PLC). … The work discusses in detail the design, architecture, programming and implementation of a PLC. It also covers the various features offered by the SCADA software and also deals with the interfacing of the PLC and SCADA.",
    summaryKind: "Abstract",
    keywords: ["SCADA", "PLC", "Microcontrollers", "Industrial automation", "RS232"],
    flowSource: "abstract",
    flow: [
      { id: "scale", icon: "scale", label: "Weighing balance", detail: "Weighs material bins", link: "WEIGHT" },
      { id: "plc", icon: "plc", label: "PLC", detail: "Microcontroller-based controller", link: "RS232" },
      { id: "scada", icon: "screen", label: "SCADA", detail: "Supervisory control & data acquisition", link: "SCRIPT" },
      { id: "log", icon: "sheet", label: "Excel log", detail: "Written by SCADA script", link: "REPORT" },
      { id: "pc", icon: "network", label: "PC terminals", detail: "Daily data at every terminal" },
    ],
    url: scholarView("d1gkVwhDpl0C"),
    urlLabel: "Google Scholar",
  },
  {
    id: "smart-wheelchair",
    title:
      "Design of smart wheelchair for disabled (handicapped) persons using real time embedded systems & Internet of Things approach",
    kind: "Journal article",
    topic: "Embedded · IoT",
    authors: ["Vaishnavi Patil", "G. Pavithra", "T. C. Manjunath"],
    ...TUIJIN,
    pages: "871–878",
    date: "Jul 2023",
    year: 2023,
    citations: 9,
    summary: "A smart wheelchair for people with disabilities, built on a real-time embedded platform with Internet-of-Things connectivity.",
    summaryKind: "Summary",
    keywords: ["Real-time embedded systems", "Internet of Things", "Assistive technology", "Smart wheelchair"],
    flowSource: "title",
    flow: [
      { id: "mcu", icon: "cpu", label: "Embedded controller", detail: "Real-time control", link: "CTRL" },
      { id: "iot", icon: "antenna", label: "IoT layer", detail: "Internet-of-Things connectivity", link: "DATA" },
      { id: "chair", icon: "wheel", label: "Smart wheelchair", detail: "Assistive mobility for disabled users" },
    ],
    url: scholarView("9yKSN-GCB0IC"),
    urlLabel: "Google Scholar",
  },
];

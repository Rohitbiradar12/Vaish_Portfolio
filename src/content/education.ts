export type Degree = {
  id: string;
  degree: string;
  field: string;
  school: string;
  location: string;
  score: string;
  date: string;
  coursework: string[];
};

export const degrees: Degree[] = [
  {
    id: "ms",
    degree: "Master of Science",
    field: "Electrical & Computer Engineering · Microsystems, Materials & Devices",
    school: "Northeastern University",
    location: "Boston, MA",
    score: "CGPA 3.9",
    date: "May 2026",
    coursework: [
      "Analog Integrated Circuits & Design",
      "MEMS Design",
      "VLSI Design",
      "Solid State Devices",
      "Thin Film Technologies",
      "Micro-Nano Fabrication",
      "Wireless Sensors / IoT",
      "Fundamentals of Computer Engineering",
    ],
  },
  {
    id: "be",
    degree: "Bachelor of Engineering",
    field: "Electronics & Communication Engineering",
    school: "Dayananda Sagar College of Engineering",
    location: "Bengaluru, India",
    score: "8.0 / 10",
    date: "Jul 2024",
    coursework: ["VLSI", "SystemVerilog", "ASIC Design", "Analog Electronics", "Digital Electronics", "FPGA", "Microcontrollers"],
  },
];

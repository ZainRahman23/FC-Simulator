// ═══ technical_control12/tc12_cases.js — TECHNICAL-CONTROL-1.2: the CARRY REFERENCE COURSE (owner §18, §24) ════════════════════════════════════════
// the sections (TECHNICAL-CONTROL-1's course and free TURN<deg>[_L]_V<m/s> sections) × the reference players at 99 / 99 / 99
export const CARRY_SECTIONS = [
  { key: "moderate", label: "straight moderate carry (4.5 m/s)", sec: "TURN0_V4.5" },
  { key: "fast", label: "straight fast carry (7.5 m/s)", sec: "TURN0_V7.5" },
  { key: "left", label: "slight left movement (15°)", sec: "TURN15_L_V5" },
  { key: "right", label: "slight right movement (15°)", sec: "TURN15_V5" },
  { key: "cut30", label: "30° cut (right)", sec: "CUT30" },
  { key: "cut30L", label: "30° cut (left)", sec: "CUT30_L" },
  { key: "cut60", label: "60° cut (right)", sec: "CUT60" },
  { key: "cut60L", label: "60° cut (left)", sec: "CUT60_L" },
  { key: "weave", label: "tight weave (left-right, 4 m/s)", sec: "LR" },
  { key: "accel", label: "acceleration into space (3 → 8.5 m/s)", sec: "ACCEL" },
];
export const PLAYERS = [
  { key: "Ldom", label: "left-foot dominant · dominant-foot close-control carrier", style: "DOMINANT_CLOSE", foot: "L" },
  { key: "Rdom", label: "right-foot dominant · dominant-foot close-control carrier", style: "DOMINANT_CLOSE", foot: "R" },
  { key: "two", label: "two-footed technician (weak foot 5)", style: "TWO_FOOT", foot: "B" },
  { key: "neutral", label: "TECHNICAL-CONTROL-1's default: right-footed, neutral style", style: "NEUTRAL", foot: "R" },
];
export const carryId = (s, p, r = [99, 99, 99]) => `${s.sec}_B${r[0]}_D${r[1]}_A${r[2]}_S${p.style}`;
export const carryQuery = (s, p, r = [99, 99, 99]) => `case=${s.sec}&b=${r[0]}&d=${r[1]}&a=${r[2]}&style=${p.style}&foot=${p.foot}`;

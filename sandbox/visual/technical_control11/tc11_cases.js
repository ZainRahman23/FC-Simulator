// ═══ technical_control11/tc11_cases.js — TECHNICAL-CONTROL-1.1: the FEET REVIEW SET (owner's priority list), on TECHNICAL-CONTROL-1's course ═══════
// Each entry: the course section (+ style), seed and preferred foot that shows the pattern (found by tools/tc11_scan.mjs over sections × styles ×
// feet × seeds at 99/99/99); the review plays it at 99/99/99 first, then 80/80/80 and 50/50/50 (the same section — the pattern itself may then
// change, since the ratings choose the footwork).
export const FEET_SET = [
  // win: the review window (page time, s) around the pattern at 99/99/99 (lower ratings: +0.3 s at the end — their contacts come later)
  { key: "straight8", label: "straight high-speed dribbling (8 m/s)", sec: "TURN0_V8", style: "NEUTRAL", seed: 1, foot: "R", win: [0.45, 2.45] },
  { key: "straight", label: "straight dribbling (5.5 m/s)", sec: "STRAIGHT", style: "NEUTRAL", seed: 1, foot: "R", win: [0.4, 2.0] },
  { key: "accel", label: "acceleration into space (3 → 8.5 m/s)", sec: "ACCEL", style: "NEUTRAL", seed: 1, foot: "R", win: [0.1, 1.9] },
  { key: "inside", label: "rapid inside touches (tight left-right)", sec: "LR", style: "NEUTRAL", seed: 1, foot: "R", win: [1.2, 2.75] },
  { key: "outside", label: "rapid outside touches", sec: "CUT30", style: "CLOSE_CONTROL", seed: 1, foot: "R", win: [1.0, 2.05] },
  { key: "in_out", label: "inside → outside", sec: "TURN100_V4", style: "DOMINANT_FOOT", seed: 2, foot: "R", win: [1.9, 3.0] },
  { key: "out_in", label: "outside → inside", sec: "CUT60", style: "CLOSE_CONTROL", seed: 2, foot: "R", win: [1.6, 2.5] },
  { key: "double", label: "double touch", sec: "LR", style: "TWO_FOOT", seed: 1, foot: "R", win: [2.1, 2.9] },
  { key: "drag", label: "drag-back / push (sole)", sec: "TURN135_V2", style: "CLOSE_CONTROL", seed: 3, foot: "R", win: [1.8, 2.75] },
  { key: "stop", label: "sole stop", sec: "STOP", style: "NEUTRAL", seed: 1, foot: "R", win: [1.15, 2.45] },
  { key: "cut60", label: "60° cut", sec: "CUT60", style: "NEUTRAL", seed: 1, foot: "R", win: [1.3, 2.3] },
  { key: "cut90", label: "90° cut", sec: "CUT90", style: "NEUTRAL", seed: 1, foot: "R", win: [1.4, 2.8] },
  { key: "turn120", label: "120° tight turn", sec: "CUT120", style: "NEUTRAL", seed: 1, foot: "R", win: [1.4, 2.6] },
  { key: "turn150", label: "150° tight turn (Cruyff-like)", sec: "CUT150", style: "NEUTRAL", seed: 1, foot: "R", win: [1.4, 2.55] },
  { key: "turn180", label: "180° reversal", sec: "CUT180", style: "NEUTRAL", seed: 1, foot: "R", win: [1.4, 2.55] },
  { key: "dominant", label: "dominant-foot repeated touches (left-footed)", sec: "CUT90", style: "DOMINANT_FOOT", seed: 2, foot: "L", win: [1.0, 2.8] },
];
export const RATINGS = [[99, 99, 99], [80, 80, 80], [50, 50, 50]];
export const caseId = (e, r) => `${e.sec}_B${r[0]}_D${r[1]}_A${r[2]}${e.style && e.style !== "NEUTRAL" ? "_S" + e.style : ""}`;
export const labQuery = (e, r) => `case=${e.sec}&b=${r[0]}&d=${r[1]}&a=${r[2]}&seed=${e.seed}${e.style && e.style !== "NEUTRAL" ? "&style=" + e.style : ""}${e.foot && e.foot !== "R" ? "&foot=" + e.foot : ""}`;

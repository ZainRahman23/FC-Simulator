// ═══ technical_control1/tc_course.js — TECHNICAL-CONTROL-1: the standardized TECHNICAL COURSE (owner §45) ══════════════════════════════════════════
// Every section is its own run on the same pitch, the player starting with the ball at the section's entry speed; the movement INTENT (the only
// input — no skill-move input) is a heading and a speed over time, plus a CONTEST proxy (0 … 1: how much the space geometry calls for disguise —
// owner §15: no defenders, the trigger is the desired movement change + the space). Turns are to the right unless the id ends in L.
//   STRAIGHT · CUT30 … CUT180 (5.5 m/s, the turn at 1.2 s) · LR (a tight left-right sequence at 4 m/s) · ACCEL (into space, 3 → 8.5 m/s) ·
//   CONTEST45 (a 45° change of direction with the space ahead closed) · plus the receive chain (receive → turn → dribble: RECEIVE-ELITE-1's cases)
// Case id: <SECTION>[_L][_B##_D##_A##][_S<style>]   e.g. CUT90_B90_D90_A90_SDOMINANT_FOOT
const D = Math.PI / 180, P0 = [20, 34];
export const SECTIONS = {
  STRAIGHT:  { label: "straight carry", v0: 5.5, dur: 4.0, intent: () => ({ theta: 0, v: 5.5 }) },
  CUT30:     { label: "30° cut", v0: 5.5, dur: 4.0, tTurn: 1.2, turn: 30 },
  CUT60:     { label: "60° cut", v0: 5.5, dur: 4.0, tTurn: 1.2, turn: 60 },
  CUT90:     { label: "90° turn", v0: 5.5, dur: 4.2, tTurn: 1.2, turn: 90 },
  CUT120:    { label: "120° turn", v0: 5.5, dur: 4.4, tTurn: 1.2, turn: 120 },
  CUT150:    { label: "150° turn", v0: 5.5, dur: 4.6, tTurn: 1.2, turn: 150 },
  CUT180:    { label: "180° reversal", v0: 5.5, dur: 4.8, tTurn: 1.2, turn: 180 },
  LR:        { label: "tight left-right sequence", v0: 4.0, dur: 4.6, intent: (t) => { const k = Math.floor(Math.max(0, t - 0.9) / 0.75); return { theta: t < 0.9 ? 0 : (k % 2 === 0 ? -40 : 40) * D, v: 4.0 }; } },
  ACCEL:     { label: "acceleration into space", v0: 3.0, dur: 4.5, intent: () => ({ theta: 0, v: 8.5 }) },
  CONTEST45: { label: "45° change of direction, the space ahead closed (disguise)", v0: 5.0, dur: 4.0, tTurn: 1.2, turn: 45, contest: 1 },
};
export const COURSE = ["STRAIGHT", "CUT30", "CUT60", "CUT90", "CUT120", "CUT150", "CUT180", "LR", "ACCEL", "CONTEST45"];
export function courseCase(id) {
  const t = id.split("_"), sec = SECTIONS[t[0]], left = t.includes("L"), rat = {}; let style = "NEUTRAL";
  for (const x of t.slice(1)) { const m = /^([BDA])(\d+)$/.exec(x); if (m) rat[{ B: "bc", D: "dri", A: "agi" }[m[1]]] = +m[2]; }
  const sm = /_S([A-Z_]+)$/.exec(id); if (sm) style = sm[1];
  const sg = left ? -1 : 1, intent = sec.intent ? (tt) => { const o = sec.intent(tt); return { theta: o.theta * (left ? -1 : 1), v: o.v, contest: o.contest || 0 }; }
    : (tt) => ({ theta: tt < sec.tTurn ? 0 : sg * sec.turn * D, v: sec.v0, contest: sec.contest && tt >= sec.tTurn - 0.6 && tt < sec.tTurn + 0.8 ? sec.contest : 0 });
  const ratings = { bc: rat.bc ?? 99, dri: rat.dri ?? 99, agi: rat.agi ?? 99 };
  return { id, base: t[0] + (left ? "_L" : ""), kind: "course", section: t[0], label: sec.label, turn: sec.turn ? sg * sec.turn : 0, ratings, style, rs: "COURSE", ps: "-", moveIntent: intent, dribble: { v: sec.v0, heading: 0 },
    scenario: { id, init: { v: sec.v0, heading: 0, pos: P0.slice() }, pass: { from: 0, dist: 30, speed: 1, lead: 1 }, launch: { p: [P0[0] + 30, 0.11, P0[1]], v: [0, 0, 0], w: [0, 0, 0] }, exit: { turn: 0, v: sec.v0, intent: "go" }, dur: sec.dur } };
}

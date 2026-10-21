// ═══ speed99/s_tests.js — SPEED-99-V1: THE PACE PRESETS (owner §27), played through the page's own stick (BALL OFF) ═══════════════════════════════
// Each: { name, dur, mode (the stick's mode at the start), m(t) → the mode at t (WALK / JOG / RUN / SPRINT: the stick's zone, SPRINT = the button),
// f(t) → the stick's angle (deg from the start's forward) or null (stick released), course: the pitch markings to lay at the start }
const T1 = 1.0;   // (standing still first: the sprint starts from rest at t = 1.0 s)
const P = (name, dur, f, m, o = {}) => Object.assign({ name, dur, mode: m(0), m, f }, o);
const at = (pairs) => (t) => { let v = pairs[0][1]; for (const [t0, x] of pairs) if (t >= t0) v = x; return v; };
const standThen = (a) => (t) => (t < T1 ? null : a);
const SPR = () => "SPRINT";
export const PACE_TESTS = [
  // (THE TOP SPEED RUN — owner, playtest blocker: from rest, perfectly straight, full sprint, long enough to reach the candidate's top speed)
  P("TOP SPEED RUN · standing → straight full sprint (80 m)", T1 + 10, standThen(0), SPR, { course: "straight" }),
  // (THE EXPLOSION TEST — owner, V1.1: only the first 10–15 m, judged up close: the first steps, the lean, the stride opening)
  P("EXPLOSION TEST · the first 15 m (close camera)", T1 + 2.6, standThen(0), SPR, { course: "explosion" }),
  P("sprint → 60° cut + accelerate", T1 + 5 + 3, at([[0, null], [T1, 0], [T1 + 5, 60]]), SPR),
  P("0–5 m · standing → sprint", T1 + 2.2, standThen(0), SPR, { course: "straight" }),
  P("0–10 m · standing → sprint", T1 + 2.8, standThen(0), SPR, { course: "straight" }),
  P("0–20 m · standing → sprint", T1 + 4.0, standThen(0), SPR, { course: "straight" }),
  P("0–30 m · standing → sprint", T1 + 5.0, standThen(0), SPR, { course: "straight" }),
  P("long sprint · 0–60 m", T1 + 8.5, standThen(0), SPR, { course: "straight" }),
  P("walk → sprint", 3 + 5, () => 0, at([[0, "WALK"], [3, "SPRINT"]]), { course: "straight", courseAt: 3 }),
  P("jog → sprint", 3 + 5, () => 0, at([[0, "JOG"], [3, "SPRINT"]]), { course: "straight", courseAt: 3 }),
  P("run → sprint", 3 + 5, () => 0, at([[0, "RUN"], [3, "SPRINT"]]), { course: "straight", courseAt: 3 }),
  P("sprint → 45° cut + accelerate", T1 + 5 + 3, at([[0, null], [T1, 0], [T1 + 5, 45]]), SPR),
  P("sprint → 90° cut + accelerate", T1 + 5 + 3, at([[0, null], [T1, 0], [T1 + 5, 90]]), SPR),
  P("sprint → 120° cut + accelerate", T1 + 5 + 3.5, at([[0, null], [T1, 0], [T1 + 5, 120]]), SPR),
  P("sprint → 180° + accelerate", T1 + 5 + 4, at([[0, null], [T1, 0], [T1 + 5, 180]]), SPR),
  P("sprint → stop (stick released)", T1 + 5 + 2, at([[0, null], [T1, 0], [T1 + 5, null]]), SPR),
  P("sprint → release (sprint off: run)", T1 + 5 + 2.5, standThen(0), at([[0, "SPRINT"], [T1 + 5, "RUN"]])),
  P("sprint → jog", T1 + 5 + 2.5, standThen(0), at([[0, "SPRINT"], [T1 + 5, "JOG"]])),
  P("repeated sprint / 90° cuts", T1 + 12, (t) => (t < T1 ? null : t < T1 + 1.5 ? 0 : Math.floor((t - T1 - 1.5) / 1.5) % 2 ? -45 : 45), SPR),
  P("curved sprint (20°/s) from a jog", 3 + 5, (t) => (t < 3 ? 0 : 20 * (t - 3)), at([[0, "JOG"], [3, "SPRINT"]])),
];
// ── S99 MISSION: THE PRIMARY PAGE'S PRESETS (BALL ON, the 99 player) — the sprint carry, its cuts, and one state that invites each EXPANDED
// family (with EXPANDED on; with CORE the same input shows the core vocabulary's answer — ⇄ replays it through the other) ──────────────────────────
const RUN_THEN = (t0, m2) => at([[0, "RUN"], [t0, m2]]);
export const MISSION_TESTS = [
  P("SPRINT CARRY · standing → 38 km/h with the ball (12 s)", T1 + 12, standThen(0), SPR, { course: "straight", force: null }),
  P("SPRINT CARRY → 30° cut", T1 + 6 + 3, at([[0, null], [T1, 0], [T1 + 6, 30]]), SPR, { force: null }),
  P("SPRINT CARRY → 90° cut + explode", T1 + 6 + 3.5, at([[0, null], [T1, 0], [T1 + 6, 90]]), SPR, { force: null }),
  P("SPRINT CARRY → 180° + explode", T1 + 6 + 4, at([[0, null], [T1, 0], [T1 + 6, 180]]), SPR, { force: null }),
  P("SPRINT CARRY · steering ±6° (the shorter push)", T1 + 10, (t) => (t < T1 ? null : t < T1 + 3 ? 0 : Math.floor((t - T1 - 3) / 0.8) % 2 ? -6 : 6), SPR, { force: null }),
  // (the families: REVIEW presets — the family forced, one move, wherever it is feasible; the same input through ⇄ T shows B4's own choice)
  P("REVIEW · KNOCK-ON · run → sprint 35° into space", 3 + 3, at([[0, 0], [3, 35]]), RUN_THEN(3, "SPRINT"), { force: "KNK" }),
  P("REVIEW · KNOCK-ON · sprint → 45° (from top speed)", T1 + 5 + 3, at([[0, null], [T1, 0], [T1 + 5, 45]]), SPR, { force: "KNK" }),
  P("REVIEW · LATERAL TRANSFER · run → 40° right", 3 + 2.5, at([[0, 0], [3, 40]]), () => "RUN", { force: "LAT" }),
  P("REVIEW · LATERAL TRANSFER · jog → 30° left", 3 + 2.5, at([[0, 0], [3, -30]]), () => "JOG", { force: "LAT" }),
  P("REVIEW · SOLE ROLL · walk → 120°", 3 + 2.5, at([[0, 0], [3, 120]]), () => "WALK", { force: "SOL" }),
  P("REVIEW · SOLE ROLL · walk → 60° left", 3 + 2.5, at([[0, 0], [3, -60]]), () => "WALK", { force: "SOL" }),
  P("REVIEW · BODY FEINT → outside cut · run → 45° left", 3 + 2.5, at([[0, 0], [3, -45]]), () => "RUN", { force: "FNO" }),
  P("REVIEW · BODY FEINT → inside cut · jog → 40° left", 3 + 2.5, at([[0, 0], [3, -40]]), () => "JOG", { force: "FNI" }),
  P("B4 CHOOSES · run → sprint 35° (EXPANDED, unforced)", 3 + 3, at([[0, 0], [3, 35]]), RUN_THEN(3, "SPRINT"), { force: null }),
  P("B4 CHOOSES · walk → 120° (EXPANDED, unforced)", 3 + 2.5, at([[0, 0], [3, 120]]), () => "WALK", { force: null }),
];

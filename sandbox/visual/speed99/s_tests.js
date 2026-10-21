// ═══ speed99/s_tests.js — SPEED-99-V1: THE PACE PRESETS (owner §27), played through the page's own stick (BALL OFF) ═══════════════════════════════
// Each: { name, dur, mode (the stick's mode at the start), m(t) → the mode at t (WALK / JOG / RUN / SPRINT: the stick's zone, SPRINT = the button),
// f(t) → the stick's angle (deg from the start's forward) or null (stick released), course: the pitch markings to lay at the start }
const T1 = 1.0;   // (standing still first: the sprint starts from rest at t = 1.0 s)
const P = (name, dur, f, m, o = {}) => Object.assign({ name, dur, mode: m(0), m, f }, o);
const at = (pairs) => (t) => { let v = pairs[0][1]; for (const [t0, x] of pairs) if (t >= t0) v = x; return v; };
const standThen = (a) => (t) => (t < T1 ? null : a);
const SPR = () => "SPRINT";
export const PACE_TESTS = [
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

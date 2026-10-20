// ═══ tc_playtest1/pt_params.js — TECHNICAL-CONTROL PLAYTEST-1: the player's parameters ════════════════════════════════════════════════════════════
// 99 / 99 / 99 is the ELITE REFERENCE (the TECHNICAL-CONTROL-1.5 references' timings, Agility's elite body). Below 99 everything here is a
// PROVISIONAL linear scaling — NOT a calibration (owner: "do not invent / finalize new lower-rating calibration"); the page labels it so.
//   Ball Control → the precision of each authoritative contact (direction / speed error of the launch; 0 at 99)
//   Dribbling    → technical execution speed: the reaction to a new request, the commitment lead of a technique, which techniques are available
//   Agility      → the body: acceleration, braking, lateral (curving) acceleration, yaw rate, top speed
export const DEG = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t, c01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const MODES = ["WALK", "JOG", "RUN", "SPRINT"];
export function params(attrs) {
  const a = c01((attrs.agi - 1) / 98), d = c01((attrs.dri - 1) / 98), b = c01((attrs.bc - 1) / 98);
  return {
    attrs: Object.assign({}, attrs), provisional: attrs.agi < 99 || attrs.dri < 99 || attrs.bc < 99,
    // the body (Agility): m/s², deg/s, m/s
    aAcc: lerp(3.6, 7.0, a), aBrake: lerp(5.0, 9.5, a), aLat: lerp(5.5, 11.0, a), yawRate: lerp(380, 900, a) * DEG,
    speed: { WALK: 1.5, JOG: 3.2, RUN: lerp(4.4, 5.3, a), SPRINT: lerp(6.6, 8.0, a) },
    // the technique (Dribbling): s
    react: lerp(0.20, 0.045, d),            // a planned contact / landing closer than this cannot be changed any more
    commit: lerp(0.18, 0.08, d),            // a technique is committed this long before its decisive contact
    techMin: { CHOP: 70, OUTCUT: 20, CRUYFF: 45, HOOK: 50, DRAGBACK: 25 }, // Dribbling below these: the technique is not available (provisional)
    dri: attrs.dri,
    // the touch (Ball Control): launch errors (deg, share of speed) — 0 at 99
    errDir: (1 - b) * 9, errSpeed: (1 - b) * 0.12,
  };
}
// the running gait: RUN-1's own step period Ts and duty factor D at running speeds (sampled from the frozen gait at start-up); TECHNICAL-CONTROL-1's
// walking table below (a stride's stance share: walking > 0.5 with double support)
export function gaitTable(E, body, baked) {
  const out = []; if (baked && baked.gait) for (const [v, Ts, D] of baked.gait) out.push({ v, Ts, D });
  else for (let i = 0; i <= 40; i++) { const v = i * 0.25; let Ts, D;
    if (v >= 3.0) { const G = E.r1GaitAt(body, E.RUN1.ref, Math.min(9.5, v)); Ts = G.Ts; D = G.D; }
    else { const T = [[0, 0.42], [1.5, 0.38], [3, 0.364]], U = [[0, 0.62], [1.5, 0.56], [3, 0.344]], tab = (X, x) => { for (let k = 1; k < X.length; k++) if (x <= X[k][0]) return lerp(X[k - 1][1], X[k][1], (x - X[k - 1][0]) / (X[k][0] - X[k - 1][0])); return X[X.length - 1][1]; }; Ts = tab(T, v); D = tab(U, v); }
    out.push({ v, Ts, D }); }
  const f = (v) => { const x = Math.max(0, Math.min(39.999, v / 0.25)), i = Math.floor(x), u = x - i, A = out[i], B = out[i + 1]; return { Ts: lerp(A.Ts, B.Ts, u), D: lerp(A.D, B.D, u) }; }; f.rows = out; return f;
}
// a footfall's lead ahead of the centre of mass (RUN-1 lands ≈ 0.23 – 0.27 m ahead at speed) and the stance width
export const lead = (v) => Math.min(0.27, 0.06 + 0.042 * v);
export const WIDTH = { run: 0.10, walk: 0.11, stand: 0.12 };

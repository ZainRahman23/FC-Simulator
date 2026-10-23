// ═══ ballon1/carry_env.js — BALL-ON PACE V1: THE D99 BALL-CARRYING MOVEMENT ENVELOPE (owner, 21 Oct) ═══════════════════════════════════════════
// The physical ceilings stay the ball-off ones (Sprint Speed 99 = 38 km/h, Acceleration 99 = D38, Agility 99 = A99-C: pace.js). With the ball ON
// (and a carry candidate chosen) the carry's root path — the request's speed and the acceleration toward it — is bounded by an ENVELOPE that
// depends on the CONTROL DEMAND of the moment, continuously; a technique's own movement (its authored keys + A99-C) is never touched, and D38
// governs the re-acceleration after it inside the envelope of the moment. Ball off: nothing here applies.
//
// CONTROL DEMAND D (0 = an open, stable sprint carry … 1 = tight control): a soft OR of
//   the request against the travel (4° … 45°) · the travel's own turn rate (… 120°/s) · the stick's activity (the decision's volatility) ·
//   a technique in progress (1)
// smoothed in time — it rises within ≈ 0.1 s, falls over ≈ 0.5 s (re-organising the ball after a demanding phase is not instant)
// RUNNING TO THE BALL O (0 … 1): the free ball 1.0 → 2.0 m away (beyond the sprint carry's own 0.7 – 0.9 m lead), in any direction — a
// knocked-on ball ahead, a ball sent onto a new line by a technique's exit, a ball to be secured: it is not being manipulated meanwhile, so more of
// the physical capability is there, only while the ball is out there (it changes the control geometry: no boost of its own). (A first version
// counted only a ball ahead in the running path, and a ball BEHIND the body raised the demand: after a drag-back's exit push the envelope then
// narrowed exactly when the player had to turn and run to the ball — 4 controller failures in 12 h)
//
// THE ENVELOPE (per candidate):
//   available vmax  = physical vmax × [open − (open − tight) · D], toward `knock` with O (scaled by 1 − D)
//   available accel = D38's curve with its launch × (1 − c · touch share) and its taper toward the AVAILABLE vmax — not D38 × a constant:
//                     the touch share is MEASURED (the S99 build, tools/b_share.mjs): ≈ ½ of the steps from rest (the ball starts at the feet and
//                     must be pushed into the running path), in the running carry and in tight control; ≈ ¼ in the 38 km/h sprint carry (every
//                     other stride) — a touching stride cannot push fully: the first steps and tight control pay most, the open sprint carry
//                     least, a knocked-on ball less still
//   above the available vmax (the demand rose): a gentle 3 m/s² slowing, not A99-C's braking
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x), s5 = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (6 * t - 15) + 10); }, DEG = Math.PI / 180;
export const CARRY_ENV = {
  A: { id: "A", label: "D99-CARRY-A · light cost (open 95 % · 36.1 km/h)", color: "#8dffa6", open: 0.95, tight: 0.75, knock: 0.98, c: 0.20 },
  B: { id: "B", label: "D99-CARRY-B · medium cost (open 91.5 % · 34.8 km/h)", color: "#ffd45e", open: 0.915, tight: 0.70, knock: 0.96, c: 0.32 },
  C: { id: "C", label: "D99-CARRY-C · stronger cost (open 88 % · 33.4 km/h)", color: "#ff8a80", open: 0.88, tight: 0.65, knock: 0.94, c: 0.45 },
};
export const CARRY_IDS = ["A", "B", "C"];
export const DEMAND = { dirLo: 4, dirHi: 45, turnHi: 120, volW: 1.0, tauUp: 0.10, tauDown: 0.50, envDecel: 3.0, knockLead: [1.0, 2.0] };
// the expected share of steps that are touch steps (measured; see above)
export function touchShare(v, D, O) { const open = v < 4 ? 0.5 : v > 8 ? 0.25 : 0.5 - 0.25 * (v - 4) / 4; return (open + (0.5 - open) * D) * (1 - 0.7 * O); }
export function vAvailOf(env, vmax, D, O) { const base = env.open - (env.open - env.tight) * D; return vmax * (base + (env.knock - base) * O * (1 - D)); }
// the physical (D38) and the ball-on acceleration at speed s (m/s²), and their ratio — what advance() multiplies its own acceleration by
export function accOf(pr, env, s, D, O, vA) {
  const a0 = pr.a0 != null ? pr.a0 : pr.vmax / pr.tau, aPhys = s >= pr.vmax ? 0 : Math.max(a0 * (1 - Math.pow(Math.max(0, s / pr.vmax), pr.p)), pr.aEnd);
  const m = 1 - env.c * touchShare(s, D, O), aBall = s >= vA ? 0 : Math.max(a0 * m * (1 - Math.pow(Math.max(0, s / vA), pr.p)), pr.aEnd * m);
  return { aPhys, aBall, m, mul: aPhys > 1e-9 ? aBall / aPhys : 0 }; }
// the raw demand from the state of the moment (radians, radians / s)
export function demandRaw(reqDev, turnRate, vol, keyed) {
  const dDir = s5((Math.abs(reqDev) / DEG - DEMAND.dirLo) / (DEMAND.dirHi - DEMAND.dirLo)), dTurn = clamp(Math.abs(turnRate) / DEG / DEMAND.turnHi, 0, 1), dVol = clamp(vol * DEMAND.volW, 0, 1);
  return 1 - (1 - dDir) * (1 - dTurn) * (1 - dVol) * (keyed ? 0 : 1); }
export function demandStep(D, raw, dt) { const tau = raw > D ? DEMAND.tauUp : DEMAND.tauDown; return D + (raw - D) * (1 - Math.exp(-dt / tau)); }
// (the same smoothing per 1/240 s tick with its constants computed once — the plans' inner loop)
const K_UP = 1 - Math.exp(-(1 / 240) / DEMAND.tauUp), K_DOWN = 1 - Math.exp(-(1 / 240) / DEMAND.tauDown);
export const demandTick = (D, raw) => D + (raw - D) * (raw > D ? K_UP : K_DOWN);
// (… and per 3 ticks — the plans evaluate the envelope every 3rd tick)
const K3_UP = 1 - Math.exp(-(3 / 240) / DEMAND.tauUp), K3_DOWN = 1 - Math.exp(-(3 / 240) / DEMAND.tauDown);
export const demandTick3 = (D, raw) => D + (raw - D) * (raw > D ? K3_UP : K3_DOWN);
// the push available (the launch share) — 1 − c · the touch share
export const pushOf = (env, v, D, O) => 1 - env.c * touchShare(v, D, O);
// running to the ball: the free ball's distance from the centre of mass (m)
export function opennessOf(dist) { const K = DEMAND.knockLead; return s5((dist - K[0]) / (K[1] - K[0])); }
// the named carry type (diagnostics only — the envelope itself is continuous)
export function carryType(D, O, keyed, s) { if (keyed) return "TECHNIQUE (its own movement + A99-C)"; if (O > 0.3) return "RUNNING TO THE BALL (knock-on / loose)"; if (D < 0.15) return s > 7 ? "OPEN SPRINT CARRY" : "OPEN CARRY"; if (D < 0.55) return "RUNNING CARRY"; return "TIGHT CONTROL"; }

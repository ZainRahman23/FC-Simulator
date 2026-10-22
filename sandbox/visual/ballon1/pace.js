// ═══ ballon1/pace.js (a copy of speed99/pace.js; BALL-ON PACE V1 adds the carry candidate to applyPace) — SPEED-99-V1: SPRINT SPEED 99 + ACCELERATION 99 candidates (owner, 21 Oct) ═══════════════════════════════════════════════
// Two attributes, kept apart (§4):
//   SPRINT SPEED  vmax — the sustainable top speed once there has been the time / distance to reach it (the SPRINT request's speed)
//   ACCELERATION  accel(s) — how hard the player gains speed at speed s, toward whatever the request wants (standing starts, jog / run → sprint,
//                 out of a cut, after braking); a smooth CURVE (§5), not a constant: the linear acceleration–velocity profile of sprint research
//                 (the mono-exponential v(t) = vmax(1 − e^(−t/τ)) ⇔ a(v) = a0(1 − v/vmax), a0 = vmax / τ), shaped by `p` (1 = linear; > 1 keeps
//                 more of the early acceleration through the middle speeds) and held at `aEnd` near vmax so that vmax is actually reached
// Everything else stays as it is: WALK / JOG / RUN request speeds (the good RUN, §9), braking (aBrake, A99-C's stop), A99-C's redirection
// envelope (§10–11). CURRENT applies nothing: the simulation is TC-CONTROLLED-1's exactly.
//   steerGain  the interaction rule with A99-C (s_movement.js): speed may be gained while the stick steers smoothly (a retarget A99-C itself
//              says costs nothing), within a friction circle of lateral acceleration aLat
//   body       the presentation that explains it (u_gait.js / u_sim.js): accGait — the acceleration gait (quick short steps, long contacts
//              early, the feet landing under the body, stride growing with speed); accLean — the forward lean of hard acceleration
// The numbers are 99 CANDIDATES for the owner to play (§13), not a calibration; 1 – 98 are not defined (§14).
// The candidates (review_artifacts/speed99_v1/RESEARCH.md — measured football / track / inference / design choice kept apart there):
//   A  conservative elite-realistic   vmax 10.0 m/s (36.0 km/h) · τ 1.10 s (a0 9.1 m/s²) · linear      — ≈ the tested national-team top speed
//      + 2 – 2.5 SD (9.2 ± 0.4 m/s) and the 36 km/h class of league peaks; τ ≈ 1.1 s as measured for footballers and sprinters alike
//   B  exceptional football ceiling   vmax 10.35 m/s (37.3 km/h) · τ 1.05 s (a0 9.9 m/s²) · linear     — the top speed of the league records
//      (Premier League 37.38 km/h, Bundesliga 37.16), a0 ≈ Bolt's
//   C  responsive gameplay ceiling    vmax 10.35 m/s · τ 0.95 s (a0 10.9 m/s²) · p 1.35 (the acceleration held higher through the middle
//      speeds — out of moving starts and cuts)                                                          — a GAMEPLAY choice beyond the human data
//      (τ 0.95 = Bolt's 10 m from first movement)
import { CARRY_ENV } from "./carry_env.js";
export const PACE = {
  CURRENT: { id: "CURRENT", label: "Current (8.0 m/s, the baseline's 7 m/s² law)", color: "#e5e9e6", vmax: null },
  A: { id: "A", label: "A · elite realistic (10.0 m/s, τ 1.10)", color: "#a5d9b1", vmax: 10.0, tau: 1.10, p: 1.0, aEnd: 0.5, steerGain: { aLat: 9.0 }, accGait: true, accLean: true },
  B: { id: "B", label: "B · exceptional football ceiling (10.35 m/s, τ 1.05)", color: "#edcc76", vmax: 10.35, tau: 1.05, p: 1.0, aEnd: 0.5, steerGain: { aLat: 10.0 }, accGait: true, accLean: true },
  C: { id: "C", label: "C · responsive gameplay ceiling (10.35 m/s, τ 0.95, p 1.35)", color: "#ff9b8d", vmax: 10.35, tau: 0.95, p: 1.35, aEnd: 0.7, steerGain: { aLat: 11.0 }, accGait: true, accLean: true },
  // ── SPEED-99-V1.1 (owner, 21 Oct): SPRINT SPEED 99 = 38.0 km/h (10.5556 m/s) for every candidate; ACCELERATION 99 not yet selected. The study
  // (review_artifacts/speed99_v1/V1_1_REPORT.md): holding C's launch and raising p barely moves the first response (speed at 0.25 s 2.60 →
  // 2.77 m/s) but transforms the middle of the curve (70 / 80 / 90 % of vmax 0.97 / 1.27 / 1.77 s → 0.74 / 0.90 / 1.16 s at p 3) — C is
  // conservative through the middle, not at the launch. Each: a0 = the launch (m/s² at rest), p = how far into the speeds it holds
  C38: { id: "C38", label: "C38 · C's acceleration at 38 km/h (launch 11.1 m/s², p 1.35)", color: "#ff9b8d", vmax: 38 / 3.6, tau: 0.95, p: 1.35, aEnd: 0.7, steerGain: { aLat: 11.0 }, accGait: true, accLean: true },
  D38: { id: "D38", label: "D38 · C's launch, stronger middle (11.1 m/s², p 2.2)", color: "#ffb36b", vmax: 38 / 3.6, a0: (38 / 3.6) / 0.95, p: 2.2, aEnd: 0.7, steerGain: { aLat: 11.0 }, accGait: true, accLean: true,
    // (S99 MISSION, the owner's Acceleration 99: SPRINT_CARRY — open space at a steady sprint: the ball pushed to the touching foot's N-th swing end)
    sprintCarry: { v: 7.5, vLong: 8.5, hold: 0.8, ang: 10, vol: 0.12, N: 2, H: 1.65 } },   // (N = 3 measured too: 0.8 touches/s, but a 20° cut then waits ≈ 1.1 s for the ball — tools/s99_cutexplode.mjs)
  E38: { id: "E38", label: "E38 · upper responsive ceiling (11.5 m/s², p 3.0)", color: "#ff6f6f", vmax: 38 / 3.6, a0: 11.5, p: 3.0, aEnd: 0.7, steerGain: { aLat: 11.0 }, accGait: true, accLean: true },
};
// (the page's main switch: CURRENT and the 38 km/h acceleration candidates; A / B / C stay selectable under "earlier")
export const PACE_MAIN = ["CURRENT", "C38", "D38", "E38"];
export const PACE_IDS = Object.keys(PACE);
// the acceleration at speed s (m/s²) for a profile: a0 · (1 − (s / vmax)^p), never below aEnd while s < vmax (0 at and above vmax)
export function accelOf(pr) { const a0 = pr.a0 != null ? pr.a0 : pr.vmax / pr.tau; return (s) => { if (s >= pr.vmax) return 0; const x = Math.max(0, s / pr.vmax); return Math.max(a0 * (1 - Math.pow(x, pr.p)), pr.aEnd); }; }
// apply a profile to the baseline's parameters (in place): the SPRINT request's speed, the acceleration curve, the steering rule, the body flags
// (BALL-ON PACE V1: `carry` = a D99 ball-carrying envelope candidate (carry_env.js) — the physical pace is unchanged; the envelope binds only with
// the ball on, in the carry's root path)
export function applyPace(P, id, carry) { const pr = PACE[id]; if (!pr || !pr.vmax) return P; P.ballEnv = carry && CARRY_ENV[carry] ? CARRY_ENV[carry] : null;
  P.speed = Object.assign({}, P.speed, { SPRINT: pr.vmax }); P.accel = accelOf(pr); if (pr.steerGain) P.steerGain = pr.steerGain; P.envExtend = pr.vmax / 8 + 0.05; P.pace = pr; return P; }   // (envExtend: A99-C's own speed scaling continued to the candidate's top speed)
// ── THE BODY THAT EXPLAINS IT (§8): the acceleration gait and lean, used only by the candidates (pace.accGait / accLean) ──────────────────────────
// w = the acceleration DEMAND at a footfall: the plan's own gain over the next 0.3 s against 4 m/s² (1 = a hard drive, 0 = steady running).
// While driving: quicker steps (cadence ≈ 4.0 steps/s from the first step, rising to ≈ 4.65 at speed), longer ground contacts early (≈ 0.20 s at
// the first steps, ≈ 0.105 s by top speed), the feet landing under / just behind the centre of mass at first (≈ −6 cm, ahead again by ≈ 6 m/s);
// steady running is the RUN-1 table exactly (w = 0): the good RUN is untouched at its speeds
const c01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x), lerp = (a, b, u) => a + (b - a) * u;
// (measured: step rate rises over the first ≈ 4 steps then plateaus — 4.58 Hz over the first four steps of fast footballers, 4.73 Hz at 9.33
// m/s; contact 0.17 – 0.23 s over the first three steps of field-sport athletes, 0.148 s over the first four of fast footballers, 0.104 s at speed)
export const ACC_GAIT = { aRef: 4.0, Ts: (v) => 0.250 - 0.037 * c01(v / 4.5), contact: (v) => 0.200 - 0.095 * c01(v / 9), lead: (v) => -0.06 + 0.035 * v };
// (top-speed cadence: RUN-1's table reaches 4.05 steps/s at 8 m/s and stops at 4.55 (9.5 m/s); fast footballers run 4.73 Hz × 1.98 m at 9.33 m/s,
// sprinters ≈ 4.7 – 4.9 Hz at 10 – 12 m/s: above 8 m/s the cadence rises 0.51 Hz per m/s to ≤ 4.8 Hz — 2.16 m steps at 10.35 m/s)
export const topCadence = (v) => (v > 8 ? Math.min(4.8, 4.05 + 0.51 * (v - 8)) : 0);
export function accDemand(v, v2) { return c01((v2 - v) / 0.3 / ACC_GAIT.aRef); }
export function accCadence(G, v, v2, base) { const w = accDemand(v, v2); if (w <= 0) return base; const Gc = G.D * 2 * G.Ts, Ts = lerp(base.Ts, Math.min(base.Ts, ACC_GAIT.Ts(v)), w), c = lerp(Gc, ACC_GAIT.contact(v), w); return { Ts, D: Math.min(0.48, c / (2 * Ts)), w }; }
// (TOP-SPEED STANCE: the stance must fit the leg at both ends — RUN-1's lead stops growing at 0.27 m (5 m/s) and its contact (0.102 s at 9.5
// m/s) carries a candidate's body ≈ 1 m over the foot: the stance ended ≈ 0.7 m behind the hips, beyond the leg, and the drawn pelvis dropped up
// to 7.5 cm for a tick before each toe-off. Above 6.5 m/s the foot lands a little further ahead (0.33 m at 9.6 m/s) and above 7 m/s the contact
// ends ≈ 0.52 m behind (0.087 s at 9.6 m/s: fast sprinters 0.085 – 0.10 s). Below 6.5 m/s RUN-1's placement and contact exactly: the RUN)
export const topLead = (ld, v) => ld;   // (S99 MISSION: RUN-1's lead kept at top speed — landing further ahead left the leg short of the foot at touchdown: the pelvis dropped 6 – 7 cm in the contact tick; the shortened contact below keeps the toe-off within reach instead)
export const topContact = (v, ld) => (v > 7 ? (topLead(ld, v) + 0.52) / v : Infinity);
export function accLead(ld, v, v2) { ld = topLead(ld, v); const w = accDemand(v, v2); return w <= 0 ? ld : lerp(ld, Math.min(ld, ACC_GAIT.lead(v)), w); }
// the forward lean of acceleration (degrees of the lean channel, added to the speed lean): 3° per m/s² of forward acceleration, ≤ 30° — the drawn
// trunk ≈ 0.75 × the channel: ≈ 27° over the first steps of a standing sprint, easing continuously to ≈ 10° at top speed (measured: the trunk
// rises ≈ 4° per step from the start and is upright by ≈ step 16; footballers from a standing start lean less than sprinters from blocks)
export const accLeanDeg = (a) => Math.max(0, Math.min(30, 3.0 * a));

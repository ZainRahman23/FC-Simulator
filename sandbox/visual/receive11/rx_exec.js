// ═══ receive11/rx_exec.js — RECEIVE-CONTROL-1.1: the BALL CONTROL EXECUTION MODEL of the first touch ═════════════════════════════════════════════
// The receive action defines the IDEAL first touch (direction, speed → where the ball goes). Ball Control (the player's real attribute, 1–99) sets
// how exactly it is executed: an EXECUTION-ERROR DISTRIBUTION around the ideal — never a success probability:
//   actual direction = ideal direction + σ_dir(BC) · D · N₁          (deg)
//   actual speed     = ideal speed + σ_speed(BC) · D · (out·|v_ideal| + in·|v_in|) · N₂   (m/s; ≥ 0)
// N₁, N₂ ~ N(0, 1) are KEYED draws (seed | "RECEIVE" | player | receive event | "receive-execution-v1" | dimension | draw index): a pure function
// of the situation, independent of animation, rendering or frame rate. The speed scale includes the incoming speed: deadening a hard pass is the
// hard part of a soft touch. D is the touch's DIFFICULTY (≥ 1): the incoming speed, the redirection, the receiver's speed, the body rotation
// around the contact, the surface and the weak foot. At BC 99 and D = 1 the touch is almost exactly the intended one (σ 0.8°, 2 %); lower Ball
// Control widens the distribution until heavy, short, wrong-side touches — and lost balls — are common. The rigid-body ball does the rest.
// The constants are CALIBRATION VALUES for review (receive11/tools/rx_calib.mjs prints the resulting distributions) — not locked.
import { clamp, tab } from "./rx_actions.js";
import { dsin, dcos } from "../physchar2/core/v2_math.js";
export const RXE = {
  id: "receive-execution-v1",
  sigDir: [[1, 30], [30, 18], [40, 14], [50, 11], [60, 8], [70, 5.5], [80, 3.5], [90, 2.0], [99, 0.8]],          // deg at D = 1
  sigSpeed: [[1, 0.5], [30, 0.32], [40, 0.27], [50, 0.22], [60, 0.17], [70, 0.12], [80, 0.08], [90, 0.05], [99, 0.02]],   // × the speed scale
  speedScale: { out: 0.5, in: 0.35 },
  diff: { vRef: 6, vIn: 0.06, redirect: 0.25, sRef: 5.0, pace: 0.05, rot: 0.3, rotWin: 0.15, surface: { INSIDE: 0, OUTSIDE: 0.15, LACES: 0.1, SOLE: 0.2 }, weak: 0.08, glance: 0.008 },   // glance: per degree the surface is off the impulse
  // EXTENSION POINTS — neutral in RECEIVE-CONTROL-1.1 (documented, not built): agility (the rotation term), reactions (the preparation time),
  // pressure (an opponent's distance), fatigue (effective attributes). Each multiplies the difficulty when set.
  ext: { agility: null, reactions: null, pressure: null, fatigue: null },
};
export const bcOf = (player) => (player && player.attributes && player.attributes.ball_control != null ? player.attributes.ball_control : 75);
export function bcSigma(bc) { const b = clamp(bc, 1, 99); return { dir: tab(RXE.sigDir, b), speed: tab(RXE.sigSpeed, b) }; }
// the difficulty of the touch (≥ 1) and its parts
export function difficulty(c) {
  // c: { vIn (m/s), redirect (deg between incoming and outgoing ball; 0 when the ball is deadened), s (receiver speed), rot (deg of body rotation within ±rotWin of the contact), surface, weak (bool), wf (1–5), glance (deg the surface is off the impulse) }
  const d = RXE.diff, parts = { vIn: d.vIn * Math.max(0, c.vIn - d.vRef), redirect: d.redirect * (c.redirect / 180), pace: d.pace * Math.max(0, c.s - d.sRef), rot: d.rot * (c.rot / 180), surface: d.surface[c.surface] || 0, weak: c.weak ? d.weak * (5 - (c.wf || 3)) : 0, glance: d.glance * (c.glance || 0) };
  let D = 1; for (const v of Object.values(parts)) D += v;
  for (const [k, v] of Object.entries(RXE.ext)) if (v != null && typeof v === "number") { parts["ext_" + k] = v; D *= v; }
  return { D, parts };
}
// the executed touch: ideal { dir (rad, pitch heading), speed (m/s) }, the incoming speed, Ball Control, the difficulty, the RNG and the event key
// (the executed velocity is formed engine-independently: the ideal direction as a unit vector, turned by the error with the kernel's own
// deterministic dsin / dcos — the authoritative launch is bit-identical in every JavaScript engine)
export function execute(rng, key, ideal, vIn, bc, D) {
  const sg = bcSigma(bc), N1 = rng.normal(...key, RXE.id, "dir", 0), N2 = rng.normal(...key, RXE.id, "speed", 0);
  const sDir = sg.dir * D, sSp = sg.speed * D * (RXE.speedScale.out * ideal.speed + RXE.speedScale.in * vIn);
  const e = sDir * N1 * Math.PI / 180, ce = dcos(e), se = dsin(e), u = ideal.u, ux = u[0] * ce - u[1] * se, uy = u[0] * se + u[1] * ce, speed = Math.max(0, ideal.speed + sSp * N2);
  return { dir: Math.atan2(uy, ux), u: [ux, uy], v: [ux * speed, uy * speed], speed, dirErrDeg: sDir * N1, speedErr: speed - ideal.speed, sigDirDeg: sDir, sigSpeed: sSp, N: [N1, N2], bc, D, keyId: rng.keyId(...key, RXE.id, "dir", 0) };
}

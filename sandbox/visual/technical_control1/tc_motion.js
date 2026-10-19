// ═══ technical_control1/tc_motion.js — TECHNICAL-CONTROL-1: the AUTHORED BODY MOTION (Agility) ═══════════════════════════════════════════════════
// The body's path is authored kinematics, not a force simulation (owner: "simulation can author the player movement path, speed change, body
// orientation"). A fixed-step integrator (the simulation tick, 1/240 s) of a commanded acceleration, chosen each tick by the active PROGRAM:
//   RUN       follow the intent: the velocity bends toward the wanted heading at Agility's lateral acceleration and changes speed at its
//             acceleration / braking — a curve, no plant
//   PLANT     a cut: brake toward the turn's entry speed (Agility's braking; TURN-1's angle–speed law × entryK) until the plant tick, then redirect
//             the velocity toward the exit at Agility's redirection rate, then drive along the exit (Agility's acceleration)
//   STOP      a reversal / a stop: brake to the entry speed of the turn (≈ 0 for a reversal), pivot, drive out
//   FEINT     a disguise: a short lateral dip of the centre of mass toward the feint side before a PLANT the other way
// Facing: a second-order follower (bounded yaw rate = Agility's hip rate, bounded yaw acceleration) of the program's facing target — the velocity
// heading while running, the exit heading through a plant / pivot. Everything is C¹ (position and velocity continuous) and deterministic; a plan is
// re-planned from any tick with the state at that tick (continuity by construction).
import { DEG, clamp, wrapA, tab } from "../receive11/rx_actions.js";
import { S_ENTRY } from "../receive11/rx_actions.js";
export const DT = 1 / 240;
const hyp = Math.hypot, abs = Math.abs, max = Math.max, min = Math.min;
export const MOT = { yawAcc: 9000, yawK: 60, yawC: 38, vFloorTurn: 0.35, holdAfterPlant: 0.06, dipW: 0.16, dipT: 0.22 };
// the entry speed a plant at a turn of `deg` is made at (TURN-1's law × Agility's entryK; below 45° a bend, no limit worth a plant)
export const entrySpeed = (deg, ag) => tab(S_ENTRY, max(45, deg)) * ag.entryK;
export class MotionPlan {
  // st: { t (start time), P, V, psi, w (yaw rate) } · ag: Agility params · horizon s
  constructor(st, ag, horizon) { this.t0 = st.t; this.ag = ag; this.n = Math.round(horizon / DT); this.P = new Float64Array(2 * (this.n + 1)); this.V = new Float64Array(2 * (this.n + 1)); this.psi = new Float64Array(this.n + 1); this.w = new Float64Array(this.n + 1); this.events = {}; this.st = st; }
  idx(t) { return clamp(Math.round((t - this.t0) / DT), 0, this.n); }
  at(t) { const x = clamp((t - this.t0) / DT, 0, this.n), i = Math.min(this.n - 1, Math.floor(x)), u = x - i, P = this.P, V = this.V; if (x >= this.n) { const d = (t - this.t0) - this.n * DT; return { P: [P[2 * this.n] + V[2 * this.n] * d, P[2 * this.n + 1] + V[2 * this.n + 1] * d], V: [V[2 * this.n], V[2 * this.n + 1]], psi: this.psi[this.n] }; }
    return { P: [P[2 * i] + (P[2 * i + 2] - P[2 * i]) * u, P[2 * i + 1] + (P[2 * i + 3] - P[2 * i + 1]) * u], V: [V[2 * i] + (V[2 * i + 2] - V[2 * i]) * u, V[2 * i + 1] + (V[2 * i + 3] - V[2 * i + 1]) * u], psi: this.psi[i] + wrapA(this.psi[i + 1] - this.psi[i]) * u }; }
  // integrate a program. prog: { kind, theta (exit heading), v (wanted speed), tPlant (PLANT / STOP: the plant time), vEntry, faceAt (optional
  // facing target override fn(t, V)), dip: { side, t0 } (FEINT) }
  build(prog) {
    const ag = this.ag, P = this.P, V = this.V; let p = this.st.P.slice(), v = this.st.V.slice(), psi = this.st.psi, w = this.st.w || 0, phase = prog.kind === "RUN" ? "drive" : "approach";
    const u = [Math.cos(prog.theta), Math.sin(prog.theta)], vX = prog.v; let tRedirectEnd = null;
    for (let i = 0; i <= this.n; i++) { const t = this.t0 + i * DT; P[2 * i] = p[0]; P[2 * i + 1] = p[1]; V[2 * i] = v[0]; V[2 * i + 1] = v[1]; this.psi[i] = psi; this.w[i] = w;
      const sp = hyp(v[0], v[1]); let a = [0, 0];
      if (phase === "approach" && prog.tPlant != null && t >= prog.tPlant - 1e-9) { phase = "redirect"; this.events.plant = t; }
      if (phase === "approach") { // brake toward the entry speed along the current heading (only as needed to be at vEntry by the plant), a slight bend toward the exit
        const tLeft = max(DT, prog.tPlant - t), want = prog.vEntry, h = sp > 1e-6 ? [v[0] / sp, v[1] / sp] : u, need = (sp - want) / tLeft, aB = clamp(need, -ag.accel, ag.aBrake);
        a = [-h[0] * aB, -h[1] * aB]; if (prog.dip && t >= prog.dip.t0 && t < prog.dip.t0 + MOT.dipT) { const s = Math.sin(Math.PI * (t - prog.dip.t0) / MOT.dipT), n = [-h[1] * prog.dip.side, h[0] * prog.dip.side], k = MOT.dipW * Math.PI * Math.PI / (MOT.dipT * MOT.dipT) * Math.sin(2 * Math.PI * (t - prog.dip.t0) / MOT.dipT) * 0.5; a = [a[0] + n[0] * k, a[1] + n[1] * k]; } }
      else if (phase === "redirect") { // the velocity vector moves straight toward the exit velocity at Agility's redirection rate
        const vO = [u[0] * prog.vOut, u[1] * prog.vOut], d = [vO[0] - v[0], vO[1] - v[1]], dl = hyp(d[0], d[1]), aT = prog.kind === "STOP" ? ag.aBrake : ag.aTurn;
        if (dl <= aT * DT) { v = vO.slice(); phase = "drive"; tRedirectEnd = t; this.events.out = t; } else a = [d[0] / dl * aT, d[1] / dl * aT]; }
      if (phase === "drive") { // along the wanted heading at the wanted speed: bend at the lateral limit, accelerate / brake
        const h = sp > 0.3 ? [v[0] / sp, v[1] / sp] : u, cross = h[0] * u[1] - h[1] * u[0], dot = h[0] * u[0] + h[1] * u[1], ang = Math.atan2(cross, dot);
        const aL = sp > 0.3 ? clamp(ang * sp * 6, -ag.aLat, ag.aLat) : 0, n = [-h[1], h[0]], aF = clamp((vX - sp) * 4, -ag.aBrake, ag.accel * clamp(1.1 - sp / 10, 0.35, 1));
        a = sp > 0.3 ? [h[0] * aF + n[0] * aL, h[1] * aF + n[1] * aL] : [u[0] * ag.accel, u[1] * ag.accel]; }
      v = [v[0] + a[0] * DT, v[1] + a[1] * DT]; p = [p[0] + v[0] * DT, p[1] + v[1] * DT];
      // facing: the velocity heading while running, the exit through a plant / pivot (and at low speed); second-order, bounded rate / acceleration
      const sp2 = hyp(v[0], v[1]), tgt = prog.faceAt ? prog.faceAt(t, v, phase) : (phase === "drive" && sp2 > 1.0 ? Math.atan2(v[1], v[0]) : phase === "approach" && (prog.holdFace || sp2 > 1.0) ? (prog.holdFace ? this.st.psi : Math.atan2(v[1], v[0])) : prog.theta);
      const err = wrapA(tgt - psi), wMax = ag.omega * DEG * (phase === "redirect" || phase === "drive" && sp2 < 2 ? 1 : 0.7), alpha = clamp(MOT.yawK * MOT.yawK * err * 0.1 - MOT.yawC * w, -MOT.yawAcc * DEG, MOT.yawAcc * DEG);
      w = clamp(w + alpha * DT, -wMax, wMax); psi = psi + w * DT; }
    this.events.redirectEnd = tRedirectEnd; return this;
  }
}

// ═══ physchar2/gates/v2_e2.js — E2 SCENARIOS (e2/E2_PREREGISTRATION_v2.md §1): the shared builder of every E2 run, used by the Node harness (tools/e2_run.mjs)
// and the browser = Node check (viewer/e2.html). Configuration PSTAR5 = PSTAR4 + the E2 option (`e2`: step sequencer, one planner, DCM reference layer, explicit
// swing — ctrl/v2_step.js). Commands go only through existing mechanisms (the transfer request, the lifecycle's swing target, the scenario push); Jolt decides.
//   protocol "step" (S-F / S-L / S-RATE / S-P / S-LOW / S-LATE): the E1b timeline up to the swing command — settle, pelvis drop 25 mm (1–3 s), transfer 4 s (3–7 s,
//     stance share 0.5 → 1, min-jerk), release (the swing foot TOUCHING ≥ 0.5 s, from t ≥ 7 s; time-out 9 s) — then the step command to the sequencer (nominal
//     0.10 m forward / 0.08 m outward from the anchor, seed swing 0.60 s, apex 25 mm at α 0.5; S-LOW apex 8 mm; S-LATE foothold 10 mm above the turf); after the
//     sequencer's DONE (tA): 3 s, pelvis back over 2 s, 2 s quiet (end tA + 7). S-P: thorax 5 N·s / 100 ms, lateral toward the swing side or forward, at
//     {50 ms before the swing command, 50 % / 80 % of the planned swing, the first tick after measured contact, 50 ms after LOAD_ACCEPT}.
//   protocol "p15" (R-B recovery obligations, R-A regression): the frozen E1b protocol of tools/e1b_run.mjs (20 mm lift 0.6 s, hover 1.5 s, replace 0.6 s; P15 = thorax
//     15 N·s toward the lifted side at the hover mid-point) — identical code path; with PSTAR5 the supervisor's class rule hands class B to the common planner.
import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def } from "./v2_g3.js"; import { e2seqOf } from "../ctrl/v2_step.js"; import { setAnkleNeutralKOverride } from "../spec/v2_joints.js";
export const CFG = { PSTAR: { ffLockedAxis: true, touchRest: true, lcVff: "lin", lcTouch: { reseed: true } } };
CFG.PSTAR4 = { ...CFG.PSTAR, footYaw: true, lcPutDown: true, abortCapture: 2 }; CFG.PSTAR5 = { ...CFG.PSTAR4, e2: true };
export const E2P = { fwd: { dx: 0.10, dy: 0 }, lat: { dx: 0, dy: 0.08 }, T: 0.60, apex: 0.025, apexLow: 0.008, lateDz: 0.010, pushJ: 5, pushDur: 0.1, LT: 0.6, HOV: 1.5, RT: 0.6, GRACE: 0.3, LIFT: 0.02 };
const mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); };
const seg = (t, a, T, v0, v1) => { const u = Math.min(1, Math.max(0, (t - a) / T)), dv = v1 - v0; return [v0 + dv * u * u * u * (10 - 15 * u + 6 * u * u), t > a && t < a + T ? dv * 30 * u * u * (1 - u) * (1 - u) / T : 0, t > a && t < a + T ? dv * 60 * u * (1 - u) * (1 - 2 * u) / (T * T) : 0]; };
// the E1a configuration's ankle neutral stiffness 0.13 N·m/° is baked into the spec at generation: set explicitly (= the Node env value; the browser has no env)
export const e2Spec = (human) => { setAnkleNeutralKOverride(0.13); return generateSpec(VARIATION_SET.find(h => h.id === human)); };
// run: { protocol: "step" | "p15", human, side: "L" | "R" (the swing / lifted foot), kind: "forward" | "lateral", hz, variant: null | "low" | "late",
//        pert: null | { dir: "lat" | "fwd", when: "pre" | "s50" | "s80" | "contact" | "la50" } (step) | "none" | "P15" (p15), config: "PSTAR5" (default) | "PSTAR4", nominal: { dx, dy } (smoke only) }
export function e2Sim(J, spec, run) { const nL = run.side === "L" ? 0 : 1, nS = 1 - nL, hz = run.hz || 240, config = run.config || "PSTAR5", P15 = run.protocol === "p15";
  if (typeof process !== "undefined" && process.env && (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13")) throw new Error("E1a configuration: V2_KNEE_MODEL=v2k and V2_ANKLE_NEUTRAL_K=0.13 are required");
  const H = { tL: null, tR: null, tA: null, tEnd: null, unloadTimeout: false, touchT0: null, anchor: null, cleared: null, clearReason: null, abortT: null, abortBeforeLift: false, airborneSeen: false, pertT: null, pert: null, tLA: null, timeout: false };
  const pd = { t0: 1, dur: 2, dz: 0.025 }, base = g3Def(nS === 1 ? "U:R" : "U:L");
  // stance-foot share σ(t) (the G3 request convention; λ_R = σ for a right stance): E1b's transfer; p15 keeps E1b's return; step: 0.5 once the sequencer is done
  // step protocol after the command (read from the sequencer itself, same tick): DONE → 0.5; NO_CERTIFIED at the decision (step not executed) → back to double support by
  // E1b's 4 s min-jerk return (the best-effort fallback); otherwise the stance share 1 (the sequencer supplies the request while active)
  const sig = (t) => { if (t <= 3) return [0.5, 0, 0]; if (t < 7) return seg(t, 3, 4, 0.5, 1.0); if (P15) { if (H.tR == null || t < H.tR + 0.2) return [1.0, 0, 0]; return seg(t, H.tR + 0.2, 4, 1.0, 0.5); }
    if (seq && seq.ph === "DONE") return [0.5, 0, 0]; if (seq && seq.ph === "NOCERT" && seq.ncT != null) return seg(t, seq.ncT, 4, 1.0, 0.5); return [1.0, 0, 0]; };
  const lamFn = (t) => lamFn.d(t)[0]; lamFn.d = (t) => { const [v, d1, d2] = sig(t); return nS === 1 ? [v, d1, d2] : [1 - v, -d1, -d2]; };
  if (!P15 && config === "PSTAR5") lamFn.e2 = (t, ctrl) => { const sq = ctrl.e2seq && ctrl.e2seq.active() && !ctrl.e2seq.rec ? ctrl.e2seq.request(t) : null; if (sq) return sq; const [lam, dl, ddl] = lamFn.d(t); return { lam, dl, ddl }; };
  const def = { ...base, key: `E2:${run.protocol}:${run.side}`, title: `E2 ${run.protocol} ${run.kind || ""} ${run.side}`, lam: lamFn, supervise: config === "PSTAR5" ? { e2: { pushEnd: () => (H.pertT != null && H.pertDur != null ? H.pertT + H.pertDur : null) } } : {}, holds: [], seconds: 40, push: null, torque: null };
  const s = new G3Sim(J, spec, def, { stand: { ikRefTwist: true, lifecycle: true, pelvisDrop: pd, ...CFG[config] }, passiveOpts: { kneeModel: "v2k" }, ...(hz !== 240 ? { cfg: { hz } } : {}) });
  const C = s.ctrl, dt = s.dt, seq = config === "PSTAR5" ? e2seqOf(C) : null, CONTACT = ["TOUCHDOWN", "TOUCHING", "LOAD_ACCEPT", "SUPPORT", "UNLOADING"];
  const push = (t0, J) => { H.pertT = t0; H.pertDur = E2P.pushDur; H.pert = { t0, J }; s.base.push = { t0, dur: E2P.pushDur, J, body: "thorax" }; };
  const towardSwing = nL === 0 ? -1 : 1, pJ = run.pert && typeof run.pert === "object" ? (run.pert.dir === "lat" ? [E2P.pushJ * towardSwing, 0, 0] : [0, 0, E2P.pushJ]) : null;
  const setTimeline = (tR) => { H.tR = tR; H.tA = tR + 4.2; H.tEnd = H.tA + 7; };
  // the E1b perturbations (tools/e1b_run.mjs schedulePert, identical): thorax 5 N·s PF / PB / PL / PR, P15 = 15 N·s toward the lifted side, YAW / YAWN = pelvis 0.5 N·m·s
  function schedulePert(t0) { const P = run.pert; if (!P || P === "none") return; const dirs = { PF: [0, 0, 5], PB: [0, 0, -5], PL: [-5, 0, 0], PR: [5, 0, 0], P15: [15 * towardSwing, 0, 0] };
    if (dirs[P]) push(t0, dirs[P]); else if (P === "YAW" || P === "YAWN") { H.pertT = t0; H.pertDur = 0.1; H.pert = { t0, H: P }; s.base.torque = { t0, dur: 0.1, H: [0, P === "YAW" ? 0.5 : -0.5, 0], body: "pelvis" }; } else throw new Error("pert " + P); }
  // ── p15: the frozen E1b protocol (tools/e1b_run.mjs protocol(), identical statements) ──
  function protocolP15(tc) { const lc = C.lc, f = lc.feet[nL], g = C.g3, aborted = !!(g && g.aborted != null);
    if (aborted && H.abortT == null) H.abortT = g.aborted;
    if (f.state === "AIRBORNE") H.airborneSeen = true;
    if (H.tA != null) { const tb = H.tA + 3; pd.dz = tc < tb ? 0.025 : 0.025 * (1 - mj((tc - tb) / 2)); }
    if (H.tL == null && H.tR == null) {
      if (f.state === "TOUCHING") { if (H.touchT0 == null) H.touchT0 = tc; } else H.touchT0 = null;
      if (aborted) { H.abortBeforeLift = true; setTimeline(tc); }
      else if (tc >= 7 - 1e-9 && H.touchT0 != null && tc - H.touchT0 >= 0.5 - 1e-9) { H.tL = tc; const a = lc.target(nL); H.anchor = { pos: a.pos.slice(), rot: a.rot.slice() }; schedulePert(tc + E2P.LT + E2P.HOV / 2); }
      else if (tc >= 9 - 1e-9) { H.unloadTimeout = true; setTimeline(9); } }
    if (H.tL != null && H.cleared == null) { const u = tc - H.tL;
      if (aborted) { H.cleared = tc; H.clearReason = "abort (supervisor put-down: capture-timed quintic to the anchor)"; if (H.tR == null) setTimeline(tc); return; }
      const UR = E2P.LT + E2P.HOV + E2P.RT; if (u >= UR - 1e-9 && H.tR == null) setTimeline(H.tL + UR);
      if (u >= UR - 1e-9 && (CONTACT.includes(f.state) || u >= UR + E2P.GRACE - 1e-9)) { lc.setSwingTarget(nL, null); H.cleared = tc; H.clearReason = CONTACT.includes(f.state) ? `contact state ${f.state}` : "grace 0.3 s expired"; return; }
      const h = u < E2P.LT ? E2P.LIFT * mj(u / E2P.LT) : u < E2P.LT + E2P.HOV ? E2P.LIFT : u < UR ? E2P.LIFT * (1 - mj((u - E2P.LT - E2P.HOV) / E2P.RT)) : 0, A = H.anchor;
      lc.setSwingTarget(nL, { pos: [A.pos[0], A.pos[1] + h, A.pos[2]], rot: A.rot }); H.cmd = { tc, h }; } }
  // ── step: the E1b timeline to the swing command, then the sequencer ──
  function protocolStep(tc) { const lc = C.lc, f = lc.feet[nL], g = C.g3, aborted = !!(g && g.aborted != null), when = run.pert && run.pert.when;
    if (aborted && H.abortT == null) H.abortT = g.aborted;
    if (f.state === "AIRBORNE") H.airborneSeen = true;
    if (H.tA != null) { const tb = H.tA + 3; pd.dz = tc < tb ? 0.025 : 0.025 * (1 - mj((tc - tb) / 2)); }
    if (H.tL == null) { if (H.unloadTimeout || H.abortBeforeLift) return;
      if (f.state === "TOUCHING") { if (H.touchT0 == null) H.touchT0 = tc; } else H.touchT0 = null;
      if (aborted) { H.abortBeforeLift = true; H.tA = tc; H.tEnd = tc + 7; return; }
      if (when === "pre" && H.pertT == null && H.touchT0 != null && tc >= Math.max(7, H.touchT0 + 0.5) - 0.05 - 1e-9) push(tc, pJ);   // 50 ms before the (predicted) swing command
      if (tc >= 7 - 1e-9 && H.touchT0 != null && tc - H.touchT0 >= 0.5 - 1e-9) { H.tL = tc; const a = lc.target(nL); H.anchor = { pos: a.pos.slice(), rot: a.rot.slice() };
        // run.nominal: SMOKE / development runs only (non-test steps, e2/E2_IMPLEMENTATION.md §6)
        const nom = run.nominal || (run.kind === "lateral" ? E2P.lat : E2P.fwd); seq.command(tc, { n: nL, kind: run.kind, nominal: { dx: nom.dx, dy: nom.dy, dz: run.variant === "late" ? E2P.lateDz : 0 }, T: E2P.T, apex: run.variant === "low" ? E2P.apexLow : E2P.apex, ...(run.diag && run.diag.noClearance ? { diagNoClearance: true } : {}) });
        if (when === "s50" || when === "s80") push(tc + (when === "s50" ? 0.5 : 0.8) * E2P.T, pJ); }
      else if (tc >= 9 - 1e-9) { H.unloadTimeout = true; H.tA = 9; H.tEnd = 16; }
      return; }
    if (when === "contact" && H.pertT == null && seq.tTDm != null) push(tc, pJ);   // the first tick after measured contact (sequencer's measured-contact time)
    if (f.state === "LOAD_ACCEPT" && H.tLA == null) { H.tLA = tc; if (when === "la50" && H.pertT == null) push(tc + 0.05, pJ); }
    if (H.tA == null) { if (seq.ph === "DONE") { H.tA = seq.doneT; H.tEnd = H.tA + 7; } else if (["NOCERT", "ABORTED"].includes(seq.ph)) { H.tA = tc; H.tEnd = tc + 11.2; } else if (tc > H.tL + 15) { H.timeout = true; H.tA = tc; H.tEnd = tc + 7; } } }
  const protocol = P15 ? protocolP15 : protocolStep, oc = C.compute.bind(C); C.compute = (st, ev, dtt) => { protocol(C.n * dtt); return oc(st, ev, dtt); };   // the protocol runs causally at each controller tick
  return { s, H, nL, nS, pd, protocol, seq, config, dt, P15 }; }

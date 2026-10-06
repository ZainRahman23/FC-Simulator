// ═══ physchar2/tools/swing_servo_val.mjs — independent SWING-SERVO validation (e2/SWING_SERVO_VALIDATION_PREREG.md; D1 acceleration feed-forward). One run = one body, leg, rate,
// configuration (VAL-OFF = PSTAR5B, VAL-ON = PSTAR5C = + swingAccFF) and sequence (A: L1 R1 H1 H2; B: L2 R2 H3 H4 H5) on the UNLOADED swing foot: the E1b pre-lift timeline
// (settle, 25 mm pelvis drop, 4 s transfer, release TOUCHING ≥ 0.5 s), then the E1b lift reference until the measured AIRBORNE, then the trajectories (E2 swing construction,
// ctrl/v2_swing.js stepSegment; the first from the MEASURED foot state with the re-anchoring rule, the rest from the reference state), 0.5 s hold after each, then E1b's
// replace and the return to double support. Trajectories are never altered for tracking error. Commands go only through the swing target (+ its analytic reference); Jolt decides.
// usage: V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/swing_servo_val.mjs --human=V2-REF --side=L --hz=240 --ff=on|off --seq=A|B --out=<file.json.gz>
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { e2Spec, CFG } from "../gates/v2_e2.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { V, Q } from "../core/v2_math.js";
import { stepSegment, stepAt, stepRef, qlog } from "../ctrl/v2_swing.js"; import { IK } from "../ctrl/v2_stand.js"; import { liftRef, stepFrame } from "../ctrl/v2_footstep.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const HUMAN = arg("human", "V2-REF"), SIDE = arg("side", "L"), HZ = +arg("hz", 240), FF = arg("ff", "on"), SEQ = arg("seq", "A"), OUT = arg("out", "");
// --vff=undamped: COUNTERFACTUAL diagnostic only (lcVff investigation, sources/2026-10-06_user_decision_lcvff_diagnostic.md) — the velocity feed-forward's one-step IK rate with the
// solver's terminal damping IK.muMin (harness wrapper of legIKRate). Not part of the preregistered battery (default "lin")
// --vff=sr: the CORRECTED rate (vffRate "sr", configurations PSTAR5BS / PSTAR5CS; e2/VFF_RATE_CORRECTION.md) — a controller option, not a harness wrapper
const VFF = arg("vff", "lin"); if (!["lin", "undamped", "sr"].includes(VFF)) throw new Error("vff");
if (!["L", "R"].includes(SIDE) || !["on", "off"].includes(FF) || !["A", "B"].includes(SEQ)) throw new Error("args");
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("E1a configuration env required");
const nL = SIDE === "L" ? 0 : 1, nS = 1 - nL, CONFIG = (FF === "on" ? "PSTAR5C" : "PSTAR5B") + (VFF === "sr" ? "S" : ""), HOV = 0.020, HOLD = 0.5;
// trajectory list (prereg §1): goal offsets in the stance frame (forward f, outward o) at hover height, T, apex above the higher end (null = no knot)
const TR = { L1: { dx: 0.10, dy: 0, T: 0.60, apex: 0.025, start: "liftoff" }, R1: { dx: 0, dy: 0, T: 0.60, apex: 0.025 }, L2: { dx: 0, dy: 0.08, T: 0.60, apex: 0.025, start: "liftoff" }, R2: { dx: 0, dy: 0, T: 0.60, apex: 0.025 },
  H1: { dx: 0.10, dy: 0, T: 0.40, apex: 0.025, back: true }, H2: { dx: 0.15, dy: 0, T: 0.50, apex: 0.025, back: true }, H3: { dx: 0.10, dy: 0, T: 0.60, apex: 0.040, back: true },
  H4: { dx: 0.10, dy: 0.08, T: 0.45, apex: 0.025, back: true }, H5: { dx: 0, dy: 0.044, T: 0.21, apex: null, back: true } };
const list = (SEQ === "A" ? ["L1", "R1", "H1", "H2"] : ["L2", "R2", "H3", "H4", "H5"]).flatMap(id => (TR[id].back ? [{ id, ...TR[id] }, { id: id + "r", ...TR[id], dx: 0, dy: 0, back: false }] : [{ id, ...TR[id] }]));
const mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); };
const seg4 = (t, a, T, v0, v1) => { const u = Math.min(1, Math.max(0, (t - a) / T)), dv = v1 - v0; return [v0 + dv * mj(u), t > a && t < a + T ? dv * 30 * u * u * (1 - u) * (1 - u) / T : 0, t > a && t < a + T ? dv * 60 * u * (1 - u) * (1 - 2 * u) / (T * T) : 0]; };
const H = { tCmd: null, touchT0: null, tLo: null, k: -1, segT0: null, sg: null, holdUntil: null, putT0: null, cleared: null, tRet: null, tEnd: null, abortT: null, A: null, fr: null, done: false };
const sig = (t) => { if (t <= 3) return [0.5, 0, 0]; if (t < 7) return seg4(t, 3, 4, 0.5, 1.0); if (H.tRet == null) return [1.0, 0, 0]; return seg4(t, H.tRet, 4, 1.0, 0.5); };
const lamFn = (t) => lamFn.d(t)[0]; lamFn.d = (t) => { const [v, d1, d2] = sig(t); return nS === 1 ? [v, d1, d2] : [1 - v, -d1, -d2]; };
const spec = e2Spec(HUMAN), pd = { t0: 1, dur: 2, dz: 0.025 }, def = { ...g3Def(nS === 1 ? "U:R" : "U:L"), key: "SERVO", title: "swing servo validation", lam: lamFn, supervise: {}, holds: [], seconds: 60, push: null, torque: null };
const s = new G3Sim(J, spec, def, { stand: { ikRefTwist: true, lifecycle: true, pelvisDrop: pd, ...CFG[CONFIG] }, passiveOpts: { kneeModel: "v2k" }, ...(HZ !== 240 ? { cfg: { hz: HZ } } : {}) });
const C = s.ctrl, dt = s.dt; if (!!C.o.swingAccFF !== (FF === "on") || C.o.e2 !== 2 || (C.o.vffRate === "sr") !== (VFF === "sr")) throw new Error("configuration");
if (VFF === "undamped") { const orate = C.legIKRate.bind(C); C.legIKRate = (st, ev, n, pP, qP, fp, sol, now, mu) => orate(st, ev, n, pP, qP, fp, sol, now, IK.muMin); }
const setT = (e) => { C.lc.setSwingTarget(nL, { pos: e.pos, rot: e.rot }); if (!C.swingRef) C.swingRef = [null, null]; C.swingRef[nL] = { vel: e.vel.slice(), acc: e.acc.slice(), w: (e.w || [0, 0, 0]).slice(), al: (e.al || [0, 0, 0]).slice() }; H.ref = e; };
const goalOf = (tr) => ({ pos: [H.A.pos[0] + H.fr.f[0] * tr.dx + H.fr.o[0] * tr.dy, H.A.pos[1] + HOV, H.A.pos[2] + H.fr.f[2] * tr.dx + H.fr.o[2] * tr.dy], rot: H.A.rot.slice() });
function startSeg(t, ref) { const tr = list[H.k], goal = goalOf(tr), zEnd = H.A.pos[1] + HOV; H.sg = stepSegment(ref, goal, tr.T, tr.apex == null ? null : { z: zEnd + tr.apex, tk: 0.5 * tr.T }); H.segT0 = t; H.holdUntil = null; H.cur = tr; }
const oc = C.compute.bind(C);
C.compute = (st, ev, dtt) => { const tc = C.n * dtt, lc = C.lc, f = lc.feet[nL], g = C.g3;
  if (g && g.aborted != null && H.abortT == null) { H.abortT = g.aborted; H.tEnd = tc + 6; }
  if (H.abortT == null && !H.done) {
    if (H.tCmd == null) { if (f.state === "TOUCHING") { if (H.touchT0 == null) H.touchT0 = tc; } else H.touchT0 = null;
      if (tc >= 7 - 1e-9 && H.touchT0 != null && tc - H.touchT0 >= 0.5 - 1e-9) { H.tCmd = tc; const a = lc.target(nL); H.A = { pos: a.pos.slice(), rot: a.rot.slice() }; H.fr = stepFrame(C, st, nL); } }
    if (H.tCmd != null && H.tLo == null) { const L = liftRef(H.A, tc - H.tCmd);
      if (f.state === "AIRBORNE") { const b = st[C.feet[nL]], ref = { p: b.pos.slice(), v: V.add(b.v, V.cross(b.w, V.sub(b.pos, b.com))), a: L.a.slice(), th: qlog(Q.mul(Q.conj(H.A.rot), b.rot)), w: Q.rot(Q.conj(H.A.rot), b.w), al: [0, 0, 0] };
        H.tLo = tc; H.k = 0; startSeg(tc, ref); C.e2reanchor = nL; }   // the B1 start: the measured foot state, the re-capture not differentiated
      else if (tc - H.tCmd > 0.6) { H.done = true; H.noLift = true; } else setT({ pos: L.p, rot: H.A.rot, vel: L.v, acc: L.a }); }
    if (H.sg) { const u = tc - H.segT0, e = stepAt(H.sg, u);
      if (u >= H.sg.T - 1e-9 && H.holdUntil == null) H.holdUntil = H.segT0 + H.sg.T + HOLD;
      if (H.holdUntil != null && tc >= H.holdUntil - 1e-9) { const ref = stepRef(H.sg, H.sg.T); H.k++; if (H.k < list.length) { startSeg(tc, ref); setT(stepAt(H.sg, 0)); } else { H.sg = null; H.putT0 = tc; H.putFrom = ref; H.putSg = stepSegment(ref, H.A, 0.6, null); } }
      else setT(e); }
    if (H.putSg) { const u = tc - H.putT0, e = stepAt(H.putSg, u), contact = ["TOUCHDOWN", "TOUCHING", "LOAD_ACCEPT", "SUPPORT", "UNLOADING"].includes(f.state);
      if (u >= 0.6 - 1e-9 && (contact || u >= 0.9)) { lc.setSwingTarget(nL, null); H.putSg = null; H.cleared = tc; H.tRet = tc + 0.2; H.tEnd = H.tRet + 4 + 3; H.done = true; } else setT(e); } }
  const cmd = oc(st, ev, dtt); s._cmd = cmd; return cmd; };
// ── run + telemetry (rows inside trajectory windows ±0.1 s and holds; whole-run integrity counters) ──
const B = spec.bodies, FT = C.feet, solePts = FT.map(fi => B[fi].shapes.filter(h => h.type === "hull").flatMap(h => h.points.map(p => V.add(p, h.pos))));
const lowAt = (n, pos, rot) => Math.min(...solePts[n].map(p => pos[1] + Q.rot(rot, p)[1])) * 1000, tilt = (q) => Math.acos(Math.min(1, Q.rot(q, [0, 1, 0])[1])) * 180 / Math.PI, yawOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]) * 180 / Math.PI; };
const legAxes = new Set(); C.legK[nL].forEach(k => [0, 1, 2].forEach(i => legAxes.add(k * 3 + i)));
const rows = [], hashes = {}; let prevTau = null, prevCmd = null, dC = 0, prevE = null, prevW = null, prevV = null, closMax = -Infinity, closPos = 0, touchDuring = 0, stance0 = null, stanceMax = 0, onsetIdx = [];
const segLog = []; let lastK = -2;
while (true) { const st0 = s.st; if (!s.tick()) break; const t = s.n * dt, st = s.st, se = C.sense, c = s._cmd;
  const tau = {}, sat = new Set(), frac = {}; for (const r of s.actRes || []) { tau[r.k * 3 + r.i] = r.tau; if (r.sat) sat.add(r.k * 3 + r.i); frac[r.k * 3 + r.i] = r.frac; }
  let dT = 0; if (prevTau) for (const key in tau) dT = Math.max(dT, Math.abs(tau[key] - (prevTau[key] ?? tau[key]))); prevTau = tau;
  dC = 0; if (prevCmd && c) c.forEach((ax, k) => ax && ax.forEach((r, i) => { const p = prevCmd[k] && prevCmd[k][i]; if (r && p) dC = Math.max(dC, Math.abs(r.tau0 - p.tau0)); })); prevCmd = c;
  const L = s.ledger, E = s.last.E, W = L.Wact + L.Wext - L.damping, dCl = prevE == null ? 0 : (E - prevE) - (W - prevW); prevE = E; prevW = W; closMax = Math.max(closMax, dCl); closPos += Math.max(0, dCl);
  const b = st[FT[nL]], vO = V.add(b.v, V.cross(b.w, V.sub(b.pos, b.com))), aO = prevV ? V.sc(V.sub(vO, prevV), 1 / dt) : [0, 0, 0]; prevV = vO;
  if (!stance0 && H.tCmd != null) stance0 = st[FT[nS]].pos.slice(); if (stance0) stanceMax = Math.max(stanceMax, Math.hypot(st[FT[nS]].pos[0] - stance0[0], st[FT[nS]].pos[2] - stance0[2]) * 1000);
  const inTraj = H.tLo != null && !H.done && H.abortT == null && (H.sg || H.holdUntil != null); if (H.tLo != null && H.putSg == null && !H.done && se.touch[nL] > 0) touchDuring++;
  if (H.k !== lastK) { lastK = H.k; }
  if (H.tLo != null && H.k >= 0 && H.k < list.length && H.abortT == null && H.ref && H.sg) { const u = t - H.segT0, tr = H.cur, e = H.ref;
    rows.push({ t: +t.toFixed(6), k: H.k, id: tr.id, u: +u.toFixed(6), T: tr.T, ref: { p: e.pos, v: e.vel, a: e.acc, rot: e.rot }, foot: { p: b.pos.slice(), v: vO, a: aO, rot: b.rot.slice() }, low: lowAt(nL, b.pos, b.rot), lowRef: lowAt(nL, e.pos, e.rot),
      tiltErr: tilt(Q.mul(Q.conj(e.rot), b.rot)), yawErr: (() => { let d = yawOf(b.rot) - yawOf(e.rot); while (d > 180) d -= 360; while (d < -180) d += 360; return d; })(), touch: se.touch[nL], st: C.lc.feet[nL].state, a: C.lc.feet[nL].a,
      legTau: [...legAxes].map(k => [k, tau[k] ?? 0, frac[k] ?? 0]), sat: [...sat].filter(k => legAxes.has(k)), dTau: dT, dTau0: dC, closInc: dCl, ff: C.info.accFF && C.info.accFF[nL] ? 1 : 0 }); }
  if (s.n % 240 === 0) hashes[String(Math.round(t))] = (s.h >>> 0).toString(16).padStart(8, "0");
  if (H.tEnd != null && t >= H.tEnd - 1e-9) break; if (t > 60) break; }
hashes.end = (s.h >>> 0).toString(16).padStart(8, "0");
const g = s.g3summary(), actAxes = []; s.act.led.forEach((row, k) => row.forEach((x, i) => { if (x && x.n) actAxes.push({ axis: spec.joints[k].name + "." + "xyz"[i], k, i, overCap: x.overCap, satTicks: x.satTicks, peakNm: x.peakNm, peakFrac: x.peakFrac }); }));
const out = { generated: "tools/swing_servo_val.mjs", prereg: "e2/SWING_SERVO_VALIDATION_PREREG.md", human: HUMAN, side: SIDE, swing: nL, hz: HZ, ff: FF, config: CONFIG, seq: SEQ, vff: VFF, list, events: { tCmd: H.tCmd, tLo: H.tLo, abortT: H.abortT, cleared: H.cleared, noLift: !!H.noLift, segments: H.k },
  integrity: { closMax, closPos, touchDuringTraj: touchDuring, stanceSlipMm: stanceMax, ledger: g.ledger, authorityWrites: g.ledger.authorityWrites }, actAxes: actAxes.filter(a => legAxes.has(a.k * 3 + a.i)), overCapAll: actAxes.reduce((s2, a) => s2 + a.overCap, 0),
  wn: 2 * Math.PI * C.lc.o.swingHz, outcome: g.outcome, hashes, rows };
s.destroy(); if (OUT) fs.writeFileSync(OUT, zlib.gzipSync(JSON.stringify(out)));
console.log(`servo ${HUMAN} ${SIDE} ${HZ} Hz FF ${FF} seq ${SEQ}: liftoff ${H.tLo != null ? (H.tLo - H.tCmd).toFixed(3) + " s" : "NONE"}; segments ${Math.min(H.k, list.length)}/${list.length}; abort ${H.abortT ?? "none"}; outcome ${g.outcome}; touch during ${touchDuring}; closMax ${closMax.toExponential(2)}; hash ${hashes.end}`);

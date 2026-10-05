// ═══ physchar2/tools/e1a_unload_trace.mjs — DIAGNOSTIC causal trace of the E1a unload blocker (sources/2026-10-05_user_instruction_e1a_unload_causal_investigation.md).
// NOT E1a, no lift, nothing adopted. The E1a pre-lift protocol (settle; pelvis drop t0 1 s, 2 s; stance share 0.5 → 1.0 over 3–7 s, supervised)
// on the to-be-lifted LEFT foot, run to --tEnd. Per tick from --tLog: requested / commanded shares, measured loads and CoPs, the balance terms,
// pelvis target vs actual (height, roll, pitch, yaw), and for every LEFT- and RIGHT-leg actuated row: feed-forward split into its gravity /
// d'Alembert part and its foot-force part, the posture PD part (τ0 − ff = K·e), K, D, the applied torque; the passive torques; the left foot's
// contact depth / touching pieces. At chosen ticks, the vertical foot force each left-leg torque term would carry with the pelvis held
// (virtual work through the controller's own leg-chain Jacobian).
// Counterfactuals (diagnostic only, ONE at a time, from --tAbl):
//   --norelease        lifecycle release suppressed (loadOff → −1): the foot stays in SUPPORT, so the support-state residual is measurable at any drop
//   --abl=pdHip        left hip posture PD removed (τ0 = ff on the 3 hip rows)        --abl=pdKnee   left knee posture PD removed (flexion + axial)
//   --abl=pdKneeAx     left knee AXIAL posture PD removed                              --abl=pdAll    left hip + knee posture PD removed
//   --abl=ffGrav       left-leg gravity / d'Alembert feed-forward removed              --abl=ffAnk    left ankle feed-forward removed
//   --abl=ikPelH       left-leg IK solved from the ACTUAL pelvis height (instead of the posture target height)
//   --abl=ikPelR       left-leg IK solved from the ACTUAL pelvis orientation           --abl=ikPelHR  both (the actual pelvis pose)
//   --abl=ikTwCur      left-leg IK with the knee axial at its CURRENT value (the "current" twist semantics, left leg only)
//   --abl=pdRight      (coupling) right (stance) leg posture PD removed — expected to fall; reported only as coupling evidence
//   --abl=ffKneeTw     BOTH knees' flexion feed-forward given the locked-axis twist term (diagnostic test of the root-cause hypothesis): with the knee
//                      twisted by t (constraint space), the flexion swing DOF moves about (0, cos t, −sin t) in body-2 axes (sim/v2_passive.js, the G1
//                      locked-axis fix), the varus axis is locked and has no actuator, so the flexion row must carry T·ŷ − tan t·(T·ẑ); the
//                      controller's feed-forward projects T·ŷ only. This adds −tan t·(T·ẑ) to the knee flexion row (T = the controller's own statics torque)
// usage: node tools/e1a_unload_trace.mjs [--human=V2-REF] [--drop=0.025] [--knee=v2k|old] [--k=0.13] [--ref=1] [--norelease] [--abl=…] [--tAbl=7] [--tEnd=9] [--tLog=5.5] [--out=<json>]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { setAnkleNeutralKOverride, ankleNeutralKPerDeg, decompose, pyr } from "../spec/v2_joints.js";
import { V, Q, datan2 } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const HUMAN = arg("human", "V2-REF"), DROP = +arg("drop", 0.025), KNEE = arg("knee", "v2k"), K = +arg("k", 0.13), REF = arg("ref", "1") === "1", NOREL = process.argv.includes("--norelease"), ABL = arg("abl", ""), T_ABL = +arg("tAbl", 7), T_END = +arg("tEnd", 9), T_LOG = +arg("tLog", 5.5), OUT = arg("out", ""), D = 180 / Math.PI, G = 9.81;
setAnkleNeutralKOverride(K);
const seg = (t, a, T, v0, v1) => { const u = Math.min(1, Math.max(0, (t - a) / T)), dv = v1 - v0; return [v0 + dv * u * u * u * (10 - 15 * u + 6 * u * u), t > a && t < a + T ? dv * 30 * u * u * (1 - u) * (1 - u) / T : 0, t > a && t < a + T ? dv * 60 * u * (1 - u) * (1 - 2 * u) / (T * T) : 0]; };
const lam = (t) => lam.d(t)[0]; lam.d = (t) => (t <= 3 ? [0.5, 0, 0] : seg(t, 3, 4, 0.5, 1.0));
const spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN)), def = { ...g3Def("U:R"), key: "E1a-unload-trace", lam, supervise: {}, holds: [], seconds: T_END + 0.01, push: null, torque: null };
const s = new G3Sim(J, spec, def, { stand: { ...(REF ? { ikRefTwist: true } : {}), lifecycle: NOREL ? { loadOff: -1 } : true, pelvisDrop: { t0: 1, dur: 2, dz: DROP } }, passiveOpts: { kneeModel: KNEE === "v2k" ? "v2k" : null } });
if ((KNEE === "v2k") !== s.P.kneeIsV2K || ankleNeutralKPerDeg() !== K) throw new Error("configuration");
const C = s.ctrl, B = spec.bodies, JI = (n) => spec.joints.findIndex(j => j.name === n), LEGS = [["hip_L", "knee_L", "ankle_L"].map(JI), ["hip_R", "knee_R", "ankle_R"].map(JI)], pel = B.findIndex(b => b.name === "pelvis"), fL = B.findIndex(b => b.name === "foot_L"), W = C.M * G;
const KEYS = ["x", "y", "z"], rowName = (k, i) => spec.joints[k].name + "." + (spec.joints[k].def.axes[KEYS[i]] ? spec.joints[k].def.axes[KEYS[i]].key : KEYS[i]);
// the controller's posture-PD error for joint k toward target quaternion qr (its own formula)
const pdErr = (q, qr) => { const sg = q[0] * qr[0] + q[1] * qr[1] + q[2] * qr[2] + q[3] * qr[3] < 0 ? -1 : 1, dq = Q.mul(Q.conj(q), qr.map(x => x * sg)); return [2 * dq[0], 2 * dq[1], 2 * dq[2]]; };
const unit = (q) => { const l = Math.hypot(...q); return q.map(x => x / l); };
// feed-forward split for joint k: gravity / d'Alembert of the distal subtree vs the foot-force term (the controller's own expressions, recomputed)
function ffSplit(st, k, I) { const pj = C.jointAt(st, k), geff = [-I.A[0], -G, -I.A[2]]; let Tg = [0, 0, 0], Tf = [0, 0, 0];
  for (const i of C.sub[k]) Tg = V.sub(Tg, V.cross(V.sub(st[i].com, pj), V.sc(geff, B[i].mass)));
  for (const f of C.subFeet[k]) { const n = C.feet.indexOf(f), pc = [I.cop[n][0], 0, I.cop[n][1]]; Tf = V.sub(Tf, V.cross(V.sub(pc, pj), I.F[n])); }
  return { Tg, Tf }; }
// left-leg IK with a modified pelvis frame / twist, returning the hip and knee target quaternions (the controller's own legChain + LM)
function ikAlt(st, ev, pP, qP, twCur) { const save = C.o.ikRefTwist; if (twCur) C.o.ikRefTwist = false; const r = C.legIK(st, ev, 0, pP, qP, null); C.o.ikRefTwist = save; return Object.fromEntries(r.targets.map(([k, q]) => [k, q])); }
let lastPP = null;
{ const oc = C.compute.bind(C); C.compute = (st0, ev0, dt) => { const t = C.n * dt, cmd = oc(st0, ev0, dt), I = C.info; C._lastCmd = cmd;
    if (!ABL || t < T_ABL - 1e-9) return cmd;
    for (const ab of ABL.split(",")) applyAbl(ab, st0, ev0, cmd, I);
    return cmd; }; }
// one counterfactual mechanism (several may be layered with --abl=a,b — used only to test a SECOND mechanism on top of the root-cause fix)
function applyAbl(ABL, st0, ev0, cmd, I) {
    const st = st0, ev = ev0, legL = LEGS[0], legR = LEGS[1], rowsOf = (k) => cmd[s.P.jd.findIndex(d => d.k === k)];

    const zeroPD = (k, which) => { const R = rowsOf(k); R.forEach((r, i) => { if (r && (which == null || which.includes(i))) r.tau0 = r.ff; }); };
    if (ABL === "pdHip") zeroPD(legL[0]); else if (ABL === "pdKnee") zeroPD(legL[1]); else if (ABL === "pdKneeAx") zeroPD(legL[1], [0]); else if (ABL === "pdAll") { zeroPD(legL[0]); zeroPD(legL[1]); }
    else if (ABL === "pdRight") { zeroPD(legR[0]); zeroPD(legR[1]); }
    else if (ABL === "ffGrav" || ABL === "ffAnk") { for (const k of ABL === "ffAnk" ? [legL[2]] : legL) { const { Tg } = ffSplit(st, k, I), R = rowsOf(k), d = s.P.jd.find(x => x.k === k), R2F2 = Q.mul(st[d.child].rot, d.F2);
        R.forEach((r, i) => { if (!r) return; const g = V.dot(Tg, Q.rot(R2F2, [[1, 0, 0], [0, 1, 0], [0, 0, 1]][i])); r.tau0 -= g; r.ff -= g; }); } }
    else if (ABL === "ffKneeTw") { for (const k of [legL[1], legR[1]]) { const di = s.P.jd.findIndex(d => d.k === k), d = s.P.jd[di], T = I.ff[di], R2F2 = Q.mul(st[d.child].rot, d.F2), tw = decompose(ev.qs[k]).tw, add = -Math.tan(tw) * V.dot(T, Q.rot(R2F2, [0, 0, 1]));
        const R = cmd[di]; R[1].tau0 += add; R[1].ff += add; C._kneeTwAdd = C._kneeTwAdd || {}; C._kneeTwAdd[spec.joints[k].name] = { twDeg: tw * D, Tz: V.dot(T, Q.rot(R2F2, [0, 0, 1])), add }; } }
    else if (["ikPelH", "ikPelR", "ikPelHR", "ikTwCur"].includes(ABL)) { const ps = st[pel], yaw = datan2(I.heading[0], I.heading[1]), qPt = Q.mul(Q.axis([0, 1, 0], yaw), C.stance.pelvisRot);
      const pP = [ps.pos[0], ABL === "ikPelH" || ABL === "ikPelHR" ? ps.pos[1] : C.pelHT, ps.pos[2]], qP = ABL === "ikPelR" || ABL === "ikPelHR" ? unit(ps.rot) : qPt, tg = ikAlt(st, ev, pP, qP, ABL === "ikTwCur");
      for (const k of [legL[0], legL[1]]) { const R = rowsOf(k), e = pdErr(ev.qs[k], tg[k]); R.forEach((r, i) => { if (r) r.tau0 = r.ff + r.K * e[i]; }); } }
    else if (ABL === "ffFootL") { for (const k of legL) { const { Tf } = ffSplit(st, k, I), R = rowsOf(k), d = s.P.jd.find(x => x.k === k), R2F2 = Q.mul(st[d.child].rot, d.F2);   // the commanded foot force of the zero-request foot removed
        R.forEach((r, i) => { if (!r) return; const g = V.dot(Tf, Q.rot(R2F2, [[1, 0, 0], [0, 1, 0], [0, 0, 1]][i])); r.tau0 -= g; r.ff -= g; }); } }
    else if (ABL === "shareCap") { const req = 1 - I.lam, sh = I.share[0], ex = sh > 1e-12 ? Math.max(0, sh - Math.max(0, req)) / sh : 0;   // commanded share of the left foot capped at its REQUESTED share (only the excess foot force removed)
      if (ex > 0) for (const k of legL) { const { Tf } = ffSplit(st, k, I), R = rowsOf(k), d = s.P.jd.find(x => x.k === k), R2F2 = Q.mul(st[d.child].rot, d.F2);
        R.forEach((r, i) => { if (!r) return; const g = ex * V.dot(Tf, Q.rot(R2F2, [[1, 0, 0], [0, 1, 0], [0, 0, 1]][i])); r.tau0 -= g; r.ff -= g; }); } }
    else if (ABL === "ikPelHw") { const req = Math.max(0, 1 - I.lam), w = Math.min(1, req / 0.05), ps = st[pel], yaw = datan2(I.heading[0], I.heading[1]), qPt = Q.mul(Q.axis([0, 1, 0], yaw), C.stance.pelvisRot);   // the left leg's IK height blended target → actual as its requested share falls below the lifecycle's wantShare (5 %)
      if (w < 1) { const pP = [ps.pos[0], ps.pos[1] + w * (C.pelHT - ps.pos[1]), ps.pos[2]], tg = ikAlt(st, ev, pP, qPt, false);
        for (const k of [legL[0], legL[1]]) { const R = rowsOf(k), e = pdErr(ev.qs[k], tg[k]); R.forEach((r, i) => { if (r) r.tau0 = r.ff + r.K * e[i]; }); } } }
    else if (ABL === "ikSame") { const ps = st[pel], yaw = datan2(I.heading[0], I.heading[1]), qPt = Q.mul(Q.axis([0, 1, 0], yaw), C.stance.pelvisRot), tg = ikAlt(st, ev, [ps.pos[0], C.pelHT, ps.pos[2]], qPt, false);   // IDENTITY check of the re-solve
      for (const k of [legL[0], legL[1]]) { const R = rowsOf(k), e = pdErr(ev.qs[k], tg[k]); R.forEach((r, i) => { if (r) { const nt = r.ff + r.K * e[i]; C._ikSameMax = Math.max(C._ikSameMax || 0, Math.abs(nt - r.tau0)); } }); } }
    else throw new Error("unknown ablation " + ABL); }
const log = [], atT = [6.5, 7.0, 8.0, 8.5, 9.0]; let snaps = [];
while (s.tick()) { const t = s.n * s.dt; if (t < T_LOG - 1e-9) continue; const st = s.st, I = C.info, cmd = C._lastCmd, pr = s.probeRows, tauA = {}; for (const r of s.actRes || []) tauA[r.k * 3 + r.i] = r.tau;
  const ps = st[pel], yaw = datan2(I.heading[0], I.heading[1]), qPt = Q.mul(Q.axis([0, 1, 0], yaw), C.stance.pelvisRot); let qe = Q.mul(Q.conj(qPt), unit(ps.rot)); if (qe[3] < 0) qe = qe.map(x => -x);
  const legRows = (leg) => leg.map(k => { const di = s.P.jd.findIndex(d => d.k === k), R = cmd[di], d = s.P.jd[di], R2F2 = Q.mul(st[d.child].rot, d.F2), { Tg, Tf } = ffSplit(st, k, I), pas = s.up.joints[di] ? s.up.joints[di].tau : [0, 0, 0];
    return { joint: spec.joints[k].name, rows: R.map((r, i) => r ? { key: rowName(k, i), ff: r.ff, ffGrav: V.dot(Tg, Q.rot(R2F2, [[1, 0, 0], [0, 1, 0], [0, 0, 1]][i])), ffFoot: V.dot(Tf, Q.rot(R2F2, [[1, 0, 0], [0, 1, 0], [0, 0, 1]][i])), pd: r.tau0 - r.ff, K: r.K, D: r.D, applied: tauA[k * 3 + i] ?? null, passive: pas[i] } : null) }; });
  const depth = (() => { let m = -Infinity, n = 0; for (const c of s.lastContacts || []) { const nm = c.a < 0 ? B[c.b] && B[c.b].name : c.b < 0 ? B[c.a] && B[c.a].name : null; if (nm === "foot_L") { m = Math.max(m, c.depth); n++; } } return { maxDepthMm: n ? m * 1000 : null, manifolds: n }; })();
  const row = { t: +t.toFixed(4), lam: I.lam, share: I.share.slice(), Fz: C.sense.Fz.slice(), Jy: pr.map(r => (r ? r.JyN : 0)), cop: pr.map(r => (r && r.cop ? [r.cop[0], r.cop[2]] : null)), copCmd: I.cop.map(c => c.slice()), Fcmd: I.F.map(f => f.slice()), p: I.p.slice(), pRaw: I.pRaw.slice(), r: I.r.slice(), xi: I.xi.slice(), xiRef: I.xiRef.slice(),
    Ldot: I.Ldot ? I.Ldot.slice() : null, lc: I.lc ? I.lc.map(x => x.state) : null, sw: I.lc ? I.lc.map(x => x.s) : null, touch: C.sense.touch.slice(), contactL: depth,
    pelvis: { targetY: C.pelHT, y: ps.pos[1], dHmm: (C.pelHT - ps.pos[1]) * 1000, errDeg: [2 * qe[0] * D, 2 * qe[1] * D, 2 * qe[2] * D] }, ikRes: I.ikRes ? I.ikRes.slice() : null, left: legRows(LEGS[0]), right: legRows(LEGS[1]) };
  log.push(row);
  // virtual-work attribution at chosen ticks: vertical foot force carried by each left-leg torque term with the pelvis held (controller's leg chain at the ACTUAL pelvis pose)
  if (atT.some(a => Math.abs(t - a) < s.dt / 2)) { const ev = s.up.ev, ch = C.legChain(st, ev, 0, ps.pos.slice(), unit(ps.rot), null), Jm = ch.jac(ch.x0);   // Jm[c][i] = ∂r_i/∂x_c, x = hip tw/sy/sz, knee sy, ankle sy/sz
    const A = [0, 1, 2, 3, 4, 5].map(i => [0, 1, 2, 3, 4, 5].map(c => Jm[c][i])), inv = invert6(A);   // ∂x/∂r = A⁻¹ ; column 1 = per unit vertical foot displacement (foot orientation fixed)
    const dxdy = inv ? inv.map(rw => rw[1]) : null, map = [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1], [2, 2]];   // x index → [leg joint, axis row]
    const terms = ["ffGrav", "ffFoot", "pd", "applied", "passive"], attr = {}; if (dxdy) for (const tm of terms) attr[tm] = map.reduce((a, [jj, ax], c) => { const rr = row.left[jj].rows[ax]; return a + (rr ? (rr[tm] || 0) * dxdy[c] : 0); }, 0);
    const per = dxdy ? map.map(([jj, ax], c) => { const rr = row.left[jj].rows[ax]; return { row: rr ? rr.key : null, dxdyRadPerM: dxdy[c], appliedN: rr ? rr.applied * dxdy[c] : null, pdN: rr ? rr.pd * dxdy[c] : null, ffGravN: rr ? rr.ffGrav * dxdy[c] : null, passiveN: rr ? rr.passive * dxdy[c] : null }; }) : null;
    const kneeTw = [LEGS[0][1], LEGS[1][1]].map(k => { const di = s.P.jd.findIndex(d => d.k === k), d = s.P.jd[di], T = I.ff[di], R2F2 = Q.mul(st[d.child].rot, d.F2), tw = decompose(ev.qs[k]).tw, Tz = V.dot(T, Q.rot(R2F2, [0, 0, 1])); return { joint: spec.joints[k].name, twDeg: tw * D, TzNm: Tz, missingFlexNm: -Math.tan(tw) * Tz, flexPdNm: row[k === LEGS[0][1] ? "left" : "right"][1].rows[1].pd }; });
    snaps.push({ t: row.t, FzL: row.Fz[0], JyL: row.Jy[0], attrN: attr, perRow: per, kneeTw }); } }
function invert6(A) { const n = 6, M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; if (Math.abs(M[p][c]) < 1e-12) return null; [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c]; for (let j = 0; j < 2 * n; j++) M[c][j] /= d; for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j]; } }
  return M.map(r => r.slice(n)); }
const tail = log.filter(x => x.t >= T_END - 0.5 - 1e-9), mean = (f) => tail.reduce((a, x) => a + f(x), 0) / tail.length;
const out = { human: HUMAN, drop: DROP, knee: KNEE, k: K, ref: REF, norelease: NOREL, abl: ABL || null, tAbl: T_ABL, W, FzL_tail: mean(x => x.Fz[0]), FzL_tail_pctBW: 100 * mean(x => x.Fz[0]) / W, lcTail: tail[tail.length - 1].lc, released: log.some(x => x.lc && x.lc[0] !== "SUPPORT"), firstRelease: (log.find(x => x.lc && x.lc[0] !== "SUPPORT") || {}).t ?? null, fell: s.g3summary().outcome, snaps, log };
if (C._ikSameMax != null) console.log("ikSame: max |Δτ0| between the controller's rows and the re-solved rows = " + C._ikSameMax.toExponential(3) + " N·m");
s.destroy(); if (OUT) fs.writeFileSync(OUT, JSON.stringify(out));
const f = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d)), last = tail[tail.length - 1], L = last.left;
console.log(`${HUMAN} drop ${(DROP * 100).toFixed(1)} cm knee ${KNEE} ref ${REF}${NOREL ? " NO-RELEASE" : ""}${ABL ? " ABL " + ABL + " from " + T_ABL + " s" : ""}: left-foot load (last 0.5 s) ${f(out.FzL_tail)} N = ${f(out.FzL_tail_pctBW, 3)} % BW; lifecycle ${last.lc.join("/")}${out.firstRelease != null ? " (released " + out.firstRelease + " s)" : ""}; outcome ${out.fell}; pelvis target − actual ${f(last.pelvis.dHmm, 2)} mm, orient err (x,y,z) ${last.pelvis.errDeg.map(v => f(v, 3)).join(", ")}°; share_L ${last.share[0].toExponential(2)}`);
for (const j of L) console.log(`   ${j.joint}: ` + j.rows.filter(Boolean).map(r => `${r.key} ff ${f(r.ff)} (grav ${f(r.ffGrav)}, foot ${f(r.ffFoot)}) pd ${f(r.pd)} K ${f(r.K, 0)} applied ${f(r.applied)} passive ${f(r.passive)}`).join(" | "));
for (const sn of snaps) console.log(`   t ${sn.t}: Fz_L ${f(sn.FzL)} N; vertical foot force carried (pelvis held, virtual work) by applied ${f(sn.attrN.applied)} N [ff-grav ${f(sn.attrN.ffGrav)}, pd ${f(sn.attrN.pd)}, ff-foot ${f(sn.attrN.ffFoot)}], passive ${f(sn.attrN.passive)} N | knees: ` + sn.kneeTw.map(k => `${k.joint} twist ${f(k.twDeg)}°, T·ẑ ${f(k.TzNm)} N·m → missing flexion ff ${f(k.missingFlexNm)} N·m (posture PD ${f(k.flexPdNm)})`).join("; "));

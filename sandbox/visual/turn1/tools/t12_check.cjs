// turn1/tools/t12_check.cjs — TURN-1.2 regression and metrics. Per scenario, TURN-1 (7b58d1a), TURN-1.1 (TURN-1 + the authored cut layer) and TURN-1.2
// (the speed-dependent reversal family + its phase body) replay the same input:
//  • FAMILY (resolver output): CURVE · TURN1_CUT · TURN1_PIVOT · BRAKE_TURN · BRAKE_SHUFFLE_TURN, with the selection's reason;
//  • IDENTITY: where TURN-1.2 keeps TURN-1's family, its movement AND pose must be bit-identical to TURN-1 (hash of the 240 Hz COM / facing log and
//    every joint);
//  • the owner's metrics (TURN-1 vs TURN-1.2): incoming speed, requested angle, visible response latency (upper body ≥ 8 cm off the unaware
//    counterfactual), first braking step, braking steps, reorganisation steps (count, feet), turn commitment (the turn plant), facing within 10° of the
//    new direction, velocity within 5°, acceleration onset (speed back above its minimum + 0.3 m/s), minimum speed, worst loaded plant slip, the largest
//    240 Hz pose residual (pelvis / any joint); DETERMINISM (TURN-1.2 twice).
// usage: node t12_check.cjs [--only id,id] [--out file.json]
const { loadTurn1 } = require("./t1_load.cjs"), X = loadTurn1(), T = X.TURN1, L11 = X.TURN11, M4 = X.M4, SCN = require("../turn1_scenarios.js"), crypto = require("crypto"), fs = require("fs");
const arg = (k) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; }, DEG = Math.PI / 180, D = 180 / Math.PI;
const DEFAULT = [];
for (const sp of ["LOW", "JOG", "RUN", "SPRINT"]) for (const a of [60, 90, 120, 150, 180]) DEFAULT.push(`${sp}_${a}R`);
DEFAULT.push("RUN_135R", "RUN_45R", "SPRINT_45R", "JOG_45R", "RUN_150L", "SPRINT_180L", "SPRINT_180L_MIRROR", "JOG_30R", "RUN_30R", "SLALOM_JOG", "SLALOM_SPRINT", "ZIGZAG_RUN", "ZIGZAG_JOG",
  "CONT_PRE_RETARGET", "CONT_PRE_ABANDON", "CONT_PRE_FLIP", "CONT_POST", "CONT_CURVE", "REV_ABORT_60", "REV_CANCEL", "REV_RETARGET", "REV_FLIP", "REV_ABORT_RUN", "RUN_STRAIGHT", "SPRINT_STRAIGHT");
const ids = arg("only") ? arg("only").split(",") : DEFAULT;
const make = (scn, body) => { const A = T.t1Make(X.skel, body === "t12" ? Object.assign({}, scn.init, { turn12: true }) : scn.init); if (body === "t11") L11.attach(A); if (body === "t12") L11.attach(A, { mode: "t12" }); return A; };
const fam = (e) => !e ? "CURVE" : e[2] === "REVERSAL" ? e[3] : e[2] === "PIVOT" ? "TURN1_PIVOT" : "TURN1_CUT";
function run(scn, body) {
  const A = make(scn, body), n = Math.round(scn.dur * 240), b = A.body, I = b.idx, h = crypto.createHash("sha256"), hz = b.heelZ + 0.012, padLoc = [0, -(b.ankleH + b.mtp[1]), X.ctx.RUN1_V13.R1_MTP.padAhead];
  const last = scn.cmds && scn.cmds.length ? scn.cmds[scn.cmds.length - 1] : null, c0 = scn.cmds && scn.cmds.length ? scn.cmds[0] : null, want = last ? (scn.heading || 0) + Math.max(-179.5, Math.min(179.5, last.turn)) * DEG : null;
  const st = { R: null, L: null }, stances = [], J = ["pelvis", "foot_R", "foot_L", "toe_R", "toe_L", "hand_R", "hand_L", "head"], hist = [], worst = {};
  let vmin = 1e9, tvmin = null, tVel = null, tFace = null, tAcc = null, sIn = null;
  for (let k = 0; k < n; k++) {
    T.t1Step(A, T.t1Input(scn, k / 240)); const r = A.log[A.log.length - 1], fk = T.t1Evaluate(A).fk, pose = A.pose;
    h.update(`${r.x.toFixed(9)},${r.y.toFixed(9)},${r.psi.toFixed(9)}|`); for (const j of fk.joint) h.update(`${j[0].toFixed(7)},${j[1].toFixed(7)},${j[2].toFixed(7)};`);
    if (c0 && sIn == null && A.t >= c0.t) sIn = r.s;
    if (c0 && A.t >= c0.t) { if (r.s < vmin) { vmin = r.s; tvmin = A.t; } if (tvmin != null && tAcc == null && r.s > vmin + 0.3) tAcc = A.t - c0.t; }
    if (last && A.t >= last.t) { if (tVel == null && r.s > 0.5 && Math.abs(T.wrapA(r.thv - want)) < 5 * DEG) tVel = A.t - c0.t; if (tFace == null && Math.abs(T.wrapA(r.psi - want)) < 10 * DEG) tFace = A.t - c0.t; }
    for (const F of ["R", "L"]) { const lg = pose.legs[F]; if (!lg.stance) continue; if (!st[F] || st[F].tTD !== A.legs[F].tTD) { st[F] = { F, tTD: A.legs[F].tTD, role: A.legs[F].role ? A.legs[F].role.kind : "RUN", s: [] }; stances.push(st[F]); }
      if (k % 2 === 0) st[F].s.push({ x: lg.s, heel: M4.transformPoint(fk.world[I["foot_" + F]], [0, -b.ankleH, hz]), pad: M4.transformPoint(fk.world[I["toe_" + F]], padLoc), beta: pose.diag.feet[F].beta, pivot: !!(A.legs[F].plant && A.legs[F].plant.pivot) }); }
    const P = {}; for (const j of J) P[j] = (j.startsWith("toe") ? fk.tip : fk.joint)[I[j]].slice(); hist.push(P);
    if (hist.length >= 3) { const a3 = hist[hist.length - 3], b3 = hist[hist.length - 2], c3 = hist[hist.length - 1]; for (const j of J) { const e = Math.hypot(c3[j][0] - 2 * b3[j][0] + a3[j][0], c3[j][1] - 2 * b3[j][1] + a3[j][1], c3[j][2] - 2 * b3[j][2] + a3[j][2]); if (!worst[j] || e > worst[j]) worst[j] = e; } }
    if (hist.length > 3) hist.shift();
  }
  const slip = stances.map(S => { let ref = null, kind0 = null, mx = 0; for (const q of S.s) { if (q.x < 0.1 || q.x > 0.9) continue; const kind = q.pivot || q.beta < -0.5 * DEG ? "pad" : "heel", p = kind === "pad" ? q.pad : q.heel; if (kind !== kind0) { ref = p; kind0 = kind; continue; } mx = Math.max(mx, Math.hypot(p[0] - ref[0], p[2] - ref[2])); } return mx * 100; });
  const ev = A.events, tc = c0 ? c0.t : 0, mans = ev.filter(e => e[1] === "maneuver"), manLast = mans[mans.length - 1] || null;
  const td = ev.filter(e => e[1] === "TD" && e[0] >= tc), brakes = td.filter(e => e[3] === "BRAKE" || e[3] === "BRAKEQ"), reorg = td.filter(e => e[3] === "REORG"), plant = td.find(e => e[3] === "PLANT");
  return { A, hash: h.digest("hex").slice(0, 16), family: fam(manLast), families: mans.map(fam), sel: A.lastSel ? A.lastSel.why : null, compact: ev.some(e => e[1] === "compact"), events: ev.filter(e => e[1] === "cancel" || e[1] === "replan" || e[1] === "compact").map(e => e[1] + "@" + e[0].toFixed(2)),
    sIn: sIn == null ? null : +sIn.toFixed(2), firstBrakeS: brakes.length ? +(brakes[0][0] - tc).toFixed(3) : null, brakeSteps: brakes.length, brakeKinds: [...new Set(brakes.map(e => e[3]))].join("+"),
    reorgSteps: reorg.length, reorgFeet: reorg.map(e => e[2]).join(""), turnPlantS: plant ? +(plant[0] - tc).toFixed(3) : null, faceS: tFace == null ? null : +tFace.toFixed(3), velS: tVel == null ? null : +tVel.toFixed(3),
    accS: tAcc == null ? null : +tAcc.toFixed(3), vMin: vmin > 1e8 ? null : +vmin.toFixed(2), slipMaxCm: +Math.max(0, ...slip).toFixed(2), pelvisMm: +((worst.pelvis || 0) * 1000).toFixed(1), jointMm: +(Math.max(...Object.values(worst)) * 1000).toFixed(1) };
}
function reaction(scn, body) {
  const c0 = scn.cmds && scn.cmds[0]; if (!c0) return null;
  const A = make(scn, body), B = make(Object.assign({}, scn, { cmds: [] }), body), nc = Object.assign({}, scn, { cmds: [] }), I = A.body.idx, js = ["head", "hand_L", "hand_R", "foreArm_L", "foreArm_R"];
  const rel = (Z) => { const fk = T.t1Evaluate(Z).fk, p = fk.joint[I.pelvis], c = Math.cos(Z.psi), s = Math.sin(Z.psi); return js.map(j => { const q = fk.joint[I[j]], d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]]; return [d[0] * c - d[2] * s, d[1], d[0] * s + d[2] * c]; }); };
  for (let k = 0; k < Math.round((c0.t + 1.2) * 240); k++) { T.t1Step(A, T.t1Input(scn, k / 240)); T.t1Step(B, T.t1Input(nc, k / 240)); if (A.t < c0.t) continue;
    const ra = rel(A), rb = rel(B); let m = 0; for (let i = 0; i < js.length; i++) m = Math.max(m, Math.hypot(ra[i][0] - rb[i][0], ra[i][1] - rb[i][1], ra[i][2] - rb[i][2])); if (m >= 0.08) return +(A.t - c0.t).toFixed(3); }
  return null;
}
const out = { note: "TURN-1.2 regression and metrics (t12_check.cjs): family per scenario, identity with TURN-1 where TURN-1 is kept, the owner's metrics, determinism", scenarios: {} };
let idOk = 0, idN = 0, nondet = 0, nCompact = 0;
const strip = (r) => { const o = Object.assign({}, r); delete o.A; delete o.hash; return o; };
for (const id of ids) {
  const scn = SCN.get(id), t1 = run(scn, "t1"), t11 = run(scn, "t11"), t12 = run(scn, "t12"), t12b = run(scn, "t12");
  // TURN-1 kept: no reversal family; the compact pivot (TURN-1's pivot without its waiting stride) is a deliberate refinement, counted apart
  const keepsT1 = !t12.families.some(f => f.startsWith("BRAKE")) && !t12.compact, identical = t1.hash === t12.hash, det = t12.hash === t12b.hash; if (!det) nondet++; if (keepsT1) { idN++; if (identical) idOk++; } if (t12.compact) nCompact++;
  const label = scn.cmds && scn.cmds.length ? { speed: scn.v, angle: scn.cmds.map(c => c.turn) } : { speed: scn.v, angle: [] };
  out.scenarios[id] = Object.assign({ label: scn.label }, label, { familyT1: t1.family, familyT12: t12.family, familiesT12: t12.families, selection: t12.sel, keepsTurn1: keepsT1, identicalToTurn1: identical, deterministic: det,
    compactPivot: t12.compact, reactionS: { t1: reaction(scn, "t1"), t11: reaction(scn, "t11"), t12: reaction(scn, "t12") }, t1: strip(t1), t12: strip(t12), t11: { family: t11.family, slipMaxCm: t11.slipMaxCm, turnPlantS: t11.turnPlantS } });
  const o = out.scenarios[id], f = (x) => x == null ? "–" : x;
  console.log(`${(keepsT1 ? (identical ? "T1=" : "T1≠") : t12.compact ? "CMP" : "NEW")} ${det ? "DET" : "NONDET"} ${id.padEnd(18)} ${t12.family.padEnd(19)} react ${f(o.reactionS.t1)}→${f(o.reactionS.t12)}  brake ${t1.brakeSteps}→${t12.brakeSteps}${t12.brakeKinds ? "(" + t12.brakeKinds + ")" : ""}  reorg ${t12.reorgSteps}${t12.reorgFeet ? "(" + t12.reorgFeet + ")" : ""}  plant ${f(t1.turnPlantS)}→${f(t12.turnPlantS)}  face ${f(t1.faceS)}→${f(t12.faceS)}  vel ${f(t1.velS)}→${f(t12.velS)}  acc ${f(t1.accS)}→${f(t12.accS)}  vmin ${f(t1.vMin)}→${f(t12.vMin)}  slip ${t1.slipMaxCm}→${t12.slipMaxCm}  pelvis ${t1.pelvisMm}→${t12.pelvisMm} joint ${t1.jointMm}→${t12.jointMm} ${t12.events.join(" ")}`);
}
out.identityKept = { identical: idOk, of: idN }; out.compactPivots = nCompact; out.nondeterministic = nondet;
if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));
console.log(`TURN-1 kept and bit-identical in ${idOk} / ${idN} · compact TURN-1 pivots ${nCompact} · ${nondet ? nondet + " NONDETERMINISTIC" : "all deterministic"}`);

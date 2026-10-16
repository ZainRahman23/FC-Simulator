// turn1/tools/t11_check.cjs — TURN-1.1 regression. Per scenario, TURN-1 (procedural body) and TURN-1.1 (authored body) are replayed on the same input:
//  • MOVEMENT FOUNDATION: a hash of everything TURN-1's mathematics decides — the 240 Hz COM state (x, y, vx, vy), pelvis facing ψ, gaze, the stance
//    plan (role, ΔV, contact / flight times), both feet's plants and swing aims, the event list — must be IDENTICAL with and without the body layer;
//  • DETERMINISM: TURN-1.1 twice → identical hashes of the joints (60 Hz) and of the layer's channels;
//  • plant-foot slip (t1_metrics' definition) and pose continuity (t1_pops' residual) for both bodies;
//  • BODY measurements around each maneuver (both bodies): torso lean toward the turn / forward / back, pelvis height and load, time spent deep (pelvis
//    ≥ 15 cm below RUN-1's at the speed), plant-leg knee, free-knee height at the plant, shoulder-line rotation vs the hips, arm span, plant → peak push
//    → toe-off timing, and the VISIBLE REACTION latency (request → the body visibly organising: shoulders ≥ 5° or arms ≥ 30 % authored or head ≥ 15°).
//    (a separate gaze test is not used: TURN-1's head already turns toward the request at 720°/s in both bodies)
// usage: node t11_check.cjs [--only id,id] [--out file.json]
const { loadTurn1 } = require("./t1_load.cjs"), X = loadTurn1(), T = X.TURN1, L11 = X.TURN11, M4 = X.M4, SCN = require("../turn1_scenarios.js"), crypto = require("crypto"), fs = require("fs");
const arg = (k) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; };
const DEG = Math.PI / 180, D = 180 / Math.PI, ids = arg("only") ? arg("only").split(",") : Object.keys(SCN.all);
const f9 = (x) => (x == null ? "n" : (+x).toFixed(9)), pl = (p) => p ? `${f9(p.pos[0])},${f9(p.pos[1])},${f9(p.yaw)}` : "-";
function run(scn, authored) {
  const A = T.t1Make(X.skel, scn.init); if (authored) L11.attach(A);
  const n = Math.round(scn.dur * 240), b = A.body, I = b.idx, hM = crypto.createHash("sha256"), hJ = crypto.createHash("sha256"), hC = crypto.createHash("sha256");
  const hz = b.heelZ + 0.012, padLoc = [0, -(b.ankleH + b.mtp[1]), X.ctx.RUN1_V13.R1_MTP.padAhead];
  const st = { R: null, L: null }, stances = [], J = ["pelvis", "foot_R", "foot_L", "toe_R", "toe_L", "hand_R", "hand_L", "head"], hist = [], worst = {}, samples = [];
  let tStep = 0, tPose = 0, nPose = 0;
  for (let k = 0; k < n; k++) {
    const a = performance.now(); T.t1Step(A, T.t1Input(scn, k / 240)); tStep += performance.now() - a;
    const r = A.log[A.log.length - 1], S = A.st;
    hM.update(`${f9(r.x)},${f9(r.y)},${f9(r.vx)},${f9(r.vy)},${f9(r.psi)},${f9(r.gaze)}|${S.role ? S.role.kind : "-"},${f9(S.dV[0])},${f9(S.dV[1])},${f9(S.tc)},${f9(S.tf)}|`);
    for (const F of ["R", "L"]) { const L = A.legs[F]; hM.update(`${F}${L.stance ? 1 : 0}:${pl(L.plant)}:${L.tgt ? L.tgt.map(f9).join(",") : "-"};`); }
    const b0 = performance.now(), ev = T.t1Evaluate(A), fk = ev.fk; tPose += performance.now() - b0; nPose++;
    if (k % 4 === 0) { for (const j of fk.joint) hJ.update(`${j[0].toFixed(6)},${j[1].toFixed(6)},${j[2].toFixed(6)}|`); if (A.l11s) hC.update(Object.values(A.l11s.c).map(v => v.toFixed(9)).join(",") + ";"); }
    // slip (t1_metrics: heel while the heel is down, toe pad once it is up / in a pivot; 10–90 % of the stance)
    for (const F of ["R", "L"]) { const lg = ev.pose.legs[F]; if (!lg.stance) continue;
      if (!st[F] || st[F].tTD !== A.legs[F].tTD) { st[F] = { F, tTD: A.legs[F].tTD, role: A.legs[F].role ? A.legs[F].role.kind : "RUN", samples: [] }; stances.push(st[F]); }
      if (k % 2 === 0) st[F].samples.push({ s: lg.s, heel: M4.transformPoint(fk.world[I["foot_" + F]], [0, -b.ankleH, hz]), pad: M4.transformPoint(fk.world[I["toe_" + F]], padLoc), beta: ev.pose.diag.feet[F].beta, pivot: !!(A.legs[F].plant && A.legs[F].plant.pivot) }); }
    // continuity (t1_pops)
    const P = {}; for (const j of J) P[j] = (j.startsWith("toe") ? fk.tip : fk.joint)[I[j]].slice(); hist.push(P);
    if (hist.length >= 3) { const a3 = hist[hist.length - 3], b3 = hist[hist.length - 2], c3 = hist[hist.length - 1]; for (const j of J) { const e = Math.hypot(c3[j][0] - 2 * b3[j][0] + a3[j][0], c3[j][1] - 2 * b3[j][1] + a3[j][1], c3[j][2] - 2 * b3[j][2] + a3[j][2]); if (!worst[j] || e > worst[j].e) worst[j] = { e, t: A.t - 1 / 240 }; } }
    if (hist.length > 3) hist.shift();
    // body samples (every 2 steps)
    if (k % 2 === 0) { const th = A.psi, f = [Math.cos(th), 0, -Math.sin(th)], rt = [-Math.sin(th), 0, -Math.cos(th)], pv = fk.joint[I.pelvis], nk = fk.joint[I.neck], tv = [nk[0] - pv[0], nk[1] - pv[1], nk[2] - pv[2]];
      const line = (a1, b1) => Math.atan2(-(fk.joint[I[b1]][2] - fk.joint[I[a1]][2]), fk.joint[I[b1]][0] - fk.joint[I[a1]][0]), hR = fk.joint[I.hand_R], hL = fk.joint[I.hand_L];
      const man = A.man, lg = ev.pose.legs, base = T.t1G(A, Math.hypot(A.V[0], A.V[1])).y0;
      samples.push({ t: A.t, shW: line("upperArm_L", "upperArm_R") - Math.PI / 2, thv: Math.atan2(A.V[1], A.V[0]), lat: Math.atan2(tv[0] * rt[0] + tv[2] * rt[2], tv[1]) * D, fwd: Math.atan2(tv[0] * f[0] + tv[2] * f[2], tv[1]) * D, py: pv[1], load: base - pv[1], shoulder: T.wrapA(line("upperArm_L", "upperArm_R") - line("thigh_L", "thigh_R")) * D,
        span: Math.hypot(hR[0] - hL[0], hR[2] - hL[2]), headRel: T.wrapA(Math.atan2(-(fk.tip[I.head][2] - fk.joint[I.head][2]), fk.tip[I.head][0] - fk.joint[I.head][0])) * D,
        role: A.st.role ? A.st.role.kind : "RUN", man: man ? man.kind + "/" + man.tech + "/" + man.phase : null, sg: man ? man.sg : null, kneeR: lg.R.knee, kneeL: lg.L.knee, stR: lg.R.stance, stL: lg.L.stance,
        kneeYR: fk.joint[I.shin_R][1], kneeYL: fk.joint[I.shin_L][1], aW: A.l11s ? A.l11s.c.aW : 0, tYaw: A.l11s ? A.l11s.c.tYaw * D : 0, chest: A.chest * D, gazeRel: T.wrapA(A.gaze - A.psi) * D, acc: Math.hypot(A.acc[0], A.acc[1]) }); }
  }
  const slip = stances.map(S => { let ref = null, refKind = null, mx = 0; for (const q of S.samples) { if (q.s < 0.10 || q.s > 0.90) continue; const kind = q.pivot || q.beta < -0.5 * DEG ? "pad" : "heel", p = kind === "pad" ? q.pad : q.heel; if (kind !== refKind) { ref = p; refKind = kind; continue; } mx = Math.max(mx, Math.hypot(p[0] - ref[0], p[2] - ref[2])); } return { F: S.F, t: +S.tTD.toFixed(3), role: S.role, cm: +(mx * 100).toFixed(2) }; });
  return { A, hashMove: hM.digest("hex").slice(0, 16) + "/" + crypto.createHash("sha256").update(JSON.stringify(A.events)).digest("hex").slice(0, 8), hashJoints: hJ.digest("hex").slice(0, 16), hashCh: hC.digest("hex").slice(0, 16),
    slipMaxCm: Math.max(0, ...slip.map(s => s.cm)), slip, pops: Object.fromEntries(Object.entries(worst).map(([j, w]) => [j, { mm: +(w.e * 1000).toFixed(1), t: +w.t.toFixed(3) }])), samples, msStep: tStep / n, msPose: tPose / nPose };
}
// body measurements of one run around its first maneuver (decision → +1.6 s); null for runs without a maneuver
function body(r, scn) {
  const A = r.A, man = A.events.find(e => e[1] === "maneuver"); if (!man) return null;
  const tD = man[0], plantTD = A.events.find(e => e[1] === "TD" && e[3] === "PLANT" && e[0] >= tD), plantTO = A.events.find(e => e[1] === "plantTO" && e[0] >= tD), sg = Math.sign(man[4]) || 1;
  const W = r.samples.filter(q => q.t >= tD && q.t <= tD + 2.2), P = plantTD ? r.samples.filter(q => q.t >= plantTD[0] && q.t <= (plantTO ? plantTO[0] : plantTD[0] + 0.3)) : [];
  const pF = plantTD ? plantTD[2] : null, mx = (arr, f) => arr.length ? Math.max(...arr.map(f)) : null, mn = (arr, f) => arr.length ? Math.min(...arr.map(f)) : null;
  const deepS = W.filter(q => q.load >= 0.15).length * 2 / 240;
  // visible body reaction (the same test for both bodies): the shoulder line turned ≥ 8° toward the turn (world, vs its offset from the travel direction
  // at the request), or the torso pitched ≥ 6° (vs the request instant), or the arm span grown ≥ 0.12 m
  const q0 = W[0], firstT = (f) => { const q = q0 ? W.find(x => x.t > tD && f(x)) : null; return q ? +(q.t - tD).toFixed(3) : null; };
  const reactShoulders = firstT(q => sg * T.wrapA((q.shW - q.thv) - (q0.shW - q0.thv)) * D >= 8), reactPitch = firstT(q => Math.abs(q.fwd - q0.fwd) >= 6), reactArms = firstT(q => q.span - q0.span >= 0.12);
  const react = [reactShoulders, reactPitch, reactArms].filter(x => x != null).sort((a, b) => a - b)[0];
  const atTD = plantTD ? r.samples.find(q => q.t >= plantTD[0]) : null, free = pF === "R" ? "L" : "R";
  const pushPk = P.length ? P.reduce((a, q) => q.acc > a.acc ? q : a, P[0]) : null;
  return { maneuver: man.slice(2), torsoLeanIntoTurnMaxDeg: +(mx(P.length ? P : W, q => sg * q.lat) || 0).toFixed(1), torsoFwdMaxDeg: +(mx(W, q => q.fwd) || 0).toFixed(1), torsoBackMaxDeg: +(-(mn(W, q => q.fwd) || 0)).toFixed(1),
    pelvisMinM: +(mn(W, q => q.py) || 0).toFixed(3), loadMaxCm: +((mx(W, q => q.load) || 0) * 100).toFixed(1), deepS: +deepS.toFixed(3),
    plantKneeMaxDeg: P.length ? +mx(P, q => pF === "R" ? q.kneeR : q.kneeL).toFixed(1) : null, freeKneeHeightAtPlantM: atTD ? +(free === "R" ? atTD.kneeYR : atTD.kneeYL).toFixed(3) : null,
    shoulderVsHipsMaxDeg: +(mx(W, q => sg * q.shoulder) || 0).toFixed(1), armSpanMaxM: +(mx(W, q => q.span) || 0).toFixed(2),
    plantToPushPeakS: pushPk ? +(pushPk.t - plantTD[0]).toFixed(3) : null, plantToToeOffS: plantTD && plantTO ? +(plantTO[0] - plantTD[0]).toFixed(3) : null, plantAfterRequestS: plantTD ? +(plantTD[0] - tD).toFixed(3) : null,
    visibleReactionS: react != null ? react : null, reactShouldersS: reactShoulders, reactTorsoPitchS: reactPitch, reactArmsS: reactArms };
}
// VISIBLE REACTION vs the unaware counterfactual: the same actor without the command, stepped in lockstep; the first instant after the request at which
// the upper body (head, hands, elbows — relative to the pelvis, root frame) differs from it by ≥ 8 cm
function reaction(scn, authored) {
  const c0 = scn.cmds && scn.cmds[0]; if (!c0) return null;
  const A = T.t1Make(X.skel, scn.init), B = T.t1Make(X.skel, scn.init); if (authored) { L11.attach(A); L11.attach(B); }
  const nc = Object.assign({}, scn, { cmds: [] }), I = A.body.idx, js = ["head", "hand_L", "hand_R", "foreArm_L", "foreArm_R"], n = Math.round((c0.t + 1.2) * 240);
  const rel = (Z) => { const fk = T.t1Evaluate(Z).fk, p = fk.joint[I.pelvis], c = Math.cos(Z.psi), s = Math.sin(Z.psi); return js.map(j => { const q = fk.joint[I[j]], d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]]; return [d[0] * c - d[2] * s, d[1], d[0] * s + d[2] * c]; }); };
  for (let k = 0; k < n; k++) { T.t1Step(A, T.t1Input(scn, k / 240)); T.t1Step(B, T.t1Input(nc, k / 240)); if (A.t < c0.t) continue;
    const ra = rel(A), rb = rel(B); let m = 0; for (let i = 0; i < js.length; i++) m = Math.max(m, Math.hypot(ra[i][0] - rb[i][0], ra[i][1] - rb[i][1], ra[i][2] - rb[i][2]));
    if (m >= 0.08) return +(A.t - c0.t).toFixed(3); }
  return null;
}
const out = { note: "TURN-1.1 regression (t11_check.cjs): movement-foundation identity (TURN-1 vs TURN-1.1 body), determinism, slip, continuity, body measurements", scenarios: {} };
let moveDiff = 0, nondet = 0;
for (const id of ids) {
  const scn = SCN.get(id), t1 = run(scn, false), a = run(scn, true), b = run(scn, true);
  const same = t1.hashMove === a.hashMove, det = a.hashJoints === b.hashJoints && a.hashCh === b.hashCh && a.hashMove === b.hashMove; if (!same) moveDiff++; if (!det) nondet++;
  const rc = { t1: reaction(scn, false), t11: reaction(scn, true) };
  const r = out.scenarios[id] = { label: scn.label, reactionVsUnawareS: rc, movementIdentical: same, hashMove: a.hashMove, deterministic: det, hashJoints: a.hashJoints,
    slipMaxCm: { t1: t1.slipMaxCm, t11: a.slipMaxCm }, popsMm: { t1: t1.pops, t11: a.pops }, body: { t1: body(t1, scn), t11: body(a, scn) }, msStep: +a.msStep.toFixed(4), msPose: +a.msPose.toFixed(3) };
  const pw = (p) => Math.max(...Object.values(p).map(x => x.mm)).toFixed(1), B1 = r.body.t1, B2 = r.body.t11;
  console.log(`${same ? "SAME" : "DIFF"} ${det ? "DET" : "NONDET"} ${id.padEnd(18)} slip ${t1.slipMaxCm}→${a.slipMaxCm} cm  pops ${pw(t1.pops)}→${pw(a.pops)} mm (pelvis ${t1.pops.pelvis.mm}→${a.pops.pelvis.mm})` +
    (B2 ? `  lean ${B1.torsoLeanIntoTurnMaxDeg}→${B2.torsoLeanIntoTurnMaxDeg}  back ${B1.torsoBackMaxDeg}→${B2.torsoBackMaxDeg}  deep ${B1.deepS}→${B2.deepS}s  shoulders ${B1.shoulderVsHipsMaxDeg}→${B2.shoulderVsHipsMaxDeg}  span ${B1.armSpanMaxM}→${B2.armSpanMaxM}  freeKnee ${B1.freeKneeHeightAtPlantM}→${B2.freeKneeHeightAtPlantM}  react ${rc.t1}→${rc.t11}s` : ""));
}
out.movementDiffs = moveDiff; out.nondeterministic = nondet;
if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));
console.log(moveDiff ? moveDiff + " MOVEMENT DIFFERENCES" : "movement foundation identical in all " + ids.length, "·", nondet ? nondet + " NONDETERMINISTIC" : "all deterministic");

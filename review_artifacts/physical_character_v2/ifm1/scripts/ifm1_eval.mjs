// IFM-1 evaluation (prereg §8–§11, §15): per control / cell / mode statuses from the run records; no threshold is chosen here (all from IFM1 in
// ifm1_lib.mjs = the preregistration). Output: ifm1/evidence/IFM1_EVAL.json (+ printed summary).
// usage: node ifm1_eval.mjs <runs dir> [out.json]   — runs dir holds C0_<body>_<state>.json.gz, N_<role>_<body>.json.gz, W_…, X_…, C0P_<body>_<state>_<placement>.json.gz
import fs from "fs"; import path from "path"; import zlib from "zlib";
const L = await import(new URL("./ifm1_lib.mjs", import.meta.url).href), { V, Q, IFM1, ROLES, BODIES, P2, RA } = L;
const { bootSole, hull2 } = await import(P2 + "sim/v2_geom.js");
const DIR = process.argv[2], OUTF = process.argv[3] || path.join(RA, "ifm1/evidence/IFM1_EVAL.json"), FIX = JSON.parse(fs.readFileSync(path.join(RA, "ifm1/fixture/IFM1_FIXTURE.json")));
const rd = (f) => { const p = path.join(DIR, f); if (!fs.existsSync(p)) return null; return JSON.parse(f.endsWith(".gz") ? zlib.gunzipSync(fs.readFileSync(p)) : fs.readFileSync(p)); };
const R2D = 180 / Math.PI, M_OF = (b) => L.SPECS[b]().bodies.reduce((s, x) => s + x.mass, 0), G = 9.81, NP = IFM1.stepsPrimary, I = IFM1;
const qang = (a, b) => { const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]); return 2 * Math.acos(Math.min(1, d)) * R2D; };
const out = { eval: "IFM1_EVAL", controls: {}, cells: {}, notes: [] };
// ── landmarks / material points ──
function geom(bname) { const spec = L.SPECS[bname](), B = spec.bodies, bi = (n) => B.findIndex(b => b.name === n);
  const loc = (i, p) => V.sub(p, B[i].origin);   // canonical point → body-local (origin frame)
  const LM = { pelvis: { i: 0, l: B[0].comLocal } };
  for (const sd of ["L", "R"]) { LM["knee_" + sd] = { i: bi("shank_" + sd), l: [0, 0, 0] }; LM["ankle_" + sd] = { i: bi("foot_" + sd), l: [0, 0, 0] }; LM["shoulder_" + sd] = { i: bi("upperArm_" + sd), l: [0, 0, 0] };
    LM["elbow_" + sd] = { i: bi("forearm_" + sd), l: [0, 0, 0] }; LM["wrist_" + sd] = { i: bi("forearm_" + sd), l: loc(bi("forearm_" + sd), B[bi("forearm_" + sd)].distal) }; }
  const sole = bootSole(B[bi("foot_L")]), hz = hull2(sole.pts), solePt = [hz.reduce((s, p) => s + p[0], 0) / hz.length, sole.y0, hz.reduce((s, p) => s + p[1], 0) / hz.length];   // PostureDriver's support point (flat-sole centroid)
  return { spec, B, bi, LM, solePt, M: B.reduce((s, b) => s + b.mass, 0) }; }
const at = (S, i, l) => V.add(S[i].pos, Q.rot(S[i].rot, l));
const CHAIN = { SW: ["shank_R", "thigh_R", "foot_R"], PL: ["shank_L", "thigh_L", "foot_L"], TP: ["shank_L", "thigh_L", "foot_L"], SH: ["upperArm_L", "forearm_L", "thorax"] };
const CHAIN_LM = { SW: ["knee_R", "ankle_R"], PL: ["knee_L", "ankle_L"], TP: ["knee_L", "ankle_L"], SH: ["shoulder_L", "elbow_L", "wrist_L"] };
// ── primary-window integrity + ledgers (shared by C0 / N / W / X) ──
function mech(run, kind) {
  const R = run.recs, prim = R.filter(r => r.n <= NP), sec = R.filter(r => r.n > NP), fails = [];
  const integ = (r) => { const x = r.integrity, f = []; if (!x.finite) f.push("non-finite"); if (x.anchorSepMm > I.integrity.anchorSepMm) f.push(`anchor ${x.anchorSepMm.toFixed(3)} mm`); if (x.selfPenMm > I.integrity.selfPenMm) f.push(`self-pen ${x.selfPenMm.toFixed(2)} mm`);
    if (x.turfPenMm > I.integrity.turfPenMm) f.push(`turf-pen ${x.turfPenMm.toFixed(2)} mm`); if (x.engineStopTicks > 0) f.push(`emergency stop ${x.engineStopTicks}`); if (x.overCap > 0) f.push(`capacity ${x.overCap}`);
    if (x.authorityWritesTotal !== 28) f.push(`authority writes ${x.authorityWritesTotal}`); return f; };
  const lin = prim.map(r => V.len(r.linRes)), ang = prim.map(r => V.len(r.angRes)), linCum = V.len(prim.reduce((s, r) => V.add(s, r.linRes), [0, 0, 0])), angCum = V.len(prim.reduce((s, r) => V.add(s, r.angRes), [0, 0, 0]));
  const ePlus = prim.reduce((s, r) => s + Math.max(0, r.energyRes), 0), ePlusSec = R.reduce((s, r) => s + Math.max(0, r.energyRes), 0), ePlusComb = prim.reduce((s, r) => s + Math.max(0, r.combinedEnergyRes), 0);
  const perStep = prim.map(r => ({ n: r.n, f: integ(r) })).filter(x => x.f.length);
  const ledger = { linMaxNs: Math.max(...lin), linCumNs: linCum, linSumNormNs: lin.reduce((a, b) => a + b, 0), angMaxNms: Math.max(...ang), angCumNms: angCum, angSumNormNms: ang.reduce((a, b) => a + b, 0),
    energyResPlusJ: ePlus, energyResPlusHorizonJ: ePlusSec, combinedEnergyResPlusJ: ePlusComb, combinedLinMaxNs: Math.max(...prim.map(r => V.len(r.combinedLinRes))), combinedAngMaxNms: Math.max(...prim.map(r => V.len(r.combinedAngRes))),
    posCorrMaxMm: Math.max(...prim.map(r => r.integrity.posCorrMaxMm || 0)), angPosCorrTermMaxNms: Math.max(...prim.map(r => V.len(r.angPosCorrTerm))) };
  if (Math.max(...lin) > I.ledger.linStepNs) fails.push(`linear residual ${Math.max(...lin).toExponential(2)} N·s/step`); if (linCum > I.ledger.linPrimaryNs) fails.push(`linear cumulative ${linCum.toExponential(2)} N·s`);
  if (Math.max(...ang) > I.ledger.angStepNms) fails.push(`angular residual ${Math.max(...ang).toExponential(2)} N·m·s/step`); if (angCum > I.ledger.angPrimaryNms) fails.push(`angular cumulative ${angCum.toExponential(2)} N·m·s`);
  // energy: the receiver ledger for C0 / W / X; for N the combined receiver + impactor system (every term measured); the receiver ledger with the opponent-work estimate is reported
  const eUse = kind === "N" ? ePlusComb : ePlus; if (eUse > I.ledger.energyPrimaryJ) fails.push(`energy Σ+ ${eUse.toFixed(4)} J (${kind === "N" ? "combined" : "receiver"})`);
  for (const x of perStep) fails.push(`step ${x.n}: ${x.f.join(", ")}`);
  if (run.stop && run.stop.step <= NP) fails.push(`safe stop at step ${run.stop.step}: ${run.stop.reason}`);
  if (prim.length < NP) fails.push(`only ${prim.length} primary steps`);
  // secondary: first failure time and subsystem (does not overwrite the primary verdict)
  let secFail = null; for (const r of sec) { const f = integ(r); if (V.len(r.linRes) > I.ledger.linStepNs) f.push("linear ledger"); if (V.len(r.angRes) > I.ledger.angStepNms) f.push("angular ledger"); if (f.length) { secFail = { n: r.n, t: r.t, subsystem: f }; break; } }
  if (!secFail && ePlusSec > I.ledger.energySecondaryJ) secFail = { n: null, t: null, subsystem: [`energy Σ+ horizon ${ePlusSec.toFixed(3)} J > 5 J`] };
  if (!secFail && run.stop) secFail = { n: run.stop.step, t: run.stop.t, subsystem: [run.stop.reason] };
  return { pass: fails.length === 0, fails, ledger, secondaryFailure: secFail };
}
// ── controls ──
for (const bname of BODIES) for (const sid of ["S-FLAT", "S-TOE"]) {
  const key = `${bname}/${sid}`, e = FIX.entries[key], run = rd(`C0_${bname}_${sid}.json.gz`), g = geom(bname), o = { key, fixtureStatus: e ? e.status : "STATE_UNAVAILABLE" };
  out.controls[key] = o; if (!e || e.status !== "ENTRY_GEOMETRY_OK" || !run || run.status !== "RAN") { o.status = !e ? "STATE_UNAVAILABLE" : e.status !== "ENTRY_GEOMETRY_OK" ? e.status : run ? run.status : "NOT_RUN"; continue; }
  const ent = run.entry, handoffOk = e.handoff.HGA2_3.pass && e.handoff.postShift.PR2.pass && e.handoff.postShift.kin.pass;
  o.entry = { geometry: e.entryGateGeometry, readback: ent.readback, momentumReadbackErrNs: ent.horizontalMomentumErrNs, momentumOk: ent.momentumReadbackOk, cacheClean: ent.cacheClean, writes: ent.entryWrites,
    pass: e.entryGateGeometry.pass && ent.momentumReadbackOk && ent.cacheClean && ent.entryWrites === 28 };
  o.handoff = { pass: handoffOk, HGA2_3: e.handoff.HGA2_3, PR2post: e.handoff.postShift.PR2.auditGateMs, PR2pre: e.handoff.preShift.PR2.auditGateMs, kin: e.handoff.postShift.kin, label: handoffOk ? null : "HANDOFF_FAILED" };
  const m = mech(run, "C0"), R = run.recs, prim = R.filter(r => r.n <= NP), fL = g.bi("foot_L");
  const nonFoot = prim.flatMap(r => r.contacts.filter(c => c.kind === "ground").map(c => (typeof c.a === "number" ? c.a : c.b)).filter(i => !/^foot_/.test(g.B[i].name)).map(i => ({ n: r.n, body: g.B[i].name }))).filter(x => { const r = prim.find(q => q.n === x.n); const c = r.contacts.find(cc => cc.kind === "ground" && ((cc.a === g.bi(x.body)) || (cc.b === g.bi(x.body)))); return c && (c.Jn > 0 || c.points.some(p => p.depth > -0.0005)); });
  const loadSteps = prim.map(r => { const gL = r.ground.find(x => x.body === "foot_L"); return gL ? gL.Jn : 0; }), loaded = loadSteps.filter(x => x > 0).length, Jint = loadSteps.reduce((a, b) => a + b, 0), need = I.c0Flat.minImpulseFracMgT * g.M * G * 0.05;
  const S0 = run.recs.length ? FIX.entries[key].write.poses : null, pt = (S) => at(S, fL, g.solePt); let travel = 0, prev = pt(S0); for (const r of prim) { const p = pt(r.S); travel += Math.hypot(p[0] - prev[0], p[2] - prev[2]); prev = p; }
  const pel0 = L.comWorld(g.spec, S0, 0)[1], pelMin = Math.min(...prim.map(r => r.S[0].com[1])), firstUnload = (() => { const k = loadSteps.findIndex(x => !(x > 0)); return k < 0 ? null : prim[k].n; })();
  o.support = { loadedSteps: loaded, integratedNormalNs: Jint, requiredNs: need, flatPointTravelMm: travel * 1000, pelvisMinFrac: pelMin / pel0, nonFootTurfContacts: nonFoot, firstUnloadedStep: firstUnload, perStepNormalNs: loadSteps };
  const flatFails = [];
  if (sid === "S-FLAT") { if (loaded < I.c0Flat.minLoadedSteps) flatFails.push(`loaded steps ${loaded} < 6`); if (Jint < need) flatFails.push(`foot impulse ${Jint.toFixed(3)} < ${need.toFixed(3)} N·s`); if (travel * 1000 > I.c0Flat.maxSlipMm) flatFails.push(`flat point travel ${(travel * 1000).toFixed(2)} mm`); if (pelMin / pel0 < I.c0Flat.minPelvisFrac) flatFails.push(`pelvis ${(pelMin / pel0).toFixed(3)}`); }
  if (nonFoot.length) flatFails.push(`non-foot turf contact (${nonFoot[0].body} @ step ${nonFoot[0].n})`);
  o.mechanics = m; o.primaryPass = o.entry.pass && m.pass && flatFails.length === 0; o.primaryFails = [...(o.entry.pass ? [] : ["entry gate"]), ...m.fails, ...flatFails];
  o.supportClass = sid === "S-TOE" ? (firstUnload ? `support released at step ${firstUnload}` : "support maintained through 50 ms") : null;
  o.status = o.primaryPass ? "CONTROL_VALID_PRIMARY" : "CONTROL_INVALID_PRIMARY"; if (m.secondaryFailure) o.secondary = `SECONDARY_FAILURE_AT(${m.secondaryFailure.t != null ? (m.secondaryFailure.t * 1000).toFixed(1) + " ms" : "horizon"})`;
  o.toneTruncation = e.snapshotTone.status === "SECONDARY_TRUNCATED_AT_CROSSING" ? e.snapshotTone.firstCrossing : null;
  // placement independence of the shared control (receiver-only hash with another placement)
  const alt = ROLES.filter(r => r.state === sid && r.id !== run.job.placementRole).map(r => ({ role: r.id, run: rd(`C0P_${bname}_${sid}_${r.id}.json.gz`) })).filter(x => x.run);
  o.placementIndependence = alt.map(x => ({ placement: x.role, identicalReceiver: JSON.stringify(x.run.recs.map(r => r.hashR)) === JSON.stringify(run.recs.map(r => r.hashR)) }));
}
// ── cells ──
const resp = (run, ctrl, role, g, fix, steps) => { const ti = g.bi(fix.target.body), wl = fix.witnessLocal, inward = V.sc(fix.outwardRay, -1), chainB = CHAIN[role].map(n => g.bi(n)), torso = g.bi("thorax");
  return steps.map(n => { const r = run.recs.find(x => x.n === n), c = ctrl.recs.find(x => x.n === n); if (!r || !c) return { n, missing: true };
    const p = at(r.S, ti, wl), pc = at(c.S, ti, wl), vp = L.velAt(r.S[ti], r.S[ti].com, p), vc = L.velAt(c.S[ti], c.S[ti].com, pc), d = V.sub(p, pc);
    const lm = Object.fromEntries(Object.entries(g.LM).map(([k, x]) => [k, V.dist(at(r.S, x.i, x.l), at(c.S, x.i, x.l)) * 1000]));
    return { n, t: n * IFM1.h, targetDispMm: V.len(d) * 1000, targetDispInwardMm: V.dot(d, inward) * 1000, targetVelDiffMs: V.dist(vp, vc), targetVelInwardMs: V.dot(V.sub(vp, vc), inward),
      chainLandmarkMm: Object.fromEntries(CHAIN_LM[role].map(k => [k, lm[k]])), allLandmarkMm: lm, torsoDeg: qang(r.S[torso].rot, c.S[torso].rot), struckDeg: qang(r.S[ti].rot, c.S[ti].rot), chainDeg: Object.fromEntries(chainB.map(i => [g.B[i].name, qang(r.S[i].rot, c.S[i].rot)])),
      P: r.P, L_O: r.L_O, com: V.sc(r.S.reduce((s, b, i) => V.add(s, V.sc(b.com, g.B[i].mass)), [0, 0, 0]), 1 / g.M), supportFootNs: (r.ground.find(x => x.body === (role === "SW" ? "foot_L" : "foot_L")) || { Jn: 0 }).Jn }; }); };
const equiv = (a, b, role, g) => { let lm = 0, or = 0; const ti = g.bi(CHAIN[role][0]), torso = g.bi("thorax");
  for (let n = 1; n <= NP; n++) { const x = a.recs.find(r => r.n === n), y = b.recs.find(r => r.n === n); if (!x || !y) return { comparable: false };
    for (const [, l] of Object.entries(g.LM)) lm = Math.max(lm, V.dist(at(x.S, l.i, l.l), at(y.S, l.i, l.l)) * 1000); or = Math.max(or, qang(x.S[torso].rot, y.S[torso].rot), qang(x.S[ti].rot, y.S[ti].rot)); }
  const sup = (run) => run.recs.filter(r => r.n <= NP).map(r => (r.ground.find(q => q.body === "foot_L") || { Jn: 0 }).Jn > 0 ? 1 : 0).join("");
  return { comparable: true, maxLandmarkMm: lm, maxOrientDeg: or, sameSupport: sup(a) === sup(b), equivalent: lm <= I.equivalence.landmarkMm && or <= I.equivalence.orientDeg && sup(a) === sup(b) }; };
for (const role of ROLES) for (const bname of BODIES) {
  const key = `${role.id}/${bname}`, fix = FIX.fixtures[key], ckey = `${bname}/${role.state}`, ctl = out.controls[ckey], g = geom(bname), o = { key, role: role.id, body: bname, state: role.state, fixtureStatus: fix ? fix.status : null };
  out.cells[key] = o; const N = rd(`N_${role.id}_${bname}.json.gz`), ctrlRun = rd(`C0_${bname}_${role.state}.json.gz`);
  if (!fix || fix.status !== "PLACED") { o.status = fix ? fix.status : "FIXTURE_UNAVAILABLE"; continue; }
  if (ctl.status === "STATE_UNAVAILABLE" || ctl.fixtureStatus !== "ENTRY_GEOMETRY_OK") { o.status = ctl.status; continue; }
  o.handoffLabel = ctl.handoff.label; o.controlStatus = ctl.status;
  if (!N || N.status !== "RAN") { o.N = { status: N ? N.status : "NOT_RUN" }; continue; }
  // native correspondence (first step)
  const r1 = N.recs.find(r => r.n === 1), ti = g.bi(fix.target.body), opp1 = r1 ? r1.contacts.filter(c => c.kind === "opponent") : [], q = (c) => V.len(c.J2) >= I.contact.minImpulseNs;
  const onTarget = opp1.filter(c => q(c) && ((c.a === ti && c.sub1 === fix.target.sub) || (c.b === ti && c.sub2 === fix.target.sub)));
  const anyQual = opp1.filter(q), firstBodies = [...new Set(anyQual.map(c => (typeof c.a === "number" ? `${g.B[c.a].name}.${c.sub1}` : `${g.B[c.b].name}.${c.sub2}`)))];
  let witnessMm = null, normalDeg = null;
  if (onTarget.length) { const c = onTarget.reduce((m, x) => (V.len(x.J2) > V.len(m.J2) ? x : m), onTarget[0]), wsum = c.points.reduce((s, p) => s + Math.max(p.lam, 0), 0), wpt = wsum > 0 ? V.sc(c.points.reduce((s, p) => V.add(s, V.sc(p.p, Math.max(p.lam, 0))), [0, 0, 0]), 1 / wsum) : c.points[0].p;
    const S0 = FIX.entries[ckey].write.poses, patch = at(S0, ti, fix.witnessLocal); witnessMm = V.dist(wpt, patch) * 1000;   // the target body's transform at contact = its pre-step (entry) transform for a first-step contact
    const nTow = c.a === ti ? c.n : V.sc(c.n, -1); normalDeg = Math.acos(Math.max(-1, Math.min(1, V.dot(nTow, fix.normalOut)))) * R2D; }
  const corrOk = onTarget.length > 0 && witnessMm <= I.contact.witnessMm && normalDeg <= I.contact.normalDeg;
  const firstImp = r1 ? r1.opponent.reduce((s, x) => s + V.len(x.J), 0) : 0, later = N.recs.filter(r => r.n > 1 && r.n <= NP).reduce((s, r) => s + r.opponent.reduce((a, x) => a + V.len(x.J), 0), 0), contactSteps = N.recs.filter(r => r.opponent.length).map(r => r.n);
  o.N = { correspondence: { pass: corrOk, onTarget: onTarget.length > 0, firstStepRegions: firstBodies, witnessMm, normalDeg, firstStepImpulseNs: firstImp, firstStepImpulse: r1 ? r1.opponent : [], impactorImpulse: r1 ? r1.impactorImpulse : null },
    contact: { steps: contactSteps, durationSteps: contactSteps.length, postFirstStepImpulseNs: later, weakChallenge: firstImp > 0 && later < IFM1.weakChallengeFrac * firstImp }, mechanics: mech(N, "N") };
  o.N.status = !corrOk ? "NATIVE_CORRESPONDENCE_FAILED" : !o.N.mechanics.pass ? "NATIVE_INTEGRITY_FAILED" : "PRIMARY_MECHANICS_VALID";
  if (N.stop) o.N.stop = N.stop;
  if (ctl.status === "CONTROL_VALID_PRIMARY" && ctrlRun) { o.N.response = resp(N, ctrlRun, role.id, g, fix, [1, 6, 12, 24, 36]);
    const within = o.N.response.filter(x => x.n <= NP && !x.missing), maxPt = Math.max(...within.map(x => Math.max(x.targetDispMm, ...Object.values(x.chainLandmarkMm)))), maxRot = Math.max(...within.map(x => Math.max(x.struckDeg, ...Object.values(x.chainDeg))));
    o.N.causal = { maxStruckChainPointMm: maxPt, maxRelevantRotationDeg: maxRot, detectable: maxPt >= I.response.pointMm || maxRot >= I.response.rotDeg, older: { velChangeMs: Math.max(...o.N.response.filter(x => !x.missing).map(x => x.targetVelDiffMs)), disp150Mm: (o.N.response.find(x => x.n === 36) || {}).targetDispMm } };
    // apparent point effective mass along the first-step impulse direction (reported only when the denominator is well above resolution)
    { const Jt = r1.opponent.find(x => x.i === ti), u = Jt && V.len(Jt.J) > 0 ? V.sc(Jt.J, 1 / V.len(Jt.J)) : null, x1 = o.N.response.find(x => x.n === 1);
      if (u && x1) { const dv = V.dot(V.sub(L.velAt(r1.S[ti], r1.S[ti].com, at(r1.S, ti, fix.witnessLocal)), L.velAt(ctrlRun.recs[0].S[ti], ctrlRun.recs[0].S[ti].com, at(ctrlRun.recs[0].S, ti, fix.witnessLocal))), u); o.N.apparentPointMassKg = dv > 1e-3 ? V.len(Jt.J) / dv : null; o.N.apparentPointDvMs = dv; } } }
  else o.N.response = null;
  // W (only if C0 valid and N's first step corresponds and is mechanically / ledger-valid)
  const n1Valid = corrOk && r1 && r1.integrity.finite && V.len(r1.linRes) <= I.ledger.linStepNs && V.len(r1.angRes) <= I.ledger.angStepNms && r1.integrity.anchorSepMm <= I.integrity.anchorSepMm;
  o.W = { permitted: ctl.status === "CONTROL_VALID_PRIMARY" && n1Valid, reason: ctl.status !== "CONTROL_VALID_PRIMARY" ? "control invalid" : !n1Valid ? "N first step not valid" : null };
  const W = rd(`W_${role.id}_${bname}.json.gz`);
  if (o.W.permitted && W && W.status === "RAN") { const a = N.recs.find(r => r.n === 1), b = W.recs.find(r => r.n === 1); let pos = 0, rot = 0, vel = 0, ang = 0;
    a.S.forEach((x, i) => { pos = Math.max(pos, V.dist(x.com, b.S[i].com)); rot = Math.max(rot, qang(x.rot, b.S[i].rot)); vel = Math.max(vel, V.dist(x.v, b.S[i].v)); ang = Math.max(ang, V.dist(x.w, b.S[i].w)); });
    const fid = { posMm: pos * 1000, rotDeg: rot, velMs: vel, angVelRadS: ang, PNs: V.dist(a.P, b.P), LNms: V.dist(a.L_O, b.L_O) }, F = I.fidelity;
    fid.pass = fid.posMm <= F.posMm && fid.rotDeg <= F.rotDeg && fid.velMs <= F.velMs && fid.angVelRadS <= F.angVelRadS && fid.PNs <= F.PNs && fid.LNms <= F.LNms;
    o.W.fidelity = fid; o.W.injected = W.injected; o.W.mechanics = mech(W, "W"); o.W.status = !fid.pass ? "WRENCH_REPLAY_NOT_STATE_MATCHED" : !o.W.mechanics.pass ? "NATIVE_INTEGRITY_FAILED" : "PRIMARY_MECHANICS_VALID";
    if (ctrlRun) { o.W.response = resp(W, ctrlRun, role.id, g, fix, [1, 6, 12, 24, 36]); const within = o.W.response.filter(x => x.n <= NP && !x.missing);
      o.W.causal = { maxStruckChainPointMm: Math.max(...within.map(x => Math.max(x.targetDispMm, ...Object.values(x.chainLandmarkMm)))), maxRelevantRotationDeg: Math.max(...within.map(x => Math.max(x.struckDeg, ...Object.values(x.chainDeg)))) };
      o.W.causal.detectable = o.W.causal.maxStruckChainPointMm >= I.response.pointMm || o.W.causal.maxRelevantRotationDeg >= I.response.rotDeg; }
    o.NW = equiv(N, W, role.id, g); }
  else if (o.W.permitted) o.W.status = W ? W.status : "NOT_RUN";
  // X trigger and result
  o.X = { triggered: !!(o.W.status && (o.W.status === "WRENCH_REPLAY_NOT_STATE_MATCHED" || (o.N.status === "PRIMARY_MECHANICS_VALID") !== (o.W.status === "PRIMARY_MECHANICS_VALID") || (o.N.causal && o.W.causal && o.N.causal.detectable !== o.W.causal.detectable) || (o.NW && !o.NW.equivalent))) };
  const X = rd(`X_${role.id}_${bname}.json.gz`);
  if (o.X.triggered && X && X.status === "RAN") { o.X.noopRestore = X.noopRestore; o.X.mechanics = mech(X, "X"); o.NX = equiv(N, X, role.id, g); o.X.status = !X.noopRestore.identicalToUninterrupted ? "X_RESTORE_NOT_BIT_EXACT (continuation necessity unresolved)" : o.X.mechanics.pass ? "PRIMARY_MECHANICS_VALID" : "NATIVE_INTEGRITY_FAILED"; }
  else if (o.X.triggered) o.X.status = X ? X.status : "NOT_RUN (continuation necessity unresolved)";
  // composite cell status (no all-cells verdict)
  o.status = [o.N.status, o.handoffLabel, ctl.status === "CONTROL_INVALID_PRIMARY" ? "CONTROL_INVALID_PRIMARY" : null, o.W.status ? "W:" + o.W.status : null, o.N.mechanics.secondaryFailure ? `SECONDARY_FAILURE_AT(${o.N.mechanics.secondaryFailure.t != null ? (o.N.mechanics.secondaryFailure.t * 1000).toFixed(1) + " ms" : "horizon"})` : null, "VISUAL_PENDING"].filter(Boolean);
}
fs.mkdirSync(path.dirname(OUTF), { recursive: true }); fs.writeFileSync(OUTF, JSON.stringify(out, null, 1));
for (const [k, c] of Object.entries(out.controls)) console.log(`C0 ${k}: ${c.status}${c.primaryFails && c.primaryFails.length ? " · " + c.primaryFails.slice(0, 4).join("; ") : ""}${c.handoff && c.handoff.label ? " · " + c.handoff.label : ""}${c.secondary ? " · " + c.secondary : ""}`);
for (const [k, c] of Object.entries(out.cells)) console.log(`${k}: ${Array.isArray(c.status) ? c.status.join(" · ") : c.status}${c.N && c.N.correspondence ? ` · first-step J ${c.N.correspondence.firstStepImpulseNs.toFixed(3)} N·s on ${c.N.correspondence.firstStepRegions.join(",")}` : ""}${c.X && c.X.triggered ? " · X " + c.X.status : ""}`);

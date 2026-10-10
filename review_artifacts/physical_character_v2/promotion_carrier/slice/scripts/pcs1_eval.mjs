// PCS-1 evaluation (PCS1_PREREG.md 8585adc §4; AST1E_PREREG.md 7b77dc5 + A1 + A2): per case, from the carrier runs (contact a / b, no-tackler a / b) in <runsDir>.
// usage (worktree root, V13_WT …): node pcs1_eval.mjs <runsDir> <out.json> [case,...]
import fs from "fs"; import path from "path"; import zlib from "zlib"; import crypto from "crypto"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../.."), SL = path.resolve(here, "..");
const M = await import(path.join(ROOT, "pi1/rev1/scripts/pcg_rev1.mjs")); const { V, Q, loadAir, B, NB } = M.L;
const [DIR, OUT, CS] = process.argv.slice(2), CASES = (CS || "rx_miss,rx_free_leg,rx_planted_leg").split(","), rd = (f) => (fs.existsSync(f) ? JSON.parse(zlib.gunzipSync(fs.readFileSync(f))) : null);
const CAP = { h: 274.95, up: 1161.2, down: 193.5, T: 81.80 }, dt = 1 / 240, Mt = B.reduce((s, b) => s + b.mass, 0), G = 9.81, bi = (n) => B.findIndex(b => b.name === n);
const JPTS = [0].concat(M.L.spec.joints.map(j => j.childIndex)), ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, V.dot(a, b) / ((V.len(a) * V.len(b)) || 1)))) * 180 / Math.PI;
const f4 = (x) => (x == null ? null : +(+x).toFixed(4)), f2 = (x) => (x == null ? null : +(+x).toFixed(2)), mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const SIMCLASS = { rx_miss: "NO_CONTACT", rx_free_leg: "STUMBLE (after a CORRECTION contact)", rx_planted_leg: "FALL" };
const K0 = JSON.parse(fs.readFileSync(path.join(SL, "evidence/K0.json"))), K4B = JSON.parse(fs.readFileSync(path.join(SL, "evidence/k4b_ast1e/K4b.json")));
const out = { prereg: "PCS1_PREREG.md 8585adc + AST1E_PREREG.md 7b77dc5 (A1 bc12611, A2 2306cc0)", K0: K0.pass, K4b: K4B.pass, cases: {} };
const body = (s, i) => { const x = s.bodies[i]; return { pos: x.slice(0, 3), rot: x.slice(3, 7), com: x.slice(7, 10), v: x.slice(10, 13), w: x.slice(13, 16) }; };
for (const cs of CASES) {
  const Ca = rd(path.join(DIR, `${cs}_contact_a.json.gz`)), Fa = rd(path.join(DIR, `${cs}_free_a.json.gz`)), Cb = rd(path.join(DIR, `${cs}_contact_b.json.gz`)), Fb = rd(path.join(DIR, `${cs}_free_b.json.gz`));
  if (!Ca) { out.cases[cs] = { ran: false }; continue; }
  const R = loadAir(path.join(ROOT, "promotion_carrier/evidence/records/on_rx"), `${cs}_LOCO.json.gz`), mapper = M.makeMapper(R, { knee: "RK", rf1: true }), kp = Ca.kp, tauP = kp + 1, S = Ca.stepsLog, res = { ran: true, kp, leadTicks: Ca.leadTicks, simClass: SIMCLASS[cs] };
  const firstA2 = Ca.firstA2, contact = firstA2 != null;
  // ── 1. promotion continuity (PR rows, reported; PR-5 gating in §4.4) ──
  { const sP = S.find(s => Math.abs(s.tau - (tauP + 1)) < 1e-9), A0 = mapper.poseAt(kp).S, A1 = mapper.poseAt(kp + 1).S; let pr2 = { d: 0 };
    for (let q = 0; q < JPTS.length; q++) { const i = JPTS[q], dPh = V.sub(body(sP, i).pos, A0[i].pos), dA = V.sub(A1[i].pos, A0[i].pos), d = V.dist(dPh, dA); if (d > pr2.d) pr2 = { d, body: B[i].name }; }
    const first12 = S.slice(0, 12), resid = first12.reduce((s, x) => s + Math.max(0, x.resid || 0), 0), turfF = Math.max(...first12.map(x => (x.feet.L.Fy > 0 ? x.feet.L.Fy : 0) + (x.feet.R.Fy > 0 ? x.feet.R.Fy : 0)));
    res.promotion = { HG: { pass: Ca.handoff.pass, fails: Ca.handoff.fails, HGAshiftMs: Ca.handoff.shiftMs, P14: Ca.handoff.P14, P15: Ca.handoff.P15, P16: Ca.handoff.P16, P17: Ca.handoff.P17 },
      PR2v2: { mm: f2(pr2.d * 1000), body: pr2.body, pass: pr2.d <= 0.003 }, PR3: { residualPlusJ: f4(resid), pass: resid <= 0.5 }, PR4: { manifoldsFirst50ms: first12.reduce((s, x) => s + x.manifolds, 0), turfForceMaxN: f2(turfF), limitN: f2(2 * Mt * G), pass: first12.every(x => x.manifolds === 0) && turfF <= 2 * Mt * G },
      PR5: { writes: Ca.promotionWrites, after: Ca.writesAfter, pass: Ca.promotionWrites === 28 && Ca.writesAfter === 0 } }; }
  // ── §4.1 pre-contact coherence (frozen set) + NM-2 B budget over PRE ──
  { const tEnd = contact ? firstA2 : (Ca.recEntry != null ? Ca.recEntry + 1e-9 : Ca.tRef), win = Ca.ticks.filter(t => t.tau >= tauP + 1 - 1e-9 && t.tau < tEnd - 1e-9), first = {};
    const rows = { RC4h: t => t.pelHratio >= 0.85, RC4t: t => t.tiltDeg <= 20, CG4sim: t => t.legSimMm == null || t.legSimMm <= 100, CG2: t => t.feet.L.cg2 && t.feet.R.cg2, P12: t => t.marginDeg >= 0, NM2slip: t => t.slipMm <= 10 };
    for (const t of win) for (const [k, f] of Object.entries(rows)) if (!(k in first) && !f(t)) first[k] = t.tau;
    const pre = S.filter(s => s.tau < tEnd - 1e-9), ax = { x: [], z: [], rx: [], ry: [], rz: [] }; let sat = 0;
    for (const s of pre) { const F = V.sc(s.B.J, 1 / dt), T = V.sc(s.B.H, 1 / dt), fr = { x: Math.abs(F[0]) / CAP.h, z: Math.abs(F[2]) / CAP.h, rx: Math.abs(T[0]) / CAP.T, ry: Math.abs(T[1]) / CAP.T, rz: Math.abs(T[2]) / CAP.T }; for (const k in ax) ax[k].push(fr[k]); if (Object.values(fr).some(v => v >= 0.99)) sat++; }
    const Bmean = Object.fromEntries(Object.entries(ax).map(([k, v]) => [k, f4(mean(v))])), Bsat = pre.length ? sat / pre.length : 0;
    const maxOf = (k) => Math.max(...win.map(t => t[k] ?? -Infinity)), minOf = (k) => Math.min(...win.map(t => t[k] ?? Infinity));
    res.coherence = { window: [tauP + 1, tEnd], ticks: win.length, firstFail: first, values: { pelHratioMin: f4(minOf("pelHratio")), tiltMaxDeg: f2(maxOf("tiltDeg")), legSimMaxMm: f2(maxOf("legSimMm")), marginMinDeg: f2(minOf("marginDeg")), slipMaxMm: f2(maxOf("slipMm")), slipOldMaxMm: f2(maxOf("slipOldMm")), presLegSimMaxMm: f2(maxOf("presLegSimMm")) },
      B: { meanFrac: Bmean, satFrac: f4(Bsat), verticalAxis: "released (motor off)" }, pass: Object.keys(first).length === 0 && Object.values(Bmean).every(v => v <= 0.25) && Bsat <= 0.05 }; }
  // ── §4.2 critical criterion (vs the no-tackler counterpart) ──
  const crit = {}; if (Fa) { const n = Math.min(Ca.digests.length, Fa.digests.length), tc = Ca.firstManifoldTau != null ? Ca.firstManifoldTau : Infinity;
    let d1 = null, d2 = null; for (let i = 0; i < n; i++) { const a = Ca.digests[i], b = Fa.digests[i], tau = S[i].tau; if (tau < tc - 1e-9 && d1 == null && (a.state !== b.state || a.cmd !== b.cmd || a.carrier !== b.carrier)) d1 = tau; if (d2 == null && a.carrier !== b.carrier) d2 = tau; }
    crit[1] = { tManifold: Ca.firstManifoldTau, stepsCompared: S.filter(s => s.tau < tc - 1e-9).length, firstDifference: d1, pass: d1 == null && Ca.digests.length === Fa.digests.length };
    // 2(c): posture-gain exceedance events (contact > counterpart), with the foot-contact state
    const ev2c = []; for (let i = 0; i < n; i++) { const a = S[i], b = Fa.stepsLog[i]; const mb = new Map(b.ax.map(x => [x[0] * 3 + x[1], x])); for (const x of a.ax) { const y = mb.get(x[0] * 3 + x[1]); if (y && x[10] > y[10] * (1 + 1e-9) + 1e-12) { ev2c.push({ tau: a.tau, joint: M.L.spec.joints[x[0]].name, axis: x[1], Kc: f2(x[10]), Kf: f2(y[10]), contactFlags: [a.contactFlags, b.contactFlags] }); } } }
    const joints2c = [...new Set(ev2c.map(e => e.joint))];
    crit[2] = { a_carrierStreamIdenticalAllSteps: d2 == null, a_firstDifference: d2, b_recomputed: { contact: Ca.check2b, counterpart: Fa.check2b }, c_gainExceedanceSteps: ev2c.length, c_joints: joints2c, c_first: ev2c[0] || null, pass: d2 == null && Ca.check2b.pass && Fa.check2b.pass };
    // contact events (A2 steps clustered; gaps >= 0.10 s start a new event)
    const evs = []; for (const a of Ca.A2) { const last = evs[evs.length - 1]; if (last && a.tau - last.t1 < 6 - 1e-9) last.t1 = a.tau; else evs.push({ t0: a.tau, t1: a.tau, first: a }); }
    const stepAt = (run, tau) => run.stepsLog.find(s => Math.abs(s.tau - tau) < 1e-9), sum3 = (arr) => arr.reduce((s, x) => V.add(s, x), [0, 0, 0]);
    const momB = (s) => { const pel = body(s, 0).com, c = s.com; return V.add(s.B.H, V.cross(V.sub(pel, c), s.B.J)); };
    const evRes = evs.map(e => { const steps = S.filter(s => s.tau >= e.t0 - 1e-9 && s.tau <= e.t0 + 6 + 1e-9), Jtr = sum3(steps.map(s => s.Jr)), Htr = sum3(steps.map(s => s.Hr));
      const dJB = sum3(steps.map(s => V.sub(s.B.J, stepAt(Fa, s.tau).B.J))), dHB = sum3(steps.map(s => V.sub(momB(s), momB(stepAt(Fa, s.tau))))), jn = V.len(Jtr), hn = V.len(Htr);
      const oppJ = jn > 0 ? Math.max(0, -V.dot(dJB, V.sc(Jtr, 1 / jn))) : 0, oppH = hn > 0 ? Math.max(0, -V.dot(dHB, V.sc(Htr, 1 / hn))) : 0;
      const c0 = e.first.contacts[0], sb = c0.body, s0 = stepAt(Ca, e.t0), f0 = stepAt(Fa, e.t0), ib = sb ? bi(sb) : -1;
      const dv = ib >= 0 ? V.sub(body(s0, ib).v, body(f0, ib).v) : null, side = sb ? sb.slice(-1) : null, foot = side ? bi("foot_" + side) : -1;
      let footDev = 0; for (const s of Ca.stepsLog.filter(s => s.tau >= e.t0 - 1e-9 && s.tau <= e.t0 + 9 + 1e-9)) { const g = stepAt(Fa, s.tau); if (g && foot >= 0) footDev = Math.max(footDev, V.dist(body(s, foot).pos, body(g, foot).pos)); }
      const nrm = c0.normal, a2v = dv && nrm ? ang(dv, nrm) : null;
      return { t0: e.t0, t1: e.t1, standInSeg: c0.seg, runnerBody: sb, point: c0.pts ? V.sc(sum3(c0.pts), 1 / c0.pts.length).map(f4) : null, normal: nrm ? nrm.map(f4) : null, transferredImpulseNs: f4(jn), transferred: Jtr.map(f4), angularImpulseNms: f4(hn),
        RC3: { BopposingLinearNs: f4(oppJ), BopposingAngularNms: f4(oppH), pass: oppJ <= 0.5 * jn + 1e-12 && oppH <= 0.5 * hn + 1e-12 },
        RC2: { struckDvMs: dv ? f4(V.len(dv)) : null, dvVsNormalDeg: f2(a2v), struckFootDevMm: f2(footDev * 1000), pass: !!dv && V.len(dv) >= 0.2 && a2v != null && a2v <= 45 && footDev >= 0.030 } }; });
    // 3(d): momentum difference and ledger at t_c + 0.05 / 0.10 / 0.25 s
    const ledger = []; if (evs.length) { const t0 = evs[0].t0; for (const dtk of [3, 6, 15]) { const tt = t0 + dtk, upto = S.filter(s => s.tau >= t0 - 1e-9 && s.tau <= tt + 1e-9), sc = stepAt(Ca, tt), sf = stepAt(Fa, tt); if (!sc || !sf) continue;
      const dP = V.sub(sc.P, sf.P), dL = V.sub(sc.L, sf.L), Jtr = sum3(upto.map(s => s.Jr)), dJB = sum3(upto.map(s => V.sub(s.B.J, stepAt(Fa, s.tau).B.J))), jn = V.len(Jtr);
      ledger.push({ tAfterS: f4(dtk / 60), dP: dP.map(f4), dPnorm: f4(V.len(dP)), dL: dL.map(f4), dLnorm: f4(V.len(dL)), contactImpulse: Jtr.map(f4), dB: dJB.map(f4), turfAndOther: V.sub(V.sub(dP, Jtr), dJB).map(f4), retainedAlongJ: jn > 0 ? f4(V.dot(dP, Jtr) / (jn * jn)) : null }); } }
    crit[3] = { a_Aidentical: d2 == null, events: evRes, ledger, pass: d2 == null && evRes.every(e => e.RC3.pass && e.RC2.pass) };
    // 4: finite authority only
    let bOver = 0; for (const s of S) { const F = V.sc(s.B.J, 1 / dt), T = V.sc(s.B.H, 1 / dt); bOver = Math.max(bOver, Math.abs(F[0]) - CAP.h, Math.abs(F[2]) - CAP.h, Math.abs(F[1]) - 0, ...T.map(t => Math.abs(t) - CAP.T)); }
    crit[4] = { BcapExcessN: f4(Math.max(0, bOver)), actuatorOverCap: Ca.actOverCap, writesAfter: Ca.writesAfter, pass: bOver <= 1e-3 && Ca.actOverCap === 0 && Ca.writesAfter === 0 && d2 == null };
    if (cs === "rx_planted_leg") { const fa = Ca.fallAt, after = S.filter(s => s.tau > fa + 0.25 + 1e-9), cg = Ca.criteria || {};
      const fl2 = after.every(s => V.len(s.B.J) === 0 && V.len(s.B.H) === 0 && (!s.A || !s.A.on) && !s.car), fl3 = Ca.fallLowTau != null && firstA2 != null && Ca.fallLowTau <= firstA2 + 90 + 1e-9 && Ca.handoffTau != null && Ca.handoffTau <= Ca.tRecSim + 1e-9;
      crit[5] = { FL1: { CG1: cg["CG-1"] ? cg["CG-1"].pass : null, CG3: cg["CG-3"] ? cg["CG-3"].pass : null, pass: !!(cg["CG-1"] && cg["CG-1"].pass && cg["CG-3"] && cg["CG-3"].pass) }, FL2: { fallAt: fa, stepsAfter: after.length, pass: fl2 && Ca.writesAfter === 0 },
        FL3: { pelvisBelow035At: Ca.fallLowTau, deadline: firstA2 != null ? firstA2 + 90 : null, handoffTau: Ca.handoffTau, simRecoveryStartTau: f2(Ca.tRecSim), pass: fl3 }, pass: !!(cg["CG-1"] && cg["CG-1"].pass && cg["CG-3"] && cg["CG-3"].pass) && fl2 && fl3 && Ca.writesAfter === 0 }; }
    if (cs === "rx_miss") { let same = Ca.digests.length === Fa.digests.length; for (let i = 0; same && i < n; i++) same = Ca.digests[i].state === Fa.digests[i].state && Ca.digests[i].cmd === Fa.digests[i].cmd;
      crit[6] = { stateAndCommandIdenticalAllSteps: same, physicalContacts: Ca.A2.length, DG: [Ca.dgTau, Fa.dgTau], pass: same && Ca.A2.length === 0 && Ca.dgTau === Fa.dgTau }; } }
  // 8: determinism (a vs b, separate processes)
  { const same = (x, y) => !!x && !!y && x.digests.length === y.digests.length && x.digests.every((d, i) => d.state === y.digests[i].state && d.cmd === y.digests[i].cmd && d.carrier === y.digests[i].carrier);
    crit[8] = { contact: Cb ? same(Ca, Cb) : null, counterpart: Fb && Fa ? same(Fa, Fb) : null, pass: !!Cb && !!Fb && same(Ca, Cb) && same(Fa, Fb) }; }
  // 9: CPU (b runs; medians per 240 Hz step, ms)
  { const r = Cb || Ca, c = r.cpu, m = (k) => (c[k] ? c[k].medianMs : 0), tot = (k) => (c[k] ? c[k].totalMs : 0), steps = r.steps;
    const per = (k) => f4(tot(k) / steps * 1000);   // mean µs per step
    res.cpu = { run: Cb ? "contact b" : "contact a", steps, meanUsPerStep: { physics: f4((tot("step") + tot("passive") - tot("disturb") + tot("pd") + tot("act") + tot("act2")) / steps * 1000), joltStep: per("step"), passiveTissue: f4((tot("passive") - tot("disturb")) / steps * 1000), postureServo: per("pd"), actuators: f4((tot("act") + tot("act2")) / steps * 1000),
      gaitTargets: f4((tot("law") + tot("ref")) / steps * 1000), inverseDynamics: per("id"), carrierAandBtargets: per("carrier"), recoverySupportBset: per("Bset"), standIn: per("standIn"), measurement: f4((tot("measure") + tot("probe") + tot("harnessMeasure")) / steps * 1000) },
      medianMsPerStep: { joltStep: f4(m("step")), law: f4(m("law")), id: f4(m("id")), carrier: f4(m("carrier")) }, note: "carrier includes the B-target reference evaluations, which are also counted under gaitTargets (law)" }; }
  // §4.3 contact rows
  { const cg = Ca.criteria || {}, rows = {}; for (const [k, v] of Object.entries(cg)) rows[k] = { ...v, pass: v.pass };
    rows["AST-C1"] = { mm: Ca.standIn.trackErrBeforeContactMm, pass: Ca.standIn.ASTC1 }; rows["discontinuity10mm"] = { mm: Ca.standIn.discontinuityMm, pass: Ca.standIn.discontinuityPass, attribution: Ca.standIn.discontinuityPass ? null : "source record: the simulation's slide LEG stops growing abruptly at frame 43 (AST1E_PREREG §5 prediction)" };
    res.contactRows = { rows, decisive: Ca.decisive || null, physicalFirst: Ca.physical, pass: Object.values(rows).every(r => r.pass) }; }
  // §4.4 integrity
  res.integrity = { K0: K0.cases[cs].pass, K4b: K4B[cs] ? K4B[cs].identical && K4B[cs].check2b.pass : null, PR5: res.promotion.PR5.pass, I1: crit[4] ? crit[4].BcapExcessN <= 1e-3 : null, finite: S.every(s => s.bodies.every(b => b.every(Number.isFinite))), pass: K0.cases[cs].pass && !!(K4B[cs] && K4B[cs].identical && K4B[cs].check2b.pass) && res.promotion.PR5.pass && !!(crit[4] && crit[4].BcapExcessN <= 1e-3) };
  // reported: DG, RC-4, outcome, FL-6, energy, bracing, legs' PRE impulse, saturation, feed-forward magnitudes
  { const promoted = Ca.ticks, minH = Math.min(...promoted.map(t => t.pelHratio)), maxTilt = Math.max(...promoted.map(t => t.tiltDeg)), bsatAll = S.filter(s => { const F = V.sc(s.B.J, 1 / dt), T = V.sc(s.B.H, 1 / dt); return Math.abs(F[0]) >= 0.99 * CAP.h || Math.abs(F[2]) >= 0.99 * CAP.h || T.some(t => Math.abs(t) >= 0.99 * CAP.T); }).length / S.length;
    const pelMin = Math.min(...S.map(s => body(s, 0).com[1])), resid = S.reduce((s, x) => s + Math.max(0, x.resid || 0), 0);
    let outcome; if (!contact) outcome = Ca.A2.length ? "touched" : "untouched"; else if (pelMin <= 0.35) outcome = "fall"; else if (minH < 0.85 || maxTilt > 20) outcome = "stumble (RC-4 exceeded, no fall)"; else outcome = "correction (stays within RC-4)";
    const preS = S.filter(s => s.tau < (contact ? firstA2 : Infinity) - 1e-9), vdir = (() => { const r = R.rows[kp]; const v = [r[10], 0, -r[11]], n = V.len(v); return V.sc(v, 1 / n); })();
    const legsPRE = preS.reduce((s, x) => s + V.dot(V.add(x.feet.L.Jc || [0, 0, 0], x.feet.R.Jc || [0, 0, 0]), vdir), 0);
    const maxAbs = (idx) => Math.max(0, ...S.flatMap(s => s.ax.map(x => Math.abs(x[idx] || 0))));
    res.reported = { DG: Ca.DG || null, dgFail: Ca.dgFail, dgTau: Ca.dgTau, RC4: { pelHratioMin: f4(minH), tiltMaxDeg: f2(maxTilt), BsatFracPromoted: f4(bsatAll), pass: minH >= 0.85 && maxTilt <= 20 && bsatAll <= 0.10 },
      outcome, pelvisComMinM: f4(pelMin), handoffTau: Ca.handoffTau, fallAt: Ca.fallAt, FL6: { residualPlusJ: f4(resid), turfPenMaxMm: Ca.turfPenMaxMm, pass: resid <= 5 && Ca.turfPenMaxMm <= 10 },
      legsNetForwardImpulsePRE_Ns: f4(legsPRE), actuatorSatAxisSteps: Ca.actSat, maxAbsIdNm: f2(maxAbs(4)), maxAbsVffNm: f2(maxAbs(3)), stances: Ca.stances, standIn: Ca.standInInfo, smEvents: Ca.smEvents, firstA2, lastA2: Ca.lastA2 }; }
  res.critical = crit;
  const need = [1, 2, 3, 4, 8].concat(cs === "rx_planted_leg" ? [5] : []).concat(cs === "rx_miss" ? [6] : []), critPass = need.every(k => !crit[k] || crit[k].pass) && need.every(k => crit[k] || (k === 3 && !contact));
  res.answerRow = { coherence: res.coherence.pass, contactRows: res.contactRows.pass, critical: critPass, integrity: res.integrity.pass, pass: res.coherence.pass && res.contactRows.pass && critPass && res.integrity.pass };
  out.cases[cs] = res;
  console.log(cs.padEnd(15), "coherence", res.coherence.pass, JSON.stringify(res.coherence.firstFail), "| contact rows", res.contactRows.pass, "| critical", critPass, Object.entries(crit).map(([k, v]) => k + ":" + v.pass).join(" "), "| integrity", res.integrity.pass, "| outcome", res.reported.outcome, "| ANSWER ROW", res.answerRow.pass);
}
// 7: records + gameplay hashes
{ const sums = fs.readFileSync(path.join(ROOT, "promotion_carrier/evidence/records/SHA256SUMS"), "utf8").trim().split("\n").map(l => l.split(/\s+/)); let ok = true;
  for (const [h, f] of sums) if (crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, "promotion_carrier/evidence/records", f))).digest("hex") !== h) ok = false;
  const v = JSON.parse(fs.readFileSync(path.join(SL, "evidence/ast1e_a2/AST1E_VERIFY.json"))); out.criterion7 = { recordsSha256Unchanged: ok, gameplayHashes: v.item5.gameplayHashes, pass: ok && v.item5.pass }; console.log("criterion 7", out.criterion7.pass); }
out.answer = CASES.every(c => out.cases[c] && out.cases[c].answerRow && out.cases[c].answerRow.pass) && out.criterion7.pass && out.K0 && out.K4b;
fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log("PCS-1 answer (frozen rule):", out.answer ? "YES" : "NO");

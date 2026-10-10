// ITS-1 evaluator (ITS1_PREREG.md §7, frozen cb886b14). Reads run outputs; computes PF-0 … PF-7, outcome agreement and the diagnostics. Read-only.
// usage: node its_eval.mjs <runsDir> <repeatDir|-> <out.json> [phase0]
import fs from "fs"; import path from "path"; import zlib from "zlib";
const [DIR, REP, OUT, PHASE] = process.argv.slice(2);
const load = (d, id) => { const f = path.join(d, id + ".json.gz"); return fs.existsSync(f) ? JSON.parse(zlib.gunzipSync(fs.readFileSync(f))) : null; };
const G = 9.81, MG = 73.91 * G, DT = 1 / 240, r4 = (x) => (x == null ? null : +(+x).toFixed(4));
const V = { sub: (a, b) => a.map((x, i) => x - b[i]), add: (a, b) => a.map((x, i) => x + b[i]), dot: (a, b) => a.reduce((s, x, i) => s + x * b[i], 0), len: (a) => Math.hypot(...a), sc: (a, s) => a.map(x => x * s) };
const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, V.dot(a, b) / ((V.len(a) * V.len(b)) || 1)))) * 180 / Math.PI;
const BODIES = ["pelvis", "abdomen", "thorax", "head", "upperArm_L", "forearm_L", "upperArm_R", "forearm_R", "thigh_L", "shank_L", "foot_L", "thigh_R", "shank_R", "foot_R"], bi = (n) => BODIES.indexOf(n);
const body = (o, i) => { const a = o.bodies[i]; return { pos: a.slice(0, 3), rot: a.slice(3, 7), com: a.slice(7, 10), v: a.slice(10, 13), w: a.slice(13, 16) }; };
const qrot = (q, v) => { const [x, y, z, w] = q, u = [x, y, z], t = V.sc([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], 2); return V.add(V.add(v, V.sc(t, w)), [u[1] * t[2] - u[2] * t[1], u[2] * t[0] - u[0] * t[2], u[0] * t[1] - u[1] * t[0]]); };
const at = (r, tau) => r.steps.find(o => Math.abs(o.tau - tau) < 1e-9);
// ── PF-0 (controls, W_valid = [τ_0, τ_0 + 0.15 s]) ──
function pf0(c) { const I = c.init.info, n0 = 12, nV = 36, S = c.steps, side = c.init.side, st = side === "L" ? "L" : "R", w = S.slice(0, nV);
  const nonStanceLow = I.E2.lowestAfter.filter(x => x.body !== "foot_" + side).reduce((m, x) => Math.min(m, x.mm), Infinity);
  const V1 = { nonStanceLowestMm: nonStanceLow, minSelfSepMm: I.E2.minSelfSepMm, pass: nonStanceLow >= 0 && I.E2.minSelfSepMm >= -10 };
  const V2 = { residualMax: I.E3.residualMax, anchorVelMaxMs: I.E3.anchorVelMaxMs, pass: I.E3.residualMax <= 1e-9 && I.E3.anchorVelMaxMs <= 1e-9 };
  const pcMax = Math.max(...S.slice(0, n0).map(s => s.pcMm)), residPlus = S.slice(0, n0).reduce((a, s) => a + Math.max(0, s.resid), 0), jy = Math.max(...S.slice(0, n0).map(s => s.feet[st].Jc[1])), lim = 2 * MG * DT;
  const V3 = { posCorrMaxMm: r4(pcMax), energyResidPlusJ: r4(residPlus), stanceNormalImpulseMaxNs: r4(jy), limitNs: r4(lim), pass: pcMax <= 1 && residPlus <= 0.5 && jy <= lim };
  const manif = w.filter(s => s.feet[st].c).length / w.length, slip = w[w.length - 1].feet[st].slipMm, nonFoot = w.some(s => s.nonFoot.length), pelY0 = c.init.m0.pelvisY, pelMin = Math.min(...w.map(s => s.bodies[0][8]));
  const V4 = { stanceManifoldFrac: r4(manif), slipMm: r4(slip), nonFoot, pelvisYMinOverInit: r4(pelMin / pelY0), finite: c.finite, pass: !nonFoot && manif >= 0.9 && slip <= 10 && pelMin >= 0.85 * pelY0 && c.finite };
  const marg = c.ticks.filter(t => t.tau <= c.init.tau0 + 9 + 1e-9).reduce((m, t) => (t.marginDeg < m.v ? { v: t.marginDeg, who: t.marginWho } : m), { v: Infinity, who: null });
  return { id: c.id, state: c.cfg.st, V1, V2, V3, V4, pass: V1.pass && V2.pass && V3.pass && V4.pass, report: { dyMm: I.E2.dyMm, keDistJ: I.E3.keDistJ, refVComY: r4(I.E3.ref.vComY), refL: I.E3.ref.L.map(r4), jointMarginMinDegWvalid: marg, supportLostTau: c.supportLost ? c.supportLost.tau : null, firstNonFoot: c.firstNonFoot, fallTau: c.fallTau, presDiffMaxMm: { v13: c.init.presentationDiff.v13.maxMm, lc1: c.init.presentationDiff.lc1.maxMm } } }; }
const CTL = { "S-A": "A-ctl", "S-A2": "A2-ctl", "S-B": "B-ctl", "S-B2": "B2-ctl" };
const out = { prereg: "ITS1_PREREG.md cb886b14", pf0: {}, struck: {}, C: {}, diagnostics: {}, determinism: {}, outcome: {} };
for (const [stt, id] of Object.entries(CTL)) { const c = load(DIR, id); out.pf0[id] = c ? pf0(c) : { missing: true, pass: false }; }
out.PF0 = Object.values(out.pf0).every(x => x.pass);
if (PHASE === "phase0") { fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); for (const x of Object.values(out.pf0)) console.log(x.id, x.pass ? "PASS" : "FAIL", JSON.stringify({ V1: x.V1, V2: x.V2.pass, V3: x.V3, V4: x.V4 })); console.log("PF-0", out.PF0 ? "PASS" : "FAIL"); process.exit(0); }
// ── struck runs ──
function rel(r, c, tau, i) { const a = at(r, tau), b = at(c, tau); if (!a || !b) return null; return { r: body(a, i), c: body(b, i) }; }
function struck(r, c) { const tauC = r.authoritative.tauC, lead = r.init.lead, dur = r.cfg.dur, jReq = r.contact.Jrequested, jHat = V.sc(jReq, 1 / V.len(jReq)), i = bi(r.contact.body), tau1 = tauC + dur / 4;
  // PF-1
  const otherExt = V.len(r.impulse.ledgerHext) > 0, PF1 = { steps: r.impulse.steps, durPlanned: dur, devNs: r.impulse.dev, ledgerDevNs: r.impulse.ledgerDev, body: r.contact.body, surfaceDistMm: r.contactAt.surfaceDistMm, nearestOther: r.contactAt.nearestOther, writesAfter: r.writesAfter, otherExternal: otherExt || r.cfg.support,
    pass: r.impulse.steps === dur && r.impulse.dev <= 1e-9 && r.impulse.ledgerDev <= 1e-9 && Math.abs(r.contactAt.surfaceDistMm) <= 20 && r.writesAfter === 0 && !otherExt && !r.cfg.support };
  // PF-2: struck-body COM Δv over the impulse step(s), relative to the control
  const pre = rel(r, c, tauC, i) || (lead === 0 ? null : null), post = rel(r, c, tau1, i); let dv = null, dvAng = null, dvMag = null;
  if (post) { const preR = lead === 0 ? r.init.state[i].v : at(r, tauC) ? body(at(r, tauC), i).v : null, preC = lead === 0 ? c.init.state[i].v : at(c, tauC) ? body(at(c, tauC), i).v : null;
    dv = V.sub(V.sub(post.r.v, preR), V.sub(post.c.v, preC)); dvMag = V.len(dv); dvAng = ang(dv, jReq); }
  // application point deviation vs the control's same body-fixed point, within W_resp
  const pL = r.contact.pLocal; let devMax = 0, devAt = null; for (const o of r.steps) { if (o.tau < tauC - 1e-9 || o.tau > tauC + 9 + 1e-9) continue; const oc = at(c, o.tau); if (!oc) continue; const br = body(o, i), bc = body(oc, i), pr = V.add(br.pos, qrot(br.rot, pL)), pc = V.add(bc.pos, qrot(bc.rot, pL)), d = V.len(V.sub(pr, pc)); if (d > devMax) { devMax = d; devAt = o.tau; } }
  const PF2 = { dvStruckMs: r4(dvMag), dvAngleDeg: r4(dvAng), pointDevMaxMm: r4(devMax * 1000), at: devAt, pass: dvMag != null && dvMag >= 0.2 && dvAng <= 45 && devMax >= 0.030 };
  // PF-3 over W_resp
  const W = r.steps.filter(o => o.tau > tauC - 1e-9 && o.tau <= tauC + 9 + 1e-9), clos = W.filter(o => o.closEval).map(o => o.clos), closMax = clos.length ? Math.max(...clos) : null, closNotEval = W.filter(o => !o.closEval).length;
  const sep = Math.max(...W.map(o => o.sepMm)), e05 = r.steps.filter(o => o.tau > tauC - 1e-9 && o.tau <= tauC + 3 + 1e-9).reduce((a, o) => a + Math.max(0, o.resid), 0), eAll = r.steps.reduce((a, o) => a + Math.max(0, o.resid), 0);
  const PF3 = { closureMaxNs: r4(closMax), closureNotEvaluableSteps: closNotEval, sepMaxMm: r4(sep), energyResidPlus005J: r4(e05), energyResidPlusHorizonJ: r4(eAll), finite: r.finite, turfPenMaxMm: r.turfPenMaxMm, selfPenMaxMm: r.selfPenMaxMm, maxAngVel: r.maxAngVel,
    pass: closMax != null && closMax <= 0.01 && sep <= 1 && e05 <= 0.5 && eAll <= 5 && r.finite && r.turfPenMaxMm <= 10 && r.selfPenMaxMm <= 10 };
  const PF4 = { artificialExternalOtherThanImpulse: r.cfg.support ? "SupportLayer (diagnostic)" : (V.len(r.impulse.ledgerHext) > 0 ? "torque" : "none"), actuatorSatTicks: r.actuators.satTicks, actuatorPeak: r.actuators.peak.slice(0, 4), pass: !r.cfg.support && V.len(r.impulse.ledgerHext) === 0 };
  // collision momentum vs control along the impulse
  const dPrel = (tau) => { const a = at(r, tau), b = at(c, tau); return a && b ? r4(V.dot(V.sub(a.P, b.P), jHat)) : null; };
  const chain = {}; for (const [nm, ix] of [["struck", i], ["pelvis", 0], ["thorax", 2], ["head", 3]]) { let t = null; for (const o of r.steps) { if (o.tau < tauC - 1e-9) continue; const oc = at(c, o.tau); if (!oc) continue; const d = V.len(V.sub(body(o, ix).v, body(oc, ix).v)); if (d >= 0.1) { t = o.tau; break; } } chain[nm] = t; }
  const comRel = (tau) => { const a = at(r, tau), b = at(c, tau); return a && b ? V.sub(a.com, b.com).map(r4) : null; };
  return { id: r.id, state: r.cfg.st, ctl: c.id, PF1, PF2, PF3, PF4, momentumRelAlongJ: { req: r4(V.len(jReq)), afterImpulse: dPrel(tau1), at005: dPrel(tauC + 3), at010: dPrel(tauC + 6), at015: dPrel(tauC + 9), at050: dPrel(tauC + 30) }, chainOnsetTau_dv01: chain,
    comRelAt015: comRel(tauC + 9), comRelAt050: comRel(tauC + 30), supportLost: r.supportLost, ctlSupportLost: c.supportLost, firstNonFoot: r.firstNonFoot, ctlFirstNonFoot: c.firstNonFoot, fallTau: r.fallTau, ctlFallTau: c.fallTau, contactAt: r.contactAt, snaps: r.snaps.map(s => s ? { tau: s.tau, P: s.P, L: s.L } : null), presDiffMaxMm: { v13: r.init.presentationDiff.v13.maxMm, lc1: r.init.presentationDiff.lc1.maxMm } }; }
const PAIRS = [["A", "A-ctl"], ["A2", "A2-ctl"], ["B", "B-ctl"], ["B2", "B2-ctl"], ["C-hi-air", "A2-ctl"], ["C-hi-pl", "B-ctl"], ["C-lo-air", "A2-ctl"], ["C-lo-pl", "B-ctl"], ["D1-A", "D1-A-ctl"], ["D2-A", "A-ctl"], ["D2-B", "B-ctl"], ["D3-A-l0", "D3-A-l0-ctl"], ["D3-A-l4", "D3-A-l4-ctl"], ["D3-B-l0", "D3-B-l0-ctl"], ["D3-B-l4", "D3-B-l4-ctl"]];
const S = {}; for (const [id, cid] of PAIRS) { const r = load(DIR, id), c = load(DIR, cid); if (r && c) S[id] = struck(r, c); }
out.struck = S;
// outcome agreement (report only)
const agreeNoFall = (x) => { const earlierLoss = x.supportLost && (!x.ctlSupportLost || x.supportLost.tau < x.ctlSupportLost.tau - 1e-9), earlierFall = (x.firstNonFoot || x.fallTau != null) && (() => { const t = Math.min(x.firstNonFoot ? x.firstNonFoot.tau : Infinity, x.fallTau ?? Infinity), tc = Math.min(x.ctlFirstNonFoot ? x.ctlFirstNonFoot.tau : Infinity, x.ctlFallTau ?? Infinity); return t < tc - 1e-9; })(); return { agrees: !earlierLoss && !earlierFall, earlierSupportLoss: !!earlierLoss, earlierFall: !!earlierFall }; };
const agreeFall = (x, r) => { const t = Math.min(x.firstNonFoot ? x.firstNonFoot.tau : Infinity, x.fallTau ?? Infinity), tc = Math.min(x.ctlFirstNonFoot ? x.ctlFirstNonFoot.tau : Infinity, x.ctlFallTau ?? Infinity), tauC = r.authoritative.tauC;
  const fs2 = r.authoritative.fallState, simGround = fs2 ? fs2.tGround * 60 : null; return { agrees: !!x.supportLost && t <= tauC + 90 + 1e-9 && t < tc - 1e-9, physFallTau: t === Infinity ? null : t, ctlFallTau: tc === Infinity ? null : tc, supportLostTau: x.supportLost ? x.supportLost.tau : null, simTGroundTau: simGround, simAz: fs2 ? fs2.az : null }; };
for (const id of ["A", "A2"]) if (S[id]) out.outcome[id] = { authoritative: id === "A" ? "STUMBLE" : "CORRECTION", ...agreeNoFall(S[id]) };
for (const id of ["B", "B2"]) if (S[id]) { const r = load(DIR, id), c = load(DIR, id + "-ctl"), x = S[id], ag = agreeFall(x, r); let dirAng = null; if (ag.physFallTau != null) { const a = at(r, ag.physFallTau), a0 = at(r, r.authoritative.tauC), b = at(c, ag.physFallTau); if (a && a0) { const d = V.sub(a.com, a0.com), dh = [d[0], 0, d[2]]; dirAng = r4(ang(dh, r.contact.Jrequested)); } } out.outcome[id] = { authoritative: "FALL SIDE", ...ag, fallDisplacementVsImpulseDeg: dirAng }; }
// PF-7 matched comparison
function pf7(air, pl) { const a = S[air], p = S[pl], ra = load(DIR, air), rp = load(DIR, pl); if (!a || !p) return null;
  const idA = { imp: ra.contact.Jrequested, pLocal: ra.contact.pLocal, body: ra.contact.body, dur: ra.cfg.dur, hor: ra.cfg.hor }, idP = { imp: rp.contact.Jrequested, pLocal: rp.contact.pLocal, body: rp.contact.body, dur: rp.cfg.dur, hor: rp.cfg.hor };
  const identity = JSON.stringify(idA) === JSON.stringify(idP) && ra.configHash === rp.configHash;
  const meff = (x, r) => { const i = bi(r.contact.body), tauC = r.authoritative.tauC, c = load(DIR, x.ctl), pL = r.contact.pLocal, jHat = V.sc(r.contact.Jrequested, 1 / V.len(r.contact.Jrequested));
    const vp = (o) => { const b = body(o, i), rr = qrot(b.rot, pL), wx = [b.w[1] * rr[2] - b.w[2] * rr[1], b.w[2] * rr[0] - b.w[0] * rr[2], b.w[0] * rr[1] - b.w[1] * rr[0]]; return V.add(b.v, wx); };
    const o0 = at(r, tauC), o1 = at(r, tauC + 0.25), c0 = at(c, tauC), c1 = at(c, tauC + 0.25), dvp = V.dot(V.sub(V.sub(vp(o1), vp(o0)), V.sub(vp(c1), vp(c0))), jHat); return { dvPointAlongJ: r4(dvp), meffKg: r4(V.len(r.contact.Jrequested) / dvp) }; };
  const ma = meff(a, ra), mp = meff(p, rp), d1 = Math.abs(ma.meffKg - mp.meffKg) / Math.min(Math.abs(ma.meffKg), Math.abs(mp.meffKg));
  const lossIn = (x, tauC) => x.supportLost && x.supportLost.tau <= tauC + 30 + 1e-9, ctlLoss = (x) => (x.ctlSupportLost ? x.ctlSupportLost.tau : Infinity);
  const keepsAsCtl = (x, tauC) => !x.supportLost || x.supportLost.tau >= Math.min(ctlLoss(x), tauC + 30) - 3 - 1e-9;
  const S2 = (lossIn(p, rp.authoritative.tauC) && keepsAsCtl(a, ra.authoritative.tauC)) || (lossIn(a, ra.authoritative.tauC) && keepsAsCtl(p, rp.authoritative.tauC));
  const pelRel = (x, r) => { const c = load(DIR, x.ctl), tauC = r.authoritative.tauC, jHat = V.sc(r.contact.Jrequested, 1 / V.len(r.contact.Jrequested)), o0 = at(r, tauC), o1 = at(r, tauC + 6), c0 = at(c, tauC), c1 = at(c, tauC + 6); return V.dot(V.sub(V.sub(body(o1, 0).v, body(o0, 0).v), V.sub(body(c1, 0).v, body(c0, 0).v)), jHat); };
  const pa = pelRel(a, ra), pp = pelRel(p, rp), d3 = Math.abs(pa - pp) / Math.max(1e-9, Math.min(Math.abs(pa), Math.abs(pp)));
  const s = { S1: { air: ma, planted: mp, relDiff: r4(d1), pass: d1 >= 0.25 }, S2: { airSupportLost: a.supportLost, airCtlSupportLost: a.ctlSupportLost, plantedSupportLost: p.supportLost, plantedCtlSupportLost: p.ctlSupportLost, pass: !!S2 }, S3: { airPelvisDvAlongJ010: r4(pa), plantedPelvisDvAlongJ010: r4(pp), relDiff: r4(d3), pass: d3 >= 0.25 } };
  const nDiff = [s.S1.pass, s.S2.pass, s.S3.pass].filter(Boolean).length; return { identity, idAir: idA, idPlanted: idP, configHash: [ra.configHash, rp.configHash], ...s, nDiff, pass: identity && nDiff >= 2 }; }
out.C = { hi: pf7("C-hi-air", "C-hi-pl"), lo: pf7("C-lo-air", "C-lo-pl") };
// determinism (repeat dir) + history independence
if (REP && REP !== "-") { for (const id of ["A-ctl", "A2-ctl", "B-ctl", "B2-ctl", "A", "A2", "B", "B2", "C-hi-air", "C-hi-pl", "C-lo-air", "C-lo-pl"]) { const a = load(DIR, id), b = load(REP, id); if (!a || !b) { out.determinism[id] = { missing: true }; continue; }
    out.determinism[id] = { steps: a.digests.length, digestsIdentical: JSON.stringify(a.digests) === JSON.stringify(b.digests), outputHashes: [a.outputHash, b.outputHash], pass: JSON.stringify(a.digests) === JSON.stringify(b.digests) && a.outputHash === b.outputHash }; }
  const seqF = fs.readdirSync(REP).find(f => f.startsWith("SEQUENCE_")); if (seqF) { const seq = JSON.parse(fs.readFileSync(path.join(REP, seqF))); out.determinism.historyIndependence = seq.map(x => { const a = load(DIR, x.id); return { id: x.id, seqOutputHash: x.outputHash, freshOutputHash: a ? a.outputHash : null, pass: !!a && a.outputHash === x.outputHash }; }); } }
// C-hi-pl vs B over the common horizon (both are S-B + the same impulse; B's own impulse = 144.13·n_B at the same point)
{ const b = load(DIR, "B"), ch = load(DIR, "C-hi-pl"); if (b && ch) { const n = Math.min(b.digests.length, ch.digests.length); out.determinism.ChiPl_vs_B_commonSteps = { n, identical: JSON.stringify(b.digests.slice(0, n)) === JSON.stringify(ch.digests.slice(0, n)), note: "identical only if the matched point / vector equal B's authoritative ones exactly" }; } }
const prim = ["A", "A2", "B", "B2", "C-hi-air", "C-hi-pl", "C-lo-air", "C-lo-pl"];
out.summary = { PF0: out.PF0, PF1: prim.every(id => S[id] && S[id].PF1.pass), PF2: ["A", "A2", "B", "B2"].every(id => S[id] && S[id].PF2.pass), PF3: prim.every(id => S[id] && S[id].PF3.pass), PF4: prim.every(id => S[id] && S[id].PF4.pass),
  PF5: Object.entries(out.determinism).filter(([k]) => !["historyIndependence", "ChiPl_vs_B_commonSteps"].includes(k)).every(([, v]) => v.pass) && (out.determinism.historyIndependence || [{ pass: false }]).every(x => x.pass), PF7: !!(out.C.hi && out.C.hi.pass && out.C.lo && out.C.lo.pass) };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out.summary));

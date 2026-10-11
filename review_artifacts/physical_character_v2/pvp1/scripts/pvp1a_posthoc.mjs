// PVP-1A-DX POST-HOC ANALYSIS (labelled post-hoc; changes no frozen result): per-step series for the review page and the outcome-evaluator audit.
//  (1) series N2 vs C0 (and X2): runner / tackler COM displacement and velocity, runner foot loads, cross impulse, swept-foot travel, XcoM error.
//  (2) OC-3 audit: the frozen evaluator applied to C0 and to the pre-contact state (does it discriminate?); the contact-induced change Δe (N2 − C0);
//      the simulation's own decomposition of its e0 (static offset vs contact-velocity term, from its recorded err vector) and a POST-HOC reading
//      e_adj = (simulation static term) + (physical contact-induced Δe), classified by the same law — explicitly not a frozen criterion.
// usage: V2_KNEE_MODEL=v2k node pvp1a_posthoc.mjs <runs dir> <out.json>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const PL = await import(new URL("./pvp1a_lib.mjs", import.meta.url).href), { PV, V, Q } = PL;
const [RUNS, OUT] = process.argv.slice(2), rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(RUNS, f)))), C0 = rd("C0.json.gz"), N2 = rd("N2.json.gz"), X2 = rd("X2.json.gz");
const sR = PL.SPEC_R(), sT = PL.SPEC_T(), nR = 14, bi = (s, n) => s.bodies.findIndex(b => b.name === n), toP = (l) => [l[0] + 50, 34 - l[2]], { SC } = PL.records();
const com = (spec, S) => { const M = spec.bodies.reduce((a, b) => a + b.mass, 0); return { c: V.sc(S.reduce((a, s, i) => V.add(a, V.sc(s.com, spec.bodies[i].mass)), [0, 0, 0]), 1 / M), v: V.sc(S.reduce((a, s, i) => V.add(a, V.sc(s.v, spec.bodies[i].mass)), [0, 0, 0]), 1 / M) }; };
const eVec = (S) => { const { c, v } = com(sR, S), a = S[bi(sR, "foot_L")].pos, ch = toP(c), vh = [v[0], -v[2]], ah = toP(a); return [ch[0] + vh[0] / PV.oc.omega0 - ah[0], ch[1] + vh[1] / PV.oc.omega0 - ah[1]]; };
const r4 = (x) => Math.round(x * 1e4) / 1e4, r4v = (v) => v.map(r4);
const series = []; const fR = bi(sR, "foot_R");
for (let k = 0; k < PV.steps; k++) { const a = N2.recs[k], b = C0.recs[k], x = X2.recs[k], SA = a.S.slice(0, nR), SB = b.S.slice(0, nR), SX = x.S.slice(0, nR);
  const ca = com(sR, SA), cb = com(sR, SB), cx = com(sR, SX), ta = com(sT, a.S.slice(nR)), tb = com(sT, b.S.slice(nR)), tx = com(sT, x.S.slice(nR)), ea = eVec(SA), eb = eVec(SB);
  series.push({ n: a.n, tau: a.tau, runnerComDispMm: r4v(V.sc(V.sub(ca.c, cb.c), 1000)), runnerComDispX2Mm: r4v(V.sc(V.sub(cx.c, cb.c), 1000)), runnerV: r4v(ca.v), runnerVC0: r4v(cb.v), tacklerV: r4v(ta.v), tacklerVC0: r4v(tb.v), tacklerVX2: r4v(tx.v),
    feetN2: { L: r4(a.chars.runner.feet.L), R: r4(a.chars.runner.feet.R) }, feetC0: { L: r4(b.chars.runner.feet.L), R: r4(b.chars.runner.feet.R) }, crossJ: r4(a.contacts.filter(c => c.kind === "cross").reduce((s, c) => s + Math.hypot(...c.J2), 0)),
    sweptFootMm: r4v(V.sc(V.sub(SA[fR].pos, SB[fR].pos), 1000)), eN2: r4(Math.hypot(...ea)), eC0: r4(Math.hypot(...eb)), eN2vec: r4v(ea), eC0vec: r4v(eb), pelvisDropMm: r4((SB[0].com[1] - SA[0].com[1]) * 1000), nonFoot: a.chars.runner.nonFootTurf }); }
// OC-3 audit
const fc = N2.recs.find(r => r.contacts.some(c => c.kind === "cross" && Math.hypot(...c.J2) >= PV.contactNs)).n, nStar = fc + Math.ceil(PV.oc.tSup / PV.h - 1e-9);
const at = (run, n) => run.recs[n - 1].S.slice(0, nR), eN = eVec(at(N2, nStar)), eC = eVec(at(C0, nStar)), dE = [eN[0] - eC[0], eN[1] - eC[1]];
const errSim = SC.authoritativeOutcome.reactionStates[0].state.err, dec = SC.authoritativeOutcome.events.find(e => e.kind === "PLAYER_CONTACT");
const grow = Math.exp(PV.oc.omega0 * dec.tSup), dvSim = [dec.dvCom * dec.normal[0], dec.dvCom * dec.normal[1]], dvTermSim = V.sc(dvSim, grow / PV.oc.omega0).slice(0, 2), staticSim = [errSim[0] - dvTermSim[0], errSim[1] - dvTermSim[1]];
const eAdj = [staticSim[0] + dE[0], staticSim[1] + dE[1]];
const out = { tool: "pvp1a_posthoc.mjs", label: "POST-HOC — not a frozen criterion; does not change the DX or PVP-1A result", firstContactStep: fc, nStar,
  oc3Audit: { frozenOnN2: PL.balanceLaw(eN), frozenOnC0SameStep: PL.balanceLaw(eC), frozenOnPreContactStep1: PL.balanceLaw(eVec(N2.recs[0].S.slice(0, nR))),
    note: "the frozen OC-3 classifies the no-contact control and the pre-contact standing state as FALL too: it cannot discriminate in this case (static COM-to-left-ankle offset ≈ 0.22 m + obstacle 0.139 m ≥ the 0.352 m boundary)",
    simulationDecomposition: { errVector: errSim, contactVelocityTerm: r4v(dvTermSim), staticTerm: r4v(staticSim), staticMagnitude: r4(Math.hypot(...staticSim)) },
    physicalContactInducedDeltaE: r4v(dE), deltaEMagnitude: r4(Math.hypot(...dE)), simulationContactTerm: r4(Math.hypot(...dvTermSim)),
    postHocAdjusted: { eAdj: r4v(eAdj), law: PL.balanceLaw(eAdj), meaning: "the simulation's own static term + the physically measured contact-induced XcoM change, classified by the simulation's law" } },
  series };
fs.writeFileSync(OUT, JSON.stringify(out)); const A = out.oc3Audit;
console.log("frozen OC-3: N2", A.frozenOnN2.cls, A.frozenOnN2.eH.toFixed(3), "| C0 same step", A.frozenOnC0SameStep.cls, A.frozenOnC0SameStep.eH.toFixed(3), "| pre-contact", A.frozenOnPreContactStep1.cls, A.frozenOnPreContactStep1.eH.toFixed(3));
console.log("sim decomposition: static", JSON.stringify(A.simulationDecomposition.staticTerm), "|static|", A.simulationDecomposition.staticMagnitude, "contact term", JSON.stringify(A.simulationDecomposition.contactVelocityTerm), "|", A.simulationContactTerm);
console.log("physical Δe", JSON.stringify(A.physicalContactInducedDeltaE), "|Δe|", A.deltaEMagnitude, "→ post-hoc e_adj", JSON.stringify(A.postHocAdjusted.eAdj), A.postHocAdjusted.law.cls, "eH", A.postHocAdjusted.law.eH.toFixed(3), "rc", A.postHocAdjusted.law.rc.toFixed(3), "steps", A.postHocAdjusted.law.steps);

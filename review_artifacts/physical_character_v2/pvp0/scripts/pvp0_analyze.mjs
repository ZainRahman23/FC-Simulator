// PVP-0 analysis (read-only, from the run records): per strength, against the recipient's TWIN (the same world with the tackler parked):
// first cross contact (step, body pair), peak / total cross impulse and force, peak penetration (cross, self, turf), equal-and-opposite check,
// momentum / energy ledger closure (system and per character), recipient COM / pelvis response and fall, propagation timing along the struck chain
// (shank → thigh → pelvis → thorax: first time the segment's angular-velocity deviation from the twin exceeds 0.5 rad/s), tackler COM response,
// M1b saturation (activation ≥ 0.99) and strain-arm yield, tracking error, joint hard-limit excess, foot support, CPU. Ledgers exclude the record of
// step activate+1, which carries the tackler's one-time initial-condition velocity write (made before that world step).
// usage (worktree root): node .../pvp0_analyze.mjs --dir <records dir> --out <json>
import fs from "fs"; import zlib from "zlib"; import path from "path";
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q } = PL, SR = PL.SPEC_R(), ST = PL.SPEC_T();
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, DIR = arg("dir"), load = (k) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DIR, k + ".json.gz"))));
const H = 1 / 240, bR = (n) => SR.bodies.findIndex(b => b.name === n), bT = (n) => 14 + ST.bodies.findIndex(b => b.name === n), MR = 73.91, MT = ST.bodies.reduce((s, b) => s + b.mass, 0);
const pitch = (rot) => { const f = Q.rot(rot, [0, 1, 0]); return Math.atan2(Math.hypot(f[0], f[2]), f[1]) * 180 / Math.PI; };
const TW = load("TWIN"), out = { twin: { hash: TW.finalHash }, cases: {} };
for (const cse of ["LIGHT", "NOMINAL", "HEAVY"]) { const o = load(cse), R = o.recs, n = Math.min(R.length, TW.recs.length), A = o.setup.activate;
  let peakPenPair = null, first = null, peakJ = { J: 0, step: null }, totJ = [0, 0, 0], peakPen = 0, peakPenStep = null, pairs = {}, eq = 0, eqH = 0, lin = 0, ang = 0, linR = 0, linT = 0, angR = 0, angT = 0, eRes = 0, selfR = 0, selfT = 0, turfR = 0, turfT = 0, hardR = 0, hardT = 0;
  for (let q = 0; q < n; q++) { const r = R[q], cross = (r.contacts || []).filter(m => m.kind === "cross");
    if (cross.length) { const Jstep = cross.reduce((s, m) => V.add(s, m.a[0] === "runner" ? V.sc(m.J2, -1) : m.J2), [0, 0, 0]); // impulse ON the recipient this step
      if (!first && cross.some(m => m.Jn > 0)) { const m = cross.find(x => x.Jn > 0), rb = m.a[0] === "runner" ? m.a[1] : m.b[1], tb = m.a[0] === "tackler" ? m.a[1] : m.b[1]; first = { step: r.n, t: +(r.n * H).toFixed(4), sinceActivationS: +((r.n - A) * H).toFixed(4), recipientBody: rb, tacklerBody: tb, point: m.points[0].p, normal: m.n }; }
      totJ = V.add(totJ, Jstep); const jm = V.len(Jstep); if (jm > peakJ.J) peakJ = { J: jm, step: r.n, forceN: jm / H };
      for (const m of cross) { const k = [m.a, m.b].map(x => x[0] + "." + x[1]).sort().join(" × "); pairs[k] = (pairs[k] || 0) + m.Jn; } }
    const ci = r.chars.runner.integrity, ti = r.chars.tackler.integrity; if (ci.crossPenMm > peakPen) { peakPen = ci.crossPenMm; peakPenStep = r.n; const mm = cross.reduce((b, m) => { const d = Math.max(...m.points.map(p => p.depth)); return d > b.d ? { d, k: m.a[1] + " × " + m.b[1] } : b; }, { d: -1, k: null }); peakPenPair = mm.k; }
    selfR = Math.max(selfR, ci.selfPenMm); selfT = Math.max(selfT, ti.selfPenMm); turfR = Math.max(turfR, ci.turfPenMm); turfT = Math.max(turfT, ti.turfPenMm); hardR = Math.max(hardR, ci.hardExcDeg); hardT = Math.max(hardT, ti.hardExcDeg);
    if (r.eqOpp) { eq = Math.max(eq, r.eqOpp.dJ); eqH = Math.max(eqH, r.eqOpp.dH); }
    if (r.n > A + 1) { lin = Math.max(lin, V.len(r.system.linRes)); ang = Math.max(ang, V.len(r.system.angRes)); eRes = Math.max(eRes, Math.abs(r.system.energyRes)); linR = Math.max(linR, V.len(r.chars.runner.linRes)); linT = Math.max(linT, V.len(r.chars.tackler.linRes)); angR = Math.max(angR, V.len(r.chars.runner.angRes)); angT = Math.max(angT, V.len(r.chars.tackler.angRes)); } }
  // recipient response vs twin
  const rc = (q) => R[q].chars.runner, tc = (q) => TW.recs[q].chars.runner; let comPk = 0, comPkT = null, dropPk = 0, fallAt = null, vPk = 0; const y0 = TW.recs[A].S[0].pos[1];
  for (let q = A; q < n; q++) { const d = V.len(V.sub(rc(q).com, tc(q).com)); if (d > comPk) { comPk = d; comPkT = (q - A) * H; } const dv = V.len(V.sub(V.sc(rc(q).P, 1 / MR), V.sc(tc(q).P, 1 / MR))); vPk = Math.max(vPk, dv);
    const drop = TW.recs[q].S[0].pos[1] - R[q].S[0].pos[1]; dropPk = Math.max(dropPk, drop); if (fallAt == null && drop > 0.15) fallAt = +((q - A) * H).toFixed(3); }
  const qe = n - 1, end = { comOffsetMm: +(V.len(V.sub(rc(qe).com, tc(qe).com)) * 1000).toFixed(1), pelvisDropMm: +((TW.recs[qe].S[0].pos[1] - R[qe].S[0].pos[1]) * 1000).toFixed(1), pelvisHeightM: +R[qe].S[0].pos[1].toFixed(3), trunkTiltDeg: +pitch(R[qe].S[bR("thorax")].rot).toFixed(1), feetN: [+(rc(qe).feet.L * 240).toFixed(0), +(rc(qe).feet.R * 240).toFixed(0)], nonFootTurf: [...new Set(rc(qe).nonFootTurf)] };
  // propagation along the struck chain (by the first-contact body side)
  const side = first && /_R$/.test(first.recipientBody) ? "R" : "L", chain = [`shank_${side}`, `thigh_${side}`, "pelvis", "abdomen", "thorax", "head"], prop = {};
  for (const b of chain) { const i = bR(b); for (let q = A; q < n; q++) { const dw = V.len(V.sub(R[q].S[i].w, TW.recs[q].S[i].w)); if (dw > 0.5) { prop[b] = +((R[q].n - (first ? first.step : A)) * 1000 * H).toFixed(1); break; } } }
  // struck-leg yield: joint-angle deviation from the twin (deg) — knee, ankle, hip of the struck side, peak over the first 0.5 s after first contact
  const jk = (nm) => SR.joints.findIndex(j => j.name === nm), dev = {}; if (first) for (const nm of [`ankle_${side}`, `knee_${side}`, `hip_${side}`]) { const k = jk(nm); let pk = 0; for (let q = first.step; q < Math.min(n, first.step + 120); q++) for (let i = 0; i < 3; i++) pk = Math.max(pk, Math.abs(R[q].chars.runner.th[k][i] - TW.recs[q].chars.runner.th[k][i]) * 180 / Math.PI); dev[nm] = +pk.toFixed(1); }
  // tackler COM response at contact: velocity 25 ms before first contact and 100 ms after
  const tv = (q) => V.sc(R[q].chars.tackler.P, 1 / MT), qf = first ? first.step - 1 : A; const vb = tv(Math.max(0, qf - 6)), va = tv(Math.min(n - 1, qf + 24));
  // M1b saturation / yield from law rows ([k,i,τ_intent,u+,u−,a+,a−,...])
  const sat = (rows) => (rows || []).filter(x => x[5] >= 0.99 || x[6] >= 0.99).length; let satR = 0, satT = 0, satRmax = 0, satTmax = 0;
  for (let q = A; q < n; q++) { const s1 = sat(R[q].law), s2 = sat(R[q].lawT); satR += s1 > 0; satT += s2 > 0; satRmax = Math.max(satRmax, s1); satTmax = Math.max(satTmax, s2); }
  const te = o.trackerLog, errAt = (t) => { const q = A + Math.round(t * 240), i = te.n.indexOf(q); return i >= 0 ? te.errDeg[i] : null; };
  // tackler fate: pelvis height / COM at the end
  const tEnd = { comM: R[qe].chars.tackler.com.map(v => +v.toFixed(2)), speedMs: +V.len(tv(qe)).toFixed(2), pelvisHeightM: +R[qe].S[14].pos[1].toFixed(3) };
  out.cases[cse] = { speedFactor: o.speedFactor, approachSpeedMs: +Math.hypot(o.tacklerVcom[0], o.tacklerVcom[2]).toFixed(2), offset: o.offset, hash: o.finalHash, wallMs: Math.round(o.wallMs), stepsPerS: Math.round(n / (o.wallMs / 1000)),
    firstContact: first, contactPairsImpulseNs: Object.fromEntries(Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => [k, +v.toFixed(2)])), peakStepImpulseNs: +peakJ.J.toFixed(3), peakForceN: Math.round(peakJ.forceN || 0), peakAtStep: peakJ.step,
    totalCrossImpulseOnRecipientNs: totJ.map(v => +v.toFixed(2)), peakCrossPenMm: +peakPen.toFixed(2), peakCrossPenStep: peakPenStep, peakCrossPenPair: peakPenPair, selfPenMm: [+selfR.toFixed(2), +selfT.toFixed(2)], turfPenMm: [+turfR.toFixed(2), +turfT.toFixed(2)],
    eqOppMax: { dJ: eq, dH: eqH }, ledgerMax: { systemLin: lin, systemAng: ang, systemEnergy: eRes, recipientLin: linR, tacklerLin: linT, recipientAng: angR, tacklerAng: angT },
    recipient: { comPeakDevMm: +(comPk * 1000).toFixed(1), comPeakAtS: comPkT != null ? +comPkT.toFixed(2) : null, comVelPeakDevMs: +vPk.toFixed(3), pelvisDropPeakMm: +(dropPk * 1000).toFixed(1), fallAtSAfterActivation: fallAt, end, struckLegPeakDevDeg: dev, propagationMsAfterContact: prop, slips: o.slips.recipient, satSteps: satR, satAxesMax: satRmax, hardLimitExcessDeg: +hardR.toFixed(2) },
    tackler: { vBefore: vb.map(v => +v.toFixed(2)), vAfter100ms: va.map(v => +v.toFixed(2)), dvMs: +V.len(V.sub(va, vb)).toFixed(2), end: tEnd, slips: o.slips.tackler, satSteps: satT, satAxesMax: satTmax, hardLimitExcessDeg: +hardT.toFixed(2), trackErrDeg: { at0: errAt(0), at015: errAt(0.15), atContact: first ? errAt(first.sinceActivationS) : null, at05: errAt(0.5), at10: errAt(1.0) } },
    cpu: o.cpu }; }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); for (const [k, c] of Object.entries(out.cases)) { const { cpu, ...s } = c; console.log("=====", k); console.log(JSON.stringify(s, null, 1)); }

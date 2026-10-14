// SLIDE-PHYS-1 Stage-1 diagnostic summary of one tackler record (solo): the brief's measured quantities — COM horizontal / vertical velocity and
// their ratio through the entry, tackling foot and shin velocities, ground impulses and peak ground force per body (with horizontal / vertical force
// ratios at the knee and hip impacts, comparable to van den Eijnde 2017's peak ratios), contact normals, penetration, constraint integrity,
// momentum / energy ledger residuals, CPU. Facts only.
// usage (worktree root): node sp_report1.mjs --rec <rec.json.gz> [--out summary.json]
import fs from "fs";
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), MT = await import(new URL("./sp_metrics.mjs", import.meta.url).href), { V, M, G, bi } = L;
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, o = L.readGz(arg("rec")), BW = M * G, H = 1 / 240, r3 = (x) => x == null ? null : Math.round(x * 1000) / 1000;
const S = MT.series(o), ev = MT.events(S), R = S.rows, at = (t) => R.find(r => r.t >= t - 1e-9) || R[R.length - 1];
const vrow = (r) => ({ t: r3(r.t), vh: r3(r.vh), vy: r3(r.vy), vyOverVh: r3(Math.abs(r.vy) / Math.max(1e-6, r.vh)), comY: r3(r.com[1]) });
const out = { tool: "sp_report1.mjs", rec: { cand: o.cand, hash: o.finalHash, steps: o.recs.length, entry: o.entry && { com: o.entry.com, comVel: o.entry.comVel } } };
out.comVelocity = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, ev.groundEntryT, 0.6, 0.8, 1.0, 1.4].filter(t => t != null).map(t => vrow(at(t)));
out.entry = { firstContacts: ev.firstContacts.slice(0, 8), groundEntryT: r3(ev.groundEntryT), atEntry: ev.atEntry && Object.fromEntries(Object.entries(ev.atEntry).map(([k, v]) => [k, r3(v)])), vhMaxBeforeEntry: r3(Math.max(...R.filter(r => r.t <= (ev.groundEntryT ?? 0.5)).map(r => r.vh))) };
// tackling limb: peak speeds and their timing; at the boot's first touchdown
const sp = (v) => ({ h: Math.hypot(v[0], v[2]), y: v[1] }), pk = (key) => { let b = null; for (const r of R) { const s = sp(r[key]); if (!b || s.h > b.h) b = { t: r.t, ...s }; } return { t: r3(b.t), h: r3(b.h), y: r3(b.y) }; };
const td = S.first.foot_R; out.tacklingLimb = { footPeak: pk("footR_v"), shankPeak: pk("shankR_v"), bootTouchdownT: r3(td), atTouchdown: td != null ? { foot: Object.fromEntries(Object.entries(sp(at(td).footR_v)).map(([k, v]) => [k, r3(v)])), shank: Object.fromEntries(Object.entries(sp(at(td).shankR_v)).map(([k, v]) => [k, r3(v)])) } : null };
// ground: per body total normal impulse, tangential impulse, peak force (BW) and time, peak horizontal/vertical force ratio over the steps where that body carries > 0.5 BW
const gb = {}; let peakTot = { F: 0, t: null }, nDevMax = 0;
for (let k = 0; k < R.length; k++) { const r = R[k]; let tot = 0; for (const [nm, x] of Object.entries(r.turf)) { const e = gb[nm] || (gb[nm] = { Jy: 0, Jtan: 0, pkBW: 0, pkT: null, hvAtPk: null, hvMaxLoaded: 0, slipMax: 0 }); e.Jy += x.Jy; e.Jtan += x.Jtan; e.slipMax = Math.max(e.slipMax, x.slip);
    const Fy = x.Jy / H / BW, Ft = x.Jtan / H / BW; tot += Fy; if (Fy > e.pkBW) { e.pkBW = Fy; e.pkT = r.t; e.hvAtPk = Ft / Math.max(1e-9, Fy); } if (Fy > 0.5) e.hvMaxLoaded = Math.max(e.hvMaxLoaded, Ft / Fy); }
  if (tot > peakTot.F) peakTot = { F: tot, t: r.t }; }
for (const rr of o.recs) for (const c of rr.contacts) if (c.kind.startsWith("turf") && c.Jn > 0 && c.n) { const ny = Math.abs(c.n[1]); nDevMax = Math.max(nDevMax, Math.acos(Math.min(1, ny)) * 180 / Math.PI); }
out.ground = { byBody: Object.fromEntries(Object.entries(gb).sort((a, b) => b[1].Jy - a[1].Jy).map(([k, e]) => [k, { JyNs: r3(e.Jy), JtanNs: r3(e.Jtan), peakBW: r3(e.pkBW), peakT: r3(e.pkT), hOverVAtPeak: r3(e.hvAtPk), hOverVMaxLoaded: r3(e.hvMaxLoaded), slipMax: r3(e.slipMax) }])),
  peakTotalBW: r3(peakTot.F), peakTotalT: r3(peakTot.t), contactNormalMaxDeviationDeg: r3(nDevMax), totalJyNs: r3(Object.values(gb).reduce((s, e) => s + e.Jy, 0)), gravityImpulseNs: r3(BW * R.length * H) };
// integrity + ledgers
const ch = o.recs.map(r => r.chars.tackler), mx = (f) => r3(Math.max(...ch.map(f)));
out.integrity = { maxTurfPenMm: r3(ev.maxPenMm), maxHardExcDeg: r3(ev.maxHardExcDeg), maxJointSepMm: mx(c => c.integrity.sepMaxMm || 0), maxSpeed: mx(c => c.integrity.maxSpeed), allFinite: ch.every(c => c.integrity.finite) };
// per-step ledgers; the activation step (parked → dynamic: the one documented velocity write of the committed entry) is reported separately.
// energyRes = ΔE − (actuator work + cross work − passive damping): in the solo world it is the TURF contact work (impacts + sliding friction),
// so it must be ≤ 0 on average; positive per-step values are solver energy creation
const act = o.recs.findIndex(r => r.tacklerActive !== false && r.chars.tackler && V.len(r.chars.tackler.linRes || [0, 0, 0]) > 50), post = ch.filter((_, k) => k !== act && k > 0);
const mxp = (f) => r3(Math.max(...post.map(f))), Eres = post.map(c => c.energyRes || 0);
out.ledger = { activationStep: act, activationLinNs: act >= 0 ? r3(V.len(ch[act].linRes)) : null, activationEnergyJ: act >= 0 ? r3(ch[act].energyRes) : null,
  linResMaxNs: mxp(c => c.linRes ? V.len(c.linRes) : 0), angResMaxNms: mxp(c => c.angRes ? V.len(c.angRes) : 0), turfWorkJ: r3(Eres.reduce((s, x) => s + x, 0)), energyCreatedMaxStepJ: r3(Math.max(0, ...Eres)), energyCreatedSumJ: r3(Eres.filter(x => x > 0).reduce((s, x) => s + x, 0)) };
out.slide = { slideDistM: r3(ev.slideDist), stopT: r3(ev.stopT), minBellyY: r3(ev.minBellyY), faceDownSteps: ev.faceDownSteps, final: { t: r3(ev.final.t), comY: r3(ev.final.com[1]) } };
const cpu = o.cpu || {}, tot = Object.values(cpu).reduce((s, x) => s + (typeof x === "number" ? x : 0), 0); out.cpu = { wallMs: Math.round(o.wallMs), perStepMs: r3(o.wallMs / o.recs.length), byStage: Object.fromEntries(Object.entries(cpu).map(([k, v]) => [k, typeof v === "number" ? r3(v / o.recs.length) : v])), note: "ms per 1/240 s step; 'instrument' / 'measure' are the research ledgers, not needed at runtime" };
if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));

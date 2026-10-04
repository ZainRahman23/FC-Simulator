// ═══ physchar2/tools/phaseG_events.mjs — Phase G (ankle pre-registration, rule H): per-step energy events of one G1 run, their window net residual,
// the joint state at each event, and a RATE-CONVERGENCE test from the exact pre-event state (DIAGNOSTIC; nothing adopted)
// Per step: ΔE (E = KE + PE + U), the viscous dissipation D of the step, residual r = ΔE + D (> 0 = energy created). An EVENT is ΔE > thr (the
// 1.2e floor 0.05 J). For each event: tick, t, ΔE, r, the cumulative residual Σr over [event, event + window] (net creation if > 0), and both
// ankles' (ab/adduction, DF, inversion) and knees' (flexion, axial rotation) anatomical angles. Whole-run Σr (net creation over the run).
// --converge: a fresh deterministic run to the tick before the worst event, then the same physical window at dt / m for m = 1, 4/3, 2, 8/3, 4
// (180 → 240 / 360 / 480 / 720 Hz equivalents from a 180 Hz run): window Σr and the largest single-step ΔE per rate — integration error must
// shrink with dt; a physical potential release would not.
// usage: B_TURF=plane V2_ANKLE_NEUTRAL_K=<k> node tools/phaseG_events.mjs --human=V2-REF --key=drop1m --hz=180 [--thr=0.05 --window=0.25 --converge [--rates=200,240,…] --out=<json>]
import fs from "fs";
import { jolt, specOf, makeSim, runTo, JS } from "./b_lib.mjs";
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.split("=").slice(1).join("=") : d; };
const human = arg("human", "V2-REF"), key = arg("key", "drop1m"), hz = +arg("hz", 180), thr = +arg("thr", 0.05), win = +arg("window", 0.25), out = arg("out", null), CONV = process.argv.includes("--converge");
const J = await jolt(), spec = specOf(human), jIdx = (n) => spec.joints.findIndex(j => j.name === n);
const AJ = [["ankle_L", ["fabd", "df", "inv"]], ["ankle_R", ["fabd", "df", "inv"]], ["knee_L", ["flex", "rot"]], ["knee_R", ["flex", "rot"]]].map(([n, ks]) => [n, jIdx(n), ks]);
const angles = (s) => Object.fromEntries(AJ.map(([n, k, ks]) => [n, ks.map(a => +s.P.anat(s.P.jd[k], s.up.ev.qs[k], a).toFixed(2))]));
function pass(s, onStep) { let Ep = s.last.E; const R = []; while (s.tick()) { const dE = s.last.E - Ep; Ep = s.last.E; const D = s.A.Dstep[s.A.Dstep.length - 1]; R.push({ n: s.n, dE, r: dE + D }); if (onStep) onStep(s, dE, dE + D); } return R; }
const s = makeSim(J, spec, key, { hz }), ev = []; const R = pass(s, (s2, dE, r) => { if (dE > thr) ev.push({ n: s2.n, t: +(s2.n * s2.dt).toFixed(4), dE: +dE.toFixed(4), r: +r.toFixed(4), angles: angles(s2) }); }); const dt = s.dt; s.destroy();
const W = Math.round(win / dt), idx = new Map(R.map((x, i) => [x.n, i]));
for (const e of ev) { const i = idx.get(e.n); let sum = 0; for (let j = i; j < Math.min(R.length, i + W); j++) sum += R[j].r; e.windowResidualJ = +sum.toFixed(4); }
const total = R.reduce((a, x) => a + x.r, 0), rmax = Math.max(...R.map(x => x.r));
const res = { generated: "tools/phaseG_events.mjs", human, key, hz, k: JS.ankleNeutralKPerDeg(), thr, windowS: win, ticks: R.length, events: ev.length, maxStepRiseJ: Math.max(0, ...R.map(x => x.dE)), maxResidualJ: rmax, runResidualJ: total,
  maxWindowResidualJ: ev.length ? Math.max(...ev.map(e => e.windowResidualJ)) : null, eventList: ev.slice(0, 60) };
if (CONV && ev.length) { const worst = ev.reduce((a, b) => (b.dE > a.dE ? b : a)); res.converge = { event: worst.n, t: worst.t, rates: [] };
  const RATES = (arg("rates", "") || "").split(",").filter(Boolean).map(Number);   // --rates=200,220,240,… (Hz equivalents; default 180/240/360/480/720)
  const plan = RATES.length ? RATES.map(h => [h / hz, h]) : [[1, 180], [4 / 3, 240], [2, 360], [8 / 3, 480], [4, 720]].map(([m, h]) => [m * 180 / hz, h * hz / 180]);
  for (const [m, lab] of plan) { const s2 = makeSim(J, spec, key, { hz }); runTo(s2, worst.n - 1); s2.dt = s2.dt / m; s2.up = s2.P.compute(s2.st, s2.dt);
    const steps = Math.round(win / s2.dt); let Ep = s2.last.E, sum = 0, mx = 0, k = 0; while (k++ < steps && s2.tick()) { const dE = s2.last.E - Ep; Ep = s2.last.E; sum += dE + s2.A.Dstep[s2.A.Dstep.length - 1]; mx = Math.max(mx, dE); }
    res.converge.rates.push({ hzEquivalent: +(lab).toFixed(0), dtMs: +(s2.dt * 1000).toFixed(4), windowResidualJ: +sum.toFixed(4), maxStepRiseJ: +mx.toFixed(4) }); s2.destroy(); } }
console.log(JSON.stringify({ ...res, eventList: undefined, firstEvents: ev.slice(0, 3) }));
if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));

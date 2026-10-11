// PPR-1 audit, part 2 (read-only): the runner's actuator torques in a recorded PPR-1 run around first contact. Per motorised axis, in the four
// windows after first contact (t = 0 at the start of the first impulse step: 0–25 / 25–50 / 50–80 / 80–120 ms): torque change from the pre-contact
// value, its rise time (50 % / 90 % of the window maximum), the peak torque rate, the activation change (a+ / a− — what a muscle could only do
// through a neural command), torque produced BEYOND what the entry activation could deliver even with eccentric enhancement (the "neural" share a
// pre-reflex human cannot have), saturation, and the joint motion.
// usage: node ppr1_audit_pvp.mjs --run <ppr1 run .json.gz> --out <json>
import fs from "fs"; import zlib from "zlib";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const run = JSON.parse(zlib.gunzipSync(fs.readFileSync(arg("run")))), h = 1 / 240, R = run.recs;
const fcRec = R.find(r => r.contacts.some(c => c.kind === "cross" && Math.hypot(...c.J2) >= 1e-3)), nFirst = fcRec ? fcRec.n : null;   // first record whose step carried a contact impulse
const t0n = nFirst - 1, tms = (n) => (n - t0n) * h * 1000;   // t = 0 at the start of that step
const BINS = [[0, 25], [25, 50], [50, 80], [80, 120]], inBin = (n, b) => tms(n) > b[0] && tms(n) <= b[1];
const META = JSON.parse(fs.readFileSync(arg("law"))), lab = Object.fromEntries(META.rows.map(r => [r.k + "_" + r.i, { name: r.joint + "." + r.axis, e: r }]));
const series = {}; for (const r of R) for (const [k, i, tau, cap, frac, sat, req, ap, am] of r.act || []) { const key = k + "_" + i; (series[key] || (series[key] = [])).push({ n: r.n, tau, cap, sat, req, ap, am, th: r.chars.runner.th[k][i] }); }
const out = { tool: "ppr1_audit_pvp.mjs", run: arg("run"), law: run.job.law, scene: run.job.scene, finalHash: run.finalHash, firstImpulseStep: nFirst, t0: `start of step ${nFirst} = ${(t0n * h * 1000).toFixed(2)} ms after activation`, bins: BINS, axes: {} };
for (const [key, s] of Object.entries(series)) { const L = lab[key]; if (!L) continue; const pre = s.find(x => x.n === t0n) || s[0], W = s.filter(x => tms(x.n) > 0 && tms(x.n) <= 120);
  if (!W.length) continue; const dTau = W.map(x => x.tau - pre.tau), iMax = dTau.reduce((b, v, j) => (Math.abs(v) > Math.abs(dTau[b]) ? j : b), 0), peak = dTau[iMax];
  const tFrac = (f) => { const j = dTau.findIndex(v => Math.abs(v) >= f * Math.abs(peak)); return j < 0 ? null : tms(W[j].n); };
  let rate = 0; for (let j = 1; j < s.length; j++) if (tms(s[j].n) > 0 && tms(s[j].n) <= 120) rate = Math.max(rate, Math.abs(s[j].tau - s[j - 1].tau) / h);
  // what the ENTRY activation could deliver at this angle / speed with V2's own eccentric enhancement: |τ| ≤ a_entry · cap(θ, ω) — anything beyond needed a higher activation
  const aE = [pre.ap, pre.am], beyond = W.map(x => Math.max(0, Math.abs(x.tau) - (x.tau >= 0 ? aE[0] : aE[1]) * x.cap));   // x.cap = full-activation capacity at this angle / speed in the torque's direction
  const bins = BINS.map(b => { const Wb = s.filter(x => inBin(x.n, b)); return Wb.length ? { maxAbsDTau: Math.max(...Wb.map(x => Math.abs(x.tau - pre.tau))), maxA: Math.max(...Wb.map(x => Math.max(x.ap, x.am))), maxBeyond: Math.max(...Wb.map((x, j) => beyond[W.indexOf(x)] ?? 0)), sat: Wb.filter(x => x.sat).length, maxAbsDThDeg: Math.max(...Wb.map(x => Math.abs(x.th - pre.th))) * 180 / Math.PI } : null; });
  out.axes[L.name] = { k: +key.split("_")[0], i: +key.split("_")[1], tauPre: pre.tau, aPre: [pre.ap, pre.am], peakDTau: peak, tPeakMs: tms(W[iMax].n), t50ms: tFrac(0.5), t90ms: tFrac(0.9), peakRateNmS: rate,
    maxActivation: Math.max(...W.map(x => Math.max(x.ap, x.am))), activationRise: Math.max(...W.map(x => Math.max(x.ap - pre.ap, x.am - pre.am))), maxBeyondEntryActNm: Math.max(...beyond), satSteps: W.filter(x => x.sat).length, maxAbsDThDeg: Math.max(...W.map(x => Math.abs(x.th - pre.th))) * 180 / Math.PI, bins }; }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));
const top = Object.entries(out.axes).sort((a, b) => Math.abs(b[1].peakDTau) - Math.abs(a[1].peakDTau)).slice(0, 16);
console.log(`${out.law}/${out.scene} first impulse step ${nFirst}; window 0–120 ms after contact`);
for (const [n, a] of top) console.log(`  ${n.padEnd(18)} τ_pre ${a.tauPre.toFixed(1).padStart(7)} Δτ_peak ${a.peakDTau.toFixed(1).padStart(7)} N·m @${a.tPeakMs.toFixed(0)} ms (50% ${a.t50ms?.toFixed(0)} / 90% ${a.t90ms?.toFixed(0)} ms) · rate ${a.peakRateNmS.toFixed(0)} N·m/s · activation ${Math.max(...a.aPre).toFixed(3)}→${a.maxActivation.toFixed(3)} · beyond entry activation ${a.maxBeyondEntryActNm.toFixed(1)} N·m · sat ${a.satSteps} · |Δθ| ${a.maxAbsDThDeg.toFixed(1)}° · bins Δτ ${a.bins.map(b => b ? b.maxAbsDTau.toFixed(1) : "—").join("/")}`);

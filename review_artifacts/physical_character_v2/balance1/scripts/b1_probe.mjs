// BALANCE-1 DESIGN-STAGE probes (disclosed in the design document; NOT the qualification battery): undisturbed standing (noise-free and with
// motor noise) and two small impulse responses (2 N·s forward, 4 N·s lateral pelvis pulses of 50 ms at t = 2 s), twin-subtracted.
// usage: CP='<controller params JSON>' BP='<body params JSON>' node b1_probe.mjs [--long]
const B = new URL("../../", import.meta.url).href, fs = await import("fs");
const { runOne } = await import(B + "balance1/scripts/b1_run.mjs"), CT = await import(B + "balance1/scripts/b1_ctrl.mjs"), BT = await import(B + "ppr3/scripts/ppr3_battery.mjs");
export async function probe(cp, bp, opts = {}) { const out = {}, job = (pert, steps, noise) => runOne({ law: "M1B", params: bp, ctrl: () => new CT.BalanceController(noise ? cp : (({ noise, ...r }) => r)(cp)), steps, perturb: pert, instrument: true });
  const drift = (o) => { const R = o.recs, y0 = R[0].S[0].pos[1], c0 = R[0].chars.runner.com; return R.filter(r => r.n % 240 === 239).map(r => [Math.round((r.n + 1) / 240), +((y0 - r.S[0].pos[1]) * 1000).toFixed(1), +(Math.hypot(r.chars.runner.com[0] - c0[0], r.chars.runner.com[2] - c0[2]) * 1000).toFixed(1)]); };
  const T = 480 + 1440, base = await job([], T, false); out.undisturbed = { drift: drift(base), stop: base.stop || null };
  for (const [dir, J] of [["fwd", 2], ["left", 4]]) { const o = await job(BT.pushJob(dir, J, 480, 12), T, false), ax = dir === "fwd" ? 0 : 2, d = o.recs.map((r, q) => (r.chars.runner.com[ax] - (base.recs[q] ? base.recs[q].chars.runner.com[ax] : 0)) * 1000);
    let pk = 0, tpk = 0; for (let q = 480; q < Math.min(d.length, 480 + 1440); q++) if (Math.abs(d[q]) > Math.abs(pk)) { pk = d[q]; tpk = (q - 480) / 240; }
    out[dir] = { J, peakMm: +pk.toFixed(2), tPeakS: +tpk.toFixed(3), at: [0.25, 0.5, 1, 1.5, 2, 3, 4, 5, 6].map(t => [t, +(d[480 + Math.round(t * 240) - 1] ?? NaN).toFixed(2)]), stop: o.stop || null }; }
  if (opts.long) { const o = await job([], 240 * 30, true); out.noise30s = { drift: drift(o).filter((_, i) => i % 5 === 4), stop: o.stop || null }; }
  return out; }
if (process.argv[1] && process.argv[1].endsWith("b1_probe.mjs")) { const r = await probe(JSON.parse(process.env.CP), JSON.parse(process.env.BP || "{}"), { long: process.argv.includes("--long") });
  console.log("undisturbed (s, pelvis drop mm, COM shift mm):", JSON.stringify(r.undisturbed.drift), r.undisturbed.stop ? "STOP" : "");
  for (const d of ["fwd", "left"]) console.log(d, r[d].J, "N·s: peak", r[d].peakMm, "mm @", r[d].tPeakS, "s; ΔCOM:", r[d].at.map(([t, v]) => `${t}s ${v}`).join(" "), r[d].stop ? "STOP" : "");
  if (r.noise30s) console.log("30 s with noise:", JSON.stringify(r.noise30s.drift), r.noise30s.stop ? "STOP" : ""); }

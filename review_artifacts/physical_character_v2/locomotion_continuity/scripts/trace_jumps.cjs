// dev: list the largest per-step velocity changes of rig joints with the foot modes around them
const H = require("./pres_harness.cjs"), [WT, V, HZ, NN] = process.argv.slice(2), P = H.loadPres(WT, ["anim3d/of_loco_cont.js"]);
const v = +V, dt = 1 / +(HZ || 960), R = H.driveSynth(P, () => v, 3, dt), O = R.out, sk = R.skel, k0 = Math.round(0.5 / dt), ev = [];
for (let b = 0; b < sk.bones.length; b++) { if (!sk.bones[b].parent) continue; for (let k = k0 + 1; k < O.length - 1; k++) { const d = [0, 1, 2].map(i => (O[k + 1].joint[b][i] - 2 * O[k].joint[b][i] + O[k - 1].joint[b][i]) / dt), n = Math.hypot(...d); if (n > 0.18) ev.push({ k, n, b: sk.bones[b].name }); } }
const byK = {}; for (const e of ev) { if (!byK[e.k] || byK[e.k].n < e.n) byK[e.k] = e; }
const list = Object.values(byK).sort((a, b) => b.n - a.n).slice(0, +(NN || 12));
for (const e of list.sort((a, b) => a.k - b.k)) { const f = O[e.k], fm = O[e.k - 1], fp = O[e.k + 1], m = (x) => `${(x.diag.feet.R || {}).mode}/${(x.diag.feet.L || {}).mode}`;
  console.log(`t ${f.t.toFixed(4)} u ${f.phase.toFixed(4)} ${e.b} dv ${e.n.toFixed(2)} modes ${m(fm)} → ${m(f)} → ${m(fp)} flight ${fm.flight}${f.flight}${fp.flight} legs R ${f.legs.R.st ? "st " + f.legs.R.s.toFixed(3) : "sw " + f.legs.R.w.toFixed(3)} L ${f.legs.L.st ? "st " + f.legs.L.s.toFixed(3) : "sw " + f.legs.L.w.toFixed(3)} liftR ${(f.diag.feet.R || {}).lift} liftL ${(f.diag.feet.L || {}).lift}`); }
console.log("frames with any joint > 0.18 m/s/step:", Object.keys(byK).length, "of", O.length - k0);

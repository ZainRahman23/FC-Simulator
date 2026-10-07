import fs from "fs"; import zlib from "zlib";
for (const f of fs.readdirSync(".").filter(x => x.endsWith(".json.gz"))) { const o = JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
  const L = o.D1LOG, eps2 = 1e-4; const big = L.filter(e => e.mx != null && e.mx > 300);
  const minLamAll = Math.min(...L.map(e => e.lam)), nLow = L.filter(e => e.lam < eps2).length, nUn = L.filter(e => e.err > 1e-6).length;
  console.log(`${f}: D1 evals ${L.length}; unreachable ${nUn}; lam<eps2 ${nLow}; minLam ${minLamAll.toExponential(2)}; |D1|>300 Nm ${big.length}; nonfinite ${L.filter(e => e.fin === false).length}`);
  // classify big ones
  const cls = { unreach: 0, illcond: 0, valid: 0 }; for (const e of big) { if (e.err > 1e-6) cls.unreach++; else if (e.lam < eps2) cls.illcond++; else cls.valid++; } console.log("   big by class", JSON.stringify(cls));
  const vb = big.filter(e => !(e.err > 1e-6) && !(e.lam < eps2)).sort((a, b) => b.mx - a.mx).slice(0, 5); for (const e of vb) console.log("   valid-big", JSON.stringify(e));
  // max D1 magnitude in valid class overall
  const val = L.filter(e => e.mx != null && !(e.err > 1e-6) && !(e.lam < eps2)); console.log("   max |D1| valid class", Math.max(...val.map(e => e.mx)).toFixed(2), " max in lam<eps2 reachable", Math.max(0, ...L.filter(e => e.mx != null && !(e.err > 1e-6) && e.lam < eps2).map(e => e.mx)).toExponential(2));
  // dTau0 spikes > 500
  const sp = o.series.t.map((t, i) => [t, o.series.dTau0[i]]).filter(x => x[1] > 500); console.log("   dTau0>500 ticks", sp.length, sp.slice(0, 6).map(x => x.map(v => +v.toFixed(4)).join(":")).join(" "));
  for (const [t] of sp.slice(0, 6)) { const near = L.filter(e => Math.abs(e.t - t) < 0.0115 && e.n === 0); console.log("     near", t, near.map(e => `${e.t}|err ${e.err?.toExponential(1)}|lam ${e.lam.toExponential(1)}|lamIK ${e.lamIK.toExponential(1)}|mx ${e.mx?.toExponential(1)}`).join("  ")); } }

import fs from "fs"; import zlib from "zlib";
const fl = fs.readdirSync("runs").filter(x => x.startsWith("cf_d1guard") && x.endsWith(".json.gz"));
let tot = 0;
for (const f of fl) { const o = JSON.parse(zlib.gunzipSync(fs.readFileSync("runs/" + f))), se = o.series, t1 = o.t1;
  const bad = se.t.map((t, i) => ({ t, c: +se.closInc[i], d0: se.dTau0[i], on: se.onset[i] })).filter(x => x.c > 0.05); if (!bad.length) continue; tot++;
  const rowAt = (t) => o.rows.find(r => Math.abs(r.t - t) < 1e-6);
  console.log(f.replace("cf_d1guard_", "").replace(".json.gz", ""), "t1", t1, "closPos", o.integrity.closPos.toFixed(3));
  for (const b of bad) { const r = rowAt(b.t), d1 = r && r.L ? Math.max(0, ...r.L.flat().filter(Boolean).map(x => Math.abs(x.d1 || 0))) : null;
    console.log(`   t ${b.t} (t−t1 ${(b.t - t1).toFixed(4)}) closure ${b.c.toFixed(3)} J dTau0 ${b.d0.toFixed(1)} |d1|max ${d1 != null ? d1.toExponential(1) : "—"} ikErr ${r ? (r.ikErr && r.ikErr[0] != null ? r.ikErr : r.ikErr) : "—"} st ${r ? r.st : "—"} Fz ${r ? r.Fz.toFixed(0) : "—"}`); } }
console.log("runs with closure>0.05:", tot, "/", fl.length);

import fs from "fs"; import zlib from "zlib";
for (const f of ["cf_d1guard_V2-165-62_L_180_H-D", "cf_d1guard_V2-198-92_L_180_C-L5", "cf_d1guard_V2-short-legs_L_180_C-L5", "cf_frozen_V2-REF_L_180_R-L"]) { const o = JSON.parse(zlib.gunzipSync(fs.readFileSync("runs/" + f + ".json.gz"))), se = o.series, i1 = se.t.findIndex(t => Math.abs(t - o.t1) < 1e-6);
  let cum = 0; const out = []; for (let i = i1 - 3; i < i1 + 14; i++) { cum += +se.closInc[i]; out.push(`${(+se.closInc[i]).toFixed(3)}`); }
  let mx = -1e9, mn = 1e9, c2 = 0; for (let i = i1 - 3; i < i1 + 60; i++) { c2 += +se.closInc[i]; mx = Math.max(mx, c2); mn = Math.min(mn, c2); }
  const negSum = se.closInc.reduce((s, v) => s + Math.min(0, +v), 0), posSum = se.closInc.reduce((s, v) => s + Math.max(0, +v), 0);
  console.log(f, "t1", o.t1, "\n   closure t1-3..t1+13:", out.join(" "), "\n   cum over 17:", cum.toFixed(3), " cum range t1-3..t1+60:", mn.toFixed(3), mx.toFixed(3), " run Σ+", posSum.toFixed(3), "Σ−", negSum.toFixed(3)); }

import fs from "fs"; import zlib from "zlib";
for (const pre of ["cf_d1guard", "cf_frozen"]) { let worst = [];
for (const f of fs.readdirSync("runs").filter(x => x.startsWith(pre) && x.endsWith(".json.gz"))) { const o = JSON.parse(zlib.gunzipSync(fs.readFileSync("runs/" + f)));
  let mx = 0, at = null, mxNoD1 = 0, atN = null, mxKp = 0, mxSt = 0; for (const r of o.rows) { if (!r.L) continue; r.L.forEach((ax, j) => ax && ax.forEach((x, i) => { if (!x) return; const a = Math.abs(x.tau0); if (a > mx) { mx = a; at = { t: r.t, j, i, d1: x.d1, kp: x.kp, st: x.statics, v: x.vffServo, ph: r.ph }; }
    const nd = Math.abs(x.tau0 - (x.d1 || 0)); if (nd > mxNoD1) { mxNoD1 = nd; atN = { t: r.t, j, i, kp: x.kp, st: x.statics, v: x.vffServo, pr: x.passiveRef, wA: x.wA, K: x.K, D: x.D }; } })); }
  worst.push({ f: f.replace(pre + "_", "").replace(".json.gz", ""), mx, mxNoD1, atN }); }
worst.sort((a, b) => b.mxNoD1 - a.mxNoD1); console.log(pre, "max |tau0| overall (top):", worst.slice().sort((a,b)=>b.mx-a.mx).slice(0,3).map(w => w.f + " " + w.mx.toExponential(2)).join("; "));
console.log("   max |tau0 - d1| top 5:"); for (const w of worst.slice(0, 5)) console.log("     ", w.f, w.mxNoD1.toFixed(1), JSON.stringify(w.atN, (k, v) => typeof v === "number" ? +v.toPrecision(4) : v)); }

import fs from "fs"; import zlib from "zlib";
const L = (a) => Math.hypot(...a), f = process.argv[2];
const o = JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), R = o.fbr, dt = 1 / o.hz, rows = o.rows;
const t1 = rows.find(r => r.touch > 0 && r.ph !== "lift")?.t; console.log("first touch row t", t1, "tC", o.events.tC, "trans", JSON.stringify(o.trans.filter(x => x.n === o.swing && x.t > o.events.tLo)));
for (const r of R.filter(r => r.t >= t1 - 4 * dt && r.t <= t1 + 30 * dt)) { const row = rows.find(q => Math.abs(q.t - r.t) < 1e-6);
  console.log(((r.t - t1) / dt).toFixed(0).padStart(3), row ? row.st.padEnd(11) : "", "a", row ? row.a.toFixed(2) : "", "touch", row ? row.touch : "", "Fz", row ? row.Fz.toFixed(0).padStart(4) : "", "|w|", L(r.w).toFixed(3), "al", r.al.map(v => v.toFixed(1).padStart(6)).join(""), "dThip", L(r.dT[0]).toFixed(2), "D1hip", L(r.T[0]).toFixed(1), "dTau0", row ? row.dTau0.toFixed(1) : ""); }

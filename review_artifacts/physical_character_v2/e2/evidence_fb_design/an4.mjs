import fs from "fs"; import zlib from "zlib";
const L = (a) => Math.hypot(...a), f = process.argv[2], o = JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), dt = 1 / o.hz, X = o.fbx, rows = o.rows;
const t1 = rows.find(r => r.touch > 0 && r.ph !== "lift")?.t; const T = o.tr.T, tLo = o.events.tLo;
const pr = (a, d = 2) => a ? a.map(v => v.toFixed(d).padStart(6)).join("") : "  —";
console.log(f, "t1", t1);
for (const x of X.filter(x => (x.t >= t1 - 40 * dt && x.t <= t1 + 6 * dt) && Math.round((x.t - t1) / dt) % 4 === 0 || Math.abs(x.t - t1) < 1e-6)) {
  const k = Math.round((x.t - t1) / dt), j = x.J;
  console.log(String(k).padStart(4), "φ", ((x.t - tLo) / T).toFixed(3), "foot ω", pr(x.fw), "|", L(x.fw).toFixed(3), " pelvis ω", pr(x.pw), " ref ω", pr(x.rw), " foot-pel", L(x.fw.map((v, i) => v - x.pw[i])).toFixed(3),
    " hip ω*", pr(j[0].ws), " wa", pr(j[0].wa), " ank ω*", pr(j[2].ws), " wa", pr(j[2].wa)); }

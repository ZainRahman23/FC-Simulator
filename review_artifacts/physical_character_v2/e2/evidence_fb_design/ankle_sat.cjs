// coordinator-draft smoke runs (evidence_td_design/smoke*.tgz): foot world angular speed vs ankle-row activation-bound saturation, 14 ticks before → first touching tick
const fs = require("fs"), z = require("zlib"); for (const f of process.argv.slice(2)) { const o = JSON.parse(z.gunzipSync(fs.readFileSync(f))), R = o.rows, L = a => Math.hypot(...a);
  const i1 = R.findIndex(r => r.touch > 0 && r.ph !== "lift"); if (i1 < 0 || !R[i1].wF) { console.log(f, "no contact / no wF"); continue; } const s = [];
  for (let i = i1 - 14; i <= i1; i++) { const r = R[i]; s.push((r.sat.length ? "S" : ".") + (L(r.wF) > 0.1 ? "!" : "")); }
  console.log(f.padEnd(42), o.hz, "|wF| at touch", L(R[i1].wF).toFixed(3), "max", Math.max(...R.slice(i1 - 14, i1 + 1).map(r => L(r.wF))).toFixed(3), "sat axes", JSON.stringify([...new Set(R.slice(i1 - 14, i1 + 1).flatMap(r => r.sat))]), s.join("")); }

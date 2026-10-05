import fs from "fs"; import zlib from "zlib"; import path from "path"; import { setup, sim } from "./p15_model.mjs";
const D = path.dirname(new URL(import.meta.url).pathname), rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(D, f))));
const bodies = ["V2-REF", "V2-165-62", "V2-198-92", "V2-175-70", "V2-190-85", "V2-short-legs", "V2-long-legs", "V1-matched"], out = [];
const need = (P, tc, o) => { const fellAt = (dl) => sim({ ...P, Aout: P.Aout + P.sgn * dl, cA: P.cA + P.sgn * dl }, { ...o, tc }).fell; if (!fellAt(0)) return 0; let lo = 0, hi = 0.5; if (fellAt(hi)) return Infinity; for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (fellAt(mid)) lo = mid; else hi = mid; } return hi; };
console.log("body | outward foot shift needed at the smooth put-down's touchdown: current pipeline | support at contact + debounce (decoupled) + floor 0 | same, touchdown 0.20 s");
for (const b of bodies) { const R = rd(`cap_${b}_L_pd.json.gz`), P = setup(R), td = R.lcLog[R.lifted].find(e => e.t >= R.events.abortT - 1e-9 && e.to === "TOUCHDOWN").t;
  const a = need(P, td, { latency: "current" }), c = need(P, td, { latency: 0.05, floor0: true }), d = need(P, P.ab + 0.20, { latency: 0.05, floor0: true });
  out.push({ b, cur: a, dec: c, dec020: d }); console.log(`  ${b} | ${(a * 100).toFixed(1)} cm | ${(c * 100).toFixed(1)} cm | ${(d * 100).toFixed(1)} cm`); }
fs.writeFileSync(path.join(D, "p15_model3.json"), JSON.stringify(out, null, 1));

import fs from "fs"; import zlib from "zlib"; import path from "path"; import { setup, sim, latestTD } from "./p15_model.mjs";
const D = path.dirname(new URL(import.meta.url).pathname), rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(D, f))));
const bodies = ["V2-REF", "V2-165-62", "V2-198-92", "V2-175-70", "V2-190-85", "V2-short-legs", "V2-long-legs", "V1-matched"], out = [];
// "decoupled": acceptance intent = the abort's plan (bilateral wanted), so LOAD_ACCEPT = contact + acceptDebounce (physics still decides contact);
// the λ (balance reference) return still starts at contact (H9). Numeric latency 0.05 s = acceptDebounce.
console.log("body side | latest TD: decoupled intent | decoupled + floor 0 | decoupled + floor 0 + ramp 0.05 | smooth put-down TD (actual) | outward shift needed with the CURRENT pipeline at TD 0.30 s");
for (const b of bodies) for (const sd of ["L", "R"]) { const R = rd(`cap_${b}_${sd}_pd.json.gz`), P = setup(R), n = R.lifted, td = R.lcLog[n].find(e => e.t >= R.events.abortT - 1e-9 && e.to === "TOUCHDOWN").t - R.events.abortT;
  const e1 = latestTD(P, { latency: 0.05 }), e2 = latestTD(P, { latency: 0.05, floor0: true }), e3 = latestTD(P, { latency: 0.05, floor0: true, rampS: 0.05 });
  // capture-step counterfactual: shift the landed region outward by Δ (same shape) with the current acceptance pipeline, touchdown at the smooth put-down's time
  let lo = 0, hi = 0.4; const fellAt = (dl) => sim({ ...P, Aout: P.Aout + P.sgn * dl, cA: P.cA + P.sgn * dl }, { tc: P.ab + td, latency: "current" }).fell;
  let need; if (!fellAt(0)) need = 0; else if (fellAt(hi)) need = Infinity; else { for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (fellAt(mid)) lo = mid; else hi = mid; } need = hi; }
  out.push({ b, sd, decoupled: e1, decoupledFloor0: e2, decoupledFloor0Ramp05: e3, tdSmooth: td, shiftNeededCm: need * 100 });
  console.log(`  ${b} ${sd} | ${e1.toFixed(3)} | ${e2.toFixed(3)} | ${e3.toFixed(3)} | ${td.toFixed(3)} | ${isFinite(need) ? (need * 100).toFixed(1) + " cm" : "> 40 cm"}`); }
fs.writeFileSync(path.join(D, "p15_model2.json"), JSON.stringify(out, null, 1));

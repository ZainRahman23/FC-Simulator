import fs from "fs"; import zlib from "zlib"; import path from "path"; import { setup, latestTD } from "./p15_model.mjs";
const D = path.dirname(new URL(import.meta.url).pathname), rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(D, f))));
const bodies = ["V2-REF", "V2-165-62", "V2-198-92", "V2-175-70", "V2-190-85", "V2-short-legs", "V2-long-legs", "V1-matched"];
// measured acceptance-window applied Δτ max with the 0.1 s ramp and the 10 % floor (E1b-fix P15 runs, L side; before any fall)
const acc01 = { "V2-REF": 8.26, "V2-165-62": 5.99, "V2-198-92": 10.79, "V2-175-70": 7.15, "V2-190-85": 9.65, "V2-short-legs": 8.11, "V2-long-legs": 8.38, "V1-matched": 9.00 }, out = [];
console.log("body | latest touchdown (support at contact + debounce, floor 0) for acceptance ramp 0.10 / 0.15 / 0.20 / 0.25 s | est. acceptance Δτ/tick (floor 0) for the same ramps");
for (const b of bodies) { const P = setup(rd(`cap_${b}_L_pd.json.gz`)), r = [0.10, 0.15, 0.20, 0.25];
  const td = r.map(R => latestTD(P, { latency: 0.05, floor0: true, rampS: R })), tq = r.map(R => acc01[b] * (0.1 / R) / 0.9);
  out.push({ b, ramps: r, latestTD: td, estAccTau: tq }); console.log(`  ${b} | ${td.map(v => v.toFixed(3)).join(" / ")} | ${tq.map(v => v.toFixed(1)).join(" / ")}`); }
fs.writeFileSync(path.join(D, "p15_model4.json"), JSON.stringify(out, null, 1));

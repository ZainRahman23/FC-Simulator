// PPR-3 post-hoc diagnostic (reported, not judged): neural torque change (drive, law column 11) vs the undisturbed twin, summed per joint family
// and axis index (ankle 1 = df, 2 = inv; knee 1 = flex; hip 1 = flex, 2 = abd; lumbar 1 = flex, 2 = lat), over 1 s from the push onset: peak and
// the maximum rate over 25 ms. Uses the review-clip records (render/ppr3_save_runs.mjs; outside Git). usage: S=<dir with ppr3/runs> node ppr3_torque_rate.mjs

import fs from "fs"; import zlib from "zlib";
const R = process.cwd() + "/review_artifacts/physical_character_v2/", PL = await import(R + "pvp1/scripts/pvp1a_lib.mjs"), SP = PL.SPEC_R();
const ld = (k) => JSON.parse(zlib.gunzipSync(fs.readFileSync(process.env.S + "/ppr3/runs/" + k + ".json.gz")));
const base = ld("STAND_S2P2"), name = (k) => SP.joints[k].name;
for (const key of ["PUSHF_S2P2", "PUSHX_S2P2", "PUSHL_S2P2"]) { const o = ld(key), on = 120;
  const fam = {}; // per family: sum over joints of Δ(neural torque = drive) vs twin, per step; drive col 11, info row [k,i,...]
  for (let q = on; q < on + 240; q++) { const a = o.recs[q].law, b = base.recs[q].law; if (!a || !b) continue;
    for (let j = 0; j < a.length; j++) { const r = a[j], s = b[j], f = name(r[0]).replace(/_[LR]$/, "") + "." + r[1]; (fam[f] ||= new Array(240).fill(0))[q - on] += r[11] - s[11]; } }
  const out = []; for (const f of Object.keys(fam).filter(f => /^(ankle|knee|hip|lumbar)\./.test(f))) { const d = fam[f]; if (!d) continue; let maxRate = 0, tMax = 0, peak = 0;
    for (let i = 6; i < d.length; i++) { const rate = Math.abs(d[i] - d[i - 6]) / (6 / 240); if (rate > maxRate) { maxRate = rate; tMax = i; } peak = Math.max(peak, Math.abs(d[i])); }
    out.push(`${f} peakΔ ${peak.toFixed(1)} N·m, max rate ${maxRate.toFixed(0)} N·m/s at ${(tMax / 0.24).toFixed(0)} ms`); }
  console.log(key, "\n  " + out.join("\n  ")); }
console.log("axis idx 0 for ankle =", JSON.stringify(SP.joints.filter(j => /ankle/.test(j.name)).map(j => j.name)));

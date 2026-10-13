// SUPPORT-1 candidate comparison over the matched disturbance sweep (read-only, from S1_SWEEP_<cand>.json). Per candidate vs V2: outcome-class changes,
// fall-time shifts, struck-leg yield, pelvis rotation, and the SLICED / HINGED index of each fall: at the moment the pelvis has dropped 10 cm, the mean
// displacement of the two feet along the disturbance relative to the COM's (sliced: the feet are carried out from under the COM, index > 1; hinged:
// the feet stay while the COM goes, index < 0.5).
// usage: node .../s1_compare.mjs --dir <evidence dir> --cands V2,C3SC,C3UR,LDG,LDG_C3UR --out <json>
import fs from "fs"; import path from "path";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, DIR = arg("dir"), cands = arg("cands").split(",");
const load = (c) => JSON.parse(fs.readFileSync(path.join(DIR, `S1_SWEEP_${c}.json`))), base = load("V2"), B = Object.fromEntries(base.runs.map(r => [r.label, r]));
const sliceIdx = (r) => { const a = r.atDrop10cm; if (!a) return null; const feet = (a.footL + a.footR) / 2, com = Math.abs(a.com); return com < 0.02 ? (Math.abs(feet) > 0.05 ? 9.99 : null) : +(feet / com).toFixed(2); };
const kind = (r) => (r.cls === "FALL" ? (r.fallS < 0.5 ? "FAST" : "SLOW") : r.cls === "ABSORBED" ? "ABS" : "DISP");
const out = { cands: {}, note: "classes: ABS absorbed (no foot moved > 2 cm, COM < 5 cm), DISP displaced and recovered, FAST fall < 0.5 s, SLOW fall ≥ 0.5 s after contact" };
for (const c of cands) { const d = load(c), R = d.runs, tally = { ABS: 0, DISP: 0, FAST: 0, SLOW: 0 }, trans = {}, fam = {}; let n = 0, dFall = [], yieldK = [], yieldKV2 = [], pel = [], pelV2 = [], sl = { sliced: 0, mid: 0, hinged: 0 };
  for (const r of R) { const b = B[r.label]; if (!b) continue; n++; const k = kind(r), kb = kind(b); tally[k]++; const key = `${kb}→${k}`; if (kb !== k) trans[key] = (trans[key] || 0) + 1;
    (fam[r.fam] = fam[r.fam] || { ABS: 0, DISP: 0, FAST: 0, SLOW: 0 })[k]++;
    if (r.fallS != null && b.fallS != null) dFall.push(r.fallS - b.fallS); yieldK.push(r.yield05Deg.knee.L); yieldKV2.push(b.yield05Deg.knee.L); pel.push(r.pelvisRot06Deg); pelV2.push(b.pelvisRot06Deg);
    if (r.cls === "FALL") { const s = sliceIdx(r); if (s != null) { if (s > 1) sl.sliced++; else if (s < 0.5) sl.hinged++; else sl.mid++; } } }
  const mean = (a) => a.length ? +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(3) : null;
  out.cands[c] = { describe: d.describe, runs: n, twinHash: d.twinHash, determinism: d.determinism, twinQuiet: d.twinQuiet, cpuMsPerStep: d.cpuMsPerStep, classes: tally, byFamily: fam, transitionsFromV2: trans, meanFallShiftS: mean(dFall), meanStruckKneeYield05Deg: mean(yieldK), meanStruckKneeYieldV2: mean(yieldKV2), meanPelvisRot06Deg: mean(pel), meanPelvisRotV2: mean(pelV2), fallsSlicedMidHinged: sl,
    maxHardExcDeg: Math.max(...R.map(r => r.hardExcDeg)), maxSelfPenMm: Math.max(...R.map(r => r.selfPenMm)), maxTurfPenMm: Math.max(...R.map(r => r.turfPenMm)), maxSepMm: Math.max(...R.map(r => r.sepMaxMm)), stops: R.filter(r => r.stop).map(r => r.label) };
  const x = out.cands[c]; console.log(`${c.padEnd(9)} ABS ${tally.ABS} DISP ${tally.DISP} FAST ${tally.FAST} SLOW ${tally.SLOW} | vs V2 ${JSON.stringify(trans)} | fall shift ${x.meanFallShiftS} s | knee yield ${x.meanStruckKneeYield05Deg} (V2 ${x.meanStruckKneeYieldV2}) | pelvis rot ${x.meanPelvisRot06Deg} (V2 ${x.meanPelvisRotV2}) | sliced/mid/hinged ${sl.sliced}/${sl.mid}/${sl.hinged} | hard ${x.maxHardExcDeg} turf ${x.maxTurfPenMm} sep ${x.maxSepMm} stops ${x.stops.length} | det ${JSON.stringify(x.determinism)}`); }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));

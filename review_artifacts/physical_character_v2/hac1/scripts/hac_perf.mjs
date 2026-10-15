// HAC-1 CPU cost (this machine, Node, single thread, Jolt WASM). Per scene: the HAC-1 law's own timers (viability, recovery planning,
// tracking incl. inverse-dynamics feed-forward, support) per character per step, and the plant's timers (the physics step for the whole world,
// passive / actuator layers, and the instrumentation that decodes contacts for the records and the law's touch sensing).
// usage (worktree root): node hac_perf.mjs <out json> [repeats]
import fs from "fs";
const SC = await import(new URL("./hac_scenes.mjs", import.meta.url).href);
const out = process.argv[2], rep = +(process.argv[3] || 3), res = {};
for (const nm of ["NC", "SH_BUMP", "PVP_F2"]) { const acc = [];
  for (let k = 0; k < rep; k++) { const o = await SC.runScene(nm, 783), n = o.recs.length, lawP = [o.lawRMeta.perf, o.lawTMeta ? o.lawTMeta.perf : null].filter(Boolean), nChar = o.label2 === "hac" ? 2 : 1;
    const law = (key) => lawP.reduce((s, p) => s + p[key] / p.n, 0) / lawP.length;
    acc.push({ wallPerStepMs: o.wallMs / n, law: { total: law("total"), viability: law("viab"), planning: law("plan"), tracking: law("track"), support: law("support") }, plant: Object.fromEntries(Object.entries(o.cpu).map(([kk, v]) => [kk, v / n])), hacCharacters: nChar, label2: o.label2 }); }
  const med = (f) => { const a = acc.map(f).sort((x, y) => x - y); return +a[Math.floor(a.length / 2)].toFixed(4); };
  res[nm] = { steps: 783, repeats: rep, characters: acc[0].label2 === "hac" ? "2 HAC-1 runners" : acc[0].label2 === "parked" ? "1 HAC-1 runner (+1 parked body)" : "1 HAC-1 runner + 1 M1b tackler (" + acc[0].label2 + ")",
    wallPerStepMs: med(a => a.wallPerStepMs), hacLawPerCharacterPerStepMs: { total: med(a => a.law.total), viability: med(a => a.law.viability), recoveryPlanning: med(a => a.law.planning), tracking: med(a => a.law.tracking), support: med(a => a.law.support) },
    plantPerStepMs: Object.fromEntries(Object.keys(acc[0].plant).map(k => [k, med(a => a.plant[k])])) };
  console.log(nm, JSON.stringify(res[nm])); }
fs.writeFileSync(out, JSON.stringify({ note: "HAC-1 CPU cost per step (ms), median of repeats; 240 Hz → a real-time budget of 4.17 ms per step for the whole world", machine: process.platform + " " + process.arch + " node " + process.version, scenes: res }, null, 1));

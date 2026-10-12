// BALANCE-2 §16 sway DIAGNOSTIC (reported, not adopted): is C2's small quiet-standing sway explained by the noise model or by controller bandwidth?
// 20 s quiet standing (sway from 4 s) with the frozen C2 controller at motor-noise cv 0 / 0.025 (frozen, [D] PPR-3) / 0.05 / 0.1; nothing else changed.
// usage (worktree root): node .../b2_sway_noise.mjs --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, BT = await import(RA + "ppr3/scripts/ppr3_battery.mjs"), { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), CM = await import(RA + "balance2/successor/b2_ctrl.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const base = JSON.parse(fs.readFileSync(new URL("balance2/successor/params/C2.json", RA))), body = JSON.parse(fs.readFileSync(new URL("balance1/params/B1_BODY.json", RA))), out = { note: "DIAGNOSTIC; human COM RMS AP 4.1–4.3 mm (Foulger 2025)", runs: [] };
for (const cv of [0, 0.025, 0.05, 0.1]) { const p = JSON.parse(JSON.stringify(base)); p.noise.cv = cv; const U = await runOne({ law: "M1B", params: body, ctrl: () => new CM.SuccessorController(p), steps: 4800 }), sw = BT.sway(U, 960, U.recs.length);
  out.runs.push({ cv, comAPmm: +sw.comAPmm.rms.toFixed(2), comMLmm: +sw.comMLmm.rms.toFixed(2), freqHz: +sw.comAPfreqHz.toFixed(2), stop: U.stop || null }); console.log(JSON.stringify(out.runs[out.runs.length - 1])); }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));

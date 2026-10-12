// BALANCE-1 torque-rise comparison (preregistered, BALANCE1_PREREGISTRATION.md §6 P7 context): the SAME small / moderate forward / backward
// human-level pushes (b1_qualify.mjs B1B) on S2 + old P2 (PPR-3 frozen candidates) and on M1b + the BALANCE-1 candidate; both-ankle AP corrective
// torque max 25-ms slew, peak, and the onset of the corrective torque, by the same humanMetrics() code. Reported, the verdict is P7 in b1_eval.
// usage: node b1_compare.mjs --ctrl <ctrl.json> --body <body.json> --out <json>
import fs from "fs";
const R = new URL("../../", import.meta.url).href, BT = await import(R + "ppr3/scripts/ppr3_battery.mjs"), P3 = await import(R + "ppr3/scripts/ppr3_run.mjs"), B1 = await import(R + "balance1/scripts/b1_run.mjs"), CT = await import(R + "balance1/scripts/b1_ctrl.mjs");
const { B1B, humanMetrics } = await import(R + "balance1/scripts/b1_qualify.mjs"), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const S2 = JSON.parse(fs.readFileSync(new URL("ppr3/params/PPR3_S2_CANDIDATE.json", R))), P2 = JSON.parse(fs.readFileSync(new URL("ppr3/params/PPR3_P2_CANDIDATE.json", R))), CP = JSON.parse(fs.readFileSync(arg("ctrl"))), BP = JSON.parse(fs.readFileSync(arg("body")));
const steps = B1B.onset + B1B.window, run = { S2P2: (p) => P3.runOne(BT.makeJob("S2P2", { body: S2, ctrl: P2 }, { steps, perturb: p })), M1B_B1: (p) => B1.runOne({ law: "M1B", params: BP, ctrl: () => new CT.BalanceController(CP), steps, perturb: p }) };
const out = { battery: { J: B1B.J, onset: B1B.onset, pulse: B1B.pulse }, runs: {} };
for (const [sys, f] of Object.entries(run)) { const base = await f([]); out.runs[sys] = {};
  for (const dir of ["fwd", "back"]) for (const mag of ["small", "moderate"]) { const o = await f(BT.pushJob(dir, B1B.J[dir][mag], B1B.onset, B1B.pulse)), h = humanMetrics(base, o, B1B.onset, dir);
    out.runs[sys][dir + "." + mag] = { J: B1B.J[dir][mag], ankleAPslewNms: h.torqueSlew.ankleAP, ankleAPpeakNm: h.torquePeak.ankleAP, hipAPslewNms: h.torqueSlew.hipAP, fall: !!(o.stop) }; console.log(sys, dir, mag, "ankle AP slew", h.torqueSlew.ankleAP.toFixed(0), "N·m/s peak", h.torquePeak.ankleAP.toFixed(1), "N·m"); } }
fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));

// BALANCE-3 causality audit (frozen with the B3 preregistration): the unchanged C3 audit (balance2/scripts/c3_causality.mjs: C1 sensed index exact,
// C2 commands identical through the shortest delay, C3 C2-internal state, C4 governor trace) plus
//   C5  the H-mode objective's torque trace bit-identical to the undisturbed twin until its fastest input channel can contain the disturbance:
//       first difference ≥ onset + 1 + min(hipAng, orientRate) delay
// usage (worktree root): node .../b3_causality.mjs --ctrl <json> --ctrlModule <path> --ctrlClass <name> --label <id> --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, BT = await import(RA + "ppr3/scripts/ppr3_battery.mjs"), { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), { B2M } = await import(RA + "balance2/scripts/b2_qualify.mjs");
const { audit3 } = await import(RA + "balance2/scripts/c3_causality.mjs"), { PUSHES } = await import(RA + "balance2/scripts/b2_causality.mjs"), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export async function audit5(CFG) { const A = await audit3(CFG), CM = await import(CFG.ctrlModule), Ctrl = CM[CFG.ctrlClass], body = JSON.parse(fs.readFileSync(new URL("balance1/params/B1_BODY.json", RA)));
  const D = CFG.ctrl.delays, q = CFG.ctrl.b3, hD = Math.min(D[q.channel], D[q.rateChannel]), onset = B2M.onset, steps = onset + 240;
  const one = async (perturb) => { let C = null; await runOne({ law: "M1B", params: body, ctrl: () => (C = new Ctrl(CFG.ctrl)), steps, perturb }); return C; };
  const tw = await one([]), first = (a, b) => { const n = Math.min(a.length, b.length); for (let i = 0; i < n; i++) if (!Object.is(a[i], b[i])) return i; return null; };
  for (const [dir, lvl] of PUSHES) { const C = await one(BT.pushJob(dir, B2M.J[dir][lvl], onset, B2M.pulse)), r = A.pushes[dir + "." + lvl], i = first(C.diag.hm, tw.diag.hm), s = i == null ? null : C.log.n[i];
    r.C5_firstHmodeDiffStep = s; r.C5_minAllowedStep = onset + 1 + hD; r.C5_ok = s == null || s >= onset + 1 + hD; r.ok = r.ok && r.C5_ok; }
  A.pass = Object.values(A.pushes).every(r => r.ok); return A; }
if (process.argv[1] && process.argv[1].endsWith("b3_causality.mjs")) { const abs = (p) => new URL(p, "file://" + process.cwd() + "/").href, CFG = { ctrl: JSON.parse(fs.readFileSync(arg("ctrl"))), ctrlModule: abs(arg("ctrlModule")), ctrlClass: arg("ctrlClass") };
  const A = await audit5(CFG); A.label = arg("label", ""); fs.writeFileSync(arg("out"), JSON.stringify(A, null, 1)); console.log(A.label, A.pass ? "CAUSAL: PASS" : "CAUSAL: FAIL");
  for (const [k, r] of Object.entries(A.pushes)) console.log(`  ${k.padEnd(14)} cmd≠ @ ${r.firstCommandDiffMs == null ? "-" : r.firstCommandDiffMs.toFixed(1) + " ms"}  C1 ${r.C1_sensedIndexExact}  C2 ${r.C2_commandsIdenticalThroughSensing}  C3 ${r.C3_ok}  C4 ${r.C4_ok}  C5 ${r.C5_ok} (H≠ @ ${r.C5_firstHmodeDiffStep}, ≥ ${r.C5_minAllowedStep})`); }

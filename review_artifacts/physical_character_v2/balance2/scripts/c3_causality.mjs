// BALANCE-2 C3 causality re-audit (frozen with the C3 preregistration). Runs the unchanged BALANCE-2 audit (scripts/b2_causality.mjs: C1 sensed
// index exact, C2 commands identical through the shortest delay, C3 C2-internal state identical until the AP channels can contain the push) and adds
//   C4  the support-envelope governor's trace (desired AP command u, governed ankle / hip commands g / gH, envelope bound H) bit-identical to the
//       undisturbed twin until the AP COM channels can contain the disturbance: first difference ≥ onset + 1 + min(com, comHip) delay — the governor
//       sees the push only through delayed observations and the controller's own commands
// usage (worktree root): node .../c3_causality.mjs --ctrl <json> --ctrlModule <path> --ctrlClass <name> --label <id> --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, BT = await import(RA + "ppr3/scripts/ppr3_battery.mjs"), { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), { B2M } = await import(new URL("./b2_qualify.mjs", import.meta.url).href);
const { audit, PUSHES } = await import(new URL("./b2_causality.mjs", import.meta.url).href), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export async function audit3(CFG) { const A = await audit(CFG), CM = await import(CFG.ctrlModule), Ctrl = CM[CFG.ctrlClass], body = JSON.parse(fs.readFileSync(new URL("balance1/params/B1_BODY.json", RA)));
  const D = CFG.ctrl.delays, apD = Math.min(D.com, D[CFG.ctrl.com.hipChannel] || D.com), onset = B2M.onset, steps = onset + 240;
  const one = async (perturb) => { let C = null; await runOne({ law: "M1B", params: body, ctrl: () => (C = new Ctrl(CFG.ctrl)), steps, perturb }); return C; };
  const tw = await one([]), first = (a, b) => { const n = Math.min(a.length, b.length); for (let i = 0; i < n; i++) if (!Object.is(a[i], b[i])) return i; return null; };
  for (const [dir, lvl] of PUSHES) { const C = await one(BT.pushJob(dir, B2M.J[dir][lvl], onset, B2M.pulse)), r = A.pushes[dir + "." + lvl], st = (i) => (i == null ? null : C.log.n[i]);
    if (!C.diag || !C.diag.u || !tw.diag.u) { r.C4_ok = null; continue; } // no governor (C2 / B): C4 not applicable
    const d = { u: st(first(C.diag.u, tw.diag.u)), g: st(first(C.diag.g, tw.diag.g)), gH: st(first(C.diag.gH, tw.diag.gH)), lim: st(first(C.diag.lim, tw.diag.lim)) };
    r.C4_firstGovernorDiffStep = d; r.C4_ok = Object.values(d).every(s => s == null || s >= onset + 1 + apD); r.ok = r.ok && r.C4_ok; }
  A.pass = Object.values(A.pushes).every(r => r.ok); return A; }
if (process.argv[1] && process.argv[1].endsWith("c3_causality.mjs")) { const abs = (p) => new URL(p, "file://" + process.cwd() + "/").href, CFG = { ctrl: JSON.parse(fs.readFileSync(arg("ctrl"))), ctrlModule: abs(arg("ctrlModule")), ctrlClass: arg("ctrlClass") };
  const A = await audit3(CFG); A.label = arg("label", ""); fs.writeFileSync(arg("out"), JSON.stringify(A, null, 1)); console.log(A.label, A.pass ? "CAUSAL: PASS" : "CAUSAL: FAIL");
  for (const [k, r] of Object.entries(A.pushes)) console.log(`  ${k.padEnd(14)} cmd≠ @ ${r.firstCommandDiffMs == null ? "-" : r.firstCommandDiffMs.toFixed(1) + " ms"}  C1 ${r.C1_sensedIndexExact}  C2 ${r.C2_commandsIdenticalThroughSensing}  C3 ${r.C3_ok}  C4 ${r.C4_ok} ${JSON.stringify(r.C4_firstGovernorDiffStep)}`); }

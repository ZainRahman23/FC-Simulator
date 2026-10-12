// BALANCE-2 §14 causality re-audit (frozen with the successor preregistration, before any C2 battery run). Beyond B2M's P5 (commands bit-identical
// to the undisturbed twin until the disturbance enters the shortest channel; first command difference ≥ onset + 1 + the shortest delay; first
// activation difference not before it), for each audited push it checks, from the controller's OWN logs:
//   C1  every logged step, every channel: the physical step index behind the observation = n − that channel's delay (or the entry sample before it)
//   C2  commands bit-identical to the twin through onset + the shortest delay (the step at which the disturbance can first be sensed)
//   C3  successor internal state (AP integral term, quiet-band gate, internal-model developed-force history) bit-identical to the twin until the
//       AP COM channels can contain the disturbance: first difference ≥ onset + 1 + min(com, comHip) delay — so the new mechanisms see the push
//       only through delayed observations / own commands, never through the plant
// usage (worktree root): node .../b2_causality.mjs --ctrl <json> [--ctrlModule <path> --ctrlClass <name>] --label <id> --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, BT = await import(RA + "ppr3/scripts/ppr3_battery.mjs"), { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), { B2M } = await import(new URL("./b2_qualify.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const PUSHES = [["fwd", "moderate"], ["back", "moderate"], ["left", "moderate"], ["right", "moderate"], ["fwd", "limit"], ["fwd", "over"]];
export async function audit(CFG) { const CM = await import(CFG.ctrlModule || (RA + "balance1/scripts/b1_ctrl.mjs")), Ctrl = CM[CFG.ctrlClass || "BalanceController"], body = JSON.parse(fs.readFileSync(new URL("balance1/params/B1_BODY.json", RA)));
  const D = CFG.ctrl.delays, minD = Math.min(...Object.values(D)), apD = Math.min(D.com, D[CFG.ctrl.com.hipChannel] || D.com), onset = B2M.onset, steps = onset + 240;
  const one = async (perturb) => { let C = null; const o = await runOne({ law: "M1B", params: body, ctrl: () => (C = new Ctrl(CFG.ctrl)), steps, perturb }); return { o, C }; };
  const tw = await one([]), out = { minDelaySteps: minD, apDelaySteps: apD, onset, pushes: {} };
  const firstDiff = (a, b, eq) => { const n = Math.min(a.length, b.length); for (let i = 0; i < n; i++) if (!eq(a[i], b[i])) return i; return null; };
  const sameArr = (x, y) => x.length === y.length && x.every((v, i) => Object.is(v, y[i]));
  for (const [dir, lvl] of PUSHES) { const J = B2M.J[dir][lvl], ps = await one(BT.pushJob(dir, J, onset, B2M.pulse)), L = ps.C.log, Lt = tw.C.log, chans = Object.values(D);
    let c1 = true, c1bad = null; L.n.forEach((n, q) => { L.sensed[q].forEach((s, j) => { const want = n - chans[j]; if (!(s === want)) { c1 = false; c1bad = c1bad || { n, channel: Object.keys(D)[j], sensed: s, want }; } }); });
    const fc = firstDiff(L.cmd, Lt.cmd, sameArr), fcN = fc == null ? null : L.n[fc], c2 = fcN == null || fcN > onset + minD;
    const r = { J, firstCommandDiffStep: fcN, firstCommandDiffMs: fcN == null ? null : (fcN - onset) * 1000 / 240, C1_sensedIndexExact: c1, C1_firstBad: c1bad, C2_commandsIdenticalThroughSensing: c2 };
    if (ps.C.diag && tw.C.diag) { const dI = firstDiff(ps.C.diag.fI, tw.C.diag.fI, Object.is), dG = firstDiff(ps.C.diag.gate, tw.C.diag.gate, Object.is), dF = firstDiff(ps.C.diag.fm, tw.C.diag.fm, Object.is), stepOf = (i) => (i == null ? null : L.n[i]);
      r.C3_firstIntegralDiffStep = stepOf(dI); r.C3_firstGateDiffStep = stepOf(dG); r.C3_firstModelForceDiffStep = stepOf(dF); r.C3_ok = [stepOf(dI), stepOf(dG), stepOf(dF)].every(s => s == null || s >= onset + 1 + apD); }
    else r.C3_ok = null;
    r.ok = c1 && c2 && r.C3_ok !== false; out.pushes[dir + "." + lvl] = r; }
  out.pass = Object.values(out.pushes).every(r => r.ok); return out; }
if (process.argv[1] && process.argv[1].endsWith("b2_causality.mjs")) { const CFG = { ctrl: JSON.parse(fs.readFileSync(arg("ctrl"))), ctrlModule: arg("ctrlModule") ? new URL(arg("ctrlModule"), "file://" + process.cwd() + "/").href : undefined, ctrlClass: arg("ctrlClass") };
  const A = await audit(CFG); A.label = arg("label", ""); fs.writeFileSync(arg("out"), JSON.stringify(A, null, 1)); console.log(A.label, A.pass ? "CAUSAL: PASS" : "CAUSAL: FAIL");
  for (const [k, r] of Object.entries(A.pushes)) console.log(`  ${k.padEnd(14)} cmd≠ @ ${r.firstCommandDiffMs == null ? "-" : r.firstCommandDiffMs.toFixed(1) + " ms"}  C1 ${r.C1_sensedIndexExact}  C2 ${r.C2_commandsIdenticalThroughSensing}  C3 ${r.C3_ok}${r.C3_firstIntegralDiffStep != null ? " (I≠ @ step " + r.C3_firstIntegralDiffStep + ")" : ""}`); }

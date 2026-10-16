// turn1/tools/t1_check.cjs — TURN-1 regression: every scenario twice (determinism: identical state hashes of the 240 Hz log and of the joint positions at
// 60 Hz), objective metrics (plant slip while loaded, reach clamps, joint ranges, speed dip, response latency: request → plant touchdown, request → heading
// within 5° of the request), CPU (sim step, pose evaluation). usage: node t1_check.cjs [--only id,id] [--out file.json]
const { measure, X, T } = require("./t1_metrics.cjs"), SCN = require("../turn1_scenarios.js"), crypto = require("crypto"), fs = require("fs");
const arg = (k) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; };
const DEG = Math.PI / 180, ids = arg("only") ? arg("only").split(",") : Object.keys(SCN.all);
function runHash(scn) { const A = T.t1Make(X.skel, scn.init), h = crypto.createHash("sha256"); const n = Math.round(scn.dur * 240); let tStep = 0, tPose = 0, nPose = 0;
  for (let k = 0; k < n; k++) { const a = performance.now(); T.t1Step(A, T.t1Input(scn, k / 240)); tStep += performance.now() - a; const r = A.log[A.log.length - 1]; h.update(`${r.x.toFixed(9)},${r.y.toFixed(9)},${r.vx.toFixed(9)},${r.vy.toFixed(9)},${r.psi.toFixed(9)};`);
    if (k % 4 === 0) { const b = performance.now(), ev = T.t1Evaluate(A); tPose += performance.now() - b; nPose++; for (const j of ev.fk.joint) h.update(`${j[0].toFixed(6)},${j[1].toFixed(6)},${j[2].toFixed(6)}|`); } }
  return { hash: h.digest("hex").slice(0, 16), msStep: tStep / n, msPose: tPose / nPose, A }; }
const out = { note: "TURN-1 regression (t1_check.cjs)", scenarios: {} }; let fails = 0;
for (const id of ids) {
  const scn = SCN.get(id), a = runHash(scn), b = runHash(scn), m = measure(scn), A = m.A, L = A.log;
  const tc = scn.cmds && scn.cmds.length ? scn.cmds[0].t : null, last = scn.cmds && scn.cmds.length ? scn.cmds[scn.cmds.length - 1] : null;
  const plant = A.events.find(e => e[1] === "TD" && e[3] === "PLANT"), man = A.events.find(e => e[1] === "maneuver");
  let tHead = null; if (last && last.turn != null) { const want = (scn.heading || 0) + Math.max(-179.5, Math.min(179.5, last.turn)) * DEG; for (const r of L) if (r.t >= last.t && Math.abs(T.wrapA(r.thv - want)) < 5 * DEG && r.s > 0.5) { tHead = +(r.t - last.t).toFixed(3); break; } }
  const det = a.hash === b.hash; if (!det) fails++;
  out.scenarios[id] = { label: scn.label, deterministic: det, hash: a.hash, slipMaxCm: m.slipMaxCm, reachMax: m.reachMax, reachClampSamples: m.reachClampSamples, joints: m.joints, speedMin: m.speedMin, accMax: m.accMax,
    maneuver: man ? man.slice(2) : null, plantAfterS: plant && tc != null ? +(plant[0] - tc).toFixed(3) : null, headingWithin5degAfterS: tHead, headingEnd: m.headingEnd, msStep: +a.msStep.toFixed(4), msPose: +a.msPose.toFixed(3) };
  const r = out.scenarios[id]; console.log(`${det ? "DET " : "NONDET"} ${id.padEnd(18)} slip ${String(r.slipMaxCm).padStart(5)} cm  reach ${r.reachMax.toFixed(3)}  vmin ${r.speedMin.toFixed(2)}  ${r.maneuver ? r.maneuver.slice(0, 2).join("/") + " plant +" + r.plantAfterS : "arc/none"}  heading±5° +${r.headingWithin5degAfterS}  step ${r.msStep} ms  pose ${r.msPose} ms`);
}
out.fails = fails; if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1)); console.log(fails ? fails + " NONDETERMINISTIC" : "all deterministic");

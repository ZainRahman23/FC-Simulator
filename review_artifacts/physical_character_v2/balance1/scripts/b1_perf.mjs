// BALANCE-1 performance (after the verdict; BALANCE1_PREREGISTRATION.md §11): CPU per 240 Hz step of the M1b muscle layer (compute + after),
// the BALANCE-1 controller, the solver and the whole runner, on 30 s of quiet standing (records on, so the final hash is checkable; instrumentation cost reported separately); state sizes; snapshot / restore cost;
// 22-player estimate. Timing wrappers are installed in THIS process only (prototype methods wrapped for measurement; behaviour unchanged — the
// run's final hash is printed and must equal an unwrapped run). usage: node b1_perf.mjs --ctrl <ctrl.json> --body <body.json> [--out <json>]
import fs from "fs"; import os from "os";
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), MUS = await import(PL.P2 + "sim/v2_muscle.js");
const { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), CT = await import(RA + "balance1/scripts/b1_ctrl.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, cp = JSON.parse(fs.readFileSync(arg("ctrl"))), bp = JSON.parse(fs.readFileSync(arg("body")));
const now = () => performance.now(), T = { muscle: 0, ctrl: 0 }, wrap = (proto, name, key) => { const f = proto[name]; proto[name] = function (...a) { const t0 = now(), r = f.apply(this, a); T[key] += now() - t0; return r; }; };
const steps = 240 * 30, ref = await runOne({ law: "M1B", params: bp, ctrl: () => new CT.BalanceController(cp), steps });
wrap(MUS.MuscleLayer.prototype, "compute", "muscle"); wrap(MUS.MuscleLayer.prototype, "after", "muscle"); wrap(CT.BalanceController.prototype, "step", "ctrl");
let ctl, A = null; const t0 = now(), o = await runOne({ law: "M1B", params: bp, ctrl: () => (ctl = new CT.BalanceController(cp)), steps, onStep: (sim) => { A = sim.runner.act; } }), wall = now() - t0;
const per = (ms) => +(ms / o.recs.length * 1000).toFixed(2), us = { muscle: per(T.muscle), controller: per(T.ctrl), solver: per(o.cpu.step), passiveV2: per(o.cpu.passive), instrumentAndMeasure: per(o.cpu.instrument + o.cpu.measure), wallTotalInstrumented: per(wall) };
// state: muscle layer floats; controller = sensor ring (maxD samples) + integrators + noise filters + B's efference lines (counted from the live object)
const sampleFloats = (s) => JSON.stringify(s).split(",").length, ctrlFloats = ctl.ring.size * sampleFloats(ctl.ring.values().next().value) + 4 + (ctl.nz ? ctl.nz.size : 0) + (ctl.pred && ctl.pred.FmHist ? ctl.pred.FmHist.length * 2 + 2 * (2 + 2 + 2) : 0);
// snapshot / restore of the muscle state (1000×)
let snapUs = null, restUs = null; if (A) { const N = 1000; let t = now(), v; for (let i = 0; i < N; i++) v = A.state(); snapUs = (now() - t) / N * 1000; t = now(); for (let i = 0; i < N; i++) A.setState(v); restUs = (now() - t) / N * 1000; }
const res = { cpu: os.cpus()[0].model, node: process.version, steps: o.recs.length, finalHash: o.finalHash, refHash: ref.finalHash, hashUnchangedByTiming: o.finalHash === ref.finalHash, usPerStep: us,
  stateFloats: { muscle: o.muscleState ? o.muscleState.length : null, controllerApprox: ctrlFloats }, snapshotUs: snapUs, restoreUs: restUs, budgetMsPerStep: 1000 / 240 };
res.estimate22 = { bodyControlMsPerStep: +((us.muscle + us.controller) * 22 / 1000).toFixed(3), note: "M1b + controller scale linearly per character; the solver / contact cost for 22 characters is NOT measured here (1 character on the PPR-2 plant)" };
if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));

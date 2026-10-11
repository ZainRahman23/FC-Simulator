// ABI-1 PRE-RUN IMPLEMENTATION CHECKS (disclosed in ABI1_PRERUN_FREEZE.md; NO contact run — nothing here observes the collision):
//   K1  B-C0 and C-C0 (no cross contact) for 60 steps: finite; state hashes = A-C0 through step d + 1; no step triggered in C0.
//   K2  code-path exercise of C's swing / touchdown / hold branches WITHOUT the tackler: mode C0, and a SYNTHETIC sensing fault that reports
//       foot_R unloaded for frames 1–40 (test-only sensing override; the physics and the plant are unchanged). The XcoM is then outside the
//       left-foot-only support, so the step law must trigger, swing the right foot, detect touchdown by sensed load and hold. Pass = no exception,
//       finite states, phases visited SWING → HOLD, IK residual reported. Its motion is not evidence about the collision.
// usage: V2_KNEE_MODEL=v2k node abi1_precheck.mjs <fixture.json> <out.json>
import fs from "fs";
const R = await import(new URL("./abi1_run.mjs", import.meta.url).href), PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { V } = PL;
const { AbiPlant } = await import(new URL("./abi1_plant.mjs", import.meta.url).href), CT = await import(new URL("./abi1_ctrl.mjs", import.meta.url).href);
const [FIXF, OUTF] = process.argv.slice(2), FIX = JSON.parse(fs.readFileSync(FIXF)), out = { tool: "abi1_precheck.mjs", K1: {}, K2: {} };
const entries = { runner: FIX.write.runner, tackler: FIX.write.tackler };
const runPlant = (controller, steps, mode = "C0") => { const sim = new AbiPlant(R.Jolt, entries, FIX.flags, mode, { O: FIX.O, instrument: true, controller }); while (sim.n < steps) sim.tick(); const recs = sim.recs, meta = sim.ctl ? sim.ctl.meta() : null; sim.destroy(); return { recs, meta }; };
const A = runPlant(null, 60);
for (const cond of ["B", "C"]) { const r = runPlant((p) => new CT.GBC1Ctl(p, { step: cond === "C" }), 60); let last = 0; for (let i = 0; i < 60 && r.recs[i].hash === A.recs[i].hash; i++) last = i + 1;
  const fin = r.recs.every(x => x.chars.runner.integrity.finite), steps = r.recs.filter(x => x.ctl && x.ctl.step).length, dmax = Math.max(...r.recs.map(x => (x.ctl ? x.ctl.dtauMax : 0)));
  out.K1[cond] = { lastIdenticalToA: last, finite: fin, stepTicks: steps, maxAbsDtauNm: dmax, frameKeys: r.meta.frameKeys, pass: fin && last >= 30 && steps === 0 }; }
{ class FaultCtl extends CT.GBC1Ctl { sense(rec, plant) { super.sense(rec, plant); if (rec.n <= 40) this.frames[rec.n].F = [this.frames[rec.n].F[0], 0]; } }
  let err = null, r = null; try { r = runPlant((p) => new FaultCtl(p, { step: true }), 200); } catch (e) { err = String(e && e.stack || e); }
  if (r) { const ph = []; r.recs.forEach(x => { const p = x.ctl && x.ctl.step ? x.ctl.step.phase : "IDLE"; if (!ph.length || ph[ph.length - 1].phase !== p) ph.push({ n: x.n, phase: p }); });
    const ik = r.recs.filter(x => x.ctl && x.ctl.step && x.ctl.step.ikErr != null).map(x => x.ctl.step.ikErr), fin = r.recs.every(x => x.chars.runner.integrity.finite);
    out.K2 = { phases: ph, maxIkErr: ik.length ? Math.max(...ik) : null, finite: fin, nonFootTurf: [...new Set(r.recs.flatMap(x => x.chars.runner.nonFootTurf))], pass: fin && ph.some(p => p.phase === "SWING") && ph.some(p => p.phase === "HOLD") }; }
  else out.K2 = { error: err, pass: false }; }
fs.writeFileSync(OUTF, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));

// ABI-1 S-CPU (prereg §9): 10 timed N2 / ALL runs per condition in one process (after one warm-up run), per-step wall-clock means of every plant
// phase; the controller's own cost = cpu.ctl (command) + cpu.sense (frame build). Record instrumentation (contact decode, ledgers) is reported separately.
// usage: V2_KNEE_MODEL=v2k node abi1_cpu.mjs <fixture.json> <out.json>
import fs from "fs";
const R = await import(new URL("./abi1_run.mjs", import.meta.url).href), [FIXF, OUTF] = process.argv.slice(2), out = { tool: "abi1_cpu.mjs", node: process.version, runs: 10, perStepMs: {} };
for (const cond of ["A", "B", "C"]) { await R.runOne({ cond, mode: "N2", fixture: FIXF });
  const acc = {}; let steps = 0; for (let i = 0; i < 10; i++) { const o = await R.runOne({ cond, mode: "N2", fixture: FIXF }); steps += o.recs.length; for (const [k, v] of Object.entries(o.cpu)) acc[k] = (acc[k] || 0) + v; }
  const ps = Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, v / steps])); ps.controller = (ps.ctl || 0) + (ps.sense || 0); ps.physicsAndPlant = ps.step + ps.passive + ps.act + ps.tone - (ps.ctl || 0); out.perStepMs[cond] = ps;   // cpu.tone contains cpu.ctl; cpu.measure contains cpu.sense
  console.log(cond, JSON.stringify(Object.fromEntries(Object.entries(ps).map(([k, v]) => [k, +v.toFixed(4)])))); }
fs.writeFileSync(OUTF, JSON.stringify(out, null, 1));

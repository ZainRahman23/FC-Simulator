// BALANCE-1 trajectory runner (the PPR-3 runner's plant stack, unchanged): the runner ALONE (scene SOLO) from the PPR-3 standing entry. PVP is sealed:
// there is no option to run a PVP scene. law: "A" = CURRENT V2 (SnapshotTone + legacy ActuatorLayer) | "S2" = PPR-3 S2Law (+ ctrl, e.g. old P2) |
// "M1B" = the canonical M1b MuscleLayer body (b1_body.mjs) (+ ctrl).
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { PV, IL } = PL;
const { Ppr2Plant } = await import(RA + "ppr2/scripts/ppr2_plant.mjs"), { loadJolt } = await import(PL.P2 + "core/v2_jolt.js");
const S2B = await import(RA + "ppr3/scripts/ppr3_body.mjs"), MB = await import(new URL("./b1_body.mjs", import.meta.url).href);
export const Jolt = await loadJolt(PL.P2 + "vendor/jolt-physics.wasm-compat.js");
export const ENTRY = new URL("../../ppr3/fixture/PPR3_STANDING_ENTRY.json", import.meta.url);
export async function runOne(job, J = Jolt) {
  if (job.scene && job.scene !== "SOLO") throw new Error("BALANCE-1: SOLO only (PVP is sealed)");
  const FIX = job.fixtureObj || JSON.parse(fs.readFileSync(job.fixture || ENTRY)), steps = job.steps || 240; let ctrl = null;
  const law = job.law === "A" ? null : job.law === "S2" ? (p, c) => { ctrl = job.ctrl ? job.ctrl(p) : null; return new S2B.S2Law(p, c, job.params, ctrl); } : (p, c) => { ctrl = job.ctrl ? job.ctrl(p) : null; return new MB.M1bBody(p, c, job.params || {}, ctrl); };
  const sim = new Ppr2Plant(J, { runner: FIX.write.runner, tackler: FIX.write.tackler }, FIX.flags, "N2", { O: FIX.O, instrument: job.instrument !== false, solo: "runner", maxSteps: steps, law, perturb: job.perturb || [], impactor: null, platform: null, drive: null });
  const out = { job: { law: job.law, steps, label: job.label || null, perturb: job.perturb || [], params: job.law === "A" ? null : job.params, ctrl: ctrl && ctrl.meta ? ctrl.meta() : null }, protocol: "BALANCE-1" };
  out.entry = { law0: sim.law ? sim.law.entryInfo() : null };
  const unsafe = () => { const r = sim.recs[sim.recs.length - 1]; if (!r) return null; const c = r.chars.runner; if (!c.integrity.finite) return "non-finite state"; if (c.integrity.maxSpeed > PV.integrity.speedMax) return `speed ${c.integrity.maxSpeed.toFixed(1)} m/s`; return null; };
  const t0 = performance.now();
  while (sim.n < steps) { if (!sim.tick()) break; if (job.onStep) job.onStep(sim); const u = job.instrument === false ? null : unsafe(); if (u) { out.stop = { step: sim.n, t: sim.n * sim.dt, reason: u }; break; } }
  out.wallMs = performance.now() - t0; out.recs = sim.recs; out.cpu = sim.cpu; out.lawMeta = sim.law ? sim.law.meta() : null; out.ctrlLog = ctrl && ctrl.log ? ctrl.log : null; out.status = "RAN";
  out.muscleState = job.law === "M1B" ? sim.runner.act.state() : null;
  out.finalHash = IL.sha256(JSON.stringify(out.recs.map(r => r.hash))).slice(0, 16); sim.destroy(); return out;
}

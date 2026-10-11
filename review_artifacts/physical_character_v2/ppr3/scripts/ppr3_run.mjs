// PPR-3 trajectory runner. The runner ALONE (scene SOLO) from the PPR-3 standing entry (ppr3/fixture/PPR3_STANDING_ENTRY.json) unless another
// SOLO fixture is passed. PVP is sealed in PPR-3: there is no option to run a PVP scene (N2 / C0) from this runner at all.
// law: "A" = CURRENT V2 (IFM-1 SnapshotTone, unchanged) | "S2" = ppr3_body.mjs S2Law with params, optional controller factory job.ctrl(plant) → P2.
// Plant: PPR-2's plant (platform / drive fixtures for isolated tests) on PPR-1's plant (perturbations, measurement) on the frozen PVP-1A plant.
import fs from "fs";
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { PV, IL } = PL;
const { Ppr2Plant } = await import(new URL("../../ppr2/scripts/ppr2_plant.mjs", import.meta.url).href), { loadJolt } = await import(PL.P2 + "core/v2_jolt.js");
const BODY = await import(new URL("./ppr3_body.mjs", import.meta.url).href);
export const Jolt = await loadJolt(PL.P2 + "vendor/jolt-physics.wasm-compat.js");
export const ENTRY = new URL("../fixture/PPR3_STANDING_ENTRY.json", import.meta.url);
export async function runOne(job, J = Jolt) {
  if (job.scene && job.scene !== "SOLO") throw new Error("PPR-3: SOLO only (PVP is sealed)");
  const FIX = job.fixtureObj || JSON.parse(fs.readFileSync(job.fixture || ENTRY)), steps = job.steps || 240;
  let ctrl = null; const law = job.law === "A" ? null : (p, c) => { ctrl = job.ctrl ? job.ctrl(p) : null; return new BODY.S2Law(p, c, job.params, ctrl); };
  const sim = new Ppr2Plant(J, { runner: FIX.write.runner, tackler: FIX.write.tackler }, FIX.flags, "N2", { O: FIX.O, instrument: job.instrument !== false, solo: "runner", maxSteps: steps, law, perturb: job.perturb || [], impactor: null, platform: job.platform ? { ...job.platform } : null, drive: job.drive ? { ...job.drive } : null });
  const out = { job: { law: job.law, steps, label: job.label || null, perturb: job.perturb || [], platform: job.platform || null, drive: job.drive || null, params: job.law === "A" ? null : job.params, ctrl: ctrl ? ctrl.meta() : null }, protocol: "PPR-3 (standing foundation)" };
  out.entry = { law0: sim.law ? sim.law.entryInfo() : null };
  const unsafe = () => { const r = sim.recs[sim.recs.length - 1]; if (!r) return null; const c = r.chars.runner; if (!c.integrity.finite) return "non-finite state"; if (c.integrity.maxSpeed > PV.integrity.speedMax) return `speed ${c.integrity.maxSpeed.toFixed(1)} m/s`; return null; };
  while (sim.n < steps) { if (!sim.tick()) break; if (job.onStep) job.onStep(sim); const u = job.instrument === false ? null : unsafe(); if (u) { out.stop = { step: sim.n, t: sim.n * sim.dt, reason: u }; break; } }
  out.recs = sim.recs; out.cpu = sim.cpu; out.lawMeta = sim.law ? sim.law.meta() : null; out.ctrlLog = ctrl && ctrl.log ? ctrl.log : null; out.platLog = sim.platLog; out.status = "RAN";
  out.finalHash = IL.sha256(JSON.stringify(out.recs.map(r => r.hash))).slice(0, 16); sim.destroy(); return out;
}

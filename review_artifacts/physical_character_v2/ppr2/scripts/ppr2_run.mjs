// PPR-2 trajectory runner (investigation and, after the freeze, qualification). law "A" = CURRENT V2 (SnapshotTone, unchanged) | "S" = the PPR-2
// substrate with explicit params (ppr2_substrate.mjs). Scenes: SOLO (the runner alone, PVP-1A-DX entry pose) only — PVP-1A-DX stays SEALED here
// (scene N2 / C0 are refused unless opts.unsealPvp is set by the post-qualification replay script).
import fs from "fs";
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { PV, IL, V } = PL;
const { Ppr2Plant } = await import(new URL("./ppr2_plant.mjs", import.meta.url).href), { loadJolt } = await import(PL.P2 + "core/v2_jolt.js");
const SUB = await import(new URL("./ppr2_substrate.mjs", import.meta.url).href);
export const Jolt = await loadJolt(PL.P2 + "vendor/jolt-physics.wasm-compat.js");
export async function runOne(job, J = Jolt) {
  const scene = job.scene || "SOLO"; if (scene !== "SOLO" && !job.unsealPvp) throw new Error("PVP-1A-DX is sealed in PPR-2 until the qualification has passed");
  const FIX = job.fixtureObj || JSON.parse(fs.readFileSync(job.fixture)), steps = job.steps || 240;
  const law = job.law === "A" ? null : (p, c) => new SUB.SubstrateLaw(p, c, job.params || SUB.SUBSTRATE_DEFAULT);
  const sim = new Ppr2Plant(J, { runner: FIX.write.runner, tackler: FIX.write.tackler }, FIX.flags, scene === "SOLO" ? "N2" : scene, { O: FIX.O, instrument: true, solo: scene === "SOLO" ? "runner" : null, maxSteps: steps, law, perturb: job.perturb || [], impactor: job.impactor || null, platform: job.platform ? { ...job.platform } : null, drive: job.drive ? { ...job.drive } : null });
  const out = { job: { law: job.law, scene, steps, label: job.label || null, perturb: job.perturb || [], impactor: job.impactor || null, platform: job.platform || null, drive: job.drive || null, params: job.law === "A" ? null : job.params || SUB.SUBSTRATE_DEFAULT }, protocol: "PPR-2 (standing substrate)" };
  out.entry = { law0: sim.law ? sim.law.entryInfo() : null };
  const unsafe = () => { const r = sim.recs[sim.recs.length - 1]; if (!r) return null; const c = r.chars.runner; if (!c.integrity.finite) return "non-finite state"; if (c.integrity.maxSpeed > PV.integrity.speedMax) return `speed ${c.integrity.maxSpeed.toFixed(1)} m/s`; return null; };
  while (sim.n < steps) { if (!sim.tick()) break; const u = unsafe(); if (u) { out.stop = { step: sim.n, t: sim.n * sim.dt, reason: u }; break; } }
  out.recs = sim.recs; out.cpu = sim.cpu; out.lawMeta = sim.law ? sim.law.meta() : null; out.platLog = sim.platLog; out.status = "RAN";
  out.finalHash = IL.sha256(JSON.stringify(out.recs.map(r => r.hash))).slice(0, 16); sim.destroy(); return out;
}

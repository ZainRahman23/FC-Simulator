// PPR-1 trajectory runner: one run per call. law A (CURRENT V2: frozen SnapshotTone) | B (PHYSIOLOGICAL PRE-REFLEX, ppr1_law.mjs — bound only after
// the preregistration freeze); scene N2 (native PVP-1A-DX contact) | C0 (PVP-1A-DX, contacts disabled) | SOLO (the runner alone, same entry: no tackler
// exists); optional validation disturbance (perturb / impactor; SOLO only). PVP-1A entry checks; safe stop as PVP-1A.
// usage: V2_KNEE_MODEL=v2k node ppr1_run.mjs --law A --scene N2 --fixture <fixture.json> --out <file.json.gz> [--steps 260]
import fs from "fs"; import zlib from "zlib";
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { PV, IL, V } = PL;
const { PprPlant } = await import(new URL("./ppr1_plant.mjs", import.meta.url).href), { loadJolt } = await import(PL.P2 + "core/v2_jolt.js"), TA = await import(PL.P2 + "tools/track_a_lib.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const Jolt = await loadJolt(PL.P2 + "vendor/jolt-physics.wasm-compat.js");
export async function lawFor(law, params) { if (law === "A") return null; if (law !== "B") throw new Error("law " + law);
  const M = await import(new URL("./ppr1_law.mjs", import.meta.url).href); return (plant, runner) => new M.PreReflexLaw(plant, runner, params || M.PPR1_B); }
export async function runOne(job, J = Jolt) {
  const FIX = job.fixtureObj || JSON.parse(fs.readFileSync(job.fixture)), steps = job.steps || PV.steps, scene = job.scene || "N2";
  if (scene !== "SOLO" && (job.perturb || job.impactor)) throw new Error("validation disturbances are SOLO only");
  const entries = { runner: FIX.write.runner, tackler: FIX.write.tackler }, law = job.lawFactory || await lawFor(job.law, job.params);   // lawFactory: labelled diagnostics only
  const sim = new PprPlant(J, entries, FIX.flags, scene === "SOLO" ? "N2" : scene, { O: FIX.O, instrument: true, solo: scene === "SOLO" ? "runner" : null, maxSteps: steps, law, perturb: job.perturb || [], impactor: job.impactor || null });
  const out = { job: { law: job.law, scene, steps, label: job.label || null, perturb: job.perturb || [], impactor: job.impactor || null, params: sim.law ? sim.law.params : null }, protocol: "PPR-1 (physiological passive / pre-reflex response; diagnostic, not PVP-1A)" };
  { const S = sim.readAll(), cache = TA.decodeContacts(TA.saveState(J, sim.w.ps, J.EStateRecorderState_Contacts)); let pos = 0, rot = 0, vel = 0, ang = 0;
    for (const c of sim.chars) entries[c.role].poses.forEach((w, i) => { const s = S[c.bOff + i]; pos = Math.max(pos, V.dist(s.pos, w.pos)); rot = Math.max(rot, IL.qangRad(s.rot, w.rot)); vel = Math.max(vel, V.dist(s.v, entries[c.role].vel[i].v)); ang = Math.max(ang, V.dist(s.w, entries[c.role].vel[i].w)); });
    out.entry = { writes: sim.writes, readback: { posM: pos, rotRad: rot, velMs: vel, angRadS: ang }, cacheClean: cache.pairs.length === 0, measure: sim.entryMeasure, E0: Object.fromEntries(sim.chars.map(c => [c.role, c.E0])),
      stateHash: IL.hashNums([].concat(...S.map(b => [...b.pos, ...b.rot, ...b.v, ...b.w]))), law0: sim.law ? sim.law.entryInfo() : null };
    out.entry.pass = pos < 1e-5 && rot < 1e-5 && vel < 1e-5 && ang < 1e-5 && out.entry.cacheClean && sim.writes === 2 * sim.nbAll; }
  const unsafe = () => { const r = sim.recs[sim.recs.length - 1]; if (!r) return null; for (const [role, c] of Object.entries(r.chars)) { if (!c.integrity.finite) return role + ": non-finite state"; if (c.integrity.maxSpeed > PV.integrity.speedMax) return `${role}: speed ${c.integrity.maxSpeed.toFixed(1)} m/s`; } return null; };
  while (sim.n < steps) { if (!sim.tick()) break; const u = unsafe(); if (u) { out.stop = { step: sim.n, t: sim.n * sim.dt, reason: u }; break; } }
  out.recs = sim.recs; out.cpu = sim.cpu; out.lawMeta = sim.law ? sim.law.meta() : null; out.status = "RAN"; out.spec = { tone: sim.runner.tone.map(T => ({ k: T.k, K: T.K, D: T.D, bias: T.bias })) };
  out.finalHash = IL.sha256(JSON.stringify(out.recs.map(r => r.hash))).slice(0, 16); sim.destroy(); return out;
}
if (process.argv[1] && process.argv[1].endsWith("ppr1_run.mjs")) {
  const job = { law: arg("law", "A"), scene: arg("scene", "N2"), fixture: arg("fixture"), steps: arg("steps") ? +arg("steps") : undefined };
  const t0 = performance.now(), o = await runOne(job), f = arg("out"); if (f) fs.writeFileSync(f, zlib.gzipSync(JSON.stringify(o)));
  console.log(`${job.law}/${job.scene}: ${o.status}${o.stop ? " STOP@" + o.stop.step + " " + o.stop.reason : ""} · ${o.recs.length} steps · entry ${o.entry.pass ? "OK" : "FAIL"} · final ${o.finalHash} · ${((performance.now() - t0) / 1000).toFixed(1)} s`);
}

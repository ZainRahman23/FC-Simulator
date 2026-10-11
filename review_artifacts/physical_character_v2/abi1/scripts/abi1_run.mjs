// ABI-1 trajectory runner: one run per process. Condition A | B | C (controller), mode N2 | C0, contact set ALL | LEGS (EXT), tackler entry
// velocity scale (impact-sensitivity diagnostic only; 1 = the fixture). 260 steps of 1/240 s from τ_act; PVP-1A entry checks; safe stop as PVP-1A.
// usage: V2_KNEE_MODEL=v2k node abi1_run.mjs --cond A --mode N2 --fixture <fixture.json> --out <file.json.gz> [--contact ALL] [--vscale 1]
//        secondary arms: [--d 29] (S-DELAY) [--hip 0] [--arms 0] (S-ABL) [--tone 1] (S-TONE: K × 0.561, D × 0.749)
import fs from "fs"; import zlib from "zlib";
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { PV, IL, V } = PL;
const { AbiPlant } = await import(new URL("./abi1_plant.mjs", import.meta.url).href), { loadJolt } = await import(PL.P2 + "core/v2_jolt.js"), TA = await import(PL.P2 + "tools/track_a_lib.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const Jolt = await loadJolt(PL.P2 + "vendor/jolt-physics.wasm-compat.js");
// controller factories by condition (A = none: the frozen PVP-1A response). B / C are bound only after the ABI-1 preregistration freeze.
export const TONE_SCALE = Object.freeze({ k: 0.561, d: 0.749 });
export async function controllerFor(cond, o = {}) { if (cond === "A") return null;
  const M = await import(new URL("./abi1_ctrl.mjs", import.meta.url).href); return (plant) => new M.GBC1Ctl(plant, { step: cond === "C", d: o.d ?? 29, hip: o.hip ?? true, arms: o.arms ?? true }); }
export async function runOne(job, J = Jolt) {
  const FIX = job.fixtureObj || JSON.parse(fs.readFileSync(job.fixture)), steps = job.steps || PV.steps, vs = job.vscale ?? 1;
  const entries = { runner: FIX.write.runner, tackler: vs === 1 ? FIX.write.tackler : { ...FIX.write.tackler, vel: FIX.write.tackler.vel.map(x => ({ v: V.sc(x.v, vs), w: V.sc(x.w, vs) })) } };
  const controller = await controllerFor(job.cond, { d: job.d, hip: job.hip, arms: job.arms });
  const sim = new AbiPlant(J, entries, FIX.flags, job.mode, { O: FIX.O, instrument: true, contactSet: job.contact || "ALL", controller, toneScale: job.tone ? TONE_SCALE : null });
  const out = { job: { cond: job.cond, mode: job.mode, contact: job.contact || "ALL", vscale: vs, steps, d: job.d ?? null, hip: job.hip ?? null, arms: job.arms ?? null, tone: !!job.tone }, protocol: "ABI-1 (active balance investigation; diagnostic, not PVP-1A)", tauAct: FIX.tauAct, fixture: FIX.fixture || null, cf1: FIX.cf1 || null, entry: {}, recs: [], stop: null };
  { const S = sim.readAll(), cache = TA.decodeContacts(TA.saveState(J, sim.w.ps, J.EStateRecorderState_Contacts)); let pos = 0, rot = 0, vel = 0, ang = 0;
    for (const c of sim.chars) entries[c.role].poses.forEach((w, i) => { const s = S[c.bOff + i]; pos = Math.max(pos, V.dist(s.pos, w.pos)); rot = Math.max(rot, IL.qangRad(s.rot, w.rot)); vel = Math.max(vel, V.dist(s.v, entries[c.role].vel[i].v)); ang = Math.max(ang, V.dist(s.w, entries[c.role].vel[i].w)); });
    out.entry = { writes: sim.writes, readback: { posM: pos, rotRad: rot, velMs: vel, angRadS: ang }, cacheClean: cache.pairs.length === 0, measure: sim.entryMeasure, E0: Object.fromEntries(sim.chars.map(c => [c.role, c.E0])),
      stateHash: IL.hashNums([].concat(...S.map(b => [...b.pos, ...b.rot, ...b.v, ...b.w]))) };
    out.entry.pass = pos < 1e-5 && rot < 1e-5 && vel < 1e-5 && ang < 1e-5 && out.entry.cacheClean && sim.writes === 2 * sim.nbAll; }
  const unsafe = () => { const r = sim.recs[sim.recs.length - 1]; if (!r) return null; for (const [role, c] of Object.entries(r.chars)) { if (!c.integrity.finite) return role + ": non-finite state"; if (c.integrity.maxSpeed > PV.integrity.speedMax) return `${role}: body speed ${c.integrity.maxSpeed.toFixed(2)} m/s > 25`; } return null; };
  while (sim.n < steps) { if (!sim.tick()) break; const u = unsafe(); if (u) { out.stop = { step: sim.n, t: sim.n * sim.dt, reason: u }; break; } }
  out.recs = sim.recs; out.cpu = sim.cpu; out.ctlMeta = sim.ctl ? sim.ctl.meta() : null; out.status = "RAN";
  out.finalHash = IL.sha256(JSON.stringify(out.recs.map(r => r.hash))).slice(0, 16); sim.destroy(); return out;
}
if (process.argv[1] && process.argv[1].endsWith("abi1_run.mjs")) {
  const job = { cond: arg("cond", "A"), mode: arg("mode", "N2"), fixture: arg("fixture"), contact: arg("contact", "ALL"), vscale: +arg("vscale", "1"), steps: arg("steps") ? +arg("steps") : undefined,
    d: arg("d") ? +arg("d") : undefined, hip: arg("hip") ? arg("hip") !== "0" : undefined, arms: arg("arms") ? arg("arms") !== "0" : undefined, tone: arg("tone", "0") === "1" };
  const t0 = performance.now(), o = await runOne(job), f = arg("out"); if (f) fs.writeFileSync(f, zlib.gzipSync(JSON.stringify(o)));
  const fc = o.recs.find(r => r.contacts.some(c => c.kind === "cross" && V.len(c.J2) >= PV.contactNs));
  console.log(`${job.cond}/${job.mode}/${job.contact}/v×${job.vscale}${job.d ? "/d" + job.d : ""}${job.hip === false ? "/noHip" : ""}${job.arms === false ? "/noArms" : ""}${job.tone ? "/TONE" : ""}: ${o.status}${o.stop ? " STOP@" + o.stop.step + " " + o.stop.reason : ""} · entry ${o.entry.pass ? "OK" : "FAIL"} · steps ${o.recs.length} · first cross contact ${fc ? "step " + fc.n : "none"} · hash ${o.finalHash} · ${((performance.now() - t0) / 1000).toFixed(1)} s`);
}

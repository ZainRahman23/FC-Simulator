// PVP-1A(-DX) trajectory runner: one mode per process (C0 | N2 | X2 | SOLO_R | SOLO_T), 260 steps of 1/240 s from τ_act, entry checks at t = 0,
// safe stop (non-finite or any body > 25 m/s), X2 = N2 to the end of its first cross-contact step + bit-identical no-op restore proof + rejection.
// usage: V2_KNEE_MODEL=v2k node pvp1a_run.mjs --mode N2 --fixture <PVP1A_FIXTURE.json> --out <file.json.gz> [--instrument 0] [--steps 260]
import fs from "fs"; import zlib from "zlib";
const PL = await import(new URL("./pvp1a_lib.mjs", import.meta.url).href), { PV, IL, V, Q, MC, P2 } = PL;
const { PvpPlant } = await import(new URL("./pvp1a_sim.mjs", import.meta.url).href), { loadJolt } = await import(P2 + "core/v2_jolt.js"), TA = await import(P2 + "tools/track_a_lib.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const Jolt = await loadJolt(P2 + "vendor/jolt-physics.wasm-compat.js");
export function runOne(job, J = Jolt) {
  const FIX = job.fixtureObj || JSON.parse(fs.readFileSync(job.fixture)), steps = job.steps || PV.steps, solo = job.mode === "SOLO_R" ? "runner" : job.mode === "SOLO_T" ? "tackler" : null;
  const plantMode = job.mode === "N2" || job.mode === "X2" ? "N2" : "C0", entries = { runner: FIX.write.runner, tackler: FIX.write.tackler };
  const sim = new PvpPlant(J, entries, FIX.flags, plantMode, { O: FIX.O, instrument: job.instrument !== false, solo });
  const out = { job: { mode: job.mode, steps, instrument: job.instrument !== false }, protocol: "PVP-1A-DX (diagnostic; PVP-1A is BLOCKED at H2)", tauAct: FIX.tauAct, entry: {}, recs: [], stop: null };
  // ── t = 0 entry checks ──
  { const S = sim.readAll(), cache = TA.decodeContacts(TA.saveState(J, sim.w.ps, J.EStateRecorderState_Contacts)); let pos = 0, rot = 0, vel = 0, ang = 0;
    for (const c of sim.chars) entries[c.role].poses.forEach((w, i) => { const s = S[c.bOff + i]; pos = Math.max(pos, V.dist(s.pos, w.pos)); rot = Math.max(rot, IL.qangRad(s.rot, w.rot)); vel = Math.max(vel, V.dist(s.v, entries[c.role].vel[i].v)); ang = Math.max(ang, V.dist(s.w, entries[c.role].vel[i].w)); });
    const mom = Object.fromEntries(sim.chars.map(c => { const B = c.spec.bodies, P = S.slice(c.bOff, c.bOff + c.nb).reduce((a, s, i) => V.add(a, V.sc(s.v, B[i].mass)), [0, 0, 0]), Pw = entries[c.role].vel.reduce((a, x, i) => V.add(a, V.sc(x.v, B[i].mass)), [0, 0, 0]); return [c.role, V.dist(P, Pw)]; }));
    out.entry = { writes: sim.writes, readback: { posM: pos, rotRad: rot, velMs: vel, angRadS: ang }, momentumReadbackNs: mom, cacheClean: cache.pairs.length === 0, measure: sim.entryMeasure,
      tone: Object.fromEntries(sim.chars.map(c => [c.role, c.tone.filter(t => t.K).map(t => ({ joint: c.spec.joints[t.k].name, K: t.K, D: t.D, bias: t.bias }))])), E0: Object.fromEntries(sim.chars.map(c => [c.role, c.E0])) };
    out.entry.pass = pos < 1e-5 && rot < 1e-5 && vel < 1e-5 && ang < 1e-5 && Object.values(mom).every(x => x <= PV.entry.momentumNs) && out.entry.cacheClean && sim.writes === 2 * sim.nbAll; }
  const unsafe = () => { const r = sim.recs[sim.recs.length - 1]; if (!r) return null; for (const [role, c] of Object.entries(r.chars)) { if (!c.integrity.finite) return role + ": non-finite state"; if (c.integrity.maxSpeed > PV.integrity.speedMax) return `${role}: body speed ${c.integrity.maxSpeed.toFixed(2)} m/s > 25`; } return null; };
  const runTo = (nEnd) => { while (sim.n < nEnd) { if (!sim.tick()) break; if (sim.instrument) { const u = unsafe(); if (u) { out.stop = { step: sim.n, t: sim.n * sim.dt, reason: u }; return false; } } } return true; };
  const crossStep = (r) => r.contacts.some(c => c.kind === "cross" && V.len(c.J2) >= PV.contactNs);
  if (job.mode !== "X2") { runTo(steps); out.recs = sim.recs; }
  else { let first = null; while (sim.n < steps) { if (!runTo(sim.n + 1)) break; if (crossStep(sim.recs[sim.recs.length - 1])) { first = sim.n; break; } }
    out.xFrom = first; if (first == null) { out.status = "X2_NO_CROSS_CONTACT"; out.recs = sim.recs; }
    else { const snap = sim.snapshot(); runTo(steps); const ref = sim.recs.map(r => r.hash); sim.restore(snap); runTo(steps); const noop = sim.recs.map(r => r.hash);
      out.noopRestore = { identical: JSON.stringify(ref) === JSON.stringify(noop), steps: ref.length }; sim.restore(snap); sim.rejectCross = true; out.stop = null; runTo(steps); out.recs = sim.recs; } }
  out.cpu = sim.cpu; out.status = out.status || "RAN"; out.finalHash = IL.sha256(JSON.stringify(out.recs.map(r => r.hash))).slice(0, 16); sim.destroy(); return out;
}
if (process.argv[1] && process.argv[1].endsWith("pvp1a_run.mjs")) {
  const job = { mode: arg("mode"), fixture: arg("fixture"), instrument: arg("instrument", "1") !== "0", steps: arg("steps") ? +arg("steps") : undefined };
  const t0 = performance.now(), o = runOne(job), f = arg("out"); if (f) fs.writeFileSync(f, zlib.gzipSync(JSON.stringify(o)));
  const last = o.recs[o.recs.length - 1], fc = o.recs.find(r => r.contacts.some(c => c.kind === "cross" && V.len(c.J2) >= PV.contactNs));
  console.log(`${job.mode}: ${o.status}${o.stop ? " STOP@" + o.stop.step + " " + o.stop.reason : ""} · entry ${o.entry.pass ? "OK" : "FAIL " + JSON.stringify(o.entry.readback)} · steps ${o.recs.length} · first cross contact ${fc ? "step " + fc.n + " τ " + fc.tau : "none"} · hash ${o.finalHash}${o.noopRestore ? " · no-op " + JSON.stringify(o.noopRestore) : ""} · ${((performance.now() - t0) / 1000).toFixed(1)} s`);
}

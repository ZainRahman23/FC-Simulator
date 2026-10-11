// IFM-1 trajectory runner (one trajectory per process unless --batch). Reads the FROZEN fixture (ifm1/fixture/IFM1_FIXTURE.json) and runs one
// body / state / role / mode trajectory for 36 steps of 1/240 s (0–150 ms). Entry checks at t = 0 (before the first step) incl. float32 read-back.
// Safe stop: a non-finite state or a body speed above 25 m/s (G1 1.F) ends the trajectory at that step with a marker (no continuation through NaNs).
// usage: node ifm1_run.mjs --body R0 --state S-FLAT --mode C0 [--placement SW] --out f.json
//        node ifm1_run.mjs --body R0 --role SW --mode N --out f.json      |  --mode W --wrench <N output>  |  --mode X --nref <N output>
import fs from "fs"; import path from "path"; import zlib from "zlib";
const L = await import(new URL("./ifm1_lib.mjs", import.meta.url).href), { V, Q, IFM1, ROLES, P2, RA } = L;
const { IFM1Sim, firstStepWrench } = await import(new URL("./ifm1_sim.mjs", import.meta.url).href);
const { loadJolt } = await import(P2 + "core/v2_jolt.js"), TA = await import(P2 + "tools/track_a_lib.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const FIX = JSON.parse(fs.readFileSync(arg("fixture", path.join(RA, "ifm1/fixture/IFM1_FIXTURE.json")))), Jolt = await loadJolt(P2 + "vendor/jolt-physics.wasm-compat.js");
const rd = (f) => JSON.parse(f.endsWith(".gz") ? zlib.gunzipSync(fs.readFileSync(f)) : fs.readFileSync(f));
export async function runOne(job, J = Jolt) {
  const role = job.role ? ROLES.find(r => r.id === job.role) : null, state = role ? role.state : job.state, ekey = `${job.body}/${state}`, entry = FIX.entries[ekey];
  const placementRole = role ? role.id : job.placement || ROLES.find(r => r.state === state).id, fix = FIX.fixtures[`${placementRole}/${job.body}`];
  const out = { job: { ...job, state, placementRole }, fixtureEntryStatus: entry && entry.status, fixtureStatus: fix && fix.status, status: null, entry: {}, recs: [], stop: null };
  if (!entry || entry.status !== "ENTRY_GEOMETRY_OK") { out.status = entry ? entry.status : "STATE_UNAVAILABLE"; return out; }
  if (!fix || fix.status !== "PLACED") { out.status = fix ? fix.status : "FIXTURE_UNAVAILABLE"; return out; }
  const spec = L.SPECS[job.body](), wrench = job.mode === "W" ? firstStepWrench(rd(job.wrench).recs[0]) : null;
  const sim = new IFM1Sim(J, spec, entry, fix, job.mode === "X" ? "N" : job.mode, { wrench, instrument: job.instrument !== false, O: entry.O });
  // ── t = 0 entry checks (no step yet) ──
  { const S = sim.read(), wr = entry.write, B = spec.bodies, M = B.reduce((s, b) => s + b.mass, 0), imp = sim.readImp(), cache = TA.decodeContacts(TA.saveState(J, sim.w.ps, J.EStateRecorderState_Contacts));
    const posErr = Math.max(...S.map((s, i) => V.dist(s.pos, wr.poses[i].pos))), rotErr = Math.max(...S.map((s, i) => L.qangRad(s.rot, wr.poses[i].rot)));   // correction C1: small-angle-stable geodesic angle
    const velErr = Math.max(...S.map((s, i) => V.dist(s.v, wr.vel[i].v))), angErr = Math.max(...S.map((s, i) => V.dist(s.w, wr.vel[i].w))), P = S.reduce((s, b, i) => V.add(s, V.sc(b.v, B[i].mass)), [0, 0, 0]), vA = entry.momentum.vAuth;
    out.entry = { entryWrites: sim.entryWrites, impactorWrites: sim.impWrites, readback: { posM: posErr, rotRad: rotErr, velMs: velErr, angRadS: angErr }, horizontalMomentumErrNs: Math.hypot(P[0] - M * vA[0], P[2] - M * vA[2]),
      momentumReadbackOk: Math.hypot(P[0] - M * vA[0], P[2] - M * vA[2]) <= IFM1.entry.momentumReadbackNs, cacheClean: cache.pairs.length === 0, impactor: { pos: imp.pos, v: imp.v, specifiedV: fix.vImpactor, vErr: V.dist(imp.v, fix.vImpactor) },
      tone: sim.tone.map(t => ({ joint: spec.joints[t.k].name, K: t.K, D: t.D, bias: t.bias })), toneInitCmd: sim.cmdLog[0], initActivation: sim.act.state(), joltSteps: sim.joltSteps, E0: sim.E0, O: entry.O }; }
  const unsafe = () => { const r = sim.recs[sim.recs.length - 1]; if (!r) return null; if (!r.integrity.finite) return "non-finite state"; const vmax = Math.max(...r.S.map(b => V.len(b.v)), V.len(r.imp.v)); return vmax > 25 ? `body speed ${vmax.toFixed(2)} m/s > 25` : null; };
  const runTo = (nEnd) => { while (sim.n < nEnd) { if (!sim.tick()) break; const u = unsafe(); if (u) { out.stop = { step: sim.n, t: sim.n * sim.dt, reason: u }; return false; } } return true; };
  if (job.mode !== "X") { runTo(IFM1.stepsTotal); out.recs = sim.recs; }
  else {   // X: N's first step, snapshot at h; uninterrupted N; no-op restore proof; then the continuation with the receiver–impactor pairs disabled
    runTo(1); const snap = sim.snapshotAll(); runTo(IFM1.stepsTotal); const ref = sim.recs.map(r => r.hash), refFile = job.nref ? rd(job.nref).recs.map(r => r.hash) : null;
    sim.restoreAll(snap); runTo(IFM1.stepsTotal); const noop = sim.recs.map(r => r.hash);
    out.noopRestore = { identicalToUninterrupted: JSON.stringify(noop) === JSON.stringify(ref), identicalToNRun: refFile ? JSON.stringify(ref) === JSON.stringify(refFile) : null, steps: ref.length };
    sim.restoreAll(snap); sim.rejectPair = true; sim.mode = "X"; out.stop = null; runTo(IFM1.stepsTotal); out.recs = sim.recs; }
  out.cpu = { step: sim.cpu.step, passive: sim.cpu.passive, measure: sim.cpu.measure, act: sim.cpu2.act, tone: sim.cpu3.tone, instrument: sim.cpu3.instrument };
  out.joltSteps = sim.joltSteps; out.status = "RAN"; out.finalHash = L.sha256(JSON.stringify(out.recs.map(r => r.hash))).slice(0, 16); out.finalHashR = L.sha256(JSON.stringify(out.recs.map(r => r.hashR))).slice(0, 16);
  out.injected = sim.injected; sim.destroy && sim.destroy(); try { sim.w.destroy(); } catch (e) { }
  return out;
}
if (process.argv[1] && process.argv[1].endsWith("ifm1_run.mjs")) {
  const job = { body: arg("body"), state: arg("state"), role: arg("role"), mode: arg("mode"), placement: arg("placement"), wrench: arg("wrench"), nref: arg("nref"), instrument: arg("instrument", "1") !== "0" };
  const o = await runOne(job), f = arg("out"); const txt = JSON.stringify(o); if (f) fs.writeFileSync(f, f.endsWith(".gz") ? zlib.gzipSync(txt) : txt);
  console.log(`${job.body} ${o.job.state} ${job.role || "control(" + o.job.placementRole + ")"} ${job.mode}: ${o.status}${o.stop ? " STOP@" + o.stop.step + " " + o.stop.reason : ""} · steps ${o.recs.length} · hash ${o.finalHash || "—"} · R ${o.finalHashR || "—"}${o.noopRestore ? " · no-op restore " + JSON.stringify(o.noopRestore) : ""}`);
}

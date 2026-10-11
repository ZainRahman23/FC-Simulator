// IFM-1 CPU (prereg §13): per available primary trajectory, construction timed separately from stepping; one untimed warm-up and 20 fixed
// replays with detailed logging OFF (instrument = false); per-step component times by differencing the plant's own timers each tick:
// Jolt step (cpu.step), passive tissue (cpu.passive), actuator processing (cpu2.act), SnapshotTone (cpu3.tone), G1 measurement (cpu.measure,
// diagnostics — excluded from the production-like step cost and reported separately). Companion check: the final receiver state of each replay must equal
// the instrumented correctness run's step-36 state bit for bit. MC-1 one-shot mapping cost (20 repeats) per body / state. Arithmetic extrapolation to
// 0 / 1 / 2 / 4 simultaneously active receivers (NOT a measured interacting-island benchmark).
// usage: node ifm1_cpu.mjs <jobs.json> <runs dir> <out.json>   (run ALONE)
import fs from "fs"; import path from "path"; import os from "os"; import zlib from "zlib";
const L = await import(new URL("./ifm1_lib.mjs", import.meta.url).href), { IFM1, ROLES, P2, RA, MC } = L;
const { IFM1Sim, firstStepWrench } = await import(new URL("./ifm1_sim.mjs", import.meta.url).href), { loadJolt } = await import(P2 + "core/v2_jolt.js");
const [JOBS, RUNS, OUT] = process.argv.slice(2), jobs = JSON.parse(fs.readFileSync(JOBS)), FIX = JSON.parse(fs.readFileSync(path.join(RA, "ifm1/fixture/IFM1_FIXTURE.json")));
const J = await loadJolt(P2 + "vendor/jolt-physics.wasm-compat.js"), rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(RUNS, f))));
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; }, now = () => performance.now();
const res = { generated: "ifm1_cpu.mjs", node: process.version, cpu: os.cpus()[0].model, loadavgStart: os.loadavg(), replays: 20, jobs: [] };
for (const job of jobs) {
  const role = job.role ? ROLES.find(r => r.id === job.role) : null, state = role ? role.state : job.state, entry = FIX.entries[`${job.body}/${state}`], fix = FIX.fixtures[`${role ? role.id : job.placement || ROLES.find(r => r.state === state).id}/${job.body}`];
  const ref = rd(job.file), refS = ref.recs[ref.recs.length - 1].S, wrench = job.mode === "W" ? firstStepWrench(rd(job.wrench).recs[0]) : null;
  const once = (timed) => { const t0 = now(), sim = new IFM1Sim(J, L.SPECS[job.body](), entry, fix, job.mode, { wrench, instrument: false, O: entry.O }), tc = now() - t0, per = [];
    let c = { s: sim.cpu.step, p: sim.cpu.passive, m: sim.cpu.measure, a: sim.cpu2.act, t: sim.cpu3.tone };
    while (sim.n < IFM1.stepsTotal) { const t1 = now(); if (!sim.tick()) break; const dt = now() - t1, c2 = { s: sim.cpu.step, p: sim.cpu.passive, m: sim.cpu.measure, a: sim.cpu2.act, t: sim.cpu3.tone };
      per.push({ total: dt, jolt: c2.s - c.s, passive: c2.p - c.p, measure: c2.m - c.m, act: c2.a - c.a, tone: c2.t - c.t }); c = c2; }
    const fin = sim.read(), same = fin.every((b, i) => b.pos.every((x, k) => Object.is(x, refS[i].pos[k])) && b.v.every((x, k) => Object.is(x, refS[i].v[k])) && b.rot.every((x, k) => Object.is(x, refS[i].rot[k])));
    sim.destroy(); return { construct: tc, per, same }; };   // C4: one destroy
  once(false); const reps = []; for (let k = 0; k < 20; k++) reps.push(once(true));
  const prod = reps.flatMap(r => r.per.map(p => p.total - p.measure)), comp = (k) => { const a = reps.flatMap(r => r.per.map(p => p[k])); return { median: q(a, 0.5), p95: q(a, 0.95), max: Math.max(...a) }; };
  const ev = (n) => reps.map(r => r.per.slice(0, n).reduce((s, p) => s + (p.total - p.measure), 0)), e50 = ev(IFM1.stepsPrimary), e150 = ev(IFM1.stepsTotal);
  const o = { name: job.name, mode: job.mode, construction: { median: q(reps.map(r => r.construct), 0.5), max: Math.max(...reps.map(r => r.construct)) }, stepProductionLike: { median: q(prod, 0.5), p95: q(prod, 0.95), max: Math.max(...prod) },
    components: { jolt: comp("jolt"), passive: comp("passive"), act: comp("act"), tone: comp("tone"), measureDiagnostics: comp("measure") }, event50ms: { median: q(e50, 0.5), max: Math.max(...e50) }, event150ms: { median: q(e150, 0.5), max: Math.max(...e150) },
    finalStateEqualsCorrectnessRun: reps.every(r => r.same), extrapolation: Object.fromEntries([0, 1, 2, 4].map(n => [n, { stepMsMedian: n * q(prod, 0.5), event150MsMedian: n * q(e150, 0.5) }])), extrapolationNote: "arithmetic × n; not a measured interacting-island benchmark; ordinary players: 0 articulated steps" };
  res.jobs.push(o); console.log(`${job.name}: step ${o.stepProductionLike.median.toFixed(3)} / ${o.stepProductionLike.p95.toFixed(3)} / ${o.stepProductionLike.max.toFixed(3)} ms (Jolt ${o.components.jolt.median.toFixed(3)}), event 150 ms ${o.event150ms.median.toFixed(2)} ms, construction ${o.construction.median.toFixed(1)} ms, state = correctness run ${o.finalStateEqualsCorrectnessRun}`); }
// MC-1 one-shot mapping cost per body / state (mapping / render preparation; no physics)
{ const LV = L.loadLV2(), RG = L.rigOf(LV), { A } = L.makeActor(LV), E = LV.E, Qat = (t) => LV.LV.queryAt(E, A, L.simAt, t, L.vOf, null, { provenance: false });
  res.mapping = {}; for (const b of L.BODIES) for (const sid of ["S-FLAT", "S-TOE"]) { const st = FIX.states[sid]; if (!st || st.status !== "SELECTED") continue; const spec = L.SPECS[b](), DL = MC.MC1.delta, qs = [Qat(st.tMid - DL), Qat(st.tMid), Qat(st.tMid + DL)], ts = [];
    MC.mapLV2toV2(spec, RG.RIG, { m: qs[0], 0: qs[1], p: qs[2] }); for (let k = 0; k < 20; k++) { const t0 = now(); MC.mapLV2toV2(spec, RG.RIG, { m: qs[0], 0: qs[1], p: qs[2] }); ts.push(now() - t0); }
    res.mapping[`${b}/${sid}`] = { median: q(ts, 0.5), max: Math.max(...ts), note: "MC-1 one-shot (three LV2 queries excluded)" }; } }
res.loadavgEnd = os.loadavg(); fs.writeFileSync(OUT, JSON.stringify(res, null, 1));

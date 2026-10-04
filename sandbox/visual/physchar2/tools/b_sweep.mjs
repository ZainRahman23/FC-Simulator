// ═══ physchar2/tools/b_sweep.mjs — INVESTIGATION B: G1 sweeps with the invalid-manifold monitor and the per-step energy invariant ══════════
// Runs a G1 job set for each ankle neutral stiffness k (env per worker; k = 0 is the accepted plant) and records per run:
//   • every INVALID turf manifold (normal not pointing up out of the turf top, or turf-side contact points off the top surface) — tick, body,
//     sub-shape, normal y, turf-side point heights, depth — and the energy change of that step;
//   • every step whose total mechanical energy E = KE + PE + U rises by more than 1 J, and the largest rise;
//   • the per-step PASSIVITY RESIDUAL r = ΔE + D_step (D = the viscous dissipation of the step; G1 has no other source) — max and quantiles,
//     the numerical floor the invariant's tolerance is derived from.
// Sets: g1 = the G1 validation runs (SCENARIO_ORDER × V2-REF / V1-matched, ESSENTIAL × the other bodies, the rate ensemble RATE_KEYS × RATE_SET
// × RATE_EPS on V2-REF, the high-speed envelope); rate = RATE_KEYS × {180, 240, 360, 480, 720} Hz × RATE_EPS (V2-REF) + singleLeg on V1-matched;
// iter = the same at 240 Hz with {30, 60, 150, 300} velocity iterations. DIAGNOSTIC ONLY.
// usage: node tools/b_sweep.mjs --set=g1 --k=0,0.15 [--workers=9 --out=<json>]
import fs from "fs"; import os from "os"; import { fork } from "child_process"; import { fileURLToPath } from "url";
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith("--" + k + "=")); return a ? a.split("=").slice(1).join("=") : d; };
const SELF = fileURLToPath(import.meta.url);
if (process.argv.includes("--worker")) {
  const { jolt, specOf, makeSim, V, Q, JS, G1 } = await import("./b_lib.mjs"); const J = await jolt(); const specs = new Map(); const CHK = await import("../gates/v2_g1_checks.js");
  process.on("message", (job) => { if (job === "exit") process.exit(0); let r;
    try { const spec = specs.get(job.human) || (specs.set(job.human, specOf(job.human)), specs.get(job.human)), names = spec.bodies.map(b => b.name);
      const s = makeSim(J, spec, job.key, { hz: job.hz, velSteps: job.vel || 150 }), inv = [], events = [], res = []; let guarded = 0;
      // CANDIDATE evaluation (diagnostic, env B_CAND; never adopted here): plane = PlaneShape turf at y = 0; guard = an invalid turf manifold is made a
      // sensor (no response) in the contact listener; maxpen = Jolt mMaxPenetrationDistance 0.02 m. Applied before the first step.
      const cand = process.env.B_CAND || "";
      if (cand === "plane") { s.w.bi.SetShape(s.w.ground.GetID(), new J.PlaneShape(new J.Plane(new J.Vec3(0, 1, 0), 0), null, 50), false, J.EActivation_DontActivate); s.w.bi.SetPosition(s.w.ground.GetID(), new J.RVec3(0, 0, 0), J.EActivation_DontActivate); }
      if (cand === "box10") s.w.bi.SetShape(s.w.ground.GetID(), new J.BoxShape(new J.Vec3(10, 1, 10), 0, null), false, J.EActivation_DontActivate);   // 20 × 2 × 20 m turf (scale test)
      if (cand === "singlehull") for (const n of ["foot_L", "foot_R"]) { const i = names.indexOf(n), b = spec.bodies[i], hs = new J.ConvexHullShapeSettings(); for (const sh of b.shapes) for (const q of sh.points) hs.mPoints.push_back(new J.Vec3(q[0], q[1], q[2])); hs.mMaxConvexRadius = 0.005; hs.mHullTolerance = 1e-5;
        const cs2 = new J.StaticCompoundShapeSettings(); cs2.AddShape(new J.Vec3(0, 0, 0), new J.Quat(0, 0, 0, 1), hs, 0); const nat = cs2.Create().Get().GetCenterOfMass(), c = b.comLocal, oc = new J.OffsetCenterOfMassShapeSettings(new J.Vec3(c[0] - nat.GetX(), c[1] - nat.GetY(), c[2] - nat.GetZ()), cs2);
        s.w.bi.SetShape(s.w.bodies[i].GetID(), oc.Create().Get(), false, J.EActivation_Activate); }   // the unsplit approved hull, same mass properties (decomposition test)
      if (cand === "maxpen") { const p = s.w.ps.GetPhysicsSettings(); p.mMaxPenetrationDistance = 0.02; s.w.ps.SetPhysicsSettings(p); }
      if (cand === "guard") { const L = s.w.listener; for (const nm of ["OnContactAdded", "OnContactPersisted"]) { const orig = L[nm]; L[nm] = (b1, b2, m, csp) => { orig(b1, b2, m, csp); const c = s.w.contacts[s.w.contacts.length - 1];
          if (c && (c.a === -1) !== (c.b === -1) && c.a >= -1 && c.b >= -1) { const tf = c.a === -1, ny = tf ? c.normal[1] : -c.normal[1], pT = tf ? c.pts : c.pts2;
            if (ny < 0.5 || pT.some(q => Math.abs(q[1]) > 0.002)) { J.wrapPointer(csp, J.ContactSettings).mIsSensor = true; guarded++; } } }; } }
      let Ep = s.last.E, invTicks = 0, maxRise = -Infinity, maxAt = null;
      let pcMax = 0, pcAt = null, pcBody = null, pcRotMax = 0, pcOver = 0, S0 = s.st;
      // turf-contact statistics (healthy-floor measurement for the contact-validity tolerances): normal deviation 1 − n_y, turf-side point height,
      // playable extent |x|, |z|, manifold depth, and the position-solver move of bodies that touch the turf (depth > −0.5 mm) in that step
      // plane-vs-box comparison metrics: per boot, horizontal COM travel while it touches the turf (slip path) and the largest roll (the boot's
      // lateral axis vertical component → roll about its AP axis) while touching
      const footIdx = ["foot_L", "foot_R"].map(n => names.indexOf(n)), FM = footIdx.map(() => ({ slipMm: 0, rollMaxDeg: 0, touchTicks: 0 }));
      const TS = { manifolds: 0, nyDevMax: 0, turfYmaxMm: 0, xzMax: 0, depthMaxMm: -1e9, depthMaxAt: null, corrTurfMaxMm: 0, corrTurfAt: null, corrTurfBody: null };
      while (s.tick()) { const dE = s.last.E - Ep; Ep = s.last.E; const rr = dE + s.A.Dstep[s.A.Dstep.length - 1]; res.push(rr);
        // position-solver displacement of each body beyond its velocity integration (Jolt: COM += v₁·dt): a teleport metric
        { const S1 = s.st, touch = new Set(); for (const c of s.lastContacts || []) { if ((c.a === -1) === (c.b === -1) || c.a < -1 || c.b < -1) continue; const tf = c.a === -1, ny = tf ? c.normal[1] : -c.normal[1], pT = tf ? c.pts : c.pts2;
            TS.manifolds++; TS.nyDevMax = Math.max(TS.nyDevMax, 1 - ny); for (const q of pT) { TS.turfYmaxMm = Math.max(TS.turfYmaxMm, Math.abs(q[1]) * 1000); TS.xzMax = Math.max(TS.xzMax, Math.abs(q[0]), Math.abs(q[2])); }
            if (c.depth * 1000 > TS.depthMaxMm) { TS.depthMaxMm = c.depth * 1000; TS.depthMaxAt = s.n; } if (c.depth > -0.0005) touch.add(tf ? c.b : c.a); }
          let tickMax = 0; for (let i = 0; i < S1.length; i++) { const c = V.dist(S1[i].com, V.add(S0[i].com, V.sc(S1[i].v, s.dt))); if (c > tickMax) tickMax = c; if (c > pcMax) { pcMax = c; pcAt = s.n; pcBody = names[i]; }
            if (touch.has(i) && c * 1000 > TS.corrTurfMaxMm) { TS.corrTurfMaxMm = c * 1000; TS.corrTurfAt = s.n; TS.corrTurfBody = names[i]; } }
          footIdx.forEach((fi, k) => { if (!touch.has(fi)) return; const m = FM[k]; m.touchTicks++; const d = [S1[fi].com[0] - S0[fi].com[0], S1[fi].com[2] - S0[fi].com[2]]; m.slipMm += Math.hypot(d[0], d[1]) * 1000;
            const lat = Q.rot(S1[fi].rot, [1, 0, 0]); m.rollMaxDeg = Math.max(m.rollMaxDeg, Math.abs(Math.asin(Math.max(-1, Math.min(1, lat[1])))) * 180 / Math.PI); });
          if (tickMax > 0.005) pcOver++; S0 = S1; }
        if (dE > maxRise) { maxRise = dE; maxAt = s.n; } if (dE > 1) events.push({ n: s.n, t: +(s.n * s.dt).toFixed(4), dE: +dE.toFixed(3) });
        let any = false; for (const c of s.lastContacts || []) { if ((c.a === -1) === (c.b === -1) || c.a < -1 || c.b < -1) continue; const tf = c.a === -1, ny = tf ? c.normal[1] : -c.normal[1], pT = tf ? c.pts : c.pts2;
          const yl = Math.min(...pT.map(p => p[1])), yh = Math.max(...pT.map(p => p[1])); if (ny < 0.5 || yl < -0.002 || yh > 0.002) { any = true;
            if (inv.length < 30) inv.push({ n: s.n, t: +(s.n * s.dt).toFixed(4), body: names[tf ? c.b : c.a], piece: tf ? c.sb : c.sa, ny: +ny.toFixed(4), turfYmm: [+(yl * 1000).toFixed(1), +(yh * 1000).toFixed(1)], depthMm: +(c.depth * 1000).toFixed(3), dE: +dE.toFixed(3) }); } }
        if (any) invTicks++; }
      const srt = Float64Array.from(res).sort(), q = (p) => srt[Math.min(srt.length - 1, Math.floor(p * (srt.length - 1)))];
      r = { ...job, k: JS.ankleNeutralKPerDeg(), ticks: s.n, maxRise: +maxRise.toFixed(4), maxRiseTick: maxAt, events, invalid: inv, invalidTicks: invTicks, resid: { max: q(1), p999: q(0.999), p99: q(0.99), p50: q(0.5), min: q(0) }, posCorr: { maxMm: +(pcMax * 1000).toFixed(3), at: pcAt, body: pcBody, ticksOver5mm: pcOver }, turfStats: TS, turf: s.w.turf, cand: cand || null, guarded, hash: null, posture: null };
      try { r.hash = s.h.toString(16).padStart(8, "0"); } catch (e) {}
      try { const sm = s.summary(); r.posture = sm.outcome.posture;
        // ordinary-contact regression view for candidate evaluation: the G1 gate rows of this run (gating failures) + key contact / joint metrics
        const cks = CHK.scenarioChecks(sm, G1.ensureScenario(job.key)); r.g1Fail = cks.filter(c => !c.pass && !c.reportOnly).map(c => c.id);
        r.compare = { firstContactT: sm.energy.firstContactT, firstNonFoot: sm.outcome.firstNonFoot, firstNonFootT: sm.outcome.firstNonFootT, dissipatedJ: sm.energy.E0 - sm.energy.Eend, dampingJ: sm.energy.dampingJ,
          hardExcMaxDeg: sm.joints.hardExcMaxDeg, hardExcRestDeg: sm.joints.hardExcRestDeg, feet: FM.map(m => ({ slipMm: +m.slipMm.toFixed(2), rollMaxDeg: +m.rollMaxDeg.toFixed(2), touchS: +(m.touchTicks * s.dt).toFixed(3) })), groundFirst: Object.fromEntries(Object.entries(sm.contacts.ground).map(([k, g]) => [k, g.first])) };
        r.metrics = { turfPenMaxMm: +sm.contacts.turfPenMaxMm.toFixed(2), turfPenRestMm: +sm.contacts.turfPenRestMm.toFixed(3), sepMaxMm: +sm.joints.sepMaxMm.toFixed(2), hardExcRestDeg: +sm.joints.hardExcRestDeg.toFixed(2), restKE: +sm.rest.KEmax.toFixed(4), comEnd: sm.outcome.comEnd.map(x => +x.toFixed(3)) }; } catch (e) { r.summaryErr = String(e).slice(0, 200); }
      s.destroy(); process.send({ id: job.id, r }); } catch (e) { process.send({ id: job.id, err: String(e && e.stack || e) }); } });
  process.send({ ready: true });
} else {
  const { G1 } = await import("./b_lib.mjs");
  const set = arg("set", "g1"), ks = arg("k", "0").split(",").map(Number), CAND = arg("cand", ""), nW = +arg("workers", Math.max(2, os.cpus().length - 1)), out = arg("out", null);
  const H = ["V2-REF", "V1-matched", "V2-165-62", "V2-175-70", "V2-190-85", "V2-198-92", "V2-long-legs", "V2-short-legs"];
  let jobs = [];
  if (set === "g1") { for (const h of ["V2-REF", "V1-matched"]) for (const key of G1.SCENARIO_ORDER) jobs.push({ human: h, key, hz: 240 });
    for (const h of H.slice(2)) for (const key of G1.ESSENTIAL) jobs.push({ human: h, key, hz: 240 });
    for (const key of G1.RATE_KEYS) for (const hz of G1.RATE_SET) for (const e of G1.RATE_EPS) if (!(hz === 240 && e === 0)) jobs.push({ human: "V2-REF", key: G1.ensembleKey(key, e), hz });
    for (const key of G1.HS_ORDER) jobs.push({ human: "V2-REF", key, hz: 240 }); }
  if (set === "rate") { for (const hz of [180, 240, 360, 480, 720]) { for (const key of ["leanF", "upright", "drop1m", "awkward"]) for (const e of G1.RATE_EPS) jobs.push({ human: "V2-REF", key: G1.ensembleKey(key, e), hz });
    for (const e of G1.RATE_EPS) jobs.push({ human: "V1-matched", key: G1.ensembleKey("singleLeg", e), hz }); } }
  if (set === "iter") { for (const vel of [30, 60, 150, 300]) { for (const key of ["leanF", "upright", "drop1m", "awkward"]) for (const e of G1.RATE_EPS) jobs.push({ human: "V2-REF", key: G1.ensembleKey(key, e), hz: 240, vel });
    for (const e of G1.RATE_EPS) jobs.push({ human: "V1-matched", key: G1.ensembleKey("singleLeg", e), hz: 240, vel }); } }
  if (set === "g1iter") for (const vel of G1.ITERATION_SET) for (const key of G1.SCENARIO_ORDER) jobs.push({ human: "V2-REF", key, hz: 240, vel });   // the G1 1.5 iteration study (report-only part of the accepted G1 run)
  if (set === "test") jobs = [{ human: "V2-REF", key: "isoMomentum", hz: 240 }, { human: "V1-matched", key: "rotating", hz: 240 }];
  if (set === "perturb240") { const E = [0, 1e-6, -1e-6, 2e-6, -2e-6, 5e-6, -5e-6, 1e-5, -1e-5, 2e-5, -2e-5, 5e-5, -5e-5, 1e-4, -1e-4];   // the perturb ensembles at the 240 Hz validation rate only (ankle reinvestigation: G1 failure-rate attribution)
    for (const h of ["V2-REF", "V1-matched"]) for (const key of ["singleLeg", "leanF", "leanL", "leanR", "leanB", "upright", "perturb", "drop1m", "awkward", "sideFirst"]) for (const e of E) jobs.push({ human: h, key: G1.ensembleKey(key, e), hz: 240 }); }
  if (set === "perturb") { const E = [0, 1e-6, -1e-6, 2e-6, -2e-6, 5e-6, -5e-6, 1e-5, -1e-5, 2e-5, -2e-5, 5e-5, -5e-5, 1e-4, -1e-4];   // k = 0 reachability: dense lift ensembles
    for (const h of ["V2-REF", "V1-matched"]) for (const key of ["singleLeg", "leanF", "leanL", "leanR", "leanB", "upright", "perturb", "drop1m", "awkward", "sideFirst"]) for (const e of E) for (const hz of [240, 720]) jobs.push({ human: h, key: G1.ensembleKey(key, e), hz }); }
  const all = [], t0 = Date.now(); let id = 0;
  for (const k of ks) { const list = jobs.map(j => ({ ...j, id: id++ })), q = list.slice(), done = [];
    await new Promise((resolve) => { let fin = 0; const spawn = () => { let n = 0; const cp = fork(SELF, ["--worker"], { env: { ...process.env, V2_ANKLE_NEUTRAL_K: String(k), B_CAND: CAND }, stdio: ["ignore", "inherit", "inherit", "ipc"] });
        const next = () => { if (n >= 12 && q.length) { cp.send("exit"); spawn(); return; } const j = q.shift(); if (j) { n++; cp.send(j); } else cp.send("exit"); };
        cp.on("message", (m) => { if (m.ready) return next(); done.push(m.r || { ...list.find(x => x.id === m.id), err: m.err }); fin++; if (fin % 20 === 0) process.stdout.write(`  k ${k}: ${fin}/${list.length}\r`); if (fin === list.length) resolve(); next(); }); };
      for (let w = 0; w < nW; w++) spawn(); });
    done.sort((a, b) => a.id - b.id); all.push(...done);
    const inv = done.filter(r => r.invalidTicks > 0), ev = done.filter(r => r.events && r.events.length), err = done.filter(r => r.err);
    console.log(`${CAND ? "[cand " + CAND + "] " : ""}k ${k}: ${done.length} runs | runs with invalid turf manifolds ${inv.length} (ticks ${inv.reduce((s, r) => s + r.invalidTicks, 0)}) | runs with a >1 J one-step rise ${ev.length} | errors ${err.length} | max rise ${Math.max(...done.map(r => r.maxRise ?? -1)).toFixed(3)} J | ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    for (const r of inv.slice(0, 12)) console.log(`   INVALID ${r.human} ${r.key} ${r.hz} Hz${r.vel ? " vel " + r.vel : ""}: ${r.invalid.slice(0, 2).map(x => `t ${x.t} ${x.body}[${x.piece}] ny ${x.ny} turfY ${x.turfYmm} dE ${x.dE}`).join(" | ")} ; maxRise ${r.maxRise}`);
    for (const r of ev.filter(r => !r.invalidTicks).slice(0, 8)) console.log(`   EVENT (no invalid manifold) ${r.human} ${r.key} ${r.hz} Hz: ${r.events.slice(0, 3).map(e => `t ${e.t} dE ${e.dE}`).join(", ")}`);
    for (const r of err.slice(0, 3)) console.log("   ERR", r.key, r.err.slice(0, 200)); }
  if (out) fs.writeFileSync(out, JSON.stringify({ set, ks, runs: all }, null, 0));
}

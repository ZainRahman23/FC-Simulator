// SP2A "contacts win" test (as SLIDE-PHYS-2 Stage 2): obstacles in the tackling leg's sweep path, placed from the obstacle-free run — the
// tackling boot's position at t_hit = first fold-side body contact + 0.10 s, 0.30 m ahead along the travel, resting on the turf.
//   O0 clean · O1 glancing 5 kg box (offset so only the boot's edge can meet it) · O2 20 kg box square in the path · O3 immovable post (boot / shin
//   height) square in the path. Reported: first hit, obstacle impulse, the tackling leg's deviation from the clean run, A6 local-yield steps,
//   regional failure / whole-body fallback, the slide afterwards.
// usage (worktree root): node sp2a_obstacle.mjs --opts <opts.json> --runin <run-in.json> --out <dir> [--records <dir outside git>]
import fs from "fs";
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), RUN = await import(S1 + "sp_run.mjs"), OB = await import(S1 + "sp_obst.mjs"), EN = await import(S1 + "sp_entry.mjs"), { V, B, bi } = L;
const AA = await import(new URL("./sp2a_author.mjs", import.meta.url).href), FL = await import(new URL("./sp2a_flight.mjs", import.meta.url).href), M = await import(new URL("../../slide_phys2/scripts/sp2_measures.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const opts = JSON.parse(fs.readFileSync(arg("opts"))), steps = +arg("steps", "480"), RI = AA.loadRunIn(arg("runin"), null, 0.9, 0), speed = +(RI.d.speed * AA.LEGR).toFixed(3);
const make = () => { const c = FL.tackleCand(speed, opts), plan = FL.flightPlan(RI, c); return { ...c, entry: plan.entry, id: "OBST" }; };
const run = async (obs) => { const c = make(), o = await RUN.runCand(c, { steps, PlantClass: OB.ObstaclePlant, setup: (sim) => sim.addObstacles(obs) }); o.contactRule = c.soleRule; return o; };
const ref = await run([]), mref = M.measure(ref), tHit = (mref.firstBodyT ?? 0.4) + 0.10, rAt = ref.recs.find(r => r.t >= tHit), fR = rAt.S[bi("foot_R")], P0 = rAt.chars.tackler.P, vh = Math.hypot(P0[0], P0[2]), dir = [P0[0] / vh, 0, P0[2] / vh];
const lat = [dir[2], 0, -dir[0]], yaw = Math.atan2(dir[0], dir[2]), qy = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)], ahead = V.add([fR.com[0], 0, fR.com[2]], V.sc(dir, 0.30));
const box = (mass, he, latOff = 0) => ({ type: "box", he, mass, pos: [ahead[0] + lat[0] * latOff, he[1] + 0.001, ahead[2] + lat[2] * latOff], rot: qy });
const CASES = { O0: [], O1: [box(5, [0.12, 0.10, 0.06], 0.17)], O2: [box(20, [0.25, 0.14, 0.08])], O3: [box(0, [0.25, 0.20, 0.08])] };
const summary = { tool: "sp2a_obstacle.mjs", speed, tHit, bootAtHit: fR.com, dir, refHash: ref.finalHash, cases: {} };
for (const [id, obs] of Object.entries(CASES)) { const o = id === "O0" ? ref : await run(obs), m = M.measure(o); let Jobs = [0, 0, 0], firstHit = null; const byBody = {};
  o.recs.forEach((r) => { for (const c of r.obst || []) { if (c.kind !== "obst-tackler") continue; Jobs = V.add(Jobs, c.J); byBody[c.body] = (byBody[c.body] || 0) + c.Jn; if (firstHit == null && c.Jn > 0) firstHit = { t: +r.t.toFixed(3), body: c.body }; } });
  const anat = (r) => L.anatOf(r.S.slice(0, B.length)), defl = { hip_R: 0, knee_R: 0, ankle_R: 0, hip_L: 0, knee_L: 0, lumbar: 0 }; let defl50 = null;
  o.recs.forEach((r, n) => { if (n >= ref.recs.length) return; const a = anat(r), b = anat(ref.recs[n]); for (const k of Object.keys(defl)) { const key = k.startsWith("ankle") ? "df" : "flex"; defl[k] = Math.max(defl[k], Math.abs(a[k][key] - b[k][key])); }
    if (firstHit && defl50 == null && r.t >= firstHit.t + 0.05) defl50 = { hip_R: +(a.hip_R.flex - b.hip_R.flex).toFixed(1), knee_R: +(a.knee_R.flex - b.knee_R.flex).toFixed(1) }; });
  const lg = o.ctrlLog || [], hitN = firstHit ? Math.round(firstHit.t * 240) : lg.length, post = lg.slice(hitN);
  summary.cases[id] = { obstacles: obs, hash: o.finalHash, firstHit, obstImpulseNs: +V.len(Jobs).toFixed(2), obstImpulseByBody: Object.fromEntries(Object.entries(byBody).map(([k, v]) => [k, +v.toFixed(2)])),
    tackLegDeviation50msDeg: defl50, maxDeflDeg: Object.fromEntries(Object.entries(defl).map(([k, v]) => [k, +v.toFixed(1)])), yieldSteps: post.filter(x => x.yield).length,
    regionalFailures: o.ctrl ? o.ctrl.failures : null, wholeBodyFallback: o.ctrl ? o.ctrl.wholeBody : null, slideDistM: m.slideDistM, minBelly: m.posture.minBellyY, headT: m.posture.headTurfT };
  if (arg("records")) L.writeGz(`${arg("records")}/${id}.json.gz`, o); const s = summary.cases[id];
  console.log(id, s.hash, "hit", JSON.stringify(firstHit), "J", s.obstImpulseNs, "| dev@+50ms", JSON.stringify(s.tackLegDeviation50msDeg), "| max defl", JSON.stringify(s.maxDeflDeg), "| yield", s.yieldSteps, "fail", JSON.stringify(s.regionalFailures), "wb", s.wholeBodyFallback, "| slide", s.slideDistM, "belly", s.minBelly); }
fs.writeFileSync(`${OUT}/obstacle_summary.json`, JSON.stringify(summary, null, 1));

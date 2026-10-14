// SLIDE-PHYS-2 Stage 2 (Phase 11) — obstacles in the EXTENDED tackling leg's sweep path (SP2's boot rides above the turf, so an obstruction must
// sit at boot / shin height in its path, not on the turf under a planted boot as in SLIDE-PHYS-1). Placement from the obstacle-free reference run:
// the tackling boot's position at t_hit = first fold-side body contact + 0.10 s, moved 0.30 m ahead along the travel; the box rests on the turf.
//   O0 clean · O1 glancing (5 kg box, offset laterally so only the boot's outer edge can meet it) · O2 moderate (20 kg box square in the path)
//   O3 severe (immovable post square in the path, boot / shin height) · O4 catastrophic (immovable wall across the whole body path)
//   O5 trunk-height fixed bar (the legs pass under it; the trunk / arms meet it)
// usage (worktree root): node sp2_stage2.mjs --params <phys.json> --speed 5 --out <dir> [--ctrl A6] [--steps 480]
import fs from "fs";
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), RUN = await import(S1 + "sp_run.mjs"), OB = await import(S1 + "sp_obst.mjs"), { V, B, bi } = L;
const P = await import(new URL("./sp2_param.mjs", import.meta.url).href), M = await import(new URL("./sp2_measures.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const phys = JSON.parse(fs.readFileSync(arg("params"))), speed = +arg("speed", "5"), steps = +arg("steps", "480"), ctrl = arg("ctrl", "A6");
const make = () => P.finalize(P.makeCand(phys, speed, "ST2"), ctrl);
const run = async (obs) => { const o = await RUN.runCand(make(), { steps, PlantClass: OB.ObstaclePlant, setup: (sim) => sim.addObstacles(obs) }); o.contactRule = make().soleRule; return o; };
const ref = await run([]), mref = M.measure(ref), tHit = (mref.firstBodyT ?? 0.4) + 0.10, rAt = ref.recs.find(r => r.t >= tHit), fR = rAt.S[bi("foot_R")], P0 = rAt.chars.tackler.P, vh = Math.hypot(P0[0], P0[2]), dir = [P0[0] / vh, 0, P0[2] / vh];
const lat = [dir[2], 0, -dir[0]], yaw = Math.atan2(dir[0], dir[2]), qy = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)], ahead = V.add([fR.com[0], 0, fR.com[2]], V.sc(dir, 0.30));
const box = (mass, he, latOff = 0) => ({ type: "box", he, mass, pos: [ahead[0] + lat[0] * latOff, he[1] + 0.001, ahead[2] + lat[2] * latOff], rot: qy });
const CASES = { O0: [], O1: [box(5, [0.12, 0.10, 0.06], 0.17)], O2: [box(20, [0.25, 0.14, 0.08])], O3: [box(0, [0.25, 0.20, 0.08])],
  O4: [{ type: "box", he: [0.9, 0.5, 0.08], mass: 0, pos: [ahead[0] + 0.15 * dir[0], 0.501, ahead[2] + 0.15 * dir[2]], rot: qy }],
  // O5 trunk-height fixed bar (a goal post / an opponent's body at chest height) across the slide path at the boot's position at t_hit, 0.24–0.36 m high (pelvis / lower-trunk height when seated): the
  // extended leg passes UNDER it and the trunk / arms meet it — the case for regional failure → whole-body fallback
  O5: [{ type: "box", he: [0.7, 0.06, 0.06], mass: 0, pos: [ahead[0] - 0.30 * dir[0], 0.30, ahead[2] - 0.30 * dir[2]], rot: qy }] };
const regionOf = { tackLeg: ["hip_R", "knee_R", "ankle_R"] }, summary = { tool: "sp2_stage2.mjs", speed, ctrl, tHit, bootAtHit: fR.com, bootLowAtHit: L.PL.bodyLowest(B[bi("foot_R")], fR).y, dir, refHash: ref.finalHash, cases: {} };
for (const [id, obs] of Object.entries(CASES)) { if (arg("only") && !arg("only").split(",").includes(id)) continue; const o = id === "O0" ? ref : await run(obs), m = M.measure(o);
  let Jobs = [0, 0, 0], maxDepth = 0, firstHit = null; const byBody = {};
  o.recs.forEach((r) => { for (const c of r.obst || []) { if (c.kind !== "obst-tackler") continue; Jobs = V.add(Jobs, c.J); byBody[c.body] = (byBody[c.body] || 0) + c.Jn; if (firstHit == null && c.Jn > 0) firstHit = { t: r.t, body: c.body }; for (const p of c.points) maxDepth = Math.max(maxDepth, p.depth); } });
  const anat = (r) => L.anatOf(r.S.slice(0, B.length)), defl = { hip_R: 0, knee_R: 0, ankle_R: 0, hip_L: 0, knee_L: 0, lumbar: 0 };
  o.recs.forEach((r, n) => { if (n >= ref.recs.length) return; const a = anat(r), b = anat(ref.recs[n]); for (const k of Object.keys(defl)) { const key = k.startsWith("ankle") ? "df" : "flex"; defl[k] = Math.max(defl[k], Math.abs(a[k][key] - b[k][key])); } });
  const lg = o.ctrlLog || [], hitN = firstHit ? Math.round(firstHit.t * 240) : lg.length, post = lg.slice(hitN), pk = (r) => Math.max(0, ...post.map(x => x.dist ? x.dist[r] : 0));
  const end = o.recs[o.recs.length - 1].chars.tackler.com, endRef = ref.recs[ref.recs.length - 1].chars.tackler.com;
  summary.cases[id] = { obstacles: obs, hash: o.finalHash, firstHit, obstImpulseNs: +V.len(Jobs).toFixed(2), obstImpulseByBody: Object.fromEntries(Object.entries(byBody).map(([k, v]) => [k, +v.toFixed(2)])), maxObstDepthMm: +(maxDepth * 1000).toFixed(2),
    maxDeflDeg: Object.fromEntries(Object.entries(defl).map(([k, v]) => [k, +v.toFixed(1)])), peakDisturbanceDeg: Object.fromEntries(["tackLeg", "trailLeg", "trunk", "armL", "armR"].map(r => [r, +pk(r).toFixed(1)])),
    yieldSteps: post.filter(x => x.yield).length, regionalFailures: o.ctrl ? o.ctrl.failures : null, wholeBodyFallback: o.ctrl ? o.ctrl.wholeBody : null, comShiftM: +V.dist(end, endRef).toFixed(3),
    slideDistM: m.slideDistM, stopT: m.stopT, minBelly: m.posture.minBellyY, headT: m.posture.headTurfT };
  L.writeGz(`${OUT}/${id}.json.gz`, o); const s = summary.cases[id];
  console.log(id, s.hash, "hit", JSON.stringify(firstHit), "J", s.obstImpulseNs, "depth", s.maxObstDepthMm, "mm | defl", JSON.stringify(s.maxDeflDeg), "| dist", JSON.stringify(s.peakDisturbanceDeg), "| fail", JSON.stringify(s.regionalFailures), "wb", s.wholeBodyFallback, "| slide", s.slideDistM, "belly", s.minBelly, "head", s.headT); }
fs.writeFileSync(`${OUT}/stage2_summary.json`, JSON.stringify(summary, null, 1));

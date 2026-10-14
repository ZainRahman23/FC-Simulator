// SLIDE-PHYS-1 Stage 2 — obstacle perturbation of the Stage-1 tackler (no change to the tackle: the same parameter vector, entry, controller,
// authority model; obstacles are added to the world before the first step). Obstacles sit in the tackling leg's path at the moment of the slide
// (placed from the obstacle-free reference run: the tackling boot's position at `tHit`), boxes resting on the turf.
//   O0 none · O1 light (3 kg box) · O2 moderate (15 kg box) · O3 strong (60 kg box) · O4 immovable (static box) · O5 severe (static post across
//   the leg AND body line).
// Measures: obstacle impulse on the tackler, tackling-leg joint deflection vs the reference run, tracking error, yield events, pelvis / COM path
// and velocity change, penetration (contacts win: max obstacle depth), recovery / ragdoll state, angular momentum.
// usage (worktree root): node sp_stage2.mjs --u <params.json> --speed 5 --out <dir> [--tHit 0.55] [--authority <name>]
import fs from "fs";
const L = await import(new URL("./sp_lib.mjs", import.meta.url).href), { V, Q, B, M, bi } = L;
const RUN = await import(new URL("./sp_run.mjs", import.meta.url).href), P = await import(new URL("./sp_param.mjs", import.meta.url).href), OB = await import(new URL("./sp_obst.mjs", import.meta.url).href);
const AU = await import(new URL("./sp_authority.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const u = JSON.parse(fs.readFileSync(arg("u"))), speed = +arg("speed", "5"), tHit = +arg("tHit", "0.55"), auName = arg("authority", "A0"), steps = +arg("steps", "480");
const make = () => { const c = P.makeCand(P.toPhys(u), speed, "ST2"); return AU.apply(c, auName); };
// reference (no obstacle) run → boot position at tHit, travel direction
const ref = await RUN.runCand(make(), { steps, PlantClass: OB.ObstaclePlant, setup: (sim) => sim.addObstacles([]) });
const rAt = ref.recs.find(r => r.t >= tHit), fR = rAt.S[bi("foot_R")], sR = rAt.S[bi("shank_R")], P0 = rAt.chars.tackler.P, vh = Math.hypot(P0[0], P0[2]), dir = [P0[0] / vh, 0, P0[2] / vh];
const lat = [dir[2], 0, -dir[0]], yaw = Math.atan2(dir[0], dir[2]), qy = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
// the box is placed just ahead of the boot (so the leg arrives at it), resting on the turf, long axis across the path
const ahead = V.add([fR.com[0], 0, fR.com[2]], V.sc(dir, 0.35)), box = (mass, he) => ({ type: "box", he, mass, pos: [ahead[0], he[1] + 0.001, ahead[2]], rot: qy });
const CASES = { O0: [], O1: [box(3, [0.30, 0.06, 0.06])], O2: [box(15, [0.30, 0.08, 0.08])], O3: [box(60, [0.30, 0.10, 0.10])], O4: [box(0, [0.30, 0.10, 0.10])],
  O5: [{ type: "box", he: [0.6, 0.35, 0.08], mass: 0, pos: [ahead[0] + 0.25 * dir[0], 0.351, ahead[2] + 0.25 * dir[2]], rot: qy }] };
const summary = { tool: "sp_stage2.mjs", speed, tHit, authority: auName, u, refHash: ref.finalHash, bootAtHit: fR.com, dir, cases: {} };
const anat = (r) => L.anatOf(r.S.slice(0, B.length)), refA = ref.recs.map(anat);
for (const [id, obs] of Object.entries(CASES)) { if (arg("only") && !arg("only").split(",").includes(id)) continue;
  const o = await RUN.runCand(make(), { steps, PlantClass: OB.ObstaclePlant, setup: (sim) => sim.addObstacles(obs) });
  let Jobs = [0, 0, 0], maxDepth = 0, firstHit = null, defl = { knee_R: 0, hip_R: 0, ankle_R: 0 }, bodies = {};
  o.recs.forEach((r, n) => { for (const c of r.obst || []) { if (c.kind !== "obst-tackler") continue; Jobs = V.add(Jobs, c.J); bodies[c.body] = (bodies[c.body] || 0) + c.Jn; if (firstHit == null && c.Jn > 0) firstHit = { t: r.t, body: c.body };
      for (const p of c.points) maxDepth = Math.max(maxDepth, p.depth); }
    if (n < refA.length) { const a = anat(r); for (const k of Object.keys(defl)) { const key = k.startsWith("ankle") ? "df" : "flex"; defl[k] = Math.max(defl[k], Math.abs(a[k][key] - refA[n][k][key])); } } });
  const end = o.recs[o.recs.length - 1], endRef = ref.recs[ref.recs.length - 1], m = P.measures(o), c = P.cost(m); delete m.S;
  const log = o.ctrlLog || [], errMax = Math.max(...log.map(x => x.errDeg)), yieldSteps = log.filter(x => x.yield).length, rag = log.find(x => x.ragdoll);
  // relative to the obstacle-free reference AFTER the first obstacle contact (the whole-run maximum is the commit/swing phase, identical in every case;
  // the tackling-leg yield is active on some axis through the normal slide, so only the EXTRA yielding axis-steps measure the disturbance response)
  const rlog = ref.ctrlLog || [], hitN = firstHit ? Math.round(firstHit.t * 240) : log.length; let errPost = 0, errExc = 0, nPost = 0, yExtra = 0;
  for (let i = hitN; i < log.length && i < rlog.length; i++) { errPost = Math.max(errPost, log[i].errDeg); errExc += log[i].errDeg - rlog[i].errDeg; nPost++; yExtra += Math.max(0, (log[i].yield || 0) - (rlog[i].yield || 0)); }
  summary.cases[id] = { obstacles: obs, hash: o.finalHash, firstHit, obstImpulseNs: Jobs.map(x => +x.toFixed(2)), obstImpulseByBody: Object.fromEntries(Object.entries(bodies).map(([k, v]) => [k, +v.toFixed(2)])), maxObstDepthMm: +(maxDepth * 1000).toFixed(2),
    maxDeflDeg: Object.fromEntries(Object.entries(defl).map(([k, v]) => [k, +v.toFixed(1)])), comEnd: end.chars.tackler.com.map(x => +x.toFixed(3)), comEndRef: endRef.chars.tackler.com.map(x => +x.toFixed(3)),
    comShiftM: +V.dist(end.chars.tackler.com, endRef.chars.tackler.com).toFixed(3), errMaxDeg: +errMax.toFixed(1), yieldSteps, errMaxPostHitDeg: +errPost.toFixed(1), errExcessMeanPostHitDeg: nPost ? +(errExc / nPost).toFixed(2) : 0, extraYieldAxisSteps: yExtra, ragdollAt: rag ? rag.t : null, measures: m, stage1Cost: +c.total.toFixed(3), obstEnd: end.obstState };
  L.writeGz(`${OUT}/${id}.json.gz`, o); console.log(id, o.finalHash, "hit", JSON.stringify(firstHit), "J", Jobs.map(x => x.toFixed(1)).join(","), "depth", (maxDepth * 1000).toFixed(1), "mm defl", JSON.stringify(summary.cases[id].maxDeflDeg), "COM shift", summary.cases[id].comShiftM, "ragdoll", rag ? rag.t.toFixed(3) : "-"); }
fs.writeFileSync(`${OUT}/stage2_summary.json`, JSON.stringify(summary, null, 1));

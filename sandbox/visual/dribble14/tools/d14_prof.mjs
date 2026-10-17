// dribble14/tools/d14_prof.mjs — RESOLVER CPU BY SUBSYSTEM (the owner's DRIBBLE-1.3 §27): every resolver method of a core (and the TURN-1.2 /
// RUN-1 / BALL-PHYS primitives the resolver calls) is wrapped with a self-time accountant (a call stack: a method's time minus its wrapped callees');
// each method belongs to one subsystem. Only time under the resolver's own entry points (resolve, post, record) is counted — the player's actual
// locomotion step and the authoritative ball step are not resolver work. Also counted: the deterministic work primitives (TURN-1.2 steps / clones,
// pose evaluations, contact-geometry evaluations, ball-integrator steps) and the counters the core keeps (cpu.*).
// usage: node d14_prof.mjs ver "IDs|all" seeds [out.json]          (ver d12 | d13 | d11 | d1)
import fs from "fs"; import { makeSim, X, CORES } from "./d14_env.mjs"; import { get, list } from "../../dribble1/d1_scenarios.js";
const [ver = "d14", idsArg = "all", seedsArg = "2", outFile] = process.argv.slice(2);
const ids = idsArg === "all" ? list().map((s) => s.id) : idsArg.split(","), N = +seedsArg;
// subsystem of each resolver method (unlisted callees are attributed to their caller)
const CAT = {
  resolve: "other", resolveTouch: "other", resolveTouch0: "invalidation", post: "other", record: "other", classify: "other", jobDone: "invalidation", runJob: "other",
  recovery: "pursuit", safeCarry: "pursuit",
  clearance: "clearance",
  predictLoco: "turnPredict", extend: "turnPredict", fill: "turnPredict", stateAt: "turnPredict", checkpoint: "turnPredict", swPred: "turnPredict",
  evalInto: "pose", warpedBones: "pose", evalLite: "pose", pathFrames: "pose",
  makePlan: "planOther", makePlanG: "planOther", genCands: "enumerate", genCandsG: "enumerate",
  yawOut: "broadPhase", blockers: "broadPhase",
  contactGeom: "contactGeom", corridor: "contactGeom", strikeHull: "contactGeom", regionPose: "contactGeom", geomAny: "contactGeom", corridorMargin: "contactGeom",
  approachClear: "pathChecks", followClear: "pathChecks", ftPath: "pathChecks", ftClear: "pathChecks", otherClear: "pathChecks", pathClear: "pathChecks",
  predictBall: "ballPredict", simLaunch: "ballPredict", simLaunch0: "ballPredict", rollDist: "ballPredict", buildRollTable: "ballPredict",
  windowTargets: "windows", windowAt: "windows",
  corridorWindow: "setup", nestedDecisive: "setup", robustDecisive: "setup", setupSwCand: "setup",
  solveLaunch: "launchSolve", solvedPick: "launchSolve",
  followMinSpeed: "followThrough", ftLadder: "followThrough", caftFor: "followThrough", caftMax: "followThrough", makeCaft: "followThrough", swingPeak: "followThrough",
  finishPlanG: "scoring", evalVersion: "scoring", cost: "scoring", cutValue: "scoring", switchCand: "scoring",
  viewFor: "invalidation", inputKey: "invalidation", ballChanged: "invalidation", ballChangedCache: "invalidation",
};
const ROOTS = new Set(["resolve", "post", "record"]);
const PASSES = []; let passCtx = null;
const now = () => performance.now();
const P = { self: {}, selfBy: {}, calls: {}, primBy: {}, prim: { t1Step: 0, t1Clone: 0, t1Pose: 0, r1FK: 0, ballStep: 0, contactGeom: 0, corridor: 0 } };
let depth = 0; const stack = [];
const enter = (cat, nm) => { stack.push({ cat, nm, t0: now(), child: 0 }); depth++; };
const leave = () => { const f = stack.pop(); depth--; const el = now() - f.t0; P.self[f.cat] = (P.self[f.cat] || 0) + el - f.child; P.selfBy[f.nm] = (P.selfBy[f.nm] || 0) + el - f.child; if (stack.length) stack[stack.length - 1].child += el; };
function wrapFn(obj, name, cat, isRoot = false, prim = null) {
  const f = obj[name]; if (typeof f !== "function" || f.__prof) return;
  const isGen = f.constructor && f.constructor.name === "GeneratorFunction";
  let w;
  if (isGen) w = function (...a) { if (!depth && !isRoot) return f.apply(this, a); const g = f.apply(this, a);
    const it = { next(v) { enter(cat, name); try { return g.next(v); } finally { leave(); } }, return(v) { return g.return(v); }, throw(e) { return g.throw(e); }, [Symbol.iterator]() { return this; } }; return it; };
  else { const w0 = function (...a) { P.calls[name] = (P.calls[name] || 0) + 1; enter(cat, name); try { return f.apply(this, a); } finally { leave(); } };
    w = function (...a) { if (name === 'makePlan' && depth) { const before = { self: { ...P.self }, prim: { ...P.prim }, t0: now() }; try { return w0.apply(this, a); } finally { const d = {}, dp = {}; for (const [k, v] of Object.entries(P.self)) if (v - (before.self[k] || 0) > 1e-6) d[k] = +(v - (before.self[k] || 0)).toFixed(2); for (const [k, v] of Object.entries(P.prim)) if (v - (before.prim[k] || 0)) dp[k] = v - (before.prim[k] || 0); PASSES.push({ id: curRun, k: this.k, ms: +(now() - before.t0).toFixed(2), held: !!(this.held && !this.held.released), self: d, prim: dp }); } }
    if (prim && depth) { P.prim[prim]++; const par = stack.length ? stack[stack.length - 1].nm : '-'; const pk = prim + '<' + par; P.primBy[pk] = (P.primBy[pk] || 0) + 1; } if (!depth && !isRoot) return f.apply(this, a); P.calls[name] = (P.calls[name] || 0) + 1; enter(cat, name); try { return f.apply(this, a); } finally { leave(); } }; }
  w.__prof = true; obj[name] = w;
}
// the primitives (TURN-1.2, RUN-1 FK, BALL-PHYS predictor steps): counted and timed only under a resolver entry point
for (const [n, cat] of [["t1Step", "turnPredict"], ["t1Clone", "turnPredict"], ["t1Pose", "pose"]]) wrapFn(X.TURN1, n, cat, false, n);
wrapFn(X.RUN1_V13, "r1FK", "pose", false, "r1FK");
const C = CORES[ver];
// a warm-up run exposes the internal prototypes (LocoTrack; the BALL-PHYS world)
const S0 = makeSim(get("CUT60_RUN"), { ver, seed: 1, opts: { record: false } }); S0.run(0.5);
const protoSim = C.DribbleSim.prototype, protoTrack = S0.track ? Object.getPrototypeOf(S0.track) : null, protoW = Object.getPrototypeOf(S0.Wp);
for (const n of Object.getOwnPropertyNames(protoSim)) if (!CAT[n] && /G$/.test(n) && CAT[n.slice(0, -1)]) CAT[n] = CAT[n.slice(0, -1)];
// (DRIBBLE-1.3: the incremental search's generator bodies resume inside resolveTouch13 / resolveTouch13a — their self time is search work, not
// invalidation; a tick's pose evaluation is poseOf / evalSample — the leg-only pose is a module function evaluated there)
Object.assign(CAT, { plan13G: "planOther", search13G: "scoring", install13G: "scoring", genOptG: "enumerate", setupCheckG: "setup", resolveTouch13: "search (resumed generators)", resolveTouch13a: "search (resumed generators)", ensureG: "turnPredict", wuTotal: "invalidation", jobInvalid: "invalidation", installPlan: "scoring", poseOf: "pose", evalSample: "pose", prefetch13: "turnPredict", prefetch13a: "turnPredict" });
for (const n of Object.getOwnPropertyNames(protoSim)) if (CAT[n] && n !== "constructor") wrapFn(protoSim, n, CAT[n], ROOTS.has(n), n === "contactGeom" ? "contactGeom" : n === "corridor" ? "corridor" : null);
if (protoTrack) for (const n of Object.getOwnPropertyNames(protoTrack)) if (CAT[n]) wrapFn(protoTrack, n, CAT[n]);
wrapFn(protoW, "step", "ballPredict", false, "ballStep");
const tot = { sim: 0, wall: 0, loco: 0, ball: 0, plans: 0, steps: 0, cpu: {} }, per = {};
let curRun = null;
for (const id of ids) for (let seed = 1; seed <= N; seed++) { curRun = id + ':' + seed;
  const before = JSON.stringify(P.self), S = makeSim(get(id), { ver, seed, opts: { record: false } }); const t0 = now(); S.run(); const w = now() - t0;
  tot.sim += S.k / 240; tot.wall += w; tot.loco += S.cpu.loco || 0; tot.ball += S.cpu.ball || 0; tot.plans += (S.cpu.plans || P.calls.makePlan || 0); tot.steps += S.k;
  for (const [k, v] of Object.entries(S.cpu)) if (typeof v === "number") tot.cpu[k] = (tot.cpu[k] || 0) + v;
  const b = JSON.parse(before), d = {}; for (const [k, v] of Object.entries(P.self)) d[k] = v - (b[k] || 0);
  (per[id] = per[id] || { sim: 0, self: {} }).sim += S.k / 240; for (const [k, v] of Object.entries(d)) per[id].self[k] = (per[id].self[k] || 0) + v;
}
const ms = (x) => +(x / tot.sim).toFixed(1), selfSum = Object.values(P.self).reduce((a, b) => a + b, 0);
const out = { ver, ids, seeds: N, simS: +tot.sim.toFixed(2), resolverMsPerSimS_wall: ms(tot.wall - tot.loco - tot.ball), profiledMsPerSimS: ms(selfSum),
  bySubsystemMsPerSimS: Object.fromEntries(Object.entries(P.self).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, ms(v)])),
  byMethodMsPerSimS: Object.fromEntries(Object.entries(P.selfBy).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => [k, ms(v)])),
  usPerCall: Object.fromEntries(Object.entries(P.selfBy).filter(([k]) => P.calls[k]).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => [k, +(1000 * v / P.calls[k]).toFixed(1)])),
  primitivesPerSimS: Object.fromEntries(Object.entries(P.prim).map(([k, v]) => [k, +(v / tot.sim).toFixed(0)])),
  primitivesByCallerPerSimS: Object.fromEntries(Object.entries(P.primBy).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => [k, +(v / tot.sim).toFixed(0)])),
  callsPerSimS: Object.fromEntries(Object.entries(P.calls).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / tot.sim).toFixed(0)])),
  coreCountersPerSimS: Object.fromEntries(Object.entries(tot.cpu).filter(([k]) => !["loco", "ball", "plan", "predict", "solve", "commit", "nested", "safe", "planMax", "tickMax"].includes(k)).map(([k, v]) => [k, +(v / tot.sim).toFixed(1)])),
  perScenarioMsPerSimS: Object.fromEntries(Object.entries(per).map(([id, r]) => [id, Object.fromEntries(Object.entries(r.self).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / r.sim).toFixed(1)]))])) };
console.log(JSON.stringify({ ...out, perScenarioMsPerSimS: undefined }, null, 1));
out.allPasses = PASSES.map((p) => ({ id: p.id, k: p.k, ms: p.ms, held: p.held, prim: p.prim })); PASSES.sort((a, b) => b.ms - a.ms); out.worstPasses = PASSES.slice(0, 15); const pm = PASSES.map((p) => p.ms).sort((a, b) => a - b); out.passStats = { n: pm.length, p50: pm[pm.length >> 1], p90: pm[Math.floor(0.9 * pm.length)], p99: pm[Math.floor(0.99 * pm.length)], max: pm[pm.length - 1], over20: pm.filter((x) => x > 20).length, sumOver20: +pm.filter((x) => x > 20).reduce((a, b) => a + b, 0).toFixed(0), sum: +pm.reduce((a, b) => a + b, 0).toFixed(0) };
if (outFile) fs.writeFileSync(outFile, JSON.stringify(out, null, 1));

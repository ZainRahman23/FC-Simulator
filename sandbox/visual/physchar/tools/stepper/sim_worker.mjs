// ═══ physchar/tools/stepper/sim_worker.mjs — one simulation worker for the oracle / data engine (DIAGNOSTIC TOOLING) ═══════════════════════
// Reads newline-delimited JSON jobs on stdin, writes one JSON result line per job on stdout. Each job is a FRESH deterministic replay of a
// G2W_A8 walk from t = 0 (no state snapshot, no controller cloning — branching is exact by determinism), with:
//   start "R@0.5" (first foot, rhythm start), fixed { k: { df, dl, T } } (COMMANDED steps: the unified inner loop runs, the foothold and timing
//   are the commanded ones — identFixed), ctrl / walk / human overrides, push (a characterisation push: pushChar), stopAt K (the run ends as
//   soon as step K has started — its start state is captured — or at a fall).
// Result: per started step k, the TRUTH state at its start (the instant the executor began it, view time tSw0) as a feature record; the
// controller's own step-start decision there (walkerLog); per finished step the achieved contact (touchdown time / place, liftoff, status).
import fs from "fs"; import path from "path"; import readline from "readline"; import { fileURLToPath } from "url";
import { buildBodySpec, WORKING_CALIB } from "../../pc_body.js";
import { loadJolt } from "../../pc_jolt.js";
import { buildPoses } from "../../pc_control.js";
import { initOfLoco } from "../../pc_ref.js";
import { runG2a, TESTS_G2 } from "../../pc_gateg2.js";
import { V, Q } from "../../pc_math.js";
import { stepFeatures } from "../../pc_stepfeat.js";
const here = path.dirname(fileURLToPath(import.meta.url)), PC = path.resolve(here, "../.."), ROOT = path.resolve(here, "../../../../..");
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, TA = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new TA[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const FOOT = process.env.FOOT || "F0";
const spec = buildBodySpec(rig, mesh, { calib: WORKING_CALIB, ...(FOOT !== "F0" ? { footModel: FOOT } : {}) }), J = await loadJolt(path.join(PC, "vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec);
initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const JD = path.resolve(ROOT, "review_artifacts/physical_character_v1/g2_walker/json"), mcache = {};
const models = (pre) => mcache[pre] || (mcache[pre] = Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fs.readFileSync(path.join(JD, `${pre}${t}.json`), "utf8"))])));
// the baseline unified configuration (the best of fa55c9d) — jobs override pieces of it
export const BASE_CTRL = { kind: "U", vd: 0.5, from: 1, ramp: { a: 0.3 }, place: "maps", uRefSim: false, lat: { rho: 0.4 }, adapt: null, reachIter: false };
export const BASE_WALK = { swingBase: { w: "model", learn: { rate: 0.05 }, pure: [0] } };
const bi = (n) => spec.bodies.findIndex(b => b.name === n), W = spec.totalMass * 9.81, legLen = 0.9243, M = spec.totalMass;
const angMom = (S) => { let c = [0, 0, 0]; S.forEach((q, i) => { c = V.add(c, V.sc(q.com, spec.bodies[i].mass)); }); c = V.sc(c, 1 / M); let Lm = [0, 0, 0];
  S.forEach((q, i) => { const b = spec.bodies[i], wl = Q.rot(Q.conj(q.rot), q.w); Lm = V.add(Lm, V.add(Q.rot(q.rot, [b.inertia[0] * wl[0], b.inertia[1] * wl[1], b.inertia[2] * wl[2]]), V.sc(V.cross(V.sub(q.com, c), q.v), b.mass))); }); return Lm; };
const yawOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]); }, pitchOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[1], Math.hypot(f[0], f[2])); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a)), r5 = (x) => x == null || !Number.isFinite(x) ? null : x;   // (full precision: search costs must not depend on rounding)
// the state record at a step start (truth at the executor's tSw0 = the view the controller decided with) — pc_stepfeat (shared with the planner)
const features = (o, R, h0, prevTd) => stepFeatures(spec, o, { sw: R.sw, pSt: R.pSt, h0, tSw0: R.tSw0, prevTd });
function runJob(job) { const [first, atS] = job.start.split("@"), at = +atS, stopAt = job.stopAt ?? 40, n = job.n ?? stopAt + 2;
  const steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  const base = TESTS_G2.G2W_A8.loco.rhythm.walk, ctrl = { ...base.ctrl, ...BASE_CTRL, ...(job.ctrl || {}) }; ctrl.models = models(ctrl.modelsPrefix || "mU1_tau"); delete ctrl.modelsPrefix;   // (always the requested maps: the base test carries Controller A's)
  if (job.fixed && Object.keys(job.fixed).length) ctrl.identFixed = true;
  const walk = { ...BASE_WALK, ...(job.walk || {}), char: { ...(base.char || {}), ...(job.fixed || {}) }, ctrl };
  let LOCO = null, stop = null, lastIdx = -1; const ring = [], starts = {}, uc = {}, tdOf = {};
  const res = runG2a(J, spec, "G2W_A8", { poses, keepStates: false, seconds: job.seconds ?? (1.6 + n * 0.62), rhythmOver: { steps, at, walk }, ...(job.human ? { humanOver: job.human } : {}), ...(job.push ? { pushChar: job.push } : {}),
    onLoco: (l) => { LOCO = l; const ctl = l.control.bind(l); l.control = (truth, x) => { ring.push(truth); if (ring.length > 40) ring.shift();
      if (truth.com[1] < 0.75 && !stop) stop = { status: "fell", t: truth.t };
      const out = ctl(truth, x), P = l.planner, R = P.exec.R;
      if (R && R.kind === "rhythmic" && R.stepIndex !== lastIdx) { lastIdx = R.stepIndex; const o = ring.find(q => Math.abs(q.t - R.tSw0) < 1e-6) || ring[0], prev = P.exec.done.filter(d => d.kind === "rhythmic" && d.td).pop();
        starts[R.stepIndex] = features(o, R, P.rhythm.wk.h0, prev ? prev.td.t : null); const lg = (P.rhythm.walkerLog || []).find(e => e.i === R.stepIndex); if (lg) uc[R.stepIndex] = lg.u.slice(0, 3).map(r5);
        if (R.stepIndex >= stopAt && !stop) stop = { status: "stopped", t: truth.t }; }
      return out; }; },
    stopWhen: () => !!stop });
  const P = LOCO.planner, h0 = P.rhythm.wk ? P.rhythm.wk.h0 : 0, hd = [Math.sin(h0), Math.cos(h0)], rt = [hd[1], -hd[0]];
  const done = P.exec.done.filter(d => d.kind === "rhythmic").map(d => { const sd = d.sw === "R" ? 1 : -1, rel = (p) => [r5((p[0] - d.pSt[0]) * hd[0] + (p[1] - d.pSt[1]) * hd[1]), r5(((p[0] - d.pSt[0]) * rt[0] + (p[1] - d.pSt[1]) * rt[1]) * sd)];
    return { k: d.stepIndex, sw: d.sw, tSw0: r5(d.tSw0), lift: d.liftoff ? r5(d.liftoff.t) : null, td: d.td ? r5(d.td.t) : null, uAt: d.td ? r5(d.td.uAt) : null, status: d.status, ach: d.td ? rel(d.td.center) : null, tgt: d.proj && d.proj.target ? rel(d.proj.target) : null, Tss: d.walkK ? r5(d.walkK.Tss) : null, tdPos: d.td ? d.td.center.map(r5) : null, pSt: d.pSt.map(r5) }; });
  return { id: job.id, status: stop ? stop.status : "ended", tStop: stop ? r5(stop.t) : null, hash: res.hash, starts, uc, done, h0: r5(h0) }; }
const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line) => { if (!line.trim()) return; let job; try { job = JSON.parse(line); } catch (e) { return; }
  let out; try { out = runJob(job); } catch (e) { out = { id: job.id, error: String(e && e.stack || e) }; }
  process.stdout.write(JSON.stringify(out) + "\n"); });
process.stdout.write(JSON.stringify({ ready: true, foot: FOOT }) + "\n");

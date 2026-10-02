// ═══ physchar/tools/stepper/stepper_run.mjs — LIVE runs of the Physical Stepper (walk.ctrl.stepper) on the G2W_A8 starts ═══════════════════
// The planner decides in the controller from the feedback view (no Jolt rollouts); the body executes; the outcome is what Jolt does. Reports
// per start: upright steps, the contact events' lifecycle outcomes, the surrogate's calibration on the realised steps (predicted vs measured at
// the next step start), the planner's own cost (wall time per decision), the stride speed. Optional characterisation pushes (pushChar).
// usage: node tools/stepper/stepper_run.mjs --model m.json [--V v.json] [--cfg '{"horizon":2}'] --starts R@0.5,... [--n 40] [--push '{"step":8,"J":[20,0]}'] [--out f.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec, WORKING_CALIB } from "../../pc_body.js";
import { loadJolt } from "../../pc_jolt.js";
import { buildPoses } from "../../pc_control.js";
import { initOfLoco } from "../../pc_ref.js";
import { runG2a, TESTS_G2 } from "../../pc_gateg2.js";
import { StepPlanner } from "../../pc_stepper.js";
const here = path.dirname(fileURLToPath(import.meta.url)), PC = path.resolve(here, "../.."), ROOT = path.resolve(here, "../../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : process.argv[i + 1]; };
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), Ly = rig.mesh.layout, TA = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new TA[Ly[k].elementType](ab, Ly[k].byteOffset, Ly[k].elementCount);
const FOOT = process.env.FOOT || "F0", spec = buildBodySpec(rig, mesh, { calib: WORKING_CALIB, ...(FOOT !== "F0" ? { footModel: FOOT } : {}) }), J = await loadJolt(path.join(PC, "vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec);
initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const JD = path.resolve(ROOT, "review_artifacts/physical_character_v1/g2_walker/json"), MODELS = Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fs.readFileSync(path.join(JD, `mU1_tau${t}.json`), "utf8"))]));
// decision timing: the planner's own wall time per call (the production cost, Part 19)
const T_ = []; { const d0 = StepPlanner.prototype.decide; StepPlanner.prototype.decide = function (...a) { const t0 = performance.now(), r = d0.apply(this, a); T_.push(performance.now() - t0); return r; }; }
export function runStepper(o) { const [first, atS] = o.start.split("@"), at = +atS, n = o.n ?? 40, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  const base = TESTS_G2.G2W_A8.loco.rhythm.walk, ctrl = { ...base.ctrl, kind: "U", vd: o.vd ?? 0.5, from: 1, ramp: { a: 0.3 }, place: "maps", uRefSim: false, lat: { rho: 0.4 }, adapt: null, reachIter: false, models: MODELS, ...(o.ctrl || {}),
    ...(o.stepper ? { stepper: o.stepper } : {}) };
  let LOCO = null, tFall = null; const nT = T_.length;
  const res = runG2a(J, spec, "G2W_A8", { poses, seconds: o.seconds ?? (1.6 + n * 0.62), rhythmOver: { steps, at, walk: { swingBase: { w: "model", learn: { rate: 0.05 }, pure: [0] }, char: { ...(base.char || {}) }, ctrl } }, ...(o.push ? { pushChar: o.push } : {}),
    onLoco: (l) => { LOCO = l; const ctl = l.control.bind(l); l.control = (truth, x) => { if (tFall == null && truth.com[1] < 0.75) tFall = truth.t; return ctl(truth, x); }; }, stopWhen: () => tFall != null });
  const P = LOCO.planner, done = P.exec.done.filter(d => d.kind === "rhythmic" && d.td && (tFall == null || d.td.t < tFall)), h0 = P.rhythm.wk ? P.rhythm.wk.h0 : 0, hd = [Math.sin(h0), Math.cos(h0)];
  const evs = (P.stepperEvents || []).map(e => ({ id: e.id, i: e.stepIndex, state: e.state, why: e.history[e.history.length - 1].why, err: e.outcome ? e.outcome.err : null }));
  const cal = (P.stepperCal || []).filter(c => c.actual).map(c => ({ i: c.i, u: c.u, err: Object.fromEntries(Object.keys(c.actual).map(k => [k, c.pred[k] - c.actual[k]])), pFall: c.pred.pFall }));
  // stride speed (same-foot touchdowns), from the steps after the first 4
  const tds = done.map(d => ({ t: d.td.t, p: d.td.center[0] * hd[0] + d.td.center[1] * hd[1], sw: d.sw })), sp = []; for (let i = 6; i < tds.length; i++) sp.push((tds[i].p - tds[i - 2].p) / (tds[i].t - tds[i - 2].t));
  const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null, sd = (a) => { const m = mean(a); return a.length > 1 ? Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)) : null; };
  return { start: o.start, upright: done.length, fell: tFall != null, tFall, hash: res.hash, events: evs, eventCounts: evs.reduce((a, e) => { a[e.state] = (a[e.state] || 0) + 1; return a; }, {}), cal, strideSpeed: [mean(sp), sd(sp)], strides: sp,
    decisions: T_.length - nT, decideMs: mean(T_.slice(nT)), decideMsMax: Math.max(0, ...T_.slice(nT)), steps: done.map(d => ({ i: d.stepIndex, td: d.td.t, cmd: d.char || null })) }; }
if (process.argv[1] && process.argv[1].endsWith("stepper_run.mjs")) {
  const model = arg("--model", null) ? JSON.parse(fs.readFileSync(arg("--model"), "utf8")) : null, V = arg("--V", null) ? JSON.parse(fs.readFileSync(arg("--V"), "utf8")) : null, cfg = JSON.parse(arg("--cfg", "{}"));
  const starts = arg("--starts", "R@0.5,L@0.5,L@0.6,R@0.55,R@0.6,L@0.55").split(","), out = [];
  for (const st of starts) { const t0 = Date.now(), r = runStepper({ start: st, n: +arg("--n", 40), vd: arg("--vd", null) ? +arg("--vd") : undefined, push: arg("--push", null) ? JSON.parse(arg("--push")) : null, stepper: model ? { model, ...(V ? { V } : {}), ...cfg } : null, ctrl: JSON.parse(arg("--ctrl", "{}")) });
    out.push(r); const ce = (k) => { const e = r.cal.map(c => Math.abs(c.err[k])).sort((a, b) => a - b); return e.length ? `${(100 * e[Math.floor(0.5 * e.length)]).toFixed(1)}/${(100 * e[Math.min(e.length - 1, Math.floor(0.95 * e.length))]).toFixed(1)}` : "-"; };
    console.log(`${st}: upright ${r.upright}${r.fell ? ` (fell ${r.tFall.toFixed(2)})` : ""} | stride ${r.strideSpeed[0]?.toFixed(3) ?? "-"}±${r.strideSpeed[1]?.toFixed(3) ?? "-"} | events ${JSON.stringify(r.eventCounts)} | cal |err| med/p95 cm: xi.f ${ce("xi.0")} xi.l ${ce("xi.1")} v.f ${ce("v.0")} achF ${ce("achF")} | decide ${r.decideMs?.toFixed(2) ?? "-"} ms (max ${r.decideMsMax.toFixed(2)}) × ${r.decisions} | ${((Date.now() - t0) / 1000).toFixed(0)} s`); }
  const up = out.map(r => r.upright); console.log(`mean upright ${(up.reduce((a, b) => a + b, 0) / up.length).toFixed(1)} · min ${Math.min(...up)} · full (n−1) ${out.filter(r => !r.fell).length}/${out.length}`);
  if (arg("--out", null)) fs.writeFileSync(arg("--out"), JSON.stringify({ args: process.argv.slice(2), results: out })); }

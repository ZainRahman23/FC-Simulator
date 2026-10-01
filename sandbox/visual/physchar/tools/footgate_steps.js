// ═══ physchar/tools/footgate_steps.js — FOOT-ARCHITECTURE GATE: controller-independent step experiments (measurement only) ══════════════
// The SAME open-loop commanded footsteps (rhythm.walk.char: IMMUTABLE world-space targets, fixed at each step's start, no in-swing
// adjustment) on each foot model, from SIX deterministic starts (first foot R / L × rhythm start 0.50 / 0.55 / 0.60 s):
//   protocol "slow":  first step from standing → TEST step of length L (step 1) → continuation steps (0.28, 0.28)
//   protocol "speed": first step → run-up steps 0.30, 0.34 → TEST step L (step 3) → continuation steps (0.30, 0.30)   (the speed creep)
// Per test step: EXECUTION REACHABILITY (the foot reached its target: a touchdown ≥ 0.2 s after liftoff, within 10 cm — the swing lands ≈ +6 cm long systematically) is kept separate from
// CONTINUATION VIABILITY (the next swing completes — ≥ 0.2 s airborne, lands within 8 cm — and the body is upright one step later).
// Failed swings are recorded as viability evidence, never dropped. Instrumented along the hypothesised causal chain: trailing-leg extension
// at the test step's start, the trailing foot's late stance (heel height, MTP angle, the rollover point = the forward-most loaded contact
// point relative to its ankle, the peak ankle plantar-flexion torque), the next swing's toe contacts (scuff), its outcome.
// usage: node tools/footgate_steps.js --foot F0|F1|F2|F2h [--protocol slow|speed] [--L 0.26,0.30,...] [--out file.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec, WORKING_CALIB } from "../pc_body.js";
import { loadJolt } from "../pc_jolt.js";
import { buildPoses } from "../pc_control.js";
import { initOfLoco } from "../pc_ref.js";
import { runG2a, CHAR_BASE } from "../pc_gateg2.js";
import { V, Q } from "../pc_math.js";
import { dumpFrames } from "./fg_frames.js";
const here = path.dirname(fileURLToPath(import.meta.url)), PC = path.resolve(here, ".."), ROOT = path.resolve(here, "../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L_ = rig.mesh.layout, TA = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new TA[L_[k].elementType](ab, L_[k].byteOffset, L_[k].elementCount);
const foot = arg("--foot", "F0"), protocol = arg("--protocol", "slow"), Ls = (arg("--L", "0.26,0.30,0.34,0.38,0.42,0.46,0.50") + "").split(",").map(Number), outP = arg("--out", null);
const spec = buildBodySpec(rig, mesh, { calib: WORKING_CALIB, ...(foot !== "F0" ? { footModel: foot } : {}) }), J = await loadJolt(path.join(PC, "vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec);
initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const bi = (n) => spec.bodies.findIndex(b => b.name === n), W = spec.totalMass * 9.81, legLen = 0.9243;
// (protocol "ctrl" — the STATE-MATCHED test, a separate, recalibrated comparison: the foot's own MEASURED first step (--first df,dl,T) and its
//  own identified Controller A (--models <prefix> in g2_walker/json, inner loop v8) for every step except the TEST step K (= --K, default 4:
//  after a controlled run-up), which is an open-loop commanded step with an immutable world target; Controller A then tries to continue)
const FIRST = arg("--first") ? Object.fromEntries((arg("--first") + "").split(",").map(Number).map((v, i) => [["df", "dl", "T"][i], v])) : { df: 0.237, dl: 0.368, T: 0.45 }, WIDTH = 0.26, TT = 0.42;
const KC = +arg("--K", 4), JD = path.resolve(here, "../../../../review_artifacts/physical_character_v1/g2_walker/json");
const MODELS = protocol === "ctrl" ? Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fs.readFileSync(path.join(JD, `${arg("--models", "m8a_tau")}${t}.json`), "utf8"))])) : null;
const plan = (Lt) => protocol === "ctrl" ? { k: KC, steps: { 0: FIRST, [KC]: { df: Lt, dl: WIDTH, T: TT } }, ctrl: true }
  : protocol === "speed" ? { k: 3, steps: { 0: FIRST, 1: { df: 0.30, dl: WIDTH, T: TT }, 2: { df: 0.34, dl: WIDTH, T: TT }, 3: { df: Lt, dl: WIDTH, T: TT }, 4: { df: 0.30, dl: WIDTH, T: TT }, 5: { df: 0.30, dl: WIDTH, T: TT } } }
  : { k: 1, steps: { 0: FIRST, 1: { df: Lt, dl: WIDTH, T: TT }, 2: { df: 0.28, dl: WIDTH, T: TT }, 3: { df: 0.28, dl: WIDTH, T: TT } } };
function run(Lt, first, at) {
  const P = plan(Lt), n = P.ctrl ? KC + 6 : Object.keys(P.steps).length + 1, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  const base = CHAR_BASE(0.6); let LOCO = null; const t0 = Date.now();
  const ctrl = P.ctrl ? { kind: "A", models: MODELS, nom: [0.22, 0.28, 0.40], rho: 0.4, sig: [0.05, 0.05, 0.03], lo: [0.10, 0.17, 0.36], hi: [0.30, 0.40, 0.48], inSwing: 0.3, commitMargin: 0.12, adapt: { gain: 0.3, max: 0.06 } } : null;
  const walk = P.ctrl ? { ...base.walk, dsLead: true, dsFlat: false, dsExtEnd: 0.96, reachExt: 0.96, char: P.steps, ctrl } : { ...base.walk, char: P.steps }, human = P.ctrl ? { ...base.human, lateBlend: true, clrActual: true, clrActualUntil: [0.5, 0.2], swingLiftH: 0.20 } : base.human;
  const r = runG2a(J, spec, "G2b_walk08", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { walk, steps, at }, humanOver: human, onLoco: (l) => { LOCO = l; } });
  if (arg("--frames", null) && (arg("--frameL", null) == null || (arg("--frameL") + "").split(",").map(Number).some(x => Math.abs(x - Lt) < 1e-6)) && (arg("--frameStart", null) == null || arg("--frameStart") === first + "@" + at)) {
    const fr = dumpFrames(path.join(arg("--frames"), `${arg("--tag", "step_" + protocol)}_${foot}_L${Lt}_${first}${at}.js`), spec, r.recs, LOCO.planner, { scenario: arg("--tag", "step_" + protocol), foot, protocol, L: Lt, testK: P.k, models: arg("--models", null), start: first + "@" + at, hash: r.hash }, { t1: ((r.recs.find(q => q.com[1] < 0.75) || { t: Infinity }).t) + 1.0 }); console.log("frames", fr.frames, (fr.bytes / 1e6).toFixed(1) + " MB"); }
  const cpu = (Date.now() - t0) / 1000, R_ = r.recs, fall = R_.find(q => q.com[1] < 0.75), tF = fall ? fall.t : Infinity, Pl = LOCO.planner, h0 = Pl.rhythm.wk.h0, hd = [Math.sin(h0), 0, Math.cos(h0)], rt = [hd[2], 0, -hd[0]];
  const at_ = (t) => { let lo = 0, hi = R_.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (R_[m].t < t) lo = m; else hi = m; } return R_[hi]; };
  const D = Pl.exec.done.filter(d => d.kind === "rhythmic"), byK = (k) => D.find(d => d.stepIndex === k) || (Pl.exec.R && Pl.exec.R.stepIndex === k ? Pl.exec.R : null);
  const proj = (d, p) => [(p[0] - d.pSt[0]) * hd[0] + (p[1] - d.pSt[1]) * hd[2], ((p[0] - d.pSt[0]) * rt[0] + (p[1] - d.pSt[1]) * rt[2]) * (d.sw === "R" ? 1 : -1)];
  const swingOk = (d, tgt) => !!(d && d.liftoff && d.td && d.td.t < tF && d.td.t - d.liftoff.t >= 0.2 && (!tgt || Math.hypot(...V.sub([...proj(d, d.td.center), 0], [tgt.df, tgt.dl, 0])) < 0.08));
  const K = P.k, dT = byK(K), dN = byK(K + 1), tgtT = P.steps[K], tgtN = P.ctrl ? null : P.steps[K + 1];
  const reach = !!(dT && dT.td && dT.td.t < tF && dT.liftoff && dT.td.t - dT.liftoff.t >= 0.2 && Math.hypot(proj(dT, dT.td.center)[0] - tgtT.df, proj(dT, dT.td.center)[1] - tgtT.dl) < 0.10);
  const cont = reach && swingOk(dN, tgtN) && (() => { const d2 = byK(K + 2); return !!(d2 && d2.tSw0 < tF); })();
  const cont3 = cont && (() => { const d4 = byK(K + 4); return !!(d4 && d4.tSw0 < tF); })();   // (upright 4 steps after the test step)
  // the chain at the CONTINUATION step (its swing leg = the test step's trailing leg)
  const chain = {}; if (dT && dT.td && dN) { const s = dN.sw, fb = bi("foot_" + s), tb = bi("thigh_" + s), sh = spec.bodies[fb].planBox || spec.bodies[fb].shapes[0];
    const q0 = at_(dN.tSw0); const hip = q0.states[tb].pos, an = q0.states[fb].pos; chain.trailExt = Math.hypot(hip[0] - an[0], hip[1] - an[1], hip[2] - an[2]) / legLen;
    // the trailing foot's late stance: from the test step's liftoff to the continuation step's liftoff (or its start + 0.3 s)
    const tA = dT.liftoff ? dT.liftoff.t : dT.tSw0, tB = dN.liftoff ? dN.liftoff.t : dN.tSw0 + 0.3, Wn = R_.filter(q => q.t >= tA && q.t <= Math.min(tB, tF));
    let heelMax = 0, mtpMax = null, roll = -9, ankMax = 0, heelAtTd = null;
    for (const q of Wn) { const S = q.states[fb], heel = Math.min(...[-1, 1].map(sx => V.add(S.pos, Q.rot(S.rot, [sh.pos[0] + sx * sh.he[0], sh.pos[1] - sh.he[1], sh.pos[2] - sh.he[2]]))[1])); heelMax = Math.max(heelMax, heel);
      if (dT.td && Math.abs(q.t - dT.td.t) < 1 / 480) heelAtTd = heel;
      if (q.mtp) mtpMax = Math.max(mtpMax ?? -9, q.mtp[s].a);
      const F = q.feet[s]; if (F.loaded && F.points && F.points.length) for (const p of F.points) roll = Math.max(roll, V.dot(V.sub(p, S.pos), hd));
      const a = q.arb && q.arb.find(e => e.joint === "ankle_" + s); if (a) ankMax = Math.max(ankMax, Math.abs(a.real[1])); }
    chain.heelMax = heelMax; chain.heelAtTd = heelAtTd; chain.mtpMaxDeg = mtpMax != null ? mtpMax * 57.2958 : null; chain.rollover = roll > -9 ? roll : null; chain.ankleTauMax = ankMax;
    // the continuation swing: toe contacts before touchdown (scuff), its outcome
    chain.swingT = dN.liftoff && dN.td ? dN.td.t - dN.liftoff.t : null; chain.liftoff = !!dN.liftoff; chain.tdU = dN.td ? dN.td.uAt : null;
    chain.tdPart = null; if (dN.td) { const q = at_(dN.td.t), F = q.feet[s]; chain.tdPart = F.heel && F.toe ? "flat" : F.toe ? "toe" : F.heel ? "heel" : "?"; }
    chain.scuff = !!(dN.td && dN.liftoff && dN.td.t - dN.liftoff.t < 0.2 && chain.tdPart === "toe");
    chain.achievedN = dN.td ? proj(dN, dN.td.center) : null; }
  // the test step itself: touchdown quality (foot velocity at contact, peak load in 0.1 s) and stance slip of its stance foot
  const tq = {}; if (dT && dT.td) { const s = dT.sw, fb = bi("foot_" + s), q = at_(dT.td.t), v = q.states[fb].v; tq.vF = V.dot(v, hd); tq.vY = v[1];
    tq.peakBW = Math.max(...R_.filter(x => x.t >= dT.td.t && x.t <= dT.td.t + 0.1).map(x => x.feet[s].load)) / W;
    const st = s === "R" ? "L" : "R", a = at_(dT.liftoff ? dT.liftoff.t : dT.tSw0), b = at_(dT.td.t); tq.stanceSlip = a.feet[st].slipDist != null && b.feet[st].slipDist != null ? b.feet[st].slipDist - a.feet[st].slipDist : null; }
  const vAt = dT ? at_(dT.tSw0) : null;
  return { L: Lt, first, at, hash: r.hash, cpu, tFall: Number.isFinite(tF) ? tF : null, reach, cont, cont3, speedAtTest: vAt ? V.dot(vAt.vcom, hd) : null,
    achieved: dT && dT.td ? proj(dT, dT.td.center) : null, testSwingT: dT && dT.liftoff && dT.td ? dT.td.t - dT.liftoff.t : null, chain, td: tq,
    upright: D.filter(d => d.td && d.td.t < tF).length, sat: R_.reduce((a, q) => a + (q.t < tF ? q.satN || 0 : 0), 0) / Math.max(1, R_.filter(q => q.t < tF).length) };
}
const out = { generated: "tools/footgate_steps.js", foot, protocol, Ls, spec: { bodies: spec.bodies.length, footBox: (spec.bodies[bi("foot_R")].planBox || spec.bodies[bi("foot_R")].shapes[0]), passiveJoints: spec.passiveJoints || [] }, runs: [] };
for (const Lt of Ls) { const rows = []; for (const first of ["R", "L"]) for (const at of [0.5, 0.55, 0.6]) rows.push(run(Lt, first, at)); out.runs.push(...rows);
  const nR = rows.filter(r => r.reach).length, nC = rows.filter(r => r.cont).length, m = (k) => { const v = rows.map(r => r.chain[k]).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  console.log(`${foot} ${protocol} L ${Lt.toFixed(2)}: reach ${nR}/6 continue ${nC}/6${protocol === "ctrl" ? ` (4 steps later ${rows.filter(r => r.cont3).length}/6)` : ""} · speed ${(rows.reduce((a, r) => a + (r.speedAtTest || 0), 0) / 6).toFixed(2)} m/s · trail ext ${m("trailExt") != null ? m("trailExt").toFixed(3) : "-"} · heel max ${m("heelMax") != null ? (m("heelMax") * 100).toFixed(1) : "-"} cm · rollover ${m("rollover") != null ? m("rollover").toFixed(3) : "-"} m · ankle τ ${m("ankleTauMax") != null ? m("ankleTauMax").toFixed(0) : "-"} N·m · MTP ${m("mtpMaxDeg") != null ? m("mtpMaxDeg").toFixed(1) + "°" : "-"} · scuffs ${rows.filter(r => r.chain.scuff).length}`); }
if (outP) { fs.mkdirSync(path.dirname(outP), { recursive: true }); fs.writeFileSync(outP, JSON.stringify(out)); console.log("wrote", outP); }

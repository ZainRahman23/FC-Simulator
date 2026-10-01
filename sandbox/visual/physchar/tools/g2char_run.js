// ═══ physchar/tools/g2char_run.js — G2 PLANT CHARACTERISATION: the body's measured step-to-step response (measurement only) ══════════════
// 1. SHOOT a near-periodic open-loop footstep sequence (Newton on each step's forward / sideways foothold so the next single support starts
//    with the target capture-point offset) — the footholds this body needs are themselves a measurement;
// 2. SWEEP one input at a time around a measured step (foothold forward / sideways, single-support duration, forward / sideways push, yaw
//    couple) and a few 2-D grids; record the state one step later (after touchdown and load transfer);
// 3. the per-segment vertical angular momentum through the nominal steps (the single-support yaw study).
// usage: node tools/g2char_run.js [--speed 0.6] [--out file.json] [--phase shoot|sweep|all]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec, WORKING_CALIB } from "../pc_body.js";
import { loadJolt } from "../pc_jolt.js";
import { buildPoses } from "../pc_control.js";
import { initOfLoco } from "../pc_ref.js";
import { runChar, stepPair } from "../pc_g2char.js";
const here = path.dirname(fileURLToPath(import.meta.url)), PC = path.resolve(here, ".."), ROOT = path.resolve(here, "../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, T = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new T[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const spec = buildBodySpec(rig, mesh, { calib: WORKING_CALIB }), J = await loadJolt(path.join(PC, "vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec);
initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const speed = +arg("--speed", 0.6), phase = arg("--phase", "all"), outP = arg("--out", null), f = (x, d = 3) => x == null || !Number.isFinite(x) ? "-" : (+x).toFixed(d);
// the inner loop under test (the single-support / double-support capture-point feedback gains: −1 = none, the CoP on its fixed path)
const INNER = { natural: { kXiAlong: -1, kXiAcross: -1, kXiDS: -1 }, neutral: { kXiAlong: 0, kXiAcross: 0, kXiDS: 0 }, ankle: { kXiAlong: 0.5, kXiAcross: 0.5, kXiDS: 0.5 }, ankleF: { kXiAlong: 0.5, kXiAcross: -1, kXiDS: 0.5 },
  // (double-support tracking: the CoP between the feet re-solved every tick to land ξ at the next single support's planned offset — sideways only, or both axes)
  dslat: { kXiAlong: -1, kXiAcross: -1, latDS: "track" }, dsboth: { kXiAlong: -1, kXiAcross: -1, latDS: "track", fwdDS: "track" } };
const inner = arg("--inner", "natural"); if (!INNER[inner]) throw new Error("unknown --inner " + inner);
let nSim = 0; const sim = (x) => { nSim++; return runChar(J, spec, poses, { speed, n: 7, walkOver: INNER[inner], ...x }); };

// ── 1. SHOOTING: step k's (df, dl) so that ξ at step k+1's liftoff = target (forward, inward) ──
export const TARGET = { xiF: +arg("--xiF", 0.10), xiL: +arg("--xiL", 0.05) };
function shoot(K, init) { const steps = {}; const log = [];
  for (let k = 0; k <= K; k++) { let u = init(k, steps), best = null, last = null; let evals = 0;
    const ev = (uu) => { evals++; const res = sim({ steps: { ...steps, [k]: { df: uu[0], dl: uu[1], T: 0.45 } } }), pr = stepPair(res, k); if (!pr || !pr.upright) return null; return { e: [pr.post.xi[0] - TARGET.xiF, pr.post.xi[1] - TARGET.xiL], pr }; };
    const take = (uu, r) => { const err = Math.hypot(r.e[0], r.e[1]); if (!best || err < best.err) best = { u: uu.slice(), err, pr: r.pr }; return err; };
    // (a) unit-gain corrections in the physical direction (forward: a further foothold lowers the next forward offset; sideways: a wider one
    //     raises the next inward offset), backtracking half-way toward the last upright point after a fall
    for (let it = 0; it < 6 && evals < 14; it++) { const r = ev(u); if (!r) { if (!last) { u = [u[0] + 0.05, u[1]]; continue; } u = [(u[0] + last[0]) / 2, (u[1] + last[1]) / 2]; continue; }
      last = u.slice(); if (take(u, r) < 0.004) break; u = [u[0] + Math.max(-0.1, Math.min(0.1, r.e[0])), u[1] - Math.max(-0.08, Math.min(0.08, r.e[1]))]; }
    // (b) Newton refinement from the best point (finite-difference Jacobian)
    for (let it = 0; it < 3 && best && best.err >= 0.004 && evals < 24; it++) { const u0 = best.u, r0 = ev(u0); if (!r0) break; const h = 0.015, a = ev([u0[0] + h, u0[1]]), b = ev([u0[0], u0[1] + h]); if (!a || !b) break;
      const Jm = [[(a.e[0] - r0.e[0]) / h, (b.e[0] - r0.e[0]) / h], [(a.e[1] - r0.e[1]) / h, (b.e[1] - r0.e[1]) / h]], det = Jm[0][0] * Jm[1][1] - Jm[0][1] * Jm[1][0]; if (Math.abs(det) < 1e-6) break;
      let du = [-(Jm[1][1] * r0.e[0] - Jm[0][1] * r0.e[1]) / det, -(-Jm[1][0] * r0.e[0] + Jm[0][0] * r0.e[1]) / det]; const n = Math.hypot(du[0], du[1]); if (n > 0.08) du = du.map(x => x * 0.08 / n);
      const u1 = [u0[0] + du[0], u0[1] + du[1]], r1 = ev(u1); if (r1) take(u1, r1); else break; }
    if (!best) { log.push({ k, failed: true }); console.log(`shoot step ${k}: FAILED (every candidate fell) · sims ${nSim}`); break; }
    steps[k] = { df: +best.u[0].toFixed(4), dl: +best.u[1].toFixed(4), T: 0.45 }; log.push({ k, df: steps[k].df, dl: steps[k].dl, err: best.err, post: best.pr.post, pre: best.pr.pre, foothold: best.pr.foothold, evals });
    console.log(`shoot step ${k}: df ${f(steps[k].df)} dl ${f(steps[k].dl)} | residual ${f(best.err * 100, 2)} cm | pre ξ ${best.pr.pre.xi.map(x => f(x)).join(",")} v ${best.pr.pre.v.slice(0, 2).map(x => f(x, 2)).join(",")} → post ξ ${best.pr.post.xi.map(x => f(x)).join(",")} v ${best.pr.post.v.slice(0, 2).map(x => f(x, 2)).join(",")} | evals ${evals} · sims ${nSim}`); }
  return { steps, log }; }

const out = { generated: "tools/g2char_run.js", calib: WORKING_CALIB, speed, target: TARGET, inner, innerGains: INNER[inner] };
if (phase === "shoot" || phase === "all") { const init = (k, st) => k === 0 ? [0.25, 0.33] : st[k - 1] ? [st[k - 1].df, 0.26] : [speed * 0.6, 0.26]; out.shoot = shoot(+arg("--K", 4), init); }
// ── 2. SWEEPS at a reference step: one input at a time + 2-D grids; each sample = (pre state, input, post state one step later) ──
// reference A: step 1 (left swing) after the shot first step; reference B: step 2 (right swing) after a moderate step 1
// (reference C: as A, nominal single support 0.40 s — faster stepping halved the sideways amplification in the timing grid)
const COND = { A: { 0: { df: 0.237, dl: 0.368, T: 0.45 } }, B: { 0: { df: 0.237, dl: 0.368, T: 0.45 }, 1: { df: 0.36, dl: 0.28, T: 0.45 } }, C: { 0: { df: 0.237, dl: 0.368, T: 0.45 } } }, REFK = { A: 1, B: 2, C: 1 };
const NOMS = { A: { df: 0.34, dl: 0.26, T: 0.45 }, B: { df: 0.34, dl: 0.26, T: 0.45 }, C: { df: 0.34, dl: 0.26, T: 0.40 } }; let NOM = NOMS.A;
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => +(a + (b - a) * i / (n - 1)).toFixed(4));
function sample(ref, u, push, tag) { const k = REFK[ref], res = sim({ steps: { ...COND[ref], [k]: { df: u.df, dl: u.dl, T: u.T } }, push: push ? { step: k, u: 0, ...push } : null });
  const a = res.steps.find(s => s.k === k), b = res.steps.find(s => s.k === k + 1), pr = stepPair(res, k);
  const swingT = a && a.td != null && a.lift != null ? a.td - a.lift : null, cls = !a || !a.atLift ? "fallen-before" : swingT != null && swingT < 0.25 ? "swing-failed" : pr && pr.upright ? "upright" : "fallen";
  return { ref, k, tag, u, push: push || null, cls, pre: a && a.atLift, td: a && a.atTd, tdNew: a && a.tdNew, foothold: a && a.foothold, swingT, ds: a && a.ds, post: pr && pr.upright ? pr.post : null, tFall: res.tFall, hash: res.hash,
    human: a ? { clearance: a.clearance ?? null, kneeTd: a.kneeTd ?? null, pelvisYawPeak: a.pelvisYawPeak ?? null, sat: a.sat ?? null } : null }; }
if (phase === "sweep" || phase === "all") { const rows = []; const t0 = Date.now();
  const REFS = String(arg("--refs", "A,B,C")).split(","), QUICK = !!arg("--quick", false);
  for (const ref of REFS) { NOM = NOMS[ref];
    for (const df of lin(0.18, 0.50, 9)) rows.push(sample(ref, { ...NOM, df }, null, "df"));
    for (const dl of lin(0.10, 0.42, 9)) rows.push(sample(ref, { ...NOM, dl }, null, "dl"));
    for (const T of lin(0.33, 0.57, 7)) rows.push(sample(ref, { ...NOM, T }, null, "T"));
    for (const jf of lin(-16, 16, 9)) rows.push(sample(ref, NOM, { J: [jf, 0] }, "pushF"));
    for (const jl of lin(-12, 12, 9)) rows.push(sample(ref, NOM, { J: [0, jl] }, "pushL"));
    for (const lz of lin(-4, 4, 9)) rows.push(sample(ref, NOM, { Lz: lz }, "yaw"));
    if (!QUICK) { for (const df of lin(0.22, 0.46, 5)) for (const dl of lin(0.14, 0.38, 5)) rows.push(sample(ref, { ...NOM, df, dl }, null, "grid_df_dl"));
    for (const dl of lin(0.14, 0.38, 5)) for (const jl of lin(-10, 10, 5)) rows.push(sample(ref, { ...NOM, dl }, { J: [0, jl] }, "grid_dl_pushL"));
    for (const df of lin(0.22, 0.46, 5)) for (const jf of lin(-12, 12, 5)) rows.push(sample(ref, { ...NOM, df }, { J: [jf, 0] }, "grid_df_pushF"));
    for (const T of lin(0.35, 0.55, 5)) for (const jl of lin(-10, 10, 5)) rows.push(sample(ref, { ...NOM, T }, { J: [0, jl] }, "grid_T_pushL")); }
    console.log(`ref ${ref}: ${rows.filter(r => r.ref === ref).length} samples · upright ${rows.filter(r => r.ref === ref && r.cls === "upright").length} · ${((Date.now() - t0) / 1000).toFixed(0)} s`); }
  out.sweep = { cond: COND, refK: REFK, nominal: NOMS, rows }; }
// ── 3. the YAW study: the per-segment vertical angular momentum through the nominal reference sequence (and the in-place G2a gait for contrast) ──
if (phase === "yaw" || phase === "all") { const res = sim({ steps: { ...COND.A, [REFK.A]: NOMS.A }, series: true });
  out.yaw = { steps: res.steps.map(s => ({ k: s.k, sw: s.sw, lift: s.lift, td: s.td })), series: res.series, tFall: res.tFall };
  console.log(`yaw series: ${res.series.length} samples to ${res.tFall ? "the fall at " + res.tFall.toFixed(2) + " s" : "the end"}`); }
if (outP) fs.writeFileSync(outP, JSON.stringify(out, null, 1));
console.log(`done · ${nSim} simulations`);

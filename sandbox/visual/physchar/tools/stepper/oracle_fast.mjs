// ═══ physchar/tools/stepper/oracle_fast.mjs — the Jolt ORACLE on validated snapshots (OFFLINE DIAGNOSTIC / TEACHER) ══════════════════════
// Same search, configurations, cost and tie-breaking as oracle.mjs (replay engine), but every branch starts from an exact snapshot taken at
// the previous step's touchdown (tools/stepper/session.mjs; validated bit-identical to from-scratch replays by session_check.mjs) instead
// of replaying from t = 0. One process per start; the launcher runs the starts in parallel.
// usage: node tools/stepper/oracle_fast.mjs --cfg B --starts R@0.5,... --kmax 21 [--terminal m.json] [--policy p.json] [--par 6] --out f.json
import fs from "fs"; import path from "path"; import { spawn } from "child_process"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), PC = path.resolve(here, "../.."), ROOT = path.resolve(here, "../../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : process.argv[i + 1]; };
if (arg("--child", null) == null) { // ── LAUNCHER ──
  const starts = arg("--starts", "R@0.5").split(","), par = +arg("--par", 6), outP = arg("--out"), pass = process.argv.slice(2).filter((x, i, a) => !["--starts", "--out", "--par"].includes(x) && !["--starts", "--out", "--par"].includes(a[i - 1])), results = [], t0 = Date.now();
  const runOne = (st) => new Promise(res => { const tmp = path.join(path.dirname(outP), `.tmp_${path.basename(outP)}_${st.replace("@", "")}.json`);
    const p = spawn("node", [fileURLToPath(import.meta.url), "--child", "1", "--start", st, "--tmp", tmp, ...pass], { stdio: ["ignore", "pipe", "inherit"] });
    p.stdout.on("data", d => process.stdout.write(d)); p.on("close", () => { try { results.push(JSON.parse(fs.readFileSync(tmp, "utf8"))); fs.unlinkSync(tmp); } catch (e) { console.log("no result for", st); } res(); }); });
  const q = starts.slice(); await Promise.all(Array.from({ length: Math.min(par, q.length) }, async () => { while (q.length) await runOne(q.shift()); }));
  results.sort((a, b) => starts.indexOf(a.start) - starts.indexOf(b.start));
  fs.writeFileSync(outP, JSON.stringify({ generated: "tools/stepper/oracle_fast.mjs", cfgName: arg("--cfg"), args: pass, results }));
  console.log(`done ${results.length} starts in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${outP}`); process.exit(0); }
// ── CHILD: one start ──
const { buildBodySpec, WORKING_CALIB } = await import("../../pc_body.js"); const { loadJolt } = await import("../../pc_jolt.js"); const { buildPoses } = await import("../../pc_control.js");
const { initOfLoco } = await import("../../pc_ref.js"); const { TESTS_G2 } = await import("../../pc_gateg2.js"); const { SimSession } = await import("./session.mjs"); const { stepFeatures } = await import("../../pc_stepfeat.js");
const { CFGS, terminalV, featOf } = await import("./oracle.mjs");
const { nominalStep } = await import("../../pc_stepper.js");
// (centres: "ctrl" — the feedback controller's own decision; "nominal" — a fixed point; "wr" — the speed-scaled walk-ratio nominal of the measured
//  state (pc_stepper.nominalStep, the Part-7 generator); "union" — ctrl ∪ wr)
const XCFG = { _g: (center) => ({ center, dfOff: [-0.12, -0.06, 0, 0.06, 0.12], TOff: [-0.06, 0, 0.06] }), cost: { tf: 0, tl: 0.10, tv: 0.45, sv: 0.06 }, dlVar: [-0.06, -0.03, 0.03, 0.06] };
Object.assign(CFGS, { Ew: { horizon: 1, grid: XCFG._g("wr"), dlVar: XCFG.dlVar, cost: XCFG.cost }, Gw: { horizon: 2, beam: 3, grid: XCFG._g("wr"), grid2: XCFG._g("wr"), dlVar: XCFG.dlVar, cost: XCFG.cost, w1: 0.5 },
  Gu: { horizon: 2, beam: 3, grid: XCFG._g("union"), grid2: XCFG._g("union"), dlVar: XCFG.dlVar, cost: XCFG.cost, w1: 0.5 }, Bu: { horizon: 1, grid: XCFG._g("union"), dlVar: XCFG.dlVar, cost: XCFG.cost } });
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), Ly = rig.mesh.layout, TA = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new TA[Ly[k].elementType](ab, Ly[k].byteOffset, Ly[k].elementCount);
const FOOT = process.env.FOOT || "F0", spec = buildBodySpec(rig, mesh, { calib: WORKING_CALIB, ...(FOOT !== "F0" ? { footModel: FOOT } : {}) }), J = await loadJolt(path.join(PC, "vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec);
initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const JD = path.resolve(ROOT, "review_artifacts/physical_character_v1/g2_walker/json"), models = (pre) => Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fs.readFileSync(path.join(JD, `${pre}${t}.json`), "utf8"))]));
const cfgArg = arg("--cfg", "legacy1"), C = { ...(CFGS[cfgArg] || JSON.parse(cfgArg)) }, start = arg("--start"), kmin = +arg("--kmin", 2), kmax = +arg("--kmax", 21), ctrlX = JSON.parse(arg("--ctrl", "{}")), commitCtrl = arg("--commit", "best") === "ctrl", roundN = arg("--round", null) != null ? +arg("--round") : null, walkX = JSON.parse(arg("--walk", "{}")), humanX = arg("--human", null) ? JSON.parse(arg("--human")) : null;
// (DATA AGGREGATION, --stepper m.json [--stepcfg json] --commit ctrl: the controller decides with the Physical Stepper; the walk follows its own
//  choices while every candidate around them is still simulated — the surrogate learns the states its own planner visits)
if (arg("--stepper", null)) ctrlX.stepper = { model: JSON.parse(fs.readFileSync(arg("--stepper"), "utf8")), ...JSON.parse(arg("--stepcfg", "{}")), ...(arg("--stepV", null) ? { V: JSON.parse(fs.readFileSync(arg("--stepV"), "utf8")) } : {}) };
if (arg("--terminal", null)) { const { terminalValue } = await import("../../pc_stepper.js"), Vm = JSON.parse(fs.readFileSync(arg("--terminal"), "utf8")); C.Vfn = (z) => z ? terminalValue(Vm, z) : Infinity; C.w1 = C.w1 ?? 0.5; }
const { featOf: featP } = await import("../../pc_stepper.js"); let policyFn = null; if (arg("--policy", null)) { const m = JSON.parse(fs.readFileSync(arg("--policy"), "utf8")); policyFn = (z, uc) => m.out.map((o, j) => { let y = m.b[j]; m.feats.forEach((nm, i) => { y += m.W[j][i] * featP(z, nm); }); if (o === "dl" && m.dlFromCtrl) y = uc[1]; return Math.max(m.lo[j], Math.min(m.hi[j], y)); }); }
const cost = (s) => !s ? Infinity : ((s.xi[0] - C.cost.tf) / 0.03) ** 2 + ((s.xi[1] - C.cost.tl) / 0.03) ** 2 + ((s.v[0] - C.cost.tv) / C.cost.sv) ** 2;
function cands(G, uc, z) { if (G.center === "union") { const seen = new Set(), out = []; for (const u of [...cands({ ...G, center: "ctrl" }, uc, z), ...cands({ ...G, center: "wr" }, uc, z)]) { const key = u.map(x => x.toFixed(4)).join(); if (!seen.has(key)) { seen.add(key); out.push(u); } } return out; }
  const out = []; if (!G.center || G.center === "abs") { const dls = G.dl === "ctrl" ? [uc[1]] : G.dl; for (const df of G.df) for (const T of G.T) for (const dl of dls) out.push([df, dl, T]); return out; }
  const c = G.center === "ctrl" ? uc : G.center === "wr" ? [nominalStep(G.vReq ?? 0.5, z.v[0]).df, uc[1], G.nomT ?? 0.40] : [G.nom.df, uc[1], G.nom.T], lo = G.Tlo ?? 0.30, hi = G.Thi ?? 0.54, seen = new Set();
  for (const d of G.dfOff) for (const t of G.TOff) { const u = [c[0] + d, c[1], Math.max(lo, Math.min(hi, c[2] + t))], key = u.map(x => x.toFixed(4)).join(); if (!seen.has(key)) { seen.add(key); out.push(u); } } return out; }
// the session for this start (the same walk configuration as the replay engine's sim_worker)
const [first, atS] = start.split("@"), at = +atS, n = kmax - kmin + 11, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
const base = TESTS_G2.G2W_A8.loco.rhythm.walk, ctrl = { ...base.ctrl, kind: "U", vd: 0.5, from: 1, ramp: { a: 0.3 }, place: "maps", uRefSim: false, lat: { rho: 0.4 }, adapt: null, reachIter: false, ...ctrlX, identFixed: true };
ctrl.models = models(ctrl.modelsPrefix || "mU1_tau"); delete ctrl.modelsPrefix;
const S = new SimSession(J, spec, "G2W_A8", { poses, seconds: 1.6 + n * 0.62, rhythmOver: { steps, at, walk: { swingBase: { w: "model", learn: { rate: 0.05 }, pure: [0] }, ...walkX, char: { ...(base.char || {}) }, ctrl } }, ...(humanX ? { humanOver: humanX } : {}) });
const P = () => S.loco.planner, fell = () => S.st.obs.com[1] < 0.75;
// run on until step `k` has started (→ its start state and the controller's own decision there) or a fall; optionally snapshot at step k−1's touchdown on the way
function runToStart(k, snapAtTdOf) { const ring = []; let snap = null;
  while (S.st.n < S.maxSteps) { if (snapAtTdOf != null && !snap) { const d = P().exec.done.find(e => e.kind === "rhythmic" && e.stepIndex === snapAtTdOf && e.td); if (d) snap = S.snapshot(); }
    ring.push(S.st.obs); if (ring.length > 40) ring.shift(); S.tick(); if (fell()) return { status: "fell", snap };
    const R = P().exec.R; if (R && R.kind === "rhythmic" && R.stepIndex === k) { const o = [...ring, S.st.obs].find(q => Math.abs(q.t - R.tSw0) < 1e-6), prev = P().exec.done.filter(e => e.kind === "rhythmic" && e.td).pop();
      const z = stepFeatures(spec, o, { sw: R.sw, pSt: R.pSt, h0: P().rhythm.wk.h0, tSw0: R.tSw0, prevTd: prev ? prev.td.t : null }), lg = (P().rhythm.walkerLog || []).find(e => e.i === k), U = P()._uni, sl = U && U.stepLog.find(e => e.i === k), wp = P().exec.wProf;
      if (sl) z.mem = { I: sl.I, vBar: sl.vBar, vd: sl.vd, Tds: sl.ds, wProf: wp ? [0, 1, 2].map(j => wp.reduce((a, r) => a + r[j], 0) / wp.length) : null };   // (the controller's own memory at the decision — the richer-state ablation)
      if (snapAtTdOf != null && !snap) { const d = P().exec.done.find(e => e.kind === "rhythmic" && e.stepIndex === snapAtTdOf && e.td); if (d) snap = S.snapshot(); }
      return { status: "started", z, uc: lg ? lg.u.slice(0, 3) : null, snap }; } }
  return { status: "ended", snap }; }
const setCmd = (k, u) => { P().rhythm.walk.char[k] = { df: u[0], dl: u[1], T: u[2] }; };
const fixed = {}, out = []; let t0 = Date.now(), policyFin = null;
// the decision point for step k: the snapshot at step k−1's touchdown (any command for step k is read only at its start decision), the state at
// step k's start and the controller's own decision there. A committed candidate's evaluation run already carries the next decision point.
let cur; { const r = runToStart(kmin, kmin - 1); if (!r.snap || r.status !== "started") { console.log(start, "no decision point"); process.exit(1); } cur = { snap: r.snap, z: r.z, uc: r.uc }; }
const ev = (u, kk, base) => { S.restore(base); setCmd(kk, u); const r = runToStart(kk + 1, kk); const s = r.status === "started" ? r.z : null; return { u, s, c: cost(s), uc1: r.uc, snap: r.snap, status: r.status }; };
const withV = (e) => { if (C.Vfn) { e.v1 = C.Vfn(e.s); e.c0 = e.c; e.c = C.w1 * e.c + e.v1; } return e; };
for (let k = kmin; k <= kmax; k++) { const zk = cur.z, uc = cur.uc, Sk = cur.snap;
  if (policyFn) { const u = policyFn(zk, uc), e = ev(u, k, Sk); fixed[k] = { df: u[0], dl: u[1], T: u[2] }; out.push({ k, z: zk, uc, u, z1: e.s, c: Number.isFinite(e.c) ? e.c : null });
    S.free(Sk); console.log(`${start} k ${k} | policy ${u.map(v => v.toFixed(3))} | ${e.status} | ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    if (!e.snap || e.status !== "started") { if (e.snap) S.free(e.snap); cur = null;   // (the policy's own step fell: the session holds that run up to the fall — the final count is read from it)
      const tF = S.t, D = P().exec.done.filter(q => q.kind === "rhythmic" && q.td && q.td.t < tF); policyFin = { status: "fell", tStop: tF, upright: D.length, committed: Object.keys(fixed).length }; break; }
    cur = { snap: e.snap, z: e.s, uc: e.uc1 }; continue; }
  const ev1 = cands(C.grid, uc, zk).map(u => withV(ev(u, k, Sk)));
  let best = null; for (const e of ev1) if (!best || e.c < best.c) best = e;
  if (C.dlVar && best) for (const d of C.dlVar) { const e = withV(ev([best.u[0], best.u[1] + d, best.u[2]], k, Sk)); ev1.push(e); if (e.c < best.c) best = e; }
  const lvl2 = [];
  if (C.horizon === 2) { const top = ev1.filter(e => Number.isFinite(e.c)).slice().sort((a, b) => a.c - b.c).slice(0, C.beam); let best2 = null;
    for (const e1 of top) { let b1 = Infinity, n2 = 0, v2 = 0; const ev2s = [];
      if (e1.snap && e1.uc1) for (const u of cands(C.grid2, e1.uc1, e1.s)) { const e2 = ev(u, k + 1, e1.snap); n2++; if (Number.isFinite(e2.c)) v2++; if (e2.c < b1) b1 = e2.c; if (e2.snap) S.free(e2.snap); ev2s.push({ u: e2.u, c: Number.isFinite(e2.c) ? e2.c : null, z1: e2.s }); }
      const tot = C.w1 * e1.c + b1; lvl2.push({ u: e1.u, c1: e1.c, b1: Number.isFinite(b1) ? b1 : null, n2, viable2: v2, ev2: ev2s }); if (!best2 || tot < best2.tot) best2 = { ...e1, tot }; }
    if (best2 && Number.isFinite(best2.tot)) best = best2; }
  if (commitCtrl) { const e = withV(ev(uc, k, Sk)); ev1.push(e); best = e; }
  const viable = ev1.filter(e => Number.isFinite(e.c)).length;
  if (!best || !Number.isFinite(best.c)) { out.push({ k, z: zk, uc, end: commitCtrl ? "the committed (controller's own) step fell before step k+1" : "every candidate falls before step k+1", n1: ev1.length, cands: ev1.map(e => ({ u: e.u, c: Number.isFinite(e.c) ? e.c : null, st: e.status, z1: e.s })) }); for (const e of ev1) if (e.snap) S.free(e.snap); cur = { snap: Sk, z: null, uc: null }; break; }
  // ((reproduction of the 2026-10-01 engine, --round 4) the COMMITTED foothold rounded (df, dl to 4 decimals; T exact) while every candidate was
  //  evaluated at full precision — the committed step is re-simulated with the rounded command and becomes the next decision point)
  if (roundN != null) { const ur = [+best.u[0].toFixed(roundN), +best.u[1].toFixed(roundN), best.u[2]]; if (ur[0] !== best.u[0] || ur[1] !== best.u[1]) { const e = ev(ur, k, Sk); best = { ...best, u: ur, s: e.s, c: Number.isFinite(e.c) ? e.c : best.c, uc1: e.uc1, snap: e.snap, rounded: true }; if (!e.snap) { fixed[k] = { df: ur[0], dl: ur[1], T: ur[2] }; out.push({ k, z: zk, uc, u: ur, end: "the rounded commit fell before its touchdown" }); cur = null; break; } } }
  fixed[k] = { df: best.u[0], dl: best.u[1], T: best.u[2] };
  out.push({ k, z: zk, uc, u: best.u, c: best.c, tot: best.tot ?? null, z1: best.s, n1: ev1.length, viable1: viable, cands: ev1.map(e => ({ u: e.u, c: Number.isFinite(e.c) ? e.c : null, c0: e.c0 ?? null, st: e.status, z1: e.s })), lvl2 });
  console.log(`${start} k ${k} | xi ${zk.xi.map(v => v.toFixed(3))} v ${zk.v[0].toFixed(2)} | ctrl ${uc.map(v => v.toFixed(3))} → ${best.u.map(v => v.toFixed(3))} | next xi ${best.s.xi.map(v => v.toFixed(3))} v ${best.s.v[0].toFixed(2)} cost ${best.c.toFixed(1)} | viable ${viable}/${ev1.length} | ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  for (const e of ev1) if (e.snap && e.snap !== best.snap) S.free(e.snap); S.free(Sk); cur = { snap: best.snap, z: best.s, uc: best.uc1 }; }
// the committed sequence played on (the controller takes over after the search horizon) — from the last snapshot, to a fall or the end
let fin = policyFin || { status: "ended", committed: Object.keys(fixed).length, upright: null, tStop: S.t }; if (cur && cur.snap) { S.restore(cur.snap); let tF = null; while (S.st.n < S.maxSteps) { S.tick(); if (fell()) { tF = S.t; break; } }
  const D = P().exec.done.filter(e => e.kind === "rhythmic" && e.td && (tF == null || e.td.t < tF)); fin = { status: tF != null ? "fell" : "ended", tStop: tF ?? S.t, upright: D.length, committed: Object.keys(fixed).length }; }
console.log(`${start} FINAL: committed ${fin.committed} · upright ${fin.upright} · ${fin.status} at ${fin.tStop.toFixed(2)}`);
fs.writeFileSync(arg("--tmp"), JSON.stringify({ start, cfg: { ...C, Vfn: undefined }, fixed, steps: out, final: fin })); process.exit(0);

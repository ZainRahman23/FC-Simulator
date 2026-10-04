// ═══ physchar2/tools/j2b_floor.mjs — INDEPENDENT characterisation of the plant's physical mirror floor (user decision 2026-10-04 §5), pre-registered in
// review_artifacts/physical_character_v2/g3/J2B_FLOOR_PREREG.md. NOT the 81 G3 gate pairs: a separate set of mirrored G2 / G3 situations, every
// body variant, symmetric perturbations, repeated runs. Controller corrections in place (commit e9bcf96); nothing here tunes controller or plant.
// For every job: trial A and its mirror trial B (or, for a self-symmetric scenario, the run against its own reflection), per tick the mirrored
// foot-displacement difference (both feet, horizontal, feet swapped / lateral sign flipped), sliding (> 1.0 mm), contact-piece transitions, the
// supervisor abort and the fall declaration. Class A no meaningful sliding · B sliding, control continues (no fall) · C physical failure (fall):
// C is scored only through the common abort / failure declaration.
// --attribution: a subset re-run with the mirror trial in a world whose L/R creation order is swapped (cfg.mirrorOrder = bodies | joints | all):
// if the asymmetry is creation-order driven (Jolt body IDs → contact / island order; constraint order), B in the swapped world approaches the exact
// mirror of A.
// --set=heldout (overnight Phase B): NEW mirrored situations not in the characterisation set (intermediate push magnitudes, other bodies for T8,
// other ramp speeds, new perturbation magnitudes / directions) — the held-out population for the J2b criteria (g3/G3_CRITERIA_v3.2.md).
// --set=inject (overnight Phase B, meaningfulness): G3-gate-like pairs with a DELIBERATELY INJECTED L/R asymmetry (diagnostic spec / option
// edits inside this tool only): right-side actuator capacity −5 %, right foot mass +5 %, right usable region shifted 2 mm laterally. A
// physical-symmetry check that never flags these is too loose to mean anything.
// usage: node tools/j2b_floor.mjs [--attribution | --set=heldout | --set=inject] [--only=<n>]   → g3/json/j2b_floor[ _attribution | _heldout | _inject].json
import fs from "fs"; import path from "path"; import os from "os"; import { fork } from "child_process"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G2Sim, pushScenario } from "../gates/v2_g2.js"; import { STAND, usableRegion } from "../ctrl/v2_stand.js"; import { bootSole } from "../sim/v2_geom.js"; import { G3Sim, g3Def, mirrorDir } from "../gates/v2_g3.js"; import { cls } from "../gates/v2_g3_checks.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), VEND = path.join(here, "../vendor/jolt-physics.wasm-compat.js"), ATTR = process.argv.includes("--attribution");
const SET = (process.argv.find(a => a.startsWith("--set=")) || "").slice(6) || null;
const OUT = path.join(ROOT, "review_artifacts/physical_character_v2/g3/json", ATTR ? "j2b_floor_attribution.json" : SET ? `j2b_floor_${SET}.json` : "j2b_floor.json"), SLIDE = 1.0e-3;
const PERT = [[0, null], [1e-6, [1, 0]], [1e-6, [0, 1]], [1e-4, [1, 0]], [1e-4, [0, 1]], [1e-3, [0.6, 0.8]], [1e-3, [-0.8, 0.6]]];   // [δ m/s, unit (right, anterior)]: initial COM velocity of A; B gets its mirror
// ── the pre-registered set ──
function jobs() { const J = [], add = (o) => J.push(o), H = VARIATION_SET.map(h => h.id);
  const g2 = JSON.parse(fs.readFileSync(path.join(ROOT, "review_artifacts/physical_character_v2/g2/json/g2_results.json"))), bnd = {};
  for (const j of g2.jobs.filter(j => j.group === "push" && j.res)) { const k = j.human + "|" + j.sc.dir, b = bnd[k] || (bnd[k] = { rec: 0, fail: Infinity }); if (j.res.recovered) b.rec = Math.max(b.rec, j.sc.J); else b.fail = Math.min(b.fail, j.sc.J); }
  for (const h of H) {   // G3 situations on every body: near-single-support, swing-ready, a fast (sliding) transfer
    for (const [a, b] of [["T5", "T6"], ["U:R", "U:L"], ["T7:R:0.5", "T7:L:0.5"]]) add({ kind: "G3", human: h, a, b, fam: a === "T7:R:0.5" ? "transfer-fast" : a === "T5" ? "near-single-support" : "swing-ready" });
    add({ kind: "G2self", human: h, sc: { kind: "quiet", seconds: 10 }, fam: "quiet stance (self)" });
    for (const d of ["F", "B"]) { const b = bnd[h + "|" + d]; if (b && b.rec) add({ kind: "G2self", human: h, sc: { kind: "push", dir: d, J: b.rec }, fam: "sagittal push at the boundary (self)" }); }
    for (const d of ["R", "FR", "BR"]) { const b = bnd[h + "|" + d]; if (!b) continue;
      if (b.rec) { add({ kind: "G2", human: h, sc: { kind: "push", dir: d, J: b.rec }, fam: "push at the largest recovered impulse" }); if (b.rec > 2.5) add({ kind: "G2", human: h, sc: { kind: "push", dir: d, J: b.rec - 2.5 }, fam: "push just below the boundary" }); }
      if (isFinite(b.fail)) add({ kind: "G2", human: h, sc: { kind: "push", dir: d, J: b.fail }, fam: "push at the smallest failing impulse" }); } }
  // V2-REF: the speed range of the transfer, perturbations during transfer, short pelvis pushes
  for (const T of [4, 2, 1, 0.75, 0.25]) add({ kind: "G3", human: "V2-REF", a: `T7:R:${T}`, b: `T7:L:${T}`, fam: T >= 1 ? "transfer" : "transfer-fast" });
  add({ kind: "G3", human: "V2-REF", a: "T1", b: "T2", fam: "transfer" });
  for (const w of ["hold", "ramp"]) for (const d of ["R", "FR", "BR", "F", "B"]) for (const m of [10, 15, 20]) add({ kind: "G3", human: "V2-REF", a: `T8:${w}:R:${d}:${m}`, b: `T8:${w}:L:${mirrorDir(d)}:${m}`, fam: "push during transfer" });
  for (const m of [10, 20, 30]) add({ kind: "G2", human: "V2-REF", sc: { kind: "push", dir: "R", J: m, body: "pelvis", dur: 0.05 }, fam: "short pelvis push (50 ms)" });
  const out = []; let id = 0; for (const j of J) for (const [d, u] of (j.kind === "G2self" ? PERT.filter(([, u]) => !u || u[0] === 0) : PERT)) out.push({ ...j, id: id++, pert: d, u });
  for (const j of out.filter(j => j.id % 10 === 0)) out.push({ ...j, id: id++, repeatOf: j.id });   // repeated deterministic runs
  return out; }
function heldoutJobs() { const J = [], add = (o) => J.push(o), P2 = [[0, null], [3e-5, [0.8, 0.6]], [3e-4, [-0.6, 0.8]]];
  for (const w of ["hold", "ramp"]) for (const d of ["R", "FR", "BR", "F", "B"]) for (const m of [12.5, 17.5]) add({ kind: "G3", human: "V2-REF", a: `T8:${w}:R:${d}:${m}`, b: `T8:${w}:L:${mirrorDir(d)}:${m}`, fam: "push during transfer (held-out magnitude)" });
  for (const h of ["V2-165-62", "V2-198-92", "V1-matched"]) for (const w of ["hold", "ramp"]) for (const d of ["R", "FR", "BR"]) for (const m of [10, 15]) add({ kind: "G3", human: h, a: `T8:${w}:R:${d}:${m}`, b: `T8:${w}:L:${mirrorDir(d)}:${m}`, fam: "push during transfer (held-out body)" });
  for (const h of ["V2-REF", "V2-short-legs", "V2-190-85"]) for (const T of [1.5, 0.35]) add({ kind: "G3", human: h, a: `T7:R:${T}`, b: `T7:L:${T}`, fam: T >= 1 ? "transfer (held-out speed)" : "transfer-fast (held-out speed)" });
  for (const h of ["V2-165-62", "V2-175-70", "V2-198-92", "V1-matched"]) add({ kind: "G3", human: h, a: "T1", b: "T2", fam: "transfer (held-out body)" });
  for (const h of VARIATION_SET.map(x => x.id)) for (const [a, b, fam] of [["T5", "T6", "near-single-support (held-out perturbation)"], ["U:R", "U:L", "swing-ready (held-out perturbation)"]]) add({ kind: "G3", human: h, a, b, fam });
  const out = []; let id = 0; for (const j of J) for (const [d, u] of (/held-out perturbation/.test(j.fam) ? P2.slice(1) : P2)) out.push({ ...j, id: id++, pert: d, u }); return out; }
function injectJobs() { const base = [["T5", "T6"], ["U:R", "U:L"], ["T1", "T2"], ...[4, 1, 0.5, 0.25].map(T => [`T7:R:${T}`, `T7:L:${T}`]), ...["R", "FR", "BR", "F", "B"].flatMap(d => [10, 15].map(m => [`T8:hold:R:${d}:${m}`, `T8:hold:L:${mirrorDir(d)}:${m}`])), ...["R", "FR"].map(d => [`T8:ramp:R:${d}:15`, `T8:ramp:L:${mirrorDir(d)}:15`])];
  const out = []; let id = 0; for (const inj of ["none", "strengthR95", "footMassR105", "regionR2mm"]) for (const [a, b] of base) out.push({ kind: "G3", human: "V2-REF", a, b, fam: "inject", inject: inj, id: id++, pert: 0, u: null }); return out; }
function attrJobs() { const base = jobs().filter(j => !j.pert && j.kind !== "G2self" && !j.repeatOf), pick = [];
  for (const fam of [...new Set(base.map(j => j.fam))]) pick.push(...base.filter(j => j.fam === fam).filter(j => j.human === "V2-REF" || ["V2-165-62", "V2-198-92"].includes(j.human)).slice(0, 6));
  return pick.flatMap(j => ["none", "bodies", "joints", "all"].map(o => ({ ...j, id: `${j.id}:${o}`, order: o }))); }
// ── one job ──
const m2 = (p) => [-p[0], p[1]];
function scenario(job, mirror) { const v = job.pert ? (mirror ? [-job.pert * job.u[0], 0, job.pert * job.u[1]] : [job.pert * job.u[0], 0, job.pert * job.u[1]]) : null;
  if (job.kind === "G3") { const def = { ...g3Def(mirror ? job.b : job.a) }; if (v) def.v = v; return { type: "G3", def }; }
  const sc = job.sc, base = sc.kind === "quiet" ? { title: "quiet", seconds: sc.seconds } : pushScenario(mirror ? mirrorDir(sc.dir) : sc.dir, sc.J, { body: sc.body, dur: sc.dur }); if (v) base.v = v; return { type: "G2", base }; }
let INJ_OPTS = {};
function trace(Jolt, spec, job, mirror, cfg) { const S = scenario(job, mirror), s = S.type === "G3" ? new G3Sim(Jolt, spec, S.def, { cfg, ...INJ_OPTS }) : new G2Sim(Jolt, spec, S.base, { cfg, ...INJ_OPTS }), ft = s.ctrl.feet, rows = []; let f0 = null, prevPc = null, trans = 0;
  while (s.tick()) { const fp = ft.map(f => [s.st[f].pos[0], s.st[f].pos[2]]); if (!f0) f0 = fp.map(p => p.slice()); const d = fp.map((p, n) => [p[0] - f0[n][0], p[1] - f0[n][1]]);
    const pc = s.probeRows ? s.probeRows.map(r => (r ? r.pieces.filter(p => p.touch).map(p => p.sub).join("") : "")).join("|") : ""; if (prevPc != null && pc !== prevPc) trans++; prevPc = pc;
    rows.push({ t: s.n * s.dt, d, trans }); if (s.g2acc.fallT != null && s.n * s.dt > s.g2acc.fallT + 0.5) break; }
  const g = S.type === "G3" ? s.g3summary() : s.g2summary(), out = { rows, cls: S.type === "G3" ? cls(g) : g.outcome, abortT: S.type === "G3" && s.ctrl.g3 ? s.ctrl.g3.aborted : null, fallT: s.g2acc.fallT, hash: s.h ? s.h.toString(16) : null };
  s.destroy(); return out; }
function injected(spec, inj) { if (!inj || inj === "none") return { spec, opts: {} };
  const S = JSON.parse(JSON.stringify(spec));   // diagnostic copy — the production spec is never modified
  if (inj === "strengthR95") for (const j of S.joints) if (j.side === "R") for (const k of ["x", "y", "z"]) { const c = j.capacity[k]; if (!c) continue; for (const dir of ["plus", "minus"]) { c[dir].Nm *= 0.95; c[dir].cap.Tiso *= 0.95; if (c[dir].cap.Tdyn) c[dir].cap.Tdyn *= 0.95; } }
  if (inj === "footMassR105") { const f = S.bodies.find(b => b.name === "foot_R"); f.mass *= 1.05; f.inertia = f.inertia.map(r => r.map(v => v * 1.05)); }
  if (inj === "regionR2mm") { const fR = S.bodies.findIndex(b => b.name === "foot_R"); return { spec: S, opts: { footRegion: (f) => { const r = usableRegion(bootSole(S.bodies[f]).pts, STAND.footInset); return f === fR ? r.map(([x, z]) => [x + 0.002, z]) : r; } } }; }
  return { spec: S, opts: {} }; }
function runJob(Jolt, job) { const inj = injected(generateSpec(VARIATION_SET.find(h => h.id === job.human)), job.inject), spec = inj.spec, self = job.kind === "G2self"; INJ_OPTS = inj.opts;
  const A = trace(Jolt, spec, job, false, {}), B = self ? A : trace(Jolt, spec, job, true, job.order && job.order !== "none" ? { mirrorOrder: job.order } : {});
  // mirrored displacement difference; self: foot L of the run vs the reflection of its foot R
  const n = Math.min(A.rows.length, B.rows.length), mir = (d) => [m2(d[1]), m2(d[0])], dif = [], slide = [];
  for (let i = 0; i < n; i++) { const a = A.rows[i].d, b = mir(B.rows[i].d); dif.push(Math.max(Math.hypot(a[0][0] - b[0][0], a[0][1] - b[0][1]), Math.hypot(a[1][0] - b[1][0], a[1][1] - b[1][1])));
    slide.push(Math.max(...A.rows[i].d.map(x => Math.hypot(...x)), ...B.rows[i].d.map(x => Math.hypot(...x)))); }
  const fell = A.fallT != null || B.fallT != null, abort = A.abortT != null && B.abortT != null ? Math.min(A.abortT, B.abortT) : null, fall = fell ? Math.min(A.fallT ?? 1e9, B.fallT ?? 1e9) : null, W = fell ? (abort ?? fall) : Infinity;
  let posMax = 0, slideMax = 0, onset = null, slideAll = 0; for (let i = 0; i < n; i++) { slideAll = Math.max(slideAll, slide[i]); if (A.rows[i].t > W + 1e-12) continue; posMax = Math.max(posMax, dif[i]); slideMax = Math.max(slideMax, slide[i]); if (onset == null && slide[i] > SLIDE) onset = A.rows[i].t; }
  const klass = fell ? "C" : onset != null ? "B" : "A";
  return { id: job.id, repeatOf: job.repeatOf ?? null, kind: job.kind, fam: job.fam, human: job.human, a: job.a || JSON.stringify(job.sc), pert: job.pert, u: job.u, order: job.order || null, inject: job.inject || null, klass,
    posDiffMm: posMax * 1000, slideMaxMm: slideMax * 1000, slideAllMm: slideAll * 1000, onsetS: onset, transA: A.rows[n - 1]?.trans ?? 0, transB: B.rows[n - 1]?.trans ?? 0,
    clsA: A.cls, clsB: B.cls, abortA: A.abortT, abortB: B.abortT, fallA: A.fallT, fallB: B.fallT, windowS: isFinite(W) ? W : null, lenA: A.rows.length, lenB: B.rows.length, hashA: A.hash, hashB: B.hash }; }
if (process.argv.includes("--worker")) { const Jolt = await loadJolt(VEND); process.on("message", (m) => { if (m === "exit") process.exit(0); try { process.send({ ok: true, out: runJob(Jolt, m) }); } catch (e) { process.send({ ok: false, err: String(e.stack || e), job: m }); } }); process.send({ ready: true }); }
else { let list = ATTR ? attrJobs() : SET === "heldout" ? heldoutJobs() : SET === "inject" ? injectJobs() : jobs(); const only = (process.argv.find(a => a.startsWith("--only=")) || "").slice(7); if (only) list = list.slice(0, +only);
  const outs = [], W = Math.max(2, Math.min(10, os.cpus().length - 1)), t0 = Date.now();
  await new Promise((resolve) => { let next = 0, live = 0; const spawn = () => { if (next >= list.length) { if (live === 0) resolve(); return; } live++; const cp = fork(fileURLToPath(import.meta.url), ["--worker", ...(ATTR ? ["--attribution"] : []), ...(SET ? [`--set=${SET}`] : [])], { stdio: ["ignore", "inherit", "inherit", "ipc"] }); let done = 0;
      const feed = () => { if (next >= list.length || done >= 10) { cp.send("exit"); live--; if (next < list.length) spawn(); else if (live === 0) resolve(); return; } cp.send(list[next++]); };
      cp.on("message", (m) => { if (m.ready) return feed(); outs.push(m.ok ? m.out : { ...m.job, error: m.err }); done++; process.stdout.write(`  ${outs.length}/${list.length}\r`); feed(); }); };
    for (let i = 0; i < W; i++) spawn(); });
  fs.writeFileSync(OUT, JSON.stringify({ generated: "tools/j2b_floor.mjs" + (ATTR ? " --attribution" : ""), date: new Date().toISOString().slice(0, 10), slideThresholdMm: SLIDE * 1000, perturbations: PERT, wallS: (Date.now() - t0) / 1000, jobs: outs }, null, 0));
  console.log(`\n${outs.length} jobs → ${path.relative(ROOT, OUT)} (${outs.filter(o => o.error).length} errors)`); }

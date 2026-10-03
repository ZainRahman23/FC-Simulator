// ═══ physchar2/tools/g3_run.js — V2-G3 FINAL VALIDATION RUN against the pre-registered g3/G3_CRITERIA.md v1 ═════════════════════════════════
// Every gate row's runs (T0 bilateral baseline, T1–T6 transfers, U unloading, T7 speed sweep, T8 perturbations during transfer (both stances —
// the mirror test T10 compares them), T9 body variants, T11 excessive requests, determinism ×3, snapshot / restore) plus the REPORT-ONLY
// diagnostics: mechanism ablations (what each G3 addition does in the final configuration), knee / hip / arm strategies, abort variants, the
// supervisor-off grid, leg-load gain scheduling, twist-DOF posture reference, transverse (yaw) stiffness, heel ↔ forefoot transfer (spec 3.2),
// perturbed starts (spec 3.5) and the G2-plant twist audit. Parallel recycled workers. Writes g3/json/g3_results.json; the checks
// (gates/v2_g3_checks.js) and tables (tools/g3_report_tables.mjs) read it.
// usage: node tools/g3_run.js [--only=group,...]
import fs from "fs"; import path from "path"; import os from "os"; import { fork } from "child_process"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js";
import { generateSpec } from "../spec/v2_spec.js";
import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def, mirrorDir } from "../gates/v2_g3.js";
import { G2Sim, pushScenario } from "../gates/v2_g2.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), OUT = path.join(ROOT, "review_artifacts/physical_character_v2/g3/json"), VEND = path.join(here, "../vendor/jolt-physics.wasm-compat.js");
const DIR8 = ["F", "B", "L", "R", "FL", "FR", "BL", "BR"], PUSH = [5, 10, 15, 20], SPEEDS = [4, 2, 1, 0.75, 0.5, 0.25];
// ── the job list ── (key = g3Def scenario key; stand / stance / sup = report-only overrides)
function jobs(only) { const J = [], add = (group, o) => { if (!only || only.includes(group)) J.push({ group, human: "V2-REF", ...o }); };
  for (const k of ["T0", "T1", "T2", "T3", "T4", "T5", "T6"]) add(k, { key: k });
  for (const st of ["R", "L"]) add("U", { key: `U:${st}` });
  for (const st of ["R", "L"]) for (const T of SPEEDS) add("T7", { key: `T7:${st}:${T}` });
  for (const when of ["hold", "ramp"]) for (const d of DIR8) for (const m of PUSH) { add("T8", { key: `T8:${when}:R:${d}:${m}` }); add("T8", { key: `T8:${when}:L:${mirrorDir(d)}:${m}`, mirrorOf: `T8:${when}:R:${d}:${m}` }); }
  for (const h of VARIATION_SET) add("T9", { key: `T9:${h.id}`, human: h.id });
  for (const h of VARIATION_SET) for (const st of ["R", "L"]) add("T9U", { key: `U:${st}`, human: h.id });   // criteria v2: swing-ready (≤ 2 % BW) on every body
  for (const k of ["T11:over:1.2", "T11:over:1.4", "T11:over:1.4:sup", "T11:fast:0.25", "T11:fast:0.1"]) add("T11", { key: k });
  for (const k of ["T3", "T5", "U:R", "T8:hold:R:R:10"]) for (let rep = 0; rep < 3; rep++) add("determinism", { key: k, rep });
  for (const [k, at] of [["U:R", 8], ["T8:hold:R:L:15", 3.9], ["T3", 10]]) add("snapshot", { key: k, at });
  // REPORT-ONLY diagnostics
  for (const [name, o] of [["no contactSupport", { contactSupport: false }], ["no holdUnloaded", { holdUnloaded: false }], ["no ikFeasible", { ikFeasible: false }], ["no dcmFF", { dcmFF: false }]])
    for (const k of ["T5", "U:R", "T3"]) add("ablation", { key: k, stand: o, eval: name });
  add("ablation", { key: "T5", stand: { contactSupport: false, holdUnloaded: false, ikFeasible: false, dcmFF: false }, eval: "G2 controller + λ target only" });
  for (const kf of [10, 15, 20]) { add("knee", { key: "T5", stance: { kneeFlexDeg: kf }, eval: `knee ${kf}°` }); for (const p of ["R:10", "F:20", "B:20", "L:25"]) add("knee", { key: `T8:hold:R:${p}`, stance: { kneeFlexDeg: kf }, eval: `knee ${kf}°` }); }
  for (const [name, o] of [["hip bounded 10°", { hip: true }], ["hip unbounded", { hip: true, hipMaxDeg: 1e9 }], ["arm counter-motion", { arms: true }]]) for (const p of ["R:10", "R:15", "FR:15", "BR:15", "F:20", "B:20"]) add("strategy", { key: `T8:hold:R:${p}`, stand: o, eval: name });
  for (const p of ["L:15", "L:20", "FL:15", "FL:20", "BL:20"]) { add("abort", { key: `T8:hold:R:${p}`, sup: { abortFF: true }, eval: "abort with planned feed-forward" }); add("abort", { key: `T8:hold:R:${p}`, sup: { abortDur: 0 }, eval: "abort as immediate target switch" }); }
  for (const d of DIR8) for (const m of PUSH) add("nosup", { key: `T8:hold:R:${d}:${m}:nosup`, eval: "no supervisor" });
  for (const k of ["T3", "T7:R:2", "T8:hold:R:R:10", "T8:hold:R:F:15"]) add("gainSched", { key: k, stand: { gainSched: true }, eval: "load-scheduled leg gains" });
  for (const k of ["T3", "T7:R:2"]) add("ikRefTwist", { key: k, stand: { ikRefTwist: true }, eval: "twist DOFs at reference" });
  for (const lt of [0.5, 0.95]) for (const tq of [1, 2, 4]) { add("yaw", { key: `Y:${lt}:${tq}` }); add("yaw", { key: `Y:${lt}:${tq}`, stand: { ikRefTwist: true }, eval: "twist DOFs at reference" }); }
  add("FA", { key: "FA" }); for (let sd = 1; sd <= 10; sd++) add("PS", { key: `PS:${sd}` });
  for (const sc of ["quiet", "R:10", "R:20", "F:15", "L:15"]) add("G2plant", { key: "G2:" + sc });
  // boundary cases for the mechanism-removal diagnostics (D6): light-foot disturbances, pushes while the opposite foot is unloaded, contact-losing requests
  for (const k of ["T8:hold:R:R:12.5", "T8:hold:R:FR:12.5", "T8:ramp:R:R:12.5", ...["R", "L", "F", "B", "FR", "BL"].flatMap(d => [5, 10].map(m => `UP:R:${d}:${m}`)), "UP:L:L:10", "UP:L:R:10"]) add("boundary", { key: k });
  return J; }
// per-tick extras the summary does not carry: per-foot CoP jump per tick (seam smoothness), heel ↔ forefoot CoP range on the stance foot, peak
// load-rate, other-foot vertical force range during the hold, ankle fabd twist trace extrema
const XSTAND = JSON.parse((process.argv.find(a => a.startsWith("--stand=")) || "--stand={}").slice(8)), TAG = (process.argv.find(a => a.startsWith("--tag=")) || "").slice(6);   // D6 diagnostic configurations
function runJob(Jolt, job) {
  if (job.key.startsWith("G2:")) return runG2(Jolt, job);
  const def = g3Def(job.key); if (job.sup && def.supervise) def.supervise = { ...def.supervise, ...job.sup }; if (job.xstand) job.stand = { ...(job.stand || {}), ...job.xstand };
  const spec = generateSpec(VARIATION_SET.find(h => h.id === (def.human || job.human))), s = new G3Sim(Jolt, spec, def, { stand: { timeIK: true, ...(job.stand || {}) }, stance: job.stance || undefined }), t0 = Date.now();
  if (job.group === "snapshot") { const nAt = Math.round(job.at / s.dt); while (s.n < nAt) s.tick(); const snap = s.snapshot(); while (s.tick()) {} const hA = s.h.toString(16); s.restore(snap); while (s.tick()) {} const hB = s.h.toString(16); s.destroy(); return { ...job, res: { hashA: hA, hashB: hB, same: hA === hB } }; }
  let prevCop = [null, null], copJump = [0, 0], apRange = [1e9, -1e9], dLoadMax = 0, prevLoad = null;
  while (s.tick()) { const r = s.g3.last, t = r.t, pr = s.probeRows, W = s.ctrl.M * 9.81;
    if (t >= 0.5) pr.forEach((x, n) => { if (x.cop && r.Fz[n] > 0.05 * W) { if (prevCop[n]) copJump[n] = Math.max(copJump[n], Math.hypot(x.cop[0] - prevCop[n][0], x.cop[2] - prevCop[n][1])); prevCop[n] = [x.cop[0], x.cop[2]]; } else prevCop[n] = null; });
    if (prevLoad != null && t >= 1) dLoadMax = Math.max(dLoadMax, Math.abs(r.load[1] - prevLoad) / s.dt); prevLoad = r.load[1];
    if (job.key === "FA" && t > 5.5 && t < 19 && pr[1].cop) { const st = s.st[s.ctrl.feet[1]], q = st.rot, fw = [2 * (q[0] * q[2] + q[3] * q[1]), 1 - 2 * (q[0] * q[0] + q[1] * q[1])], ap = (pr[1].cop[0] - st.pos[0]) * fw[0] + (pr[1].cop[2] - st.pos[2]) * fw[1]; apRange = [Math.min(apRange[0], ap), Math.max(apRange[1], ap)]; }
    if (s.g2acc.fallT != null && t > s.g2acc.fallT + 0.5) break; }
  const res = s.g3summary(); res.extra = { copJumpMaxMm: copJump.map(x => x * 1000), loadRateMaxPerS: dLoadMax, faCopApCm: job.key === "FA" ? apRange.map(x => x * 100) : null, M: s.ctrl.M, sup: def.supervise || null };
  res.wallS = (Date.now() - t0) / 1000; s.destroy(); return { ...job, title: def.title, res };
}
// the accepted G2 controller, bilateral: the leg-twist excursions of its push responses (does the twist mode predate G3?)
function runG2(Jolt, job) { const sc = job.key.slice(3), spec = generateSpec(VARIATION_SET.find(h => h.id === "V2-REF")), base = sc === "quiet" ? { title: "Quiet stance (10 s)", seconds: 10 } : pushScenario(sc.split(":")[0], +sc.split(":")[1]);
  const s = new G2Sim(Jolt, spec, base, {}), tw = [["ankle_L", "fabd"], ["ankle_R", "fabd"], ["knee_L", "rot"], ["knee_R", "rot"], ["hip_L", "rot"], ["hip_R", "rot"]].map(([n, key]) => ({ k: spec.joints.findIndex(j => j.name === n), key }));
  const pel = spec.bodies.findIndex(b => b.name === "pelvis"), yawOf = (q) => Math.atan2(2 * (q[0] * q[2] + q[3] * q[1]), 1 - 2 * (q[0] * q[0] + q[1] * q[1])) * 180 / Math.PI; let v0 = null, mx = tw.map(() => 0), y0 = null, yMx = 0;
  while (s.tick()) { const t = s.n * s.dt, v = tw.map(x => s.P.anat(s.P.jd[x.k], s.up.ev.qs[x.k], x.key)); if (t >= 0.9 && !v0) { v0 = v; y0 = yawOf(s.st[pel].rot); } if (v0) { v.forEach((x, i) => { mx[i] = Math.max(mx[i], Math.abs(x - v0[i])); }); yMx = Math.max(yMx, Math.abs(yawOf(s.st[pel].rot) - y0)); } }
  const g = s.g2summary(); s.destroy(); return { ...job, title: "G2 controller: " + base.title, res: { outcome: g.outcome, hash: g.hash, pelvisYawMaxDeg: yMx, twistMaxDeg: { ankleFabd: [mx[0], mx[1]], kneeRot: [mx[2], mx[3]], hipRot: [mx[4], mx[5]] } } }; }
// ── main / workers ──
if (process.argv.includes("--worker")) { const Jolt = await loadJolt(VEND); process.on("message", (m) => { if (m === "exit") process.exit(0); try { process.send({ ok: true, out: runJob(Jolt, m) }); } catch (e) { process.send({ ok: false, err: String(e.stack || e), job: m }); } }); process.send({ ready: true }); }
else {
  const only = (process.argv.find(a => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean), list = jobs(only.length ? only : null).map(j => (Object.keys(XSTAND).length ? { ...j, xstand: XSTAND } : j)), t0 = Date.now(), outs = [], W = Math.max(2, Math.min(10, os.cpus().length - 1));
  console.log(`G3 final run: ${list.length} jobs on ${W} workers`); fs.mkdirSync(OUT, { recursive: true });
  await new Promise((resolve) => { let next = 0, live = 0;
    const spawn = () => { if (next >= list.length) { if (live === 0) resolve(); return; } live++; const cp = fork(fileURLToPath(import.meta.url), ["--worker"], { stdio: ["ignore", "inherit", "inherit", "ipc"] }); let done = 0;
      const feed = () => { if (next >= list.length || done >= 12) { cp.send("exit"); live--; if (next < list.length) spawn(); else if (live === 0) resolve(); return; } cp.send(list[next++]); };
      cp.on("message", (m) => { if (m.ready) return feed(); if (m.ok) outs.push(m.out); else { console.error("FAILED", JSON.stringify(m.job), m.err); outs.push({ ...m.job, error: m.err }); } done++; process.stdout.write(`  ${outs.length}/${list.length}\r`); feed(); }); };
    for (let i = 0; i < W; i++) spawn(); });
  const file = path.join(OUT, TAG ? `g3_results_${TAG}.json` : only.length ? `g3_results_${only.join("_")}.json` : "g3_results.json");
  fs.writeFileSync(file, JSON.stringify({ generated: "tools/g3_run.js", criteria: "g3/G3_CRITERIA.md v1", xstand: XSTAND, tag: TAG || null, date: new Date().toISOString().slice(0, 10), wallS: (Date.now() - t0) / 1000, jobs: outs }, null, 0));
  console.log(`\n${outs.length} jobs in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${path.relative(ROOT, file)} (${outs.filter(o => o.error).length} errors)`);
}

// ═══ physchar2/tools/g2_run.js — V2-G2 FINAL VALIDATION RUN against the pre-registered g2/G2_CRITERIA.md v1 ═════════════════════════════════
// Every gate row's runs (S0 quiet stance, the push grid S1–S3 / S7 for every body, S4 angular, S5 offsets, the CoP sweep test, determinism ×3,
// snapshot / restore) plus the REPORT-ONLY evaluations (hip / arm strategies, kξ alternatives, sensing latency / motor noise, pelvis-level
// 50 ms pushes for V1 comparability). Parallel workers (recycled: the WASM heap grows per world). Writes g2/json/g2_results.json; the checks
// (gates/v2_g2_checks.js) and tables (tools/g2_report_tables.mjs) read it.
// usage: node tools/g2_run.js [--only=group,...]
import fs from "fs"; import path from "path"; import os from "os"; import { fork } from "child_process"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js";
import { generateSpec } from "../spec/v2_spec.js";
import { VARIATION_SET } from "../spec/v2_human.js";
import { G2Sim, pushScenario, torqueScenario, offsetScenario, DIRS } from "../gates/v2_g2.js";
import { polyDist } from "../ctrl/v2_stand.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), OUT = path.join(ROOT, "review_artifacts/physical_character_v2/g2/json"), VEND = path.join(here, "../vendor/jolt-physics.wasm-compat.js");
const DIR8 = Object.keys(DIRS), DIR4 = ["F", "B", "L", "R"], GRID = [5, 10, 15, 20, 25, 30, 35, 40, 45], BIG = ["V2-REF", "V1-matched"];
export const OFFSETS = { "knees 12°": { stance: { kneeFlexDeg: 12 } }, "hips 10°": { stance: { hipFlexDeg: 10 } }, "COM over ankles": { stance: { comAheadOfAnklesM: 0.0 } }, "COM 7 cm ahead": { stance: { comAheadOfAnklesM: 0.07 } },
  "trunk 10° flexed": { stance: { lumbar: { flex: 10 } } }, "arms 30° abducted": { stance: { shoulderAbdDeg: 30 } }, "head 20° flexed": { stance: { neck: { flex: 20 } } },
  "COM 5 cm/s forward": { v: [0, 0, 0.05] }, "COM 5 cm/s right": { v: [0.05, 0, 0] }, "COM 5 cm/s back-left": { v: [-0.035, 0, -0.035] } };
const EVALS = { "hip continuous": { hip: true, hipMaxDeg: 1e9 }, "hip bounded 10°": { hip: true }, "arm counter-motion": { arms: true }, "kXi 1": { kXi: 1 }, "kXi 0.5": { kXi: 0.5 } };
const SENS = { "noiseless": {}, "latency 50 ms": { delay: 0.05 }, "latency 100 ms": { delay: 0.1 }, "latency 150 ms": { delay: 0.15 }, "motor noise sd 1 N·m": { noise: { seed: 7, sd: 1, tau: 0.5 } }, "motor noise sd 3 N·m": { noise: { seed: 7, sd: 3, tau: 0.5 } } };
// ── the job list ──
function jobs(only) { const J = [], add = (group, o) => { if (!only || only.includes(group)) J.push({ group, ...o }); };
  for (const h of VARIATION_SET) add("S0", { human: h.id, sc: { kind: "quiet", seconds: 60 } });
  for (const h of VARIATION_SET) for (const d of BIG.includes(h.id) ? DIR8 : DIR4) for (const m of GRID) add("push", { human: h.id, sc: { kind: "push", dir: d, J: m } });
  for (const h of VARIATION_SET) if (!BIG.includes(h.id)) for (const d of ["FL", "FR", "BL", "BR"]) add("push", { human: h.id, sc: { kind: "push", dir: d, J: 10 } });   // 2.2a diagonals at 10 N·s for every body
  for (const ax of ["yaw", "pitch", "roll"]) for (const H of [4, 8, 12, 16]) add("S4", { human: "V2-REF", sc: { kind: "torque", axis: ax, H } });
  for (const n of Object.keys(OFFSETS)) add("S5", { human: "V2-REF", sc: { kind: "offset", name: n } });
  for (const [d, len] of [["F", 0.09], ["B", 0.085], ["R", 0.12], ["L", 0.12], ["FR", 0.09], ["BL", 0.09]]) add("copSweep", { human: "V2-REF", sc: { kind: "ramp", dir: d, len } });
  const CUR = [{ kind: "quiet", seconds: 10 }, { kind: "push", dir: "F", J: 15 }, { kind: "push", dir: "R", J: 15 }, { kind: "push", dir: "BL", J: 10 }, { kind: "torque", axis: "pitch", H: 8 }, { kind: "offset", name: "COM over ankles" }];
  for (const sc of CUR) for (let rep = 0; rep < 3; rep++) add("determinism", { human: "V2-REF", sc, rep });
  for (const sc of [CUR[1], CUR[3], CUR[4]]) add("snapshot", { human: "V2-REF", sc });
  for (const [name, o] of Object.entries(EVALS)) for (const d of ["F", "B", "R", "FR", "BL"]) for (const m of [10, 15, 20, 25, 30]) add("eval", { human: "V2-REF", sc: { kind: "push", dir: d, J: m }, stand: o, eval: name });
  for (const [name, o] of Object.entries(SENS)) add("sensing", { human: "V2-REF", sc: { kind: "quiet", seconds: 30 }, stand: o, eval: name });
  for (const [name, o] of Object.entries(SENS)) if (/latency/.test(name)) for (const d of ["F", "R"]) for (const m of [10, 15]) add("sensing", { human: "V2-REF", sc: { kind: "push", dir: d, J: m }, stand: o, eval: name });
  for (const d of DIR4) for (const m of GRID) add("pelvis50", { human: "V2-REF", sc: { kind: "push", dir: d, J: m, body: "pelvis", dur: 0.05 } });
  return J; }
function scenarioOf(sc) {
  if (sc.kind === "quiet") return { title: `Quiet stance (${sc.seconds} s)`, seconds: sc.seconds };
  if (sc.kind === "push") return pushScenario(sc.dir, sc.J, { body: sc.body, dur: sc.dur });
  if (sc.kind === "torque") return torqueScenario(sc.axis, sc.H);
  if (sc.kind === "offset") return offsetScenario(sc.name, OFFSETS[sc.name]);
  if (sc.kind === "ramp") { const u = DIRS[sc.dir], T = sc.len / 0.01; return { title: `CoP sweep ${sc.dir}`, seconds: 1 + 2 * T + 1, ramp: { u, len: sc.len, T } }; }
}
// DIAGNOSTIC controller options for every job (env V2_XSTAND=<json>, inherited by the workers; e.g. {"ikRefTwist":true}); never a gate
// configuration — the output then goes to g2_results_xstand.json so the gate result is never overwritten
const XSTAND = JSON.parse(process.env.V2_XSTAND || "{}");
function runJob(Jolt, job) {
  const spec = generateSpec(VARIATION_SET.find(h => h.id === job.human)), base = scenarioOf(job.sc), stand = { ...XSTAND, ...(job.stand || {}) };   // XSTAND: diagnostic only
  if (base.ramp) { const { u, len, T } = base.ramp; stand.refOffset = (t) => { const k = t < 1 ? 0 : t < 1 + T ? (t - 1) * 0.01 : Math.max(0, len - (t - 1 - T) * 0.01); return [u[0] * k, u[1] * k]; }; }
  const s = new G2Sim(Jolt, spec, base, { stand }); const t0 = Date.now();
  if (job.group === "snapshot") { for (let i = 0; i < 300; i++) s.tick(); const snap = s.snapshot(); for (let i = 0; i < 600; i++) s.tick(); const hA = s.h.toString(16); s.restore(snap); for (let i = 0; i < 600; i++) s.tick(); const hB = s.h.toString(16); s.w.freeState(snap.jolt); s.destroy(); return { ...job, hashA: hA, hashB: hB, exact: hA === hB }; }
  // per-tick extras: ramp smoothness; knee range; COM-ahead mean; scheduled impulse
  let prev = null, jump = 0, err = 0, nIn = 0, trans = 0, prevPcs = null, jumpFoot = 0, prevFoot = null, kneeMin = 1e9, kneeMax = -1e9, aheadSum = 0, aheadN = 0, comX = [1e9, -1e9], comZ = [1e9, -1e9], sat1 = 0, peakIso = {};
  const kn = ["knee_L", "knee_R"].map(n => spec.joints.findIndex(j => j.name === n)), Mtot = spec.bodies.reduce((a, b) => a + b.mass, 0);
  while (s.tick()) { const r = s.lastRow, I = s.ctrl.info, t = r.t;
    for (const k of kn) { const a = s.P.anat(s.P.jd[k], s.up.ev.qs[k], "flex"); kneeMin = Math.min(kneeMin, a); kneeMax = Math.max(kneeMax, a); }
    if (job.sc.kind === "quiet" && t >= 2) { const hd = I.heading; aheadSum += (I.c[0] - I.mid[0]) * hd[0] + (I.c[2] - I.mid[1]) * hd[1]; aheadN++; comX = [Math.min(comX[0], I.c[0]), Math.max(comX[1], I.c[0])]; comZ = [Math.min(comZ[0], I.c[2]), Math.max(comZ[1], I.c[2])]; }
    if (job.sc.kind === "quiet" && t >= 1) { for (const x of s.actRes) { if (x.sat) sat1++; const ax = s.act.ax[x.k][x.i], iso = (x.tau >= 0 ? ax.plus : ax.minus).Nm, key = spec.joints[x.k].name + "." + "xyz"[x.i]; peakIso[key] = Math.max(peakIso[key] || 0, Math.abs(x.tau) / iso); } }
    if (base.ramp && t >= 1) { const pr = s.probeRows, pcs =   // the SWEEP window: the target ramps start at t = 1 s (the release / settle transient before it is not part of the test)
       pr.map(x => x.pieces.filter(p => p.touch).map(p => p.sub).join("")).join("|"); if (prevPcs && pcs !== prevPcs) trans++; prevPcs = pcs;
      const inside = polyDist(I.support, r.pCmd) > 0.01; if (r.cop && prev && inside) { jump = Math.max(jump, Math.hypot(r.cop[0] - prev[0], r.cop[1] - prev[1])); err = Math.max(err, Math.hypot(r.cop[0] - r.pCmd[0], r.cop[1] - r.pCmd[1])); nIn++; }
      const fc = pr.map(x => (x.cop ? [x.cop[0], x.cop[2], x.JyN] : null)); if (prevFoot && inside) fc.forEach((c, k) => { if (c && prevFoot[k] && c[2] > 100 && prevFoot[k][2] > 100) jumpFoot = Math.max(jumpFoot, Math.hypot(c[0] - prevFoot[k][0], c[1] - prevFoot[k][1])); }); prevFoot = fc; prev = r.cop; }
    if (s.g2acc.fallT != null && t > s.g2acc.fallT + 0.5) break; }
  const res = s.g2summary(); const sched = base.push ? base.push.J : [0, 0, 0], schedH = base.torque ? base.torque.H : [0, 0, 0];
  res.sched = { J: sched, H: schedH }; res.extra = { kneeMinDeg: kneeMin, kneeMaxDeg: kneeMax, comAheadMeanCm: aheadN ? aheadSum / aheadN * 100 : null, comRangeMm: aheadN ? Math.hypot(comX[1] - comX[0], comZ[1] - comZ[0]) * 1000 : null,
    satTicksAfter1s: sat1, peakIsoFrac: Object.entries(peakIso).sort((a, b) => b[1] - a[1]).slice(0, 8), M: Mtot,
    ramp: base.ramp ? { transitions: trans, maxNetJumpMm: jump * 1000, maxFootJumpMm: jumpFoot * 1000, maxTrackErrMm: err * 1000, ticksInside: nIn } : null };
  res.wallS = (Date.now() - t0) / 1000; s.destroy();
  return { ...job, res };
}
// ── main / workers ──
if (process.argv.includes("--worker")) { const Jolt = await loadJolt(VEND); process.on("message", (m) => { if (m === "exit") process.exit(0); try { process.send({ ok: true, out: runJob(Jolt, m) }); } catch (e) { process.send({ ok: false, err: String(e.stack || e), job: m }); } }); process.send({ ready: true }); }
else {
  const only = (process.argv.find(a => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean), list = jobs(only.length ? only : null), t0 = Date.now(), outs = [], W = Math.max(2, Math.min(10, os.cpus().length - 1));
  console.log(`G2 final run: ${list.length} jobs on ${W} workers`); fs.mkdirSync(OUT, { recursive: true });
  await new Promise((resolve) => { let next = 0, live = 0;
    const spawn = () => { if (next >= list.length) { if (live === 0) resolve(); return; } live++; const cp = fork(fileURLToPath(import.meta.url), ["--worker"], { stdio: ["ignore", "inherit", "inherit", "ipc"] }); let done = 0;
      const feed = () => { if (next >= list.length || done >= 12) { cp.send("exit"); live--; if (next < list.length) spawn(); else if (live === 0) resolve(); return; } cp.send(list[next++]); };
      cp.on("message", (m) => { if (m.ready) return feed(); if (m.ok) outs.push(m.out); else { console.error("FAILED", JSON.stringify(m.job), m.err); outs.push({ ...m.job, error: m.err }); } done++; process.stdout.write(`  ${outs.length}/${list.length}\r`); feed(); }); };
    for (let i = 0; i < W; i++) spawn(); });
  const file = path.join(OUT, Object.keys(XSTAND).length ? "g2_results_xstand.json" : only.length ? `g2_results_${only.join("_")}.json` : "g2_results.json");
  fs.writeFileSync(file, JSON.stringify({ generated: "tools/g2_run.js", criteria: "g2/G2_CRITERIA.md v1", date: new Date().toISOString().slice(0, 10), wallS: (Date.now() - t0) / 1000, xstand: XSTAND, jobs: outs }, null, 0));
  console.log(`\n${outs.length} jobs in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${path.relative(ROOT, file)} (${outs.filter(o => o.error).length} errors)`);
}

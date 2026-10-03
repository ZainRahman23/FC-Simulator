// ═══ physchar2/tools/g1_run.js — V2-G1 runner (Node). usage: node tools/g1_run.js [--workers 8] [--no-dx] [--no-cand] [--no-v1]
// Phases: 1.5 iteration study (report; decision C1 fixes the validation baseline at 60) → main suite at the baseline (V2-REF + V1-matched)
// → body variants → determinism (×3, two processes) + snapshot / restore → timestep sensitivity → passive joint rig + couplings → C7
// high-speed envelope → C6 free-body momentum floor → diagnostics (not adopted) → decision candidate package on every body (not adopted; its
// own measured engine-stop margins) → performance (alone, after the workers exit) → V1 Gate A comparison. Exit 0 only if every gate check passes.
import fs from "fs"; import path from "path"; import os from "os"; import crypto from "crypto"; import { fork, execSync } from "child_process"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js";
import { generateSpec } from "../spec/v2_spec.js";
import { VARIATION_SET, V2_REF, V1_MATCHED } from "../spec/v2_human.js";
import { SCENARIOS, SCENARIO_ORDER, HS_ORDER, ESSENTIAL, ITERATION_SET, RATE_SET, RATE_KEYS, RATE_EPS, ensembleKey, ensureScenario, G1_WORLD, runScenario } from "../gates/v2_g1.js";
import { RIG_TESTS, DAMP_TESTS, passiveRig, couplingProbe, snapshotRestore, perfBreakdown, freeBodyFloor } from "../gates/v2_g1_tests.js";
import { TOL, scenarioChecks, rigChecks, hsChecks } from "../gates/v2_g1_checks.js";
import { DX_CONFIGS, applyMods } from "../gates/v2_g1_dx.js";
import { engineLimits } from "../spec/v2_joints.js";

const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), VEND = path.join(here, "../vendor/jolt-physics.wasm-compat.js");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const CAND_MARGINS = path.join(ROOT, "review_artifacts/physical_character_v2/g1/json/g1_margins_candidate.json");
const CAND = { id: "CAND", label: "decision candidate: 10-piece boot (AP 5 × ML 2 grid, identical external geometry) + 150 velocity iterations, engine-stop margins re-measured for it (C2 procedure)", cfg: { velSteps: 150 }, mods: ["bootGridAP5xML2"], margins: "candidate" };
const specCache = new Map(); const specFor = (id, mods, margins) => { const k = id + "|" + (mods || []).join(",") + "|" + (margins || ""); if (!specCache.has(k)) { const h = VARIATION_SET.find(x => x.id === id); const sp = applyMods(generateSpec(h), mods);
  if (margins === "candidate") { const T = JSON.parse(fs.readFileSync(CAND_MARGINS, "utf8")).table; for (const j of sp.joints) j.limits.engine = engineLimits(j, T); }
  specCache.set(k, sp); } return specCache.get(k); };
const slim = (r) => { const o = { ...r }; o.joints = { ...r.joints, axes: r.joints.axes }; return o; };
// ── worker ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function worker() {
  const J = await loadJolt(VEND);
  process.on("message", (job) => { if (job === "exit") process.exit(0); let r;
    try {
      if (job.kind === "scen") r = slim(runScenario(J, specFor(job.human, job.mods, job.margins), job.key, { cfg: job.cfg }));
      else if (job.kind === "repeat") r = [0, 1].map(() => { const x = runScenario(J, specFor(job.human), job.key, { cfg: job.cfg }); return { hash: x.hash, hashAt: x.hashAt, seq: x.contacts.sequence, ext: x.joints.axes.map(a => [a.thMin, a.thMax]), fall: x.outcome.firstNonFootT }; });
      else if (job.kind === "rig") { const x = passiveRig(J, specFor("V2-REF"), job.test, { cfg: job.cfg }); r = { ...x, rows: x.rows.filter((q, i) => i % 4 === 0) }; }
      else if (job.kind === "snap") r = snapshotRestore(J, specFor(job.human), job.key, { cfg: job.cfg });
      else if (job.kind === "coupling") r = couplingProbe(J, specFor("V2-REF"));
      process.send({ id: job.id, r, pid: process.pid });
    } catch (e) { process.send({ id: job.id, err: String(e && e.stack || e), pid: process.pid }); } });
  process.send({ ready: true });
}
// ── pool ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function pool(jobs, nW) {
  const out = new Map(), queue = jobs.slice(), workers = []; let done = 0;
  await new Promise((resolve) => {
    // workers are RECYCLED every 12 jobs: each run builds its own Jolt world and the WASM heap does not return all of it (the first D1a / D2a
    // run lost 9 jobs to "Aborted(OOM)" in long-lived workers)
    const spawn = () => { let n = 0; const cp = fork(fileURLToPath(import.meta.url), ["--worker"], { stdio: ["ignore", "inherit", "inherit", "ipc"] }); workers.push(cp);
      const next = () => { if (n >= 12 && queue.length) { cp.send("exit"); spawn(); return; } const j = queue.shift(); if (j) { n++; cp.send(j); } else cp.send("exit"); };
      cp.on("message", (m) => { if (m.ready) return next(); out.set(m.id, m); done++; if (done % 25 === 0 || done === jobs.length) process.stdout.write(`  ${done}/${jobs.length} jobs\r`); if (done === jobs.length) resolve(); next(); }); };
    for (let w = 0; w < nW; w++) spawn();
  });
  process.stdout.write("\n"); return out;
}
// ── main ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now(), nW = +arg("--workers", Math.max(2, Math.min(8, os.cpus().length - 2))), doDX = !arg("--no-dx", false), doV1 = !arg("--no-v1", false);
  const sha = crypto.createHash("sha256").update(fs.readFileSync(VEND)).digest("hex"), OUT = path.join(ROOT, "review_artifacts/physical_character_v2/g1/json"); fs.mkdirSync(OUT, { recursive: true });
  let id = 0; const J = (o) => ({ id: id++, ...o });
  console.log(`V2-G1 passive physics — ${nW} workers, Node ${process.version}, Jolt sha ${sha.slice(0, 12)}`);
  // 1. iteration study (spec 1.5) on V2-REF
  console.log("1.5 iteration study …"); const itJobs = ITERATION_SET.flatMap(v => SCENARIO_ORDER.map(k => J({ kind: "scen", human: "V2-REF", key: k, cfg: { velSteps: v }, tag: "it" + v }))); const itRes = await pool(itJobs, nW);
  const study = ITERATION_SET.map(v => { const rows = itJobs.filter(j => j.cfg.velSteps === v).map(j => { const r = itRes.get(j.id).r, cs = scenarioChecks(r, SCENARIOS[j.key]).filter(c => /^1\.[234]/.test(c.id) && !c.reportOnly);
      const margin = cs.every(c => c.pass && marginOk(c)); return { key: j.key, pass: cs.every(c => c.pass), margin2x: margin, failing: cs.filter(c => !c.pass).map(c => c.id), ms: r.cpu.stepMs + r.cpu.passiveMs }; });
    return { velSteps: v, allPass: rows.every(x => x.pass), allMargin: rows.every(x => x.margin2x), nPass: rows.filter(x => x.pass).length, n: rows.length, stepMs: avg(rows.map(x => x.ms)), rows }; });
  // decision D2a (superseding C1's 60): the validation baseline is 150 velocity iterations (G1_WORLD); the spec 1.5 selection is reported
  const sel = study.filter(s => s.velSteps <= 30).find(s => s.allMargin), REFCFG = { velSteps: G1_WORLD.velSteps };
  console.log("  " + study.map(s => `${s.velSteps} it: ${s.nPass}/${s.n} scenarios pass${s.allMargin ? " (2× margin)" : ""}, ${s.stepMs.toFixed(3)} ms/tick`).join(" · ") + ` → baseline ${REFCFG.velSteps} iterations (C1)${sel ? "" : " (none of 10/15/20/30 passes with 2× margin)"}`);
  // 2.–7. everything else at the reference configuration
  console.log("main suite, variants, determinism, timestep, rig, diagnostics …");
  const main = ["V2-REF", "V1-matched"].flatMap(h => SCENARIO_ORDER.map(k => J({ kind: "scen", human: h, key: k, cfg: REFCFG, tag: "main" })));
  const VARS = ["V2-165-62", "V2-198-92", "V2-long-legs", "V2-short-legs"], vars = VARS.flatMap(h => ESSENTIAL.map(k => J({ kind: "scen", human: h, key: k, cfg: REFCFG, tag: "var" })));
  const reps = SCENARIO_ORDER.map(k => J({ kind: "repeat", human: "V2-REF", key: k, cfg: REFCFG, tag: "rep" })), snaps = ["upright", "awkward", "drop1m", "isoSelfCol"].map(k => J({ kind: "snap", human: "V2-REF", key: k, cfg: REFCFG, tag: "snap" }));
  // D4a: the timestep study runs ENSEMBLES (nominal + ±1 µm / ±10 µm initial lift) of each rate scenario at every rate
  const rates = RATE_SET.flatMap(hz => RATE_KEYS.flatMap(k => RATE_EPS.map(e => J({ kind: "scen", human: "V2-REF", key: ensembleKey(k, e), base: k, eps: e, cfg: { ...REFCFG, hz }, tag: "rate" }))));
  const rigs = [...RIG_TESTS, ...DAMP_TESTS].map(t => J({ kind: "rig", test: t, cfg: REFCFG, tag: "rig" })), coup = [J({ kind: "coupling", tag: "coupling" })];
  const hs = HS_ORDER.map(k => J({ kind: "scen", human: "V2-REF", key: k, cfg: REFCFG, tag: "hs" }));
  const doCand = !!arg("--cand", false) && fs.existsSync(CAND_MARGINS);   // the D1/D2 candidate was ADOPTED (D1a + D2a); phase kept for history (--cand)
  const cand = doCand ? [...["V2-REF", "V1-matched"].flatMap(h => SCENARIO_ORDER.map(k => J({ kind: "scen", human: h, key: k, cfg: { ...REFCFG, ...CAND.cfg }, mods: CAND.mods, margins: CAND.margins, tag: "cand" }))),
    ...VARS.flatMap(h => ESSENTIAL.map(k => J({ kind: "scen", human: h, key: k, cfg: { ...REFCFG, ...CAND.cfg }, mods: CAND.mods, margins: CAND.margins, tag: "cand" }))),
    ...HS_ORDER.map(k => J({ kind: "scen", human: "V2-REF", key: k, cfg: { ...REFCFG, ...CAND.cfg }, mods: CAND.mods, margins: CAND.margins, tag: "candhs" }))] : [];
  const dxKeys = SCENARIO_ORDER.filter(k => SCENARIOS[k].group !== "isolated"), dx = doDX ? DX_CONFIGS.flatMap(d => dxKeys.map(k => J({ kind: "scen", human: "V2-REF", key: k, cfg: { ...REFCFG, ...d.cfg }, mods: d.mods, tag: "dx", dx: d.id }))) : [];
  const all = [...main, ...vars, ...reps, ...snaps, ...rates, ...rigs, ...coup, ...hs, ...dx, ...cand], res = await pool(all, nW), R = (j) => { const m = res.get(j.id); if (m.err) throw new Error(`${j.kind} ${j.key || ""}: ${m.err}`); return m.r; };
  // ── assemble ──
  const runs = [...main, ...vars].map(j => { const r = R(j); return { ...r, checks: scenarioChecks(r, SCENARIOS[j.key]) }; });
  const det = reps.map(j => { const rr = R(j), m = runs.find(r => r.human === "V2-REF" && r.key === j.key), a = { hash: m.hash, hashAt: m.hashAt, seq: m.contacts.sequence, ext: m.joints.axes.map(x => [x.thMin, x.thMax]), fall: m.outcome.firstNonFootT };
    const same = (x, y) => JSON.stringify(x) === JSON.stringify(y); return { key: j.key, hashes: [a.hash, rr[0].hash, rr[1].hash], pass: same(a, rr[0]) && same(rr[0], rr[1]), sameHashAt: same(a.hashAt, rr[0].hashAt), sameSeq: same(a.seq, rr[0].seq) && same(rr[0].seq, rr[1].seq), sameExt: same(a.ext, rr[1].ext), sameFall: a.fall === rr[0].fall && rr[0].fall === rr[1].fall, procs: [res.get(main.find(x => x.human === "V2-REF" && x.key === j.key).id).pid, res.get(j.id).pid] }; });
  const snapRes = snaps.map(R);
  const rateRuns = rates.map(j => { const r = R(j); return { ...r, base: j.base, eps: j.eps, checks: scenarioChecks(r, ensureScenario(j.key)) }; });
  // D4a evaluation. INVARIANTS (gate, every member at every rate): integrity + contact-free energy + free fall (+ momentum on isoMomentum).
  // DISTRIBUTIONS vs the 720 Hz ensemble: a GENUINE rate effect = posture sets disjoint, or |Δ median| > max(tolerance, same-rate spread)
  // (timing: 25 ms, range of first non-foot contact times; final COM: 0.15 m, largest pairwise distance within an ensemble). Gate: no
  // genuine effect at the 240 Hz validation rate; effects at 180 / 360 Hz are REPORTED (preserved, not averaged away).
  // v3 (pre-registered) treated 1.3a / 1.4d as invariants at every rate and gated every genuine effect at 240 Hz. v3.1 (post-run correction to the
  // approved D4a text — "compare … invariant properties", "preserve genuine rate effects such as … the lean-forward landing difference; report
  // them"): PHYSICAL invariants gated at every rate (no explosion, no contact-free energy gain, free fall, momentum, exclusions, emergency stop
  // never reached, frame continuity); dt-dependent ACCURACY (joint separation, self-penetration) reported at non-validation rates (gated at
  // 240 Hz by the main suite); landing-outcome effects (posture class, final COM) REPORTED at every rate; the deterministic first-contact TIMING
  // stays gated at 240 Hz. Both evaluations are recorded.
  const INV = ["1.F", "1.2c", "1.2d", "1.1a", "1.1b", "1.4c", "1.3b", "1.3e", "1.4m"],   // + 1.4m turf-contact validity (flat-plane decision 2026-10-03: a physical invariant at every rate; 1.4n = accuracy, gated at 240 Hz by the main suite) INV_V3 = ["1.F", "1.3a", "1.3b", "1.3e", "1.4c", "1.4d", "1.2c", "1.2d", "1.1a", "1.1b"], ACC = ["1.3a", "1.4d"], med = (a) => { const b = a.slice().sort((x, y) => x - y), n = b.length; return n ? (n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2) : null; };
  const comOf = (r) => [r.outcome.comEnd[0], r.outcome.comEnd[2]], dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const ens = (k, hz) => { const R0 = rateRuns.filter(r => r.base === k && r.cfg.hz === hz), T = R0.map(r => r.outcome.firstNonFootT).filter(x => x != null), C = R0.map(comOf);
    let spread = 0; for (const a of C) for (const b of C) spread = Math.max(spread, dist2(a, b));
    return { hz, n: R0.length, postures: [...new Set(R0.map(r => r.outcome.posture))], firsts: [...new Set(R0.map(r => r.outcome.firstNonFoot))], tMed: T.length ? med(T) * 1000 : null, tRange: T.length ? (Math.max(...T) - Math.min(...T)) * 1000 : null,
      comMed: C.length ? [med(C.map(c => c[0])), med(C.map(c => c[1]))] : null, comSpread: spread, maxRiseJ: Math.max(...R0.map(r => r.energy.maxRiseJ)), monoJ: Math.max(...R0.map(r => r.energy.monoViolJ)),
      invFails: R0.flatMap(r => r.checks.filter(c => INV.includes(c.id) && !c.pass && !c.reportOnly).map(c => `${r.key}: ${c.id} ${c.value}`)),
      invFailsV3: R0.flatMap(r => r.checks.filter(c => INV_V3.includes(c.id) && !c.pass && !c.reportOnly).map(c => `${r.key}: ${c.id} ${c.value}`)),
      accuracy: Object.fromEntries(ACC.map(id => [id, Math.max(...R0.map(r => { const c = r.checks.find(x => x.id === id); return c && c.v != null ? c.v : (id === "1.3a" ? r.joints.sepMaxMm : r.contacts.selfPenMaxMm); }))])), engineTicks: R0.reduce((a, r) => a + (r.engine ? r.engine.ticks : 0), 0),
      hardMaxDeg: Math.max(...R0.map(r => r.joints.hardExcMaxDeg)), ms: med(R0.map(r => r.cpu.stepMs + r.cpu.passiveMs)) }; };
  const rateEval = RATE_KEYS.map(k => { const ref = ens(k, 720), rows = RATE_SET.map(hz => { const e = ens(k, hz);
      const dT = e.tMed != null && ref.tMed != null ? Math.abs(e.tMed - ref.tMed) : null, sT = Math.max(e.tRange ?? 0, ref.tRange ?? 0), dC = e.comMed && ref.comMed ? dist2(e.comMed, ref.comMed) : 0, sC = Math.max(e.comSpread, ref.comSpread);
      const postureEffect = !e.postures.some(p => ref.postures.includes(p)), timingEffect = dT != null && dT > Math.max(TOL.rateTimingMs, sT), comEffect = dC > Math.max(TOL.rateComM, sC);
      return { ...e, dTmedMs: dT, timingSpreadMs: sT, dComMedM: dC, comSpreadM: sC, postureEffect, timingEffect, comEffect, genuine: postureEffect || timingEffect || comEffect, invariantsOk: e.invFails.length === 0 }; });
    const r240 = rows.find(x => x.hz === 240);
    return { key: k, rows, invariantsOk: rows.every(x => x.invariantsOk), baselineConsistent: !r240.timingEffect, v3: { invariantsOk: rows.every(x => x.invFailsV3.length === 0), baselineConsistent: !r240.genuine }, effects: rows.filter(x => x.hz !== 720 && x.genuine).map(x => `${x.hz} Hz: ${[x.postureEffect ? `posture ${x.postures.join("/")} vs ${ref.postures.join("/")}` : "", x.timingEffect ? `timing Δ ${x.dTmedMs.toFixed(1)} ms (spread ${x.timingSpreadMs.toFixed(1)})` : "", x.comEffect ? `COM Δ ${x.dComMedM.toFixed(3)} m (spread ${x.comSpreadM.toFixed(3)})` : ""].filter(Boolean).join(", ")}`) }; });
  const rigRes = rigs.map(R), rigRows = rigRes.map(r => ({ ...r, checks: rigChecks(r) })), coupRes = R(coup[0]);
  const coupChecks = coupling(coupRes);
  const dxRes = DX_CONFIGS.map(d => ({ ...d, runs: dx.filter(j => j.dx === d.id).map(j => { const r = R(j); const cs = scenarioChecks(r, SCENARIOS[j.key]); return { key: j.key, pass: cs.every(c => c.pass || c.reportOnly), failing: cs.filter(c => !c.pass && !c.reportOnly).map(c => c.id),
    rise: r.energy.maxRiseJ, sep: r.joints.sepMaxMm, hard: r.joints.hardExcMaxDeg, turf: r.contacts.turfPenMaxMm, turfRest: r.contacts.turfPenRestMm, turfRestBody: r.contacts.turfPenRestBody, selfRest: r.contacts.selfPenRestMm, first: j.key === "impact15" ? Math.max(...Object.values(r.contacts.ground).map(g => g.firstDepthMm ?? -99)) : null, ms: r.cpu.stepMs + r.cpu.passiveMs, hash: r.hash }; }) }));
  // C7 high-speed envelope (V2-REF, baseline) — the envelope checks HS.1–HS.4 + report
  const hsRuns = hs.map(j => { const r = R(j); return { ...r, checks: hsChecks(r, SCENARIOS[j.key]) }; });
  // C6 free-body floor (single rigid body, no constraints, no contact): the numerical floor of angular-momentum conservation per body
  console.log("free-body momentum floor …"); const Jf = await loadJolt(VEND), floor = freeBodyFloor(Jf, specFor("V2-REF"));
  // decision candidate on every body (not adopted)
  const candRuns = cand.filter(j => j.tag === "cand").map(j => { const r = R(j); return { ...r, checks: scenarioChecks(r, SCENARIOS[j.key]) }; });
  const candHs = cand.filter(j => j.tag === "candhs").map(j => { const r = R(j); return { ...r, checks: hsChecks(r, SCENARIOS[j.key]) }; });
  // 8. performance (alone)
  console.log("performance …"); const Jm = await loadJolt(VEND), perf = { byIterations: [...new Set(ITERATION_SET.concat([60, 100, 150]))].map(v => ({ velSteps: v, ...perfBreakdown(Jm, specFor("V2-REF"), { cfg: { velSteps: v }, ticks: 2400 }) })),
    // configurations for the cost record (D1a / D2a): the previous baseline (C3 2-piece boot, 60 it) vs the adopted one (10-piece, 150 it)
    configs: [["adopted baseline: 10-piece boot, 150 it (D1a + D2a)", [], {}], ["10-piece boot, 60 it", [], { velSteps: 60 }], ["2-piece boot (C3), 150 it", ["bootGridC3"], {}], ["previous baseline: 2-piece boot (C3), 60 it", ["bootGridC3"], { velSteps: 60 }]]
      .map(([label, mods, cfg]) => ({ label, ...perfBreakdown(Jm, specFor("V2-REF", mods), { cfg, ticks: 2400 }) })) };
  // 9. V1 Gate A comparison (V1 code imported read-only; nothing in V1 is written)
  let v1 = null; if (doV1) { try { v1 = await v1Compare(runs); } catch (e) { v1 = { error: String(e && e.message || e) }; } }
  // ── gate checks ──
  const G = [];
  const add = (id, name, pass, value, limit, extra = {}) => G.push({ id, name, pass: !!pass, value, limit, ...extra });
  const refRuns = runs.filter(r => r.human === "V2-REF"), v1mRuns = runs.filter(r => r.human === "V1-matched"), varRuns = runs.filter(r => VARS.includes(r.human));
  const failOf = (rs) => rs.flatMap(r => r.checks.filter(c => !c.pass && !c.reportOnly).map(c => `${r.human}/${r.key}:${c.id}`));
  add("1.5", "iteration study 10/15/20/30/60/150 (report; decision D2a: the validation baseline is 150 velocity iterations — a correctness configuration, not the production-performance one)", true, study.map(s => `${s.velSteps} it: ${s.nPass}/${s.n} pass${s.allMargin ? " (2× margin)" : ""}`).join(", ") + (sel ? ` → spec selection ${sel.velSteps}` : " → none of 10/15/20/30 qualifies"), "report (C1)", { reportOnly: true });
  add("1.S", "V2-REF: every scenario passes every criterion", failOf(refRuns).length === 0, `${refRuns.filter(r => r.checks.every(c => c.pass || c.reportOnly)).length}/${refRuns.length} scenarios; failing: ${uniq(failOf(refRuns).map(x => x.split(":")[1])).join(", ") || "none"}`, "all");
  add("1.S′", "V1-matched instance: every scenario passes every criterion", failOf(v1mRuns).length === 0, `${v1mRuns.filter(r => r.checks.every(c => c.pass || c.reportOnly)).length}/${v1mRuns.length} scenarios`, "all");
  add("6", "body variants (165/62, 198/92, ±2 SD legs): every essential scenario passes every criterion, no per-body tuning", failOf(varRuns).length === 0, `${varRuns.filter(r => r.checks.every(c => c.pass || c.reportOnly)).length}/${varRuns.length} runs; failing criteria: ${uniq(failOf(varRuns).map(x => x.split(":")[1])).join(", ") || "none"}`, "all");
  add("1.6a", "determinism: ×3 runs (two processes) — identical per-tick hash, contact sequence, joint extrema, fall timing", det.every(d => d.pass), `${det.filter(d => d.pass).length}/${det.length} scenarios`, "all");
  add("1.6b", "snapshot / restore bit-exact (Jolt SaveState / RestoreState; passive layer stateless)", snapRes.every(s => s.pass), snapRes.map(s => `${s.key} ${s.pass ? "✓" : "✗"}`).join(", "), "all");
  add("5", "passive joint rig: applied torque = spec law (sign + magnitude), restoring, returns, never injects energy; damping-only axes", rigRows.every(r => r.checks.every(c => c.pass || c.reportOnly)), `${rigRows.filter(r => r.checks.every(c => c.pass || c.reportOnly)).length}/${rigRows.length} tests`, "all");
  add("5c", "pose-dependent passive limits (couplings) as specified", coupChecks.every(c => c.pass), coupChecks.map(c => `${c.name}: ${c.value}`).join("; "), `±${TOL.couplingDeg}°`);
  const v3fail = rateEval.filter(e => !(e.v3.invariantsOk && e.v3.baselineConsistent)).map(e => `${e.key}${e.v3.invariantsOk ? "" : " (v3 invariant: " + e.rows.flatMap(x => x.invFailsV3).slice(0, 2).join("; ") + ")"}${e.v3.baselineConsistent ? "" : " (v3: genuine effect at 240 Hz)"}`);
  add("8", "timestep 180/240/360/720 Hz (D4a, v3.1): physical invariants hold for every ensemble member at every rate; no genuine first-contact TIMING effect at the 240 Hz validation rate; landing-outcome effects and accuracy at other rates reported",
    rateEval.every(e => e.invariantsOk && e.baselineConsistent), rateEval.map(e => `${e.key}: ${e.invariantsOk ? "invariants ok" : "INVARIANT FAIL"}${e.baselineConsistent ? "" : " (240 Hz TIMING EFFECT)"}${e.effects.length ? " [reported: " + e.effects.join("; ") + "]" : ""}`).join("; ") + ` || pre-registered v3 evaluation: ${v3fail.length ? "FAIL — " + v3fail.join("; ") : "pass"}`, "all");
  const hsFail = hsRuns.flatMap(r => r.checks.filter(c => !c.pass && !c.reportOnly).map(c => `${r.key}:${c.id}`));
  add("7.HS", "C7 high-speed envelope (V2-REF, baseline): finite, no missed turf collision, no tunnelling / missed limb collision, no catastrophic constraint failure", hsFail.length === 0, `${hsRuns.filter(r => r.checks.every(c => c.pass || c.reportOnly)).length}/${hsRuns.length} envelope scenarios${hsFail.length ? "; failing: " + hsFail.join(", ") : ""}`, "all");
  const fl = (w) => Math.max(...floor.filter(x => x.w === w).map(x => x.dLrel)); add("1.1f", "C6 free-body floor: one rigid body, no constraint, no contact — the engine's own relative angular-momentum drift (max over bodies)", true, `ΔL/L ${[1, 3, 6].map(w => `${fl(w).toExponential(2)} at ${w} rad/s`).join(", ")}; linear ${Math.max(...floor.map(x => x.dPrel)).toExponential(1)}`, "report (C6)", { reportOnly: true });
  if (doCand) { const cf = failOf(candRuns), chf = candHs.flatMap(r => r.checks.filter(c => !c.pass && !c.reportOnly).map(c => `${r.key}:${c.id}`));
    add("D.cand", "DECISION CANDIDATE (not adopted): " + CAND.label + " — every body, every scenario, every criterion; envelope", true, `${candRuns.filter(r => r.checks.every(c => c.pass || c.reportOnly)).length}/${candRuns.length} body-scenarios pass${cf.length ? "; failing: " + cf.join(", ") : ""}; envelope ${candHs.length - new Set(chf.map(x => x.split(":")[0])).size}/${candHs.length}${chf.length ? " (" + chf.join(", ") + ")" : ""}`, "report (decision item)", { reportOnly: true }); }
  let guard = ""; try { guard = execSync(JSON.stringify(path.join(here, "guard_v1.sh")), { encoding: "utf8", cwd: here }).trim(); add("1.V1", "V1 frozen", true, guard, "identical"); } catch (e) { add("1.V1", "V1 frozen", false, String(e.stdout || e.message).trim(), "identical"); }
  add("1.E", "vendored Jolt = V1's pinned build", sha === "011233a5fff762d6f0f5b50726b315246bf68cb182f0a10024559d04f4c257de", sha.slice(0, 16) + "…", "011233a5fff762d6…");
  const allPass = G.every(c => c.pass || c.reportOnly);
  // ── write ──
  const results = { generated: "V2-G1 runner", date: new Date().toISOString().slice(0, 10), node: process.version, joltSha256: sha, world: { ...G1_WORLD, ...REFCFG }, tolerances: serialTol(), allPass, gate: G, study, reference: REFCFG,
    runs: runs.map(r => ({ ...r, joints: { ...r.joints, axes: r.human === "V2-REF" || r.human === "V1-matched" ? r.joints.axes : undefined } })), determinism: det, snapshot: snapRes, rates: rateEval, rateRuns: rateRuns.map(r => ({ key: r.key, base: r.base, eps: r.eps, hz: r.cfg.hz, hash: r.hash, outcome: r.outcome, energy: { maxRiseJ: r.energy.maxRiseJ, monoViolJ: r.energy.monoViolJ }, engine: r.engine, hardExcMaxDeg: r.joints.hardExcMaxDeg, hardExcWho: r.joints.hardExcWho, hardExcRestDeg: r.joints.hardExcRestDeg, checks: r.checks })),
    rig: rigRows, couplings: { probe: coupRes, checks: coupChecks }, diagnostics: dxRes, envelope: hsRuns, freeBodyFloor: floor,
    candidate: doCand ? { ...CAND, margins: JSON.parse(fs.readFileSync(CAND_MARGINS, "utf8")), runs: candRuns.map(r => ({ ...r, joints: { ...r.joints, axes: undefined } })), envelope: candHs } : null, perf, v1, seconds: (Date.now() - t0) / 1000 };
  fs.writeFileSync(path.join(OUT, "g1_results.json"), JSON.stringify(results, null, 1));
  // console summary
  console.log(`\n■ gate`); for (const c of G) console.log(`  ${c.pass ? "PASS" : "FAIL"} ${c.id.padEnd(5)} ${c.name}\n        ${c.value}   [${c.limit}]`);
  console.log(`\n■ V2-REF per scenario (${REFCFG.velSteps} it)`); for (const r of refRuns) { const f = r.checks.filter(c => !c.pass && !c.reportOnly); console.log(`  ${r.key.padEnd(14)} ${r.checks.length - f.length}/${r.checks.length}  ${r.hash}  ${f.map(c => c.id + "=" + c.value.split(" ")[0]).join("  ")}`); }
  if (doDX) { console.log(`\n■ diagnostics (not adopted): contact scenarios passing every criterion`); for (const d of dxRes) console.log(`  ${d.id} ${d.label.padEnd(86)} ${d.runs.filter(r => r.pass).length}/${d.runs.length}  worst: rise ${mx(d.runs, "rise").toFixed(2)} J · sep ${mx(d.runs, "sep").toFixed(1)} mm · hard ${mx(d.runs, "hard").toFixed(1)}° · turf ${mx(d.runs, "turf").toFixed(1)}/${mx(d.runs, "turfRest").toFixed(1)} mm · ${avg(d.runs.map(r => r.ms)).toFixed(3)} ms/tick`); }
  console.log(`\n■ C7 envelope (V2-REF)`); for (const r of hsRuns) { const f = r.checks.filter(c => !c.pass && !c.reportOnly); console.log(`  ${r.key.padEnd(14)} ${r.checks.length - f.length}/${r.checks.length}  ${f.map(c => c.id + " " + c.value).join("; ")}`); }
  if (doCand) { console.log(`\n■ decision candidate (not adopted): ${CAND.label}`); for (const r of candRuns) { const f = r.checks.filter(c => !c.pass && !c.reportOnly); if (f.length) console.log(`  ${r.human}/${r.key}: ${f.map(c => c.id + " " + c.value).join("; ")}`); } console.log(`  ${candRuns.filter(r => r.checks.every(c => c.pass || c.reportOnly)).length}/${candRuns.length} pass`); }
  console.log(`\nG1 RESULT: ${allPass ? "PASS" : "FAIL"} — ${G.filter(c => !c.pass && !c.reportOnly).length} failing gate check(s)   (${((Date.now() - t0) / 1000).toFixed(0)} s)  → ${path.relative(ROOT, OUT)}/g1_results.json`);
  process.exit(allPass ? 0 : 1);
}
const avg = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length), mx = (rs, k) => Math.max(...rs.map(r => r[k] ?? 0)), uniq = (a) => [...new Set(a)];
const serialTol = () => Object.fromEntries(Object.entries(TOL).map(([k, v]) => [k, typeof v === "function" ? "2 × 100 rad/s × dt (deg per tick)" : v]));
// 2× margin: a criterion's measured value ≤ half its tolerance (parsed from the check row)
function marginOk(c) { return c.v == null ? c.pass : c.v <= c.L / TOL.marginFactor; }
function coupling(p) {
  const C = [], near = (a, b) => Math.abs(a - b) <= TOL.couplingDeg, g = (cs) => p.find(x => x.case === cs);
  C.push({ name: "hip-flexion soft limit knee 0/45/90°", value: [g("knee 0°, hip flexed 100°"), g("knee 45°, hip flexed 100°"), g("knee 90°, hip flexed 100°")].map(x => x.hipFlexSoftHiDeg.toFixed(1)).join(" / ") + "°", pass: near(g("knee 0°, hip flexed 100°").hipFlexSoftHiDeg, 80) && near(g("knee 45°, hip flexed 100°").hipFlexSoftHiDeg, 100) && near(g("knee 90°, hip flexed 100°").hipFlexSoftHiDeg, 120) });
  C.push({ name: "ankle-DF soft limit knee 0/45/90°", value: [g("knee 0°, hip flexed 100°"), g("knee 45°, hip flexed 100°"), g("knee 90°, hip flexed 100°")].map(x => x.ankleDfSoftHiDeg.toFixed(1)).join(" / ") + "°", pass: near(g("knee 0°, hip flexed 100°").ankleDfSoftHiDeg, 20) && near(g("knee 45°, hip flexed 100°").ankleDfSoftHiDeg, 27.5) && near(g("knee 90°, hip flexed 100°").ankleDfSoftHiDeg, 35) });
  const h0 = g("knee 0°, hip flexed 100°"); C.push({ name: "hamstring: hip 100° knee straight → hip extension torque, knee flexion cross torque", value: `${h0.hipFlexTorqueNm.toFixed(2)} / +${h0.kneeFlexCrossTorqueNm.toFixed(3)} N·m`, pass: h0.hipFlexTorqueNm < 0 && h0.kneeFlexCrossTorqueNm > 0 });
  const k0 = g("knee 0° (screw-home)").kneeRotSoftDeg, k30 = g("knee 30° (screw-home)").kneeRotSoftDeg, k60 = g("knee 60° (screw-home)").kneeRotSoftDeg;
  C.push({ name: "screw-home knee axial range at 0/30/60°", value: [k0, k30, k60].map(x => `[${x.map(v => v.toFixed(1))}]`).join(" "), pass: near(k0[0], -3) && near(k0[1], 2) && near(k30[0], -15) && near(k60[0], -30) && near(k60[1], 20) });
  const e0 = g("hip flex 0°").hipRotSoftDeg[0], e90 = g("hip flex 90°").hipRotSoftDeg[0]; C.push({ name: "hip ER soft limit hip 0/90°", value: `${e0.toFixed(1)} / ${e90.toFixed(1)}°`, pass: near(e0, -45) && near(e90, -40) });
  return C;
}
async function v1Compare(runs) {
  const PC = path.resolve(here, "../../physchar"), j = JSON.parse(fs.readFileSync(path.join(PC, "results/v1_1/gatea_V1.1.json"), "utf8"));
  const map = { A: "dropA", B: "sideFirst", C: "shoulderFirst", D: "rotating", E: "awkward" }, out = [];
  for (const r1 of j.results) { const k = map[r1.drop], r2 = runs.find(r => r.human === "V2-REF" && r.key === k); if (!r2) continue;
    out.push({ drop: r1.drop, v2key: k, v1: { maxGroundPenMm: r1.maxGroundPenMm, restGroundPenMm: r1.restGroundPenMm, maxSelfPenMm: r1.maxSelfPenMm, maxAnchorErrMm: r1.maxAnchorErrMm, maxHardLimitViolDeg: r1.maxHardLimitViolDeg, energyGainMaxJ: r1.energyGain && r1.energyGain.maxJ, settleT: r1.settleT, cpuMsPerStep: r1.cpuMsPerStep, order: (r1.firstGroundContactOrder || []).slice(0, 4) },
      v2: { maxGroundPenMm: r2.contacts.turfPenMaxMm, restGroundPenMm: r2.contacts.turfPenRestMm, maxSelfPenMm: r2.contacts.selfPenMaxMm, maxAnchorErrMm: r2.joints.sepMaxMm, maxHardLimitViolDeg: r2.joints.hardExcMaxDeg, energyGainMaxJ: r2.energy.maxRiseJ, cpuMsPerStep: r2.cpu.stepMs + r2.cpu.passiveMs, order: r2.contacts.sequence.slice(0, 4).map(s => s.who) } }); }
  return { source: "sandbox/visual/physchar/results/v1_1/gatea_V1.1.json (V1.1 body, V1's own Gate A configuration: 240 Hz, 30 velocity / 4 position iterations, 20 Hz hinge soft stops, joint friction, body damping 0.05)", note: "V2 runs are the V1 drop intents re-authored in V2 anatomical angles (V1's joint coordinates are V1-specific); report only, not pass / fail (spec 1.7)", rows: out };
}
if (process.argv.includes("--worker")) worker(); else main().catch(e => { console.error(e); process.exit(2); });

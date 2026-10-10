// RH1 G1 DIAGNOSTIC (read-only, after the gate run; NOT a candidate search): the RH1 G1 main-row failures (leanL 1.3d, dropA 1.R) and the shared
// isoSelfCol 1.4d, re-run with the frozen G1 simulation (gates/v2_g1.js, G1 world, 150 velocity iterations; adopted-configuration env) on
//   RH1 and R0 (reproduction: the run hashes must equal the battery's), and two in-memory ATTRIBUTION variants that apply only part of RH1's hinges
//   (trunk-only = lumbar + thoracic; elbow-only). The variants exist only inside this process, are never added to any body set and are not proposed.
// Reported per run: hash, posture, settled excursion beyond the anatomical boundary (1.3d) and its joint, rest KE and jitter (1.R) with the top
// joints by relative-ω RMS over the rest window, self-contact pairs above 10 mm (1.4d).
// usage (from sandbox/visual/physchar2, env V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 V2_KNEE_CRIT=v2): node <this> [battery g1_results_rh1.json] [out.json]
import fs from "fs"; import path from "path";
const P2 = path.resolve(process.cwd()), imp = (f) => import(path.join(P2, f));
const { loadJolt } = await imp("core/v2_jolt.js"), { generateSpec, specHash } = await imp("spec/v2_spec.js"), { G1Sim, G1_WORLD } = await imp("gates/v2_g1.js"), { V } = await imp("core/v2_math.js");
const { PI1_RUNNER } = await imp("spec/v2_pi1_runner.js"), { PI1_RUNNER_RH1 } = await imp("spec/v2_pi1_runner_rh.js");
const J = await loadJolt(path.join(P2, "vendor/jolt-physics.wasm-compat.js")), BAT = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2])) : null, OUT = process.argv[3];
const H = PI1_RUNNER_RH1.hinges, BODIES = {
  RH1: PI1_RUNNER_RH1, R0: PI1_RUNNER,
  "diag:trunk-only": { ...PI1_RUNNER, id: "diag-trunk-only", hinges: { lumbar: H.lumbar, thoracic: H.thoracic, source: "diagnostic" } },
  "diag:elbow-only": { ...PI1_RUNNER, id: "diag-elbow-only", hinges: { elbow: H.elbow, source: "diagnostic" } } };
const cfg = { velSteps: G1_WORLD.velSteps }, D = 180 / Math.PI, rows = [];
for (const [label, human] of Object.entries(process.env.TAIL_ONLY ? {} : BODIES)) { const spec = generateSpec(human);
  for (const key of ["leanL", "dropA", "isoSelfCol", "upright"]) {
    const s = new G1Sim(J, spec, key, { cfg }), restN = s.N - Math.round(0.5 * s.cfg.hz), wsum = new Array(spec.joints.length).fill(0); let nr = 0;
    while (s.tick()) if (s.n >= restN) { nr++; spec.joints.forEach((j, k) => { const wr = V.sub(s.st[j.childIndex].w, s.st[j.parentIndex].w); wsum[k] += V.dot(wr, wr); }); }
    const r = s.summary(); s.destroy();
    const top = spec.joints.map((j, k) => [j.name, Math.sqrt(wsum[k] / Math.max(1, nr))]).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const pairs = Object.entries(r.contacts.pairs || {}).filter(([, p]) => p.maxDepthMm > 10).map(([k, p]) => `${k} ${p.maxDepthMm.toFixed(2)} mm (first ${p.first == null ? "—" : p.first.toFixed(3)} s, ${p.steps} steps)`);
    const bat = BAT && BAT.runs.find(x => x.human === human.id && x.key === key);
    const o = { body: label, spec: specHash(spec), key, hash: r.hash, batteryHash: bat ? bat.hash : null, posture: r.outcome.posture, settledExcDeg: r.joints.hardExcRestDeg, settledWho: r.joints.hardExcRestWho,
      restKE: r.rest.KEmax, jitterRadS: r.rest.jitterRadS, topJointsRMS: top, selfPenMaxMm: r.contacts.selfPenMaxMm, pairsOver10mm: pairs };
    rows.push(o); console.log(`${label.padEnd(16)} ${key.padEnd(10)} hash ${r.hash}${bat ? (bat.hash === r.hash ? " (= battery)" : ` (battery ${bat.hash} DIFFERS)`) : ""} · ${o.posture} · 1.3d ${o.settledExcDeg.toFixed(2)}° ${o.settledWho || ""} · 1.R KE ${o.restKE.toExponential(1)} J jitter ${o.jitterRadS.toFixed(3)} rad/s [rest RMS: ${top.map(([n, w]) => `${n} ${w.toFixed(3)}`).join(", ")}] · self max ${o.selfPenMaxMm.toFixed(2)} mm${pairs.length ? " [" + pairs.join("; ") + "]" : ""}`); } }
// settling vs persistent motion: RH1 / R0 dropA continued 10 s past the scenario end (opts.seconds; diagnostic only — G1 scores the scenario length):
// the joint-RMS relative ω (the 1.R jitter measure) per 0.5 s window, and the left shoulder / elbow
const tails = [];
for (const label of ["RH1", "R0"]) { const spec = generateSpec(BODIES[label]), sc0 = new G1Sim(J, spec, "dropA", { cfg }), N0 = sc0.N, hz = sc0.cfg.hz; sc0.destroy();
  const s = new G1Sim(J, spec, "dropA", { cfg, seconds: N0 / hz + 10 }), win = Math.round(0.5 * s.cfg.hz), out = []; let acc = [], aS = 0, aE = 0;
  while (s.tick()) { let wsq = 0; spec.joints.forEach(j => { const wr = V.sub(s.st[j.childIndex].w, s.st[j.parentIndex].w); wsq += V.dot(wr, wr); }); acc.push(Math.sqrt(wsq / spec.joints.length));
    const jw = (n) => { const j = spec.joints.find(x => x.name === n); return V.len(V.sub(s.st[j.childIndex].w, s.st[j.parentIndex].w)); }; aS = Math.max(aS, jw("shoulder_L")); aE = Math.max(aE, jw("elbow_L"));
    if (s.n % win === 0) { out.push({ t: +(s.n / s.cfg.hz).toFixed(2), jitterMax: Math.max(...acc), shoulderL: aS, elbowL: aE }); acc = []; aS = 0; aE = 0; } }
  s.destroy(); tails.push({ body: label, scenarioEndS: N0 / hz, windows: out.filter(w => w.t >= N0 / hz - 2) });
  console.log(`${label} dropA continued: scenario end ${N0 / hz} s; per 0.5 s window from end − 2 s (t: joint-RMS jitter max / |ω| shoulder_L / elbow_L, rad/s): ` + out.filter(w => w.t >= N0 / hz - 2).map(w => `${w.t} ${w.jitterMax.toFixed(3)}/${w.shoulderL.toFixed(3)}/${w.elbowL.toFixed(3)}`).join(" · ")); }
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ tool: "rh1_g1_diag.mjs", cfg, rows, dropAContinued: tails }, null, 1));

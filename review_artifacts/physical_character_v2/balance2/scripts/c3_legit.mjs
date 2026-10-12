// BALANCE-2 C3 legitimacy evaluation (frozen with the C3 preregistration, before any C3 run on B2M). Re-runs, deterministically, every run of a
// candidate's B2M evidence file (scripts/b2_qualify.mjs job definitions, unchanged; each push's final hash is checked against the evidence file)
// and applies scripts/c3_support.mjs:
//   L1  legitimate support only: in every run the frozen rule does NOT score as a fall — quiet standing (U, 60 s), the 16 P pushes, the 2 M′ pushes
//       and every non-fall level of the four threshold bisections — the boot-tip load share ≤ 0.02 at every step (no rigid boot-tip support)
//   L2  genuine fall beyond legitimate support (forward): the unchanged post-hoc physical-boundary tool (scripts/b2_physical_boundary.mjs) on its
//       fixed forward grid finds NO push that the frozen rule scores as a fall ending in a feet-in-place physical recovery, and its physical forward
//       boundary ≤ the B2M forward threshold + 0.7 N·s (the two bisections' bracket widths, 0.35 + 0.28)
// Reported, not judged: heel lift (peak pitch vs the twin) and time with the heel lifted > 1°; the backward physical boundary.
// usage (worktree root): node .../c3_legit.mjs --evidence <B2M_Q.json> --body <json> --ctrl <json> --ctrlModule <path> --ctrlClass <name> --label <id> --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, BT = await import(RA + "ppr3/scripts/ppr3_battery.mjs"), { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V } = PL;
const { B2M } = await import(new URL("./b2_qualify.mjs", import.meta.url).href), { support, TIP } = await import(new URL("./c3_support.mjs", import.meta.url).href), { boundary } = await import(new URL("./b2_physical_boundary.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, PELVIS_COM = PL.SPEC_R().bodies[0].comLocal;
export async function legit(CFG, Q) { const CM = await import(CFG.ctrlModule), Ctrl = CM[CFG.ctrlClass], job = (extra) => ({ law: "M1B", params: CFG.body, ctrl: () => new Ctrl(CFG.ctrl), ...extra });
  const steps = B2M.onset + B2M.window, base = await runOne(job({ steps })), edges = BT.bos(base.recs, B2M.onset - 6, B2M.onset), out = { tip: TIP, runs: {}, hashMismatch: [] };
  { const U = await runOne(job({ steps: B2M.U.steps })); if (U.finalHash !== Q.U.finalHash) out.hashMismatch.push("U"); out.runs.U = { fall: !!Q.U.fall, ...support(U, null, B2M.U.swayFrom, U.recs.length) }; } // block scope: the 60 s record is released (run with --max-old-space-size=8192)
  for (const [dir, mags] of Object.entries(B2M.J)) for (const [mag, J] of Object.entries(mags)) { const k = dir + "." + mag, o = await runOne(job({ steps, perturb: BT.pushJob(dir, J, B2M.onset, B2M.pulse) }));
    if (o.finalHash !== Q.P.runs[k].hash) out.hashMismatch.push(k); const rec = BT.recovery(base, o, B2M.onset, B2M.window, edges, B2M.recovery); out.runs["P." + k] = { J, fall: !!rec.fall, ...support(o, base, B2M.onset, steps) }; }
  for (const dir of ["fwd", "left"]) { const u = { fwd: [1, 0, 0], left: [0, 0, 1] }[dir], mm = B2M.matched[dir], o = await runOne(job({ steps, perturb: [{ from: B2M.onset, to: B2M.onset + mm.steps, body: "pelvis", F: V.sc(u, mm.J / (mm.steps / 240)), pLocal: PELVIS_COM }] }));
    const rec = BT.recovery(base, o, B2M.onset, B2M.window, edges, B2M.recovery); out.runs["M." + dir] = { J: mm.J, fall: !!rec.fall, ...support(o, base, B2M.onset, steps) }; }
  for (const dir of B2M.threshold.dirs) for (const [J, fell] of Q.T[dir].tried) { const o = await runOne(job({ steps, perturb: BT.pushJob(dir, J, B2M.onset, B2M.pulse) })), rec = BT.recovery(base, o, B2M.onset, B2M.window, edges, B2M.recovery);
    out.runs[`T.${dir}.${J}`] = { J, fall: !!rec.fall, fallMatchesEvidence: !!rec.fall === fell, ...support(o, base, B2M.onset, steps) }; }
  const nonFall = Object.entries(out.runs).filter(([, r]) => !r.fall); out.L1 = { pass: nonFall.every(([, r]) => r.legitimate) && out.hashMismatch.length === 0, nonFallRuns: nonFall.length, violations: nonFall.filter(([, r]) => !r.legitimate).map(([k, r]) => ({ run: k, tipSharePeak: r.tipSharePeak, tipLoadedS: r.tipLoadedS })) };
  const PB = await boundary({ ctrl: CFG.ctrl, ctrlModule: CFG.ctrlModule, ctrlClass: CFG.ctrlClass }, ["fwd", "back"]), Tf = Q.T.fwd.thresholdNs;
  const savedOutside = PB.fwd.grid.filter(g => g.frozenRuleFall && !g.physicalFall); out.physicalBoundary = PB;
  out.L2 = { pass: savedOutside.length === 0 && PB.fwd.physicalBoundaryNs <= Tf + 0.7, frozenRuleFwdThresholdNs: +Tf.toFixed(2), physicalFwdBoundaryNs: PB.fwd.physicalBoundaryNs, frozenFallButPhysicallyRecovered: savedOutside.map(g => g.J) };
  out.heel = Object.fromEntries(nonFall.map(([k, r]) => [k, { peakDeg: r.heelLiftPeakDeg, over1degS: r.heelLiftOver1degS }])); return out; }
if (process.argv[1] && process.argv[1].endsWith("c3_legit.mjs")) { const abs = (p) => new URL(p, "file://" + process.cwd() + "/").href, CFG = { body: JSON.parse(fs.readFileSync(arg("body"))), ctrl: JSON.parse(fs.readFileSync(arg("ctrl"))), ctrlModule: abs(arg("ctrlModule")), ctrlClass: arg("ctrlClass") };
  const L = await legit(CFG, JSON.parse(fs.readFileSync(arg("evidence")))); L.label = arg("label", ""); fs.writeFileSync(arg("out"), JSON.stringify(L, null, 1));
  console.log(L.label, "L1", L.L1.pass ? "PASS" : "FAIL", JSON.stringify(L.L1.violations), "hash mismatches", JSON.stringify(L.hashMismatch)); console.log(L.label, "L2", L.L2.pass ? "PASS" : "FAIL", JSON.stringify(L.L2));
  for (const [k, r] of Object.entries(L.runs)) console.log(`  ${k.padEnd(22)} ${r.fall ? "fall" : "ok  "} tip ${r.tipSharePeak.toFixed(3)} heel ${r.heelLiftPeakDeg.toFixed(1)}°`); }

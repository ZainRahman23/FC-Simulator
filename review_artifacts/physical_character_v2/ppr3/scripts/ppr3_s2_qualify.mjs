// PPR-3 S2 substrate qualification (frozen with PPR3_S2_PREREGISTRATION.md). S2 ALONE (constant excitation, no controller), runner alone from
// the PPR-3 standing entry. Families: E entry audit (first 250 ms) · I isolated stiffness (fast inside the intrinsic window; quasi-static held) ·
// P pushes judged inside the intrinsic window · R held displacement / release · C eccentric hold (persistence) · D determinism · open-loop
// standing (diagnostic, reported). Also run on CURRENT V2 for reference where meaningful.
// usage: V2_KNEE_MODEL=v2k node ppr3_s2_qualify.mjs --cond S2|A [--params <json>] --label <id> --out <json>
import fs from "fs";
const BT = await import(new URL("./ppr3_battery.mjs", import.meta.url).href), MS = await import(new URL("./ppr3_measure.mjs", import.meta.url).href), { runOne } = await import(new URL("./ppr3_run.mjs", import.meta.url).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
export const S2B = Object.freeze({
  windowsMs: { ankle: 40, knee: 30, hip: 30, trunk: 30, neck: 25, body: 30 },          // intrinsic-only windows (POSTURAL_TIMING_CONTROL_LITERATURE §recommended timing)
  entry: { steps: 60 }, onset: 60,                                                       // tests begin after the 250 ms entry audit
  platform: { from: 60, ramp: 10, steps: 30, amps: [0.005, 0.01, 0.02, 0.04, 0.08], mgh: 647.2 },
  fast: { from: 60, ramp: 7, steps: 20, amps: [0.01], readMs: [29.2] },
  quasi: { from: 60, ramp: 7, steps: 260, amp: 0.01, readMs: [250, 1000], joints: ["ankle", "knee", "hip", "lumbarFlex", "lumbarLat"] },
  ecc: { from: 60, ramp: 2, holdSteps: 262, amp: 0.0175, readMs: [100, 300, 1000], joints: ["ankle", "knee", "hip"], sign: { ankle: 1, knee: 1, hip: 1 } },
  push: { pulse: 12, judgeSteps: 7, reportSteps: 24, steps: 60 + 30, J: { fwd: { small: 6.1, moderate: 9.7, large: 36.4 }, back: { small: 7.3, moderate: 11.6, large: 43.5 }, left: { small: 15.6, moderate: 24.9, large: 93.3 }, right: { small: 15.6, moderate: 24.9, large: 93.3 } } },
  // J = f · J_lim, J_lim = m·ω0·margin (zero-delay XcoM no-step limit, Hof 2005) of the PPR-3 entry: m 73.91 kg, COM height 0.9801 m (ω0 3.164 s⁻¹),
  // flat-sole extents (≤ 5 mm above the turf) x −0.098…0.130 m, z ±0.266 m, COM x 0.0257 → J_lim fwd 24.27 / back 29.01 / lateral 62.22 N·s;
  // f = 0.25 / 0.4 / 1.5 (PPR-2's literature-band fractions; large = beyond any no-step response)
  hold: { from: 60, hold: 48, after: 72, recoilMs: [25, 50], probes: [{ joint: "ankle_R", axis: "df", parent: "shank_R", child: "foot_R", T: 5 }, { joint: "knee_R", axis: "flex", parent: "thigh_R", child: "shank_R", T: 5 },
    { joint: "hip_R", axis: "flex", parent: "pelvis", child: "thigh_R", T: 5 }, { joint: "lumbar", axis: "flex", parent: "pelvis", child: "abdomen", T: 5 }, { joint: "lumbar", axis: "lat", parent: "pelvis", child: "abdomen", T: 5 }] },
  openLoop: { steps: 960, envMm: 10, envDeg: 3 },
});
// yield on a key axis at record r: |strain torque| at its cap R⁺ + R⁻ (S2 law info)
const yieldAxes = (r) => (r.law || []).filter(x => MS.KEY_AXES.some(([, k, i]) => k === x[0] && i === x[1]) && x[13] + x[14] > 0 && Math.abs(x[9]) >= 0.999 * (x[13] + x[14])).map(x => x[0] + "_" + x[1]);
export async function qualify(cond, CFG) { const B = S2B, out = { cond, battery: B, wall: {} }, t = () => Date.now(); let t0;
  const job = (extra) => BT.makeJob(cond, CFG, extra);
  t0 = t(); const ent = await runOne(job({ steps: B.openLoop.steps })); out.E = BT.entryAudit(ent, B.entry.steps);
  const R = ent.recs, r0 = R[0], y0 = r0.S[0].pos[1], c0 = r0.chars.runner.com; let exit = null;
  for (const r of R) { const d = Math.max((y0 - r.S[0].pos[1]) * 1000, Math.hypot(r.chars.runner.com[0] - c0[0], r.chars.runner.com[2] - c0[2]) * 1000), j = MS.KEY_AXES.map(([n, k, i]) => [n, Math.abs(r.chars.runner.th[k][i] - r0.chars.runner.th[k][i]) * 180 / Math.PI]).sort((a, b) => b[1] - a[1])[0];
    if (d >= B.openLoop.envMm || j[1] >= B.openLoop.envDeg) { exit = { t: r.n / 240, cause: d >= B.openLoop.envMm ? "departure " + d.toFixed(1) + " mm" : "joint " + j[0] }; break; } }
  out.openLoop = { exit, cpu: ent.cpu, steps: R.length, finalHash: ent.finalHash, stop: ent.stop || null }; out.wall.E = (t() - t0) / 1000;
  t0 = t(); out.I = { ankle: await BT.anklePlatform(cond, CFG, B.platform), fast: await BT.isolated(cond, CFG, B.fast), quasi: cond === "S2" ? await BT.quasiStatic(CFG, B.quasi) : null }; out.wall.I = (t() - t0) / 1000;
  t0 = t(); const P = B.push, base = await runOne(job({ steps: P.steps })), edges = BT.bos(base.recs, B.onset - 6, B.onset); out.P = { edges, runs: {} };
  for (const [dir, mags] of Object.entries(P.J)) for (const [mag, J] of Object.entries(mags)) { const o = await runOne(job({ steps: P.steps, perturb: BT.pushJob(dir, J, B.onset, P.pulse) }));
    const m = (n) => BT.pushMetrics(base, o, B.onset, n, dir, edges), ch = MS.chronology(base, o, B.onset);
    const yJ = []; for (let q = B.onset; q < B.onset + P.judgeSteps; q++) yJ.push(...yieldAxes(o.recs[q]).filter(a => !yieldAxes(base.recs[q]).includes(a)));
    out.P.runs[dir + "." + mag] = { J, judge: m(P.judgeSteps), report: m(P.reportSteps), yieldInWindow: [...new Set(yJ)], chronoMs: ch.ms, stop: o.stop || null, sepMax: Math.max(...o.recs.map(r => r.chars.runner.integrity.sepMaxMm)) }; }
  out.wall.P = (t() - t0) / 1000;
  t0 = t(); out.R = await BT.holdRelease(cond, CFG, B.hold); out.wall.R = (t() - t0) / 1000;
  t0 = t(); out.C = cond === "S2" ? await BT.eccentricHold(CFG, B.ecc) : null; out.wall.C = (t() - t0) / 1000;
  t0 = t(); const d1 = await runOne(job({ steps: 240 })), d2 = await runOne(job({ steps: 240 })), pj = BT.pushJob("fwd", P.J.fwd.moderate, B.onset, P.pulse), d3 = await runOne(job({ steps: P.steps, perturb: pj })), d4 = await runOne(job({ steps: P.steps, perturb: pj }));
  out.D = { standing: [d1.finalHash, d2.finalHash], push: [d3.finalHash, d4.finalHash], identical: d1.finalHash === d2.finalHash && d3.finalHash === d4.finalHash }; out.wall.D = (t() - t0) / 1000;
  return out; }
if (process.argv[1] && process.argv[1].endsWith("ppr3_s2_qualify.mjs")) { const cond = arg("cond", "S2"), CFG = { body: arg("params") ? JSON.parse(fs.readFileSync(arg("params"))) : null, toneD: { knee: 81, hip: 20, lumbarFlex: 24, lumbarLat: 24, ankle: 175 } };
  const Q = await qualify(cond, CFG); Q.label = arg("label", cond); Q.params = CFG.body; fs.writeFileSync(arg("out"), JSON.stringify(Q, null, 1)); console.log(Q.label, "wall", JSON.stringify(Q.wall)); }

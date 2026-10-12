// MUSCLE-1 capture (measurement only): re-runs FROZEN PPR-3 S2 + P2 battery jobs (params/PPR3_S2_CANDIDATE.json + PPR3_P2_CANDIDATE.json, frozen
// ppr3 scripts, onset 480 = t 2 s, 50 ms pelvis pulse; ppr3_p2_qualify.mjs P2B constants) and stores, per step, (i) P2's exact command log
// (ctrlLog: every Δτ it issued and the sample index each channel sensed) and (ii) the exact actuator inputs and outputs of the ankle, knee and hip
// axes (kinematics, excitation, activation, drive, strain / passive / damping terms, window and the constraint torque actually applied).
// Nothing in PPR-3 is modified; the capture reads the plant through runOne's onStep hook after each tick.
// Alignment: capture row n (after tick n) holds tauApplied = the actuator constraint torque applied DURING step n (plan P_{n−1}) and every other
// field from plan P_n (computed after step n, applied during step n + 1); w = the axis rate at the end of step n = the start rate of P_n.
// usage (worktree root): V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive> node review_artifacts/physical_character_v2/muscle1/scripts/m1_capture.mjs --out <dir>
import fs from "fs"; import zlib from "zlib"; import path from "path";
const RA = new URL("../../", import.meta.url), BT = await import(new URL("ppr3/scripts/ppr3_battery.mjs", RA).href), { runOne } = await import(new URL("ppr3/scripts/ppr3_run.mjs", RA).href);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const CFG = { body: JSON.parse(fs.readFileSync(new URL("ppr3/params/PPR3_S2_CANDIDATE.json", RA))), ctrl: JSON.parse(fs.readFileSync(new URL("ppr3/params/PPR3_P2_CANDIDATE.json", RA))) };
export const AXES = [["ankle_L.df", 11, 1], ["ankle_R.df", 12, 1], ["ankle_L.inv", 11, 2], ["ankle_R.inv", 12, 2], ["knee_L.flex", 9, 1], ["knee_R.flex", 10, 1], ["hip_L.flex", 7, 1], ["hip_R.flex", 8, 1], ["hip_L.abd", 7, 2], ["hip_R.abd", 8, 2]];
export const FIELDS = ["tauApplied", "anat", "w", "kneeDeg", "capP", "capM", "uP", "uM", "aP", "aM", "drive", "tauE", "tauP", "Ktot", "Kmus", "D", "req", "hi", "lo", "Rp", "Rm", "dTauP2", "tgt", "e", "eEff", "armR", "armS", "armF", "sat"];
function capturer(store) { return (sim) => { const c = sim.runner, law = sim.law, plan = c.aplan, P = c.P, ev = c.up.ev, res = c.actRes || [];
  for (const [name, k, i] of AXES) { const pj = plan.joints.find(p => p.k === k), r = pj.rows[i], ar = res.find(x => x.k === k && x.i === i), L = (law.last || []).find(x => x[0] === k && x[1] === i);
    const kk = c.act.kneeOf[k], kneeDeg = kk != null ? P.anat(P.jd[kk], ev.qs[kk], "flex") : null, A = law.arms[k][i];
    store[name].push([ar ? ar.tau : null, r.anat, r.w, kneeDeg, r.capP, r.capM, r.uP, r.uM, r.aP, r.aM, r.drive, r.tauE, r.tauP, r.K, r.Kmus, r.D, r.req, r.hi, r.lo, r.Rp, r.Rm, L ? L[7] : 0, L ? L[2] : null, law.ePrev[k][i], law.eEff[k][i], A.r, A.s, A.f, ar && ar.sat ? 1 : 0]); } }; }
async function capture(label, extra) { const store = Object.fromEntries(AXES.map(([n]) => [n, []])), o = await runOne(BT.makeJob("S2P2", CFG, { ...extra, onStep: capturer(store) }));
  const axes = Object.fromEntries(AXES.map(([n, k, i]) => [n, { k, i, rows: store[n] }])), entry = o.entry.law0.filter(e => AXES.some(([, k, i]) => k === e.k && i === e.i));
  const out = { label, protocol: "MUSCLE-1 capture of a frozen PPR-3 S2 + P2 job", job: o.job, finalHash: o.finalHash, steps: o.recs.length, stop: o.stop || null, fields: FIELDS, entry, ctrlLog: { n: o.ctrlLog.n, cmd: o.ctrlLog.cmd.map(a => Array.from(a)), sensed: o.ctrlLog.sensed }, axes };
  fs.writeFileSync(path.join(OUT, label + ".json.gz"), zlib.gzipSync(JSON.stringify(out))); console.log(label, out.steps, out.finalHash, o.stop ? "STOP " + o.stop.reason : ""); return o; }
const onset = 480, steps = 1440, P2B = { fwd: { small: 6.1, moderate: 9.7, large: 36.4 }, back: { moderate: 11.6 }, left: { small: 15.6, moderate: 24.9 } };
// determinism anchor: the qualification's D job (720 steps, moderate forward) must reproduce its committed hash
const d = await runOne(BT.makeJob("S2P2", CFG, { steps: 720, perturb: BT.pushJob("fwd", 9.7, onset, 12) })); console.log("D push (720) hash", d.finalHash, d.finalHash === "4178181c7f012d8b" ? "= committed PPR3_P2Q D.push ✓" : "≠ committed ✗");
const base = await capture("BASE_undisturbed", { steps });
for (const [dir, mags] of Object.entries(P2B)) for (const [mag, J] of Object.entries(mags)) { const o = await capture(`${dir}_${mag}`, { steps, perturb: BT.pushJob(dir, J, onset, 12) });
  if (dir === "fwd" && mag === "moderate") { let same = true; for (let q = 0; q < 720; q++) if (o.recs[q].hash !== d.recs[q].hash) { same = false; break; } console.log("fwd_moderate first 720 records = D job records:", same ? "✓" : "✗"); } }

// P2b EXPLORATION ONLY (not frozen, not qualified; design-stage impulse responses, noise-free): the frozen S2 body + the P2b controller
// (explore/ppr3_ctrl_p2b.mjs) with one of the three literature variants below, twin worlds, pelvis pulse 50 ms at t = 2 s, ΔCOM vs the twin;
// also the undisturbed twin's own drift from the entry (pelvis drop, COM shift).
// Variants = the frozen P2 candidate without motor noise, with the COM channel and an EMG → torque filter replaced:
//   C1  K_A 0.13 s² (Pasma 2017) + critically damped 2nd-order filter ω 15 rad/s (POSTURAL_TIMING: 12–17 rad/s; van der Kooij & Peterka 2011 16.8)
//   C2  C1 + K_D 0.87 s (Pasma 2017)
//   C3  Pasma 2017 as fitted: K_D 0.87 s, K_A 0.13 s², filter 1.48 Hz (9.3 rad/s), ζ 1.3
//   (ML gains × 1.70, the measured four-bar / inverted-pendulum gravitational stiffness ratio, as in the frozen candidate)
// usage (from the worktree root): V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive> node review_artifacts/physical_character_v2/ppr3/explore/p2b_impulse.mjs [C1|C2|C3 …]
const R = new URL("../", import.meta.url), fs = await import("fs");
const { runOne } = await import(new URL("scripts/ppr3_run.mjs", R).href), C = await import(new URL("explore/ppr3_ctrl_p2b.mjs", R).href), BT = await import(new URL("scripts/ppr3_battery.mjs", R).href);
const body = JSON.parse(fs.readFileSync(new URL("params/PPR3_S2_CANDIDATE.json", R))), P2 = JSON.parse(fs.readFileSync(new URL("params/PPR3_P2_CANDIDATE.json", R)));
const ml = 1.70, kP = P2.com.kP, kI = P2.com.kI, VAR = {
  C1: { com: { kP, kD: P2.com.kD, kI, kA: [0.13, 0.13 * ml] }, filter: { omega: 15, zeta: 1 } },
  C2: { com: { kP, kD: [0.87, 0.87 * ml], kI, kA: [0.13, 0.13 * ml] }, filter: { omega: 15, zeta: 1 } },
  C3: { com: { kP, kD: [0.87, 0.87 * ml], kI, kA: [0.13, 0.13 * ml] }, filter: { omega: 9.3, zeta: 1.3 } } };
const T = 480 + 1440, out = {};
for (const v of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(VAR)) { const { noise, ...base } = P2, cp = { ...base, ...VAR[v], id: "P2b " + v + " (exploration)" }; out[v] = { params: cp };
  for (const [dir, J] of [["fwd", 2], ["left", 4]]) { const job = (pert) => runOne({ law: "S2", params: body, ctrl: () => new C.P2Controller(cp), steps: T, perturb: pert });
    const b = await job([]), o = await job(BT.pushJob(dir, J, 480, 12)), ax = dir === "fwd" ? 0 : 2, d = o.recs.map((r, q) => (r.chars.runner.com[ax] - b.recs[q].chars.runner.com[ax]) * 1000);
    const pts = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6].map(t => [t, +d[480 + Math.round(t * 240) - 1].toFixed(2)]);
    out[v][dir] = { J, dComMm: pts, stop: o.stop || null };
    if (!out[v].undisturbed) { const y0 = b.recs[0].S[0].pos[1], c0 = b.recs[0].chars.runner.com; // the undisturbed twin itself: pelvis drop / COM shift from entry
      out[v].undisturbed = [1, 2, 3, 4, 5, 6, 7, 8].map(t => { const q = b.recs[t * 240 - 1]; return [t, +((y0 - q.S[0].pos[1]) * 1000).toFixed(1), +(Math.hypot(q.chars.runner.com[0] - c0[0], q.chars.runner.com[2] - c0[2]) * 1000).toFixed(1)]; });
      console.log(`${v} undisturbed (noise-free) [t s, pelvis drop mm, COM shift mm]:`, JSON.stringify(out[v].undisturbed)); } console.log(`${v} ${dir} ${J} N·s ΔCOM mm:`, pts.map(([t, x]) => `${t}s ${x}`).join(" "), o.stop ? "STOP" : ""); } }
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));

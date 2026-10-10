// RUN-1 → V2 handoff contract draft, READ-ONLY: where the four ITS-1 initialization states (authoritative IB-1 records, V1.3 OFF) would fall in RUN-1's stance
// sub-phases IF RUN-1 were driven by the simulation's stride clock (same phase convention: right touchdown at 0, left at 0.5) and kept its own 3.0 m/s duty
// factor / foot-roll fractions (read from RUN-1 itself at 3.0 m/s). A hypothetical mapping, not a RUN-1 run. Usage: [RUN1_WT=<RUN-1 tree>] node its_states_in_run1_phase.cjs
const z = require("zlib"), fs = require("fs"), path = require("path"), REC = path.resolve(__dirname, "../../../interaction_benchmark/records/v13");
const RUN1_WT = process.env.RUN1_WT || path.resolve(__dirname, "../../../../../../locomotion-v2-run1"), X = require(path.join(RUN1_WT, "sandbox/visual/run1/tools/run1_load.cjs")).loadRun1();
const GP = X.r1Prepare(X.r1Make(X.charSkel("vinicius")), 3.0).p, RUN1_JOG = { D: GP.D, flatS: GP.flatS, heelRiseS: GP.heelRiseS };
console.log("RUN-1 at 3.0 m/s:", JSON.stringify({ D: +GP.D.toFixed(4), flatS: +GP.flatS.toFixed(4), heelRiseS: +GP.heelRiseS.toFixed(4), stepsPerS: +(2 / GP.T).toFixed(4) }));
const S = [["S-A", "rx_free_leg", 59.5], ["S-A2", "rx_free_leg", 50.0], ["S-B", "rx_planted_leg", 48.5], ["S-B2", "rx_glancing", 65.5]];
for (const [id, cs, tau] of S) { const R = JSON.parse(z.gunzipSync(fs.readFileSync(path.join(REC, cs + "_OFF.json.gz"))));
  const r = Math.ceil(tau - 1e-9) - 1, n = Math.round((tau - r) * 4), sb = R.simBody[r][n - 1], out = {};
  for (const sd of ["L", "R"]) { const l = sb.legs[sd], s = l.up / RUN1_JOG.D; out[sd] = { simPlanted: l.planted, up: +l.up.toFixed(4), run1: l.up < RUN1_JOG.D ? `stance s=${s.toFixed(3)} ${s < RUN1_JOG.flatS ? "heelRoll" : s <= RUN1_JOG.heelRiseS ? "flat" : "heelUp(MTP)"}` : "swing" }; }
  console.log(id, cs, "tau0", tau, "simPhase", sb.phase.toFixed(4), JSON.stringify(out)); }
// the simulation's stride clock and planted window, unperturbed (rx_miss)
{ const R = JSON.parse(z.gunzipSync(fs.readFileSync(path.join(REC, "rx_miss_OFF.json.gz")))); let d = []; for (let r = 1; r < R.rows.length; r++) { let dp = R.rows[r][13] - R.rows[r - 1][13]; if (dp < 0) dp += 1; d.push(dp); }
  const m = d.slice().sort()[d.length >> 1] * 60; let lastPl = 0, firstSw = 9; for (const row of R.simBody) for (const sb of row) { if (sb.legs.R.planted) lastPl = Math.max(lastPl, sb.legs.R.up); else firstSw = Math.min(firstSw, sb.legs.R.up); }
  console.log(`simulation (rx_miss, 3.0 m/s): ${(2 * m).toFixed(4)} steps/s, stride ${(1 / m).toFixed(4)} s, stride clock legLen ${R.legLen[0]}; R planted for up < ${lastPl.toFixed(4)}…${firstSw.toFixed(4)} (duty ≈ ${((lastPl + firstSw) / 2).toFixed(3)})`); }

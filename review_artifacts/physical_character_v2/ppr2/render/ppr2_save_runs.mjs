// PPR-2 VISUAL PREPARATION (presentation only): re-runs, deterministically, the two battery jobs shown in the review — T1 undisturbed standing
// (first 1.2 s) and the T2 MODERATE FORWARD push (sagittal: visible from CAMERA_V1's side view) — for CURRENT V2 and S*, and writes their records (json.gz, outside Git) for TRC-1 clip preparation.
// The final hashes are checked against the frozen evidence (T1 run prefix is re-hashed; the push is the same job as the battery).
// usage: V2_KNEE_MODEL=v2k LV2_ARCHIVE=<tag archive> node ppr2_save_runs.mjs --out <dir>
import fs from "fs"; import zlib from "zlib"; import path from "path";
const R = new URL("../../", import.meta.url).href, PL = await import(R + "pvp1/scripts/pvp1a_lib.mjs"), { V } = PL, { runOne } = await import(R + "ppr2/scripts/ppr2_run.mjs"), { BATTERY } = await import(R + "ppr2/scripts/ppr2_battery.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, OUT = arg("out"); fs.mkdirSync(OUT, { recursive: true });
const FIX = JSON.parse(fs.readFileSync(new URL("pvp1/fixture/PVP1A_FIXTURE.json", R))), SS = JSON.parse(fs.readFileSync(new URL("ppr2/PPR2_CANDIDATE_S.json", R))), B = BATTERY.T2, t0 = BATTERY.t0;
const push = [{ from: t0, to: t0 + B.pulse, body: "pelvis", F: V.sc(B.dirs.fwd, B.J.fwd.moderate / (B.pulse / 240)), pLocal: PL.SPEC_R().bodies[0].comLocal }];
for (const [key, law, params, steps, perturb] of [["A_STAND", "A", undefined, 288, []], ["S_STAND", "S", SS, 288, []], ["A_PUSHF", "A", undefined, t0 + B.W + 1, push], ["S_PUSHF", "S", SS, t0 + B.W + 1, push]]) {
  const o = await runOne({ fixtureObj: FIX, law, params, scene: "SOLO", steps, perturb, label: key }); fs.writeFileSync(path.join(OUT, key + ".json.gz"), zlib.gzipSync(JSON.stringify(o))); console.log(key, o.recs.length, o.finalHash); }

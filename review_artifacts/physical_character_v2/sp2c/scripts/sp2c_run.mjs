// SP2C runner: a candidate (sp2a_flight structure + SP2C options) on a RUN-1 run-in with the TEMPORARY non-stud body-friction multiplier
// (default ×0.375 = "F37.5", a labelled development value — not canonical V2; studs unchanged, fsweep/scripts/fs_contact.mjs), 6 s by default.
// usage (worktree root): node sp2c_run.mjs --runin <run1g_4.608.json> --opts <opts.json | '{json}'> [--m 0.375] [--steps 1440] [--out rec.json.gz] [--diag out.json]
import fs from "fs";
const L = await import(new URL("../../slide_phys1/scripts/sp_lib.mjs", import.meta.url).href), FL = await import(new URL("../../sp2a/scripts/sp2a_flight.mjs", import.meta.url).href);
const FC = await import(new URL("../../sp2a/fsweep/scripts/fs_contact.mjs", import.meta.url).href), DG = await import(new URL("./sp2c_diag.mjs", import.meta.url).href), SC = await import(new URL("./sp2c_cand.mjs", import.meta.url).href), SC0 = await import(new URL("./sp2c_cand_v0.mjs", import.meta.url).href);
export const TEMP_M = 0.375;   // F37.5 — temporary development value (owner, 14 Oct); do not tune during SP2C
// A.mode "sp2c" → the SP2C candidate (sp2c_cand.mjs: SP2A + SP2C groups); "sp2c0" → the first attempt (sp2c_cand_v0.mjs); otherwise the SP2A flight
// candidate (e.g. SP2A_opts.json) — all with the temporary friction hook
export async function runC(runin, A, m = TEMP_M, steps = 1440) { const setup = { setup: FC.sweepSetup(m) }, o = A.mode === "sp2c" ? await SC.runSP2C(runin, A, steps, setup) : A.mode === "sp2c0" ? await SC0.runSP2C(runin, A, steps, setup) : await FL.runFlight(runin, A, steps, setup); o.fsweep = { m, id: "F" + (m * 100), temporary: true }; return o; }
if (process.argv[1] && process.argv[1].endsWith("sp2c_run.mjs")) { const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
  const os = arg("opts", "{}"), A = os.trim().startsWith("{") ? JSON.parse(os) : JSON.parse(fs.readFileSync(os)), m = +arg("m", String(TEMP_M)), o = await runC(arg("runin"), A, m, +arg("steps", "1440"));
  if (arg("out")) L.writeGz(arg("out"), o); const d = DG.diagnose(o, m); if (arg("diag")) fs.writeFileSync(arg("diag"), JSON.stringify(d, null, 1));
  console.log(A.id || "?", o.finalHash, "| fold contact", d.firstFoldContactT, "prone", d.proneT, "| slide", d.sweepMeasures.slidePathM, JSON.stringify(d.sweepMeasures.stopped), "| final", d.sweepMeasures.finalState.class);
  for (const [lab, s] of Object.entries(d.milestones)) console.log(" ", lab.padEnd(16), s.t, "knee@pel", JSON.stringify(s.knee_inPelvis), "|hipL", JSON.stringify(s.hip_L), "kneeL", s.knee_L, "ank", JSON.stringify(s.ankle_L), "|boot sd", s.foldBoot.soleDownCos, "toeY", s.foldBoot.toeY, "heelY", s.foldBoot.heelY, "| pel r/p", s.pelvis.roll, s.pelvis.pitch, "belly", s.trunk.bellyDownY, "head", s.head.y, "| vh", s.vh, "Lroll", s.angMomRoll, "| auth", JSON.stringify(s.authority));
  console.log("  roll ledger (2 s):", JSON.stringify(d.rollLedger2s)); console.log("  limits:", JSON.stringify((d.sweepMeasures.climits || []).filter(l => l.beyondDeg >= 1))); }

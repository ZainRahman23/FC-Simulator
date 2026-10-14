// SP2D runner: a candidate on a RUN-1 run-in with the TEMPORARY non-stud body friction F37.5 (×0.375, studs unchanged; not canonical, not
// recalibrated), 6 s. A.mode "sp2d" → sp2d_cand.mjs; anything else → sp2c_run.runC (SP2C "sp2c" / SP2A flight opts).
// usage (worktree root): node sp2d_run.mjs --runin <run1g_4.608.json> --opts <opts.json | '{json}'> [--out rec.json.gz] [--diag out.json]
import fs from "fs";
const L = await import(new URL("../../slide_phys1/scripts/sp_lib.mjs", import.meta.url).href), RC = await import(new URL("../../sp2c/scripts/sp2c_run.mjs", import.meta.url).href);
const FC = await import(new URL("../../sp2a/fsweep/scripts/fs_contact.mjs", import.meta.url).href), SD = await import(new URL("./sp2d_cand.mjs", import.meta.url).href), DD = await import(new URL("./sp2d_diag.mjs", import.meta.url).href);
export const TEMP_M = RC.TEMP_M;
export async function runD(runin, A, m = TEMP_M, steps = 1440) { if (A.mode !== "sp2d") return RC.runC(runin, A, m, steps); const o = await SD.runSP2D(runin, A, steps, { setup: FC.sweepSetup(m) }); o.fsweep = { m, id: "F" + (m * 100), temporary: true }; return o; }
if (process.argv[1] && process.argv[1].endsWith("sp2d_run.mjs")) { const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
  const os = arg("opts", "{}"), A = os.trim().startsWith("{") ? JSON.parse(os) : JSON.parse(fs.readFileSync(os)), o = await runD(arg("runin"), A, TEMP_M, +arg("steps", "1440"));
  if (arg("out")) L.writeGz(arg("out"), o); const d = DD.diagnoseD(o, TEMP_M); if (arg("diag")) fs.writeFileSync(arg("diag"), JSON.stringify(d, null, 1)); const s = d.summary;
  console.log(A.id || A.mode || "?", o.finalHash, "| contact", d.firstFoldContactT, "stop", d.stopT, "slide", d.slidePathM, "| first", JSON.stringify(s.firstContact), "| postShare N/B", s.handL.normalShare, s.handL.brakeShare, "| shL peak", s.peakShoulderL, "| chestDown", s.chestDownT, "upright", s.uprightS, "lying from", s.lyingFromT, "| trunk", JSON.stringify(s.trunkAt), "| end", JSON.stringify(s.end), "| fail", JSON.stringify(s.failures), "wb", s.wholeBody, "minAuth", s.minAuthority);
  console.log("  limits", JSON.stringify((s.climits || []).filter(e => e.beyondDeg >= 1).map(e => `${e.id} ${e.beyondDeg}/${e.durS}`))); }

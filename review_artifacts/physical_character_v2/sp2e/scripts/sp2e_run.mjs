// SP2E runner: a candidate on a RUN-1 run-in at the TEMPORARY friction F37.5 (unchanged; not recalibrated), 6 s. A.mode "sp2e" → sp2e_cand.mjs;
// "sp2d" → sp2d_cand.mjs; anything else → sp2c_run.runC (SP2C "sp2c" / SP2A flight opts).
const RD = await import(new URL("../../sp2d/scripts/sp2d_run.mjs", import.meta.url).href), FC = await import(new URL("../../sp2a/fsweep/scripts/fs_contact.mjs", import.meta.url).href), SE = await import(new URL("./sp2e_cand.mjs", import.meta.url).href);
export const TEMP_M = RD.TEMP_M;
export async function runE(runin, A, m = TEMP_M, steps = 1440) { if (A.mode !== "sp2e") return RD.runD(runin, A, m, steps); const o = await SE.runSP2E(runin, A, steps, { setup: FC.sweepSetup(m) }); o.fsweep = { m, id: "F" + (m * 100), temporary: true }; return o; }

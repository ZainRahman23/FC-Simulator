// SP2F runner: a candidate on a RUN-1 run-in at the TEMPORARY friction F37.5 (unchanged), 6 s. A.mode "sp2f" → sp2f_cand.mjs; anything else → sp2e_run.runE
// (SP2E / SP2D / SP2C / SP2A opts). Returns the record and the compiled candidate choreography (for the target columns of sp2f_diag).
const RE = await import(new URL("../../sp2e/scripts/sp2e_run.mjs", import.meta.url).href), FC = await import(new URL("../../sp2a/fsweep/scripts/fs_contact.mjs", import.meta.url).href), SF = await import(new URL("./sp2f_cand.mjs", import.meta.url).href);
const SE = await import(new URL("../../sp2e/scripts/sp2e_cand.mjs", import.meta.url).href), SD = await import(new URL("../../sp2d/scripts/sp2d_cand.mjs", import.meta.url).href);
export const TEMP_M = RE.TEMP_M;
export async function runF(runin, A, m = TEMP_M, steps = 1440) { if (A.mode !== "sp2f") { const o = await RE.runE(runin, A, m, steps); const sp = o.speedTackler || 5; o.chorForDiag = A.mode === "sp2e" ? SE.sp2eCand(sp, A).chor : A.mode === "sp2d" ? SD.sp2dCand(sp, A).chor : null; o.candLead = o.candLead ?? 0.06; return o; }
  const o = await SF.runSP2F(runin, A, steps, { setup: FC.sweepSetup(m) }); o.fsweep = { m, id: "F" + (m * 100), temporary: true }; o.chorForDiag = SF.sp2fCand(o.speedTackler, A).chor; return o; }

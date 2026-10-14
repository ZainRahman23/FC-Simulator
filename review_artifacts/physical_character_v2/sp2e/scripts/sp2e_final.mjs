// SP2E final evaluation — A | SP2C | SP2D | SP2E on the 3 RUN-1 run-ins (4.5 / 5.0 / 5.5 m/s) at the TEMPORARY friction F37.5 (unchanged), 6 s. A = SP2A,
// SP2C / SP2D their evidence opts, SP2E = the chosen SP2E opts. Per run: hash; the SP2E timing diagnosis (sp2e_diag: series every 12.5 ms, events, values at
// +0.10 / 0.20 / 0.25 / 0.30 / 0.50 / 1.00 s, load shares), the SP2D summary (hand / torso shares of normal and braking, peak shoulder, chest-down, end posture),
// the SP2C folded-leg milestones, joint limits, the slide ledger (horizontal closure: contacts are the only horizontal force), studs, the SP2E cost.
// Determinism: SP2E at 5.0 m/s re-run. Records (outside Git) for the renders. usage (worktree root): node sp2e_final.mjs --opts <SP2E.json> --records <dir> --out <SP2E_eval.json>
import fs from "fs";
const B0 = new URL("../../", import.meta.url).href, RE = await import(new URL("./sp2e_run.mjs", import.meta.url).href), DE = await import(new URL("./sp2e_diag.mjs", import.meta.url).href), SE = await import(new URL("./sp2e_search.mjs", import.meta.url).href);
const DD = await import(B0 + "sp2d/scripts/sp2d_diag.mjs"), DG = await import(B0 + "sp2c/scripts/sp2c_diag.mjs"), SS = await import(B0 + "sp2c/scripts/sp2c_search.mjs"), P2 = await import(B0 + "slide_phys2/scripts/sp2_param.mjs");
const L = await import(B0 + "slide_phys1/scripts/sp_lib.mjs"), RG = await import(B0 + "slide_phys2/scripts/sp2_regions.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, REC = arg("records"); fs.mkdirSync(REC, { recursive: true });
const S = "/private/tmp/claude-501/-Users-zainrahman/06d7a98e-781e-4eaa-9a32-e638c168c8f4/scratchpad/sp2a/", RUNINS = { "4.5": `${S}run1g_4.147.json`, "5.0": `${S}run1g_4.608.json`, "5.5": `${S}run1g_5.069.json` };
const rj = (u) => JSON.parse(fs.readFileSync(new URL(u, import.meta.url))), CANDS = { A: rj("../../sp2a/evidence/SP2A_opts.json"), SP2C: rj("../../sp2c/evidence/SP2C_opts.json"), SP2D: rj("../../sp2d/evidence/SP2D_opts.json"), SP2E: JSON.parse(fs.readFileSync(arg("opts"))) };
const one = async (key, A, sp) => { const ri = RUNINS[sp], o = await RE.runE(ri, A, RE.TEMP_M, 1440), d = DG.diagnose(o, RE.TEMP_M), m2 = P2.M.measure(o), c2 = P2.cost(m2, o.climits), cC = SS.costSP2C(o, d, m2, c2, L, RG);
  const e = DE.diagnoseE(o, RE.TEMP_M), dd = DD.diagnoseD(o, RE.TEMP_M), c = SE.costSP2E(e, dd, cC), tag = `${key}_${ri.split("/").pop().replace(".json", "")}`; L.writeGz(`${REC}/${tag}.json.gz`, o); fs.writeFileSync(`${REC}/${tag}.diagE.json`, JSON.stringify(e));
  const ev = e.events; console.log(key.padEnd(5), sp, o.finalHash, "| touch", ev.handFirstTouch, "load", ev.handMeaningfulLoad, "est", ev.established, "chest", ev.chestDown, "upright", ev.uprightS, "shPk", ev.peakShoulderL, "| hand N/B", dd.summary.handL.normalShare, dd.summary.handL.brakeShare, "| slide", e.slidePathM, "| cost", c.total.toFixed(2));
  return { speed: sp, hash: o.finalHash, timing: { firstFoldContactT: e.firstFoldContactT, stopT: e.stopT, slidePathM: e.slidePathM, cols: e.cols, rows: e.rows, events: ev, marks: e.marks, loadShare: e.loadShare, minAuthority: e.minAuthority, failures: e.failures, wholeBody: e.wholeBody, end: e.end },
    summaryD: dd.summary, fold: Object.fromEntries(Object.entries(d.milestones).filter(([k]) => ["firstFoldContact", "+100ms", "+500ms"].includes(k)).map(([k, v]) => [k, { t: v.t, knee_inPelvis: v.knee_inPelvis, knee_L: v.knee_L, hip_L: v.hip_L, ankle_L: v.ankle_L, foldBoot: v.foldBoot }])),
    ledgerSlide: d.sweepMeasures.ledgerSlide, studs: d.sweepMeasures.studs, climits: d.sweepMeasures.climits, cost: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, +(+v).toFixed(3)])) }; };
const out = { tool: "sp2e_final.mjs", friction: { m: RE.TEMP_M, id: "F37.5", temporary: true, note: "unchanged from SP2D — not recalibrated" }, opts: CANDS, runs: { A: {}, SP2C: {}, SP2D: {}, SP2E: {} } };
for (const sp of Object.keys(RUNINS)) for (const k of ["A", "SP2C", "SP2D", "SP2E"]) out.runs[k][sp] = await one(k, CANDS[k], sp);
const re = await RE.runE(RUNINS["5.0"], CANDS.SP2E, RE.TEMP_M, 1440); out.determinism = { first: out.runs.SP2E["5.0"].hash, rerun: re.finalHash, identical: re.finalHash === out.runs.SP2E["5.0"].hash };
console.log("determinism", JSON.stringify(out.determinism)); fs.writeFileSync(arg("out"), JSON.stringify(out));

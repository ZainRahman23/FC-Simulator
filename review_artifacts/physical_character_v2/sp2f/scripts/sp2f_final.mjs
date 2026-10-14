// SP2F final evaluation — SP2D | SP2E | SP2F on the 3 RUN-1 run-ins (4.5 / 5.0 / 5.5 m/s) at the TEMPORARY friction F37.5 (unchanged), 6 s. Per run: hash; the
// SP2F trajectory-quality diagnosis (sp2f_diag: series every 8 ms with trunk angle / rate / acceleration, pelvis roll / rates, posting shoulder / elbow, hand
// height / contact / normal / tangential speed / braking, authored-target rates, authority; spikes with context; post-landing quality; the posting-hand
// contact record); the SP2E timing events and load shares; the SP2C folded-leg milestones; joint limits; the slide ledger (horizontal closure); studs.
// Determinism: SP2F at 5.0 m/s re-run. Records (outside Git) for the renders. usage (worktree root): node sp2f_final.mjs --opts <SP2F.json> --records <dir> --out <SP2F_eval.json>
import fs from "fs";
const B0 = new URL("../../", import.meta.url).href, RF = await import(new URL("./sp2f_run.mjs", import.meta.url).href), DF = await import(new URL("./sp2f_diag.mjs", import.meta.url).href);
const DE = await import(B0 + "sp2e/scripts/sp2e_diag.mjs"), DD = await import(B0 + "sp2d/scripts/sp2d_diag.mjs"), DG = await import(B0 + "sp2c/scripts/sp2c_diag.mjs"), L = await import(B0 + "slide_phys1/scripts/sp_lib.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, REC = arg("records"); fs.mkdirSync(REC, { recursive: true });
const S = "/private/tmp/claude-501/-Users-zainrahman/06d7a98e-781e-4eaa-9a32-e638c168c8f4/scratchpad/sp2a/", RUNINS = { "4.5": `${S}run1g_4.147.json`, "5.0": `${S}run1g_4.608.json`, "5.5": `${S}run1g_5.069.json` };
const rj = (u) => JSON.parse(fs.readFileSync(new URL(u, import.meta.url))), CANDS = { SP2D: rj("../../sp2d/evidence/SP2D_opts.json"), SP2E: rj("../../sp2e/evidence/SP2E_opts.json"), SP2F: JSON.parse(fs.readFileSync(arg("opts"))) };
const one = async (key, A, sp) => { const ri = RUNINS[sp], o = await RF.runF(ri, A, RF.TEMP_M, 1440), f = DF.diagnoseF(o, o.chorForDiag), e = DE.diagnoseE(o, RF.TEMP_M), dd = DD.diagnoseD(o, RF.TEMP_M), d = DG.diagnose(o, RF.TEMP_M);
  const tag = `${key}_${ri.split("/").pop().replace(".json", "")}`; delete o.chorForDiag; L.writeGz(`${REC}/${tag}.json.gz`, o); const pq = f.postLanding || {}, h = f.hand || {};
  console.log(key.padEnd(5), sp, o.finalHash, "| post-landing rate", pq.peakTrunkRateDegS, "tip", pq.peakTipDegS, "rms", pq.rmsTrunkAccDegS2, "| hand", h.firstContact, "gaps", JSON.stringify(h.gaps), "slide", h.slideDistM, "| est", e.events.established, "chest", e.events.chestDown, "| slide", e.slidePathM);
  return { speed: sp, hash: o.finalHash, f, events: e.events, loadShare: e.loadShare, minAuthority: e.minAuthority, failures: e.failures, wholeBody: e.wholeBody, slidePathM: e.slidePathM, end: dd.summary.end, handShares: { normal: dd.summary.handL.normalShare, braking: dd.summary.handL.brakeShare },
    fold: Object.fromEntries(Object.entries(d.milestones).filter(([k]) => ["firstFoldContact", "+100ms", "+500ms"].includes(k)).map(([k, v]) => [k, { t: v.t, knee_inPelvis: v.knee_inPelvis, knee_L: v.knee_L, foldBoot: v.foldBoot }])),
    ledgerSlide: d.sweepMeasures.ledgerSlide, studs: d.sweepMeasures.studs, climits: d.sweepMeasures.climits }; };
const out = { tool: "sp2f_final.mjs", friction: { m: RF.TEMP_M, id: "F37.5", temporary: true, note: "unchanged — not recalibrated" }, opts: CANDS, runs: { SP2D: {}, SP2E: {}, SP2F: {} } };
for (const sp of Object.keys(RUNINS)) for (const k of ["SP2D", "SP2E", "SP2F"]) out.runs[k][sp] = await one(k, CANDS[k], sp);
const re = await RF.runF(RUNINS["5.0"], CANDS.SP2F, RF.TEMP_M, 1440); out.determinism = { first: out.runs.SP2F["5.0"].hash, rerun: re.finalHash, identical: re.finalHash === out.runs.SP2F["5.0"].hash };
console.log("determinism", JSON.stringify(out.determinism)); fs.writeFileSync(arg("out"), JSON.stringify(out));

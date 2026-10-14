// SP2D final evaluation — the critical test A | SP2C | SP2D (REFERENCE measured separately, evidence/reference_sp2d_measures.json): each candidate on the
// 3 RUN-1 run-ins (4.5 / 5.0 / 5.5 m/s) at the TEMPORARY friction F37.5 (not recalibrated), 6 s. A = SP2A (sp2a/evidence/SP2A_opts.json), SP2C =
// sp2c/evidence/SP2C_opts.json, SP2D = the chosen SP2D opts. Per run: hash; the SP2D critical-test diagnosis (sp2d_diag: trunk angle, posting-shoulder
// elevation, hand / forearm / torso / head contact timing and load, pelvis roll, chest-down, authority, failures, end posture, series every 25 ms); the
// SP2C diagnosis milestones (folded knee / boot at first contact etc.); joint limits; the slide braking ledger with its horizontal closure; the SP2D cost.
// Determinism: SP2D at 5.0 m/s re-run. Records (outside Git) are written for the renders.
// usage (worktree root): node sp2d_final.mjs --opts <SP2D opts.json> --records <dir outside git> --out <SP2D_eval.json>
import fs from "fs";
const B0 = new URL("../../", import.meta.url).href, RD = await import(new URL("./sp2d_run.mjs", import.meta.url).href), DD = await import(new URL("./sp2d_diag.mjs", import.meta.url).href), SDS = await import(new URL("./sp2d_search.mjs", import.meta.url).href);
const DG = await import(B0 + "sp2c/scripts/sp2c_diag.mjs"), SS = await import(B0 + "sp2c/scripts/sp2c_search.mjs"), P2 = await import(B0 + "slide_phys2/scripts/sp2_param.mjs"), L = await import(B0 + "slide_phys1/scripts/sp_lib.mjs"), RG = await import(B0 + "slide_phys2/scripts/sp2_regions.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, REC = arg("records"); fs.mkdirSync(REC, { recursive: true });
const S = "/private/tmp/claude-501/-Users-zainrahman/06d7a98e-781e-4eaa-9a32-e638c168c8f4/scratchpad/sp2a/", RUNINS = { "4.5": `${S}run1g_4.147.json`, "5.0": `${S}run1g_4.608.json`, "5.5": `${S}run1g_5.069.json` };
const rj = (u) => JSON.parse(fs.readFileSync(new URL(u, import.meta.url))), CANDS = { A: rj("../../sp2a/evidence/SP2A_opts.json"), SP2C: rj("../../sp2c/evidence/SP2C_opts.json"), SP2D: JSON.parse(fs.readFileSync(arg("opts"))) };
const one = async (key, A, sp) => { const ri = RUNINS[sp], o = await RD.runD(ri, A, RD.TEMP_M, 1440), d = DG.diagnose(o, RD.TEMP_M), m2 = P2.M.measure(o), c2 = P2.cost(m2, o.climits), cC = SS.costSP2C(o, d, m2, c2, L, RG), dd = DD.diagnoseD(o, RD.TEMP_M), c = SDS.costSP2D(o, dd, cC);
  const tag = `${key}_${ri.split("/").pop().replace(".json", "")}`; L.writeGz(`${REC}/${tag}.json.gz`, o); fs.writeFileSync(`${REC}/${tag}.diagD.json`, JSON.stringify(dd, null, 1)); fs.writeFileSync(`${REC}/${tag}.diag.json`, JSON.stringify(d, null, 1));
  const s = dd.summary; console.log(key.padEnd(5), sp, o.finalHash, "| post", s.firstContact.handL ?? "–", "N/B", s.handL.normalShare, s.handL.brakeShare, "shL", s.peakShoulderL, "| torso", s.firstContact.torso ?? "–", "| chestDown", s.chestDownT ?? "never", "| upright", s.uprightS, "s | trunk", JSON.stringify(s.trunkAt), "| end", s.end.class, "| slide", dd.slidePathM, "| cost", c.total.toFixed(2));
  return { speed: sp, hash: o.finalHash, critical: { firstFoldContactT: dd.firstFoldContactT, stopT: dd.stopT, slidePathM: dd.slidePathM, summary: s, series: dd.series, seriesCols: dd.seriesCols },
    sp2cMilestones: Object.fromEntries(Object.entries(d.milestones).filter(([k]) => ["firstFoldContact", "+100ms", "+500ms"].includes(k)).map(([k, v]) => [k, { t: v.t, knee_inPelvis: v.knee_inPelvis, knee_L: v.knee_L, ankle_L: v.ankle_L, foldBoot: v.foldBoot }])),
    ledgerSlide: d.sweepMeasures.ledgerSlide, studs: d.sweepMeasures.studs, climits: d.sweepMeasures.climits, cost: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, +(+v).toFixed(3)])) }; };
const out = { tool: "sp2d_final.mjs", friction: { m: RD.TEMP_M, id: "F37.5", temporary: true, note: "development value — not canonical, not recalibrated" }, opts: CANDS, runs: { A: {}, SP2C: {}, SP2D: {} } };
for (const sp of Object.keys(RUNINS)) for (const k of ["A", "SP2C", "SP2D"]) out.runs[k][sp] = await one(k, CANDS[k], sp);
const re = await RD.runD(RUNINS["5.0"], CANDS.SP2D, RD.TEMP_M, 1440); out.determinism = { first: out.runs.SP2D["5.0"].hash, rerun: re.finalHash, identical: re.finalHash === out.runs.SP2D["5.0"].hash };
console.log("determinism", JSON.stringify(out.determinism)); fs.writeFileSync(arg("out"), JSON.stringify(out, null, 1));

// SP2F3 final evaluation — SP2F (first pass) | SP2F2 (addendum) | SP2F3 (posting arm corrected from the hand outward) on the 3 RUN-1 run-ins (4.5 / 5.0 / 5.5 m/s)
// at the TEMPORARY friction F37.5 (unchanged), 6 s. Per run: hash; the HAND-RELATIVE posting-arm diagnostic (sp2f3_armrel: hand−pelvis, hand−shoulder,
// hand height, elbow, upper-arm / forearm orientation, shoulder / elbow angular velocity, hand speed, image-plane projection); trajectory quality (sp2f_diag);
// lateral orientation (sp2f2_lat); landing shape; SP2E events; folded-leg checks; joint limits; slide ledger; studs. Determinism: SP2F3 at 5.0 m/s re-run.
// Robustness: the chosen candidate under perturbations (from the sweep log). Records (outside Git) for the renders.
// usage (worktree root): node sp2f3_final.mjs --opts <SP2F3_opts.json> --records <dir> --out <SP2F3_eval.json> [--robust <sweep.jsonl> --robustPrefix Z_]
import fs from "fs";
const B0 = new URL("../../../", import.meta.url).href, EV = await import(B0 + "sp2f/v2/scripts/sp2f2_eval.mjs"), LD = await import(B0 + "sp2f/v2/scripts/sp2f2_lat.mjs"), AR = await import(new URL("./sp2f3_armrel.mjs", import.meta.url).href);
const DF = await import(B0 + "sp2f/scripts/sp2f_diag.mjs"), RF = await import(B0 + "sp2f/scripts/sp2f_run.mjs"), DE = await import(B0 + "sp2e/scripts/sp2e_diag.mjs"), DD = await import(B0 + "sp2d/scripts/sp2d_diag.mjs");
const DG = await import(B0 + "sp2c/scripts/sp2c_diag.mjs"), L = await import(B0 + "slide_phys1/scripts/sp_lib.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, REC = arg("records"); fs.mkdirSync(REC, { recursive: true });
const rj = (u) => JSON.parse(fs.readFileSync(new URL(u, import.meta.url))), CANDS = { SP2F: rj("../../evidence/SP2F_opts.json"), SP2F2: rj("../../v2/evidence/SP2F2_opts.json"), SP2F3: JSON.parse(fs.readFileSync(arg("opts"))) };
const one = async (key, X, sp) => { const ri = EV.RUNINS[sp], o = await EV.runX(ri, X), f = DF.diagnoseF(o, o.chorForDiag), lat = LD.lateralDiag(o), ar = AR.armRel(o), e = DE.diagnoseE(o, RF.TEMP_M), dd = DD.diagnoseD(o, RF.TEMP_M), d = DG.diagnose(o, RF.TEMP_M);
  const x = EV.shape(f), tag = `${key}_${ri.split("/").pop().replace(".json", "")}`; delete o.chorForDiag; L.writeGz(`${REC}/${tag}.json.gz`, o); const s = ar.summary || {}, q = f.postLanding || {}, h = f.hand || {};
  console.log(key.padEnd(6), sp, o.finalHash, "| hand", h.firstContact, "gaps", JSON.stringify(h.gaps), "| hand−pelvis disp", s.handPelvisTravelDisp, "outboard", JSON.stringify(s.handOutboardOfShoulder), "elbow", JSON.stringify(s.elbow), "upperArm", JSON.stringify(s.upperArmElev), "| rate", q.peakTrunkRateDegS, "rms", q.rmsTrunkAccDegS2, "rock", x.backRockDeg, "| chest", e.events.chestDown, "slide", e.slidePathM);
  return { speed: sp, hash: o.finalHash, f, lat, ar, shape: x, events: e.events, loadShare: e.loadShare, minAuthority: e.minAuthority, failures: e.failures, wholeBody: e.wholeBody, slidePathM: e.slidePathM, handShares: { normal: dd.summary.handL.normalShare, braking: dd.summary.handL.brakeShare },
    fold: Object.fromEntries(Object.entries(d.milestones).filter(([k]) => ["firstFoldContact", "+100ms", "+500ms"].includes(k)).map(([k, v]) => [k, { t: v.t, knee_inPelvis: v.knee_inPelvis, knee_L: v.knee_L, foldBoot: v.foldBoot }])),
    ledgerSlide: d.sweepMeasures.ledgerSlide, studs: d.sweepMeasures.studs, climits: d.sweepMeasures.climits }; };
const out = { tool: "sp2f3_final.mjs", friction: { m: RF.TEMP_M, id: "F37.5", temporary: true, note: "unchanged — not recalibrated" }, opts: CANDS, runs: { SP2F: {}, SP2F2: {}, SP2F3: {} } };
for (const sp of Object.keys(EV.RUNINS)) for (const k of ["SP2F", "SP2F2", "SP2F3"]) out.runs[k][sp] = await one(k, CANDS[k], sp);
const re = await EV.runX(EV.RUNINS["5.0"], CANDS.SP2F3); out.determinism = { first: out.runs.SP2F3["5.0"].hash, rerun: re.finalHash, identical: re.finalHash === out.runs.SP2F3["5.0"].hash };
const rb = arg("robust"); if (rb && fs.existsSync(rb)) { const pre = arg("robustPrefix", "Z_"), rows = fs.readFileSync(rb, "utf8").trim().split("\n").map(l => JSON.parse(l).r).filter(r => r.id.startsWith(pre));
  out.robustness = { family: pre + "* (= SP2F3 ± lean start ± 30 ms, strut damping ± 30 %, hand hold ± 30 %, reach end ± 30 ms, lean ± 2°)", runs: rows.length, chestDown: rows.filter(r => r.chest != null).length, withHandGaps: rows.filter(r => r.hand.gaps > 0).length,
    backRockOver3deg: rows.filter(r => r.x.backRockDeg > 3).length, maxPeakTrunkRate: Math.max(...rows.map(r => r.q.rate)), elbowOver120: rows.filter(r => (r.ar.elbow || [0, 0])[1] > 120).length, minOutboard: Math.min(...rows.map(r => (r.ar.handOutboardOfShoulder || [0, 0])[0])),
    list: rows.map(r => ({ id: r.id, speed: r.speed, gaps: r.hand.gaps, rock: r.x.backRockDeg, rate: r.q.rate, elbow: r.ar.elbow, chest: r.chest })) }; }
console.log("determinism", JSON.stringify(out.determinism), "robustness", out.robustness ? JSON.stringify({ ...out.robustness, list: undefined }) : "-"); fs.writeFileSync(arg("out"), JSON.stringify(out));

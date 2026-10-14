// SP2F addendum final evaluation — SP2F (first pass, sp2f/evidence/SP2F_opts.json) | SP2F2 (addendum) on the 3 RUN-1 run-ins (4.5 / 5.0 / 5.5 m/s) at the
// TEMPORARY friction F37.5 (unchanged), 6 s. Per run: hash; the trajectory-quality diagnosis (sp2f_diag); the persistent-lateral-orientation diagnosis
// (sp2f2_lat: pelvis roll, chest normal, trunk roll, shoulder / hip heights, contact regions, classification, established lateral slide, excursions);
// the posting-arm record (first contact, continuity, gaps, sliding distance, normal load, shoulder / elbow angles AND actuator effort = |τ| / capacity
// over time, the support regulator's command); landing shape (pelvis-roll kick, backward rocks); SP2E events; folded-leg checks; joint limits; slide
// ledger; studs. Determinism: SP2F2 at 5.0 m/s re-run. Records (outside Git) for the renders.
// usage (worktree root): node sp2f2_final.mjs --opts <SP2F2_opts.json> --records <dir> --out <SP2F2_eval.json> [--robust <sweep.jsonl>]
import fs from "fs";
const B0 = new URL("../../../", import.meta.url).href, EV = await import(new URL("./sp2f2_eval.mjs", import.meta.url).href), LD = await import(new URL("./sp2f2_lat.mjs", import.meta.url).href);
const DF = await import(B0 + "sp2f/scripts/sp2f_diag.mjs"), RF = await import(B0 + "sp2f/scripts/sp2f_run.mjs"), DE = await import(B0 + "sp2e/scripts/sp2e_diag.mjs"), DD = await import(B0 + "sp2d/scripts/sp2d_diag.mjs");
const DG = await import(B0 + "sp2c/scripts/sp2c_diag.mjs"), L = await import(B0 + "slide_phys1/scripts/sp_lib.mjs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, REC = arg("records"); fs.mkdirSync(REC, { recursive: true });
const rj = (u) => JSON.parse(fs.readFileSync(new URL(u, import.meta.url))), CANDS = { SP2F: rj("../../evidence/SP2F_opts.json"), SP2F2: JSON.parse(fs.readFileSync(arg("opts"))) };
const r3 = (x) => x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000;
// posting-arm series every 2 steps: t rel, hand normal (BW), shoulder elevation, elbow flexion (from sp2f_diag), support command (N), shoulder / elbow effort
function armSeries(o, f) { const JN = L.JN.map(j => j.name), ks = JN.indexOf("shoulder_L"), ke = JN.indexOf("elbow_L"), I = Object.fromEntries(f.cols.map((c, i) => [c, i])), t0 = f.firstFoldContactT;
  const byT = new Map(o.recs.map(r => [Math.round(r.t * 240), r])), lg = new Map((o.ctrlLog || []).map(r => [Math.round(r.t * 240), r]));
  return f.rows.map(row => { const n = Math.round(row[I.t] * 240), r = byT.get(n), c = lg.get(n - 1) || lg.get(n), eff = (k) => r && r.actT ? r3(Math.max(0, ...r.actT.filter(a => a[0] === k).map(a => a[4]))) : null;
    return [row[I.trel], row[I.handN], row[I.shoulderL], row[I.elbowL], c && c.post ? c.post.F : null, eff(ks), eff(ke)]; }); }
const one = async (key, X, sp) => { const ri = EV.RUNINS[sp], o = await EV.runX(ri, X), f = DF.diagnoseF(o, o.chorForDiag), lat = LD.lateralDiag(o), e = DE.diagnoseE(o, RF.TEMP_M), dd = DD.diagnoseD(o, RF.TEMP_M), d = DG.diagnose(o, RF.TEMP_M);
  const arm = EV.armRecord(o, f), x = EV.shape(f), series = armSeries(o, f), tag = `${key}_${ri.split("/").pop().replace(".json", "")}`; delete o.chorForDiag; L.writeGz(`${REC}/${tag}.json.gz`, o);
  const s = lat.summary, q = f.postLanding || {}, h = f.hand || {};
  console.log(key.padEnd(6), sp, o.finalHash, "| upright", s.uprightS, "est.lat", s.establishedLateral, "chest", s.chestDownS, "exc", s.excursionsAfterEstS, "| rate", q.peakTrunkRateDegS, "rms", q.rmsTrunkAccDegS2, "kick", x.rollKick, "rock", x.backRockDeg, "| hand", h.firstContact, "gaps", JSON.stringify(h.gaps), "slide", h.slideDistM, "| slide", e.slidePathM);
  return { speed: sp, hash: o.finalHash, f, lat, arm, armSeries: { cols: ["trel", "handN", "shoulderL", "elbowL", "supportF", "effShoulder", "effElbow"], rows: series }, shape: x, events: e.events, loadShare: e.loadShare, minAuthority: e.minAuthority,
    failures: e.failures, wholeBody: e.wholeBody, slidePathM: e.slidePathM, end: dd.summary.end, handShares: { normal: dd.summary.handL.normalShare, braking: dd.summary.handL.brakeShare },
    fold: Object.fromEntries(Object.entries(d.milestones).filter(([k]) => ["firstFoldContact", "+100ms", "+500ms"].includes(k)).map(([k, v]) => [k, { t: v.t, knee_inPelvis: v.knee_inPelvis, knee_L: v.knee_L, foldBoot: v.foldBoot }])),
    ledgerSlide: d.sweepMeasures.ledgerSlide, studs: d.sweepMeasures.studs, climits: d.sweepMeasures.climits }; };
const out = { tool: "sp2f2_final.mjs", friction: { m: RF.TEMP_M, id: "F37.5", temporary: true, note: "unchanged — not recalibrated" }, opts: CANDS, runs: { SP2F: {}, SP2F2: {} } };
for (const sp of Object.keys(EV.RUNINS)) for (const k of ["SP2F", "SP2F2"]) out.runs[k][sp] = await one(k, CANDS[k], sp);
const re = await EV.runX(EV.RUNINS["5.0"], CANDS.SP2F2); out.determinism = { first: out.runs.SP2F2["5.0"].hash, rerun: re.finalHash, identical: re.finalHash === out.runs.SP2F2["5.0"].hash };
// robustness: the chosen candidate under small perturbations (release time ±5 ms, contact press ±15 N, lean ±2°, reach end ±50 ms) at 3 speeds (from the sweep log)
const rb = arg("robust"); if (rb && fs.existsSync(rb)) { const pre = arg("robustPrefix", "R30_"), rows = fs.readFileSync(rb, "utf8").trim().split("\n").map(l => JSON.parse(l).r).filter(r => r.id.startsWith(pre));
  out.robustness = { family: pre + " (= SP2F2) ± perturbations", runs: rows.length, chestDown: rows.filter(r => r.e.events.chestDown != null).length, withHandGaps: rows.filter(r => (r.hand && r.hand.gaps || []).length).length,
    backRockOver3deg: rows.filter(r => r.x.backRockDeg > 3).length, maxPeakTrunkRate: Math.max(...rows.map(r => r.q.peakTrunkRateDegS)), maxUprightS: Math.max(...rows.map(r => r.lat.uprightS)),
    list: rows.map(r => ({ id: r.id, speed: r.speed, chestDown: r.e.events.chestDown, gaps: (r.hand && r.hand.gaps || []).length, rock: r.x.backRockDeg, rate: r.q.peakTrunkRateDegS, upright: r.lat.uprightS })) }; }
console.log("determinism", JSON.stringify(out.determinism), "robustness", out.robustness ? JSON.stringify({ ...out.robustness, list: undefined }) : "-"); fs.writeFileSync(arg("out"), JSON.stringify(out));

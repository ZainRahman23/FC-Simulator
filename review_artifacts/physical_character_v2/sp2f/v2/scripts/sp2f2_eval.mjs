// SP2F addendum evaluation of candidates on the RUN-1 run-ins at the TEMPORARY friction F37.5 (unchanged), 6 s: the SP2F trajectory-quality diagnosis
// (sp2f_diag), the persistent-lateral-orientation diagnosis (sp2f2_lat), the posting-arm record (contact continuity / gaps / sliding distance / normal load
// over time from sp2f_diag; shoulder / elbow ACTUATOR effort = |τ| / capacity from the plant's actuator rows; the support regulator's command), the SP2E
// events, folded-leg checks, limits and the slide. usage (worktree root):
//   node sp2f2_eval.mjs --cands <a.json,b.json | '[{…}]'> [--speeds 4.5,5.0,5.5] [--save dir] [--jsonl out.jsonl]
import fs from "fs";
const B0 = new URL("../../../", import.meta.url).href, SF2 = await import(new URL("./sp2f2_cand.mjs", import.meta.url).href), LD = await import(new URL("./sp2f2_lat.mjs", import.meta.url).href);
const DF = await import(B0 + "sp2f/scripts/sp2f_diag.mjs"), RF = await import(B0 + "sp2f/scripts/sp2f_run.mjs"), DE = await import(B0 + "sp2e/scripts/sp2e_diag.mjs"), DG = await import(B0 + "sp2c/scripts/sp2c_diag.mjs");
const L = await import(B0 + "slide_phys1/scripts/sp_lib.mjs"), FC = await import(B0 + "sp2a/fsweep/scripts/fs_contact.mjs");
const S = "/private/tmp/claude-501/-Users-zainrahman/06d7a98e-781e-4eaa-9a32-e638c168c8f4/scratchpad/sp2a/";
export const RUNINS = { "4.5": `${S}run1g_4.147.json`, "5.0": `${S}run1g_4.608.json`, "5.5": `${S}run1g_5.069.json` };
const r3 = (x) => x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000;
export async function runX(runin, X) { if (X.mode === "sp2f2") { const o = await SF2.runSP2F2(runin, X, 1440, { setup: FC.sweepSetup(RF.TEMP_M) }); o.fsweep = { m: RF.TEMP_M, id: "F37.5", temporary: true }; o.chorForDiag = SF2.sp2f2Cand(o.speedTackler, X).chor; return o; }
  return RF.runF(runin, X, RF.TEMP_M, 1440); }
// posting-arm actuator effort and the support command, from the post trigger to the stop
export function armRecord(o, f) { const JN = L.JN.map(j => j.name), t0 = f.firstFoldContactT, tEnd = t0 + f.stopRel, pf = (o.ctrl || {}).postFrom, out = { postFrom: pf != null ? r3(pf - t0) : null };
  for (const jn of ["shoulder_L", "elbow_L"]) { const k = JN.indexOf(jn); let pk = 0, sum = 0, nn = 0, sat = 0, tauPk = 0; for (const r of o.recs) { if (r.t < t0 || r.t > tEnd || !r.actT) continue; let fr = 0, ta = 0, st = 0;
      for (const a of r.actT) if (a[0] === k) { fr = Math.max(fr, a[4]); ta += a[2] * a[2]; st = Math.max(st, a[5]); } pk = Math.max(pk, fr); sum += fr; nn++; sat += st; tauPk = Math.max(tauPk, Math.sqrt(ta)); }
    out[jn] = { peakEffort: r3(pk), meanEffort: r3(sum / Math.max(1, nn)), saturatedS: r3(sat / 240), peakTauNm: r3(tauPk) }; }
  const lg = (o.ctrlLog || []).filter(r => r.post && r.t >= t0 && r.t <= tEnd); if (lg.length) { const Fs = lg.map(r => r.post.F); out.support = { Fpeak: Math.max(...Fs), Fmean: r3(Fs.reduce((a, b) => a + b, 0) / Fs.length), atFmin: r3(lg.filter(r => r.post.F <= (Fs.reduce((a, b) => Math.min(a, b), 1e9)) + 2).length / lg.length),
    series: [0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1.0, 1.5].map(dt => { const r = lg.find(y => y.t - t0 >= dt); return r ? [dt, r.post.F, r.post.tilt, r.post.ref, r.post.N] : null; }).filter(Boolean) }; }
  return out; }
// landing / descent shape: the pelvis-roll kick at the landing (most negative roll rate, +0.00…+0.20 s, °/s; − = away from the folded side), and the
// descent's backward rocks after +0.10 s (the trunk tilt falling back below its running maximum: largest drop, and the number of drops > 1.5°)
export function shape(f) { const I = Object.fromEntries(f.cols.map((k, i) => [k, i])), rows = f.rows; let kick = 0, mx = -1e9, rock = 0, nRock = 0, inRock = false;
  for (const r of rows) { const tr = r[I.trel]; if (tr >= 0 && tr <= 0.2) kick = Math.min(kick, r[I.rollRate]); if (tr < 0.1 || tr > f.stopRel) continue; const ti = r[I.trunkDeg];
    if (ti > mx) { mx = ti; inRock = false; } else { const d = mx - ti; rock = Math.max(rock, d); if (d > 1.5 && !inRock) { nRock++; inRock = true; } } }
  return { rollKick: r3(kick), backRockDeg: r3(rock), nRocks: nRock }; }
export async function evalX(X, sp, save) { const o = await runX(RUNINS[sp], X), f = DF.diagnoseF(o, o.chorForDiag), lat = LD.lateralDiag(o), e = DE.diagnoseE(o, RF.TEMP_M), d = DG.diagnose(o, RF.TEMP_M), fc = d.milestones.firstFoldContact, arm = armRecord(o, f);
  if (save) { fs.mkdirSync(save, { recursive: true }); const tag = `${X.id}_${sp}`; delete o.chorForDiag; L.writeGz(`${save}/${tag}.json.gz`, o); fs.writeFileSync(`${save}/${tag}.diag.json`, JSON.stringify({ f, lat })); }
  return { id: X.id, speed: sp, hash: o.finalHash, q: f.postLanding, x: shape(f), spikes: { trunkRate: f.spikes.trunkRate, tipW: f.spikes.tipW, rollRate: f.spikes.rollRate }, hand: f.hand, lat: lat.summary, arm,
    e: { events: e.events, loadShare: e.loadShare, minAuthority: e.minAuthority, failures: e.failures, wholeBody: e.wholeBody, slide: e.slidePathM },
    fold: fc ? { knee: fc.knee_inPelvis, soleDown: fc.foldBoot.soleDownCos } : null, limits: (e.climits || []).filter(x => x.beyondDeg >= 1).map(x => `${x.id} ${x.beyondDeg}/${x.durS}`) }; }
export const line = (r) => { const q = r.q || {}, h = r.hand || {}, s = r.lat, m = s.marks, a = r.arm;
  return `${r.id.padEnd(8)} ${r.speed} ${r.hash.slice(0, 8)} | LAT est ${s.establishedLateral} up ${s.uprightS} cd ${s.chestDownS} exc ${s.excursionsAfterEstS} rev ${s.psiReversals} | tilt ${["+0.10", "+0.20", "+0.30", "+0.50", "+1.00"].map(k => m[k] && m[k].tilt).join("/")} roll ${["+0.10", "+0.20", "+0.30", "+0.50", "+1.00"].map(k => m[k] && m[k].roll).join("/")} psi ${["+0.10", "+0.30", "+0.50", "+1.00", "+1.50"].map(k => m[k] && m[k].psi).join("/")}` +
    ` | X kick ${r.x.rollKick} rock ${r.x.backRockDeg}/${r.x.nRocks} | Q rate ${q.peakTrunkRateDegS} tip ${q.peakTipDegS} rms ${q.rmsTrunkAccDegS2} roll ${q.peakRollRateDegS} | HAND ${h.firstContact} gaps ${JSON.stringify(h.gaps)} sl ${h.slideDistM} pkN ${h.peakNormalBW} sh ${JSON.stringify((h.shoulderEvolution || []).map(x => x && x[1]))} el ${JSON.stringify((h.shoulderEvolution || []).map(x => x && x[2]))}` +
    ` | ARM eff sh ${a.shoulder_L.peakEffort}/${a.shoulder_L.meanEffort} el ${a.elbow_L.peakEffort}/${a.elbow_L.meanEffort} F ${a.support ? a.support.Fpeak + "/" + a.support.Fmean : "-"} | est ${r.e.events.established} chest ${r.e.events.chestDown} | slide ${r.e.slide} | auth ${r.e.minAuthority} fail ${JSON.stringify(r.e.failures)} | fold ${r.fold && r.fold.knee.map(x => x.toFixed(2)).join(",")} | lim ${r.limits.join(" ")}`; };
if (process.argv[1] && process.argv[1].endsWith("sp2f2_eval.mjs")) { const arg = (k, dv) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : dv; };
  const cs = arg("cands"), list = cs.trim().startsWith("[") ? JSON.parse(cs) : cs.split(",").map(p => JSON.parse(fs.readFileSync(p))), jl = arg("jsonl");
  for (const X of list) for (const sp of arg("speeds", "5.0").split(",")) { const r = await evalX(X, sp, arg("save")); console.log(line(r)); if (jl) fs.appendFileSync(jl, JSON.stringify({ X, r }) + "\n"); } }

// ═══ physchar2/tools/e1bfix_eval.mjs — the EXTENDED battery of the E1b-fix validation (e1b_fix/E1B_FIX_VALIDATION_PREREG.md §3, set X; written and committed
// before any PSTAR2 run). Criteria code = tools/e1b_eval.mjs judge() (the frozen E1b / E1a computations; rate-equivalent torque-step limits off 240 Hz).
// Sets (classified from each run's own record, not its file name):
//   X-U    unperturbed, right foot lifted, 7 bodies (V2-REF R is in the official set)            gating: the full E1b per-run set
//   X-P5   PF / PB / PL / PR, 8 bodies × L / R minus the official 12                             gating: E1b per-run set + E1b-16
//   X-Y    YAW / YAWN, 8 bodies × L / R minus the official 3                                    gating: E1b per-run set + E1b-16 + E1b-17
//   X-P15  P15, 8 bodies × L / R minus the official 3                                           gating: E1b-7, -8, -9p15, -10, -18
//   X-RATE YAW / YAWN / P15 × {V2-REF, V2-165-62, V2-198-92} × L × {180, 480} Hz                  gating: RATE_GATE ∩ the run's set; the rest reported
//   X-SENS footYaw axial share k ∈ {0.38, 0.90} × YAW / YAWN × the 3 bodies × L                   reported only (capacity sensitivity)
//   X-DET  repeats of V2-REF L YAW and V2-REF L P15 vs the official PSTAR2 runs                    gating: every hash mark identical
// usage: node tools/e1bfix_eval.mjs --ext=<ext runs dir> --official=<official E1b runs dir> [--config=PSTAR2|PSTAR3] [--out=<json>]   (e1b_ta/ reuses it with --config=PSTAR3)
import fs from "fs"; import path from "path"; import zlib from "zlib";
import { judge, idsOfRun, nm } from "./e1b_eval.mjs";
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const EXT = arg("ext", ""), OFF = arg("official", ""), OUT = arg("out", ""), CFG = arg("config", "PSTAR2"), RATERULE = arg("rateRule", "scaled"), rd = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
const BODIES = ["V2-REF", "V2-165-62", "V2-198-92", "V2-175-70", "V2-190-85", "V2-short-legs", "V2-long-legs", "V1-matched"], B3 = BODIES.slice(0, 3);
const RATE_GATE = ["E1a-6", "E1a-7", "E1a-8", "E1a-9", "E1a-9p15", "E1a-10", "E1b-16", "E1b-17", "E1b-18"];
const f2 = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d)), mx = (a) => a.reduce((m, x) => Math.max(m, x), -Infinity), mn = (a) => a.reduce((m, x) => Math.min(m, x), Infinity);
// the expected run list (prereg §3): key = body|side|pert|hz|k|rep
const key = (b, sd, p, hz = 240, k = "nom", rep = false) => `${b}|${sd}|${p}|${hz}|${k}${rep ? "|rep" : ""}`, official = new Set([...BODIES.map(b => key(b, "L", "none")), key("V2-REF", "R", "none"), ...B3.flatMap(b => ["PF", "PB", "PL", "PR", "YAW", "P15"].map(p => key(b, "L", p)))]);
const expect = { "X-U": BODIES.slice(1).map(b => key(b, "R", "none")), "X-P5": BODIES.flatMap(b => ["L", "R"].flatMap(sd => ["PF", "PB", "PL", "PR"].map(p => key(b, sd, p)))).filter(k => !official.has(k)),
  "X-Y": BODIES.flatMap(b => ["L", "R"].flatMap(sd => ["YAW", "YAWN"].map(p => key(b, sd, p)))).filter(k => !official.has(k)), "X-P15": BODIES.flatMap(b => ["L", "R"].map(sd => key(b, sd, "P15"))).filter(k => !official.has(k)),
  "X-RATE": B3.flatMap(b => [180, 480].flatMap(hz => ["YAW", "YAWN", "P15"].map(p => key(b, "L", p, hz)))), "X-SENS": B3.flatMap(b => [0.38, 0.9].flatMap(k => ["YAW", "YAWN"].map(p => key(b, "L", p, 240, k)))),
  "X-DET": [key("V2-REF", "L", "YAW", 240, "nom", true), key("V2-REF", "L", "P15", 240, "nom", true)] };
const runs = {}; for (const f of fs.readdirSync(EXT).filter(f => f.endsWith(".json.gz"))) { const r = rd(path.join(EXT, f)), c = r.cfg, k = key(r.human, r.side, r.pert, Math.round(c.hz), c.footYaw === true ? "nom" : c.footYaw, /_rep\.json\.gz$/.test(f));
  if (runs[k]) throw new Error("duplicate run " + k); runs[k] = { f, r }; }
const out = { sets: {}, runs: {}, missing: [], unexpected: [] }, all = new Set(Object.values(expect).flat());
for (const k of Object.keys(runs)) if (!all.has(k)) out.unexpected.push(k);
// put-down / foot-yaw records (reported)
function extra(r) { const R = r.rows, m = r.stance, pd = (r.putDown || [])[0] || null, fyR = R.filter(x => x.fy && x.fy.length), shareMin = fyR.length ? mn(fyR.flatMap(x => x.fy.map(y => y.share))) : null;
  const fyK = new Set(fyR.length ? fyR[0].fy.map(y => y.k * 3 + y.i) : []), fyAxes = r.actAxes.filter(a => fyK.has(a.k * 3 + a.i));
  return { putDown: pd ? { T: pd.T, contactAfterS: pd.contactT != null ? pd.contactT - pd.t0 : null, handBackAfterS: pd.handBackT != null ? pd.handBackT - pd.t0 : null, v0: pd.v0, a0: pd.a0 } : null,
    footYaw: { shareMin, axes: fyAxes.map(a => ({ axis: a.axis, peakNm: a.peakNm, peakFrac: a.peakFrac, satTicks: a.satTicks, overCap: a.overCap, W: a.W })) } }; }
for (const [set, keys] of Object.entries(expect)) { const S = out.sets[set] = { n: keys.length, ran: 0, gatingFail: [], reportedFail: [], pass: null };
  for (const k of keys) { const x = runs[k]; if (!x) { out.missing.push(k); S.gatingFail.push(k + " (missing)"); continue; } S.ran++;
    if (set === "X-DET") { const [b, sd, p] = k.split("|"), fo = path.join(OFF, `e1b_${b}_${sd}_${p}.json.gz`), a = fs.existsSync(fo) ? rd(fo).hashes : null, h = x.r.hashes, ks = a ? [...new Set([...Object.keys(a), ...Object.keys(h)])] : [], diff = ks.filter(q => a[q] !== h[q]);
      const ok = !!a && ks.length > 1 && diff.length === 0; out.runs[k] = { set, det: `${ks.length - diff.length}/${ks.length} marks identical (end ${a ? a.end : "—"} / ${h.end})`, pass: ok }; if (!ok) S.gatingFail.push(k); continue; }
    const c = x.r.cfg, j = judge(x.r, CFG, { hz: Math.round(c.hz), yawk: c.footYaw, rateRule: RATERULE }), ids = idsOfRun(x.r.pert), gate = set === "X-SENS" ? [] : set === "X-RATE" ? ids.filter(id => RATE_GATE.includes(id)) : ids;
    const fails = ids.filter(id => !(j.C[id] && j.C[id].pass)), gf = fails.filter(id => gate.includes(id)), rf = fails.filter(id => !gate.includes(id));
    out.runs[k] = { set, outcome: j.rep.outcome, gating: gate.map(nm), failsGating: gf.map(nm), failsReported: rf.map(nm), C: Object.fromEntries(ids.map(id => [nm(id), j.C[id] || null])), events: j.rep.events, ...extra(x.r) };
    if (gf.length) S.gatingFail.push(`${k} [${gf.map(nm).join(", ")}]`); if (rf.length) S.reportedFail.push(`${k} [${rf.map(nm).join(", ")}]`); }
  S.pass = set === "X-SENS" ? null : S.gatingFail.length === 0; }
// console report
for (const [set, S] of Object.entries(out.sets)) { console.log(`\n■ ${set}: ${S.pass === null ? "REPORTED" : S.pass ? "PASS" : "FAIL"} (${S.ran}/${S.n} runs)`); if (S.gatingFail.length) console.log("  gating failures: " + S.gatingFail.join("; ")); if (S.reportedFail.length) console.log("  reported (non-gating) failures: " + S.reportedFail.join("; "));
  for (const k of expect[set]) { const x = out.runs[k]; if (!x) continue; if (set === "X-DET") { console.log(`  ${x.pass ? "PASS" : "FAIL"} ${k}: ${x.det}`); continue; }
    const y = x.C["E1b-17"], p = x.C["E1b-18"], t7 = x.C["E1b-7"]; console.log(`  ${x.failsGating.length ? "FAIL" : x.failsReported.length ? "rep " : "ok  "} ${k}: ${x.outcome}${y ? " | E1b-17 " + y.v : ""}${p ? " | E1b-18 " + p.v : ""}${x.putDown ? ` | put-down T ${f2(x.putDown.T, 3)} s, contact +${f2(x.putDown.contactAfterS, 3)} s, hand-back +${f2(x.putDown.handBackAfterS, 3)} s` : ""}${t7 && (x.failsGating.includes("E1b-7") || x.set === "X-P15" || x.set === "X-RATE") ? " | E1b-7 " + t7.v : ""}${x.footYaw.shareMin != null ? ` | yaw budget share min ${f2(x.footYaw.shareMin, 3)}` : ""}`); } }
const gating = Object.entries(out.sets).filter(([s, S]) => S.pass !== null), pass = gating.every(([s, S]) => S.pass) && !out.unexpected.length;
out.EXT = pass ? "PASS" : "FAIL"; console.log(`\nunexpected runs: ${out.unexpected.length ? out.unexpected.join(", ") : "none"}; missing: ${out.missing.length ? out.missing.join(", ") : "none"}`); console.log(`\nE1b-FIX EXTENDED BATTERY: ${out.EXT}`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

// ═══ physchar2/tools/dvg2_eval.mjs — evaluation of the DVG2 qualification (e2/DVG2_PREREG.md; written before freeze, before any DVG2 battery run). A versioned copy of
// tools/dvg_eval.mjs with: CQ-3a on tools/dvg2_unit.mjs records (corrected fold test, margin ≤ IK.h; every NEWLY classified fold must be mirror-equivalent under the ±1e-13 / ±1e-11
// target perturbation, else FAIL); CQ-1b split by the frozen execution-feasibility certifier's class (A: QUALIFIED → the frozen CQ-1b gate; B: NOT QUALIFIED → B-1 … B-8).
// usage: as dvg_eval plus --cls=<classification json> --sv2rep=<class-B repeat dir> --exqdvg=<certifier-with-DVG logs dir> --exqoff=<certifier logs dir>
// (original header follows) evaluation of DVG's combined qualification (e2/DVG_PREREG.md §4, CQ-0 … CQ-6; written with freeze step 2, before any CQ run).
//   CQ-0 identity (the identity summary); CQ-1 (a) AB nominal (td2b_val via dvg_wrap) vs the TD2B AB logs, (b) SV-2 servo-on (swing_servo_val2 via dvg_wrap) vs the SV-2 logs, (c) E1a / E1b
//   PSTAR4 with DVG injected vs the same runs with DVG off — bit-identical when never engaged, else the frozen contracts; CQ-2 reach stress (DVG runs); CQ-3 (a) mirror probes, (b) L / R
//   pairs; CQ-4 (a) repeats, (b) engagement across rates; CQ-5 E1a-8 with the TD-15 attribution rule against the paired no-feed-forward reference; CQ-6 the guard law (dvg_lib).
// usage: node tools/dvg_eval.mjs --list=<CQ_RUN_LIST.json> --dir=<stress> --rep=<repeats> --unit=<mirror> --ab=<AB dir> --td2blogs=<TD2B logs> --sv2=<SV-2 dir> --sv2logs=<evidence_sv2/logs>
//        --e1=<E1 dir> --identity=<identity summary> --fbjson=<evidence_fb/fb_eval.json.gz> [--sv2evalNew=… --sv2eval=…] [--e1evalOn=<dir> --e1evalOff=<dir>] [--json=<out>]
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { guardLaw, ab2Metrics, tdMetrics } from "./dvg_lib.mjs"; import { e2Spec } from "../gates/v2_e2.js"; import { jointAxisCapacities } from "../spec/v2_actuators.js";
const arg = (k, d = "") => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const LIST = JSON.parse(fs.readFileSync(arg("list"))), JS = arg("json"), TAU = 0.10, EPS2 = 1e-4, f2 = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d)), mx = (a) => a.reduce((m, x) => Math.max(m, x), -Infinity);
const load = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), out = { checks: {}, failures: [], reported: {} }, F = (id, why) => out.failures.push(`${id}: ${why}`);
const hashOf = (f) => { if (!fs.existsSync(f)) return null; const m = fs.readFileSync(f, "utf8").match(/hash ([0-9a-f]{8})/); return m ? m[1] : null; };
const wrapOf = (f) => { if (!fs.existsSync(f)) return null; const m = fs.readFileSync(f, "utf8").match(/DVG-WRAP \S+: evaluations (\d+), invalid (\d+)/); return m ? { ev: +m[1], inv: +m[2] } : null; };
const bCmdOf = {}; const bCmd = (body) => { if (bCmdOf[body] == null) { const sp = e2Spec(body), M = sp.bodies.reduce((s, b) => s + b.mass, 0); let c = 0; for (const j of sp.joints) { if (!j.def || !j.def.axes) continue; let a; try { a = jointAxisCapacities(j, M); } catch (e) { continue; } for (const k of ["x", "y", "z"]) if (a[k]) c = Math.max(c, a[k].plus.Nm, a[k].minus.Nm); } bCmdOf[body] = 10 * c; } return bCmdOf[body]; };
const lawOfSidecar = (f) => { if (!fs.existsSync(f)) return null; const o = load(f), res = []; for (const n of [0, 1]) { const E = o.rows.filter(r => r.n === n); if (E.length) res.push(guardLaw(E, E[0].hz, TAU)); } return res; };
const lawBad = (R) => R.filter(r => !r.ok);
// ── CQ-0 ──
{ const t = fs.existsSync(arg("identity")) ? fs.readFileSync(arg("identity"), "utf8") : ""; if (!/KV0 IDENTICAL/.test(t) || !/58\/58 pass/.test(t) || /FAIL/.test(t) || (t.match(/^PASS /gm) || []).length < 11) F("CQ-0", `identity summary incomplete or failing (${(t.match(/^PASS /gm) || []).length} PASS lines)`); }
// ── CQ-1 (a) AB nominal ──
const FBJ = arg("fbjson") ? load(arg("fbjson")) : null, SETS = { "R-F": "R", "R-L": "R", "C-F7": "C", "C-F13": "C", "C-L5": "C", "H-T45": "H", "H-A40": "H", "H-D": "H", "H-F15": "H" };
{ let cmp = 0, bad = 0; const engaged = []; for (const q of LIST.ab) { const b = `ab_${q.body}_${q.side}_${q.hz}_${q.traj}`, w = wrapOf(path.join(arg("ab"), b + ".log")), h = hashOf(path.join(arg("ab"), b + ".log")), h0 = hashOf(path.join(arg("td2blogs"), `td2b_PSTAR5CHAB_nominal_${q.body}_${q.side}_${q.hz}_${q.traj}.log`));
    if (!w || !h) { bad++; F("CQ-1a", `${b}: missing run / guard count`); continue; } if (w.inv > 0) { engaged.push(b); continue; } cmp++; if (h !== h0) { bad++; F("CQ-1a", `${b}: end hash ${h} vs TD2B ${h0} (no DVG engagement)`); } }
  for (const b of engaged) { const r = load(path.join(arg("ab"), b + ".json.gz")), m = ab2Metrics(r), t = tdMetrics(r, m), q = LIST.ab.find(x => `ab_${x.body}_${x.side}_${x.hz}_${x.traj}` === b), rc = ["R", "C"].includes(SETS[q.traj]), base = FBJ ? FBJ.runs[`PSTAR5CH|${q.body}|${q.side}|${q.hz}|${q.traj}`] : null, bm = base ? base.m : null, bad2 = [];
    if (!(m.peak <= 10 && m.rms <= 5)) bad2.push("AB-2"); if (t.v.sw) bad2.push("AB2-4a"); if (m.dcMax > m.dcLimit || m.dwAbad) bad2.push("AB-4c"); if (rc && (m.closMax > 0.05 || m.closPos > 0.5 || m.authority)) bad2.push("AB-5");
    if (rc && (m.ikErrMaxC > 1e-6 || !(m.marginMin > 0) || (bm && m.marginMin < bm.marginMin - 2))) bad2.push("AB-9"); if (m.overCap) bad2.push("I-1"); if (rc && (m.satFracMax > 0.05 || m.satLongestMs > 50 + 1e-9)) bad2.push("I-4");
    if (m.early || m.noLift || m.failedTD) bad2.push("I-5"); if (rc && (m.abort || !m.finalOk)) bad2.push("I-7"); if (m.ledgerMax > 1e-9) bad2.push("L-1"); if (m.bOffAnkle || m.bWithoutC) bad2.push("L-2");
    if (bad2.length) F("CQ-1a", `${b}: DVG engaged and AB2 per-run items fail: ${bad2.join(", ")}`); if (m.closMax > 0.05 || m.closPos > 0.5) F("CQ-5", `${b} (engaged AB): E1a-8 closure ${f2(m.closMax, 4)} / Σ+ ${f2(m.closPos, 3)}`);
    const L = lawOfSidecar(path.join(arg("ab"), b + ".dvg.json.gz")); if (!L) F("CQ-6", `${b}: no guard trace`); else lawBad(L).forEach(x => F("CQ-6", `${b}: guard law ${JSON.stringify(x.why)} attr ${f2(x.attrMax)} rate ${f2(x.rateMax, 3)} srcInvalid ${x.srcInvalid}`)); }
  out.checks["CQ-1a"] = { compared: cmp, mismatches: bad, engaged }; }
// ── CQ-1 (b) SV-2 servo-on, split by the certifier's class (DVG2 §3) ──
const CLS = arg("cls") && fs.existsSync(arg("cls")) ? JSON.parse(fs.readFileSync(arg("cls"))) : null;
{ if (!CLS) F("CQ-CLS", "classification missing"); else { if (CLS.missing && CLS.missing.length) F("CQ-CLS", `${CLS.missing.length} certifier runs missing`); if (CLS.sweepMismatch && CLS.sweepMismatch.length) F("CQ-CLS", `240 Hz verdicts differ from evidence_exec/sweep.txt: ${CLS.sweepMismatch.slice(0, 4).join("; ")}`); }
  let cmp = 0, bad = 0; const engaged = [], engA = [], engB = []; for (const q of LIST.sv2) { const b = `${q.body}_${q.side}_${q.hz}_on_${q.traj}`, lf = path.join(arg("sv2"), `sv2g_${b}.log`), w = wrapOf(lf), h = hashOf(lf), h0 = hashOf(path.join(arg("sv2logs"), `sv2_${b}.log`));
    if (!w || !h) { bad++; F("CQ-1b", `${b}: missing run / guard count`); continue; } if (w.inv > 0) { engaged.push(b); const c = CLS ? CLS.cls[`${q.body}|${q.side}|${q.hz}|${q.traj}`] : null; if (!c) F("CQ-CLS", `${b}: no certifier class`); else (c.qualified ? engA : engB).push({ b, q, c }); continue; } cmp++; if (h !== h0) { bad++; F("CQ-1b", `${b}: end hash ${h} vs SV-2 ${h0} (no DVG engagement)`); } }
  const nf = arg("sv2evalNew"), of = arg("sv2eval"), N = nf && fs.existsSync(nf) ? JSON.parse(fs.readFileSync(nf)) : null, O = of && fs.existsSync(of) ? JSON.parse(fs.readFileSync(of)) : null;
  if (engaged.length && (!N || !O)) F("CQ-1b", `${engaged.length} engaged runs need the frozen SV-2 evaluator on the guarded records`);
  const idsOf = (L, k) => new Set(L.filter(x => x.includes(k + " ") || x.endsWith(k)).map(x => x.split(":")[0]));
  // class A: the frozen CQ-1b gate (no newly failing SV-2 item, incl. I-4 5 % / 50 ms)
  if (N && O) for (const { b } of engA) { const k = b.replace(/_/g, "|"), newIds = [...idsOf(N.failures, k)].filter(i => !idsOf(O.failures, k).has(i)); if (newIds.length) F("CQ-1bA", `${b} (class A: certified): DVG engaged and SV-2 items newly failing: ${newIds.join(", ")}`); }
  // class B: B-1 … B-8
  const SAFE = ["I-1", "I-3", "I-5", "I-6", "I-7"], verdict = {}, satRep = [];
  if (N && O) for (const { b, q, c } of engB) { const k = b.replace(/_/g, "|"), m = N.runs[k] && N.runs[k].m, m0 = O.runs[k] && O.runs[k].m, v = {}, rec = path.join(arg("sv2"), `sv2_${b}.json.gz`), L = lawOfSidecar(path.join(arg("sv2"), `sv2g_${b}.dvg.json.gz`));   // erratum DVG2-E1: the SV-2 evaluator's per-run metrics are under .m (was read one level up)
    if (!m || !m0 || !fs.existsSync(rec) || !L) { F("CQ-1bB", `${b}: missing metrics / record / guard trace`); continue; } const r = load(rec), se = r.series;
    const finSeries = ["dTau", "dTau0", "closInc"].every(f => se[f].every(x => x != null && Number.isFinite(Number(x)))), finRows = r.rows.every(x => x.legTau.every(z => z[1] != null && Number.isFinite(z[1])));
    v["B-1"] = finSeries && finRows && !!r.hashes.end && L.every(x => x.srcInvalid === 0 && x.rateMax < 1);
    v["B-2"] = m.overCap === 0;
    v["B-3"] = m.closMax <= 0.05 && m.closPos <= 0.5 && !m.authority;
    v["B-4"] = lawBad(L).length === 0;
    const failsOf = (L2) => new Set([...idsOf(L2, k)].filter(i => SAFE.includes(i))), sNew = failsOf(N.failures), sOld = failsOf(O.failures); if (m.satLongestMs > 50 + 1e-9) sNew.add("SAT50"); if (m0.satLongestMs > 50 + 1e-9) sOld.add("SAT50");
    const newly = [...sNew].filter(i => !sOld.has(i)); v["B-5"] = newly.length === 0; v.safeSet = [...sNew].sort().join(","); v.newly = newly;
    v["B-6"] = m.satLongestMs <= 50 + 1e-9;
    const rp = path.join(arg("sv2rep"), `sv2g_${b}.log`), rph = hashOf(rp), rpt = path.join(arg("sv2rep"), `sv2g_${b}.dvg.json.gz`), og = path.join(arg("sv2"), `sv2g_${b}.dvg.json.gz`);
    v["B-7a"] = !!rph && rph === hashOf(path.join(arg("sv2"), `sv2g_${b}.log`)) && fs.existsSync(rpt) && JSON.stringify(load(rpt).rows) === JSON.stringify(load(og).rows);
    const xd = path.join(arg("exqdvg"), `exq_${q.body}_${q.side}_${q.hz}_${q.traj}.log`), xo = path.join(arg("exqoff"), `exq_${q.body}_${q.side}_${q.hz}_${q.traj}.log`), line = (f) => { if (!fs.existsSync(f)) return null; const L2 = fs.readFileSync(f, "utf8").split("\n").find(x => x.startsWith("EXQ ")); return L2 || null; };
    const ld = line(xd), lo = line(xo), lay = (s) => s ? (s.match(/positional (\S+);/) || [])[1] + "/" + (s.match(/analytic (OK|REJECTED)/) || [])[1] : null;
    v["B-8"] = !!ld && !!lo && /→ NOT QUALIFIED/.test(ld) && lay(ld) === lay(lo);
    verdict[b] = v; satRep.push(`${b}: saturation DVG ${f2(100 * m.satFracMax, 2)} % / ${f2(m.satLongestMs, 1)} ms vs unguarded ${f2(100 * m0.satFracMax, 2)} % / ${f2(m0.satLongestMs, 1)} ms; max Δτ0 ${f2(mx(se.dTau0.map(Number)), 1)} N·m; safety items failing (DVG / off) ${[...sNew].sort().join(",") || "none"} / ${[...sOld].sort().join(",") || "none"}; certifier with DVG: ${ld ? (ld.match(/→ (NOT QUALIFIED|QUALIFIED)/) || [])[1] : "—"}`);
    for (const id of ["B-1", "B-2", "B-3", "B-4", "B-5", "B-6", "B-7a", "B-8"]) if (!v[id]) F("CQ-1bB", `${b} (class B: ${c.verdict}): ${id} fails${id === "B-5" ? " (newly: " + newly.join(",") + ")" : ""}`); }
  // B-7 (b): L / R equivalence per (body, trajectory, rate)
  { const P = {}; for (const { b, q } of engB) { const g = `${q.body}|${q.hz}|${q.traj}`; (P[g] = P[g] || {})[q.side] = b; }
    for (const { q } of LIST.sv2.map(q => ({ q })).filter(({ q }) => CLS && CLS.cls[`${q.body}|${q.side}|${q.hz}|${q.traj}`] && !CLS.cls[`${q.body}|${q.side}|${q.hz}|${q.traj}`].qualified)) { const g = `${q.body}|${q.hz}|${q.traj}`; P[g] = P[g] || {}; P[g]["has" + q.side] = true; }
    for (const [g, p] of Object.entries(P)) { if (!!p.L !== !!p.R) { F("CQ-1bB", `${g}: B-7b engagement differs L ${!!p.L} / R ${!!p.R}`); continue; } if (!p.L) continue; const A = verdict[p.L], B = verdict[p.R]; if (!A || !B) continue;
      const diff = ["B-1", "B-2", "B-3", "B-4", "B-5", "B-6", "B-8"].filter(id => A[id] !== B[id]); if (diff.length || A.safeSet !== B.safeSet) F("CQ-1bB", `${g}: B-7b L/R differ (${diff.join(",")}${A.safeSet !== B.safeSet ? " safety items " + A.safeSet + " / " + B.safeSet : ""})`); } }
  out.reported["CQ-1b class B saturation (B-9, reported)"] = satRep;
  if (engaged.length) for (const b of engaged) { const L = lawOfSidecar(path.join(arg("sv2"), `sv2g_${b}.dvg.json.gz`)); if (!L) F("CQ-6", `sv2 ${b}: no guard trace`); else lawBad(L).forEach(x => F("CQ-6", `sv2 ${b}: guard law ${JSON.stringify(x.why)} attr ${f2(x.attrMax)} rate ${f2(x.rateMax, 3)} srcInvalid ${x.srcInvalid}`)); }
  out.checks["CQ-1b"] = { compared: cmp, mismatches: bad, engaged, classA: engA.map(x => x.b), classB: engB.map(x => x.b), classBverdicts: verdict }; }
// ── CQ-1 (c) E1a / E1b PSTAR4 ──
{ let cmp = 0, bad = 0; const engaged = [], E1 = [...LIST.e1a.map(q => `e1a_${q.body}_${q.side}${q.rep ? "_rep" : ""}`), ...LIST.e1b.map(q => `e1b_${q.body}_${q.side}_${q.pert}`)];
  for (const b of E1) { const on = path.join(arg("e1"), "on", b + ".log"), off = path.join(arg("e1"), "off", b + ".log"), w = wrapOf(on), h = hashOf(on), h0 = hashOf(off);
    if (!w || !h || !h0) { bad++; F("CQ-1c", `${b}: missing run / guard count`); continue; } if (w.inv > 0) { engaged.push(b); continue; } cmp++; if (h !== h0) { bad++; F("CQ-1c", `${b}: end hash ${h} vs DVG off ${h0} (no DVG engagement)`); } }
  if (engaged.length) { const on = arg("e1evalOn"), off = arg("e1evalOff"); if (!on || !off) F("CQ-1c", `${engaged.length} engaged runs need the frozen E1a / E1b evaluators on both sets`); else for (const ev of ["e1a_eval.json", "e1b_eval.json"]) { const A = JSON.parse(fs.readFileSync(path.join(on, ev))), B = JSON.parse(fs.readFileSync(path.join(off, ev)));
        for (const [id, c] of Object.entries(B.criteria)) if (c.pass && !(A.criteria[id] && A.criteria[id].pass)) F("CQ-1c", `${ev}: ${id} passes with DVG off but not with DVG on`); if (ev === "e1a_eval.json" && A.E1a !== "PASS") F("CQ-1c", `E1a RESULT with DVG: ${A.E1a}`); }
    for (const b of engaged) { const L = lawOfSidecar(path.join(arg("e1"), "on", b + ".dvg.json.gz")); if (!L) F("CQ-6", `${b}: no guard trace`); else lawBad(L).forEach(x => F("CQ-6", `${b}: guard law ${JSON.stringify(x.why)} attr ${f2(x.attrMax)} rate ${f2(x.rateMax, 3)} srcInvalid ${x.srcInvalid}`)); } }
  out.checks["CQ-1c"] = { compared: cmp, mismatches: bad, engaged }; }
// ── CQ-2 / CQ-5 / CQ-6 on the reach stress ──
const R = {}, key = (q) => `${q.cfg}|${q.cond}|${q.body}|${q.side}|${q.hz}`, fileOf = (d, q) => path.join(d, `dvg_${q.cfg}_${q.cond}_${q.body}_${q.side}_${q.hz}.json.gz`);
for (const q of LIST.stress) { const f = fileOf(arg("dir"), q); if (!fs.existsSync(f)) { F("CQ-G", `missing ${path.basename(f)}`); continue; } const r = load(f), se = r.series, c = r.td2c, cl = se.closInc.map(Number);
  R[key(q)] = { q, hash: r.hashes.end, gtrJ: JSON.stringify(c.gtr), fell: c.fell, abort: r.events.abortT != null, inv: c.d1g.invalid, evals: c.d1g.evals, nonFin: c.nonFinCmd + c.nonFinSt, overCap: r.integrity.overCap, tC: r.stress.tC, cmdMax: mx(se.cmdMax), dTau0Max: mx(se.dTau0),
    closMax: mx(cl), closPos: cl.reduce((s, v) => s + Math.max(0, v), 0), law: c.gtr && c.gtr.length ? guardLaw(c.gtr, r.hz, r.tau) : null, W: (c.gtr || []).filter(g => g.mode !== "PASS").reduce((s, g) => s + (g.pw || 0) / r.hz, 0),
    e1a7: (() => { const rs = r.hz === 240 ? 1 : 240 / r.hz, rsA = Math.max(1, rs); let a = 0, b = 0; se.t.forEach((t, i) => { if (t < 0.5) return; if (se.dTau[i] > 10 * rsA) a++; if (se.dTau0[i] > 30 * rs) b++; }); return { applied: a, commanded: b }; })() }; }
const ON = Object.values(R).filter(x => x.q.cfg === "PSTAR5CHABV"), R0of = (x) => R[key({ ...x.q, cfg: "PSTAR5CHABVR0" })];
let attributed = 0;
for (const x of ON) { const k = key(x.q);
  if (x.nonFin) F("CQ-2", `${k}: non-finite command / state ticks ${x.nonFin}`); if (x.overCap) F("CQ-2", `${k}: over-capacity events ${x.overCap}`);
  if (!(x.inv >= 1)) F("CQ-2", `${k}: the stress never engaged the guard (test defect)`); if (x.tC != null) F("CQ-2", `${k}: swing-foot contact (no turf: test defect)`);
  if (!x.law) F("CQ-2", `${k}: no guard trace`); else { if (!(x.law.rateMax < 1)) F("CQ-2", `${k}: applied joint-rate command at ${f2(x.law.rateMax, 3)} × its force–velocity limit`); if (x.law.srcInvalid) F("CQ-2", `${k}: ${x.law.srcInvalid} fade ticks from a non-V4-valid source`);
    if (x.law.lawBad || x.law.srcBad || x.law.wBad || x.law.cBad) F("CQ-6", `${k}: law ${x.law.lawBad} (worst ${x.law.lawWorst.toExponential(2)}), source ${x.law.srcBad}, weight ${x.law.wBad}, slew reference ${x.law.cBad} ${JSON.stringify(x.law.why)}`);
    if (x.law.attrBad) F("CQ-6", `${k}: guard-attributable step ${f2(x.law.attrMax, 2)} N·m > ${f2(30 * 240 / x.q.hz, 1)}`); }
  if (x.q.cond === "deepRel") { const r0 = R0of(x); (out.reported["CQ-6x energy (reported; release transient in the TD-15 end-range regime)"] = out.reported["CQ-6x energy (reported; release transient in the TD-15 end-range regime)"] || []).push(`${k}: closure max ${f2(x.closMax, 4)} J, Σ+ ${f2(x.closPos, 3)} J; R0 ${r0 ? f2(r0.closMax, 4) + " / " + f2(r0.closPos, 3) : "—"}`); }   // amendment A5: CQ-6x energy reported
  else if (x.closMax > 0.05 || x.closPos > 0.5) { const r0 = R0of(x); if (!r0) F("CQ-5", `${k}: E1a-8 fails and no R0 reference`);
    else if (x.closPos - r0.closPos <= 0.05 && (x.closMax <= 0.05 || r0.closMax > 0.05)) { attributed++; (out.reported["CQ-5 attributed to TD-15"] = out.reported["CQ-5 attributed to TD-15"] || []).push(`${k}: Σ+ ${f2(x.closPos, 3)} (R0 ${f2(r0.closPos, 3)}), closure max ${f2(x.closMax, 4)} (R0 ${f2(r0.closMax, 4)})`); }
    else F("CQ-5", `${k}: E1a-8 closure max ${f2(x.closMax, 4)} J / Σ+ ${f2(x.closPos, 3)} J; R0 ${f2(r0.closMax, 4)} / ${f2(r0.closPos, 3)} — not attributable (excess ${f2(x.closPos - r0.closPos, 3)} J)`); } }
out.checks["CQ-5"] = { attributedToTD15: attributed };
// CQ-3 (b) / CQ-4 (b)
{ const P = {}; for (const x of ON) { const g = `${x.q.body}|${x.q.cond}|${x.q.hz}`; (P[g] = P[g] || {})[x.q.side] = x; } let pairs = 0, dmax = { cmd: 0, sp: 0 };
  for (const [g, p] of Object.entries(P)) { if (!p.L || !p.R) { F("CQ-3b", `${g}: pair incomplete`); continue; } pairs++; if (!(p.L.inv > 0 && p.R.inv > 0)) F("CQ-3b", `${g}: engaged L ${p.L.inv > 0} / R ${p.R.inv > 0}`); if (p.L.fell !== p.R.fell || p.L.abort !== p.R.abort) F("CQ-3b", `${g}: outcome class L fell ${p.L.fell} abort ${p.L.abort} / R fell ${p.R.fell} abort ${p.R.abort}`);
    dmax.cmd = Math.max(dmax.cmd, Math.abs(p.L.cmdMax - p.R.cmdMax) / Math.max(p.L.cmdMax, p.R.cmdMax)); dmax.sp = Math.max(dmax.sp, Math.abs(p.L.closPos - p.R.closPos)); }
  out.reported["CQ-3b L/R"] = { pairs, maxRelCmdDiff: dmax.cmd, maxSigmaPlusDiff: dmax.sp };
  const H = {}; for (const x of ON) { const g = `${x.q.body}|${x.q.cond}|${x.q.side}`; (H[g] = H[g] || {})[x.q.hz] = x.inv > 0; } for (const [g, h] of Object.entries(H)) if (Object.keys(h).length !== 3 || new Set(Object.values(h)).size > 1) F("CQ-4b", `${g}: engagement across rates ${JSON.stringify(h)}`); }
// CQ-4 (a)
{ let n = 0; for (const q of LIST.rep) { const f = fileOf(arg("rep"), q), x = R[key(q)]; if (!fs.existsSync(f) || !x) { F("CQ-4a", `missing repeat ${key(q)}`); continue; } const r = load(f); n++; if (r.hashes.end !== x.hash || JSON.stringify(r.td2c.gtr) !== x.gtrJ) F("CQ-4a", `${key(q)}: repeat end hash ${r.hashes.end} vs ${x.hash}; guard log ${JSON.stringify(r.td2c.gtr) === x.gtrJ ? "identical" : "DIFFERS"}`); } out.checks["CQ-4a"] = { repeats: n }; }
// CQ-3 (a), DVG2 §2: corrected fold test (unreached side's smallest margin ≤ IK.h) and the equivalence safeguard for newly classified folds
{ let nS = 0, nFold = 0, nNew = 0, nNear = 0, dMax = 0; for (const q of LIST.unit) { const f = path.join(arg("unit"), `dvg2u_${q.body}_${q.cond}.json.gz`); if (!fs.existsSync(f)) { F("CQ-3a", `missing ${path.basename(f)}`); continue; } const r = load(f);
    if (!(r.ikH > 0)) F("CQ-3a", `${path.basename(f)}: not a dvg2_unit record`);
    for (const p of r.mirror.probe) { nS++; const A = p.A, B = p.B; if (p.foldTol) { nFold++; const mm = Math.min(...(p.unreached === "A" ? p.margA : p.margB));
        (out.reported["CQ-3a IK-fold samples (TD-17)"] = out.reported["CQ-3a IK-fold samples (TD-17)"] || []).push(`${q.body} ${q.cond} t ${p.t}: L err ${A.err.toExponential(1)} / R err ${B.err.toExponential(1)}; unreached ${p.unreached} min margin ${mm.toExponential(2)} rad; exact flag ${p.foldExact}; perturbed residuals ${p.pert.map(e => e.toExponential(1)).join(" ")} → equivalent ${p.equiv}`);
        if (!p.foldExact) { nNew++; if (!p.equiv) F("CQ-3a", `${q.body} ${q.cond} t ${p.t}: newly classified fold WITHOUT mirror equivalence under perturbation — physical/IK L/R behaviour may differ: STOP and investigate`); } continue; }
      if (p.foldExact) F("CQ-3a", `${q.body} ${q.cond} t ${p.t}: exact-flag fold not classified by the tolerance test (tool defect)`);
      const near = (A.lam != null && Math.abs(A.lam - EPS2) <= 1e-6 * EPS2) || Math.abs(A.err - 1e-6) <= 1e-12 || (A.tRatio != null && Math.abs(A.tRatio - 1) <= 1e-6); if (near) { nNear++; continue; }
      const fl = ["okR", "okC", "okF", "okT"].filter(k => A[k] !== B[k]); if (fl.length) F("CQ-3a", `${q.body} ${q.cond} t ${p.t}: validity flags differ (${fl.join(", ")}) — not an IK-fold sample`);
      if (A.lam != null && B.lam != null && Math.abs(A.lam - B.lam) > 1e-6 * Math.max(Math.abs(A.lam), EPS2)) F("CQ-3a", `${q.body} ${q.cond} t ${p.t}: λ ${A.lam} vs ${B.lam}`);
      if ((A.err <= 1e-6) !== (B.err <= 1e-6)) F("CQ-3a", `${q.body} ${q.cond} t ${p.t}: residual classes differ (${A.err} vs ${B.err}) — not an IK-fold sample`);
      if (A.okR && A.okC && A.okF && A.okT && B.okR && B.okC && B.okF && B.okT) { dMax = Math.max(dMax, p.dAbs); if (p.dTol > 0) F("CQ-3a", `${q.body} ${q.cond} t ${p.t}: mirrored D1 differs by ${p.dAbs.toExponential(2)} N·m`); } } }
  out.checks["CQ-3a"] = { samples: nS, ikFold: nFold, newlyClassified: nNew, nearThreshold: nNear, validDMaxNm: dMax }; }
// ── reported ──
const rep = (S) => ({ n: S.length, engaged: S.filter(x => x.inv > 0).length, fell: S.filter(x => x.fell).length, aborted: S.filter(x => x.abort).length, cmdMax: mx(S.map(x => x.cmdMax)), overBcmd: S.filter(x => x.cmdMax > bCmd(x.q.body)).length, dTau0Max: mx(S.map(x => x.dTau0Max)),
  closMax: mx(S.map(x => x.closMax)), closPosMax: mx(S.map(x => x.closPos)), e1a8Fail: S.filter(x => x.closMax > 0.05 || x.closPos > 0.5).length, heldMax: mx(S.map(x => (x.law ? x.law.heldMax : 0))), attrMax: mx(S.map(x => (x.law ? x.law.attrMax : 0))), rateMax: mx(S.map(x => (x.law ? x.law.rateMax : 0))),
  Wguarded: mx(S.map(x => x.W)), e1a7c: S.filter(x => x.e1a7.commanded).length });
for (const cfg of ["PSTAR5CHABV", "PSTAR5CHABVR0", "PSTAR5CHAB"]) for (const cond of ["deep", "far", "diag", "deepRel"]) for (const hz of [180, 240, 480]) out.reported[`${cfg} ${cond} ${hz}`] = rep(Object.values(R).filter(x => x.q.cfg === cfg && x.q.cond === cond && x.q.hz === hz));
const IDS = ["CQ-G", "CQ-CLS", "CQ-0", "CQ-1a", "CQ-1b", "CQ-1bA", "CQ-1bB", "CQ-1c", "CQ-2", "CQ-3a", "CQ-3b", "CQ-4a", "CQ-4b", "CQ-5", "CQ-6"], has = (id) => out.failures.filter(x => x.startsWith(id + ":") || x.startsWith(id + " "));
for (const id of IDS) out.checks[id] = { ...(out.checks[id] || {}), pass: has(id).length === 0, failures: has(id).length };
out.validates = IDS.every(id => out.checks[id].pass);
console.log("REPORTED reach stress per configuration / condition / rate: runs | engaged | fell / aborted | raw max |τ0| (runs above the historical B_cmd, reported only) | max |Δτ0| | closure max / Σ+ max (E1a-8 failing runs) | held unit max | guard step max | rate-envelope max | max guarded work (J) | E1a-7 commanded runs");
for (const [k, x] of Object.entries(out.reported).filter(([k]) => k.startsWith("PSTAR"))) console.log(`  ${k.padEnd(24)} n ${x.n} | eng ${x.engaged} | fell ${x.fell} / ab ${x.aborted} | τ0 ${x.cmdMax.toExponential(2)} (${x.overBcmd}) | Δτ0 ${x.dTau0Max.toExponential(2)} | clos ${f2(x.closMax, 4)} / ${f2(x.closPosMax, 3)} (${x.e1a8Fail}) | held ${f2(x.heldMax, 0)} | step ${f2(x.attrMax, 2)} | rate ${f2(x.rateMax, 3)} | W ${f2(x.Wguarded, 3)} | ${x.e1a7c}`);
for (const k of ["CQ-1b class B saturation (B-9, reported)", "CQ-5 attributed to TD-15", "CQ-3a IK-fold samples (TD-17)", "CQ-6x energy (reported; release transient in the TD-15 end-range regime)"]) if (out.reported[k]) { console.log(`${k}: ${out.reported[k].length}`); out.reported[k].slice(0, 16).forEach(x => console.log("   " + x)); }
console.log(`CQ-1 compared: AB ${out.checks["CQ-1a"].compared} (engaged ${out.checks["CQ-1a"].engaged.length}), SV-2 ${out.checks["CQ-1b"].compared} (engaged ${out.checks["CQ-1b"].engaged.length}), E1 ${out.checks["CQ-1c"].compared} (engaged ${out.checks["CQ-1c"].engaged.length}); CQ-3a ${JSON.stringify(out.checks["CQ-3a"])}; CQ-3b ${JSON.stringify(out.reported["CQ-3b L/R"])}; CQ-4a ${out.checks["CQ-4a"].repeats} repeats`);
for (const id of IDS) console.log(`${out.checks[id].pass ? "PASS" : "FAIL"} ${id} (${out.checks[id].failures} failing items)`);
for (const id of IDS) has(id).slice(0, 8).forEach(x => console.log("   " + x));
console.log(`CQ-1b classes: engaged class A ${out.checks["CQ-1b"].classA.length}, class B ${out.checks["CQ-1b"].classB.length}`);
console.log(out.validates ? "DVG2 QUALIFICATION: PASS" : "DVG2 QUALIFICATION: FAIL");
if (JS) fs.writeFileSync(JS, JSON.stringify({ ...out, runs: Object.fromEntries(Object.entries(R).map(([k, x]) => [k, { ...x, gtrJ: undefined }])) }, null, 1));

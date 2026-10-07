// ═══ physchar2/tools/d1g_eval.mjs — evaluation of the D1G validation items run outside the TD2C battery (e2/D1G_TD2C_PREREG.md §I.4; written with freeze step 2, before any run):
// DG-2 (reach stress, guard on), DG-3 (a) controller-level mirror test / (b) closed-loop L-R engagement, DG-4 (a) same-rate repeats / (b) engagement across rates + fade / ramp lengths,
// DG-5 (E1a-8 strict on the reach stress), DG-6 (the guard law on the reach stress), DG-1 (c) (SV-2 servo-on runs with the guard vs the SV-2 battery). DG-0 is the identity script's,
// DG-1 (a, b) and DG-6 on TD2C are tools/td2c_eval.mjs's.
// usage: node tools/d1g_eval.mjs --list=<D1G_RUN_LIST.json> --dir=<DG-2 records> --rep=<repeat records> --unit=<mirror records> --sv2dir=<guarded SV-2 logs> --sv2logs=<evidence_sv2/logs>
//        [--sv2evalNew=<frozen SV-2 evaluator JSON on the guarded records> --sv2eval=<evidence_sv2/sv2_eval.json>] [--json=<out>]
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { guardMetrics, bCmd } from "./d1g_lib.mjs";
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const LIST = JSON.parse(fs.readFileSync(arg("list", ""))), DIR = arg("dir", "."), REP = arg("rep", ""), UNIT = arg("unit", ""), SV2DIR = arg("sv2dir", ""), SV2LOGS = arg("sv2logs", ""), JS = arg("json", "");
const TAU_G = 0.10, EPS2 = 1e-4, f2 = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d)), mx = (a) => a.reduce((m, x) => Math.max(m, x), -Infinity);
const out = { checks: {}, failures: [], reported: {} }, F = (id, why) => out.failures.push(`${id}: ${why}`), load = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
const fileOf = (d, q) => path.join(d, `d1g_${q.cfg}_${q.cond}_${q.body}_${q.side}_${q.hz}.json.gz`), key = (q) => `${q.cfg}|${q.cond}|${q.body}|${q.side}|${q.hz}`;
// ── DG-2 / DG-5 / DG-6 on the reach stress ──
const R = {}; for (const q of LIST.dg2) { const f = fileOf(DIR, q); if (!fs.existsSync(f)) { F("DG-G", `missing ${path.basename(f)}`); continue; } const r = load(f), c = r.td2c, se = r.series;
  R[key(q)] = { q, r: { hash: r.hashes.end, outcome: r.outcome, fell: c.fell, abortT: r.events.abortT, tC: r.stress.tC, d1g: c.d1g, nonFinCmd: c.nonFinCmd, nonFinSt: c.nonFinSt, overCap: r.integrity.overCap, cmdMax: mx(se.cmdMax), dTau0Max: mx(se.dTau0),
    closMax: mx(se.closInc.map(Number)), closPos: se.closInc.reduce((s, v) => s + Math.max(0, +v), 0), gm: se.gm, gtrJ: JSON.stringify(c.gtr), e1a7: (() => { const rs = r.hz === 240 ? 1 : 240 / r.hz, rsA = Math.max(1, rs); let a = 0, b = 0; se.t.forEach((t, i) => { if (t < 0.5) return; if (se.dTau[i] > 10 * rsA) a++; if (se.dTau0[i] > 30 * rs) b++; }); return { applied: a, commanded: b }; })() },
    g: guardMetrics(r, TAU_G), B: bCmd(q.body) }; }
const ON = Object.values(R).filter(x => x.q.cfg === "PSTAR5CHABG"), OFF = Object.values(R).filter(x => x.q.cfg === "PSTAR5CHAB");
for (const x of ON) { const k = key(x.q), r = x.r, g = x.g;
  if (r.nonFinCmd || r.nonFinSt) F("DG-2", `${k}: non-finite command ticks ${r.nonFinCmd}, state ticks ${r.nonFinSt}`);
  if (r.overCap) F("DG-2", `${k}: over-capacity events ${r.overCap}`);
  if (g.lawBad) F("DG-2", `${k}: guard-bound (c = w · D_held / OFF = 0) violations ${g.lawBad} (worst ${g.lawWorst.toExponential(2)} N·m)`);
  if (!(r.cmdMax <= x.B)) F("DG-2", `${k}: max commanded |τ0| ${f2(r.cmdMax, 1)} N·m > B_cmd ${f2(x.B, 0)}`);
  if (!(r.d1g.invalid >= 1)) F("DG-2", `${k}: the stress never reached the invalid region (test defect)`);
  if (r.tC != null) F("DG-2", `${k}: a swing-foot contact occurred at ${r.tC} (no turf: test defect)`);
  if (r.closMax > 0.05 || r.closPos > 0.5) F("DG-5", `${k}: E1a-8 closure max ${f2(r.closMax, 4)} J / tick, Σ+ ${f2(r.closPos, 3)} J`);
  if (g.srcHoldBad || g.dwBad) F("DG-6", `${k}: held-wrench changes ${g.srcHoldBad}, weight-law errors ${g.dwBad}`);
  if (g.attrBad) F("DG-6", `${k}: guard-attributable step ${f2(g.attrMax, 2)} N·m > ${f2(g.attrLimit, 1)} N·m`);
  if (g.lenBad) F("DG-4b", `${k}: ${g.lenBad} complete fades / ramps not lasting τ_g / dt ticks`); }
// DG-3 (b): both legs engage; DG-4 (b): engaged at one rate ⇔ at all three
{ const G = {}; for (const x of ON) { const g = `${x.q.body}|${x.q.cond}|${x.q.hz}`; (G[g] = G[g] || {})[x.q.side] = x.r.d1g.invalid > 0; } for (const [g, h] of Object.entries(G)) if (!(h.L && h.R)) F("DG-3b", `${g}: engaged L ${h.L} / R ${h.R}`);
  const H = {}; for (const x of ON) { const g = `${x.q.body}|${x.q.cond}|${x.q.side}`; (H[g] = H[g] || {})[x.q.hz] = x.r.d1g.invalid > 0; } for (const [g, h] of Object.entries(H)) if (new Set(Object.values(h)).size > 1 || Object.keys(h).length !== 3) F("DG-4b", `${g}: engagement across rates ${JSON.stringify(h)}`); }
// DG-4 (a): same-rate repeats
let nRep = 0; for (const q of LIST.rep) { const f = fileOf(REP, q), x = R[key(q)]; if (!fs.existsSync(f) || !x) { F("DG-4a", `missing repeat ${key(q)}`); continue; } const r = load(f); nRep++;
  if (r.hashes.end !== x.r.hash || JSON.stringify(r.td2c.gtr) !== x.r.gtrJ) F("DG-4a", `${key(q)}: repeat end hash ${r.hashes.end} vs ${x.r.hash}; guard event log ${JSON.stringify(r.td2c.gtr) === x.r.gtrJ ? "identical" : "DIFFERS"}`); }
out.checks["DG-4a"] = { repeats: nRep };
// DG-3 (a): controller-level mirror test
let nS = 0, nNear = 0, dMax = 0; for (const q of LIST.unit) { const f = path.join(UNIT, `d1gu_${q.body}_${q.cond}.json.gz`); if (!fs.existsSync(f)) { F("DG-3a", `missing ${path.basename(f)}`); continue; } const r = load(f);
  for (const p of r.mirror.probe) { nS++; const A = p.A, B = p.B, near = (A.lam != null && Math.abs(A.lam - EPS2) <= 1e-6 * EPS2) || Math.abs(A.err - 1e-6) <= 1e-12 || (A.tRatio != null && Math.abs(A.tRatio - 1) <= 1e-6);
    if (near) { nNear++; continue; } const fl = ["okR", "okC", "okF", "okT"].filter(k => A[k] !== B[k]); if (fl.length) F("DG-3a", `${q.body} ${q.cond} t ${p.t}: validity flags differ (${fl.join(", ")})`);
    if (A.lam != null && B.lam != null && Math.abs(A.lam - B.lam) > 1e-6 * Math.max(A.lam, EPS2)) F("DG-3a", `${q.body} ${q.cond} t ${p.t}: λ ${A.lam} vs ${B.lam}`);
    if ((A.err <= 1e-6) !== (B.err <= 1e-6)) F("DG-3a", `${q.body} ${q.cond} t ${p.t}: residual classes differ (${A.err} vs ${B.err})`);
    if (A.okR && A.okC && A.okF && A.okT && B.okR && B.okC && B.okF && B.okT) { dMax = Math.max(dMax, p.dAbs); if (p.dTol > 0) F("DG-3a", `${q.body} ${q.cond} t ${p.t}: mirrored D1 differs by ${p.dAbs.toExponential(2)} N·m (tolerance 1e-6 relative + 1e-6 N·m)`); } } }
out.checks["DG-3a"] = { samples: nS, nearThreshold: nNear, validDMaxNm: dMax };
// DG-1 (c): SV-2 servo-on runs with the guard vs the SV-2 battery
{ let cmp = 0, bad = 0; const engaged = []; for (const q of LIST.sv2) { const lf = path.join(SV2DIR, `sv2g_${q.body}_${q.side}_${q.hz}_on_${q.traj}.log`), of = path.join(SV2LOGS, `sv2_${q.body}_${q.side}_${q.hz}_on_${q.traj}.log`); if (!fs.existsSync(lf) || !fs.existsSync(of)) { bad++; F("DG-1c", `missing log ${path.basename(lf)} / ${path.basename(of)}`); continue; }
    const t = fs.readFileSync(lf, "utf8"), h = (t.match(/hash ([0-9a-f]{8})/) || [])[1], inv = +((t.match(/D1G-WRAP \S+: evaluations \d+, invalid (\d+)/) || [])[1] ?? NaN), h0 = (fs.readFileSync(of, "utf8").match(/hash ([0-9a-f]{8})\s*$/) || [])[1];
    if (!Number.isFinite(inv)) { bad++; F("DG-1c", `${path.basename(lf)}: no guard count`); continue; } if (inv > 0) { engaged.push(`${q.body}|${q.side}|${q.hz}|on|${q.traj}`); continue; } cmp++; if (h !== h0) { bad++; F("DG-1c", `${path.basename(lf)}: end hash ${h} vs SV-2 ${h0} (no D1G engagement)`); } }
  if (engaged.length) { const nf = arg("sv2evalNew", ""), of = arg("sv2eval", ""); if (!nf || !of) F("DG-1c", `${engaged.length} engaged runs need the frozen SV-2 evaluator's result on the guarded records`); else { const N = JSON.parse(fs.readFileSync(nf)), O = JSON.parse(fs.readFileSync(of));
      for (const k of engaged) { const fN = N.failures.filter(x => x.includes(k)), fO = O.failures.filter(x => x.includes(k)), ids = (L) => new Set(L.map(x => x.split(":")[0])), newIds = [...ids(fN)].filter(i => !ids(fO).has(i)); if (newIds.length) F("DG-1c", `${k}: D1G engaged and SV-2 items newly failing: ${newIds.join(", ")}`); } } }
  out.checks["DG-1c"] = { compared: cmp, mismatches: bad, engaged }; }
// ── reported ──
const rep = (S) => ({ n: S.length, engaged: S.filter(x => x.r.d1g.invalid > 0).length, fell: S.filter(x => x.r.fell).length, aborted: S.filter(x => x.r.abortT != null).length, cmdMax: mx(S.map(x => x.r.cmdMax)), dTau0Max: mx(S.map(x => x.r.dTau0Max)), closMax: mx(S.map(x => x.r.closMax)), closPosMax: mx(S.map(x => x.r.closPos)),
  heldMax: mx(S.map(x => x.g.heldMax)), attrMax: mx(S.map(x => x.g.attrMax)), e1a7AppliedRuns: S.filter(x => x.r.e1a7.applied).length, e1a7CommandedRuns: S.filter(x => x.r.e1a7.commanded).length, nonFinite: S.filter(x => x.r.nonFinCmd || x.r.nonFinSt).length });
for (const cond of ["deep", "far", "diag"]) { out.reported[`guard ON ${cond}`] = rep(ON.filter(x => x.q.cond === cond)); out.reported[`guard OFF ${cond}`] = rep(OFF.filter(x => x.q.cond === cond)); }
const IDS = ["DG-G", "DG-1c", "DG-2", "DG-3a", "DG-3b", "DG-4a", "DG-4b", "DG-5", "DG-6"], has = (id) => out.failures.filter(x => x.startsWith(id + ":"));
for (const id of IDS) out.checks[id] = { ...(out.checks[id] || {}), pass: has(id).length === 0, failures: has(id).length };
out.validates = IDS.every(id => out.checks[id].pass);
console.log("REPORTED reach stress: runs | engaged | fell / aborted | max |τ0| | max |Δτ0| | closure max / Σ+ max | held D1 max | guard-attributable step max | E1a-7 applied / commanded violating runs | non-finite runs");
for (const [k, x] of Object.entries(out.reported)) console.log(`  ${k.padEnd(16)} n ${x.n} | eng ${x.engaged} | fell ${x.fell} / abort ${x.aborted} | τ0 ${x.cmdMax.toExponential(2)} | Δτ0 ${x.dTau0Max.toExponential(2)} | clos ${f2(x.closMax, 4)} / ${f2(x.closPosMax, 3)} | held ${f2(x.heldMax, 1)} | attr ${f2(x.attrMax, 2)} | E1a-7 ${x.e1a7AppliedRuns} / ${x.e1a7CommandedRuns} | nonfinite ${x.nonFinite}`);
console.log(`DG-3a mirror samples ${out.checks["DG-3a"].samples} (near-threshold, reported ${out.checks["DG-3a"].nearThreshold}); valid-sample max |ΔD| ${out.checks["DG-3a"].validDMaxNm.toExponential(2)} N·m; DG-4a repeats ${nRep}; DG-1c compared ${out.checks["DG-1c"].compared}, engaged ${out.checks["DG-1c"].engaged.length}`);
for (const id of IDS) console.log(`${out.checks[id].pass ? "PASS" : "FAIL"} ${id} (${out.checks[id].failures} failing items)`);
for (const id of IDS) has(id).slice(0, 8).forEach(x => console.log("   " + x));
console.log(out.validates ? "D1G (DG-1c, DG-2 … DG-6 outside TD2C): PASS" : "D1G (DG-1c, DG-2 … DG-6 outside TD2C): FAIL");
if (JS) fs.writeFileSync(JS, JSON.stringify({ ...out, runs: Object.fromEntries(Object.entries(R).map(([k, x]) => [k, { q: x.q, r: { ...x.r, gm: undefined, gtrJ: undefined }, g: x.g, B: x.B }])) }, null, 1));

// ═══ physchar2/tools/touchrest_eval.mjs — evaluator of the touch-rest validation (touch_semantics/TOUCHREST_PREREG.md §3), exactly as preregistered.
// usage: node tools/touchrest_eval.mjs --manifest=<json> --results=<dir> --uf=<unload_fix results dir> --e1a=<e1a/official/runs> [--browser=<json>] [--out=<json>]
import fs from "fs"; import path from "path"; import zlib from "zlib";
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const M = JSON.parse(fs.readFileSync(arg("manifest", ""))), RD = arg("results", ""), UF = arg("uf", ""), E1A = arg("e1a", ""), BR = arg("browser", ""), OUT = arg("out", "");
const R = {}; let missing = 0; for (const run of M.runs) { const f = path.join(RD, run.id + ".json"); if (fs.existsSync(f)) R[run.id] = JSON.parse(fs.readFileSync(f)); else missing++; }
const get = (pred) => M.runs.filter(pred).map(r => R[r.id]).filter(Boolean), out = { missing, criteria: {} }, f2 = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d));
const mx = (a) => a.reduce((m, x) => Math.max(m, x), -Infinity), mn = (a) => a.reduce((m, x) => Math.min(m, x), Infinity);
const add = (id, pass, v) => { out.criteria[id] = { pass: !!pass, v }; console.log(`${pass ? "PASS" : "FAIL"} ${id}: ${v}`); };
const T = (o) => o.transRaw[o.nL], after = (o, t0) => T(o).filter(x => x.t > t0);
const postOk = (o) => { const end = o.lift && o.lift.tL != null ? o.lift.tL : o.run.end, A = T(o).filter(x => x.t > o.tRel && x.t < end);
  return !A.some(x => x.to === "LIFTOFF" || x.to === "AIRBORNE" || x.to === "LOAD_ACCEPT") && o.chatter === 0 && o.pre.FzMax <= o.loadOnN && o.pre.FzMeanTail > 0 && o.pre.FzMeanTail < o.loadOffN; };
console.log(`results ${Object.keys(R).length}/${M.runs.length} (missing ${missing})`);
// R1
{ const L = get(r => r.set === "P" && r.r === 0), bad = L.filter(o => !(o.released && o.tRel <= 3 + o.run.ramp + 2 && postOk(o)));
  add("R1", L.length === 240 && !bad.length, `${L.length - bad.length}/${L.length} zero-share runs: released by ramp end + 2 s (t_rel − ramp end ${f2(mn(L.map(o => (o.tRel ?? 99) - 3 - o.run.ramp)))}–${f2(mx(L.map(o => (o.tRel ?? 99) - 3 - o.run.ramp)))} s), then no contact loss / LOAD_ACCEPT / chatter; post-release load max ${f2(mx(L.map(o => o.pre.FzMax ?? 0)))} N; resting load (mean last 2 s) ${f2(mn(L.map(o => o.pre.FzMeanTail ?? 0)))}–${f2(mx(L.map(o => o.pre.FzMeanTail ?? 0)))} N${bad.length ? "; failing " + bad.slice(0, 8).map(o => o.id + " [" + T(o).filter(x => x.t > (o.tRel ?? 0)).map(x => x.to).slice(0, 4).join(">") + "]").join(", ") : ""}`); }
// R2
{ const L = get(r => r.set === "P" && r.r >= 0.02), bad = L.filter(o => o.released || T(o).length > 0);
  const cmp = L.filter(o => o.run.ramp === 4), diff = cmp.filter(o => { const f = path.join(UF, `P_${o.run.body}_${o.run.foot}_d${o.run.drop}_r${o.run.r}_B1.json`); if (!fs.existsSync(f)) return true; const u = JSON.parse(fs.readFileSync(f)); return JSON.stringify(u.hashes) !== JSON.stringify(o.hashes); });
  add("R2", L.length === 720 && !bad.length && !diff.length, `${L.length - bad.length}/${L.length} runs with r ≥ 2 %: never released; ${cmp.length - diff.length}/${cmp.length} ramp-4 runs hash-identical to the unload-fix B1 runs${bad.length ? "; released: " + bad.slice(0, 6).map(o => o.id).join(", ") : ""}${diff.length ? "; differ: " + diff.slice(0, 6).map(o => o.id).join(", ") : ""}`); }
// R2c
{ const L = get(r => r.set === "P" && r.r === 0.005), rel = L.filter(o => o.released), bad = rel.filter(o => !postOk(o));
  add("R2c", L.length === 240 && !bad.length, `${rel.length}/${L.length} r = 0.5 % runs released (permitted); post-release rules hold in ${rel.length - bad.length}/${rel.length}${bad.length ? "; failing " + bad.slice(0, 6).map(o => o.id).join(", ") : ""}`); }
// R3
{ const L = get(r => r.set === "L"), bad = [];
  for (const o of L) { const l = o.lift; let ok = l && l.tL != null && o.released && postOk(o) && o.chatter === 0;
    if (ok && o.run.lift.h === 0.005) ok = l.airborne === 1 && l.touchdown === 1 && l.bounce === 0 && l.loadAccept === 1 && l.final === "SUPPORT";
    else if (ok) ok = l.airborne <= 1 && l.touchdown <= 1 && l.bounce === 0 && l.final === "SUPPORT"; if (!ok) bad.push(o); }
  const L5 = L.filter(o => o.run.lift.h === 0.005 && o.lift && o.lift.tL != null);
  add("R3", L.length === 144 && !bad.length, `${L.length - bad.length}/${L.length} lift runs pass; 5 mm lifts: liftoff ${f2(mn(L5.map(o => (o.lift.liftoff ?? 99) - o.lift.tL)))}–${f2(mx(L5.map(o => (o.lift.liftoff ?? 0) - o.lift.tL)))} s after the command, hover clearance min ${f2(mn(L5.map(o => o.lift.hoverClearMin ?? 99)))} mm (mean ${f2(mn(L5.map(o => o.lift.hoverClearMean ?? 99)))}–${f2(mx(L5.map(o => o.lift.hoverClearMean ?? 0)))}), servo error ≤ ${f2(mx(L5.map(o => o.lift.hoverErrMax ?? 0)))} mm; boundary lifts: max AIRBORNE entries ${mx(L.filter(o => o.run.lift.h < 0.005).map(o => o.lift ? o.lift.airborne : 0))}, max hover transitions ${mx(L.filter(o => o.run.lift.h < 0.005).map(o => o.lift ? o.lift.hoverTransitions : 0))}${bad.length ? "; failing " + bad.slice(0, 8).map(o => o.id + " " + JSON.stringify(o.lift && { a: o.lift.airborne, td: o.lift.touchdown, b: o.lift.bounce, la: o.lift.loadAccept, f: o.lift.final, ch: o.chatter, pre: o.pre.contactLoss })).join(", ") : ""}`); }
// R4
{ const L = get(r => r.set === "XB" && r.arm === "B1TR"), bad = L.filter(o => !(o.released && postOk(o)));
  add("R4", L.length === 64 && !bad.length, `${L.length - bad.length}/${L.length} bump runs (±2, ±5 mm): no contact loss after release, load ≤ loadOn (max ${f2(mx(L.map(o => o.pre.FzMax ?? 0)))} N)${bad.length ? "; failing " + bad.slice(0, 6).map(o => o.id + " [" + after(o, o.tRel ?? 0).map(x => x.to).slice(0, 4).join(">") + "]").join(", ") : ""}`); }
// R5
{ const rank = (s) => (/fell/.test(s) ? 3 : /not settled/.test(s) ? 2 : /relocated/.test(s) ? 1 : 0), X = get(r => r.set === "XP" && r.arm === "B1TR");
  const a = X.filter(o => o.run.push.J === 2.5 && o.fell), b = X.filter(o => { const og = R[o.id.replace("_B1TR", "_ORIG")]; return !og || rank(o.outcome) > rank(og.outcome); });
  const c = X.filter(o => { const A = after(o, o.run.push.t); return A.filter(x => x.to === "LOAD_ACCEPT").length > 1 || A.filter(x => x.from === "SUPPORT" && x.to === "UNLOADING").length > 1 || o.chatter > 0; }), d = X.filter(o => !o.fell && o.slipMm > 20);
  add("R5", X.length === 128 && !a.length && !b.length && !c.length && !d.length, `${X.length} push runs: falls at 2.5 N·s ${a.length}; worse than ORIG ${b.length}; >1 re-acceptance/release or chatter ${c.length}; slip > 20 mm ${d.length}; outcomes ${JSON.stringify(X.reduce((m, o) => ((m[o.outcome] = (m[o.outcome] || 0) + 1), m), {}))} (ORIG ${JSON.stringify(get(r => r.set === "XP" && r.arm === "ORIG").reduce((m, o) => ((m[o.outcome] = (m[o.outcome] || 0) + 1), m), {}))})`); }
// R6, R6x
{ const L = get(r => ["P", "L", "XB", "HZ", "D", "W"].includes(r.set) && r.arm === "B1TR" && !r.push), bad = L.filter(o => !(o.closMax <= 0.05 && o.closPos <= 0.5 && o.dTauMaxNonOnset <= 10 && o.dTauMax <= 25 && o.dTau0Max <= 30 && o.overCap === 0 && o.authorityWrites === 0 && o.extImpulse === 0));
  add("R6", !bad.length, `${L.length - bad.length}/${L.length}: closure ≤ ${mx(L.map(o => o.closMax)).toExponential(2)} J/tick, Σ+ ≤ ${f2(mx(L.map(o => o.closPos)), 3)} J; applied Δτ ≤ ${f2(mx(L.map(o => o.dTauMaxNonOnset)))} N·m (non-onset) / ${f2(mx(L.map(o => o.dTauMax)))} (all); Δτ0 ≤ ${f2(mx(L.map(o => o.dTau0Max)))} N·m; over-capacity ${mx(L.map(o => o.overCap))}; max saturation fraction ${f2(mx(L.map(o => o.satMaxFrac)) * 100, 2)} %; authority ${mx(L.map(o => o.authorityWrites))}; impulse ${mx(L.map(o => o.extImpulse))}${bad.length ? "; failing " + bad.slice(0, 6).map(o => o.id).join(", ") : ""}`);
  const X = get(r => r.set === "XP" && r.arm === "B1TR"), bx = X.filter(o => !(o.closMax <= 0.05 && o.closPos <= 0.5 && o.authorityWrites === 0 && o.extOk && o.overCap === 0));
  add("R6x", !bx.length, `${X.length - bx.length}/${X.length} push runs: closure ≤ ${mx(X.map(o => o.closMax)).toExponential(2)} J/tick, Σ+ ≤ ${f2(mx(X.map(o => o.closPos)), 3)} J, impulse = scheduled, over-capacity ${mx(X.map(o => o.overCap))}; Δτ reported ≤ ${f2(mx(X.map(o => o.dTauMax)))} N·m`); }
// R7, R8
{ const L = get(r => r.set === "P" && r.arm === "B1TR").filter(o => o.released), bad = L.filter(o => !(o.dispRelMm <= 0.5));
  add("R7", !bad.length, `${L.length - bad.length}/${L.length} released runs: displacement across release ≤ ${f2(mx(L.map(o => o.dispRelMm)), 3)} mm (≤ 0.5)${bad.length ? "; failing " + bad.slice(0, 6).map(o => o.id + " " + f2(o.dispRelMm, 2)).join(", ") : ""}`);
  const S = get(r => (r.set === "P" || r.set === "L") && r.arm === "B1TR"), bs = S.filter(o => o.slipMm > 1.0);
  add("R8", !bs.length, `${S.length - bs.length}/${S.length}: stance slip ≤ ${f2(mx(S.map(o => o.slipMm)), 3)} mm (≤ 1.0)${bs.length ? "; failing " + bs.slice(0, 6).map(o => o.id).join(", ") : ""}`); }
// R9
{ const L = get(r => r.set === "HZ"), bad = L.filter(o => { const l = o.lift; return !(o.released && o.tRel <= 3 + o.run.ramp + 2 && postOk(o) && l && l.tL != null && l.airborne === 1 && l.touchdown === 1 && l.bounce === 0 && l.loadAccept === 1 && l.final === "SUPPORT" && o.closMax <= 0.05 && o.closPos <= 0.5); });
  add("R9", L.length === 32 && !bad.length, `${L.length - bad.length}/${L.length} runs at 180 / 480 Hz: release, no contact loss, 5 mm lift sequence, energy${bad.length ? "; failing " + bad.slice(0, 6).map(o => o.id).join(", ") : ""}`); }
// R10
{ const D = get(r => r.set === "D"), pairs = {}; for (const o of D) (pairs[o.id.replace(/_rep\d$/, "")] ||= []).push(o); const ok = Object.values(pairs).filter(p => p.length === 2 && JSON.stringify(p[0].hashes) === JSON.stringify(p[1].hashes));
  add("R10", Object.keys(pairs).length === 3 && ok.length === 3, `${ok.length}/3 pairs bit-identical`); }
// R11
{ let b = null; try { b = JSON.parse(fs.readFileSync(BR)); } catch (e) {} add("R11", b && b.allPass && b.rows.length === 3, b ? `${b.rows.filter(x => x.pass).length}/${b.rows.length}: ${b.rows.map(x => `${x.id} ${x.browser}/${x.node}`).join(", ")}` : "browser check not run"); }
// R12
{ const L = get(r => r.set === "O"), bad = []; for (const o of L) { const f = path.join(E1A, `e1a_${o.run.body}_${o.run.foot}.json.gz`); const e = JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), same = ["1", "2", "3", "4", "5", "6", "7", "8", "9"].every(k => e.hashes[k] === o.hashes[k]); if (!(same && (o.tRel == null || o.tRel > 9.0))) bad.push(o.id); }
  add("R12", L.length === 9 && !bad.length, `${L.length - bad.length}/${L.length} ORIG runs hash-identical to the official E1a at 1–9 s and unreleased by 9.0 s${bad.length ? "; " + bad.join(", ") : ""}`); }
// TS1
{ const L = get(r => r.set === "P" && r.r === 0), bad = L.filter(o => { const b = R[o.id.replace("P_", "P-B1_").replace("_B1TR", "_B1")]; if (!b) return true; const lim = Math.min(o.tRel ?? 1e9, b.tRel ?? 1e9); return Object.keys(o.hashes).filter(k => k !== "end" && +k < lim).some(k => o.hashes[k] !== b.hashes[k]); });
  add("TS1", L.length === 240 && !bad.length, `${L.length - bad.length}/${L.length} B1TR zero-share runs hash-identical to their B1 runs at every 1 s mark before the release${bad.length ? "; differ " + bad.slice(0, 6).map(o => o.id).join(", ") : ""}`); }
// TS2
{ const B = [...get(r => r.set === "P-B1"), ...get(r => r.set === "L-B1"), ...get(r => r.set === "XB" && r.arm === "B1")], loss = B.filter(o => o.released && o.pre.contactLoss > 0);
  add("TS2", loss.length >= 1 && out.criteria.R1.pass && out.criteria.R3.pass && out.criteria.R4.pass, `${loss.length}/${B.length} B1-only runs lose contact after release before any lift command (the defect exists without touchRest: ${loss.slice(0, 5).map(o => o.id).join(", ")}${loss.length > 5 ? " …" : ""}); matched B1TR runs: none (R1 / R3 / R4)`); }
// TS3
{ const L = get(r => r.set === "P-TR" && r.drop >= 0.025), bad = L.filter(o => { const u = path.join(UF, `P_${o.run.body}_${o.run.foot}_d${o.run.drop}_r0_ORIG.json`); if (!fs.existsSync(u)) return true; const og = JSON.parse(fs.readFileSync(u)); const relO = og.tRel != null && og.tRel <= 9, relT = o.tRel != null && o.tRel <= 9; return relO !== relT; });
  add("TS3", L.length === 32 && !bad.length, `${L.length - bad.length}/${L.length} TR-only runs at d ≥ 2.5 cm: release outcome by 9 s = the ORIG outcome (touchRest does not remove the mapping residual); TR-only releases ${L.filter(o => o.tRel != null && o.tRel <= 9).length}/${L.length}${bad.length ? "; mismatch " + bad.slice(0, 6).map(o => o.id).join(", ") : ""}`); }
out.pass = Object.values(out.criteria).every(c => c.pass);
console.log(`\nTOUCH-REST VALIDATION: ${out.pass ? "PASS" : "FAIL"}`); if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

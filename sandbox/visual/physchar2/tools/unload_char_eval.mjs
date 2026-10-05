// ═══ physchar2/tools/unload_char_eval.mjs — evaluator of the unloading characterization V2 (unload_fix/UNLOAD_FIX_PREREG.md §3.4, erratum E-1).
// Acceptance A1–A7 for the candidate B1B3 and causal separation CS1–CS5 across the diagnostic arms, exactly as preregistered.
// usage: node tools/unload_char_eval.mjs --manifest=<json> --results=<dir> --e1a=<e1a/official/runs dir> [--browser=<json>] [--out=<json>]
import fs from "fs"; import path from "path"; import zlib from "zlib";
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const M = JSON.parse(fs.readFileSync(arg("manifest", ""))), RD = arg("results", ""), E1A = arg("e1a", ""), BR = arg("browser", ""), OUT = arg("out", "");
const R = {}; let missing = 0; for (const run of M.runs) { const f = path.join(RD, run.id + ".json"); if (fs.existsSync(f)) R[run.id] = JSON.parse(fs.readFileSync(f)); else missing++; }
const runs = (pred) => M.runs.filter(pred).map(r => R[r.id]).filter(Boolean), out = { missing, criteria: {} };
const add = (id, pass, v, extra = {}) => { out.criteria[id] = { pass: !!pass, v, ...extra }; console.log(`${pass ? "PASS" : "FAIL"} ${id}: ${v}`); };
const f2 = (x, d = 2) => (x == null || !isFinite(x) ? "—" : x.toFixed(d)), mx = (a) => a.reduce((m, x) => Math.max(m, x), -Infinity), mn = (a) => a.reduce((m, x) => Math.min(m, x), Infinity);
const chatter = (r) => r.transRaw.reduce((c, T) => { for (let i = 2; i < T.length; i++) if (T[i].to === T[i - 2].to && T[i].t - T[i - 2].t < 0.06) c++; return c; }, 0);
const P = (arm, pr = () => true) => runs(r => r.set === "P" && r.arm === arm && pr(r));
console.log(`results: ${Object.keys(R).length}/${M.runs.length} (missing ${missing})`);
// ── A1: zero share, released by 9.0 s, TOUCHING afterwards, load < loadOn, no LOAD_ACCEPT after release, no chatter ──
{ const L = P("B1B3", r => r.r === 0), bad = L.filter(o => { const T = o.transRaw[o.nL]; const after = T.filter(x => x.t > o.tRel); return !(o.tRel != null && o.tRel <= 9.0 && !after.some(x => x.to === "LOAD_ACCEPT" || x.to === "SUPPORT") && T[T.length - 1].to === "TOUCHING" && o.maxFzAfterRel < o.loadOnN && chatter(o) === 0); });
  add("A1", L.length === 80 && bad.length === 0, `${L.length - bad.length}/${L.length} zero-share runs released by 9.0 s (release ${f2(mn(L.map(o => o.tRel ?? 99)), 3)}–${f2(mx(L.map(o => o.tRel ?? 99)), 3)} s), TOUCHING after, load after release ≤ ${f2(mx(L.map(o => o.maxFzAfterRel ?? 99)))} N (< loadOn), no LOAD_ACCEPT after release, no chatter${bad.length ? "; failing: " + bad.map(o => o.id).slice(0, 8).join(", ") : ""}`); }
// ── A2a: legitimate small shares (≥ loadOff) never released; A2b: B1B3 hash-identical to B1; A2c: 0.5 % commanded ≤ request ──
{ const L = P("B1B3", r => r.r >= 0.02), bad = L.filter(o => o.transRaw[o.nL].length > 0);
  add("A2a", L.length === 240 && bad.length === 0, `${L.length - bad.length}/${L.length} runs with r ∈ {2, 3, 5 %}: foot n never left SUPPORT (no false release)${bad.length ? "; failing: " + bad.map(o => o.id + " " + o.trans[o.nL].join("/")).slice(0, 6).join(", ") : ""}`);
  const diff = L.filter(o => { const b = R[o.id.replace("_B1B3", "_B1")]; return !b || JSON.stringify(b.hashes) !== JSON.stringify(o.hashes); });
  add("A2b", diff.length === 0, `${L.length - diff.length}/${L.length} B1B3 runs hash-identical to their B1 runs (B3 inactive when both requests ≥ loadOff)${diff.length ? "; differ: " + diff.map(o => o.id).slice(0, 6).join(", ") : ""}`);
  const L5 = P("B1B3", r => r.r === 0.005), viol = L5.filter(o => o.capViolTicks > 0);
  add("A2c", L5.length === 80 && viol.length === 0, `${L5.length - viol.length}/${L5.length} r = 0.5 % runs: commanded share ≤ request at every tick below loadOff (max commanded ${mx(L5.map(o => o.maxCmdShareBelowLoadOff)).toExponential(2)}); released ${L5.filter(o => o.released).length}/${L5.length} (permitted)`); }
// ── A3: perturbations (B1B3) ──
{ const rank = (o) => (/fell/.test(o) ? 3 : /not settled/.test(o) ? 2 : /relocated/.test(o) ? 1 : 0), X = runs(r => r.set === "X" && r.arm === "B1B3");
  const a = X.filter(o => o.run.push.J === 2.5 && o.fell), b = X.filter(o => { const og = R[o.id.replace("_B1B3", "_ORIG")]; return !og || rank(o.outcome) > rank(og.outcome); });
  const c = X.filter(o => { const tp = o.run.push.t, T = o.transRaw[o.nL].filter(x => x.t >= tp); return T.filter(x => x.to === "LOAD_ACCEPT").length > 1 || T.filter(x => x.from === "SUPPORT" && x.to === "UNLOADING").length > 1 || chatter(o) > 0; });
  const d = X.filter(o => !o.fell && o.slipMm > 20);
  add("A3", X.length === 128 && !a.length && !b.length && !c.length && !d.length, `${X.length} B1B3 perturbation runs: (a) falls at 2.5 N·s ${a.length}; (b) worse outcome class than ORIG ${b.length}${b.length ? " [" + b.map(o => o.id + " " + o.outcome + " vs " + R[o.id.replace("_B1B3", "_ORIG")].outcome).slice(0, 4).join("; ") + "]" : ""}; (c) >1 LOAD_ACCEPT / >1 release after the push or chatter ${c.length}; (d) slip > 20 mm (non-falling) ${d.length}; outcomes ${JSON.stringify(X.reduce((m, o) => ((m[o.outcome] = (m[o.outcome] || 0) + 1), m), {}))} (ORIG ${JSON.stringify(runs(r => r.set === "X" && r.arm === "ORIG").reduce((m, o) => ((m[o.outcome] = (m[o.outcome] || 0) + 1), m), {}))})`); }
// ── A4: safety (B1B3 production) ──
{ const L = P("B1B3"), bad = L.filter(o => !(o.closMax <= 0.05 && o.closPos <= 0.5 && o.dTauMaxNonOnset <= 10 && o.dTauMax <= 25 && o.dTau0Max <= 30 && o.authorityWrites === 0 && o.extImpulse === 0 && (o.dispRelMm == null || o.dispRelMm <= 0.5)));
  add("A4", L.length === 400 && bad.length === 0, `${L.length - bad.length}/${L.length}: closure max ${mx(L.map(o => o.closMax)).toExponential(2)} J/tick, Σ+ max ${f2(mx(L.map(o => o.closPos)), 3)} J; applied Δτ max ${f2(mx(L.map(o => o.dTauMaxNonOnset)))} N·m (non-onset), ${f2(mx(L.map(o => o.dTauMax)))} N·m (all); Δτ0 max ${f2(mx(L.map(o => o.dTau0Max)))} N·m; authority writes ${mx(L.map(o => o.authorityWrites))}; external impulse ${mx(L.map(o => o.extImpulse))}; foot displacement across release max ${f2(mx(L.filter(o => o.dispRelMm != null).map(o => o.dispRelMm)), 3)} mm${bad.length ? "; failing: " + bad.map(o => o.id).slice(0, 6).join(", ") : ""}`);
  const X = runs(r => r.set === "X" && r.arm === "B1B3"), bx = X.filter(o => !(o.closMax <= 0.05 && o.closPos <= 0.5 && o.authorityWrites === 0 && o.extOk));
  add("A4x", bx.length === 0, `${X.length - bx.length}/${X.length} perturbation runs: closure max ${mx(X.map(o => o.closMax)).toExponential(2)} J/tick, Σ+ max ${f2(mx(X.map(o => o.closPos)), 3)} J, authority 0, impulse = scheduled; Δτ reported: max ${f2(mx(X.map(o => o.dTauMax)))} N·m`); }
// ── A5: determinism ──
{ const D = runs(r => r.set === "D"), pairs = {}; for (const o of D) (pairs[o.id.replace(/_rep\d$/, "")] ||= []).push(o); const ok = Object.values(pairs).filter(p => p.length === 2 && JSON.stringify(p[0].hashes) === JSON.stringify(p[1].hashes));
  add("A5", Object.keys(pairs).length === 2 && ok.length === 2, `${ok.length}/2 pairs bit-identical (${Object.keys(pairs).join(", ")})`); }
// ── A6: browser = Node ──
{ let b = null; try { b = JSON.parse(fs.readFileSync(BR)); } catch (e) {} add("A6", b && b.allPass && b.rows.length === 2, b ? `${b.rows.filter(x => x.pass).length}/${b.rows.length} ${b.rows.map(x => `${x.id} ${x.browser}/${x.node}`).join(", ")}` : "browser check not run"); }
// ── A7: the original configuration reproduces the official E1a failure ──
{ const L = P("ORIG", r => r.r === 0 && r.drop === 0.025 && (r.foot === "L" || r.body === "V2-REF")), bad = [];
  for (const o of L) { const f = path.join(E1A, `e1a_${o.run.body}_${o.run.foot}.json.gz`); if (!fs.existsSync(f)) continue; const e = JSON.parse(zlib.gunzipSync(fs.readFileSync(f))), same = ["1", "2", "3", "4", "5", "6", "7", "8", "9"].every(k => e.hashes[k] === o.hashes[k]);
    if (!(same && (o.tRel == null || o.tRel > 9.0))) bad.push(`${o.id}${same ? "" : " (hash differs)"}${o.tRel != null && o.tRel <= 9 ? " (released " + o.tRel + ")" : ""}`); }
  add("A7", L.length === 9 && bad.length === 0, `${L.length - bad.length}/${L.length} ORIG runs (2.5 cm, zero share; 8 bodies L + V2-REF R) hash-identical to the official E1a runs at 1–9 s and not released by 9.0 s${bad.length ? "; " + bad.join("; ") : ""}`); }
// ── causal separation (set R) ──
const Rs = (arm, pr = () => true) => runs(r => r.set === "R" && r.arm === arm && pr(r)), key = (o) => `${o.run.body}|${o.run.foot}|${o.run.drop}`, byKey = (arm) => Object.fromEntries(Rs(arm).map(o => [key(o), o]));
const KO = byKey("ORIG"), K1 = byKey("B1"), K3 = byKey("B3"), K13 = byKey("B1B3"), keys = Object.keys(KO);
{ const sel = (K) => keys.filter(k => K[k] && K[k].run.drop >= 0.010 && Math.abs(K[k].termTail) >= 1).map(k => K[k].fPD);
  const b1 = [...sel(K1), ...sel(K13)], nb = [...sel(KO), ...sel(K3)];
  add("CS1", b1.length > 0 && nb.length > 0 && mx(b1) <= 0.10 && mn(nb) >= 0.50, `stance-knee f_PD (d ≥ 1 cm, |term| ≥ 1 N·m): B1/B1B3 max ${f2(mx(b1), 3)} (≤ 0.10, n ${b1.length}); ORIG/B3 min ${f2(mn(nb), 3)} (≥ 0.50, n ${nb.length})`); }
{ const L = keys.filter(k => KO[k].run.drop >= 0.020 && K1[k]), bad = L.filter(k => !(KO[k].residualN - K1[k].residualN >= 0.5 * KO[k].residualN));
  add("CS2", L.length > 0 && bad.length === 0, `${L.length - bad.length}/${L.length} (d ≥ 2 cm): R_ORIG − R_B1 ≥ 0.5·R_ORIG; R_ORIG ${f2(mn(L.map(k => KO[k].residualN)))}–${f2(mx(L.map(k => KO[k].residualN)))} N → R_B1 ${f2(mn(L.map(k => K1[k].residualN)))}–${f2(mx(L.map(k => K1[k].residualN)))} N${bad.length ? "; failing " + bad.slice(0, 5).join(", ") : ""}`); }
{ const cap = [...Rs("B3"), ...Rs("B1B3")].filter(o => o.capViolTicks > 0), L = keys.filter(k => K1[k] && K13[k]), dev = L.map(k => { const W = K1[k].W; return Math.abs((K1[k].residualN - K13[k].residualN) - K1[k].leakN) / W * 100; });
  add("CS3", cap.length === 0 && mx(dev) <= 0.25, `B3/B1B3 commanded share ≤ request below loadOff at every tick: ${cap.length ? cap.length + " runs violate" : "all"}; |(R_B1 − R_B1B3) − F_leak,B1| max ${f2(mx(dev), 3)} % BW (≤ 0.25; F_leak,B1 ${f2(mn(L.map(k => K1[k].leakN)))}–${f2(mx(L.map(k => K1[k].leakN)))} N)`); }
{ const L = keys.filter(k => K3[k] && KO[k].run.drop >= 0.010 && Math.abs(KO[k].termTail) >= 1 && KO[k].fPD != null && K3[k].fPD != null), d = L.map(k => Math.abs(K3[k].fPD - KO[k].fPD));
  add("CS4", L.length > 0 && mx(d) <= 0.15, `|f_PD(B3) − f_PD(ORIG)| max ${f2(mx(d), 3)} (≤ 0.15, n ${L.length}): B3 alone does not remove the mapping residual`); }
{ const L = keys.filter(k => K13[k]), v = L.map(k => K13[k].residualPct);
  add("CS5", L.length === 80 && mx(v) <= 0.5, `R_B1B3 max ${f2(mx(v), 3)} % BW over ${L.length} (≤ 0.5 %; all drops incl. 0 cm)`); }
// residual table (report)
out.residualTable = keys.map(k => ({ key: k, ORIG: KO[k].residualN, B1: K1[k] && K1[k].residualN, B3: K3[k] && K3[k].residualN, B1B3: K13[k] && K13[k].residualN, fPD_ORIG: KO[k].fPD, fPD_B1: K1[k] && K1[k].fPD, leak_B1: K1[k] && K1[k].leakN, term: KO[k].termTail, W: KO[k].W }));
out.pass = ["A1", "A2a", "A2b", "A2c", "A3", "A4", "A4x", "A5", "A6", "A7", "CS1", "CS2", "CS3", "CS4", "CS5"].every(id => out.criteria[id] && out.criteria[id].pass);
console.log(`\nUNLOADING CHARACTERIZATION (B1B3 candidate + causal separation): ${out.pass ? "PASS" : "FAIL"}`); if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

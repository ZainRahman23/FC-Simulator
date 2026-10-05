// ═══ physchar2/tools/touchrest_regress_eval.mjs — G0–G3 regression of configuration C (touch_semantics/TOUCHREST_PREREG.md §4): the unload-fix V3 items
// and pass rules (unload_fix/UNLOAD_FIX_PREREG.md §4, which take the qualification-v2 rules), with the flags ffLockedAxis + touchRest. Written before
// the regression runs. The G2 / G3 rows are evaluated by the frozen tools/qual_eval.mjs, the twist battery by the frozen tools/twist_policy_eval.mjs +
// tools/close_eval.mjs --policy; this script reads their outputs and applies the V3 rules to the remaining items (rules copied from eval_q.mjs of
// qualification v2: Q2a → V3.8, Q6c → V3.9, Q7 → V3.10).
// usage: node tools/touchrest_regress_eval.mjs <battery dir> <qualification evidence dir (knee_correction/evidence/qual)> <unload_fix/evidence> [out.json]
import fs from "fs"; import path from "path"; import zlib from "zlib";
const [C, QUAL, UFE, OUTF] = process.argv.slice(2), rd = (f) => JSON.parse(f.endsWith(".gz") ? zlib.gunzipSync(fs.readFileSync(f)) : fs.readFileSync(f)), rt = (f) => fs.readFileSync(f, "utf8"), out = {};
const say = (id, pass, msg) => { out[id] = { pass, msg }; console.log(`${pass === null ? "rep " : pass ? "PASS" : "FAIL"} ${id}: ${msg}`); };
const BODIES = ["V2-REF", "V2-165-62", "V2-198-92", "V2-175-70", "V2-190-85", "V2-short-legs", "V2-long-legs", "V1-matched"], B3 = BODIES.slice(0, 3), tryRd = (f) => { try { return rd(f); } catch (e) { return null; } };
// V3.1 KV0 + suite
{ const kv = rt(path.join(C, "q0_hashcmp.txt")) === rt(path.join(C, "hash_head.txt")), s = rd(path.join(C, "q0_regressions.json")).results, bad = s.filter(r => !r.pass), g = rt(path.join(C, "q0_guard_v1.log")).trim().split("\n").pop();
  say("V3.1", kv && !bad.length && /OK|PASS/.test(g) && !/FAIL/.test(g), `KV0 4 G3 hashes ${kv ? "IDENTICAL to hash_head" : "DIFFER"}; suite ${s.length - bad.length}/${s.length}${bad.length ? " (failing " + bad.map(r => r.id).join(", ") + ")" : ""}; V1 guard (worktree): ${g}`); }
// V3.2 bench: the passive knee layer untouched (bench / rig output identical to qualification v2); the B1 bench identical to the unload-fix evidence
{ const same = (a, b) => { try { return rt(a) === rt(b); } catch (e) { return false; } }, b = same(path.join(C, "q1/bench.json"), path.join(QUAL, "q1/bench.json")), r = same(path.join(C, "q1/rig_v2k.json"), path.join(QUAL, "q1/rig_v2k.json")), b1 = same(path.join(C, "q1/b1_bench.json"), path.join(UFE, "b1_bench.json"));
  say("V3.2", b && r && b1, `knee bench ${b ? "identical" : "DIFFERS"}; rig (all parts, crit v2) ${r ? "identical" : "DIFFERS"}; B1 bench ${b1 ? "identical to unload_fix/evidence/b1_bench.json" : "DIFFERS"}`); }
// V3.3 G0: every row (0.V1 needs the git checkout → the worktree guard of V3.1)
{ const L = rt(path.join(C, "q3/g0.log")).split("\n"), fails = L.filter(l => /^\s+FAIL\s/.test(l)).map(l => l.trim().split(/\s+/)[1]), bad = fails.filter(id => id !== "0.V1"), rows = L.filter(l => /^\s+(PASS|FAIL)\s/.test(l)).length;
  say("V3.3", rows > 0 && !bad.length, `${rows - fails.length}/${rows} rows pass; failing: ${fails.join(", ") || "none"} (0.V1 = the V1 freeze guard, run in the worktree: V3.1)`); }
// V3.4 G1 (no controller): every run hash identical to qualification v2, verdicts as there
{ const a = rd(path.join(QUAL, "q3/g1_results_qual.json.gz")), b = rd(path.join(C, "q3/g1_results_v4.json")), key = (r) => `${r.human}|${r.key}|${JSON.stringify(r.cfg || "")}`, A = new Map(a.runs.map(r => [key(r), r.hash]));
  const diff = b.runs.filter(r => A.get(key(r)) !== r.hash).map(key), miss = a.runs.length - b.runs.filter(r => A.has(key(r))).length;
  const fq = rt(path.join(QUAL, "q3/g1.log")).split("\n").filter(l => /^\s+FAIL\s/.test(l)).map(l => l.trim().split(/\s+/)[1]).sort().join(","), fb = rt(path.join(C, "q3/g1.log")).split("\n").filter(l => /^\s+FAIL\s/.test(l)).map(l => l.trim().split(/\s+/)[1]).sort().join(",");
  say("V3.4", !diff.length && !miss && b.runs.length === a.runs.length && fq === fb, `${b.runs.length - diff.length}/${b.runs.length} run hashes identical to qualification v2 (missing ${miss}${diff.length ? "; differ " + diff.slice(0, 6).join(", ") : ""}); failing rows ${fb || "none"} (qualification: ${fq}; 1.S′ = the KC-4 exception, 1.V1 = the guard)`); }
// V3.5 / V3.6 G2 + G3 (qual_eval.mjs: G2 v1 gating rows with the re-measured browser; G3 v3.3 gating rows with K′, J2a re-measured, O re-measured)
{ const q = tryRd(path.join(C, "q3/qual_eval_v4.json"));
  say("V3.5", !!(q && q.G2 && q.G2.pass), q ? `G2: ${q.G2.rows.filter(r => !r.replaced && !r.reportOnly && r.pass).length}/${q.G2.rows.filter(r => !r.replaced && !r.reportOnly).length} gating rows; failing ${q.G2.rows.filter(r => !r.replaced && !r.reportOnly && !r.pass).map(r => r.id).join(", ") || "none"}` : "qual_eval output missing");
  const g3f = q ? q.G3.rows.filter(r => !r.replaced && !r.reportOnly && !(r.id === "K" ? q.G3.Kprime.pass : r.pass)).map(r => r.id) : null;
  say("V3.6", !!(q && q.G3 && q.G3.pass), q ? `G3 v3.3 (K → K′): failing ${g3f.join(", ") || "none"}; J2a ${(q.G3.rows.find(r => r.id === "J2a") || {}).value || "—"}; O ${(q.G3.rows.find(r => r.id === "O") || {}).value || "—"}` : "qual_eval output missing"); }
// V3.7 twist battery: reference meets C1′, C1q, C2–C6, C7′ on all 8 bodies (twist_policy_eval: every frozen criterion except C1 / C7, which are superseded by close_eval's C1′ / C7′)
{ const t = tryRd(path.join(C, "q3/twist_eval_v4.json")), c = tryRd(path.join(C, "q3/close_eval_policy_v4.json"));
  const ref = t && t["0.13"] && t["0.13"].ref, other = ref ? Object.entries(ref.fails).filter(([k]) => k !== "C1" && k !== "C7") : null, per = c && c.C1 && c.C1["0.13/ref"];
  const c1p = per ? Object.entries(per).filter(([, v]) => !v.C1p).map(([b]) => b) : null, c7p = per ? Object.entries(per).filter(([, v]) => !v.C7p).map(([b]) => b) : null;
  say("V3.7", !!(ref && !ref.missing && per && Object.keys(per).length === 8 && !other.length && !c1p.length && !c7p.length), ref && per ? `reference: other criteria failing ${other.map(([k, bs]) => `${k}[${bs.join(",")}]`).join(" ") || "none"}; C1′ fails ${c1p.join(", ") || "none"}; C7′ fails ${c7p.join(", ") || "none"}; (frozen C1 ${(ref.fails.C1 || []).join(",") || "none"}, C7 ${(ref.fails.C7 || []).join(",") || "none"}); missing ${ref.missing}` : "twist evaluation missing"); }
// V3.8 KV6c 8 bodies (qualification Q2a rule)
{ const R = BODIES.map(h => ({ h, j: tryRd(path.join(C, `q2/kv6c_${h}.json`)) })), bad = R.filter(({ j }) => !(j && j.pass && !j.fell && j.slipMm <= 0.5 && j.knees.every(k => k.devMax <= 2.0)));
  say("V3.8", !bad.length, `${R.length - bad.length}/${R.length} bodies (no fall, slip ≤ 0.5 mm, |θ−θ0| ≤ 2.0°): ` + R.map(({ h, j }) => (j ? `${h} ${j.outcome} slip ${j.slipMm.toFixed(3)} dev ${Math.max(...j.knees.map(k => k.devMax)).toFixed(2)}°` : `${h} missing`)).join("; ")); }
// V3.9 boundary harness (qualification Q6c rule)
{ const Bp = []; for (const h of B3) for (const hz of [180, 240, 480]) { const j = tryRd(path.join(C, `q6/boundary_${h}_hz${hz}.json`)), ok = !!j && !/fell/.test(j.outcome) && j.chatterL === 0 && j.closure.maxPerTickJ <= 0.05; Bp.push({ ok, s: j ? `${h} ${hz} Hz ${j.outcome}, chatter ${j.chatterL}, closure max/tick ${j.closure.maxPerTickJ.toExponential(2)} J` : `${h} ${hz} missing` }); }
  say("V3.9", Bp.every(r => r.ok), Bp.map(r => (r.ok ? "" : "✗ ") + r.s).join("; ")); }
// V3.10 yaw decomposition (qualification Q7 rule)
{ const rows = [], flags = []; let okT = true, okA = true, okRun = true;
  for (const sc of ["A", "B"]) for (const h of B3) { const v = tryRd(path.join(C, `q7/yaw_${sc}_${h}_v2k.json`)), o = tryRd(path.join(C, `q7/yaw_${sc}_${h}_old.json`)); if (!v || !o) { okRun = false; continue; }
    for (const sd of Object.keys(v.sides)) { const p = v.sides[sd].peak, have = ["ground", "ankle", "knee", "hip", "upper", "pelvis"].every(k => Number.isFinite(p[k])), tel = Math.abs(p.ground + p.ankle + p.knee + p.hip - p.pelvis);
      okRun = okRun && have; okT = okT && tel <= 1e-6; if (sc === "A") okA = okA && v.sides[sd].closureMaxDeg <= 0.3;
      const V = v.sides[sd], O = o.sides[sd] || { outSoftDeg: {}, outHardDeg: {} };
      for (const e of ["ankle", "hip"]) { if (V.outSoftDeg[e] > 0 && !(O.outSoftDeg[e] > 0)) flags.push(`${sc} ${h} ${sd}: ${e} leaves its soft range with v2k only`); if (V.outHardDeg[e] > 0 && !(O.outHardDeg[e] > 0)) flags.push(`${sc} ${h} ${sd}: ${e} beyond hard with v2k only`); }
      if (V.outSoftDeg.knee > 0) flags.push(`${sc} ${h} ${sd}: knee leaves its v2k zero-torque range`); if (V.slipMaxMm > 0.5) flags.push(`${sc} ${h} ${sd}: ground slip ${V.slipMaxMm.toFixed(2)} mm`); if (V.footYawMaxDeg > 0.5) flags.push(`${sc} ${h} ${sd}: foot yaw ${V.footYawMaxDeg.toFixed(2)}°`);
      rows.push({ sc, tel, closureMaxDeg: V.closureMaxDeg }); } }
  say("V3.10", okRun && okT && okA && !flags.length, `${rows.length} stance-leg decompositions (complete: ${okRun}); telescoping max ${rows.length ? Math.max(...rows.map(r => r.tel)).toExponential(1) : "—"}° (≤ 1e-6); A closure max ${rows.length ? Math.max(...rows.filter(r => r.sc === "A").map(r => r.closureMaxDeg)).toFixed(3) : "—"}° (≤ 0.3); masking flags ${flags.join(" | ") || "none"}`); }
out.pass = Object.entries(out).filter(([, v]) => v && v.pass !== null).every(([, v]) => v.pass);
console.log(`\nG0–G3 REGRESSION (configuration C): ${out.pass ? "PASS" : "FAIL"}`); if (OUTF) fs.writeFileSync(OUTF, JSON.stringify(out, null, 1));

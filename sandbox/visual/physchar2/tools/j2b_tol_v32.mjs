// ═══ physchar2/tools/j2b_tol_v32.mjs — applies the PRE-REGISTERED J2b tolerance procedure of g3/G3_CRITERIA_v3.2.md (overnight Phase B) to the final
// characterisation (j2b_floor.json) ∪ held-out (j2b_floor_heldout.json) population, then scores the injection set (j2b_floor_inject.json).
// Classes (G3-relevant only): A no fall, every foot within 1.0 mm of its start in both trials for the whole run; B no fall, sliding > 1.0 mm;
// C a G3 request that fails physically THROUGH THE COMMON SUPERVISOR ABORT (both trials abort; scored up to the earlier abort, as j2b_floor
// scores C). Excluded and reported: G2 falls (not a G3 criterion) and G3 falls without a common abort. Repeats (determinism checks) are not
// part of the population. Rule: m_k = max over P; the user's provisional t_k (A 0.25, B 5, C 1 mm; timing 5 ticks) is accepted iff t_k ≥ 2·m_k,
// otherwise t_k = the smallest of {0.25, 0.5, 1, 2, 5, 10, 20} mm with t_k ≥ 2·m_k; timing: accepted iff 5 ≥ 2·max (and ≥ 2), otherwise
// 2·max rounded up. Pairs above 3 × the class p99 are FLAGGED (listed), never dropped. Meaningfulness: with the resulting tolerances, each
// injected asymmetry must produce ≥ 1 J2b failure (class mismatch, a score above its class tolerance, or a C timing difference above the timing
// tolerance) in at least two of the three injections; otherwise the check is reported as too loose to detect a 5 % asymmetry.
// usage: node tools/j2b_tol_v32.mjs   → g3/json/j2b_tol_v32.json (+ a summary on stdout)
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), JD = path.resolve(here, "../../../../review_artifacts/physical_character_v2/g3/json"), ld = (f) => JSON.parse(fs.readFileSync(path.join(JD, f)));
const PROV = { A: 0.25, B: 5, C: 1, abortTicks: 5 }, LADDER = [0.25, 0.5, 1, 2, 5, 10, 20], TICK = 1 / 240;
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : NaN; };
const dist = (a) => ({ n: a.length, median: q(a, 0.5), p90: q(a, 0.9), p99: q(a, 0.99), max: a.length ? Math.max(...a) : NaN });
const ticks = (j) => Math.round(Math.abs(j.abortA - j.abortB) / TICK);
// v3.2 class of one pair (null = excluded from the G3-relevant population, with the reason)
function cls32(j) { if (j.klass === "A" || j.klass === "B") return { k: j.klass };
  if (j.kind !== "G3") return { k: null, why: "G2 fall (not a G3 criterion)" };
  if (j.abortA != null && j.abortB != null) return { k: "C" };
  return { k: null, why: j.abortA == null && j.abortB == null ? "G3 fall without a supervisor abort" : "G3 fall, abort in one trial only" }; }
const char = ld("j2b_floor.json"), held = ld("j2b_floor_heldout.json"), inj = ld("j2b_floor_inject.json");
const errs = [char, held, inj].map(F => F.jobs.filter(j => j.error).length);
const P = [...char.jobs.map(j => ({ ...j, set: "characterisation" })), ...held.jobs.map(j => ({ ...j, set: "held-out" }))].filter(j => !j.error && j.repeatOf == null);
const rows = P.map(j => ({ ...j, c32: cls32(j) })), use = rows.filter(r => r.c32.k), excl = rows.filter(r => !r.c32.k);
const out = { generated: "tools/j2b_tol_v32.mjs", criteria: "g3/G3_CRITERIA_v3.2.md (J2b tolerance procedure, pre-registered at 5b9d756)", inputs: { characterisation: char.jobs.length, heldout: held.jobs.length, inject: inj.jobs.length, errors: errs },
  population: { pairs: rows.length, used: use.length, excluded: excl.length, excludedWhy: excl.reduce((o, r) => ((o[r.c32.why] = (o[r.c32.why] || 0) + 1), o), {}) }, classes: {}, timing: null, tolerances: {}, flags: [], inject: {} };
for (const k of ["A", "B", "C"]) { const r = use.filter(x => x.c32.k === k), v = r.map(x => x.posDiffMm), d = dist(v), m = d.max, accept = r.length ? PROV[k] >= 2 * m : true, t = accept ? PROV[k] : LADDER.find(x => x >= 2 * m) ?? null;
  out.classes[k] = { ...d, bySet: { characterisation: dist(r.filter(x => x.set === "characterisation").map(x => x.posDiffMm)), heldout: dist(r.filter(x => x.set === "held-out").map(x => x.posDiffMm)) }, provisional: PROV[k], twiceMax: 2 * m, provisionalAccepted: accept, toleranceMm: t, marginFactor: m > 0 ? t / m : null };
  out.tolerances[k] = t; const thr = 3 * d.p99; for (const x of r) if (d.p99 > 0 && x.posDiffMm > thr) out.flags.push({ class: k, set: x.set, human: x.human, fam: x.fam, a: x.a, pert: x.pert, posDiffMm: x.posDiffMm, threshold3p99: thr }); }
{ const C = use.filter(x => x.c32.k === "C"), dt = C.map(ticks), mx = dt.length ? Math.max(...dt) : 0, accept = PROV.abortTicks >= Math.max(2, 2 * mx), t = accept ? PROV.abortTicks : Math.max(2, Math.ceil(2 * mx));
  out.timing = { n: dt.length, maxTicks: mx, dist: dt.reduce((o, v) => ((o[v] = (o[v] || 0) + 1), o), {}), provisional: PROV.abortTicks, provisionalAccepted: accept, toleranceTicks: t }; out.tolerances.abortTicks = t; }
// class mismatches inside the population (always required: identical class) — reported (a population pair is a physical-floor sample, not a gate pair)
out.population.classMismatch = rows.filter(r => r.kind !== "G2self" && r.clsA !== r.clsB).map(r => `${r.set} ${r.human} ${r.a} δ=${r.pert}: ${r.clsA} / ${r.clsB}`);
out.population.abortOneSided = rows.filter(r => r.kind === "G3" && (r.abortA == null) !== (r.abortB == null)).map(r => `${r.set} ${r.human} ${r.a} δ=${r.pert} (${r.klass})`);
// meaningfulness: the injection set scored with the resulting tolerances
const T = out.tolerances, injRows = inj.jobs.filter(j => !j.error && j.repeatOf == null);
for (const name of [...new Set(injRows.map(j => j.inject))]) { const r = injRows.filter(j => j.inject === name), fails = [];
  for (const j of r) { const c = cls32(j), why = [];
    if (j.clsA !== j.clsB) why.push(`class ${j.clsA} / ${j.clsB}`);
    if (c.k && j.posDiffMm > T[c.k]) why.push(`${c.k} ${j.posDiffMm.toFixed(3)} mm > ${T[c.k]}`);
    if (c.k === "C" && ticks(j) > T.abortTicks) why.push(`abort Δ ${ticks(j)} ticks > ${T.abortTicks}`);
    if (!c.k && j.kind === "G3" && (j.abortA == null) !== (j.abortB == null)) why.push("abort in one trial only");
    if (why.length) fails.push(`${j.a}: ${why.join("; ")}`); }
  out.inject[name] = { pairs: r.length, failures: fails.length, detected: fails.length > 0, detail: fails, posDiffMm: dist(r.map(j => j.posDiffMm)) }; }
const injK = Object.keys(out.inject).filter(k => k !== "none"), nDet = injK.filter(k => out.inject[k].detected).length;   // "none" = the uninjected control pairs (reported, not counted)
out.meaningful = nDet >= 2; out.meaningfulDetail = `${nDet} of ${injK.length} injected asymmetries produce ≥ 1 J2b failure (control "none": ${out.inject.none ? out.inject.none.failures : "—"} failures)`;
// diagnostic context (not part of the rule): per injection, the largest mirrored difference by class next to the population maximum of that class
out.injectByClass = Object.fromEntries(Object.keys(out.inject).map(k => [k, Object.fromEntries(["A", "B", "C"].map(c => { const v = injRows.filter(j => j.inject === k && cls32(j).k === c).map(j => j.posDiffMm); return [c, { n: v.length, max: v.length ? Math.max(...v) : null, populationMax: out.classes[c].max, tolerance: T[c] }]; }))]));
fs.writeFileSync(path.join(JD, "j2b_tol_v32.json"), JSON.stringify(out, null, 1));
const f = (x, n = 4) => (x == null || !isFinite(x) ? "—" : (+x).toFixed(n));
console.log(`population: ${rows.length} pairs (char ${char.jobs.length}, held-out ${held.jobs.length}; errors ${errs.join("/")}), used ${use.length}, excluded ${excl.length} ${JSON.stringify(out.population.excludedWhy)}`);
for (const k of ["A", "B", "C"]) { const c = out.classes[k]; console.log(`class ${k}: n ${c.n}, median ${f(c.median)}, p99 ${f(c.p99)}, max ${f(c.max)} mm (char max ${f(c.bySet.characterisation.max)}, held-out max ${f(c.bySet.heldout.max)}) → provisional ${c.provisional} mm ${c.provisionalAccepted ? "ACCEPTED" : "REJECTED"} (2·max ${f(c.twiceMax)}) → t_${k} = ${c.toleranceMm} mm (${f(c.marginFactor, 1)} × max)`); }
console.log(`timing (C): n ${out.timing.n}, max ${out.timing.maxTicks} ticks ${JSON.stringify(out.timing.dist)} → provisional ${PROV.abortTicks} ${out.timing.provisionalAccepted ? "ACCEPTED" : "REJECTED"} → ${out.timing.toleranceTicks} ticks`);
console.log(`flags (> 3 × class p99): ${out.flags.length}`); for (const x of out.flags) console.log(`  ${x.class} ${x.set} ${x.human} ${x.a} δ=${x.pert}: ${f(x.posDiffMm)} mm (3·p99 ${f(x.threshold3p99)})`);
console.log(`population class mismatches: ${out.population.classMismatch.length}; one-sided aborts: ${out.population.abortOneSided.length}`);
for (const [k, v] of Object.entries(out.inject)) { console.log(`inject ${k}: ${v.failures}/${v.pairs} pairs fail J2b (posDiff max ${f(v.posDiffMm.max)} mm)`); for (const d of v.detail.slice(0, 6)) console.log(`    ${d}`); }
for (const [k, v] of Object.entries(out.injectByClass)) console.log(`  ${k.padEnd(13)} max by class (population max / tolerance): ` + ["A", "B", "C"].map(c => `${c} ${f(v[c].max, 3)} (${f(v[c].populationMax, 3)} / ${v[c].tolerance})`).join(", "));
console.log(`MEANINGFUL: ${out.meaningful} (${out.meaningfulDetail})${out.meaningful ? "" : " → too loose to detect a 5 % asymmetry: G3 is NOT declared on J2b (G3_CRITERIA_v3.2.md step 4)"}`);

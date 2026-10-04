// ═══ physchar2/tools/j2b_report.mjs — report of the independent J2b floor characterisation (g3/J2B_FLOOR_PREREG.md): distributions per class / family /
// body, the pre-registered recommendation (smallest 1–2–5 value ≥ 2 × the class maximum), outlier flags (> 3 × class p99), determinism of the
// repeated runs, perturbation sensitivity, contact transitions, and the creation-order attribution.   usage: node tools/j2b_report.mjs [--md]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), J = path.resolve(here, "../../../../review_artifacts/physical_character_v2/g3/json");
const F = JSON.parse(fs.readFileSync(path.join(J, "j2b_floor.json"))), A = fs.existsSync(path.join(J, "j2b_floor_attribution.json")) ? JSON.parse(fs.readFileSync(path.join(J, "j2b_floor_attribution.json"))) : null;
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : NaN; }, f = (x, n = 3) => (x == null || !isFinite(x) ? "—" : (+x).toFixed(n));
const series = (x) => { for (let e = -4; e <= 3; e++) for (const m of [1, 2, 5]) { const v = m * Math.pow(10, e); if (v >= x - 1e-15) return +v.toPrecision(3); } return Infinity; };
const ok = F.jobs.filter(j => !j.error), base = ok.filter(j => j.repeatOf == null), L = [], out = { classes: {}, families: {}, bodies: {} };
const dist = (a) => ({ n: a.length, median: q(a, 0.5), p90: q(a, 0.9), p99: q(a, 0.99), max: a.length ? Math.max(...a) : NaN });
// C windows split by sliding before the declaration (as J2b scores them)
const key = (j) => (j.klass === "C" ? (j.onsetS != null ? "C-sliding" : "C-non-sliding") : j.klass);
for (const k of ["A", "B", "C-non-sliding", "C-sliding"]) { const r = base.filter(j => key(j) === k), d = dist(r.map(j => j.posDiffMm)); out.classes[k] = { ...d, recommendedMm: isFinite(d.max) ? series(2 * d.max) : null, outliers: r.filter(j => j.posDiffMm > 3 * d.p99 && d.p99 > 0).map(j => `${j.human} ${j.fam} ${j.a} δ=${j.pert}: ${f(j.posDiffMm, 4)} mm`).slice(0, 8), driver: r.slice().sort((x, y) => y.posDiffMm - x.posDiffMm)[0] }; }
for (const fam of [...new Set(base.map(j => j.fam))]) { const r = base.filter(j => j.fam === fam); out.families[fam] = { n: r.length, classes: [...new Set(r.map(key))].join("/"), ...dist(r.map(j => j.posDiffMm)) }; }
for (const h of [...new Set(base.map(j => j.human))]) { const r = base.filter(j => j.human === h); out.bodies[h] = Object.fromEntries(["A", "B", "C-non-sliding", "C-sliding"].map(k => [k, dist(r.filter(j => key(j) === k).map(j => j.posDiffMm))])); }
// timing compatibility in C
const C = base.filter(j => j.klass === "C"), tick = 1 / 240, dAbort = C.filter(j => j.abortA != null && j.abortB != null).map(j => Math.round(Math.abs(j.abortA - j.abortB) / tick)), dFall = C.filter(j => j.fallA != null && j.fallB != null).map(j => Math.round(Math.abs(j.fallA - j.fallB) / tick));
const oneSided = C.filter(j => (j.fallA == null) !== (j.fallB == null)).map(j => `${j.human} ${j.a} δ=${j.pert}`), clsMis = base.filter(j => j.kind !== "G2self" && j.clsA !== j.clsB).map(j => `${j.human} ${j.a} δ=${j.pert}: ${j.clsA} / ${j.clsB}`);
out.timing = { abortTicksMax: dAbort.length ? Math.max(...dAbort) : null, fallTicksMax: dFall.length ? Math.max(...dFall) : null, fallTicksDist: dFall.reduce((o, v) => ((o[v] = (o[v] || 0) + 1), o), {}), oneSidedFalls: oneSided, classMismatch: clsMis };
out.timing.recommendedTicks = Math.max(1, 2 * Math.max(out.timing.abortTicksMax || 0, out.timing.fallTicksMax || 0));
// determinism of repeats
const byId = new Map(ok.map(j => [j.id, j])), rep = ok.filter(j => j.repeatOf != null).map(j => { const o = byId.get(j.repeatOf); return o && o.hashA === j.hashA && o.hashB === j.hashB && o.posDiffMm === j.posDiffMm; });
out.determinism = { repeats: rep.length, identical: rep.filter(Boolean).length };
// perturbation sensitivity: per base situation, the spread of posDiff across δ
const sit = {}; for (const j of base) { const k = `${j.human}|${j.fam}|${j.a}`; (sit[k] = sit[k] || []).push(j); }
const spread = Object.values(sit).map(r => { const z = r.find(j => !j.pert), d6 = r.filter(j => j.pert === 1e-6), d3 = r.filter(j => j.pert === 1e-3); return z ? { k: key(z), base: z.posDiffMm, d6: Math.max(...d6.map(j => Math.abs(j.posDiffMm - z.posDiffMm)), 0), d3: Math.max(...d3.map(j => Math.abs(j.posDiffMm - z.posDiffMm)), 0) } : null; }).filter(Boolean);
out.perturbation = Object.fromEntries(["A", "B", "C-non-sliding", "C-sliding"].map(k => { const r = spread.filter(s => s.k === k); return [k, { situations: r.length, baseMedian: q(r.map(s => s.base), 0.5), changeAt1e6Median: q(r.map(s => s.d6), 0.5), changeAt1e6Max: Math.max(...r.map(s => s.d6), 0), changeAt1e3Median: q(r.map(s => s.d3), 0.5), changeAt1e3Max: Math.max(...r.map(s => s.d3), 0) }]; }));
// sliding / contact transitions
const corr = (x, y) => { const n = x.length, mx = x.reduce((a, v) => a + v, 0) / n, my = y.reduce((a, v) => a + v, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxy / Math.sqrt(sxx * syy); };
const AB = base.filter(j => j.klass !== "C"); out.sliding = { corrSlide: corr(AB.map(j => Math.log10(j.slideMaxMm + 1e-6)), AB.map(j => Math.log10(j.posDiffMm + 1e-9))), corrTransitions: corr(AB.map(j => j.transA + j.transB), AB.map(j => Math.log10(j.posDiffMm + 1e-9))) };
const bins = [[0, 0.1], [0.1, 1], [1, 10], [10, 100], [100, 1e9]]; out.sliding.bySlide = bins.map(([lo, hi]) => { const r = AB.filter(j => j.slideMaxMm >= lo && j.slideMaxMm < hi); return { slideMm: `${lo}–${hi === 1e9 ? "∞" : hi}`, ...dist(r.map(j => j.posDiffMm)) }; });
// attribution
if (A) { const ja = A.jobs.filter(j => !j.error), grp = {}; for (const j of ja) { const k = String(j.id).split(":")[0]; (grp[k] = grp[k] || {})[j.order] = j; }
  const rows = Object.values(grp).filter(g => g.none && g.all); out.attribution = { n: rows.length, ratio: {} };
  for (const o of ["bodies", "joints", "all"]) { const r = rows.filter(g => g[o]).map(g => ({ k: key(g.none), none: g.none.posDiffMm, v: g[o].posDiffMm })); out.attribution.ratio[o] = Object.fromEntries(["A", "B", "C-non-sliding", "C-sliding"].map(k => { const s = r.filter(x => x.k === k); return [k, { n: s.length, noneMedian: q(s.map(x => x.none), 0.5), swappedMedian: q(s.map(x => x.v), 0.5), ratioMedian: q(s.map(x => x.v / Math.max(x.none, 1e-12)), 0.5), swappedMax: s.length ? Math.max(...s.map(x => x.v)) : null }]; })); } }
if (process.argv.includes("--md")) {
  L.push(`Jobs: ${ok.length} (${F.jobs.length - ok.length} errors); base runs ${base.length}; repeats identical ${out.determinism.identical}/${out.determinism.repeats}.`, "");
  L.push("| class | n | median | p90 | p99 | max (mm) | recommended (≥ 2 × max, 1–2–5) | max driven by |", "|---|---|---|---|---|---|---|---|");
  for (const [k, c] of Object.entries(out.classes)) L.push(`| ${k} | ${c.n} | ${f(c.median, 4)} | ${f(c.p90, 4)} | ${f(c.p99, 4)} | ${f(c.max, 4)} | **${c.recommendedMm ?? "—"}** | ${c.driver ? `${c.driver.human} ${c.driver.fam} ${c.driver.a} δ=${c.driver.pert}` : "—"} |`);
  L.push("", `Timing (C): abort Δ ≤ ${out.timing.abortTicksMax} ticks, fall Δ ≤ ${out.timing.fallTicksMax} ticks (${JSON.stringify(out.timing.fallTicksDist)}); one-sided falls ${out.timing.oneSidedFalls.length}; class mismatches ${out.timing.classMismatch.length}${out.timing.classMismatch.length ? ": " + out.timing.classMismatch.slice(0, 6).join("; ") : ""}. Recommended timing compatibility: ≤ ${out.timing.recommendedTicks} ticks.`);
  L.push("", "Outliers (> 3 × class p99): " + (Object.entries(out.classes).map(([k, c]) => c.outliers.length ? `${k}: ${c.outliers.join("; ")}` : null).filter(Boolean).join(" · ") || "none"), "");
  L.push("| family | n | classes | median | p90 | p99 | max (mm) |", "|---|---|---|---|---|---|---|"); for (const [k, c] of Object.entries(out.families)) L.push(`| ${k} | ${c.n} | ${c.classes} | ${f(c.median, 4)} | ${f(c.p90, 4)} | ${f(c.p99, 4)} | ${f(c.max, 4)} |`);
  L.push("", "| body | A max | B max | C non-sliding max | C sliding max (mm) |", "|---|---|---|---|---|"); for (const [h, c] of Object.entries(out.bodies)) L.push(`| ${h} | ${f(c.A.max, 4)} | ${f(c.B.max, 4)} | ${f(c["C-non-sliding"].max, 4)} | ${f(c["C-sliding"].max, 4)} |`);
  L.push("", "| class | situations | base median | change at δ = 1e-6 m/s (median / max) | change at δ = 1e-3 m/s (median / max) |", "|---|---|---|---|---|"); for (const [k, c] of Object.entries(out.perturbation)) L.push(`| ${k} | ${c.situations} | ${f(c.baseMedian, 4)} | ${f(c.changeAt1e6Median, 4)} / ${f(c.changeAt1e6Max, 4)} | ${f(c.changeAt1e3Median, 4)} / ${f(c.changeAt1e3Max, 4)} |`);
  L.push("", `Sliding: correlation log(posDiff) ~ log(slide) ${f(out.sliding.corrSlide, 2)}; ~ contact transitions ${f(out.sliding.corrTransitions, 2)}.`, "", "| slide (mm) | n | median | p99 | max (mm) |", "|---|---|---|---|---|"); for (const b of out.sliding.bySlide) L.push(`| ${b.slideMm} | ${b.n} | ${f(b.median, 4)} | ${f(b.p99, 4)} | ${f(b.max, 4)} |`);
  if (out.attribution) { L.push("", `Attribution (${out.attribution.n} base pairs; mirror trial re-run in a world with swapped L/R creation order):`, "", "| swapped | class | n | median, normal order | median, swapped | median ratio | max, swapped (mm) |", "|---|---|---|---|---|---|---|");
    for (const [o, r] of Object.entries(out.attribution.ratio)) for (const [k, c] of Object.entries(r)) if (c.n) L.push(`| ${o} | ${k} | ${c.n} | ${f(c.noneMedian, 4)} | ${f(c.swappedMedian, 6)} | ${f(c.ratioMedian, 4)} | ${f(c.swappedMax, 6)} |`); }
  console.log(L.join("\n")); }
else console.log(JSON.stringify(out, null, 1));

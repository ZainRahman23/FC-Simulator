// ═══ physchar2/tools/g3_mirror.mjs — G3 resolution D4: the plant's deterministic mirror-symmetry floor (DIAGNOSTIC ONLY) ═══════════════════
// Repeated runs are bit-identical (determinism ×3), so a mirror floor cannot come from repetition. It is measured three ways:
//   A. SELF-SYMMETRY: mirror-symmetric scenarios (quiet stance, sagittal pushes, the bilateral G3 baseline) — any L/R difference is the plant /
//      numerics floor (slip L vs R, COM lateral excursion, pelvis roll).
//   B. MIRRORED PAIRS: every mirrored G2 push pair of the post-D1 G2 final run (all bodies) and the G3 mirror pairs of the latest G3 run —
//      |Δ max slip| split into non-sliding (both feet ≤ 2 mm) and sliding events.
//   C. LAST-BIT SENSITIVITY ("repeats" with numerical-level differences): sliding scenarios re-run with initial COM-velocity perturbations of
//      ±1e-9…4e-9 m/s (far below any physical meaning) — the spread of the slip outcome is the floor any comparison of sliding runs must allow.
// usage: node tools/g3_mirror.mjs → review_artifacts/physical_character_v2/g3/json/g3_mirror.json
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { G2Sim, pushScenario } from "../gates/v2_g2.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), J3 = path.join(ROOT, "review_artifacts/physical_character_v2/g3/json"), OUT = path.join(J3, "g3_mirror.json");
const Jolt = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), specOf = (h) => generateSpec(VARIATION_SET.find(x => x.id === h)), f = (x, n = 4) => (x == null ? null : +(+x).toFixed(n));
const mx = (a) => Math.max(...a), pct = (a, p) => { const s = a.slice().sort((u, v) => u - v); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : null; };
const out = { generated: "tools/g3_mirror.mjs", date: new Date().toISOString().slice(0, 10), A: [], B: {}, C: [] };
// A — self-symmetry
function g2run(sc, h = "V2-REF") { const s = new G2Sim(Jolt, specOf(h), sc, {}); let comX = 0, roll = 0; const pel = s.spec.bodies.findIndex(b => b.name === "pelvis"); let x0 = null;
  while (s.tick()) { const I = s.ctrl.info; if (!I) continue; if (x0 == null) x0 = I.c[0]; comX = Math.max(comX, Math.abs(I.c[0] - x0)); const u = [0, 1, 0], q = s.st[pel].rot, ru = [2 * (q[0] * q[1] - q[3] * q[2]), 1 - 2 * (q[0] * q[0] + q[2] * q[2]), 2 * (q[1] * q[2] + q[3] * q[0])]; roll = Math.max(roll, Math.abs(Math.asin(Math.max(-1, Math.min(1, ru[0]))) * 180 / Math.PI)); }
  const g = s.g2summary(); s.destroy(); return { outcome: g.outcome, slipMm: g.feet.slipMaxMm.map(x => f(x, 4)), dSlipMm: f(Math.abs(g.feet.slipMaxMm[0] - g.feet.slipMaxMm[1]), 6), comLateralMaxMm: f(comX * 1000, 6), pelvisRollMaxDeg: f(roll, 6) }; }
for (const [name, sc] of [["G2 quiet 20 s", { title: "q", seconds: 20 }], ["G2 push F 10", pushScenario("F", 10)], ["G2 push F 15", pushScenario("F", 15)], ["G2 push B 10", pushScenario("B", 10)], ["G2 push B 15", pushScenario("B", 15)], ["G2 push F 20 (falls)", pushScenario("F", 20)]]) out.A.push({ name, ...g2run(sc) });
for (const k of ["T0"]) { const s = new G3Sim(Jolt, specOf("V2-REF"), g3Def(k), {}); while (s.tick()) {} const g = s.g3summary(); s.destroy(); out.A.push({ name: "G3 " + k, outcome: g.outcome, slipMm: g.g3.feet.map(x => f(x.slipMm, 4)), dSlipMm: f(Math.abs(g.g3.feet[0].slipMm - g.g3.feet[1].slipMm), 6), pelvisRollMaxDeg: f(g.g3.pelvisRollMaxDeg, 6) }); }
// B — mirrored pairs (post-D1 G2 final run; latest G3 run)
{ const R2 = JSON.parse(fs.readFileSync(path.join(ROOT, "review_artifacts/physical_character_v2/g2/json/g2_results.json"))), idx = new Map(); for (const j of R2.jobs) if (j.group === "push" && j.res) idx.set(`${j.human}|${j.sc.dir}|${j.sc.J}`, j.res);
  const rows = []; for (const [k, r] of idx) { const [h, d, Jm] = k.split("|"), m = { L: "R", FL: "FR", BL: "BR" }[d]; if (!m) continue; const o = idx.get(`${h}|${m}|${Jm}`); if (!o) continue; const ok = (x) => ["recovered", "stood"].includes(x.outcome);
    const sa = mx(r.feet.slipMaxMm), sb = mx(o.feet.slipMaxMm); rows.push({ h, pair: `${d}/${m}`, J: +Jm, both: ok(r) && ok(o), sameOutcome: r.outcome === o.outcome, slip: [f(sa, 3), f(sb, 3)], d: Math.abs(sa - sb), sliding: Math.max(sa, sb) > 2 }); }
  const sum = (sel) => { const v = rows.filter(sel).map(x => x.d); return { n: v.length, max: f(v.length ? mx(v) : null, 4), p95: f(pct(v, 0.95), 4), median: f(pct(v, 0.5), 4) }; };
  out.B.g2 = { pairs: rows.length, sameOutcome: rows.filter(x => x.sameOutcome).length, nonSlidingRecovered: sum(x => x.both && !x.sliding), slidingRecovered: sum(x => x.both && x.sliding), worst: rows.filter(x => x.both).sort((a, b) => b.d - a.d).slice(0, 6).map(x => ({ ...x, d: f(x.d, 4) })) };
  try { const R3 = JSON.parse(fs.readFileSync(path.join(J3, "g3_results.json"))), base = (k) => R3.jobs.find(j => j.key === k && !j.stand && !j.stance && !j.sup && !["determinism", "snapshot", "T9U"].includes(j.group) && (j.group === "T9" || j.human === "V2-REF")), sl = (r) => mx(r.g3.feet.map(x => x.slipMm)), rows3 = [];
    for (const j of R3.jobs.filter(x => x.mirrorOf)) { const a = base(j.mirrorOf); if (a && j.res) rows3.push({ k: j.mirrorOf, d: Math.abs(sl(a.res) - sl(j.res)), sliding: Math.max(sl(a.res), sl(j.res)) > 2, same: a.res.outcome === j.res.outcome }); }
    for (const T of [4, 2, 1, 0.75, 0.5, 0.25]) { const a = base(`T7:R:${T}`), b = base(`T7:L:${T}`); if (a && b) rows3.push({ k: `T7 ${T}`, d: Math.abs(sl(a.res) - sl(b.res)), sliding: Math.max(sl(a.res), sl(b.res)) > 2, same: a.res.outcome === b.res.outcome }); }
    const s3 = (sel) => { const v = rows3.filter(sel).map(x => x.d); return { n: v.length, max: f(v.length ? mx(v) : null, 4), p95: f(pct(v, 0.95), 4) }; };
    out.B.g3 = { results: R3.criteria + " " + (R3.date || ""), pairs: rows3.length, sameOutcome: rows3.filter(x => x.same).length, nonSliding: s3(x => !x.sliding), sliding: s3(x => x.sliding), worst: rows3.sort((a, b) => b.d - a.d).slice(0, 6).map(x => ({ ...x, d: f(x.d, 4) })) }; } catch (e) { out.B.g3 = { error: String(e) }; }
}
// C — last-bit sensitivity of sliding outcomes
const EPS = [-4e-9, -3e-9, -2e-9, -1e-9, 0, 1e-9, 2e-9, 3e-9, 4e-9];
const CASES = [["G3 T7:R:0.5", (e) => new G3Sim(Jolt, specOf("V2-REF"), { ...g3Def("T7:R:0.5"), v: [e, 0, 0] }, {})], ["G3 T7:R:0.25", (e) => new G3Sim(Jolt, specOf("V2-REF"), { ...g3Def("T7:R:0.25"), v: [e, 0, 0] }, {})],
  ["G3 T8:hold:R:R:10", (e) => new G3Sim(Jolt, specOf("V2-REF"), { ...g3Def("T8:hold:R:R:10"), v: [e, 0, 0] }, {})], ["G2 push FL 20 (V2-REF)", (e) => new G2Sim(Jolt, specOf("V2-REF"), { ...pushScenario("FL", 20), v: [e, 0, 0] }, {})],
  ["G2 push L 20 (V2-REF)", (e) => new G2Sim(Jolt, specOf("V2-REF"), { ...pushScenario("L", 20), v: [e, 0, 0] }, {})], ["G3 T5 (non-sliding control)", (e) => new G3Sim(Jolt, specOf("V2-REF"), { ...g3Def("T5"), v: [e, 0, 0] }, {})]];
for (const [name, mk] of CASES) { const slips = [], outs = []; for (const e of EPS) { const s = mk(e); while (s.tick()) { if (s.g2acc.fallT != null && s.n * s.dt > s.g2acc.fallT + 0.5) break; } const g = s.g3summary ? s.g3summary() : s.g2summary(), sl = g.g3 ? mx(g.g3.feet.map(x => x.slipMm)) : mx(g.feet.slipMaxMm); slips.push(sl); outs.push(g.outcome); s.destroy(); }
  out.C.push({ name, eps: EPS, slipMm: slips.map(x => f(x, 4)), outcomes: [...new Set(outs)], spreadMm: f(mx(slips) - Math.min(...slips), 4), sdMm: f(Math.sqrt(slips.reduce((a, x) => a + (x - slips.reduce((u, v) => u + v, 0) / slips.length) ** 2, 0) / slips.length), 4) }); console.log(name, "spread", (mx(slips) - Math.min(...slips)).toFixed(4), "mm"); }
fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log("→ " + path.relative(ROOT, OUT));

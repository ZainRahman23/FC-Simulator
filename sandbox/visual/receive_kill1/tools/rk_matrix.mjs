// receive_kill1/tools/rk_matrix.mjs — the calibration matrices in Node (the evidence of record): per row the plan, the matched TYPICAL grid and the
// multi-seed distribution at every Ball Control step (the SAME keyed draws for all ratings of a seed).
//   node rk_matrix.mjs <matrixIds comma | ALL> <nSeeds> <out.json>
import fs from "fs";
import { RK, BC_STEPS } from "../rk_model.js";
import { prepare, runBC, drawsFor, DT, now } from "../rk_sim.js";
import { MATRICES, BENCHMARKS, condOf, condLabel } from "../rk_conditions.js";
const SETS = MATRICES.concat([{ id: "BENCH", title: "Benchmarks", surface: "AUTO", rows: BENCHMARKS.map((b) => Object.assign({ _title: b.id }, b.cond)) }]);
const [idsArg = "ALL", nArg = "200", out = "rk_matrix.json"] = process.argv.slice(2), nS = +nArg, ids = idsArg === "ALL" ? SETS.map((m) => m.id) : idsArg.split(",");
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }, mean = (a) => a.reduce((s, x) => s + x, 0) / a.length, r4 = (x) => Math.round(x * 1e4) / 1e4;
const res = { RK, nSeeds: nS, bc: BC_STEPS, matrices: {} }, t0 = now();
for (const id of ids) {
  const M = SETS.find((m) => m.id === id), rows = []; res.matrices[id] = rows;
  for (const r of M.rows) {
    const cond = condOf(M, r), tp = now(), P = prepare(cond), prepMs = now() - tp;
    if (P.plan.none) { rows.push({ cond, label: r._title || condLabel(cond), none: true, rej: P.plan.rej }); continue; }
    const pl = P.plan, NT = drawsFor({ example: "TYPICAL" }), typ = BC_STEPS.map((bc) => runBC(P, bc, NT, { post: 2.2 }));
    const row = { cond, label: r._title || condLabel(cond), surface: pl.sf.key, group: pl.sf.S.group, D: r4(pl.dif.D), vEff: r4(pl.dif.vEff), parts: Object.fromEntries(Object.entries(pl.dif.parts).map(([k, v]) => [k, r4(v)])), contact: P.contact.map(r4), kc: P.kc,
      arrival: { speed: r4(Math.hypot(...P.sol.arrival.v)), h: r4(P.sol.arrival.p[2]), residualP: P.sol.residual.p, residualV: P.sol.residual.v, kind: P.sol.kind }, ideal: { v: P.ideal.v.map(r4), kind: P.ideal.kind, target: P.ideal.target.map(r4), capExtra: r4(P.ideal.capExtra), exitIt: P.ideal.base.it, exitErr: P.ideal.base.err },
      alts: pl.alts.slice(0, 6), cpu: { prepareMs: prepMs, solveMs: P.cpu.solve, predictMs: P.cpu.predict, planMs: P.cpu.plan, idealMs: P.cpu.ideal, nEval: pl.nEval },
      typical: typ.map((x) => ({ bc: x.bc, E: r4(x.ex.sig.E), d2: r4(x.m.dStar), d025: r4(x.m["d0.25"]), d05: r4(x.m["d0.5"]), d1: r4(x.m["d1"]), resid: r4(x.m.resid), lat1: r4(x.m["lat1"]), vert: r4(x.m.vertErr), state: x.m.state, capped: x.ex.capped })) };
    if (nS > 0) {
      const acc = BC_STEPS.map(() => ({ d: [], r: [], st: {} })); let execMs = 0, postMs = 0, n = 0;
      for (let s = 1; s <= nS; s++) { const N = drawsFor({ seed: s }); BC_STEPS.forEach((bc, j) => { const x = runBC(P, bc, N, { post: 2.2, every: 24 }); acc[j].d.push(x.m.dStar); acc[j].r.push(x.m.resid); acc[j].st[x.m.state] = (acc[j].st[x.m.state] || 0) + 1; execMs += x.cpu.exec; postMs += x.cpu.post; n++; }); }
      row.dist = acc.map((a, j) => ({ bc: BC_STEPS[j], med: r4(q(a.d, 0.5)), mean: r4(mean(a.d)), p90: r4(q(a.d, 0.9)), residMean: r4(mean(a.r)), residMed: r4(q(a.r, 0.5)), heavy: r4(a.d.filter((d) => d > 1.2).length / a.d.length), lost: r4(a.d.filter((d) => d > 4.5).length / a.d.length), states: a.st }));
      row.cpu.execMsPerRun = execMs / n; row.cpu.postMsPerRun = postMs / n;
    }
    rows.push(row); process.stderr.write(`${id} ${row.label} ${row.surface} D ${row.D}\n`);
  }
}
res.ms = now() - t0; fs.writeFileSync(out, JSON.stringify(res)); console.log("wrote", out, (res.ms / 1000).toFixed(1), "s");

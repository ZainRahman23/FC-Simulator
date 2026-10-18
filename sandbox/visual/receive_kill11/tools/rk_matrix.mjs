// receive_kill11/tools/rk_matrix.mjs — the RECEIVE-KILL-1.1 matrices in Node (the evidence of record): per row the plan, the TYPICAL grid and the
// multi-seed distribution at every Ball Control step (the SAME keyed draws for all ratings of a seed — and the same draws as RECEIVE-KILL-1):
//   FIRST CONTACT  its exit velocity and error, the position error against the ideal free path at 0.10 / 0.25 / 0.50 / 1.00 / 2.00 s, the drop point
//                  error (aerial), the distance from the intended point at 2.0 s (RECEIVE-KILL-1's headline, kept for old vs new)
//   EPISODE        contacts, the follow-up's time and surface, the adjustment and the EXTRA adjustment / time against the ideal episode, time to
//                  stable control, the ball's distance from the player at stable control, the continuation class
//   node rk_matrix.mjs <matrixIds comma | ALL> <nSeeds> <out.json>
import fs from "fs";
import { RK, BC_STEPS } from "../rk_model.js";
import { prepare, runBC, runEpisode, firstContact, drawsFor, DT, now } from "../rk_sim.js";
import { MATRICES, BENCHMARKS, condOf, condLabel } from "../rk_conditions.js";
const SETS = MATRICES.concat([{ id: "BENCH", title: "Benchmarks", surface: "AUTO", rows: BENCHMARKS.map((b) => Object.assign({ _title: b.id }, b.cond)) }]);
const [idsArg = "ALL", nArg = "200", out = "rk_matrix.json"] = process.argv.slice(2), nS = +nArg, ids = idsArg === "ALL" ? SETS.map((m) => m.id) : idsArg.split(",");
const q = (a, p) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; }, mean = (a) => { const s = a.filter((x) => x != null); return s.length ? s.reduce((t, x) => t + x, 0) / s.length : null; }, r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
const CLS = ["IMMEDIATE", "ADJUSTED", "RECOVERY", "UNSTABLE"];
function one(P, bc, spec) {
  const r1 = runBC(P, bc, drawsFor(Object.assign({ event: "kill1" }, spec)), { post: 2.2, every: 4 }), fc = firstContact(P, r1.ex, r1.run), ep = runEpisode(P, bc, spec, { every: 2 }), m = ep.m;
  return { fc: { speed: fc.speed, velErr: fc.velErr, e01: fc["e0.1"], e025: fc["e0.25"], e05: fc["e0.5"], e1: fc["e1"], e2: fc["e2"], dropErr: fc.dropErr, d2: r1.m.dStar, resid: r1.m.resid, capped: !!r1.ex.capped },
    ep: { contacts: m.contacts, adjust: m.adjust, extraAdj: m.extraAdj, extraT: m.extraT, tFollow: m.tFollow, tNext: m.tNextFeasible, tStable: m.tStable, dStable: m.dStable, cls: m.continuation, follow: m.followSurfaces.join("+") }, cpu: ep.cpu };
}
const res = { RK, nSeeds: nS, bc: BC_STEPS, matrices: {} }, t0 = now();
for (const id of ids) {
  const M = SETS.find((m) => m.id === id), rows = []; res.matrices[id] = rows;
  for (const r of M.rows) {
    const cond = condOf(M, r), P = prepare(cond);
    if (P.plan.none) { rows.push({ cond, label: r._title || condLabel(cond), none: true, rej: P.plan.rej }); continue; }
    const pl = P.plan, typ = BC_STEPS.map((bc) => one(P, bc, { example: "TYPICAL" })), ideal = runEpisode(P, 99, { example: "PERFECT" });
    const row = { cond, label: r._title || condLabel(cond), surface: pl.sf.key, group: pl.sf.S.group, D: r4(pl.dif.D), contact: P.contact.map(r4), kc: P.kc, ideal: { v: P.ideal.v.map(r4), capExtra: r4(P.ideal.capExtra), episode: { contacts: ideal.m.contacts, follow: ideal.m.followSurfaces, tStable: r4(ideal.m.tStable), adjust: r4(ideal.m.adjust), cls: ideal.m.continuation } },
      typical: typ.map((x, j) => ({ bc: BC_STEPS[j], fc: Object.fromEntries(Object.entries(x.fc).map(([k, v]) => [k, typeof v === "number" ? r4(v) : v])), ep: Object.fromEntries(Object.entries(x.ep).map(([k, v]) => [k, typeof v === "number" ? r4(v) : v])) })) };
    if (nS > 0) {
      const acc = BC_STEPS.map(() => ({ fc: {}, ep: {}, cls: {}, nC: {}, cpu: [] })), push = (o, k, v) => (o[k] = o[k] || []).push(v);
      for (let s = 1; s <= nS; s++) for (const [j, bc] of BC_STEPS.entries()) { const x = one(P, bc, { seed: s }), A = acc[j]; for (const [k, v] of Object.entries(x.fc)) if (typeof v === "number" || v == null) push(A.fc, k, v); for (const [k, v] of Object.entries(x.ep)) if (typeof v === "number" || v == null) push(A.ep, k, v); A.cls[x.ep.cls] = (A.cls[x.ep.cls] || 0) + 1; A.nC[x.ep.contacts] = (A.nC[x.ep.contacts] || 0) + 1; A.cpu.push(x.cpu); }
      row.dist = acc.map((A, j) => { const st = (k, o) => ({ med: r4(q(o[k], 0.5)), mean: r4(mean(o[k])), p90: r4(q(o[k], 0.9)) }), cpuM = (k) => r4(mean(A.cpu.map((c) => c[k])));
        return { bc: BC_STEPS[j], fc: Object.fromEntries(["speed", "velErr", "e01", "e025", "e05", "e1", "e2", "dropErr", "d2", "resid"].map((k) => [k, st(k, A.fc)])), ep: Object.fromEntries(["contacts", "adjust", "extraAdj", "extraT", "tFollow", "tStable", "dStable"].map((k) => [k, st(k, A.ep)])),
          heavy: r4(A.fc.d2.filter((d) => d > 1.2).length / nS), cls: Object.fromEntries(CLS.map((c) => [c, r4((A.cls[c] || 0) / nS)])), contacts: A.nC, stable: r4(1 - (A.cls.UNSTABLE || 0) / nS),
          cpu: { first: cpuM("first"), predict: cpuM("predict"), plan: cpuM("plan"), follow: cpuM("follow"), sim: cpuM("sim"), total: cpuM("total") } }; });
    }
    rows.push(row); process.stderr.write(`${id} ${row.label} ${row.surface} D ${row.D}\n`);
  }
}
res.ms = now() - t0; fs.writeFileSync(out, JSON.stringify(res)); console.log("wrote", out, (res.ms / 1000).toFixed(1), "s");

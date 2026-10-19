// receive_kill12/tools/rk_scaling.mjs — the model's own curves for the report: q(BC), c(D), E(BC, D), the difficulty of horizontal vs vertical speed
// per surface, and AUTO's surface map over arrival height × descent angle (at 5, 10 and 16 m/s).   node rk_scaling.mjs <out.json>
import fs from "fs";
import { RK, qBC, cD, relErr, difficulty, surf, SURFACES, BC_STEPS, incoming } from "../rk_model.js";
import { prepare } from "../rk_sim.js";
const out = process.argv[2] || "rk_scaling.json", r4 = (x) => Math.round(x * 1e4) / 1e4, R = {};
R.q = BC_STEPS.map((bc) => ({ bc, q: r4(qBC(bc)) }));
R.c = [0.1, 0.2, 0.3, 0.5, 0.8, 1, 1.5, 2, 2.5, 3, 4].map((D) => ({ D, c: r4(cD(D)) }));
R.E = [0.2, 0.5, 1, 1.5, 2, 2.5, 3].map((D) => ({ D, E: BC_STEPS.map((bc) => r4(relErr(bc, D))), sigmaRebFootPerD: BC_STEPS.map((bc) => r4(RK.diff.vRef * D * relErr(bc, D))) }));
// the compression: the spread between BC 10 and BC 99 (σ, m/s) and their ratio, per D
R.compression = R.E.map((e) => ({ D: e.D, spread: r4(e.sigmaRebFootPerD[0] - e.sigmaRebFootPerD[9]), ratio: r4(e.sigmaRebFootPerD[0] / e.sigmaRebFootPerD[9]) }));
// horizontal vs vertical speed: D of a ball at each surface's natural height, 10 m/s total, by descent angle (the vertical share)
R.vertical = {}; for (const id of Object.keys(SURFACES)) { const S = SURFACES[id], sf = surf(id, "R"); R.vertical[id] = [0, 15, 30, 45, 60].map((a) => { const vh = 10 * Math.cos(a * Math.PI / 180), vz = -10 * Math.sin(a * Math.PI / 180), st = { p: [0.4, 0, S.zNom], v: [-vh, 0, vz] }; return { descent: a, D: r4(difficulty(sf, st, incoming(st), 0).D) }; }); }
R.weights = Object.fromEntries(Object.entries(SURFACES).map(([k, S]) => [k, { wH: S.w[0], wZ: S.w[1], m: S.m, zNom: S.zNom, zHalf: S.zHalf, band: S.env.z, vMax: S.env.vMax, slope: S.env.slope, k: S.k, run: S.run, cap: S.cap, ideal: S.ideal, prep: S.prep }]));
// AUTO's surface map: arrival height × descent (the condition's arrival state at the reach plane), at three speeds
R.map = {}; for (const v of [5, 10, 16]) { R.map[v] = []; for (let h = 0.11; h <= 2.31; h += 0.1) { const row = { h: r4(h), cells: [] }; for (const d of [0, 10, 20, 30, 45, 60]) { const P = prepare({ v, h: h <= 0.111 ? 0.11 : h, drop: h <= 0.111 ? 0 : d }); row.cells.push({ d, s: P.plan.none ? "none" : P.plan.sf.key, D: P.plan.none ? null : r4(P.plan.dif.D), z: P.plan.none ? null : r4(P.contact[2]) }); } R.map[v].push(row); } }
fs.writeFileSync(out, JSON.stringify(R, null, 1));
console.log("q", R.q.map((x) => x.bc + ":" + x.q).join(" ")); console.log("c", R.c.map((x) => x.D + ":" + x.c).join(" ")); console.log("compression", JSON.stringify(R.compression));
for (const [id, a] of Object.entries(R.vertical)) console.log(id.padEnd(13), a.map((x) => `${x.descent}°:${x.D}`).join(" "));
for (const v of [10]) for (const r of R.map[v]) console.log(v, String(r.h).padEnd(5), r.cells.map((c) => (c.s + "").padEnd(14)).join(""));

// occupy1/tools/o_deep.mjs — the ticks of one review case deeper than 4.5 cm (OCC): the pair, both players' planted feet, actions, commitment, the split, the correction   node o_deep.mjs <case id>
import { ENV } from "./o_env.mjs";
import { DT } from "../../vocab2/c_sim.js";
import { OCASES } from "../o_cases.js";
import { runO } from "../o_run.js";
import { measureRun } from "./o_measure.mjs";
const id = process.argv[2], r = runO(ENV, OCASES.find((x) => x.id === id), "OCC"), rec = measureRun(ENV, r.W, r.clip), L = new Map(r.W.occ.log.map((x) => [x.k, x]));
const sup = (p, k) => { const P = p.planAt(k * DT); return ["R", "L"].map((X) => (P.stances[X].some((s) => s.t0 <= k * DT + 1e-9 && s.t1 > k * DT + 1e-9) ? X : "-")).join(""); };
for (const x of rec.ticks) { if (!x.g) continue; const m = Math.max(x.g.LEGS ? x.g.LEGS.pen : -1, x.g.TRUNK ? x.g.TRUNK.pen : -1); if (m < 0.045) continue; const l = L.get(x.k), G = x.g.LEGS && (!x.g.TRUNK || x.g.LEGS.pen >= x.g.TRUNK.pen) ? x.g.LEGS : x.g.TRUNK;
  console.log(((x.k * DT - r.t0).toFixed(3)).padStart(6), "pen", (m * 100).toFixed(1).padStart(5), (G.A + "↔" + G.B).padEnd(16), "pl A", sup(r.W.att, x.k), "D", sup(r.W.def, x.k), "| act", l ? l.act.join(" | ") : "", "| commit", l ? JSON.stringify(l.committed) : "", "share", l ? JSON.stringify(l.share) : "", "r", l ? l.r.map((v) => (v * 100).toFixed(1)).join(",") : "", l && l.legConflict ? "LEGC " + l.legConflict.map((c) => c.A + "-" + c.B + " e" + c.e).join(",") : "", l && l.conflict ? "CONFLICT" : ""); }

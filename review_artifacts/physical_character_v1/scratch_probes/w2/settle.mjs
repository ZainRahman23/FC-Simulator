import { walk, f3, W } from "./lib.mjs";
const COND = { df: 0.237, dl: 0.368, T: 0.45 };
const r = walk({ n: 4, seconds: 3.0, keep: true, walk: { settleSole: true, char: { 0: COND, 1: { df: 0.34, dl: 0.26, T: 0.37 } } } });
const P = r.LOCO.planner; console.log("walk.settleSole", P.rhythm.walk.settleSole, "human", P.rhythm.human);
const d = P.exec.done.filter(x => x.kind === "rhythmic"); for (const x of d) console.log("step", x.stepIndex, x.sw, "td", x.td && f3(x.td.t), "heelStrike", x.heelStrike, "human", x.human);
const td = d[1].td.t; for (const q of r.recs.filter(q => q.t >= td - 0.01 && q.t < td + 0.2 && Math.round(q.t * 240) % 4 === 0)) { const F = q.feet[d[1].sw];
  console.log(`t+${f3(q.t - td)} ${q.rhythm.stage} landed heel ${F.heel} toe ${F.toe} load ${f3(F.load / W, 2)} pts ${F.points ? F.points.length : "-"} sole ${F.sole ? F.sole.length : "-"}`); }

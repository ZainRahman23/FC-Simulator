// occupy1/tools/o_snap.mjs — where OCC's root snaps come from: per case, frames (1/60 s) whose root 2nd difference > 1 cm, OLD vs OCC, and per
// snap the occupancy's own position corrections in the 8 ticks around it (sum |d|) and the wall's
import { ENV } from "./o_env.mjs";
import { OCASES } from "../o_cases.js";
import { runO } from "../o_run.js";
const DT = 1 / 240, ids = (process.env.IDS || "static-walk,static-jog,headon-walk,headon-jog,face,side,cross,race,carry-jog-l,in-bf,bf-fake,croq-close,croq-early,in-croq").split(",");
const sn = (W, p, clip) => { const out = []; const P = []; const k0 = Math.round(clip[0] / DT); for (let k = k0; k <= Math.round(clip[1] / DT); k += 4) P.push([k, p.stateAt(k * DT).P]); for (let i = 1; i < P.length - 1; i++) { const a = Math.hypot(P[i + 1][1][0] - 2 * P[i][1][0] + P[i - 1][1][0], P[i + 1][1][1] - 2 * P[i][1][1] + P[i - 1][1][1]); if (a > 0.01) out.push([P[i][0], a]); } return out; };
let tot = { OLD: 0, OCC: 0, pos: 0, wall: 0, none: 0 };
for (const id of ids) { const tc = OCASES.find((x) => x.id === id), R = {}; for (const m of ["OLD", "OCC"]) R[m] = runO(ENV, tc, m);
  const L = new Map(R.OCC.W.occ.log.map((x) => [x.k, x])); let line = [], c = { OLD: 0, OCC: 0, pos: 0, wall: 0, none: 0 };
  for (const m of ["OLD", "OCC"]) for (const [p, key, wk] of [[R[m].W.att, "dA", "wA"], [R[m].W.def, "dD", "wD"]]) for (const [k, a] of sn(R[m].W, p, R[m].clip)) { c[m]++; if (m !== "OCC") continue; let pos = 0, wall = 0; for (let j = k - 4; j <= k + 4; j++) { const x = L.get(j); if (!x) continue; pos += Math.hypot(...x[key]); wall += x[wk] || 0; }
      const why = pos > 0.005 ? "pos" : wall > 0.005 ? "wall" : "none"; c[why]++; if (line.length < 4) line.push(`${(k * DT - R.OCC.t0).toFixed(2)} ${p.pid} ${(a * 1000).toFixed(0)}mm pos ${(pos * 100).toFixed(1)}cm wall ${(wall * 100).toFixed(1)}`); }
  for (const k of Object.keys(tot)) tot[k] += c[k]; console.log(`${id.padEnd(14)} OLD ${String(c.OLD).padStart(3)} OCC ${String(c.OCC).padStart(3)} (pos ${c.pos} wall ${c.wall} none ${c.none}) | ${line.join(" | ")}`); }
console.log("TOTAL", JSON.stringify(tot));

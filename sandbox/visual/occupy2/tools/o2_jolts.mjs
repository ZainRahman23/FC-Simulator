// occupy2/tools/o2_jolts.mjs — WHERE THE ROOT JOLTS COME FROM (Stage 2): every frame (60 Hz) whose root 2nd difference exceeds 1 cm, the
// occupancy push in the ticks around it and what asked for it — the deepest violated constraint's region class and tier, the soft wall, or
// nothing occupancy did (canonical)   node o2_jolts.mjs [ids] [--res json]
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { O2CASES } from "../o2_cases.js";
import { runO2 } from "../o2_run.js";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, res = arg("res") ? JSON.parse(arg("res")) : undefined, DT = 1 / 240, hyp = Math.hypot;
const ids = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2].split(",") : O2CASES.map((x) => x.id), T = {};
for (const id of ids) { const tc = O2CASES.find((x) => x.id === id), r = runO2(ENV, tc, "S2", { res, record: false }), W = r.W, L = new Map(W.occ.log.map((x) => [x.k, x]));
  for (const [p, dk, wk] of [[W.att, "dA", "wA"], [W.def, "dD", "wD"]]) { const P = []; for (let k = Math.round(r.clip[0] / DT); k <= Math.round(r.clip[1] / DT); k += 4) P.push([k, p.stateAt(k * DT).P]);
    for (let i = 1; i < P.length - 1; i++) { const a = hyp(P[i + 1][1][0] - 2 * P[i][1][0] + P[i - 1][1][0], P[i + 1][1][1] - 2 * P[i][1][1] + P[i - 1][1][1]); if (a <= 0.01) continue; let push = 0, wall = 0, why = "canonical (no occupancy push)";
      for (let j = P[i][0] - 4; j <= P[i][0] + 4; j++) { const x = L.get(j); if (!x) continue; const m = hyp(...x[dk]); push += m; wall += x[wk] || 0; if (m > 1e-4 && (!x.pairs || !x.pairs.length)) why = "push (no pair)"; if (m > 1e-4 && x.pairs && x.pairs.length) { const top = x.pairs.reduce((a, y) => (y.pen > a.pen ? y : a), x.pairs[0]); why = `push · ${top.cls} · ${top.tier}`; } }
      if (push <= 0.005 && wall > 0.005) why = "soft wall"; T[why] = (T[why] || 0) + 1; } } }
console.log("STAGE 2 root jolts (frames > 1 cm per frame²) by cause:"); for (const [k, v] of Object.entries(T).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(4)}  ${k}`);

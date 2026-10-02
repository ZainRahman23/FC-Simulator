import { walk, spec, C, M, f3, bi } from "./lib.mjs";
const { Q } = M; const yawOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]); };
const r = walk({ n: 12, seconds: 3.6, keep: true }); const h0 = r.LOCO.planner.rhythm.wk.h0, ch = bi("chest");
let prev = null;
for (const q of r.recs.filter(q => q.t > 1.4 && Math.round(q.t * 240) % 6 === 0)) { const B = C.bodyState(spec, q.states, "R"), st = q.rhythm ? q.rhythm.stage : "-", ex = q.exec ? q.exec.sw : "";
  const py = (yawOf(q.states[0].rot) - h0) * 57.3, cy = (yawOf(q.states[ch].rot) - h0) * 57.3, s = B.seg;
  console.log(`t ${f3(q.t, 3)} ${st}${ex} pelvis ${f3(py, 1).padStart(6)} chest ${f3(cy, 1).padStart(6)} | Ly ${f3(B.L[1], 2).padStart(6)} legs(sw ${f3(s.swingLeg, 2)} st ${f3(s.stanceLeg, 2)}) pel ${f3(s.pelvis, 2)} trunk ${f3(s.trunk, 2)} arms ${f3(s.armL + s.armR, 2)} | loads L ${f3(q.feet.L.load, 0)} R ${f3(q.feet.R.load, 0)}`); }

// the stance-ankle term in action: per step, the demanded CoP shift d (mean / range over single support), how much of the CoP demand the sole
// clamp removed (pRaw − pStar, forward) and how well the measured CoP followed the clamped demand (pStar − CoP), forward
import fs from "fs"; import { J, body, G2 } from "../fg/lib.mjs";
const JD = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json", pre = process.argv[2] || "m_ank2_tau", k = +(process.argv[3] || 2);
const models = Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fs.readFileSync(`${JD}/${pre}${t}.json`, "utf8"))]));
const { spec, poses } = body("F0"), base = G2.TESTS_G2.G2W_A8.loco.rhythm.walk; const steps = Array.from({ length: 30 }, (_, i) => ({ sw: i % 2 === 0 ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
let LOCO = null; const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 15, rhythmOver: { steps, at: 0.6, walk: { ctrl: { ...base.ctrl, models, ankle2: { k, max: 0.06, min: -0.04 } }, char: { 0: { df: 0.224, dl: 0.343, T: 0.471 } } } }, onLoco: (l) => { LOCO = l; } });
const P = LOCO.planner, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], fw = (a, b) => (a[0] - b[0]) * hd[0] + (a[1] - b[1]) * hd[1];
for (const d of P.exec.done.filter(d => d.kind === "rhythmic" && d.liftoff && d.td)) { const W = r.recs.filter(q => q.t >= d.liftoff.t && q.t <= d.td.t && q.ctl && q.ctl.pRaw && q.copSmooth);
  const cl = W.map(q => fw(q.ctl.pRaw, q.ctl.pStar)), tr = W.map(q => fw(q.ctl.pStar, q.copSmooth)), a = d.ank2 || [];
  const m = (x) => x.length ? (x.reduce((s, v) => s + v, 0) / x.length * 100).toFixed(1) : "-";
  console.log(`k${d.stepIndex} ${d.sw} | shift d mean ${m(a)} [${a.length ? (Math.min(...a) * 100).toFixed(1) + ", " + (Math.max(...a) * 100).toFixed(1) : ""}] cm | clamp removed ${m(cl)} cm | CoP tracking err ${m(tr)} cm | uAt ${d.td.uAt.toFixed(2)}`); }

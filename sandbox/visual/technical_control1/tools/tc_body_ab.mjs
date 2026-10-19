// technical_control1/tools/tc_body_ab.mjs — the HUMAN-MOTION A/B of the receive chain: RECEIVE-ELITE-1's own body on its own simulation (the receive + its exit,
// until DRIBBLE-V1 takes the ball) vs TECHNICAL-CONTROL-1's body on its simulation, the same diagnostics as tc_neutral (posed skeleton, 240 Hz, the elite
// action phase): ankle acceleration during swings (p95, max), IK reach error (posed ankle vs target, p99, max), planted-foot slip, full-extension share.
//   node tc_body_ab.mjs <out.json> [ids]
import fs from "fs"; import { makeTech, makeElite } from "./tc_env.mjs"; import { TechBody } from "../tc_body.js"; import { EliteBody } from "../../receive_elite1/re1_body.js"; import { anyCase, RECEIVE_CHAIN } from "../tc_course.js";
const ids = process.argv[3] ? process.argv[3].split(",") : RECEIVE_CHAIN.concat(["L_60_RUN_NORMAL", "L_120_RUN_NORMAL", "L_90_SPRINT_NORMAL", "L_150_SPRINT_NORMAL", "ST_135_V12"]), rows = [];
const pct = (a, q) => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y); return b[Math.floor(q * (b.length - 1))]; };
for (const id of ids) for (const pipe of ["RE1", "NEW"]) { const cs = anyCase(id + "_B99_D99_A99", 1), S = pipe === "RE1" ? makeElite(cs, { seed: 1, anim: true, EliteBody }) : makeTech(cs, { seed: 1, anim: true, Body: TechBody }), n = Math.round(cs.scenario.dur * 240);
  const H = { R: [], L: [] }, ik = [], ref = { R: null, L: null }; let slip = 0, ext = 0, nP = 0;
  for (let i = 0; i < n && !S.fault; i++) { S.step(); const c2 = S.rc2, pz = c2 && c2.kind === "ELITE" && c2.phase === "action" ? c2.pose : null; if (!pz) { H.R.push(null); H.L.push(null); ref.R = ref.L = null; continue; } nP++;
    for (const X of ["R", "L"]) { const f = pz.feet[X], aj = pz.J["foot_" + X].j; H[X].push({ p: aj.slice(), sw: !f.planted }); if (f.ank) ik.push(Math.hypot(aj[0] - f.ank[0], aj[1] - f.ank[1], aj[2] - f.ank[2]));
      if (!f.planted) ref[X] = null; else { const pt = f.pivot ? pz.J["toe_" + X].j : aj, key = f.pivot ? "p" + (f.ballPt || [0, 0]).map((x) => x.toFixed(4)).join() : "f" + f.ank[0].toFixed(4) + f.ank[1].toFixed(4); if (!ref[X] || ref[X].id !== key) ref[X] = { id: key, p: pt.slice() }; else slip = Math.max(slip, Math.hypot(pt[0] - ref[X].p[0], pt[1] - ref[X].p[1])); }
      const th = pz.J["thigh_" + X].j; if (Math.hypot(aj[0] - th[0], aj[1] - th[1], aj[2] - th[2]) / S.body2.b.legLen > 0.995) ext++; } }
  const acc = []; for (const X of ["R", "L"]) { const A = H[X], sm = (i) => { const q = [A[i - 1], A[i], A[i + 1]]; if (q.some((x) => !x)) return null; return [0, 1, 2].map((k) => (q[0].p[k] + q[1].p[k] + q[2].p[k]) / 3); };
    for (let i = 3; i < A.length - 3; i++) { if (!A[i] || !A[i].sw) continue; const a0 = sm(i - 2), a1 = sm(i), a2 = sm(i + 2); if (!a0 || !a1 || !a2) continue; const h = 2 / 240; acc.push(Math.hypot(...[0, 1, 2].map((k) => (a2[k] - 2 * a1[k] + a0[k]) / (h * h)))); } }
  const r = { id, pipe, poses: nP, footAccP95: Math.round(pct(acc, 0.95)), footAccMax: Math.round(pct(acc, 1)), ikP99: +pct(ik, 0.99).toFixed(3), ikMax: +pct(ik, 1).toFixed(3), slip: +slip.toFixed(4), fullExt: +(ext / Math.max(1, 2 * nP)).toFixed(3) }; rows.push(r); console.log(JSON.stringify(r)); }
const S = (p, k, f) => f(rows.filter((r) => r.pipe === p).map((r) => r[k])), md = (a) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)], mx = (a) => Math.max(...a);
const summary = Object.fromEntries(["RE1", "NEW"].map((p) => [p, { footAccP95Median: S(p, "footAccP95", md), footAccMax: S(p, "footAccMax", mx), ikP99Median: S(p, "ikP99", md), ikMax: S(p, "ikMax", mx), slipMax: S(p, "slip", mx), fullExtMedian: S(p, "fullExt", md) }]));
fs.writeFileSync(process.argv[2] || "tc_body_ab.json", JSON.stringify({ summary, rows }, null, 1)); console.log(JSON.stringify(summary));

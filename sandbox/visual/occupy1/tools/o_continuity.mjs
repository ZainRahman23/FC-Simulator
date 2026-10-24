// occupy1/tools/o_continuity.mjs — §8 / §20 / §21 CONTINUITY, SUPPORT, NO DEADLOCK: every review case, OLD vs OCCUPANCY V1, on the bodies as
// drawn (each tick's live pose) and the simulation's root:
//   ROOT: its speed and its acceleration per tick (a snap is an acceleration a body cannot have: > 100 m/s², 10 g), the occupancy's own corrections
//   per tick (position, velocity removed), the solver's PING-PONG (a correction reversing its direction on the next tick)
//   THE DRAWN BODY (Tackling V1's thresholds, t_body.js): pelvis jumps (> 2 cm / tick), foot jumps (> 5 cm / tick), knee pops (> 6° / tick),
//   PLANT SLIDES (a planted foot's ball of foot drifting > 3 cm while the same stance holds), LEGS CROSSED (> 4 cm in the pelvis's frame)
//   (NO DEADLOCK is measured by tools/o_deadlock.mjs: every contact interval of the stress cases)
//   node o_continuity.mjs [--json f]
import { ENV } from "./o_env.mjs";
import { DT } from "../../vocab2/c_sim.js";
import { OCASES } from "../o_cases.js";
import { runO } from "../o_run.js";
import { BODY_TH } from "../../tackle1/t_body.js";
import fs from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; }, hyp = Math.hypot;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], ang = (a, b) => { const d = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (hyp(...a) * hyp(...b) || 1); return Math.acos(Math.max(-1, Math.min(1, d))) * 180 / Math.PI; };
const knee = (J, X) => ang(sub(J["thigh_" + X].t, J["thigh_" + X].j), sub(J["shin_" + X].t, J["shin_" + X].j));
function audit(W, clip) { const k0 = Math.round(clip[0] / DT), k1 = Math.round(clip[1] / DT), out = {}, F = W.frames;
  for (const [pid, p, key] of [["ATT", W.att, "a"], ["DEF", W.def, "d"]]) { const o = { snaps: 0, maxAcc: 0, pelvis: 0, foot: 0, knee: 0, plant: 0, plantMax: 0, crossed: 0 }; let prev = null, prevV = null; const pin = { R: null, L: null };
    for (let k = k0; k <= k1; k++) { const fr = F.get(k); if (!fr) continue; const J = fr[key].J, t = k * DT, st = p.stateAt(t), P = p.planAt(t);
      if (prev) { const v = [(st.P[0] - prev.P[0]) / DT, (st.P[1] - prev.P[1]) / DT]; if (prevV) { const a = hyp(v[0] - prevV[0], v[1] - prevV[1]) / DT; o.maxAcc = Math.max(o.maxAcc, a); if (a > 100) o.snaps++; } prevV = v;
        if (hyp(...sub(J.pelvis.j, prev.J.pelvis.j)) > BODY_TH.pelvisJump) o.pelvis++; for (const X of ["R", "L"]) { if (hyp(...sub(J["foot_" + X].j, prev.J["foot_" + X].j)) > BODY_TH.footJump) o.foot++; if (Math.abs(knee(J, X) - knee(prev.J, X)) > BODY_TH.kneeJump) o.knee++; } }
      for (const X of ["R", "L"]) { const s = P.stances[X].find((q) => q.t0 <= t + 1e-9 && q.t1 > t + 1e-9), q = J["toe_" + X].j; if (s) { if (!pin[X] || pin[X].id !== s.id) pin[X] = { id: s.id, p: q.slice(), t, flag: false }; else if (t - pin[X].t > 0.05) { const d = hyp(q[0] - pin[X].p[0], q[1] - pin[X].p[1]); o.plantMax = Math.max(o.plantMax, d); if (d > BODY_TH.plantDrift && !pin[X].flag) { pin[X].flag = true; o.plant++; } } } else pin[X] = null; }
      { const c = Math.cos(st.psi), s = Math.sin(st.psi), lat = (q) => -(q[0] - st.P[0]) * s + (q[1] - st.P[1]) * c, x = lat(J.foot_R.j) - lat(J.foot_L.j); if (x < -BODY_TH.cross) o.crossed++; }   // (the right side is +y: lat > 0 = right)
      prev = { P: st.P, J }; }
    out[pid] = o; }
  return out; }
const S = { OLD: {}, OCC: {} }, rows = []; const tot = (m, pid, k) => (S[m][pid + k] = S[m][pid + k] || 0);
for (const tc of OCASES) { const R = {};
  for (const m of ["OLD", "OCC"]) { const r = runO(ENV, tc, m), A = audit(r.W, r.clip); R[m] = { A, W: r.W, t0: r.t0 }; for (const pid of ["ATT", "DEF"]) for (const k of Object.keys(A[pid])) { const key = pid + "." + k; S[m][key] = k.endsWith("Max") || k === "maxAcc" ? Math.max(S[m][key] || 0, A[pid][k]) : (S[m][key] || 0) + A[pid][k]; } }
  const L = R.OCC.W.occ.log; let maxD = 0, maxDv = 0, pp = 0, prevR = null; for (const x of L) { maxD = Math.max(maxD, hyp(...x.dA), hyp(...x.dD)); maxDv = Math.max(maxDv, x.wA || 0, x.wD || 0); const rr = x.r, m = hyp(rr[0], rr[1]); if (prevR && m > 5e-4 && hyp(...prevR) > 5e-4 && rr[0] * prevR[0] + rr[1] * prevR[1] < 0) pp++; prevR = m > 5e-4 ? rr : null; }
  // (no deadlock: contact time after the inputs diverge — the cases that turn away / cross)
  let after = null; if (/away|cross/.test(tc.id)) { const tDiv = tc.id.startsWith("headon") ? R.OCC.t0 + 1.6 : R.OCC.t0; const last = L.filter((x) => x.maxRes > -0.005 && x.t >= tDiv).slice(-1)[0]; after = last ? +(last.t - tDiv).toFixed(3) : 0; }
  rows.push({ id: tc.id, OLD: R.OLD.A, OCC: R.OCC.A, maxD: +(maxD * 100).toFixed(2), maxDv: +maxDv.toFixed(2), pingpong: pp, contactAfterDiverge: after });
  process.stderr.write("."); }
console.log(`\nCONTINUITY — ${OCASES.length} review cases, OLD vs OCCUPANCY V1 (the bodies as drawn; Tackling V1's thresholds)`);
const lab = { snaps: "root snaps (acceleration > 100 m/s², 10 g)", maxAcc: "the root's largest acceleration (m/s²)", pelvis: "pelvis jumps (> 2 cm / tick)", foot: "foot jumps (> 5 cm / tick)", knee: "knee pops (> 6° / tick)", plant: "PLANT SLIDES (> 3 cm in one stance)", plantMax: "largest planted-foot drift (m)", crossed: "legs crossed (ticks)" };
console.log(`  ${"".padEnd(42)}${"OLD att".padStart(10)}${"OCC att".padStart(10)}${"OLD def".padStart(10)}${"OCC def".padStart(10)}`);
for (const k of Object.keys(lab)) console.log(`  ${lab[k].padEnd(42)}${[["OLD", "ATT"], ["OCC", "ATT"], ["OLD", "DEF"], ["OCC", "DEF"]].map(([m, p]) => { const v = S[m][p + "." + k] || 0; return (Number.isInteger(v) ? String(v) : v.toFixed(3)).padStart(10); }).join("")}`);
console.log(`  occupancy's largest position correction per tick: ${Math.max(...rows.map((r) => r.maxD)).toFixed(2)} cm · largest soft-wall cut of a planned path: ${Math.max(...rows.map((r) => r.maxDv)).toFixed(2)} m · correction reversals on consecutive ticks (ping-pong): ${rows.reduce((a, r) => a + r.pingpong, 0)}`);
console.log(`  (no deadlock: the contact intervals of the stress cases — tools/o_deadlock.mjs, evidence/deadlock.txt)`);
console.log("\n  per case (OCC): " + rows.map((r) => `${r.id} snaps ${r.OCC.ATT.snaps + r.OCC.DEF.snaps} plant ${r.OCC.ATT.plant + r.OCC.DEF.plant}(OLD ${r.OLD.ATT.plant + r.OLD.DEF.plant}) maxΔ ${r.maxD} cm pp ${r.pingpong}`).join(" | "));
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify({ S, rows }, null, 1));

// offline geometry only: vertical descent knot -> (hE, -ve, ae) -> corridor (hE, -ve, ae) -> (0,0,0); search tauC, ve (band-coupled), ae for the minimum peak late vertical jerk
import fs from "fs"; import zlib from "zlib"; import path from "path";
const base = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2";
const { Q } = await import(base + "/core/v2_math.js"), { qlog, stepSegment, quintic, qeval } = await import(base + "/ctrl/v2_swing.js");
const dir = "/private/tmp/claude-501/-Users-zainrahman/8af3fa3f-f134-4178-b7ae-7855027dda6e/scratchpad/abval/run/runs", L = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f))));
const r = L("ab_PSTAR5CHAB_V2-REF_L_240_R-F.json.gz"), T = r.tr.T, sg = stepSegment({ p: r.rows.find(x => x.ph === "swing" && x.u >= 0).ref.p, v: r.rows.find(x => x.ph === "swing" && x.u >= 0).ref.v, a: r.rows.find(x => x.ph === "swing" && x.u >= 0).ref.a, th: [0, 0, 0], w: [0, 0, 0], al: [0, 0, 0] }, r.goal, T, { z: r.anchor.pos[1] + r.tr.apex, tk: 0.5 * T });
const kn = sg.cp[1][0], tk = kn.T, kS = qeval(kn.c, tk), zg = r.goal.pos[1];   // knot state from the original solve (kept: the rise piece is unchanged here)
const band = 0.00153 + 0.0005, dt = 1 / 180, J = (c, t) => 6 * c[3] + 24 * c[4] * t + 60 * c[5] * t * t;
let best = null;
for (let tc = 0.04; tc <= 0.2; tc += 0.005) for (let ve = 0.01; ve <= 0.12; ve += 0.0025) { const hE = band + ve * dt; for (let ae = 0; ae <= 3.0; ae += 0.05) {
  const td = T - tk - tc, c1 = quintic(kS[0], kS[1], kS[2], zg + hE, -ve, ae, td), c2 = quintic(zg + hE, -ve, ae, zg, 0, 0, tc); let ok = true, jMax = 0, jLate = 0, aMax = 0, aLate = 0, vLate = 0, vMaxC = 0;
  for (let i = 0; i <= 200; i++) { const t = td * i / 200, q = qeval(c1, t), j = Math.abs(J(c1, t)); jMax = Math.max(jMax, j); aMax = Math.max(aMax, Math.abs(q[2])); if (q[0] - zg <= 0.01106) { jLate = Math.max(jLate, j); aLate = Math.max(aLate, Math.abs(q[2])); vLate = Math.max(vLate, Math.abs(q[1])); } }
  for (let i = 0; i <= 200; i++) { const t = tc * i / 200, q = qeval(c2, t), j = Math.abs(J(c2, t)); if (q[1] > 1e-9 || q[0] < zg - 1e-9) { ok = false; break; } vMaxC = Math.max(vMaxC, -q[1]); jMax = Math.max(jMax, j); jLate = Math.max(jLate, j); aMax = Math.max(aMax, Math.abs(q[2])); aLate = Math.max(aLate, Math.abs(q[2])); vLate = Math.max(vLate, Math.abs(q[1])); }
  if (!ok || vMaxC > ve + 1e-9 || aMax > 3.7427 || aLate > 2.6324 || vLate > 0.2169) continue;
  if (!best || jLate < best.jLate) best = { tc, ve, ae, hE, jLate, jMax, aLate }; } }
console.log("minimum late vertical jerk over (τ_c, v_e, a_e) with monotone corridor, speed ≤ v_e, acceleration envelopes:", best ? JSON.stringify(Object.fromEntries(Object.entries(best).map(([k, v]) => [k, +v.toFixed(4)]))) : "none");
// smallest v_e achievable with late jerk <= 49.46 and overall <= 81.84
let bestV = null; for (let tc = 0.04; tc <= 0.2; tc += 0.005) for (let ve = 0.01; ve <= 0.15; ve += 0.0025) { const hE = band + ve * dt; for (let ae = 0; ae <= 3.0; ae += 0.05) { const td = T - tk - tc, c1 = quintic(kS[0], kS[1], kS[2], zg + hE, -ve, ae, td), c2 = quintic(zg + hE, -ve, ae, zg, 0, 0, tc); let ok = true, jMax = 0, jLate = 0, aMax = 0, aLate = 0, vLate = 0, vMaxC = 0;
  for (let i = 0; i <= 150; i++) { const t = td * i / 150, q = qeval(c1, t), j = Math.abs(J(c1, t)); jMax = Math.max(jMax, j); aMax = Math.max(aMax, Math.abs(q[2])); if (q[0] - zg <= 0.01106) { jLate = Math.max(jLate, j); aLate = Math.max(aLate, Math.abs(q[2])); vLate = Math.max(vLate, Math.abs(q[1])); } }
  for (let i = 0; i <= 150; i++) { const t = tc * i / 150, q = qeval(c2, t), j = Math.abs(J(c2, t)); if (q[1] > 1e-9 || q[0] < zg - 1e-9) { ok = false; break; } vMaxC = Math.max(vMaxC, -q[1]); jMax = Math.max(jMax, j); jLate = Math.max(jLate, j); aMax = Math.max(aMax, Math.abs(q[2])); aLate = Math.max(aLate, Math.abs(q[2])); vLate = Math.max(vLate, Math.abs(q[1])); }
  if (!ok || vMaxC > ve + 1e-9 || aMax > 3.7427 || aLate > 2.6324 || vLate > 0.2169 || jLate > 49.46 || jMax > 81.84) continue; if (!bestV || ve < bestV.ve) bestV = { tc, ve, ae, hE, jLate, jMax }; } }
console.log("smallest corridor speed bound inside every validated envelope (vertical only):", bestV ? JSON.stringify(Object.fromEntries(Object.entries(bestV).map(([k, v]) => [k, +v.toFixed(4)]))) : "NONE");

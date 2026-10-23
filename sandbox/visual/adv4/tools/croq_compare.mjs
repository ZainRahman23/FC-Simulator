// adv4/tools/croq_compare.mjs — THE CROQUETA REFINEMENT (owner 22 Oct 17:33): CURRENT (the croqueta before its body upgrade, sim option
// croq: "CURRENT") → UPGRADED → the BASIC REDIRECT (the ordinary inside cut requested; and B4 without the croqueta) from the identical entry,
// 4 stride phases. Per lane:
//   lane +0.5 m   request → the root 0.5 m across toward the exit side (the lane transfer)
//   across@0.6/0.8  the root's lateral displacement 0.6 / 0.8 s after the request
//   ball side      request → the ball on the exit side of the body (its lateral offset from the root > 0)
//   ball@+0.3      the ball's lateral offset from the body 0.3 s after the decisive touch (+ = on the exit side, the body between it and the old line)
//   exit           request → useful exit (v_run exitMetrics) · vMin
//   psi over       the pelvis's overshoot beyond the exit heading (deg) · yaw rate max (deg/s) over the move — the body's reorganisation
//   body           normal / slow-motion posed events · possession exits · missed contacts
//   node croq_compare.mjs [--modes WALK,JOG,RUN] [--angles -40,-55,40] [--json f]
import fs from "node:fs";
import { runLane } from "./adv_measure.mjs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, DEG = 180 / Math.PI;
export const LANES = [{ name: "CURRENT croqueta", req: "CROQUETA", croq: "CURRENT" }, { name: "UPGRADED croqueta", req: "CROQUETA" }, { name: "BASIC: inside cut", req: "INSIDE_CUT", hold: ["LAT"] }, { name: "BASIC: B4 without it", req: null, hold: ["LAT"] }, { name: "AUTO: B4 with it", req: null }, { name: "AUTO: B4 (CURRENT croqueta)", req: null, croq: "CURRENT" }];
export function laneMetrics(lane, prob, phase) { const r = runLane(lane, prob, { phase }), sim = r.sim, t0 = sim.t - 3.4, st0 = sim.stateAt(t0), h0 = st0.h, side = Math.sign(prob.ang) || 1, hq = h0 + prob.ang / DEG;
  const lat = (p) => (-(p[0] - st0.P[0]) * Math.sin(h0) + (p[1] - st0.P[1]) * Math.cos(h0)) * side; let tLane = null, tSide = null, over = 0, wMax = 0, prevPsi = null;
  for (let t = t0; t <= t0 + 2.0; t += 1 / 240) { const s = sim.stateAt(t), b = sim.ballTrack(t).p; if (tLane == null && lat(s.P) >= 0.5) tLane = t - t0; if (tSide == null && lat(b) - lat(s.P) > 0.0) tSide = t - t0;
    const dPsi = Math.atan2(Math.sin(s.psi - hq), Math.cos(s.psi - hq)) * DEG * -side; if (t < t0 + 1.2) over = Math.max(over, -dPsi * 0 + (side > 0 ? -1 : 1) * 0 + Math.max(0, (Math.atan2(Math.sin(s.psi - h0), Math.cos(s.psi - h0)) * DEG * side) - Math.abs(prob.ang)));
    if (prevPsi != null && t < t0 + 1.2) wMax = Math.max(wMax, Math.abs(Math.atan2(Math.sin(s.psi - prevPsi), Math.cos(s.psi - prevPsi))) * DEG * 240); prevPsi = s.psi; }
  const dec = sim.contacts.find((c) => c.t >= t0 - 1e-9 && (c.fam === "LAT" || c.fam === "CIR" || c.decisive)); const bAt = (t) => lat(sim.ballTrack(t).p) - lat(sim.stateAt(t).P);
  return { played: r.played, result: r.result, total: r.total, vMin: r.vMin, tDec: r.tDec, tLane, tSide, a06: lat(sim.stateAt(t0 + 0.6).P), a08: lat(sim.stateAt(t0 + 0.8).P), b03: dec ? bAt(dec.t + 0.3) : null, over, wMax, bodyN: r.body ? r.body.normal : 0, bodyS: r.body ? r.body.slow : 0, ev: r.bodyEv, exits: r.exits, missed: r.missed }; }
const avg = (rs, k) => { const v = rs.map((r) => r[k]).filter((x) => x != null && isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const f = (x, d = 2) => (x == null ? "  — " : x.toFixed(d));
if ((process.argv[1] || "").endsWith("croq_compare.mjs")) { const modes = opt("modes", "WALK,JOG,RUN").split(","), angs = opt("angles", "-40,-55,40").split(",").map(Number), N = 4, out = [];
  for (const mode of modes) for (const ang of angs) { console.log(`■ ${mode} · ${Math.abs(ang)}° ${ang < 0 ? "left" : "right"} (right-footed)`);
    for (const lane of LANES) { const rs = []; for (let i = 0; i < N; i++) rs.push(laneMetrics(lane, { mode, ang }, i * 0.075)); const ok = rs.filter((r) => r.result === "PLAYED" || r.result === "AUTO");
      const A = { lane: lane.name, mode, ang, n: ok.length, played: [...new Set(rs.map((r) => (r.result === "PLAYED" || r.result === "AUTO" ? "" : r.result + "→") + (r.played || "—")))].join(", "), total: avg(ok, "total"), tLane: avg(ok, "tLane"), tSide: avg(ok, "tSide"), a06: avg(ok, "a06"), a08: avg(ok, "a08"), b03: avg(ok, "b03"), over: avg(ok, "over"), wMax: avg(ok, "wMax"), vMin: avg(ok, "vMin"), bodyN: rs.reduce((a, r) => a + r.bodyN, 0), bodyS: rs.reduce((a, r) => a + r.bodyS, 0), exits: rs.reduce((a, r) => a + r.exits, 0), missed: rs.reduce((a, r) => a + r.missed, 0), ev: rs.flatMap((r) => r.ev || []) };
      out.push(A); console.log(`   ${lane.name.padEnd(22)} ${A.n}/${N} ${A.played.slice(0, 34).padEnd(34)} exit ${f(A.total)} · lane+0.5m ${f(A.tLane)} · across@0.6 ${f(A.a06)} @0.8 ${f(A.a08)} · ball side ${f(A.tSide)} · ball@+0.3 ${f(A.b03)} · psi over ${f(A.over, 0)}° · yaw max ${f(A.wMax, 0)}°/s · vMin ${f(A.vMin, 1)} · body ${A.bodyN}/${A.bodyS} · exits ${A.exits} · missed ${A.missed}${A.ev.length ? " [" + A.ev.slice(0, 3).join("; ") + "]" : ""}`); } }
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(out, null, 1)); }

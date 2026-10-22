// tc_controlled1/tools/c_opponent.mjs — THE OPPONENT PROBE (owner §24, mandatory): a deterministic opponent foot driven into the AUTHORITATIVE ball
// at random moments of controlled play (random seeded input programs; the hit time, the approach direction and the foot's speed drawn per trial):
//   pass 1 (no opponent) finds where the ball really is at the chosen moment; pass 2 runs the identical input with a probe whose straight path
//   meets that point then — the probe is never told about the player, its plan or its body.
// Checked per trial: the probe hits (the controlled state cannot prevent it) · the state after (control survives with the altered ball, or
// CONTROLLED → FREE classified OPPONENT_*) · CONTINUITY at the hit: the ball's position continuous across the hit tick, its velocity exactly the
// collision's, and from then until the next player contact the ball follows the free kernel roll from that state (no hidden damping, no reset)
//   node c_opponent.mjs [--trials 200] [--json f]
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../c_sim.js";
import { program, PAGE } from "./c_torture.mjs";
import { predict, Ball, R as BR } from "../../tc_baseline_88573ef0/pt_ball.js";
import fs from "node:fs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, hyp = Math.hypot;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
const mk = (o = {}) => makeSim("TL", Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL"), control: "CONTROLLED" }, o));
export function trial(i) { const R = rng(7000 + i), seed = 1 + Math.floor(R() * 500), P = program(seed, 30), tHit = 3 + R() * 22, ang = R() * 2 * Math.PI, spd = 2 + 7 * R(), kind = ["tackle", "poke", "intercept", "block"][Math.floor(R() * 4)];
  // pass 1: the ball at the moment, the possession state then
  const a = mk(); for (let k = 0; k < Math.round(tHit / DT); k++) a.step(P.req(k * DT)); const b0 = a.ball.p, st0 = a.poss.state, act0 = a.plan.action.label;
  if (st0 !== "CONTROLLED") return { i, seed, skipped: "not in control at the moment", st0 };
  // the probe: a foot at ball height + a little, on a straight line through that point, arriving at the moment (0.25 s of approach)
  const u = [Math.cos(ang), Math.sin(ang)], vf = kind === "block" ? [u[0] * 0.3, u[1] * 0.3] : [u[0] * spd, u[1] * spd], T0 = 0.25, p0 = [b0[0] - vf[0] * T0 - u[0] * (BR + 0.06), b0[1] - vf[1] * T0 - u[1] * (BR + 0.06)];
  const probe = { id: "p" + i, kind, t0: tHit - T0, t1: tHit + 0.15, p0, v: vf, r: 0.07, z: 0.10, e: 0.55 };
  const b = mk({ opponent: [probe] }); const n = Math.round((tHit + 3) / DT), trace = []; let hitK = -1;
  for (let k = 0; k < n; k++) { b.step(P.req(k * DT)); trace.push({ t: b.t, p: b.ball.p, v: b.ball.v, nC: b.contacts.length }); if (hitK < 0 && b.extLog.length) hitK = k; }
  if (hitK < 0) return { i, seed, kind, missedByProbe: true, st0 };
  // (the position across the hit tick against the kernel's own step from the state before it with the collision's velocity: no displacement)
  const hit = b.extLog[0], before = trace[hitK - 1], at = trace[hitK], exp = [before.p[0] + hit.vOut[0] * DT, before.p[1] + hit.vOut[1] * DT], jump = Math.min(hyp(at.p[0] - exp[0], at.p[1] - exp[1]), hyp(at.p[0] - before.p[0] - before.v[0] * DT, at.p[1] - before.p[1] - before.v[1] * DT));
  // (continuity: between the hit and the next player contact the ball must be the free kernel roll from its post-hit state)
  // (a fresh kernel ball launched from the post-hit state, stepped alongside: the controlled ball after the hit must be exactly that free ball)
  let maxDev = 0, steps = 0; const start = trace[hitK], free = new Ball([start.p[0], start.p[1]], [start.v[0], start.v[1]]);
  for (let j = hitK + 1; j < trace.length; j++) { if (trace[j].nC !== start.nC) break; free.step(); const q = free.p; maxDev = Math.max(maxDev, hyp(q[0] - trace[j].p[0], q[1] - trace[j].p[1])); steps++; if (steps > 240) break; }
  const ex = b.poss.log.filter((e) => e.from === "CONTROLLED" && e.to === "FREE" && e.t >= hit.t - 1e-9), first = ex[0] || null, back = b.poss.log.find((e) => e.to === "CONTROLLED" && e.t > hit.t);
  return { i, seed, kind, speed: +spd.toFixed(1), tHit: +hit.t.toFixed(3), action: act0, hit: true, dvBall: +hyp(hit.vOut[0] - hit.vIn[0], hit.vOut[1] - hit.vIn[1]).toFixed(2), posJumpAtHit: +jump.toFixed(4), freeRollDev: +maxDev.toFixed(4), freeSteps: steps,
    outcome: first && first.t - hit.t < 1.05 ? first.why : "control survived", exitAfter: first ? +(first.t - hit.t).toFixed(3) : null, recollected: back ? +(back.t - hit.t).toFixed(2) : null }; }
if ((process.argv[1] || "").endsWith("c_opponent.mjs")) { const N = +opt("trials", 200), rows = []; for (let i = 0; i < N; i++) rows.push(trial(i));
  const hits = rows.filter((r) => r.hit), sk = rows.filter((r) => r.skipped).length, mp = rows.filter((r) => r.missedByProbe).length, O = {}; for (const r of hits) O[r.outcome] = (O[r.outcome] || 0) + 1;
  const K = {}; for (const r of hits) { const k = r.kind + " → " + (r.outcome === "control survived" ? "survived" : "broken"); K[k] = (K[k] || 0) + 1; }
  console.log(`${N} trials: ${hits.length} hits on a controlled ball (${sk} skipped: not in control at the moment; ${mp} the probe missed the ball) · outcomes ${JSON.stringify(O)} · by kind ${JSON.stringify(K)}`);
  console.log(`continuity: max position discontinuity at the hit tick ${Math.max(...hits.map((r) => r.posJumpAtHit)).toFixed(5)} m (against the kernel's own step), max deviation from a fresh free kernel ball launched from the post-hit state ${Math.max(...hits.map((r) => r.freeRollDev)).toFixed(5)} m · re-collected after a break: ${hits.filter((r) => r.recollected != null && r.outcome !== "control survived").length}`);
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(rows, null, 1)); }

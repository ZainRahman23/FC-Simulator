// dribble12/tools/d12_trace.mjs — one run as a chronological story: plans made / replaced / dropped, commits (launch, follow-through, floor), the
// kernel's launches and contacts, control changes, the cut timeline (hold, stages, release), and the ball relative to the player every 0.25 s
// usage: node d12_trace.mjs SCENARIO seed [ver d12|d11|d1] [t0] [t1]
import { makeSim, DT, CORES } from "./d12_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js";
const [id = "CUT60_RUN", seed = "1", ver = "d12", t0 = "0", t1 = "99"] = process.argv.slice(2), P = CORES[ver].DribbleSim.prototype, D = 180 / Math.PI, f = (x, n = 2) => x == null ? "–" : (+x).toFixed(n);
const ev = []; const at = (k) => k * DT >= +t0 && k * DT <= +t1;
const mp = P.makePlan; P.makePlan = function (k) { const before = this.plan ? this.plan.id + this.plan.reg + this.plan.launch.speed : null; const r = mp.call(this, k); const p = this.plan, after = p ? p.id + p.reg + p.launch.speed : null;
  if (after !== before && at(k)) ev.push([k, p ? `PLAN ${p.F} ${p.reg} @${f(p.kc * DT)} ${p.release ? "CUT" + (p.stage != null ? " stage→" + f(p.stage * D, 0) + "°" : " full") : ""} aim ${f(Math.atan2(-p.n[2], p.n[0]) * D, 0)}° launch ${f(p.launch.speed)} (floor ${f(p.sF)}) next ${p.launch.F2 || "-"}@${p.launch.kNext ? f(p.launch.kNext * DT) : "-"}${p.launch.recovery ? " RECOVERY" : ""} ft ${p.caft ? f(p.caft.iy, 1) + "/" + f(p.caft.ia, 1) : "-"} rho ${f(p.rho)} wc ${f(p.wc)} wp ${f(p.wp)}` : "plan dropped"]); return r; };
const cm = P.commit; P.commit = function (k, Pl) { cm.call(this, k, Pl); const T = this.touches[this.touches.length - 1]; if (at(k)) ev.push([k, `COMMIT ${T.F} ${T.reg} executed ${f(T.executed.speed)} m/s dir ${f(Math.atan2(-T.executed.v[2], T.executed.v[0]) * D, 0)}° floorK ${f(T.floorK)} ft ${T.caft ? f(T.caft.iy, 2) + "/" + f(T.caft.ia, 2) : "-"} gap ${f(T.gap * 1000, 1)}mm${T.cancelled ? " CANCELLED " + T.cancelled : ""}`]); };
const S = makeSim(get(id), { ver, seed: +seed }); const n = Math.round(S.cfg.scenario.dur / DT); let ce = 0, ct = 0, tl = 0;
while (S.k < n && !S.fault) { S.step(); const k = S.k - 1;
  for (; ce < S.contacts.length; ce++) { const c = S.contacts[ce]; if (at(c.k)) ev.push([c.k, `CONTACT ${c.own ? "own" : "OPP"} ${c.part} J ${f(c.impulse)} ${c.striking ? "(striking)" : ""} ${f(c.sinceLaunch * 1000, 0)} ms after launch`]); }
  for (; ct < S.ctrl.changes.length; ct++) { const c = S.ctrl.changes[ct]; if (at(c.k)) ev.push([c.k, `CTRL → ${c.to} (dist ${f(c.dist)})`]); }
  for (; tl < S.turnLog.length; tl++) { const e = S.turnLog[tl]; if (at(e.k)) ev.push([e.k, `TURN ${e.kind} by ${e.by}${e.dir != null ? " dir " + f(e.dir * D, 0) : ""}`]); }
  if (k % 60 === 0 && at(k)) { const r = S.rec[S.rec.length - 1], dx = r.ball.p[0] - r.P[0], dy = r.ball.p[2] - r.P[1], th = r.psi; ev.push([k, `   · heading ${f(Math.atan2(r.V[1], r.V[0]) * D, 0)}° req ${f(r.dir * D, 0)}°${r.held ? " HELD(" + f(S.held.raw.dir * D, 0) + ")" : ""} speed ${f(Math.hypot(r.V[0], r.V[1]))} · ball fwd ${f(dx * Math.cos(th) + dy * Math.sin(th))} lat ${f(-dx * Math.sin(th) + dy * Math.cos(th))} speed ${f(Math.hypot(r.ball.v[0], r.ball.v[2]))} dir ${f(Math.atan2(r.ball.v[2], r.ball.v[0]) * D, 0)}° · ${r.ctrl}`]); } }
ev.sort((a, b) => a[0] - b[0]); for (const [k, s] of ev) console.log(f(k * DT, 3).padStart(6), s);
console.log("fault:", S.fault || "none");

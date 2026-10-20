// tc_responsive/tools/rs_interceptor.mjs — THE INTERCEPTOR PROBE (the owner's physical contest gate, before a real defender): a deterministic sphere
// (r 0.30 m, 4 m/s across the run) crosses the ball's predicted path around a planned dribble contact. A contact is a physical event, never a
// reservation of the ball:
//   A  the interceptor reaches the ball 150 ms before the planned touch (the touch still revisable): the interceptor plays the ball; the planned
//      touch never applies its impulse; the player re-plans from the ball where it really went (no restoration of the old plan)
//   B  it reaches the ball 25 ms before the touch — inside the touching proxy's final approach (committed): the committed foot still arrives;
//      if the ball is out of its reach the touch is MISSED, if it is still there the meeting is a DEFLECTED touch (the ball's and the foot's own
//      motion) — never the old plan's outcome
//   C  control: it crosses where the ball would have been 100 ms after the touch — the touch has moved the ball on: the interceptor finds nothing,
//      the touch executes as planned
//   node rs_interceptor.mjs [--json out.json]
import { makeSim, DT } from "./rs_env.mjs";
import { predict } from "../pt_ball.js";
import fs from "node:fs";
const hyp = Math.hypot, out = {}, run = (o, until) => { const sim = makeSim("RX", o); for (let k = 0; k < Math.round(until / DT); k++) { const t = k * DT; sim.step({ h: t < 0.2 ? null : 0, mode: "RUN", keys: 0 }); } return sim; };
// the planned touch to contest: the next carry contact after 2.5 s in a straight run (found on a dry run — the same deterministic run)
const dry = run({}, 2.5), c0 = dry.plan.contacts.find((c) => !c.done && c.t > dry.t + 0.2), tc = c0.t, F = c0.F, bAt = (sim, t) => predict(sim.ball.p, sim.ball.v, t - sim.t).p;
const dry2 = run({}, tc - 0.4), ballPath = (t) => bAt(dry2, t);   // the ball's path without the touch (from before it)
console.log(`the contested touch: ${F} ${c0.role} at ${tc.toFixed(3)} s (commitment window ${(c0.tauC * 1000).toFixed(0)} ms)`);
// the sphere crosses the ball's path at X at time tX, moving across it at 4 m/s — it first touches the ball (r + R = 0.41 m earlier) ≈ 0.10 s before
const mk = (tX, X) => { const v = [0, -4.0]; return { r: 0.30, at: (t) => (t < tX - 0.6 || t > tX + 0.6 ? null : { p: [X[0] + v[0] * (t - tX), X[1] + v[1] * (t - tX)], v }) }; };
const lead = 0.41 / 4.0;
for (const [name, tFirst, cross] of [["A — 150 ms before (revisable)", tc - 0.150, null], ["B — 25 ms before (inside the 38 ms commitment)", tc - 0.025, null], ["C — control: 150 ms after, across the touch's own spot", null, tc]]) {
  const tX = cross != null ? tc + 0.15 + lead : tFirst + lead, X = cross != null ? ballPath(tc) : ballPath(tFirst), I = mk(tX, X), sim = run({ interceptor: I }, tc + 1.2), rec = sim.contacts, tHit = tFirst != null ? tFirst : tc + 0.15;
  // (the contested touch: the one by its foot at its time — re-plans give a pending touch a new id each time)
  const ic = rec.find((c) => c.interceptor), planned = rec.find((c) => !c.interceptor && c.F === F && Math.abs(c.t - tc) < 0.03), afterIc = ic ? rec.filter((c) => !c.interceptor && c.t > ic.t) : [];
  // the planned touch's impulse never applied after the interceptor played the ball (by id: the old plan's contact; by kind: a touch at its time
  // sending the ball where the old plan wanted)
  // (stale = the planned touch applying its planned outcome to a ball that was played first; a "deflected touch" is the physical meeting, not stale)
  const stale = ic ? rec.filter((c) => !c.interceptor && !c.missed && !c.disturbed && c.t > ic.t && c.F === F && Math.abs(c.t - tc) < 0.03).length : 0;
  const r = { name, tHit: +tHit.toFixed(3), interceptor: ic ? { t: +ic.t.toFixed(3), ballOut: +hyp(...ic.vOut).toFixed(2) } : null, planned: planned ? { t: +planned.t.toFixed(3), missed: !!planned.missed, why: planned.why || null } : null, staleImpulses: stale,
    after: afterIc.slice(0, 3).map((c) => `${c.t.toFixed(3)} ${c.F} ${c.role}${c.missed ? " MISSED (" + c.why + ")" : ""}`), commitT: planned && planned.commitT != null ? +planned.commitT.toFixed(3) : null };
  r.pass = cross == null ? !!ic && stale === 0 : !ic && !!planned && !planned.missed;
  out[name] = r; console.log(`\n■ ${name}: ${r.pass ? "PASS" : "FAIL"}\n  interceptor ${ic ? `played the ball at ${ic.t.toFixed(3)} s (out ${r.interceptor.ballOut} m/s)` : "never touched the ball"} · the planned touch ${planned ? (planned.missed ? `MISSED at ${planned.t.toFixed(3)} (${planned.why})` : `executed at ${planned.t.toFixed(3)}`) : "never executed (re-planned away)"}${r.commitT != null ? ` · it was committed from ${r.commitT.toFixed(3)}` : ""} · stale impulses ${stale}\n  then: ${r.after.join(" · ") || "—"}`); }
if (process.argv.indexOf("--json") > 0) fs.writeFileSync(process.argv[process.argv.indexOf("--json") + 1], JSON.stringify(out, null, 1));

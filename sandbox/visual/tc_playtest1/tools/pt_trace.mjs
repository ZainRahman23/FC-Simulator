// tc_playtest1/tools/pt_trace.mjs — one torture run traced: every re-plan in a window (the request, the travel, the ball in the body frame, the
// chosen plan and its next contact, the candidates' costs), the contacts in the window
//   node pt_trace.mjs "<sequence>" <MODE> <t1,t2>
import { SEQ, MODES } from "./pt_torture.mjs";
import { makeSim } from "./pt_env.mjs";
import { stickVector, stickMode, headingFrom } from "../pt_input.js";
const [name, mode, win] = [process.argv[2], process.argv[3], process.argv[4].split(",").map(Number)], seq = SEQ[name], M = MODES[mode], DT = 1 / 240, DEG = Math.PI / 180, D = 180 / Math.PI;
const sim = makeSim({}); let lastV = -1;
for (let k = 0; k < Math.round(seq.dur / DT); k++) { const t = k * DT, a = seq.f(t), v = stickVector(Math.sin(a * DEG) * M.r, Math.cos(a * DEG) * M.r);
  sim.step({ h: t < 0.2 ? null : headingFrom(0, v.x, v.y), mode: M.sprint ? "SPRINT" : stickMode(v.r), keys: 64 }); const T = sim.t; if (T < win[0] || T > win[1]) continue;
  const st = sim.stateAt(T), b = sim.ball.p, bv = sim.ball.v, th = st.psi, dx = b[0] - st.P[0], dy = b[1] - st.P[1], ra = dx * Math.cos(th) + dy * Math.sin(th), rl = -dx * Math.sin(th) + dy * Math.cos(th), p = sim.plan;
  if (p.v !== lastV || k % 12 === 0) { const nc = p.contacts.filter((c) => !c.done && c.t > T - 1e-9)[0];
    console.log(`${T.toFixed(3)} req ${sim.req.h == null ? "—" : (sim.req.h * D).toFixed(0).padStart(4)} trav ${(st.h * D).toFixed(0).padStart(4)} psi ${(st.psi * D).toFixed(0).padStart(4)} v ${st.s.toFixed(1)} ball a ${ra.toFixed(2)} l ${rl.toFixed(2)} bs ${Math.hypot(...bv).toFixed(1)} | ${p.v !== lastV ? "PLAN(" + p.reason + ") " : ""}${p.action.label}${p.action.m ? (p.action.m > 0 ? " R" : " L") : ""}${p.action.chase ? " [chase]" : ""} next ${nc ? nc.F + " " + nc.role + " @+" + (nc.t - T).toFixed(2) : "NONE"}${p.v !== lastV ? " · " + (p.why || []).slice(0, 3).map((x) => x.label + " " + x.J + " [" + x.note + "]").join(" | ") : ""}`.slice(0, 360)); lastV = p.v; } }
for (const c of sim.contacts) if (c.t >= win[0] - 0.4 && c.t <= win[1]) console.log(`  contact ${c.t.toFixed(3)} ${c.F} ${c.surface} ${c.role} [${c.tech}] out ${Math.hypot(...c.vOut).toFixed(2)} @ ${(Math.atan2(c.vOut[1], c.vOut[0]) * D).toFixed(0)}° req ${c.reqH == null ? "—" : (c.reqH * D).toFixed(0)}`);

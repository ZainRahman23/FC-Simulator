// tc_playtest1/tools/pt_audit.mjs — the presentation audit of a recorded session (or a scripted one): every tick re-simulated and POSED — the ball
// inside a boot (DRIBBLE-1's hull, > 20 mm, outside the contact's own ±2 ticks), the legs through each other (TECHNICAL-CONTROL-1.3's capsules,
// > 20 mm), an ankle below the turf, the pose's cost; each event span listed with the contact nearest to it
//   node pt_audit.mjs <session.json> [--json out.json]
import { ENV, makeSim } from "./pt_env.mjs";
import { PlayBody } from "../pt_body.js";
import { MODES } from "../pt_sim.js";
import fs from "node:fs";
const R = JSON.parse(fs.readFileSync(process.argv[2])), out = process.argv.indexOf("--json") > 0 ? process.argv[process.argv.indexOf("--json") + 1] : null;
const colliders = JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url)));
const sim = makeSim(R.o0), body = new PlayBody(Object.assign({}, ENV, { colliders }), sim), I = R.input, E = R.events; let ei = 0;
const ev = { ball: [], legs: [], low: [] }, tms = []; let worstG = { v: 9 }, worstL = { v: 9 };
for (let k = 0; k < R.k; k++) { while (ei < E.length && E[ei].k === k) { const e = E[ei++]; if (e.kind === "attrs") sim.setAttrs(e.v); else if (e.kind === "foot") sim.setFoot(e.v); }
  const h = I[3 * k]; sim.step({ h: h === -99 ? null : h, mode: MODES[I[3 * k + 1]], keys: I[3 * k + 2] });
  const c0 = performance.now(), p = body.pose(sim.t); tms.push(performance.now() - c0); const t = sim.t, nearC = sim.contacts.some((c) => Math.abs(c.k - sim.k) <= 2);
  for (const X of ["R", "L"]) { const g = p.gap[X]; if (g && g.gap < -0.02 && !nearC) ev.ball.push([t, X, g.gap, g.face]); if (g && g.gap < worstG.v && !nearC) worstG = { v: g.gap, t, X, face: g.face }; if (p.feet[X].ank[2] < 0.06) ev.low.push([t, X]); }
  const ml = Math.min(...Object.values(p.clr)); if (ml < -0.02) ev.legs.push([t, ml, Object.entries(p.clr).sort((a, b) => a[1] - b[1])[0][0]]); if (ml < worstL.v) worstL = { v: ml, t }; }
const spans = (L) => { const o = []; for (const e of L) { const l = o[o.length - 1]; if (l && e[0] - l.t1 < 0.02) { l.t1 = e[0]; l.worst = Math.min(l.worst, e[2]); l.n++; } else o.push({ t0: e[0], t1: e[0], worst: e[2], n: 1, what: e[1] + " " + (e[3] || "") }); } return o; };
const near = (t) => { let b = null; for (const c of sim.contacts) if (!b || Math.abs(c.t - t) < Math.abs(b.t - t)) b = c; return b ? `${b.t.toFixed(2)} ${b.F} ${b.surface} ${b.role} [${b.tech}]` : "—"; };
const SB = spans(ev.ball), SL = spans(ev.legs.map(([t, v, w]) => [t, w, v])); tms.sort((a, b) => a - b);
const res = { ticks: R.k, seconds: sim.t, contacts: sim.contacts.length, ballInBoot: { ticks: ev.ball.length, share: ev.ball.length / R.k, spans: SB.map((s) => ({ t0: s.t0, t1: s.t1, worstMm: Math.round(s.worst * 1000), what: s.what, near: near(s.t0) })) },
  legs: { ticks: ev.legs.length, share: ev.legs.length / R.k, spans: SL.map((s) => ({ t0: s.t0, t1: s.t1, worstMm: Math.round(s.worst * 1000), what: s.what, near: near(s.t0) })) }, ankleBelowTurf: ev.low.length,
  pose: { mean: tms.reduce((a, b) => a + b, 0) / tms.length, p99: tms[Math.floor(0.99 * tms.length)], max: tms[tms.length - 1] } };
if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.log(`${R.k} ticks (${sim.t.toFixed(1)} s) · ${sim.contacts.length} contacts · pose mean ${res.pose.mean.toFixed(3)} ms p99 ${res.pose.p99.toFixed(3)} max ${res.pose.max.toFixed(2)}`);
console.log(`ball inside a boot > 20 mm: ${ev.ball.length} ticks (${(100 * res.ballInBoot.share).toFixed(1)} %) in ${SB.length} spans · legs intersect > 20 mm: ${ev.legs.length} ticks (${(100 * res.legs.share).toFixed(1)} %) in ${SL.length} spans · ankle < 60 mm: ${ev.low.length}`);
for (const s of res.ballInBoot.spans.slice(0, 40)) console.log(`  BALL ${s.t0.toFixed(2)}–${s.t1.toFixed(2)} ${s.worstMm} mm ${s.what} · near ${s.near}`);
for (const s of res.legs.spans.slice(0, 30)) console.log(`  LEGS ${s.t0.toFixed(2)}–${s.t1.toFixed(2)} ${s.worstMm} mm ${s.what} · near ${s.near}`);

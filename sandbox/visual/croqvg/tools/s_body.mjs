// speed99/tools/s_body.mjs — THE BODY THAT EXPLAINS THE PACE (owner §8, §16, §17), BALL OFF: every tick posed (u_body.js) on the pace scenarios —
// standing → sprint (6 s), jog → sprint, sprint → 45 / 90 / 120 / 180° + re-acceleration, a curved sprint — per pace profile:
//   INTEGRITY   foot jumps (toe > 12 cm in a tick) · planted-foot slides (the ball of the foot > 4 mm in a tick, same stance, pivots excluded —
//               the report card's rule) · leg intersections (capsule clearance < −2 cm) · root ↔ render (the drawn pelvis's ground point off the
//               authoritative centre of mass) · the pose's vertical compression (a planted leg that cannot reach lowers the body: > 3 cm, max)
//               · pelvis pops (a 60 fps frame's pelvis > 1.5 cm off its neighbours' mean) · unsupported flight > 0.15 s
//   THE STEPS   every executed footfall: its period from the previous one, its length (from the other foot's footfall), its ground contact,
//               its landing lead ahead of the centre of mass — and the largest step-to-step change of each (cadence / stride jumps); at
//               top speed the cadence, step length, contact, flight; the first three steps from standing; the posed trunk lean
//   SWEEP       (--sweep) cuts of 90 / 120 / 150 / 180° at top speed, each entered at 6 gait phases (5.00 – 5.20 s of sprint first): totals
//   node s_body.mjs [--pace CURRENT,A,B,C] [--json f] [--sweep]
import fs from "node:fs";
import { ENV, makeSim, DT } from "./u_env.mjs";
import { PlayBody } from "../u_body.js";
import { presetLayers } from "../c_sim.js";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, DEG = Math.PI / 180, hyp = Math.hypot;
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
const R = (h, mode) => ({ h, mode, keys: 64 });
export const SCEN = {
  "standing → sprint": { pre: [[null, "RUN", 0.5]], f: () => R(0, "SPRINT"), dur: 6 },
  "jog → sprint": { pre: [[0, "JOG", 2.5]], f: () => R(0, "SPRINT"), dur: 5 },
  "sprint → 45° + go": { pre: [[null, "RUN", 0.5], [0, "SPRINT", 5]], f: () => R(45 * DEG, "SPRINT"), dur: 3 },
  "sprint → 60° + go": { pre: [[null, "RUN", 0.5], [0, "SPRINT", 5]], f: () => R(60 * DEG, "SPRINT"), dur: 3 },
  "sprint → 90° + go": { pre: [[null, "RUN", 0.5], [0, "SPRINT", 5]], f: () => R(90 * DEG, "SPRINT"), dur: 3 },
  "sprint → 120° + go": { pre: [[null, "RUN", 0.5], [0, "SPRINT", 5]], f: () => R(120 * DEG, "SPRINT"), dur: 3 },
  "sprint → 180° + go": { pre: [[null, "RUN", 0.5], [0, "SPRINT", 5]], f: () => R(Math.PI, "SPRINT"), dur: 4 },
  "curved sprint 20°/s": { pre: [[0, "JOG", 2.5]], f: (t) => R(20 * DEG * t, "SPRINT"), dur: 5 },
  "steady RUN": { pre: [[null, "RUN", 0.5], [0, "RUN", 3]], f: () => R(0, "RUN"), dur: 4 },
};
export function bodyRun(pace, name) { return bodyScen(pace, SCEN[name]); }
export function bodyScen(pace, sc) { const sim = makeSim("TL", { layers: presetLayers("FULL"), ballOn: false, attrs: { bc: 99, dri: 99, agi: 99 }, foot: "R", style: "NEUTRAL", seed: 1, start: { P: [20, 34], h: 0 }, pace });
  for (const [h, mode, d] of sc.pre) for (let k = 0; k < Math.round(d / DT); k++) sim.step(R(h, mode));
  const t0 = sim.t; for (let k = 0; k < Math.round(sc.dur / DT); k++) sim.step(sc.f(k * DT));
  const body = new PlayBody(env, sim), o = { jumps: 0, slide: 0, slides: 0, ix: 0, rootMax: 0, pops: 0, pulled: 0, reachMax: 0, flight: 0, frames: 0, leanMax: 0, leanTop: 0 }, st = new Map(); let prev = null, pz = [], air = 0;
  for (let k = Math.round(t0 / DT); k <= sim.k; k++) { const t = k * DT, s = sim.stateAt(t), p = body.pose(t); o.frames++;
    o.rootMax = Math.max(o.rootMax, hyp(p.P[0] - s.P[0], p.P[1] - s.P[1])); if (Math.min(...Object.values(p.clr)) < -0.02) o.ix++;
    const z = p.J.pelvis.j[2]; pz.push(z); if (p.reach > 0.03) o.pulled++; o.reachMax = Math.max(o.reachMax, p.reach || 0);
    if (pz.length >= 9 && (pz.length - 1) % 4 === 0) { const a = pz[pz.length - 9], m = pz[pz.length - 5], c = pz[pz.length - 1]; if (Math.abs(m - (a + c) / 2) > 0.015) o.pops++; }   // (60 fps: a drawn frame's pelvis > 1.5 cm off its neighbours' mean)
    const ln = body.ch && body.ch.lean ? body.ch.lean.at(t) : null; if (ln != null) { o.leanMax = Math.max(o.leanMax, ln); if (s.s > 0.97 * (sim.P.speed.SPRINT)) o.leanTop = ln; }
    if (!p.feet.R.planted && !p.feet.L.planted) { air += DT; if (air > 0.15 && air - DT <= 0.15) o.flight++; } else air = 0;
    for (const F of ["R", "L"]) { const f = p.feet[F]; if (prev) { const d = hyp(...p.J["toe_" + F].j.map((x, i) => x - prev.J["toe_" + F].j[i])); if (d > 0.12) o.jumps++;
        if (f.planted && prev.feet[F].planted && f.stance && prev.feet[F].stance && f.stance.id === prev.feet[F].stance.id && !f.stance.pivot && f.ballPt && prev.feet[F].ballPt) { const d = hyp(f.ballPt[0] - prev.feet[F].ballPt[0], f.ballPt[1] - prev.feet[F].ballPt[1]); o.slide += d; if (d > 0.004) o.slides++; } }
      if (f.planted && f.stance && f.stance.t0 > t0 - 1e-9) { const x = st.get(f.stance.id); if (!x) st.set(f.stance.id, { F, t0: f.stance.t0, t1: t, pos: f.stance.pos.slice(), com: sim.stateAt(f.stance.t0).P.slice(), v: sim.stateAt(f.stance.t0).s, h: sim.stateAt(f.stance.t0).h }); else x.t1 = t; } }
    prev = { J: p.J, feet: { R: { planted: p.feet.R.planted, stance: p.feet.R.stance, ballPt: p.feet.R.ballPt && p.feet.R.ballPt.slice() }, L: { planted: p.feet.L.planted, stance: p.feet.L.stance, ballPt: p.feet.L.ballPt && p.feet.L.ballPt.slice() } } }; }
  // (the executed steps in order)
  const S = [...st.values()].sort((a, b) => a.t0 - b.t0), steps = [];
  for (let i = 0; i < S.length; i++) { const a = S[i], b = i ? S[i - 1] : null, lead = (a.pos[0] - a.com[0]) * Math.cos(a.h) + (a.pos[1] - a.com[1]) * Math.sin(a.h);
    steps.push({ t: +(a.t0 - t0).toFixed(3), F: a.F, v: +a.v.toFixed(2), period: b ? +(a.t0 - b.t0).toFixed(3) : null, length: b && b.F !== a.F ? +hyp(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1]).toFixed(2) : null, contact: +(a.t1 - a.t0 + DT).toFixed(3), lead: +lead.toFixed(2) }); }
  let jP = 0, jL = 0; for (let i = 2; i < steps.length; i++) { const a = steps[i], b = steps[i - 1]; if (a.period && b.period) jP = Math.max(jP, Math.abs(a.period - b.period) / b.period); if (a.length && b.length) jL = Math.max(jL, Math.abs(a.length - b.length) / b.length); }
  const top = steps.filter((x) => x.v > 0.97 * sim.P.speed.SPRINT && x.period), mean = (A, k) => (A.length ? A.reduce((s, x) => s + x[k], 0) / A.length : null);
  Object.assign(o, { slide: +o.slide.toFixed(3), rootMax: +o.rootMax.toFixed(3), reachMax: +o.reachMax.toFixed(3), leanMax: +o.leanMax.toFixed(1), leanTop: +o.leanTop.toFixed(1), nSteps: steps.length, periodJump: +jP.toFixed(2), lengthJump: +jL.toFixed(2),
    top: top.length ? { cadence: +(1 / mean(top, "period")).toFixed(2), length: +mean(top.filter((x) => x.length), "length").toFixed(2), contact: +mean(top, "contact").toFixed(3), lead: +mean(top, "lead").toFixed(2) } : null, first: steps.slice(0, 4), steps });
  return o; }
if ((process.argv[1] || "").endsWith("s_body.mjs") && AR.includes("--sweep")) { for (const p of opt("pace", "CURRENT").split(",")) { const row = [];
    for (const ang of [60, 90, 120, 150, 180]) { const T = { jumps: 0, ix: 0, flight: 0, pops: 0, n: 0, bad: 0 };
      for (let i = 0; i < 6; i++) { const o = bodyScen(p, { pre: [[null, "RUN", 0.5], [0, "SPRINT", 5 + i * 0.04]], f: () => R(ang * DEG, "SPRINT"), dur: 3 }); T.jumps += o.jumps; T.ix += o.ix; T.flight += o.flight; T.pops += o.pops; T.n++; if (o.jumps || o.ix || o.flight) T.bad++; }
      row.push(`${ang}°: ${T.bad}/${T.n} with a warning (jumps ${T.jumps}, intersection frames ${T.ix}, flights > 0.15 s ${T.flight}; pelvis pops ${T.pops})`); }
    console.log(`■ ${p.padEnd(7)} ` + row.join(" · ")); } process.exit(0); }
if ((process.argv[1] || "").endsWith("s_body.mjs")) { const paces = opt("pace", "CURRENT").split(","), all = {};
  for (const p of paces) { all[p] = {}; console.log(`■ ${p}`);
    for (const name of Object.keys(SCEN)) { const o = bodyRun(p, name); all[p][name] = o;
      console.log(`  ${name.padEnd(21)} jumps ${o.jumps} · slides ${o.slides} (${(o.slide * 100).toFixed(1)} cm) · intersections ${o.ix} · root↔render ${(o.rootMax * 100).toFixed(1)} cm · pelvis pops (60 fps) ${o.pops} · compressed > 3 cm ${o.pulled} frames (max ${(o.reachMax * 100).toFixed(1)} cm) · flights > 0.15 s ${o.flight} · steps ${o.nSteps} (largest step-to-step change: period ${(o.periodJump * 100).toFixed(0)} %, length ${(o.lengthJump * 100).toFixed(0)} %) · lean max ${o.leanMax}°` + (o.top ? ` · at top speed: ${o.top.cadence} steps/s, ${o.top.length} m, contact ${o.top.contact} s, lead ${o.top.lead} m, lean ${o.leanTop}°` : ""));
      if (name === "standing → sprint") console.log(`     first steps: ` + o.first.map((x) => `${x.t}s ${x.F} v${x.v} T${x.period ?? "—"} L${x.length ?? "—"} c${x.contact} lead${x.lead}`).join(" | ")); } }
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(all)); }

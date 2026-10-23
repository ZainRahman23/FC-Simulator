// speed99/tools/s_legs.mjs — THE HIGH-SPEED LEG TORTURE (owner, 4-h mission, Phase 1): S99 38 km/h + Acc99 D38 + A99-C, BALL OFF, every tick
// posed, each scenario entered at 8 phases across a stride. Failures, with their context (the cause, not the symptom):
//   JUMP        a toe or ankle moving > 12 cm in one 1/240 s tick (at 38 km/h a swinging foot peaks ≈ 9 cm / tick)
//   KNEE POP    a knee angle changing > 20° in one tick (≈ 4800°/s: a discontinuity — a leg extending to straight late in a sprint swing
//               reaches 12 – 18° per tick by geometry alone, the knee angle being steep in the hip–ankle distance near full extension)
//   SLIDE       a planted foot's ball moving > 4 mm in one tick (same stance, not a pivot)
//   CROSS       leg capsules interpenetrating (clearance < −2 cm)
//   FLOAT       no foot down for > 0.18 s, or for > 0.08 s below 3 m/s
//   REVISED     a stance whose touchdown time or place changed after it was committed (its touchdown already in the past, or within 0.05 s)
//   SWAP        a foot planted on one stance and, the next tick, on another (a support swap with no swing between)
// Per failure: the foot, planted / swinging, the stance id / kind / source, its planned t0 / t1 / pos at first sight vs now, the speed, the
// travel's turn rate, the request's angle from travel, the time since the input change
//   node s_legs.mjs [--pace D38] [--phases 8] [--only <substr>] [--detail N] [--json f]
import fs from "node:fs";
import { ENV, makeSim, DT } from "./u_env.mjs";
import { PlayBody } from "../u_body.js";
import { presetLayers } from "../c_sim.js";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, DEG = Math.PI / 180, hyp = Math.hypot;
const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
const R = (h, mode) => ({ h, mode, keys: 64 });
const TOP = [[null, "RUN", 0.5], [0, "SPRINT", 4.5]];   // (from rest to 38 km/h: D38 is at 99 % by 2.2 s)
const alt = (A, per) => (t) => (Math.floor(t / per) % 2 ? -A : A) * DEG;
export const SCEN = {
  "straight 38 km/h": { pre: TOP, f: () => R(0, "SPRINT"), dur: 3 },
  "gentle curve 10°/s": { pre: TOP, f: (t) => R(10 * DEG * t, "SPRINT"), dur: 4 },
  "sustained curve 45°/s": { pre: TOP, f: (t) => R(45 * DEG * t, "SPRINT"), dur: 4 },
  ...Object.fromEntries([30, 45, 60, 90, 120, 150, 180].map((a) => [`cut ${a}° + D38`, { pre: TOP, f: () => R(a * DEG, "SPRINT"), dur: 3.5 }])),
  "repeated ±30° (0.45 s)": { pre: TOP, f: (t) => R(alt(30, 0.45)(t), "SPRINT"), dur: 4 },
  "repeated ±60° (0.35 s)": { pre: TOP, f: (t) => R(alt(60, 0.35)(t), "SPRINT"), dur: 4 },
  "90° L/R alternation (1.2 s)": { pre: TOP, f: (t) => R(alt(45, 1.2)(t), "SPRINT"), dur: 5 },
  "fast circle 270°/s": { pre: TOP, f: (t) => R(270 * DEG * t, "SPRINT"), dur: 3 },
  "sprint → stop": { pre: TOP, f: () => R(null, "SPRINT"), dur: 2 },
  "stop → sprint": { pre: [[null, "RUN", 0.5], [0, "SPRINT", 4.5], [null, "SPRINT", 1.6]], f: () => R(0, "SPRINT"), dur: 3 },
  "stop → sprint 90°": { pre: [[null, "RUN", 0.5], [0, "SPRINT", 4.5], [null, "SPRINT", 1.6]], f: () => R(90 * DEG, "SPRINT"), dur: 3 },
};
function knee(J, X) { const a = J["thigh_" + X] ? J["thigh_" + X].j : null, b = J["shin_" + X] ? J["shin_" + X].j : null, c = J["foot_" + X] ? J["foot_" + X].j : null; if (!a || !b || !c) return null;
  const u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]], d = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (hyp(...u) * hyp(...v) || 1); return Math.acos(Math.max(-1, Math.min(1, d))); }
export function legRun(pace, name, phase, detail = 0) { const sc = SCEN[name], sim = makeSim("TL", { layers: presetLayers("FULL"), ballOn: false, attrs: { bc: 99, dri: 99, agi: 99 }, foot: "R", style: "NEUTRAL", seed: 1, start: { P: [20, 34], h: 0 }, pace });
  const seen = new Map(); const trackPlan = () => { for (const X of ["R", "L"]) for (const s of sim.plan.stances[X]) { if (!s.id) continue; const f = seen.get(s.id); if (!f) seen.set(s.id, { F: X, t0: s.t0, t1: s.t1, pos: s.pos ? s.pos.slice() : null, kind: s.kind, src: s.src, firstAt: sim.t, revised: null });
      else if (!f.revised && f.t0 <= sim.t + 0.05 && s.pos && f.pos && (Math.abs(s.t0 - f.t0) > 1e-6 || hyp(s.pos[0] - f.pos[0], s.pos[1] - f.pos[1]) > 0.02)) f.revised = { at: sim.t, dt0: s.t0 - f.t0, dpos: hyp(s.pos[0] - f.pos[0], s.pos[1] - f.pos[1]) }; } };
  for (const [h, mode, d] of sc.pre) for (let k = 0; k < Math.round(d / DT); k++) { sim.step(R(h, mode)); }
  for (let k = 0; k < Math.round(phase / DT); k++) sim.step(sc.pre[sc.pre.length - 1][0] === null ? R(null, sc.pre[sc.pre.length - 1][1]) : R(sc.pre[sc.pre.length - 1][0], sc.pre[sc.pre.length - 1][1]));
  const t0 = sim.t; for (let k = 0; k < Math.round(sc.dur / DT); k++) { sim.step(sc.f(k * DT)); trackPlan(); }
  const body = new PlayBody(env, sim), F = [], cnt = { jump: 0, knee: 0, slide: 0, cross: 0, float: 0, revised: 0, swap: 0 }; let prev = null, air = 0, crossOn = false, floatOn = false;
  for (let k = Math.round(t0 / DT); k <= sim.k; k++) { const t = k * DT, p = body.pose(t), st = sim.stateAt(t), ctx = () => ({ t: +(t - t0).toFixed(3), v: +st.s.toFixed(2), turn: +(((st.turnRate || 0) / DEG) | 0) });
    const c = Math.min(...Object.values(p.clr)); if (c < -0.02) { if (!crossOn) { cnt.cross++; if (F.length < 400) F.push({ kind: "CROSS", ...ctx(), depth: +(c * 100).toFixed(1), part: Object.entries(p.clr).sort((a, b) => a[1] - b[1])[0][0], R: p.feet.R.planted ? "P" : "s", L: p.feet.L.planted ? "P" : "s" }); } crossOn = true; } else crossOn = false;
    const both = !p.feet.R.planted && !p.feet.L.planted; if (both) air += DT; else air = 0; const fl = air > 0.18 || (air > 0.08 && st.s < 3); if (fl && !floatOn) { cnt.float++; F.push({ kind: "FLOAT", ...ctx(), air: +air.toFixed(3) }); } floatOn = fl;
    for (const X of ["R", "L"]) { const f = p.feet[X];
      if (prev) { const q = prev.feet[X], toe = p.J["toe_" + X].j, toe0 = prev.J["toe_" + X].j, a = f.ank, a0 = q.ank, d = Math.max(hyp(toe[0] - toe0[0], toe[1] - toe0[1], toe[2] - toe0[2]), hyp(a[0] - a0[0], a[1] - a0[1], a[2] - a0[2]));
        if (d > 0.12) { cnt.jump++; const S0 = q.stance || (q.swing && q.swing.to), S1 = f.stance || (f.swing && f.swing.to), info = (S) => (S ? { id: S.id, kind: S.kind, src: S.src, t0: +(S.t0 - t0).toFixed(3), t1: S.t1 === Infinity ? "∞" : +(S.t1 - t0).toFixed(3), rev: seen.get(S.id) && seen.get(S.id).revised } : null);
          F.push({ kind: "JUMP", ...ctx(), foot: X, d: +(d * 100).toFixed(1), was: q.planted ? "planted" : "swing", now: f.planted ? "planted" : "swing", from: info(S0), to: info(S1) }); }
        const k1 = knee(p.J, X), k0 = knee(prev.J, X); if (k1 != null && k0 != null && Math.abs(k1 - k0) > 20 * DEG) { cnt.knee++; if (F.length < 400) F.push({ kind: "KNEE", ...ctx(), foot: X, dDeg: +((k1 - k0) / DEG).toFixed(1), planted: f.planted }); }
        if (f.planted && q.planted && f.stance && q.stance && f.stance.id === q.stance.id && !f.stance.pivot && f.ballPt && q.ballPt) { const sd = hyp(f.ballPt[0] - q.ballPt[0], f.ballPt[1] - q.ballPt[1]); if (sd > 0.004) { cnt.slide++; if (F.length < 400) F.push({ kind: "SLIDE", ...ctx(), foot: X, mm: +(sd * 1000).toFixed(1) }); } }
        if (f.planted && q.planted && f.stance && q.stance && f.stance.id !== q.stance.id) { cnt.swap++; F.push({ kind: "SWAP", ...ctx(), foot: X, from: q.stance.id, to: f.stance.id }); } } }
    prev = { J: p.J, feet: { R: { ...p.feet.R, ank: p.feet.R.ank.slice(), ballPt: p.feet.R.ballPt && p.feet.R.ballPt.slice() }, L: { ...p.feet.L, ank: p.feet.L.ank.slice(), ballPt: p.feet.L.ballPt && p.feet.L.ballPt.slice() } } }; }
  for (const [id, s] of seen) if (s.revised && s.firstAt < s.t0) { cnt.revised++; if (detail) F.push({ kind: "REVISED", id, foot: s.F, t: +(s.revised.at - t0).toFixed(3), dt0: +s.revised.dt0.toFixed(3), dpos: +s.revised.dpos.toFixed(3) }); }
  return { cnt, F }; }
if ((process.argv[1] || "").endsWith("s_legs.mjs")) { const pace = opt("pace", "D38"), N = +opt("phases", 8), only = opt("only", null), detail = +opt("detail", 0), all = {};
  const tot = { jump: 0, knee: 0, slide: 0, cross: 0, float: 0, revised: 0, swap: 0 }; let runs = 0, bad = 0;
  for (const name of Object.keys(SCEN)) { if (only && !name.includes(only)) continue; const S = { jump: 0, knee: 0, slide: 0, cross: 0, float: 0, revised: 0, swap: 0 }, fails = []; let nb = 0;
    for (let i = 0; i < N; i++) { const o = legRun(pace, name, i * 0.21 / N, detail); runs++; for (const k of Object.keys(S)) { S[k] += o.cnt[k]; tot[k] += o.cnt[k]; } const visible = o.cnt.jump + o.cnt.knee + o.cnt.cross + o.cnt.float + o.cnt.swap; if (visible) { nb++; bad++; } for (const f of o.F) fails.push({ phase: i, ...f }); }
    all[name] = { S, fails }; console.log(`${name.padEnd(28)} ${nb}/${N} with a visible failure · jumps ${S.jump} · knee pops ${S.knee} · crosses ${S.cross} · floats ${S.float} · swaps ${S.swap} · slides ${S.slide} · committed landings revised ${S.revised}`);
    if (detail) for (const f of fails.filter((x) => x.kind !== "SLIDE").slice(0, detail)) console.log("    " + JSON.stringify(f)); }
  console.log(`■ ${pace}: ${runs} runs · ${bad} with a visible failure · jumps ${tot.jump} · knee pops ${tot.knee} · crosses ${tot.cross} · floats ${tot.float} · swaps ${tot.swap} · slides ${tot.slide} · committed landings revised ${tot.revised}`);
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(all)); }

// vocab1/tools/v_extreme.mjs — PHASE 1: THE EXTREME-REDIRECTION LEG / SUPPORT TORTURE on the SANDBOX'S OWN PLAYER (S99 · D38 · A99-C · D99 ·
// BC99 · CARRY-B · CONTROLLED · EXPANDED; --ball 0 for the ball-off body), every tick posed:
//   SINGLE   120 / 135 / 150 / 165 / 180° from JOG, RUN, SPRINT (top speed) — each to the LEFT and the RIGHT (mirror), at 4 gait phases
//   REPEATED reversals (180° every 1.2 s ×3) · STOP → REVERSE (stick released 0.6 s, then 180°) · CURVE → REVERSE (a 60°/s curve, then 180°)
//            · SPRINT → REVERSE → ACCELERATE (180°, then 3 s of sprint) · RUN → 150° → 150° back
// Failures, classified by what a viewer would see:
//   NORMAL-SPEED VISIBLE   a toe / ankle jump > 20 cm in a tick · legs interpenetrating deeper than 5 cm · no foot down > 0.25 s (> 0.14 s
//                          below 3 m/s) · a knee angle step > 30° in a tick · a planted foot swapped to another stance with no swing
//   SLOW-MOTION VISIBLE    a jump 12 – 20 cm · interpenetration 2 – 5 cm · no foot down 0.18 – 0.25 s (0.08 – 0.14 s below 3 m/s) · knee 20 – 30°
//   DIAGNOSTIC ONLY        a planted foot's ball sliding > 4 mm in a tick · a committed landing revised
// BALL ON also: possession (CONTROLLED exits, missed contacts, the ball beyond 3 m)
//   node v_extreme.mjs [--ball 1|0] [--only <substring>] [--phases 4] [--detail 3] [--json f]
import fs from "node:fs";
import { ENV, makeSim, DT } from "./u_env.mjs";
import { PlayBody } from "../u_body.js";
import { presetLayers } from "../c_sim.js";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, DEG = Math.PI / 180, hyp = Math.hypot;
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) };
const BALL = opt("ball", "1") !== "0";
const R = (h, mode) => ({ h, mode, keys: 64 });
// pre-phase run-ups: [heading | null, mode, seconds]
const UP = { JOG: [[null, "RUN", 0.5], [0, "JOG", 3.0]], RUN: [[null, "RUN", 0.5], [0, "RUN", 3.0]], SPRINT: [[null, "RUN", 0.5], [0, "SPRINT", 4.5]] };
export const SCEN = {};
for (const a of [120, 135, 150, 165, 180]) for (const m of ["JOG", "RUN", "SPRINT"]) for (const side of [1, -1]) SCEN[`${m} → ${a}° ${side > 0 ? "R" : "L"}`] = { pre: UP[m], f: () => R(side * a * DEG, m), dur: 2.6, mode: m };
SCEN["REPEATED REVERSALS (SPRINT, 180° every 1.2 s)"] = { pre: UP.SPRINT, f: (t) => R(Math.floor(t / 1.2) % 2 ? 0 : Math.PI, "SPRINT"), dur: 3.6, mode: "SPRINT" };
SCEN["STOP → REVERSE (released 0.6 s, then 180°)"] = { pre: UP.RUN, f: (t) => R(t < 0.6 ? null : Math.PI, "SPRINT"), dur: 2.8, mode: "RUN" };
SCEN["CURVE → REVERSE (60°/s for 1 s, then 180°)"] = { pre: UP.RUN, f: (t) => R(t < 1 ? 60 * DEG * t : 60 * DEG + Math.PI, "RUN"), dur: 3.0, mode: "RUN" };
SCEN["SPRINT → REVERSE → ACCELERATE (3 s)"] = { pre: UP.SPRINT, f: () => R(Math.PI, "SPRINT"), dur: 3.5, mode: "SPRINT" };
SCEN["RUN → 150° → 150° back"] = { pre: UP.RUN, f: (t) => R(t < 1.1 ? 150 * DEG : 0, "RUN"), dur: 2.8, mode: "RUN" };
function knee(J, X) { const a = J["thigh_" + X] ? J["thigh_" + X].j : null, b = J["shin_" + X] ? J["shin_" + X].j : null, c = J["foot_" + X] ? J["foot_" + X].j : null; if (!a || !b || !c) return null;
  const u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]], d = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (hyp(...u) * hyp(...v) || 1); return Math.acos(Math.max(-1, Math.min(1, d))); }
export function mkSandbox(extra = {}) { return makeSim("TL", Object.assign({ layers: presetLayers("FULL"), attrs: { bc: 99, dri: 99, agi: 99 }, foot: "R", style: "NEUTRAL", seed: 1, start: { P: [30, 34], h: 0 }, pace: "D38", vocab: "EXPANDED", control: "CONTROLLED", ballOn: BALL, carry: BALL ? "B" : undefined }, extra)); }
// the posed body from tick k0 to the sim's present: every failure, classified
export function measure(sim, k0, detail = 0) {
  const body = new PlayBody(env, sim), F = [], N = { normal: 0, slow: 0, diag: 0 }, kinds = {}; let prev = null, air = 0, crossD = 0, crossOn = false, floatLvl = 0;
  const add = (lvl, kind, o) => { N[lvl]++; kinds[kind + "·" + lvl] = (kinds[kind + "·" + lvl] || 0) + 1; if (F.length < 200 && (lvl !== "diag" || detail > 5)) F.push(Object.assign({ lvl, kind }, o)); };
  for (let k = k0; k <= sim.k; k++) { const t = k * DT, p = body.pose(t), st = sim.stateAt(t), ctx = { t: +(t - k0 * DT).toFixed(3), v: +st.s.toFixed(2), act: sim.planAt(t).action.label };
    const c = Math.min(...Object.values(p.clr)); if (c < -0.02) { crossD = Math.min(crossD, c); crossOn = true; } else if (crossOn) { add(crossD < -0.05 ? "normal" : "slow", "CROSS", Object.assign({ depth: +(crossD * 100).toFixed(1) }, ctx)); crossOn = false; crossD = 0; }
    const both = !p.feet.R.planted && !p.feet.L.planted; if (both) air += DT; else { if (floatLvl) add(floatLvl === 2 ? "normal" : "slow", "FLOAT", Object.assign({ air: +air.toFixed(3) }, ctx)); air = 0; floatLvl = 0; }
    if (both) { const slow = st.s < 3, l = air > (slow ? 0.14 : 0.25) ? 2 : air > (slow ? 0.08 : 0.18) ? 1 : 0; if (l > floatLvl) floatLvl = l; }
    for (const X of ["R", "L"]) { const f = p.feet[X]; if (!prev) continue; const q = prev.feet[X], toe = p.J["toe_" + X].j, toe0 = prev.J["toe_" + X].j, a = f.ank, a0 = q.ank;
      const d = Math.max(hyp(toe[0] - toe0[0], toe[1] - toe0[1], toe[2] - toe0[2]), hyp(a[0] - a0[0], a[1] - a0[1], a[2] - a0[2]));
      if (d > 0.12) add(d > 0.20 ? "normal" : "slow", "JUMP", Object.assign({ foot: X, cm: +(d * 100).toFixed(1), was: q.planted ? "planted" : "swing", now: f.planted ? "planted" : "swing" }, ctx));
      const k1 = knee(p.J, X), kq = knee(prev.J, X); if (k1 != null && kq != null && Math.abs(k1 - kq) > 20 * DEG) add(Math.abs(k1 - kq) > 30 * DEG ? "normal" : "slow", "KNEE", Object.assign({ foot: X, deg: +((k1 - kq) / DEG).toFixed(1) }, ctx));
      if (f.planted && q.planted && f.stance && q.stance && f.stance.id === q.stance.id && !f.stance.pivot && f.ballPt && q.ballPt) { const sd = hyp(f.ballPt[0] - q.ballPt[0], f.ballPt[1] - q.ballPt[1]); if (sd > 0.004) add("diag", "SLIDE", Object.assign({ foot: X, mm: +(sd * 1000).toFixed(1) }, ctx)); }
      if (f.planted && q.planted && f.stance && q.stance && f.stance.id !== q.stance.id) { const dd = hyp(f.ank[0] - q.ank[0], f.ank[1] - q.ank[1]); add(dd > 0.03 ? "normal" : "diag", "SWAP", Object.assign({ foot: X, cm: +(dd * 100).toFixed(1), from: q.stance.kind, to: f.stance.kind }, ctx)); } }
    prev = { J: p.J, feet: { R: { ...p.feet.R, ank: p.feet.R.ank.slice(), ballPt: p.feet.R.ballPt && p.feet.R.ballPt.slice() }, L: { ...p.feet.L, ank: p.feet.L.ank.slice(), ballPt: p.feet.L.ballPt && p.feet.L.ballPt.slice() } } }; }
  return { N, kinds, F };
}
export function runScenario(name, phase, extra = {}, detail = 0) { const sc = SCEN[name], sim = mkSandbox(extra);
  for (const [h, mode, d] of sc.pre) for (let k = 0; k < Math.round(d / DT); k++) sim.step(R(h, mode));
  const last = sc.pre[sc.pre.length - 1]; for (let k = 0; k < Math.round(phase / DT); k++) sim.step(R(last[0], last[1]));
  const k0 = sim.k, c0 = sim.contacts.length, ex0 = sim.poss && sim.poss.log ? sim.poss.log.length : 0; let far = 0;
  for (let k = 0; k < Math.round(sc.dur / DT); k++) { sim.step(sc.f(k * DT)); if (BALL) { const st = sim.stateAt(sim.t), b = sim.ball.p; if (hyp(b[0] - st.P[0], b[1] - st.P[1]) > 3) far++; } }
  const m = measure(sim, k0, detail), cs = sim.contacts.slice(c0), exits = sim.poss && sim.poss.log ? sim.poss.log.slice(ex0).filter((e) => e.from === "CONTROLLED" && e.to === "FREE") : [];
  const acts = sim.log.actions.filter((a) => a.t >= k0 * DT).map((a) => a.label);
  return Object.assign(m, { missed: cs.filter((c) => c.missed).length, contacts: cs.filter((c) => !c.missed).length, exits: exits.map((e) => e.why), far: far * DT, acts: [...new Set(acts)] }); }
if ((process.argv[1] || "").endsWith("v_extreme.mjs")) { const N = +opt("phases", 4), only = opt("only", null), detail = +opt("detail", 0), all = {}, tot = { normal: 0, slow: 0, diag: 0, runs: 0, badNormal: 0, missed: 0, exits: 0 }, kinds = {};
  for (const name of Object.keys(SCEN)) { if (only && !name.includes(only)) continue; const S = { normal: 0, slow: 0, diag: 0, badNormal: 0, missed: 0, exits: 0, acts: new Set() }, fails = [];
    for (let i = 0; i < N; i++) { const o = runScenario(name, i * 0.30 / N, {}, detail); tot.runs++; for (const k of ["normal", "slow", "diag"]) { S[k] += o.N[k]; tot[k] += o.N[k]; } if (o.N.normal) { S.badNormal++; tot.badNormal++; } S.missed += o.missed; S.exits += o.exits.length; tot.missed += o.missed; tot.exits += o.exits.length; for (const a of o.acts) S.acts.add(a); for (const [k, v] of Object.entries(o.kinds)) kinds[k] = (kinds[k] || 0) + v; for (const f of o.F) fails.push(Object.assign({ phase: i }, f)); }
    all[name] = { S: Object.assign({}, S, { acts: [...S.acts] }), fails: fails.slice(0, 60) };
    console.log(`${name.padEnd(46)} ${S.badNormal}/${N} normal-visible · normal ${S.normal} · slow ${S.slow} · diag ${S.diag}${BALL ? ` · missed ${S.missed} · exits ${S.exits}` : ""} · ${[...S.acts].slice(0, 4).join(", ")}`);
    if (detail) for (const f of fails.filter((x) => x.lvl !== "diag").slice(0, detail)) console.log("      " + JSON.stringify(f)); }
  console.log(`■ ${BALL ? "BALL ON (CONTROLLED · CARRY-B · EXPANDED)" : "BALL OFF"}: ${tot.runs} runs · ${tot.badNormal} with a normal-speed-visible failure · normal ${tot.normal} · slow-motion ${tot.slow} · diagnostic ${tot.diag}${BALL ? ` · missed contacts ${tot.missed} · CONTROLLED exits ${tot.exits}` : ""}`);
  console.log("   by kind: " + Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · "));
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify({ tot, kinds, all }, null, 1)); }

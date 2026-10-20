// tc_playtest12r/tools/pt_ab.mjs — PLAYTEST-1.2 vs PLAYTEST-1.2R on the SAME analog input (owner's key tests): every test is one deterministic
// stick-angle function, fed through the same request mapping (pt_input.js) to both engines, simulated and posed every tick.
// Measured per input change (a snap is measured at 8 stride phases × both directions — the stride phase decides what is possible):
//   VISIBLE RESPONSE: the first tick at which the posed body differs from a COUNTERFACTUAL run (the same simulation with the stick left where it
//     was) — the torso (shoulder line) turned ≥ 5° toward the new intent, or the centre of mass ≥ 5 cm off its old path; also the feet (an ankle
//     ≥ 6 cm off: plant preparation)
//   DECISIVE CONTACT: the first contact after the change that sends the ball within 30° of the new intent
//   NEW BODY HEADING: the centre of mass travelling within 15° of the intent (≥ 1 m/s)
//   NEW MOVEMENT LINE: body and ball both on the line (heading within 15°, ball moving within 25°, separation < 1.6 m) — PLAYTEST-1's measure
//   CONTROL: LOST (the torture suite's §13 definition), the ball's separation, contacts, techniques
//   BODY: leg crossings (posed capsules > 20 mm), foot jumps (> 0.12 m in a tick), planted-foot slides (> 4 mm in a tick, the same stance), planted
//     feet < 0.10 m apart; the fastest foot (p99, m/s)
// Continuous tests (circles, rapid flicks) also give the heading tracking: the mean |intent − travel| and the lag that best aligns them.
//   node pt_ab.mjs [--only <substr>] [--json out.json] [--engines 1.2,1.2R] [--phases 8]
import { ENV } from "/Users/zainrahman/Downloads/FC Simulator worktrees/dribble-1/sandbox/visual/tc_baseline_88573ef0/tools/pt_env.mjs";
import * as A12 from "/Users/zainrahman/Downloads/FC Simulator worktrees/dribble-1/sandbox/visual/tc_baseline_88573ef0/pt_sim.js";
import * as B12 from "/Users/zainrahman/Downloads/FC Simulator worktrees/dribble-1/sandbox/visual/tc_baseline_88573ef0/pt_body.js";
import * as A12R from "/Users/zainrahman/Downloads/FC Simulator worktrees/dribble-1/sandbox/visual/tc_playtest1/pt_sim.js";
import * as B12R from "/Users/zainrahman/Downloads/FC Simulator worktrees/dribble-1/sandbox/visual/tc_playtest1/pt_body.js";
import { stickVector, stickMode, headingFrom } from "/Users/zainrahman/Downloads/FC Simulator worktrees/dribble-1/sandbox/visual/tc_baseline_88573ef0/pt_input.js";
import fs from "node:fs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; };
const DT = 1 / 240, DEG = Math.PI / 180, hyp = Math.hypot, abs = Math.abs, min = Math.min, max = Math.max;
const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
const colliders = JSON.parse(fs.readFileSync("/Users/zainrahman/Downloads/FC Simulator worktrees/dribble-1/sandbox/visual/dribble1/d1_colliders.json")), env = Object.assign({}, ENV, { colliders });
export const ENGINES = { "88573ef0": { Sim: A12.PlaySim, Body: B12.PlayBody }, "1.2": { Sim: A12R.PlaySim, Body: B12R.PlayBody } };
const MODES = { WALK: { r: 0.30 }, JOG: { r: 0.56 }, RUN: { r: 0.95 }, SPRINT: { r: 0.95, sprint: true } };
const steps = (L) => (t) => { let a = 0; for (const [t0, d] of L) if (t >= t0) a = d; return a; };
// ── the owner's key tests ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const RUNUP = 3.0, NPH = +opt("phases", 8), PH = Array.from({ length: NPH }, (_, i) => i * 0.48 / NPH);
export const TESTS = [];
for (const ang of [45, 90, 120, 180]) TESTS.push({ name: `sprint → snap ${ang}°`, mode: "SPRINT", snap: ang, mk: (ph, s) => ({ f: steps([[RUNUP + ph, s * ang]]), changes: [RUNUP + ph], dur: RUNUP + ph + 2.4 }) });
for (const [mode, nm] of [["RUN", "run"], ["SPRINT", "sprint"]]) TESTS.push({ name: `${nm} → rapid left/right (±60° / 0.35 s)`, mode, mk: (ph, s) => { const L = []; for (let i = 0; i < 8; i++) L.push([RUNUP + ph + i * 0.35, (i % 2 ? -60 : 60) * s]); L.push([RUNUP + ph + 8 * 0.35, 0]); return { f: steps(L), changes: L.map((x) => x[0]), dur: RUNUP + ph + 8 * 0.35 + 2.0 }; } });
for (const [mode, nm] of [["RUN", "run"], ["SPRINT", "sprint"]]) TESTS.push({ name: `${nm} → continuous circle (1 Hz)`, mode, continuous: true, mk: (ph, s) => ({ f: (t) => (t < RUNUP + ph ? 0 : s * 360 * (t - RUNUP - ph)), changes: [RUNUP + ph], dur: RUNUP + ph + 4.0 }) });
for (const [mode, nm] of [["RUN", "run"], ["SPRINT", "sprint"]]) TESTS.push({ name: `${nm} → 0 → 90 → 0 → −90 (0.6 s)`, mode, mk: (ph, s) => { const L = [[RUNUP + ph, 90 * s], [RUNUP + ph + 0.6, 0], [RUNUP + ph + 1.2, -90 * s], [RUNUP + ph + 1.8, 0]]; return { f: steps(L), changes: L.map((x) => x[0]), dur: RUNUP + ph + 3.6 }; } });
for (const [mode, nm] of [["RUN", "run"], ["SPRINT", "sprint"]]) TESTS.push({ name: `${nm} → small corrections (20–40°)`, mode, mk: (ph, s) => { const A = [30, 0, -25, 10, 40, 15, -20, 0], L = A.map((a, i) => [RUNUP + ph + i * 0.6, a * s]); return { f: steps(L), changes: L.map((x) => x[0]), dur: RUNUP + ph + A.length * 0.6 + 1.6 }; } });
// ── one run of an engine on a stick-angle function (+ its counterfactual for the first change) ──────────────────────────────────────────────────
function shoulderYaw(J) { const r = J.upperArm_R.j, l = J.upperArm_L.j; return Math.atan2(-(r[0] - l[0]), r[1] - l[1]); }   // (the facing ⟂ the shoulder line, L → R = the right)
function req(f, t, M) { const a = f(t), v = stickVector(Math.sin(a * DEG) * M.r, Math.cos(a * DEG) * M.r); return { h: t < 0.2 ? null : headingFrom(0, v.x, v.y), mode: M.sprint ? "SPRINT" : stickMode(v.r), keys: 64 }; }
export function runEngine(E, spec, mode, o = {}) {
  const M = MODES[mode], sim = new E.Sim(env, {}), body = o.pose === false ? null : new E.Body(env, sim), n = Math.round(spec.dur / DT), out = { ticks: [], sim };
  for (let k = 0; k < n; k++) { const t = k * DT; sim.step(req(spec.f, t, M)); const T = sim.t;
    if (o.from != null && T < o.from - 1e-9) continue; if (o.to != null && T > o.to + 1e-9) continue;
    const st = sim.stateAt(T), b = sim.ball.p, bv = sim.ball.v, rec = { t: T, P: st.P, h: st.h, s: st.s, psi: st.psi, b: [b[0], b[1]], bv: [bv[0], bv[1]], plan: sim.plan, act: sim.plan.action };
    if (body) { const p = body.pose(T); rec.tor = shoulderYaw(p.J); rec.feet = { R: { ank: p.feet.R.ank.slice(), planted: p.feet.R.planted, stance: p.feet.R.stance && p.feet.R.stance.id, pivot: !!(p.feet.R.stance && p.feet.R.stance.pivot), ballPt: p.feet.R.ballPt && p.feet.R.ballPt.slice() }, L: { ank: p.feet.L.ank.slice(), planted: p.feet.L.planted, stance: p.feet.L.stance && p.feet.L.stance.id, pivot: !!(p.feet.L.stance && p.feet.L.stance.pivot), ballPt: p.feet.L.ballPt && p.feet.L.ballPt.slice() } }; rec.clr = Math.min(...Object.values(p.clr)); }
    out.ticks.push(rec); }
  return out;
}
// ── the measures ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function measure(E, spec, mode) {
  const tIn = spec.changes[0], to = spec.dur, main = runEngine(E, spec, mode, { from: tIn - 0.6, to });
  const cfSpec = { f: (t) => (t < tIn ? spec.f(t) : spec.f(tIn - 1e-6)), dur: min(spec.dur, tIn + 1.2) }, cf = runEngine(E, cfSpec, mode, { from: tIn - 0.6, to: tIn + 1.2 });
  const sim = main.sim, T = main.ticks, Tc = new Map(cf.ticks.map((x) => [Math.round(x.t / DT), x])), M = MODES[mode];
  const intentAt = (t) => req(spec.f, t - DT, M).h;   // (the request the tick at t was simulated with)
  const r = { per: [] };
  // per change: the latencies
  for (let ci = 0; ci < spec.changes.length; ci++) { const tc = spec.changes[ci], tNext = spec.changes[ci + 1] ?? to, hI = req(spec.f, tc + 1e-6, M).h; if (hI == null) continue;
    const x = { t: tc, vis: null, torso: null, com: null, feet: null, contact: null, heading: null, line: null };
    for (const k of T) { if (k.t < tc - 1e-9 || k.t > tNext + 1e-9) continue; const dt = k.t - tc;
      if (ci === 0) { const c = Tc.get(Math.round(k.t / DT)); if (c) { const sg = Math.sign(wrap(hI - c.tor)) || 1, dTor = wrap(k.tor - c.tor) * sg, dCom = hyp(k.P[0] - c.P[0], k.P[1] - c.P[1]), dF = max(hyp(k.feet.R.ank[0] - c.feet.R.ank[0], k.feet.R.ank[1] - c.feet.R.ank[1]), hyp(k.feet.L.ank[0] - c.feet.L.ank[0], k.feet.L.ank[1] - c.feet.L.ank[1]));
          if (x.torso == null && dTor >= 5 * DEG) x.torso = dt; if (x.com == null && dCom >= 0.05) x.com = dt; if (x.feet == null && dF >= 0.06) x.feet = dt; } }
      if (x.heading == null && k.s >= 1.0 && abs(wrap(k.h - hI)) < 15 * DEG) x.heading = dt;
      const bs = hyp(k.bv[0], k.bv[1]), sep = hyp(k.b[0] - k.P[0], k.b[1] - k.P[1]);
      if (x.line == null && k.s > 1.0 && abs(wrap(k.h - hI)) < 15 * DEG && bs > 0.5 && abs(wrap(Math.atan2(k.bv[1], k.bv[0]) - hI)) < 25 * DEG && sep < 1.6) x.line = dt; }
    const dc = sim.contacts.find((c) => !c.missed && c.t >= tc - 1e-9 && c.t <= tNext + 1e-9 && hyp(c.vOut[0], c.vOut[1]) > 0.3 && abs(wrap(Math.atan2(c.vOut[1], c.vOut[0]) - hI)) < 30 * DEG); if (dc) x.contact = dc.t - tc;
    if (ci === 0) { const v = [x.torso, x.com].filter((q) => q != null); x.vis = v.length ? min(...v) : null; }
    r.per.push(x); }
  // control over the run after the first change
  let noC = 0, lastMade = 0, lost = 0, lostOn = false, sepMax = 0; const made = sim.contacts.filter((c) => !c.missed);
  for (const k of T) { if (k.t < tIn) continue; const plan = k.plan, act = k.act, future = plan.contacts.some((c) => !c.done && c.t > k.t - 1e-9) || (act.chase && act.closing), sep = hyp(k.b[0] - k.P[0], k.b[1] - k.P[1]), atFeet = hyp(k.bv[0], k.bv[1]) < 0.3 && sep < 0.8, on = intentAt(k.t) != null;
    for (const c of made) if (c.t <= k.t + 1e-9 && c.t > lastMade) lastMade = c.t; if (on && !future && !atFeet) noC += DT; else noC = 0; const ln = on && !atFeet && (noC > 0.5 || k.t - lastMade > 1.8); if (ln && !lostOn) lost++; lostOn = ln; sepMax = max(sepMax, sep); }
  r.lost = lost; r.sepMax = sepMax; r.missed = sim.contacts.filter((c) => c.missed && c.t >= tIn).length; r.contacts = made.filter((c) => c.t >= tIn).length;
  r.techs = sim.log.actions.filter((a) => a.t >= tIn - 1e-9 && a.label !== "CARRY").map((a) => a.label + (a.m ? (a.m > 0 ? " R" : " L") : ""));
  r.double = 0; for (let i = 1; i < made.length; i++) if (made[i].t >= tIn && made[i].t - made[i - 1].t < 0.10 - 1e-9) r.double++;
  // the body after the first change
  let legs = 0, legOn = false, jumps = 0, slides = 0, sup = 0, prev = null; const fsp = [];
  for (const k of T) { if (k.t < tIn) { prev = k; continue; } const bad = k.clr < -0.02; if (bad && !legOn) legs++; legOn = bad;
    if (k.feet.R.planted && k.feet.L.planted && hyp(k.feet.R.ank[0] - k.feet.L.ank[0], k.feet.R.ank[1] - k.feet.L.ank[1]) < 0.10) sup++;
    if (prev) for (const X of ["R", "L"]) { const f = k.feet[X], q = prev.feet[X], d = hyp(f.ank[0] - q.ank[0], f.ank[1] - q.ank[1], f.ank[2] - q.ank[2]); fsp.push(d / DT); if (d > 0.12) jumps++;
      if (f.planted && q.planted && f.stance === q.stance && f.ballPt && q.ballPt && !f.pivot && hyp(f.ballPt[0] - q.ballPt[0], f.ballPt[1] - q.ballPt[1]) > 0.004) slides++; }
    prev = k; }
  fsp.sort((a, b) => a - b); r.legs = legs; r.jumps = jumps; r.slides = slides; r.supportTicks = sup; r.footP99 = fsp.length ? fsp[Math.floor(0.99 * (fsp.length - 1))] : 0;
  // continuous tracking: the mean |intent − travel| over the run after the change, and the lag that aligns the travel with the intent best
  if (spec.continuous) { const H = T.filter((k) => k.t >= tIn + 0.5 && k.s > 0.8).map((k) => ({ t: k.t, h: k.h, i: intentAt(k.t) })).filter((x) => x.i != null);
    r.meanErr = H.reduce((s, x) => s + abs(wrap(x.i - x.h)), 0) / max(1, H.length) / DEG; let best = null;
    for (let lag = 0; lag <= 0.8; lag += 0.02) { let e = 0, n = 0; for (const x of H) { const ih = req(spec.f, x.t - lag - DT, M).h; if (ih == null) continue; e += abs(wrap(ih - x.h)); n++; } e /= max(1, n); if (!best || e < best.e) best = { lag, e }; }
    r.lag = best ? best.lag : null; }
  return r;
}
// ── the suite ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const q = (A, p) => { const s = A.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))] : null; }, f2 = (x) => (x == null ? "  —  " : x.toFixed(2).padStart(5));
export function suite(engines, only) {
  const res = {};
  for (const T of TESTS) { if (only && !T.name.includes(only)) continue; res[T.name] = {};
    for (const en of engines) { const runs = []; for (const ph of PH) for (const s of [1, -1]) runs.push(measure(ENGINES[en], Object.assign(T.mk(ph, s), { continuous: !!T.continuous }), T.mode));
      const first = runs.map((r) => r.per[0]), all = runs.flatMap((r) => r.per), sum = (k) => runs.reduce((s, r) => s + (r[k] || 0), 0);
      const techs = {}; for (const r of runs) for (const x of r.techs) techs[x] = (techs[x] || 0) + 1;
      res[T.name][en] = { runs: runs.length, vis: [q(first.map((x) => x.vis), 0.5), q(first.map((x) => x.vis), 1)], torso: [q(first.map((x) => x.torso), 0.5), q(first.map((x) => x.torso), 1)], com: [q(first.map((x) => x.com), 0.5), q(first.map((x) => x.com), 1)], feet: [q(first.map((x) => x.feet), 0.5), q(first.map((x) => x.feet), 1)],
        contact: [q(all.map((x) => x.contact), 0.5), q(all.map((x) => x.contact), 1)], contactNone: all.filter((x) => x.contact == null).length, heading: [q(all.map((x) => x.heading), 0.5), q(all.map((x) => x.heading), 1)], headingNone: all.filter((x) => x.heading == null).length, line: [q(all.map((x) => x.line), 0.5), q(all.map((x) => x.line), 1)], lineNone: all.filter((x) => x.line == null).length, changes: all.length,
        lost: sum("lost"), missed: sum("missed"), double: sum("double"), contacts: +(sum("contacts") / runs.length).toFixed(1), sepMax: +max(...runs.map((r) => r.sepMax)).toFixed(2), sepMed: +(q(runs.map((r) => r.sepMax), 0.5) || 0).toFixed(2),
        legs: sum("legs"), jumps: sum("jumps"), slides: sum("slides"), supportTicks: sum("supportTicks"), footP99: +(q(runs.map((r) => r.footP99), 0.5) || 0).toFixed(1), techs,
        meanErr: T.continuous && q(runs.map((r) => r.meanErr), 0.5) != null ? +q(runs.map((r) => r.meanErr), 0.5).toFixed(1) : null, lag: T.continuous ? q(runs.map((r) => r.lag), 0.5) : null }; } }
  return res;
}
export function print(res, engines) {
  const L = [];
  for (const [name, R] of Object.entries(res)) { L.push(`\n■ ${name}`);
    for (const en of engines) { const r = R[en]; if (!r) continue;
      L.push(`  ${en.padEnd(5)} visible ${f2(r.vis[0])} (max ${f2(r.vis[1])}) [torso ${f2(r.torso[0])} · COM ${f2(r.com[0])} · feet ${f2(r.feet[0])}] · contact ${f2(r.contact[0])} (max ${f2(r.contact[1])}${r.contactNone ? `, none ${r.contactNone}/${r.changes}` : ""}) · heading ${f2(r.heading[0])} (max ${f2(r.heading[1])}${r.headingNone ? `, none ${r.headingNone}/${r.changes}` : ""}) · line ${f2(r.line[0])} (max ${f2(r.line[1])}${r.lineNone ? `, none ${r.lineNone}/${r.changes}` : ""})${r.meanErr != null ? ` · tracking err ${r.meanErr}° lag ${f2(r.lag)}` : ""}`);
      L.push(`        control: LOST ${r.lost} · missed ${r.missed} · double ${r.double} · contacts ${r.contacts}/run · sep max ${r.sepMax} m (median ${r.sepMed}) | body: leg crossings ${r.legs} · foot jumps ${r.jumps} · slides ${r.slides} · support <0.10 m ${r.supportTicks} ticks · foot p99 ${r.footP99} m/s | ${Object.entries(r.techs).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ×${v}`).join(", ") || "carry only"}`); } }
  return L.join("\n");
}
if ((process.argv[1] || "").endsWith("pt_ab_measure.mjs")) { const engines = opt("engines", "88573ef0,1.2").split(","), t0 = performance.now(), res = suite(engines, opt("only", null));
  const txt = print(res, engines) + `\n\n(${PH.length} stride phases × 2 directions per test; times in s after the input change; ${((performance.now() - t0) / 1000).toFixed(1)} s)`; console.log(txt);
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(res, null, 1)); if (opt("txt")) fs.writeFileSync(opt("txt"), txt); }

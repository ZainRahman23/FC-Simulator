// tc_responsive/tools/rs_ab.mjs — BASELINE-88573ef0 (A) vs the RESPONSIVENESS EXPERIMENT (B) on IDENTICAL analog-stick traces (the request mapping is
// pt_input.js's for both), each engine with its own presentation, every tick simulated and posed. A report card — the owner decides by playing.
//
// PREREGISTERED (fixed before tuning B against it; the owner's research report §9.3 / §10.2):
//   PRIMARY — 24 paired sequences: three input families × jog / sprint × four offsets through the baseline's run-up touch cycle
//     H90  a held 90° turn (2.5 s)
//     REV  0 → 90°, then a reversal to −90° after d = 0.10 / 0.17 / 0.24 / 0.31 s (around the contact commitment boundary), held 2 s
//     RAP  the rapid 0 → 90 → 0 → −90 (0.15 s each), then −90° held 2 s
//   SECONDARY — the owner's key tests: sprint snaps 45 / 90 / 120 / 180° (both ways), run / sprint rapid left-right, run / sprint 1 Hz circle,
//     run / sprint 0 → 90 → 0 → −90 (0.6 s), run / sprint small 20 – 40° corrections — 4 stride phases × both directions
//   CLOCKS per still-current request (each against a COUNTERFACTUAL run with the stick left where it was, for the first change):
//     authoritative response — the simulation's root velocity ≥ 0.10 m/s or its facing ≥ 2° off the counterfactual
//     visible response — the posed torso (shoulder line) ≥ 5° toward the intent, or the centre of mass ≥ 5 cm off the counterfactual
//     relevant contact — the first contact after the change that sends the ball within 30° of the still-current intent
//     new line — travel within 15° of the intent at ≥ 40 % of the requested speed, held 0.1 s
//     deadline — 2.0 s after a held request's change: not reached = a FAILURE (right-censored, reported, never dropped)
//   ALSO: stale actions (a contact > 80 ms after a change sending the ball > 60° off the current intent at > 2 m/s), control (LOST per the
//     torture suite's definition, missed, double touches), the ball's separation, contacts / s and the shortest interval, exit acceleration (to
//     70 % of the requested speed on the new line), the experiment's commitment durations by family, body diagnostics (leg crossings > 20 mm,
//     foot jumps > 0.12 m / tick, planted-foot slides > 4 mm / tick)
//   node rs_ab.mjs [--only <substr>] [--set primary|secondary|all] [--json f] [--txt f]
import { ENV } from "./rs_env.mjs";
import * as RXS from "../rs_sim.js";
import * as RXB from "../rs_body.js";
import * as BS from "../../tc_baseline_88573ef0/pt_sim.js";
import * as BB from "../../tc_baseline_88573ef0/pt_body.js";
import { stickVector, stickMode, headingFrom } from "../pt_input.js";
import fs from "node:fs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; };
const DT = 1 / 240, DEG = Math.PI / 180, hyp = Math.hypot, abs = Math.abs, min = Math.min, max = Math.max;
const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
const colliders = JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))), env = Object.assign({}, ENV, { colliders });
export const ENGINES = { "88573ef0": { Sim: BS.PlaySim, Body: BB.PlayBody }, "experiment": { Sim: RXS.PlaySim, Body: RXB.PlayBody } };
const MODES = { WALK: { r: 0.30 }, JOG: { r: 0.56 }, RUN: { r: 0.95 }, SPRINT: { r: 0.95, sprint: true } };
const steps = (L) => (t) => { let a = 0; for (const [t0, d] of L) if (t >= t0) a = d; return a; };
const RUNUP = 3.0;
// the four offsets through the baseline's run-up touch cycle (its median interval between touches in the run-up, measured once: preregistered)
export const CYCLE = { JOG: 0.717, SPRINT: 0.987 }, OFFS = (mode) => [0, 1, 2, 3].map((i) => i * CYCLE[mode] / 4);
export const PRIMARY = [];
for (const mode of ["JOG", "SPRINT"]) for (let i = 0; i < 4; i++) { const ph = OFFS(mode)[i], t0 = RUNUP + ph;
  PRIMARY.push({ fam: "H90", mode, i, name: `H90 ${mode} #${i}`, f: steps([[t0, 90]]), changes: [t0], held: [t0], dur: t0 + 2.6 });
  const d = [0.10, 0.17, 0.24, 0.31][i]; PRIMARY.push({ fam: "REV", mode, i, name: `REV ${mode} #${i} (d ${d.toFixed(2)} s)`, f: steps([[t0, 90], [t0 + d, -90]]), changes: [t0, t0 + d], held: [t0 + d], dur: t0 + d + 2.1 });
  PRIMARY.push({ fam: "RAP", mode, i, name: `RAP ${mode} #${i}`, f: steps([[t0, 90], [t0 + 0.15, 0], [t0 + 0.30, -90]]), changes: [t0, t0 + 0.15, t0 + 0.30], held: [t0 + 0.30], dur: t0 + 0.30 + 2.1 }); }
export const SECONDARY = [];
const PH = [0, 0.12, 0.24, 0.36];
for (const ang of [45, 90, 120, 180]) for (const s of [1, -1]) for (let i = 0; i < 4; i++) { const t0 = RUNUP + PH[i]; SECONDARY.push({ fam: `sprint snap ${ang}°`, mode: "SPRINT", name: `sprint snap ${ang * s}° #${i}`, f: steps([[t0, ang * s]]), changes: [t0], held: [t0], dur: t0 + 2.4 }); }
for (const mode of ["RUN", "SPRINT"]) for (const s of [1, -1]) for (let i = 0; i < 4; i++) { const t0 = RUNUP + PH[i];
  { const L = []; for (let j = 0; j < 8; j++) L.push([t0 + j * 0.35, (j % 2 ? -60 : 60) * s]); L.push([t0 + 2.8, 0]); SECONDARY.push({ fam: `${mode.toLowerCase()} rapid left/right`, mode, name: `${mode} rapid L/R ${s > 0 ? "R" : "L"} #${i}`, f: steps(L), changes: L.map((x) => x[0]), held: [t0 + 2.8], dur: t0 + 4.6 }); }
  SECONDARY.push({ fam: `${mode.toLowerCase()} 1 Hz circle`, mode, name: `${mode} circle ${s > 0 ? "cw" : "ccw"} #${i}`, f: (t) => (t < t0 ? 0 : s * 360 * (t - t0)), changes: [t0], held: [], dur: t0 + 4.0, continuous: true });
  { const L = [[t0, 90 * s], [t0 + 0.6, 0], [t0 + 1.2, -90 * s], [t0 + 1.8, 0]]; SECONDARY.push({ fam: `${mode.toLowerCase()} 0→90→0→−90 (0.6 s)`, mode, name: `${mode} 0/90/0/-90 ${s > 0 ? "R" : "L"} #${i}`, f: steps(L), changes: L.map((x) => x[0]), held: L.map((x) => x[0]), dur: t0 + 3.6 }); }
  { const A = [30, 0, -25, 10, 40, 15, -20, 0], L = A.map((a, j) => [t0 + j * 0.6, a * s]); SECONDARY.push({ fam: `${mode.toLowerCase()} small 20–40° corrections`, mode, name: `${mode} small ${s > 0 ? "R" : "L"} #${i}`, f: steps(L), changes: L.map((x) => x[0]), held: L.map((x) => x[0]), dur: t0 + A.length * 0.6 + 1.6 }); } }
// ── one run ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function shoulderYaw(J) { const r = J.upperArm_R.j, l = J.upperArm_L.j; return Math.atan2(-(r[0] - l[0]), r[1] - l[1]); }
export function reqOf(f, t, M) { const a = f(t), v = stickVector(Math.sin(a * DEG) * M.r, Math.cos(a * DEG) * M.r); return { h: t < 0.2 ? null : headingFrom(0, v.x, v.y), mode: M.sprint ? "SPRINT" : stickMode(v.r), keys: 64 }; }
export function runEngine(E, spec, mode, o = {}) {
  const M = MODES[mode], sim = new E.Sim(env, o.sim || {}), body = o.pose === false ? null : new E.Body(env, sim), n = Math.round(spec.dur / DT), ticks = [];
  for (let k = 0; k < n; k++) { const t = k * DT; sim.step(reqOf(spec.f, t, M)); const T = sim.t; if (o.from != null && T < o.from - 1e-9) continue;
    const st = sim.stateAt(T), b = sim.ball.p, bv = sim.ball.v, rec = { t: T, P: st.P, V: st.V, h: st.h, s: st.s, psi: st.psi, b: [b[0], b[1]], bv: [bv[0], bv[1]], plan: sim.plan, act: sim.plan.action };
    if (body) { const p = body.pose(T); rec.tor = shoulderYaw(p.J); rec.feet = {}; for (const X of ["R", "L"]) { const f = p.feet[X]; rec.feet[X] = { ank: f.ank.slice(), planted: f.planted, stance: f.stance && f.stance.id, pivot: !!(f.stance && f.stance.pivot), ballPt: f.ballPt && f.ballPt.slice() }; } rec.clr = Math.min(...Object.values(p.clr)); }
    ticks.push(rec); }
  return { ticks, sim };
}
// ── the measures of one sequence on one engine ────────────────────────────────────────────────────────────────────────────────────────────────
export function measure(E, spec, mode) {
  const tIn = spec.changes[0], M = MODES[mode], vm = mode === "SPRINT" ? 8.0 : mode === "JOG" ? 3.2 : mode === "RUN" ? 5.3 : 1.5;
  const main = runEngine(E, spec, mode, { from: tIn - 0.6 }), cf = runEngine(E, { f: (t) => (t < tIn ? spec.f(t) : spec.f(tIn - 1e-6)), dur: min(spec.dur, tIn + 1.2) }, mode, { from: tIn - 0.6 });
  const sim = main.sim, T = main.ticks, Tc = new Map(cf.ticks.map((x) => [Math.round(x.t / DT), x])), intentAt = (t) => reqOf(spec.f, t - DT, M).h;
  const made = sim.contacts.filter((c) => !c.missed && !c.interceptor), out = { per: [] };
  for (let ci = 0; ci < spec.changes.length; ci++) { const tc = spec.changes[ci], tNext = spec.changes[ci + 1] ?? spec.dur, hI = reqOf(spec.f, tc + 1e-6, M).h, held = spec.held.includes(tc); if (hI == null) continue;
    const x = { t: tc, held, auth: null, vis: null, contact: null, heading: null, line: null, exit: null }; let lineS = null;
    for (const k of T) { if (k.t < tc - 1e-9 || k.t > tNext + 1e-9) continue; const dt = k.t - tc;
      if (ci === 0) { const c = Tc.get(Math.round(k.t / DT)); if (c) { if (x.auth == null && (hyp(k.V[0] - c.V[0], k.V[1] - c.V[1]) >= 0.10 || abs(wrap(k.psi - c.psi)) >= 2 * DEG)) x.auth = dt;
          if (k.tor != null) { const sg = Math.sign(wrap(hI - c.tor)) || 1; if (x.vis == null && (wrap(k.tor - c.tor) * sg >= 5 * DEG || hyp(k.P[0] - c.P[0], k.P[1] - c.P[1]) >= 0.05)) x.vis = dt; } } }
      if (x.heading == null && k.s >= 1.0 && abs(wrap(k.h - hI)) < 15 * DEG) x.heading = dt;
      if (x.line == null) { if (k.s >= 0.4 * vm && abs(wrap(k.h - hI)) < 15 * DEG) { if (lineS == null) lineS = k.t; if (k.t - lineS >= 0.1 - 1e-9) x.line = lineS - tc; } else lineS = null; }
      if (x.exit == null && k.s >= 0.7 * vm && abs(wrap(k.h - hI)) < 15 * DEG) x.exit = dt; }
    const dc = made.find((c) => c.t >= tc - 1e-9 && c.t <= tNext + 1e-9 && hyp(c.vOut[0], c.vOut[1]) > 0.3 && abs(wrap(Math.atan2(c.vOut[1], c.vOut[0]) - hI)) < 30 * DEG); if (dc) x.contact = dc.t - tc;
    if (held) { const dl = 2.0; x.lineFail = x.line == null || x.line > dl; x.contactFail = x.contact == null || x.contact > dl; }
    out.per.push(x); }
  // control after the first change
  let noC = 0, lastMade = 0, lost = 0, lostOn = false, sepMax = 0; const seps = [];
  for (const k of T) { if (k.t < tIn) continue; const plan = k.plan, act = k.act, future = plan.contacts.some((c) => !c.done && c.t > k.t - 1e-9) || (act.chase && act.closing), sep = hyp(k.b[0] - k.P[0], k.b[1] - k.P[1]), atFeet = hyp(k.bv[0], k.bv[1]) < 0.3 && sep < 0.8, on = intentAt(k.t) != null;
    for (const c of made) if (c.t <= k.t + 1e-9 && c.t > lastMade) lastMade = c.t; if (on && !future && !atFeet) noC += DT; else noC = 0; const ln = on && !atFeet && (noC > 0.5 || k.t - lastMade > 1.8); if (ln && !lostOn) lost++; lostOn = ln; sepMax = max(sepMax, sep); seps.push(sep); }
  out.lost = lost; out.sepMax = sepMax; seps.sort((a, b) => a - b); out.sepMed = seps.length ? seps[Math.floor(seps.length / 2)] : 0; out.missed = sim.contacts.filter((c) => c.missed && c.t >= tIn).length;
  const after = made.filter((c) => c.t >= tIn); out.contacts = after.length; out.cps = after.length / max(0.5, spec.dur - tIn); out.minGap = 9; for (let i = 1; i < after.length; i++) out.minGap = min(out.minGap, after[i].t - after[i - 1].t);
  out.double = 0; for (let i = 1; i < made.length; i++) if (made[i].t >= tIn && made[i].t - made[i - 1].t < 0.10 - 1e-9) out.double++;
  out.stale = 0; for (const c of after) { const lastCh = spec.changes.filter((x) => x <= c.t + 1e-9).pop(); if (lastCh == null || c.t - lastCh < 0.08) continue; const h = reqOf(spec.f, c.t, M).h, so = hyp(c.vOut[0], c.vOut[1]); if (h != null && so > 2.0 && abs(wrap(Math.atan2(c.vOut[1], c.vOut[0]) - h)) > 60 * DEG) out.stale++; }
  out.techs = sim.log.actions.filter((a) => a.t >= tIn - 1e-9 && !/CARRY|STANDING|PURSUIT|STOP/.test(a.label)).map((a) => a.label + (a.F ? " " + a.F : a.m ? (a.m > 0 ? " R" : " L") : ""));
  out.commit = (sim.log.commit || []).filter((c) => c.t >= tIn).map((c) => ({ fam: c.fam, dur: c.dur, speed: c.speed }));
  let legs = 0, legOn = false, jumps = 0, slides = 0, prev = null;
  for (const k of T) { if (k.t < tIn || !k.feet) { prev = k; continue; } const bad = k.clr < -0.02; if (bad && !legOn) legs++; legOn = bad;
    if (prev && prev.feet) for (const X of ["R", "L"]) { const f = k.feet[X], q = prev.feet[X], d = hyp(f.ank[0] - q.ank[0], f.ank[1] - q.ank[1], f.ank[2] - q.ank[2]); if (d > 0.12) jumps++; if (f.planted && q.planted && f.stance === q.stance && f.ballPt && q.ballPt && !f.pivot && hyp(f.ballPt[0] - q.ballPt[0], f.ballPt[1] - q.ballPt[1]) > 0.004) slides++; } prev = k; }
  out.legs = legs; out.jumps = jumps; out.slides = slides;
  const cpu = sim.cpu.replan.slice().sort((a, b) => a - b); out.cpuP99 = cpu.length ? cpu[Math.floor(0.99 * (cpu.length - 1))] : 0;
  if (spec.continuous) { const H = T.filter((k) => k.t >= tIn + 0.5 && k.s > 0.8).map((k) => ({ t: k.t, h: k.h, i: intentAt(k.t) })).filter((x) => x.i != null); out.meanErr = H.reduce((s, x) => s + abs(wrap(x.i - x.h)), 0) / max(1, H.length) / DEG; }
  return out;
}
// ── the report card ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const qt = (A, p) => { const s = A.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))] : null; };
const f2 = (x) => (x == null ? "  —  " : x.toFixed(2).padStart(5));
export function suite(specs, engines, only) {
  const groups = {}; for (const sp of specs) { if (only && !sp.name.includes(only) && !sp.fam.includes(only)) continue; const g = `${sp.fam}${sp.mode && !sp.fam.toLowerCase().includes(sp.mode.toLowerCase()) ? " · " + sp.mode : ""}`; (groups[g] = groups[g] || []).push(sp); }
  const res = {};
  for (const [g, L] of Object.entries(groups)) { res[g] = {};
    for (const en of engines) { const runs = L.map((sp) => ({ sp, r: measure(ENGINES[en], sp, sp.mode) })), first = runs.map((x) => x.r.per[0]).filter(Boolean), held = runs.flatMap((x) => x.r.per.filter((p) => p.held)), all = runs.flatMap((x) => x.r.per), sum = (k) => runs.reduce((s, x) => s + (x.r[k] || 0), 0);
      const techs = {}; for (const x of runs) for (const tq of x.r.techs) techs[tq] = (techs[tq] || 0) + 1;
      const com = {}; for (const x of runs) for (const c of x.r.commit) (com[c.fam] = com[c.fam] || []).push(c.dur);
      res[g][en] = { n: runs.length, auth: [qt(first.map((x) => x.auth), 0.5), qt(first.map((x) => x.auth), 0.95)], vis: [qt(first.map((x) => x.vis), 0.5), qt(first.map((x) => x.vis), 0.95)],
        contact: [qt(held.map((x) => x.contact), 0.5), qt(held.map((x) => x.contact), 0.95), qt(held.map((x) => x.contact), 1)], contactFail: held.filter((x) => x.contactFail).length,
        line: [qt(held.map((x) => x.line), 0.5), qt(held.map((x) => x.line), 0.95), qt(held.map((x) => x.line), 1)], lineFail: held.filter((x) => x.lineFail).length, held: held.length,
        heading: [qt(all.map((x) => x.heading), 0.5), qt(all.map((x) => x.heading), 0.95)], exit: [qt(held.map((x) => x.exit), 0.5), qt(held.map((x) => x.exit), 0.95)],
        lost: sum("lost"), missed: sum("missed"), double: sum("double"), stale: sum("stale"), sepMax: +max(...runs.map((x) => x.r.sepMax)).toFixed(2), sepMed: +(qt(runs.map((x) => x.r.sepMed), 0.5) || 0).toFixed(2), cps: +(sum("cps") / runs.length).toFixed(2), minGap: +min(...runs.map((x) => x.r.minGap)).toFixed(3),
        legs: sum("legs"), jumps: sum("jumps"), slides: sum("slides"), cpuP99: +max(...runs.map((x) => x.r.cpuP99)).toFixed(2), techs, meanErr: L[0].continuous ? +(qt(runs.map((x) => x.r.meanErr), 0.5) || 0).toFixed(1) : null,
        commit: Object.fromEntries(Object.entries(com).map(([k, v]) => [k, { n: v.length, med: +(qt(v, 0.5) * 1000).toFixed(0), min: +(Math.min(...v) * 1000).toFixed(0), max: +(Math.max(...v) * 1000).toFixed(0) }])),
        traces: runs.map((x) => ({ name: x.sp.name, per: x.r.per.map((p) => ({ t: +p.t.toFixed(3), held: p.held, auth: p.auth, vis: p.vis, contact: p.contact, line: p.line })), techs: x.r.techs, lost: x.r.lost, stale: x.r.stale })) }; } }
  return res;
}
export function print(res, engines) {
  const L = [];
  for (const [g, R] of Object.entries(res)) { L.push(`\n■ ${g}`);
    for (const en of engines) { const r = R[en]; if (!r) continue;
      L.push(`  ${en.padEnd(10)} response: authoritative ${f2(r.auth[0])} (p95 ${f2(r.auth[1])}) · visible ${f2(r.vis[0])} (p95 ${f2(r.vis[1])}) | relevant contact ${f2(r.contact[0])} (p95 ${f2(r.contact[1])}, max ${f2(r.contact[2])}${r.contactFail ? `, FAILED ${r.contactFail}/${r.held}` : ""}) | new line ${f2(r.line[0])} (p95 ${f2(r.line[1])}, max ${f2(r.line[2])}${r.lineFail ? `, FAILED ${r.lineFail}/${r.held}` : ""}) · exit 70 % ${f2(r.exit[0])}${r.meanErr != null ? ` · circle heading error ${r.meanErr}°` : ""}`);
      L.push(`             control: LOST ${r.lost} · missed ${r.missed} · double ${r.double} · stale ${r.stale} · sep max ${r.sepMax} m (median ${r.sepMed}) · ${r.cps} contacts/s (shortest gap ${r.minGap} s) | body: legs ${r.legs} · foot jumps ${r.jumps} · slides ${r.slides} | replan p99 ${r.cpuP99} ms`);
      const tq = Object.entries(r.techs).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ×${v}`).join(", "); if (tq) L.push(`             actions: ${tq}`);
      const cm = Object.entries(r.commit).map(([k, v]) => `${k} ${v.med} ms (${v.min}–${v.max}, n ${v.n})`).join(" · "); if (cm) L.push(`             commitment (the contacting proxy's final approach): ${cm}`); } }
  return L.join("\n");
}
if ((process.argv[1] || "").endsWith("rs_ab.mjs")) { const set = opt("set", "primary"), engines = ["88573ef0", "experiment"], t0 = performance.now();
  const specs = set === "primary" ? PRIMARY : set === "secondary" ? SECONDARY : PRIMARY.concat(SECONDARY), res = suite(specs, engines, opt("only", null));
  const txt = print(res, engines) + `\n\n(${set}: ${specs.length} sequences per engine; times in s after the input change; ${((performance.now() - t0) / 1000).toFixed(1)} s)`; console.log(txt);
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(res, null, 1)); if (opt("txt")) fs.writeFileSync(opt("txt"), txt); }

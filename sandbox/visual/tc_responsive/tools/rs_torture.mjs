// tc_responsive/tools/rs_torture.mjs — the RAPID-INPUT TORTURE SUITE (PLAYTEST-1.2's test infrastructure) on either engine: --engine RX (the
// experiment, default) or BASE (the locked baseline, read-only) — at 99 / 99 / 99 (owner §11 – §13): deterministic analog-stick input
// sequences (the stick's own request functions — pt_input.js — so the page would author the same requests) at WALK / JOG / RUN / SPRINT, every
// tick simulated and POSED, and the acceptance measures:
//   CONTROL (§13 — by feasibility, not distance): LOST = the request is on, the ball is not at the feet, and no contact is planned for > 0.5 s, or
//     none has been made for > 1.8 s; RECOVERING = a chase plan (the ball got beyond the feet's reach on the planned path); missed contacts
//   LEGS: structural crossings (TECHNICAL-CONTROL-1.3's leg capsules interpenetrating > 20 mm); planted feet colliding (< 0.10 m) or crossed
//     (outside an authored crossover); a planted foot sliding (> 4 mm per tick); a foot jumping (> 0.12 m per tick: teleport)
//   BALL: a jump beyond its own velocity (teleport); two contacts within 0.10 s (a double touch)
//   TECHNIQUES: a technique abandoned after its commitment (its decisive contact never made) — overlapping incompatible actions
//   node pt_torture.mjs [--only <substr>] [--modes RUN,SPRINT] [--json out.json] [--nopose] [--verbose]
import { ENV, makeSim } from "./rs_env.mjs";
import { PlayBody as RXBody } from "../rs_body.js";
import { PlayBody as BaseBody } from "../../tc_baseline_88573ef0/pt_body.js";
import { stickVector, stickMode, headingFrom } from "../pt_input.js";
import fs from "node:fs";
const A = process.argv, opt = (k, d) => { const i = A.indexOf("--" + k); return i > 0 ? A[i + 1] : d; }, has = (k) => A.includes("--" + k), ENGINE = opt("engine", "RX");
const DT = 1 / 240, DEG = Math.PI / 180, hyp = Math.hypot, abs = Math.abs;
const colliders = JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))), env = Object.assign({}, ENV, { colliders });
// ── the sequences: angle (deg from the forward the stick latched, + = right) as a function of time; the first 1.6 s forward (speed built) ─────
import { SEQ, MODES, T0 } from "../pt_torture_seq.js";
// ── one run ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function runTorture(seq, modeId, o = {}) {
  const M = MODES[modeId], sim = makeSim(o.engine || ENGINE, o.sim || {}), body = o.pose === false ? null : new ((o.engine || ENGINE) === "BASE" ? BaseBody : RXBody)(env, sim), FRAME = 0, n = Math.round(seq.dur / DT);
  const ev = { lost: [], recover: [], missed: 0, legs: [], supportHit: [], crossed: [], slip: [], footJump: [], ballJump: 0, doubleTouch: [], abandoned: [], ballInBoot: 0 };
  let noC = 0, lostOn = false, chaseOn = false, prevBall = sim.ball.p, prevBallV = sim.ball.v, prevFeet = null, prevAct = sim.plan.action, lastMade = 0;
  const legSp = [], push = (L, t, x) => { const l = L[L.length - 1]; if (l && t - l.t1 < 0.03) { l.t1 = t; l.worst = Math.min(l.worst, x ?? 0); } else L.push({ t0: t, t1: t, worst: x ?? 0 }); };
  for (let k = 0; k < n; k++) { const t = k * DT, a = seq.f(t), raw = [Math.sin(a * DEG) * M.r, Math.cos(a * DEG) * M.r], v = stickVector(raw[0], raw[1]);
    const req = { h: t < 0.2 ? null : headingFrom(FRAME, v.x, v.y), mode: M.sprint ? "SPRINT" : stickMode(v.r), keys: 64 };
    const nC0 = sim.contacts.length; sim.step(req); const T = sim.t, plan = sim.plan, act = plan.action, st = sim.stateAt(T), b = sim.ball.p, bv = sim.ball.v, sep = hyp(b[0] - st.P[0], b[1] - st.P[1]);
    // contacts made this tick: missed / double touches
    for (let i = nC0; i < sim.contacts.length; i++) { const c = sim.contacts[i]; if (c.missed) { ev.missed++; continue; } const prev = sim.contacts.slice(0, i).reverse().find((x) => !x.missed); if (prev && c.t - prev.t < 0.10 - 1e-9) ev.doubleTouch.push({ t: c.t, a: `${prev.F} ${prev.role}`, b: `${c.F} ${c.role}` }); lastMade = c.t; }
    // CONTROL
    // (a pursuit closing on the ball is a recovery in hand, not a loss — its touch may lie beyond the plan's horizon)
    const future = plan.contacts.some((c) => !c.done && c.t > T - 1e-9) || (act.chase && act.closing), atFeet = hyp(bv[0], bv[1]) < 0.3 && sep < 0.8, on = req.h != null;
    if (on && !future && !atFeet) noC += DT; else noC = 0;
    const lostNow = on && !atFeet && (noC > 0.5 || T - lastMade > 1.8); if (lostNow && !lostOn) ev.lost.push({ t: T, sep: +sep.toFixed(2), why: noC > 0.5 ? "no contact planned for 0.5 s" : "no contact made for 1.8 s", action: act.label }); lostOn = lostNow;
    const chase = !!act.chase; if (chase && !chaseOn) ev.recover.push({ t: T, sep: +sep.toFixed(2) }); chaseOn = chase;
    // BALL teleport (beyond its own velocity)
    const db = hyp(b[0] - prevBall[0], b[1] - prevBall[1]); if (db > hyp(prevBallV[0], prevBallV[1]) * DT * 1.5 + hyp(bv[0], bv[1]) * DT * 1.5 + 0.005) ev.ballJump++; prevBall = b; prevBallV = bv;
    // TECHNIQUES: one abandoned after its commitment (its decisive contact never made) — decided after it (the re-plan runs at the tick's start, T − DT)
    if (act.id !== prevAct.id && prevAct.tech) { const made = sim.contacts.some((c) => c.actionId === prevAct.id && c.decisive && !c.missed); if (!made && T - DT > prevAct.tCommit + 1e-6) ev.abandoned.push({ t: T, tech: prevAct.label + (prevAct.m > 0 ? " R" : " L"), commit: +prevAct.tCommit.toFixed(3), now: act.label }); }
    prevAct = act;
    // LEGS (the posed body)
    if (body) { const p = body.pose(T), clr = Math.min(...Object.values(p.clr)); if (clr < -0.02) push(ev.legs, T, clr);
      for (const X of ["R", "L"]) { const g = p.gap[X]; if (g && g.gap < -0.02 && !sim.contacts.some((c) => abs(c.t - T) < 0.02)) ev.ballInBoot++; }
      const fR = p.feet.R, fL = p.feet.L;
      if (fR.planted && fL.planted) { const d = hyp(fR.ank[0] - fL.ank[0], fR.ank[1] - fL.ank[1]); if (d < 0.10) push(ev.supportHit, T, -d);
        const psi = p.psi, r = [-Math.sin(psi), Math.cos(psi)], lat = (fR.ank[0] - fL.ank[0]) * r[0] + (fR.ank[1] - fL.ank[1]) * r[1], authored = (fR.stance && fR.stance.src === "tech") || (fL.stance && fL.stance.src === "tech"); if (lat < -0.05 && !authored) push(ev.crossed, T, lat); }
      if (prevFeet) for (const X of ["R", "L"]) { const f = p.feet[X], q = prevFeet[X], d = hyp(f.ank[0] - q.ank[0], f.ank[1] - q.ank[1], f.ank[2] - q.ank[2]);
        if (d > 0.12) ev.footJump.push({ t: T, X, d: +d.toFixed(3), planted: f.planted + "/" + q.planted });
        // a planted foot slides: the ball of the foot moves while the same stance stands (the heel's rise rotates about it — not a slide; pivots excluded)
        if (f.planted && q.planted && f.stance && q.stance && f.stance.id === q.stance.id && f.ballPt && q.ballPt && !f.stance.pivot) { const s2 = hyp(f.ballPt[0] - q.ballPt[0], f.ballPt[1] - q.ballPt[1]); if (s2 > 0.004) push(ev.slip, T, -s2); } }
      prevFeet = { R: { ank: fR.ank.slice(), planted: fR.planted, stance: fR.stance, ballPt: fR.ballPt && fR.ballPt.slice() }, L: { ank: fL.ank.slice(), planted: fL.planted, stance: fL.stance, ballPt: fL.ballPt && fL.ballPt.slice() } }; } }
  const techs = sim.log.actions.filter((x) => x.label !== "CARRY" && x.t > 0.3).map((x) => `${x.t.toFixed(2)} ${x.label}${x.m ? (x.m > 0 ? " R" : " L") : ""}`);
  return { sim, ev, techs, contacts: sim.contacts.filter((c) => !c.missed).length, hash: sim.hash };
}
// ── the suite ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// --extended N: N more random rapid-input sequences (a new angle every 0.06 – 0.40 s for 6 s) at all four speed groups — control only (no pose)
if ((process.argv[1] || "").endsWith("rs_torture.mjs") && has("extended")) { const N = +opt("extended", 60), out = { runs: 0, seconds: 0, lost: 0, recover: 0, missed: 0, contacts: 0, doubleTouch: 0, abandoned: 0, lostCases: [] };
  const r0 = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
  for (let sd = 1; sd <= N; sd++) { const r = r0(5000 + sd), L = []; let t = T0; while (t < T0 + 6) { L.push([t, -180 + 360 * r()]); t += 0.06 + 0.34 * r(); } const seq = { f: (tt) => { let a = 0; for (const [t1, d] of L) if (tt >= t1) a = d; return a; }, dur: T0 + 7.5 };
    for (const m of ["WALK", "JOG", "RUN", "SPRINT"]) { const x = runTorture(seq, m, { pose: false }); out.runs++; out.seconds += seq.dur; out.lost += x.ev.lost.length; out.recover += x.ev.recover.length; out.missed += x.ev.missed; out.contacts += x.contacts; out.doubleTouch += x.ev.doubleTouch.length; out.abandoned += x.ev.abandoned.length; if (x.ev.lost.length) out.lostCases.push({ seed: 5000 + sd, mode: m, lost: x.ev.lost }); if (x.ev.abandoned.length) (out.abandonedCases = out.abandonedCases || []).push({ seed: 5000 + sd, mode: m, abandoned: x.ev.abandoned }); } }
  console.log(`EXTENDED ${out.runs} runs (${out.seconds.toFixed(0)} s): LOST ${out.lost} · recoveries ${out.recover} · missed ${out.missed} · contacts ${out.contacts} · double touches ${out.doubleTouch} · abandoned after commit ${out.abandoned}`);
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(out, null, 1)); process.exit(0); }
if ((process.argv[1] || "").endsWith("rs_torture.mjs")) {
  const only = opt("only", null), modes = (opt("modes", "WALK,JOG,RUN,SPRINT")).split(","), rows = [], tot = { runs: 0, lost: 0, recover: 0, missed: 0, legs: 0, supportHit: 0, crossed: 0, slip: 0, footJump: 0, ballJump: 0, doubleTouch: 0, abandoned: 0, ballInBoot: 0, ticks: 0 };
  const t0 = performance.now();
  for (const [name, seq] of Object.entries(SEQ)) { if (only && !name.includes(only)) continue; for (const m of modes) { const r = runTorture(seq, m, { pose: !has("nopose") }), e = r.ev;
    const row = { name, mode: m, lost: e.lost.length, recover: e.recover.length, missed: e.missed, legs: e.legs.length, supportHit: e.supportHit.length, crossed: e.crossed.length, slip: e.slip.length, footJump: e.footJump.length, ballJump: e.ballJump, doubleTouch: e.doubleTouch.length, abandoned: e.abandoned.length, ballInBoot: e.ballInBoot, contacts: r.contacts, techs: r.techs, detail: e };
    rows.push(row); tot.runs++; tot.ticks += Math.round(seq.dur / DT); for (const k of Object.keys(tot)) if (k !== "runs" && k !== "ticks") tot[k] += row[k];
    const bad = ["lost", "missed", "legs", "supportHit", "crossed", "footJump", "ballJump", "doubleTouch", "abandoned"].filter((k) => row[k]).map((k) => `${k} ${row[k]}`).join(" · ");
    if (bad || has("verbose")) console.log(`${(name + " · " + m).padEnd(40)} ${bad || "clean"}${row.recover ? " · recover " + row.recover : ""} · contacts ${row.contacts} · ${r.techs.join(", ") || "carry"}`); } }
  console.log(`\nTOTAL ${tot.runs} runs (${(tot.ticks / 240).toFixed(0)} s simulated, ${((performance.now() - t0) / 1000).toFixed(1)} s): LOST ${tot.lost} · recoveries ${tot.recover} · missed ${tot.missed} · leg crossings ${tot.legs} spans · support collisions ${tot.supportHit} · crossed supports ${tot.crossed} · slips ${tot.slip} · foot jumps ${tot.footJump} · ball jumps ${tot.ballJump} · double touches ${tot.doubleTouch} · abandoned after commit ${tot.abandoned} · ball-in-boot ticks ${tot.ballInBoot}`);
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify({ total: tot, rows: rows.map((r) => Object.assign({}, r, { detail: { lost: r.detail.lost, recover: r.detail.recover, legs: r.detail.legs, supportHit: r.detail.supportHit, crossed: r.detail.crossed, footJump: r.detail.footJump.slice(0, 10), doubleTouch: r.detail.doubleTouch, abandoned: r.detail.abandoned } })) }, null, 1));
}
export { SEQ, MODES };

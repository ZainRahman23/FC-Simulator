// tc_controlled1/tools/c_torture.mjs — THE PROLONGED POSSESSION TORTURE (owner §18): seeded random LEGAL joystick input for many simulated
// minutes per configuration — holds, snaps (any angle), continuous rotations (±400°/s), oscillations (±15 – 135°, 0.08 – 0.6 s), smooth random
// analog wandering, stops / restarts, and the speed changing every segment (walk / jog / run / sprint) — simulation only, no posing.
// Every loss of possession is classified by its cause. Two observers:
//   OBSERVED LOSS (both models, model-blind): the stick on, the ball not at rest at the feet, and no planned contact for 0.5 s or none made for
//                 1.8 s (the report card's definition), or the ball over 3 m from the player
//   CONTROLLED EXITS (the controlled model): every transition out of CONTROLLED_BALL with the simulation's own reason
//   node c_torture.mjs [--configs FREE,CONTROLLED] [--seeds 40] [--dur 60] [--from 1] [--json f] [--verbose]
import { makeSim, DT } from "./u_env.mjs";
import { presetLayers } from "../u_sim.js";
import { stickVector, stickMode, headingFrom } from "../../tc_baseline_88573ef0/pt_input.js";
import fs from "node:fs";
const AR = process.argv, opt = (k, d) => { const i = AR.indexOf("--" + k); return i > 0 ? AR[i + 1] : d; }, has = (k) => AR.includes("--" + k);
const DEG = Math.PI / 180, hyp = Math.hypot, wrapD = (a) => ((a + 540) % 360) - 180;
export const PAGE = { attrs: { bc: 99, dri: 99, agi: 99 }, foot: "R", style: "NEUTRAL", seed: 1, start: { P: [52.5, 34], h: 0 } };
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
// a seeded input program: segments of { kind, t0, t1, mode, r, sprint, f(t) → stick angle (deg, from the start's forward) or null }
export function program(seed, dur) { const R = rng(seed), segs = []; let t = 1.2, a = 0;   // (1.2 s straight run-up at a run)
  segs.push({ kind: "runup", t0: 0, t1: t, mode: "RUN", r: 0.95, sprint: false, f: () => 0 });
  const pick = (L) => { let x = R() * L.reduce((s, [w]) => s + w, 0); for (const [w, v] of L) { if ((x -= w) <= 0) return v; } return L[L.length - 1][1]; };
  while (t < dur) { const mode = pick([[15, "WALK"], [20, "JOG"], [30, "RUN"], [35, "SPRINT"]]), r = mode === "WALK" ? 0.28 + 0.1 * R() : mode === "JOG" ? 0.45 + 0.22 * R() : 0.8 + 0.2 * R(), sprint = mode === "SPRINT";
    const kind = pick([[18, "hold"], [22, "snap"], [16, "rotate"], [18, "oscillate"], [14, "wander"], [8, "stop"], [4, "abuse"]]); let d, f; const a0 = a;
    if (kind === "hold") { d = 0.3 + 1.7 * R(); f = () => a0; }
    else if (kind === "snap") { const da = pick([[3, 30], [3, 45], [3, 60], [4, 90], [3, 120], [2, 150], [3, 180], [3, 360 * R() - 180]]) * (R() < 0.5 ? 1 : -1); d = 0.15 + 1.05 * R(); a = a0 + da; const a1 = a; f = () => a1; }
    else if (kind === "rotate") { const w = (60 + 340 * R()) * (R() < 0.5 ? 1 : -1); d = 0.3 + 2.2 * R(); const s0 = t; f = (x) => a0 + w * (x - s0); a = a0 + w * d; }
    else if (kind === "oscillate") { const amp = 15 + 120 * R(), per = 0.08 + 0.52 * R(); d = 0.6 + 2.4 * R(); const s0 = t; f = (x) => a0 + (Math.floor((x - s0) / per) % 2 ? -amp : amp); }
    else if (kind === "wander") { const p = [0, 1, 2].map(() => [40 + 100 * R(), 0.3 + 1.7 * R(), 6.3 * R()]); d = 1 + 3 * R(); const s0 = t; f = (x) => a0 + p.reduce((s, [A, w, ph]) => s + A * (Math.sin(w * (x - s0) * 6.283 + ph) - Math.sin(ph)), 0); a = f(t + d); }
    else if (kind === "stop") { d = 0.2 + 1.3 * R(); f = () => null; }
    else { const per = 0.03 + 0.07 * R(); d = 0.5 + 1.5 * R(); const s0 = t, A = Array.from({ length: Math.ceil(d / per) + 2 }, () => 60 + 120 * R()); f = (x) => { const j = Math.floor((x - s0) / per); return a0 + (j % 2 ? 1 : -1) * A[Math.min(A.length - 1, Math.max(0, j))]; }; }   // (abuse: a new ±60 – 180° flick every 30 – 100 ms; drawn up front — the program is a pure function of seed and time)
    segs.push({ kind, t0: t, t1: t + d, mode, r, sprint, f }); t += d; }
  const at = (x) => { let s = segs[0]; for (const q of segs) { if (q.t0 <= x + 1e-9) s = q; else break; } return s; };
  return { segs, dur, at, req: (x) => { const s = at(x), ang = s.f(x); if (ang == null) return { h: null, mode: s.sprint ? "SPRINT" : "RUN", keys: 64 };
    const v = stickVector(Math.sin(ang * DEG) * s.r, Math.cos(ang * DEG) * s.r); return { h: headingFrom(0, v.x, v.y), mode: s.sprint ? "SPRINT" : stickMode(v.r), keys: 64 }; } }; }
export function runOne(cfg, seed, dur, o = {}) { const P = program(seed, dur), opts = Object.assign(JSON.parse(JSON.stringify(PAGE)), { layers: presetLayers("FULL") }, cfg === "CONTROLLED" ? { control: "CONTROLLED" } : {}, o.simOpts || {}), sim = makeSim("TL", opts), n = Math.round(dur / DT);
  const res = { cfg, seed, dur, lost: 0, losses: [], missed: 0, contacts: 0, sepSum: 0, sepN: 0, sepMax: 0, cpu: 0, worstTick: 0, exits: {}, exitList: [] };
  let noC = 0, lastMade = 0, lostOn = false, nC = 0; const t0 = performance.now(), sepTr = new Float32Array(n + 2);
  for (let k = 0; k < n; k++) { const q = P.req(k * DT), w0 = performance.now(); sim.step(q); const w = performance.now() - w0; if (w > res.worstTick) res.worstTick = w;
    const t = sim.t; if (t < 1.2) continue; const st = sim.stateAt(t), b = sim.ball.p, bv = sim.ball.v, sep = hyp(b[0] - st.P[0], b[1] - st.P[1]), plan = sim.plan, act = plan.action;
    while (nC < sim.contacts.length) { const c = sim.contacts[nC++]; if (c.missed) res.missed++; else { res.contacts++; lastMade = c.t; } }
    const future = plan.contacts.some((c) => !c.done && c.t > t - 1e-9) || !!(act.chase && act.closing), atFeet = hyp(bv[0], bv[1]) < 0.3 && sep < 0.8, on = q.h != null;
    if (on && !future && !atFeet) noC += DT; else noC = 0; const ln = (on && !atFeet && (noC > 0.5 || t - lastMade > 1.8)) || sep > 3.0;
    if (ln && !lostOn) { res.lost++; const s = P.at(t); res.losses.push({ t: +t.toFixed(3), sep: +sep.toFixed(2), seg: s.kind, mode: s.mode, prev: P.at(t - 0.6).kind, action: act.label, speed: +st.s.toFixed(1), why: sep > 3.0 ? "far" : noC > 0.5 ? "no contact planned" : "no contact made", poss: sim.poss ? sim.poss.state : null }); }
    lostOn = ln; sepTr[k] = sep; res.sepSum += sep; res.sepN++; if (sep > res.sepMax) res.sepMax = sep; }
  res.cpu = performance.now() - t0; res.touchesPerS = res.contacts / (dur - 1.2);
  // (each observed loss followed up: the player's next made contact after it, and the ball's largest separation until then — a flag the player
  // answers with a touch 0.3 s later at 1 m is not the same event as a ball never played again)
  for (const l of res.losses) { const nx = sim.contacts.find((c) => !c.missed && c.t > l.t + 1e-9), t1 = nx ? nx.t : sim.t; let m = 0; for (let k = Math.round(l.t / DT); k <= Math.round(t1 / DT) && k < sepTr.length; k++) m = Math.max(m, sepTr[k]);
    l.nextTouch = nx ? +(nx.t - l.t).toFixed(2) : null; l.sepUntil = +m.toFixed(2); }
  if (sim.poss && sim.poss.log) for (const e of sim.poss.log) if (e.to === "FREE" && e.from === "CONTROLLED") { res.exits[e.why] = (res.exits[e.why] || 0) + 1; res.exitList.push(e); }
  return res; }
if ((process.argv[1] || "").endsWith("c_torture.mjs")) { const cfgs = opt("configs", "FREE").split(","), seeds = +opt("seeds", 40), dur = +opt("dur", 60), from = +opt("from", 1), all = {};
  for (const cfg of cfgs) { const R = []; for (let s = from; s < from + seeds; s++) R.push(runOne(cfg, s, dur)); all[cfg] = R;
    const lost = R.reduce((a, r) => a + r.lost, 0), mins = R.reduce((a, r) => a + (r.dur - 1.2), 0) / 60, missed = R.reduce((a, r) => a + r.missed, 0), cpu = R.reduce((a, r) => a + r.cpu, 0), ex = {}; for (const r of R) for (const [k, v] of Object.entries(r.exits)) ex[k] = (ex[k] || 0) + v;
    const why = {}, seg = {}; for (const r of R) for (const l of r.losses) { why[l.why] = (why[l.why] || 0) + 1; seg[l.seg] = (seg[l.seg] || 0) + 1; }
    console.log(`■ ${cfg}: ${mins.toFixed(1)} simulated min (${R.length} seeds × ${dur} s) · OBSERVED LOSSES ${lost} (${(lost / mins).toFixed(2)}/min) · missed contacts ${missed} · touches/s ${(R.reduce((a, r) => a + r.contacts, 0) / (mins * 60)).toFixed(2)} · sep mean ${(R.reduce((a, r) => a + r.sepSum, 0) / R.reduce((a, r) => a + r.sepN, 0)).toFixed(2)} m max ${Math.max(...R.map((r) => r.sepMax)).toFixed(2)} m · CPU ${(cpu / (mins * 60)).toFixed(1)} ms per simulated s, worst tick ${Math.max(...R.map((r) => r.worstTick)).toFixed(1)} ms`);
    console.log(`   losses by cause ${JSON.stringify(why)} · by input segment ${JSON.stringify(seg)}${Object.keys(ex).length ? " · CONTROLLED exits " + JSON.stringify(ex) : ""}`);
    if (has("verbose")) for (const r of R) for (const l of r.losses) console.log(`   seed ${r.seed} ${JSON.stringify(l)}`); }
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(Object.fromEntries(Object.entries(all).map(([k, R]) => [k, R.map(({ exitList, ...r }) => r)])), null, 1)); }

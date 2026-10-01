// ═══ physchar/tools/g2_stepbench.js — G2b MATCHED-STATE STEP BENCH (measurement only) ═════════════════════════════════════════════════════
// Every case replays a deterministic walk (a G2 walker test: its first step, its controller) UNCHANGED up to the start of step K — the body
// reaches step K in exactly the same physical state for every case of that (start, K) — and then changes ONE thing for step K:
//   req   [df, dl, T]: step K's request is commanded explicitly (forward foothold along the heading, width toward the swing side, both from the
//         stance foot's sole centre, and the single-support duration; no in-swing re-decision) — the REACHABLE set at a known state, measured;
//   var   { human, loco, walk }: option overrides active from step K's start (mode "step") or from the double support before it (mode "ds")
//         until step K's touchdown — swing / timing variants compared on the identical step.
// Per case: the state at step K's decision (view and truth), the swing's execution in REAL time (the command a tick applies was computed from
// the feedback view, dFb old: liftoff, peak lag of the actual foot behind its command, peak forward speed, touchdown time and fraction), the
// landing (achieved sole centre vs the final target), clearance, re-contacts, and whether the walk continued (upright steps after K).
// usage: node tools/g2_stepbench.js --cases file.json [--shard i/n] [--test G2W_A8] [--models prefix] [--first df,dl,T] [--walk JSON]
//        [--human JSON] [--ctrl JSON] [--after 3] [--out file.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { buildBodySpec, WORKING_CALIB } from "../pc_body.js";
import { loadJolt } from "../pc_jolt.js";
import { buildPoses } from "../pc_control.js";
import { initOfLoco } from "../pc_ref.js";
import { runG2a, TESTS_G2 } from "../pc_gateg2.js";
import { V, Q } from "../pc_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), PC = path.resolve(here, ".."), ROOT = path.resolve(here, "../../../..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const dir = path.join(ROOT, "assets/characters/outfield/gabriel"), rig = JSON.parse(fs.readFileSync(path.join(dir, "rig.json"), "utf8")), buf = fs.readFileSync(path.join(dir, "mesh.bin"));
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), L = rig.mesh.layout, TA = { Float32Array, Uint16Array, Uint32Array, Uint8Array };
const mesh = {}; for (const k of ["positions", "joints", "weights", "indices"]) mesh[k] = new TA[L[k].elementType](ab, L[k].byteOffset, L[k].elementCount);
const foot = arg("--foot", "F0"), key = arg("--test", "G2W_A8"), after = +arg("--after", 3);
const spec = buildBodySpec(rig, mesh, { calib: WORKING_CALIB, ...(foot !== "F0" ? { footModel: foot } : {}) }), J = await loadJolt(path.join(PC, "vendor/jolt-physics.wasm-compat.js")), poses = buildPoses(spec);
initOfLoco(fs.readFileSync(path.join(PC, "../anim3d/of_loco.js"), "utf8"));
const bi = (nm) => spec.bodies.findIndex(b => b.name === nm), W = spec.totalMass * 9.81, legLen = 0.9243;
const JD = path.resolve(here, "../../../../review_artifacts/physical_character_v1/g2_walker/json");
const MODELS = arg("--models", null) ? Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fs.readFileSync(path.join(JD, `${arg("--models")}${t}.json`), "utf8"))])) : null;
const WALK = arg("--walk", null) ? JSON.parse(arg("--walk")) : {}, HUMAN = arg("--human", null) ? JSON.parse(arg("--human")) : null, CTRLX = arg("--ctrl", null) ? JSON.parse(arg("--ctrl")) : {};
const FIRST = arg("--first", null) ? (arg("--first") + "").split(",").map(Number) : null;

export function benchCase(cs) {
  const [first, atS] = cs.start.split("@"), at = +atS, K = cs.K, n = K + after + 2;
  const steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  const base = TESTS_G2[key].loco.rhythm.walk, char = { ...(base.char || {}) }; if (FIRST) char[0] = { df: FIRST[0], dl: FIRST[1], T: FIRST[2] };
  if (cs.req) char[K] = { df: cs.req[0], dl: cs.req[1], T: cs.req[2] };
  const walk = { ...WALK, char, ...(MODELS || Object.keys(CTRLX).length ? { ctrl: { ...base.ctrl, ...(MODELS ? { models: MODELS } : {}), ...CTRLX } } : {}) };
  let LOCO = null; const CMD = [], VAR = cs.var || null, mode = cs.mode || "step", saved = {};
  const setVar = (l, on) => { if (!VAR) return; for (const [grp, obj] of Object.entries(VAR)) { const tgt = grp === "human" ? l.human.P : grp === "loco" ? l.opts : grp === "walk" ? l.planner.rhythm.walk : grp === "self" ? l : null; if (!tgt) continue;
    for (const [k, v] of Object.entries(obj)) { const sk = grp + "." + k; if (on) { if (!(sk in saved)) saved[sk] = tgt[k]; tgt[k] = v; } else if (sk in saved) { tgt[k] = saved[sk]; delete saved[sk]; } } } };
  const r = runG2a(J, spec, key, { poses, keepStates: true, seconds: 1.6 + n * 0.62, rhythmOver: { steps, at, walk }, ...(HUMAN ? { humanOver: HUMAN } : {}),
    onLoco: (l) => { LOCO = l; const f = l.planner.exec.refSwing; l.planner.exec.refSwing = (R, t, o, nv) => { const out = f(R, t, o, nv); if (!nv && R.stepIndex === K) CMD.push({ n: l.nStep, t, pos: out.pos, vel: out.vel, reach: out.reach, u: out.u }); return out; };
      const ctl = l.control.bind(l); l.control = (truth, x) => { const R = l.planner.exec.R, rh = l.planner.rhythm, act = !!VAR && ((R && R.kind === "rhythmic" && R.stepIndex === K) || (mode === "ds" && rh && rh.i === K && !(R && R.stepIndex !== K)));
        setVar(l, act); const out = ctl(truth, x);
        // (cs.retarget = { tau, d: [fwd, lat] }: a MID-SWING foothold change of step K at τ (view time, from the step start) — the executor's own
        //  retarget path (the same one the in-swing re-decisions use); measures how the swing follows a late change)
        const RT = cs.retarget, Rx = l.planner.exec.R; if (RT && Rx && Rx.kind === "rhythmic" && Rx.stepIndex === K && !Rx._rtDone && Rx.stage === "SWING" && l.planner.exec._o && l.planner.exec._o.t - Rx.tSw0 >= RT.tau) {
          const ex = l.planner.exec, o2 = ex._o, h0 = l.planner.rhythm.wk.h0, hd2 = [Math.sin(h0), Math.cos(h0)], rt2 = [hd2[1], -hd2[0]], sd2 = Rx.sw === "R" ? 1 : -1, tg = Rx.proj.target;
          const tc = [tg[0] + hd2[0] * RT.d[0] + rt2[0] * sd2 * RT.d[1], tg[1] + hd2[1] * RT.d[0] + rt2[1] * sd2 * RT.d[1]], c = { ...Rx.cand, target: tc, tSw: Rx.T }, T0 = Rx.T;
          ex.tool._aim(Rx, o2, c); Rx.T = T0; Rx.tSw = Rx.tSw0; ex._groundEnd(Rx); ex._timedRetarget(o2, Rx, tc, o2.t); Rx.plannedTd.center = tc.slice(); Rx._rtDone = { t: o2.t, tau: o2.t - Rx.tSw0 }; }
        return out; }; } });
  const R_ = r.recs, fall = R_.find(q => q.com[1] < 0.75), tF = fall ? fall.t : Infinity, P = LOCO.planner, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], rt = [hd[1], -hd[0]], dFb = LOCO.dFb;
  const D = P.exec.done.filter(d => d.kind === "rhythmic"), d = D.find(e => e.stepIndex === K);
  const out = { case: cs, hash: r.hash, tFall: Number.isFinite(tF) ? tF : null, upTotal: D.filter(e => e.td && e.td.t < tF).length };
  if (!d) { out.reached = false; return out; }
  out.reached = true; const at_ = (t) => { let lo = 0, hi = R_.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (R_[m].t < t) lo = m; else hi = m; } return R_[hi]; };
  const fw = (v2) => v2[0] * hd[0] + v2[1] * hd[1], sd = d.sw === "R" ? 1 : -1, ps = d.pSt, rel = (p) => [fw([p[0] - ps[0], p[1] - ps[1]]), ((p[0] - ps[0]) * rt[0] + (p[1] - ps[1]) * rt[1]) * sd], st = d.sw === "R" ? "L" : "R";
  // the state at the decision: the VIEW the decision used (dFb old) and the TRUTH at the moment the command starts acting (tSw0 + dFb)
  const qV = at_(d.tSw0), qR = at_(d.tSw0 + dFb), fb = bi("foot_" + d.sw), tb = bi("thigh_" + d.sw), stB = bi("thigh_" + st), stF = bi("foot_" + st);
  const ext = (q, a, b) => { const h = q.states[a].pos, f = q.states[b].pos; return Math.hypot(h[0] - f[0], h[1] - f[1], h[2] - f[2]) / legLen; };
  const sv = (q) => ({ xi: rel(q.xi), com: rel([q.com[0], q.com[2]]), vF: fw([q.vcom[0], q.vcom[2]]), vL: (q.vcom[0] * rt[0] + q.vcom[2] * rt[1]) * sd, h: q.com[1], trailExt: ext(q, tb, fb), stExt: ext(q, stB, stF),
    swFoot: rel([q.states[fb].pos[0], q.states[fb].pos[2]]), swHip: rel([q.states[tb].pos[0], q.states[tb].pos[2]]), hipY: q.states[tb].pos[1], swLoad: q.feet[d.sw].load / W, stLoad: q.feet[st].load / W, swV: fw([q.states[fb].v[0], q.states[fb].v[2]]) });
  out.dec = { view: sv(qV), real: sv(qR), req: cs.req || null, T: d.walkK ? d.walkK.Tss : null, final: d.proj && d.proj.target ? rel(d.proj.target) : null };
  const lg = (P.rhythm.walkerLog || []).find(w => w.i === K); if (lg) out.dec.ctrl = { x: lg.x, u: lg.u, nAdj: lg.adj.length };
  // the swing in real time: physical liftoff (truth: the foot off the turf and unloaded) and touchdown (truth), the command each tick applied
  const tC = d.tSw0 + dFb, tEnd = d.td ? Math.min(tF, d.td.t + 0.1) : Math.min(tF, tC + 1.0), recs = R_.filter(q => q.t >= d.tSw0 && q.t <= tEnd), cm = new Map(); for (const c of CMD) cm.set(c.n, c);
  // (physical liftoff / touchdown = the executor's own sensed events (its view times are physical times): liftoff after 3 airborne ticks,
  //  touchdown once armed — a brief toe tap during the pivot is a RE-CONTACT, not the touchdown)
  const lift = d.liftoff ? at_(d.liftoff.t - 2 / 240) : null, tdP = d.td && d.td.t < tF ? at_(d.td.t) : null;
  const land = CMD.length ? CMD[CMD.length - 1].reach : null, fwF = (p) => land ? (p[0] - land[0]) * hd[0] + (p[2] - land[2]) * hd[1] : null;
  let lagMax = -1e9, lagU = null, lead = -1e9, vmax = 0, minClr = null, recon = 0, prevT = true, inRc = false; const rcs = []; const sh = spec.bodies[fb].planBox || spec.bodies[fb].shapes[0];
  for (const q of recs) { const c = cm.get(q.n), S = q.states[fb]; if (c && land && (!tdP || q.t <= tdP.t)) { const e = fwF(c.pos) - fwF(S.pos); if (e > lagMax) { lagMax = e; lagU = c.u; } lead = Math.max(lead, -e); }
    if (lift && q.t >= lift.t && (!tdP || q.t <= tdP.t)) { vmax = Math.max(vmax, fw([S.v[0], S.v[2]])); if (q.t > lift.t + 0.05 && c && c.u <= 0.85) { const y = Math.min(...[-1, 1].map(sx => V.add(S.pos, Q.rot(S.rot, [sh.pos[0] + sx * sh.he[0], sh.pos[1] - sh.he[1], sh.pos[2] + sh.he[2]]))[1])); minClr = Math.min(minClr ?? 9, y); }
      const tc = q.feet[d.sw].touching, pre = !tdP || q.t < tdP.t - 0.005; if (tc && !prevT && pre) { recon++; rcs.push({ t: q.t - lift.t, dur: 0, peak: 0 }); inRc = true; } if (!tc || !pre) inRc = false;
      if (inRc) { const e = rcs[rcs.length - 1]; e.dur = q.t - lift.t - e.t; e.peak = Math.max(e.peak, q.feet[d.sw].load / W); } prevT = tc; } }
  if (cs.profile && land) out.profile = recs.filter(q => cm.get(q.n)).map(q => { const c = cm.get(q.n), S = q.states[fb]; return [q.t - tC, c.u, fwF(c.pos), fwF(S.pos), c.pos[1], S.pos[1], c.vel ? fw([c.vel[0], c.vel[2]]) : null, fw([S.v[0], S.v[2]]), q.feet[d.sw].touching ? 1 : 0, q.feet[d.sw].load / W, ext(q, tb, fb)]; });
  const Sd = tdP ? tdP.states[fb] : null;
  out.swing = { liftReal: lift ? lift.t - tC : null, tdReal: tdP ? tdP.t - tC : null, uAtView: d.td ? d.td.uAt : null, uCmdAtTd: tdP && cm.get(tdP.n) ? cm.get(tdP.n).u : null, lagMax: land ? lagMax : null, lagU, leadMax: land ? lead : null, vmax, minClr, recon,
    footVTd: Sd ? [fw([Sd.v[0], Sd.v[2]]), Sd.v[1]] : null, ankleVsLand: Sd ? fwF(Sd.pos) : null, status: d.status };
  out.land = { final: out.dec.final, ach: d.td && d.td.t < tF ? rel(d.td.center) : null }; if (out.land.ach && out.land.final) out.land.err = [out.land.ach[0] - out.land.final[0], out.land.ach[1] - out.land.final[1]];
  // (a TRIP: a re-contact carrying > 0.2 BW, or lasting > 40 ms, or after the first 80 ms of the air phase (a mid-swing scuff); a brief light toe
  //  tap during the pivot is recorded but is not a failure)
  out.swing.recons = rcs; out.swing.trip = rcs.some(e => e.peak > 0.2 || e.dur > 0.04 || e.t > 0.08);
  out.swing.early = d.td ? d.td.uAt < 0.8 : null; out.swing.landed = !!(d.td && d.td.t < tF && d.td.uAt >= 0.8 && !out.swing.trip);
  out.swing.ok = out.swing.landed && !!out.land.err && Math.abs(out.land.err[0]) <= 0.08;
  // the state at touchdown and at the next step's start (what this step produced), and the continuation
  if (d.td && d.td.t < tF) { const q = at_(d.td.t); out.td = { xi: rel(q.xi), vF: fw([q.vcom[0], q.vcom[2]]), leadExt: ext(q, tb, fb) }; }
  const nx = D.find(e => e.stepIndex === K + 1); if (nx && nx.tSw0 < tF) { const q = at_(nx.tSw0), p2 = nx.pSt; out.next = { xi: [fw([q.xi[0] - p2[0], q.xi[1] - p2[1]]), ((q.xi[0] - p2[0]) * rt[0] + (q.xi[1] - p2[1]) * rt[1]) * -sd], vF: fw([q.vcom[0], q.vcom[2]]) }; }
  out.after = D.filter(e => e.stepIndex > K && e.stepIndex <= K + after && e.td && e.td.t < tF).length;
  return out;
}
if (process.argv[1] && process.argv[1].endsWith("g2_stepbench.js")) {
  const cs = arg("--cases"), all = JSON.parse(cs.trim().startsWith("[") ? cs : fs.readFileSync(cs, "utf8")), [si, sn] = (arg("--shard", "0/1") + "").split("/").map(Number);
  const mine = all.filter((_, i) => i % sn === si), res = [], t0 = Date.now();
  for (const c of mine) { const o = benchCase(c); res.push(o); if (arg("--verbose")) console.log(JSON.stringify({ c: c.id ?? c, ok: o.swing && o.swing.ok, err: o.land && o.land.err, after: o.after })); }
  const outP = arg("--out", null); if (outP) fs.writeFileSync(outP, JSON.stringify({ generated: "tools/g2_stepbench.js", test: key, foot, n: res.length, cpu: (Date.now() - t0) / 1000, rows: res }));
  console.log(`stepbench: ${res.length} cases · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

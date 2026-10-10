// ITS-1 run harness (ITS1_PREREG.md, frozen cb886b14): one run per process (Jolt WASM leaks per sim), or a SEQUENCE in one process (history independence).
// usage (worktree root): V13_WT=<5042230 worktree> V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node .../its_run.mjs <outDir> <runId>[,<runId>...]
// The physics receives only: the initialized state, the impulse request (body, body-fixed point, vector, step, duration) and, for D-1 only, the
// authoritative root trajectory. No outcome class, reaction state or support label is passed to the plant.
import fs from "fs"; import path from "path"; import zlib from "zlib"; import crypto from "crypto"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../.."), P2 = path.resolve(here, "../../../../sandbox/visual/physchar2") + "/";
const INIT = await import(path.join(here, "its_init.mjs")), SIMM = await import(path.join(here, "its_sim.mjs")), MAP = await import(path.join(ROOT, "pi1/rev1/scripts/pcg_rev1.mjs"));
const { loadJolt } = await import(P2 + "core/v2_jolt.js"), { pi1RunnerSpec } = await import(P2 + "spec/v2_pi1_runner.js");
const { L, comW, Mtot, sim2r, lawPoseAt } = INIT; const { V, Q, B, NB, bi, loadAir, bodyLowest, bodySep, SELF_PAIRS, sdShape } = L;
const G = 9.81, r7 = (x) => (x == null ? null : +(+x).toPrecision(7)), rv = (v) => v.map(r7);
const deepFreeze = (o) => { if (o && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) deepFreeze(o[k]); } return o; };
const REC = path.join(ROOT, "interaction_benchmark/records");
// ── frozen run table (ITS1_PREREG.md §1 / §5) ──
const STATES = { "S-A": { cs: "rx_free_leg", tick: 60, sub: 3 }, "S-A2": { cs: "rx_free_leg", tick: 51, sub: 1 }, "S-B": { cs: "rx_planted_leg", tick: 49, sub: 3 }, "S-B2": { cs: "rx_glancing", tick: 66, sub: 3 } };
const C_POINT = { cs: "rx_planted_leg", tick: 49, sub: 3, body: "shank_L" }, nB = [0.059, 0.998];
const auth = { kind: "auth" }, cImp = (Jm) => ({ kind: "matched", J: Jm, n: nB, point: C_POINT });
const RUNS = {
  "A-ctl": { st: "S-A", imp: null, hor: 1.0 }, "A": { st: "S-A", imp: auth, hor: 1.0 },
  "A2-ctl": { st: "S-A2", imp: null, hor: 1.0 }, "A2": { st: "S-A2", imp: auth, hor: 1.0 },
  "B-ctl": { st: "S-B", imp: null, hor: 1.5 }, "B": { st: "S-B", imp: auth, hor: 1.5 },
  "B2-ctl": { st: "S-B2", imp: null, hor: 1.5 }, "B2": { st: "S-B2", imp: auth, hor: 1.5 },
  "C-hi-air": { st: "S-A2", imp: cImp(144.13), hor: 1.0 }, "C-hi-pl": { st: "S-B", imp: cImp(144.13), hor: 1.0 },
  "C-lo-air": { st: "S-A2", imp: cImp(2.82), hor: 1.0 }, "C-lo-pl": { st: "S-B", imp: cImp(2.82), hor: 1.0 },
  "D1-A-ctl": { st: "S-A", imp: null, hor: 1.0, support: true }, "D1-A": { st: "S-A", imp: auth, hor: 1.0, support: true },
  "D2-A": { st: "S-A", imp: auth, hor: 1.0, dur: 4 }, "D2-B": { st: "S-B", imp: auth, hor: 1.5, dur: 4 },
  "D3-A-l0-ctl": { st: "S-A", imp: null, hor: 1.0, lead: 0 }, "D3-A-l0": { st: "S-A", imp: auth, hor: 1.0, lead: 0 },
  "D3-A-l4-ctl": { st: "S-A", imp: null, hor: 1.0, lead: 4 }, "D3-A-l4": { st: "S-A", imp: auth, hor: 1.0, lead: 4 },
  "D3-B-l0-ctl": { st: "S-B", imp: null, hor: 1.5, lead: 0 }, "D3-B-l0": { st: "S-B", imp: auth, hor: 1.5, lead: 0 },
  "D3-B-l4-ctl": { st: "S-B", imp: null, hor: 1.5, lead: 4 }, "D3-B-l4": { st: "S-B", imp: auth, hor: 1.5, lead: 4 } };
const [OUTDIR, IDS] = process.argv.slice(2); fs.mkdirSync(OUTDIR, { recursive: true });
// ITS_DIAG (STOP diagnostics only, ITS1_STOP_PF0.md; default empty = the preregistered path): ctrlOff, noC3, lift0, footFlat
const DIAG = Object.fromEntries((process.env.ITS_DIAG || "").split(",").filter(Boolean).map(k => [k, true]));
const J = await loadJolt(P2 + "vendor/jolt-physics.wasm-compat.js"), spec = pi1RunnerSpec();
const recCache = {}; const rec = (cs, mode) => { const k = cs + mode; if (!recCache[k]) { const dir = mode === "lc1" ? path.join(REC, "lc1") : path.join(REC, "v13"), f = `${cs}_${mode === "off" ? "OFF" : "LOCO"}.json.gz`;
  recCache[k] = { R: deepFreeze(loadAir(dir, f)), sha: crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, f))).digest("hex") }; } return recCache[k]; };
const evOf = (R, tick, sub) => R.events.find(e => e.kind === "PLAYER_CONTACT" && e.tick === tick && e.sub === sub);
const toPhys = (pSim, off) => V.sub(sim2r(pSim), off), dir3 = (n) => { const d = [n[0], 0, -n[1]], l = V.len(d); return V.sc(d, 1 / l); };
const sdBody = (i, st, p) => Math.min(...B[i].shapes.map(s => sdShape(s, st, p)));
function presDiff(Rp, tau0, S0render) { const mp = MAP.makeMapper(Rp, { knee: "RK", rf1: true }), r = Math.ceil(tau0 - 1e-9) - 1, w = tau0 - r, A = mp.poseAt(r - 1).S, Bp = mp.poseAt(r).S;
  const P = A.map((a, i) => V.add(a.pos, V.sc(V.sub(Bp[i].pos, a.pos), w))); let mx = 0, who = null; const per = B.map((b, i) => { const d = V.dist(P[i], S0render[i].pos); if (d > mx) { mx = d; who = b.name; } return { body: b.name, mm: +(d * 1000).toFixed(1) }; });
  return { row: r, w, maxMm: +(mx * 1000).toFixed(1), who, pelvisDyMm: +((S0render[0].pos[1] - P[0][1]) * 1000).toFixed(1), feetContact: Rp.pres[r].feet.map(f => ({ contact: f.contact, mode: f.mode })), per }; }
async function runOne(id) {
  const cfg = RUNS[id]; if (!cfg) throw new Error("unknown run " + id); const t0all = performance.now();
  const stDef = STATES[cfg.st], { R, sha: shaOff } = rec(stDef.cs, "off"), gh0 = R.gameplayHash, ev = evOf(R, stDef.tick, stDef.sub), tauC = stDef.tick - 1 + stDef.sub / 4, lead = cfg.lead ?? 1, tau0 = tauC - lead / 4;
  // initializer (needs the passive model's joint frames: a throwaway plant only for P, never stepped)
  const tmp = new SIMM.ITSim(J, spec, { S: INIT.L.Z0.map(z => ({ pos: z.pos, rot: z.rot })), vel: B.map(() => ({ v: [0, 0, 0], w: [0, 0, 0] })), side: "L" }, null, { seconds: 0.01 });
  const init = INIT.buildInit(R, spec, tmp.P, tau0, tauC, ev, { noC3: !!DIAG.noC3, lift0: !!DIAG.lift0, footFlat: !!DIAG.footFlat }); const dy = init.info.E2.dyMm / 1000, off = init.off;
  // impulse request
  let imp = null, contact = null;
  if (cfg.imp) { let body, pW, Jv, srcEv, srcR = R, srcTau = tauC;
    if (cfg.imp.kind === "auth") srcEv = ev;
    if (cfg.imp.kind === "matched") { const pr = rec(cfg.imp.point.cs, "off"); srcR = pr.R; srcEv = evOf(srcR, cfg.imp.point.tick, cfg.imp.point.sub); srcTau = cfg.imp.point.tick - 1 + cfg.imp.point.sub / 4; body = bi(cfg.imp.point.body); }
    const SEG = { foot_L: "foot_L", foot_R: "foot_R", toe_L: "foot_L", toe_R: "foot_R", shin_L: "shank_L", shin_R: "shank_R", thigh_L: "thigh_L", thigh_R: "thigh_R", pelvis: "pelvis", torso: "abdomen" };
    if (cfg.imp.kind === "auth") body = bi(SEG[ev.seg]);
    // carry the source contact point into the struck body's frame with the SOURCE record's law pose at its τ_c (same dy / off convention of that source)
    // the contact was computed on the UNSHIFTED simulation pose, so the point is carried with dy = 0 (it then moves with the body)
    const Sc = lawPoseAt(srcR, srcTau, 0, off), p = toPhys(srcEv.point, off), pLocal = Q.rot(Q.conj(Sc[body].rot), V.sub(p, Sc[body].pos));
    const Jm = cfg.imp.kind === "auth" ? ev.J : cfg.imp.J, n = cfg.imp.kind === "auth" ? ev.normal : cfg.imp.n; Jv = V.sc(dir3(n), Jm);
    imp = { body, pLocal, J: Jv, nImp: lead, dur: cfg.dur || 1 };
    contact = { kind: cfg.imp.kind, source: { case: cfg.imp.kind === "auth" ? stDef.cs : cfg.imp.point.cs, tick: srcEv.tick, sub: srcEv.sub, seg: srcEv.seg, prim: srcEv.prim, J: srcEv.J, normal: srcEv.normal, point: srcEv.point, vn: srcEv.vn, vt: srcEv.vt, vT: srcEv.vT, cls: srcEv.cls },
      body: B[body].name, pLocal: rv(pLocal), Jrequested: rv(Jv), Jmag: Jm, dirPhys: rv(dir3(n)), nImp: lead, dur: imp.dur }; }
  // support (D-1): the authoritative root trajectory (REV2 rootAt rule, current row)
  let support = null; if (cfg.support) { const rootAt = (tau) => { const k = Math.max(1, Math.ceil(tau - 1e-9) - 1), w = tau - k, a = R.rows[k - 1], b = R.rows[Math.min(R.rows.length - 1, k)], lp = (i) => a[i] + (b[i] - a[i]) * w;
      return { pos: V.sub([lp(8), 0, -lp(9)], off), vel: [lp(10), 0, -lp(11)], facing: lp(12) }; }; support = { rootAt, tau0 }; }
  const steps = lead + Math.round(cfg.hor * 240), sim = new SIMM.ITSim(J, spec, { S: init.S, vel: init.vel, side: init.side }, imp, { seconds: steps / 240 + 0.02, support, diagCtrlOff: !!DIAG.ctrlOff });
  // presentation comparison (read-only)
  const S0render = init.S.map(s => ({ pos: V.add(s.pos, off), rot: s.rot })), pres = { v13: presDiff(rec(stDef.cs, "loco").R, tau0, S0render), lc1: presDiff(rec(stDef.cs, "lc1").R, tau0, S0render) };
  // ── per-step measurement ──
  const dt = sim.dt, fi = init.footIndex, sd = init.side, FOOT = { L: bi("foot_L"), R: bi("foot_R") }, pel = bi("pelvis"), out = [], digests = [], ticks = [];
  const comOf = (S) => V.sc(S.reduce((s, b, i) => V.add(s, V.sc(b.com, B[i].mass)), [0, 0, 0]), 1 / Mtot);
  const momOf = (S) => { const c = comOf(S); let P = [0, 0, 0], Lc = [0, 0, 0]; const per = S.map((b, i) => { const wl = Q.rot(Q.conj(b.rot), b.w), I = B[i].inertia, Il = [0, 1, 2].map(r => I[r][0] * wl[0] + I[r][1] * wl[1] + I[r][2] * wl[2]), p = V.sc(b.v, B[i].mass), h = V.add(V.cross(V.sub(b.com, c), p), Q.rot(b.rot, Il)); P = V.add(P, p); Lc = V.add(Lc, h); return { p, h }; }); return { P, L: Lc, c, per }; };
  const digest = (S) => { const f = new Float64Array(S.length * 13); S.forEach((b, i) => f.set([...b.pos, ...b.rot, ...b.v, ...b.w], i * 13)); return crypto.createHash("sha1").update(Buffer.from(f.buffer)).digest("hex").slice(0, 16); };
  let stPrev = sim.st.map(b => ({ ...b, v: b.v.slice(), w: b.w.slice(), com: b.com.slice() })), Eprev = sim.last.E; const m0 = momOf(sim.st), pelY0 = sim.st[pel].com[1];
  const slip = { L: 0, R: 0 }, noC = { L: 0, R: 0 }; let supportLost = null, firstNonFoot = null, fallTau = null, cpuSim = 0, cpuMeas = 0, maxW = 0;
  const c0 = { step: sim.cpu.step, passive: sim.cpu.passive, measure: sim.cpu.measure, act: sim.cpu2.act, probe: sim.cpu2.probe, pd: sim.cpu3.pd };
  digests.push(digest(sim.st));
  for (let s = 0; s < steps; s++) {
    const tq0 = performance.now(); const ok = sim.tick(); const tq1 = performance.now(); if (!ok) break; cpuSim += tq1 - tq0;
    const tm0 = performance.now(), tau = tau0 + sim.n / 4, S = sim.st, mo = momOf(S);
    // impulse work exactly at the application point (this step only)
    let Wimp = 0, Jstep = [0, 0, 0]; const il = sim.impLog.find(x => x.n === sim.n - 1); if (il) { const b1 = S[imp.body], vp0 = V.add(il.stPre.v, V.cross(il.stPre.w, V.sub(il.at, il.stPre.com))), vp1 = V.add(b1.v, V.cross(b1.w, V.sub(il.at, b1.com))); Wimp = V.dot(il.F, V.sc(V.add(vp0, vp1), 0.5)) * dt; Jstep = V.sc(il.F, dt); }
    const lB = sim.sup ? sim.sup.lambdas() : null, WB = lB ? V.dot(lB.lin, V.sc(V.add(stPrev[pel].v, S[pel].v), 0.5)) + V.dot(lB.rot, V.sc(V.add(stPrev[pel].w, S[pel].w), 0.5)) : 0;
    const Wact = (sim.actRes || []).reduce((a, r) => a + r.W, 0), Dst = sim.A.Dstep[sim.A.Dstep.length - 1] || 0, E = sim.last.E, resid = (E - Eprev) - (Wact + Wimp + WB - Dst); Eprev = E;
    // feet and turf contacts
    const feet = {}, nonFoot = []; for (const m of (sim.lastContacts || [])) { if (!(m.depth > -0.0005)) continue; const bb = m.a === -1 ? m.b : m.b === -1 ? m.a : null; if (bb == null || bb < 0) continue; if (!/^foot_/.test(B[bb].name)) nonFoot.push(B[bb].name); }
    for (const [n, side] of [[0, "L"], [1, "R"]]) { const f = FOOT[side], b = S[f], pts = []; for (const m of (sim.lastContacts || [])) { if (!((m.a === -1 && m.b === f) || (m.b === -1 && m.a === f)) || !(m.depth > -0.0005)) continue; for (const p of (m.a === f ? m.pts : m.pts2)) pts.push(p); }
      let sv = 0; if (pts.length) { for (const p of pts) { const vp = V.add(b.v, V.cross(b.w, V.sub(p, b.com))); sv += Math.hypot(vp[0], vp[2]); } sv /= pts.length; slip[side] += sv * dt; noC[side] = 0; } else noC[side]++;
      const pr = sim.probeRows ? sim.probeRows[n] : null; feet[side] = { c: pts.length ? 1 : 0, sv: r7(sv), lowMm: r7(bodyLowest(B[f], b).y * 1000), Jc: pr ? rv(pr.Jc) : null, slipMm: r7(slip[side] * 1000) }; }
    if (supportLost == null && (noC[sd] >= 3 || slip[sd] >= 0.030)) supportLost = { tau, by: noC[sd] >= 3 ? "contact lost ≥ 3 steps" : "slip ≥ 30 mm", slipMm: +(slip[sd] * 1000).toFixed(1) };
    if (firstNonFoot == null && nonFoot.length) firstNonFoot = { tau, bodies: [...new Set(nonFoot)] }; if (fallTau == null && S[pel].com[1] <= 0.35) fallTau = tau;
    // momentum closure (external impulses: collision, foot contacts (probes), gravity, support)
    const Jc = ["L", "R"].reduce((a, side) => (feet[side].Jc ? V.add(a, feet[side].Jc) : a), [0, 0, 0]), dP = V.sub(mo.P, momOf(stPrev).P), ext = V.add(V.add(V.add(Jstep, Jc), [0, -G * Mtot * dt, 0]), lB ? lB.lin : [0, 0, 0]), clos = V.len(V.sub(dP, ext));
    let pc = 0; for (let i = 0; i < NB; i++) pc = Math.max(pc, V.dist(S[i].com, V.add(stPrev[i].com, V.sc(S[i].v, dt))));
    const nSat = (sim.actRes || []).filter(r => r.sat).length, fracMax = Math.max(0, ...(sim.actRes || []).map(r => r.frac)); for (const b of S) maxW = Math.max(maxW, V.len(b.w));
    out.push({ tau, n: sim.n, bodies: S.map(b => [...rv(b.pos), ...rv(b.rot), ...rv(b.com), ...rv(b.v), ...rv(b.w)]), P: rv(mo.P), L: rv(mo.L), com: rv(mo.c), feet, nonFoot: [...new Set(nonFoot)], E: r7(E), Wact: r7(Wact), Wimp: r7(Wimp), WB: r7(WB), D: r7(Dst), resid: r7(resid),
      clos: r7(clos), closEval: nonFoot.length === 0, pcMm: r7(pc * 1000), sepMm: r7(sim.last.sepMax * 1000), hardExcDeg: r7(sim.last.hardExc * 180 / Math.PI), penMm: r7(sim.last.pen * 1000), nSat, fracMax: r7(fracMax), B: lB ? { J: rv(lB.lin), H: rv(lB.rot) } : null, flags: sim.contactFlags.slice() });
    digests.push(digest(S));
    if (sim.n % 4 === 0) { let mMin = Infinity, mWho = null; spec.joints.forEach((jj, k) => { const per = sim.up.ev.per[k]; if (!per) return; for (let i = 0; i < 3; i++) { if (jj.locked.includes("xyz"[i])) continue; const th = per.th[i], hT = per.T[i] && per.T[i].hard, lo = hT ? hT[0] : jj.limits.hard.lo[i], hi = hT ? hT[1] : jj.limits.hard.hi[i], m = Math.min(th - lo, hi - th); if (m < mMin) { mMin = m; mWho = jj.name + "." + "xyz"[i]; } } });
      ticks.push({ tau, marginDeg: r7(mMin * 180 / Math.PI), marginWho: mWho, angles: spec.joints.map((jj, k) => { const per = sim.up.ev.per[k]; return per ? per.th.map(x => r7(x * 180 / Math.PI)) : null; }) }); }
    stPrev = S.map(b => ({ ...b, v: b.v.slice(), w: b.w.slice(), com: b.com.slice() })); cpuMeas += performance.now() - tm0; }
  // momentum snapshots (before the impulse = state at τ_c; after = +1 step, +0.05, +0.10, +0.15, +0.50 s)
  const at = (tau) => out.find(o => Math.abs(o.tau - tau) < 1e-9), snapAt = (tau) => { const o = Math.abs(tau - tau0) < 1e-9 ? null : at(tau); const S = o ? o.bodies.map(a => ({ pos: a.slice(0, 3), rot: a.slice(3, 7), com: a.slice(7, 10), v: a.slice(10, 13), w: a.slice(13, 16) })) : null; if (!S) return null; const mo = momOf(S); return { tau, P: rv(mo.P), L: rv(mo.L), per: mo.per.map((x, i) => ({ body: B[i].name, p: rv(x.p), h: rv(x.h) })) }; };
  const snaps = [tauC, tauC + 0.25, tauC + 3, tauC + 6, tauC + 9, tauC + 30].map(t => (t === tauC && lead === 0 ? { tau: tauC, P: rv(m0.P), L: rv(m0.L), per: m0.per.map((x, i) => ({ body: B[i].name, p: rv(x.p), h: rv(x.h) })) } : snapAt(t)));
  // contact facts at the impulse step
  let contactAt = null; if (imp && sim.impLog.length) { const il = sim.impLog[0], b = { pos: null }, stPre = il.stPre, vp = V.add(stPre.v, V.cross(stPre.w, V.sub(il.at, stPre.com))), vT = contact.source.vT ? [contact.source.vT[0], 0, -contact.source.vT[1]] : null;
    const Spre = (lead === 0 ? init.S.map((s, i) => ({ pos: s.pos, rot: s.rot })) : (() => { const o = at(tauC); return o.bodies.map(a => ({ pos: a.slice(0, 3), rot: a.slice(3, 7) })); })());
    const sdStruck = sdBody(imp.body, Spre[imp.body], il.at); let near = null; for (let i = 0; i < NB; i++) { if (i === imp.body) continue; const d = sdBody(i, Spre[i], il.at); if (!near || d < near.d) near = { body: B[i].name, d }; }
    const rel = vT ? V.sub(vT, vp) : null, n2 = contact.source.normal, t2 = [-n2[1], n2[0]], simRel = [contact.source.vn * n2[0] + (contact.source.vt || 0) * t2[0], contact.source.vn * n2[1] + (contact.source.vt || 0) * t2[1]], rel2 = rel ? [rel[0], -rel[2]] : null;
    const ang = rel2 ? Math.acos(Math.max(-1, Math.min(1, (rel2[0] * simRel[0] + rel2[1] * simRel[1]) / (Math.hypot(...rel2) * Math.hypot(...simRel) || 1)))) * 180 / Math.PI : null;
    contactAt = { stepN: il.n, atPhys: rv(il.at), atRender: rv(V.add(il.at, off)), surfaceDistMm: r7(sdStruck * 1000), nearestOther: near ? { body: near.body, mm: r7(near.d * 1000) } : null, vPointPre: rv(vp), relVelPhys_tacklerMinusRunner: rel ? rv(rel) : null, relVel2D: rel2 ? rv(rel2) : null, simRel2D: rv(simRel), relAngleDeg: r7(ang) }; }
  const res = { prereg: "ITS1_PREREG.md cb886b14", diag: DIAG, id, cfg: { st: cfg.st, imp: cfg.imp ? (cfg.imp.kind === "auth" ? "auth" : { ...cfg.imp }) : null, hor: cfg.hor, lead, dur: cfg.dur || 1, support: !!cfg.support },
    configHash: crypto.createHash("sha1").update(JSON.stringify({ spec: spec.human ? spec.human.id : "pi1", gains: sim.ctrl.gain, gainSwing: sim.ctrl.gainSwing, imp: imp ? { body: imp.body, pLocal: imp.pLocal, J: imp.J, dur: imp.dur } : null, steps, support: !!cfg.support })).digest("hex").slice(0, 16),
    authoritative: { case: stDef.cs, recordSha256: shaOff, gameplayHash: gh0, contactEvent: ev, tauC, reaction: R.react.map((x, i) => (x ? { row: i, kind: x.kind } : null)).filter((x, i, a) => x && (!a[i - 1] || a[i - 1].kind !== x.kind)), fallState: R.react.find(x => x && x.kind === "FALL") || null },
    init: { tau0, lead, side: init.side, off, info: { ...init.info, lawS: undefined, refVel: undefined }, initWrites: sim.initWrites, state: init.S.map((s, i) => ({ body: B[i].name, pos: rv(s.pos), rot: rv(s.rot), v: rv(init.vel[i].v), w: rv(init.vel[i].w) })), m0: { P: rv(m0.P), L: rv(m0.L), com: rv(m0.c), pelvisY: r7(pelY0) }, presentationDiff: pres },
    contact, contactAt, impulse: imp ? { steps: sim.impSteps, Japplied: rv(sim.impJ), ledgerJext: rv(sim.ledger.Jext), ledgerHext: rv(sim.ledger.Hext), dev: r7(V.dist(sim.impJ, imp.J)), ledgerDev: r7(V.dist(sim.ledger.Jext, imp.J)) } : { steps: sim.impSteps, ledgerJext: rv(sim.ledger.Jext), ledgerHext: rv(sim.ledger.Hext) },
    writesAfter: sim.ledger.authorityWrites - sim.initWrites - 0, supportLost, firstNonFoot, fallTau, snaps, maxAngVel: r7(maxW), selfPenMaxMm: r7(sim.A.selfPenMax * 1000), turfPenMaxMm: r7(sim.A.turfPenMax * 1000), sepMaxMm: r7(sim.A.sepMax * 1000), finite: sim.A.finite,
    actuators: { overCap: sim.act.led.flat().filter(Boolean).reduce((a, l) => a + l.overCap, 0), satTicks: sim.act.led.flat().filter(Boolean).reduce((a, l) => a + l.satTicks, 0), peak: sim.act.led.flatMap((row, k) => row.map((l, i) => (l ? { axis: spec.joints[k].name + "." + "xyz"[i], peakFrac: r7(l.peakFrac), satTicks: l.satTicks } : null))).filter(Boolean).sort((a, b) => b.peakFrac - a.peakFrac).slice(0, 8) },
    cpu: { steps: out.length, simMsTotal: r7(cpuSim), measureMsTotal: r7(cpuMeas), jolt: r7(sim.cpu.step - c0.step), passiveActImpulse: r7(sim.cpu.passive - c0.passive), g1measure: r7(sim.cpu.measure - c0.measure), act: r7(sim.cpu2.act - c0.act), probes: r7(sim.cpu2.probe - c0.probe), postureDriver: r7(sim.cpu3.pd - c0.pd) },
    digests, outputHash: null, steps: out, ticks, wallMs: r7(performance.now() - t0all) };
  res.outputHash = crypto.createHash("sha1").update(JSON.stringify({ digests, steps: out.map(o => [o.P, o.L, o.feet, o.resid, o.clos]), imp: res.impulse })).digest("hex").slice(0, 16);
  fs.writeFileSync(path.join(OUTDIR, id + ".json.gz"), zlib.gzipSync(JSON.stringify(res)));
  console.log(id.padEnd(12), cfg.st, "lead", lead, "dy", init.info.E2.dyMm, "mm keDist", init.info.E3.keDistJ, "J | steps", out.length, "imp", sim.impSteps, imp ? "|J|=" + V.len(sim.impJ).toFixed(3) : "", "supportLost", supportLost ? supportLost.tau : "-", "nonFoot", firstNonFoot ? firstNonFoot.tau + " " + firstNonFoot.bodies.join("/") : "-", "fall", fallTau ?? "-", "maxW", r7(maxW), "hash", res.outputHash, "wall", Math.round(res.wallMs), "ms");
  return res;
}
const ids = IDS.split(","); const seq = []; for (const id of ids) seq.push(await runOne(id));
if (ids.length > 1) fs.writeFileSync(path.join(OUTDIR, "SEQUENCE_" + ids.join("+") + ".json"), JSON.stringify(seq.map(r => ({ id: r.id, outputHash: r.outputHash, digestsHash: crypto.createHash("sha1").update(r.digests.join()).digest("hex").slice(0, 16) }))));
// neutrality: the record files are unchanged by the run
for (const k of Object.keys(recCache)) { const [cs, mode] = [k.replace(/(off|loco|lc1)$/, ""), k.match(/(off|loco|lc1)$/)[0]]; const dir = mode === "lc1" ? path.join(REC, "lc1") : path.join(REC, "v13"), f = `${cs}_${mode === "off" ? "OFF" : "LOCO"}.json.gz`;
  if (crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, f))).digest("hex") !== recCache[k].sha) { console.error("RECORD CHANGED", f); process.exit(3); } }
process.exit(0);

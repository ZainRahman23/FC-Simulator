// DIAGNOSTIC (post-scan, NON-GATING, not a revision): the REV2 scan with HG-A waived in the PS-2 selector only, to see what fails NEXT behind HG-A.
// Nothing selected here may be used as a representative. Built on probe_cg6_prestep_and_discontinuity.mjs (as-run fields unchanged; cg6pre / discAt added).
// PROBE (post-scan, diagnostic only; not part of the frozen scan): scan_rev2.mjs unchanged except (a) CG-6 relative velocity ALSO evaluated from the
// pre-contact state (the step before the first contact step, i.e. before the contact impulse is applied), (b) the location of the retained 10 mm metric maximum.
// Writes cg6pre / discAt into each case; the as-run fields are untouched.
// PI-1 REV2 compatibility scan (PI1_REV2_PREREG.md §2 – §5, A1): per V1.3 candidate — PS-2 selector (latest frame in [trigger, first contact tick − 2]
// passing the handoff gate HG), the promoted F0 state, the PI-1 REV2 physics against the articulated stand-in until the decisive contact + 0.10 s,
// and the correspondence of the REALIZED physical contact with the decisive gameplay contact.
// usage (worktree root): V13_WT=<v1.3 wt> V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node .../scan_rev2.mjs <airDir> <out.json> <case>[,<case>...]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), P2 = path.resolve(here, "../../../../../sandbox/visual/physchar2") + "/";
const M = await import(new URL("../../rev1/scripts/pcg_rev1.mjs", import.meta.url).href), M0 = await import(new URL("../../trackB/scripts/pcg_f0.mjs", import.meta.url).href);
const SIM = await import(new URL("./pi1_rev2_sim.mjs", import.meta.url).href), { loadJolt } = await import(P2 + "core/v2_jolt.js"), { pi1RunnerSpec } = await import(P2 + "spec/v2_pi1_runner.js");
const { L, makeMapper, geomRowsRev1, rigGeom, angVel, SEGMAP, ADJ, AXES, relRot, TOL } = M; const { V, Q, B, NB, bi, loadAir, bodySep, bodyLowest, capsulePen, SELF_PAIRS, Z0 } = L;
const [AIRDIR, OUT, CASES] = process.argv.slice(2), J = await loadJolt(P2 + "vendor/jolt-physics.wasm-compat.js"), RANK = { NEGLIGIBLE: 0, CORRECTION: 1, STUMBLE: 2, FALL: 3 };
const segR = (g, t) => (g.ra != null ? g.ra + (g.rb - g.ra) * Math.max(0, Math.min(1, t)) : g.r), sim2r = (p) => [p[0], p[2], -p[1]];
const comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal));
// PI-1 §6.2 initial velocities: 2nd-order backward difference of the same mapping, propagated from the pelvis through the tree
function initVel(mapper, k) { const S2 = mapper.poseAt(k).S, S1 = mapper.poseAt(k - 1).S, S0 = mapper.poseAt(k - 2).S, w = [], v = [];
  for (let i = 0; i < NB; i++) w[i] = V.sub(V.sc(angVel(S1[i].rot, S2[i].rot), 1.5), V.sc(angVel(S0[i].rot, S1[i].rot), 0.5));
  v[0] = V.sub(V.sc(V.sub(comW(S2, 0), comW(S1, 0)), 1.5 * 60), V.sc(V.sub(comW(S1, 0), comW(S0, 0)), 0.5 * 60));
  for (const j of L.spec.joints) { const p = j.parentIndex, c = j.childIndex, jp = S2[c].pos, vj = V.add(v[p], V.cross(w[p], V.sub(jp, comW(S2, p)))); v[c] = V.add(vj, V.cross(w[c], V.sub(comW(S2, c), jp))); }
  return { v, w, S: S2 }; }
const Mtot = B.reduce((s, b) => s + b.mass, 0), comVel = (v) => V.sc(v.reduce((s, x, i) => V.add(s, V.sc(x, B[i].mass)), [0, 0, 0]), 1 / Mtot);
// the handoff gate HG at row k (§2)
function handoff(R, k, mapper, G) { const g = geomRowsRev1(R, k, k - 6, mapper, G), fails = g.fails.slice();
  const p5 = Math.max(g.foot.L.physVsPresDeg, g.foot.R.physVsPresDeg); if (p5 > 5) fails.push("P5_footDeg");
  const kin = M0.kinRows(R, k, mapper.poseAt); fails.push(...kin.fails);
  const iv = initVel(mapper, k), vc = comVel(iv.v), row = R.rows[k], va = [row[10], 0, -row[11]], dA = Math.hypot(vc[0] - va[0], vc[2] - va[2]); if (dA > 0.05) fails.push("HGA_comVsAuth");
  const d = R.def[k]; if (!(d && d.kind === "SLIDE" && d.launchT >= R.slide.extT - 1e-9)) fails.push("HGT_extension");
  return { k, pass: !fails.length, fails, P5: +p5.toFixed(2), HGA: +dA.toFixed(4), foot: g.foot, P1: g.P1_pelvisMm, P4ankle: g.P4_ankleMm, P9: { L: g.foot.L.physLowestMm, R: g.foot.R.physLowestMm }, P11: g.P11_renderedBootPenMm, P13: g.P13_minSelfSepMm,
    P14: kin.P14_bodyVelMs, P15: kin.P15_angVelRadS, P16: kin.P16_comVelMs, P17: kin.P17_dL, iv, vc }; }
const out = { probe: "probe_hga_waived_diagnostic.mjs (NON-GATING)", prereg: "PI1_REV2_PREREG.md (f8cd44a) + A1 (f2016c6)", cases: {} };
for (const cs of CASES.split(",")) { const t0 = Date.now();
  const R = loadAir(AIRDIR, `${cs}_LOCO.json.gz`), G = rigGeom(R), mapper = makeMapper(R, { knee: "RK", rf1: true });
  const ev = R.events.filter(e => e.kind === "PLAYER_CONTACT"), cl = (e) => e.react || e.cls, fin = ev.reduce((m, e) => (RANK[cl(e)] > RANK[m] ? cl(e) : m), "NEGLIGIBLE"), dec = ev.find(e => cl(e) === fin) || null, first = ev[0] || null;
  const cat = !ev.length ? "NEAR MISS" : (fin === "CORRECTION" || fin === "STUMBLE") ? "RECOVERABLE" : (fin === "FALL" && dec.segPlanted) ? "PLANTED-LEG FALL" : "other";
  const kt = R.pred.findIndex(x => x != null && x <= 0.25); let kend = null, tRef = null;
  if (first) { kend = first.tick - 2; tRef = first.tick - 1 + first.sub / 4; } else { let mn = Infinity, kc = null; for (let k = Math.max(1, kt); k < R.dnow.length; k++) if (R.dnow[k] != null && R.dnow[k] < mn) { mn = R.dnow[k]; kc = k; } kend = kc - 1; tRef = kc + 0.5; }
  const res = { cat, finalClass: ev.length ? fin : "NO_CONTACT", trigger: kt, windowEnd: kend, hg: [], pass: false, reasons: [] };
  // PS-2: latest k in W with HG passing
  let kp = null; if (kt >= 0) for (let k = kend; k >= Math.max(kt, 2); k--) { const h = handoff(R, k, mapper, G); res.hg.push({ k, pass: h.pass, fails: h.fails }); if (h.fails.every(f => f === "HGA_comVsAuth")) { kp = k; res.hgaWaived = { HGA: h.HGA, failsAtKp: h.fails }; res.handoff = { ...h, iv: undefined, vc: undefined }; break; } }
  if (kt < 0) res.reasons.push("predictor never fires");
  if (kp == null) { res.reasons.push("no valid predictive promotion frame in W = [" + kt + ", " + kend + "]: " + [...new Set(res.hg.flatMap(x => x.fails))].join("+")); out.cases[cs] = res; console.log(cs.padEnd(18), cat.padEnd(17), "NO PROMOTION FRAME", res.reasons[0].slice(0, 160)); continue; }
  res.kp = kp; res.leadTicks = +(tRef - (kp + 1)).toFixed(2); res.leadS = +(res.leadTicks / 60).toFixed(4);
  // HG-D: deterministic reconstruction
  { const m2 = makeMapper(R, { knee: "RK", rf1: true }), a = JSON.stringify(initVel(mapper, kp)), b = JSON.stringify(initVel(m2, kp)); res.HGD = a === b; if (!res.HGD) res.reasons.push("HG-D: reconstruction not deterministic"); }
  // the promoted state (physics frame = render − integer offset), with the HG-A uniform horizontal shift
  const H = handoff(R, kp, mapper, G), row = R.rows[kp], va = [row[10], 0, -row[11]], shift = [va[0] - H.vc[0], 0, va[2] - H.vc[2]], off = [Math.round(H.iv.S[0].pos[0]), 0, Math.round(H.iv.S[0].pos[2])];
  const hS = H.iv.S.map(s => ({ pos: V.sub(s.pos, off), rot: s.rot.slice() })), hV = H.iv.v.map((v, i) => ({ v: V.add(v, shift), w: H.iv.w[i] }));
  res.momentum = { HGA_ms: H.HGA, shiftMs: +V.len(shift).toFixed(4), P16: H.P16, P17: H.P17 };
  const rootAt = (tau) => { const k = Math.max(1, Math.ceil(tau - 1e-9) - 1), w = tau - k, a = R.rows[k - 1], b = R.rows[Math.min(R.rows.length - 1, k)], lp = (i) => a[i] + (b[i] - a[i]) * w;
    return { pos: V.sub([lp(8), 0, -lp(9)], off), vel: [lp(10), 0, -lp(11)], facing: lp(12) }; };
  const samples = (tau) => { const k = Math.min(R.prims.length - 1, Math.max(0, Math.ceil(tau - 1e-9) - 1)), n = Math.max(1, Math.min(4, Math.round((tau - k) * 4))), o = {};
    for (const p of R.prims[k][n - 1]) o[p.prim] = { a: V.sub(sim2r(p.a), off), b: V.sub(sim2r(p.b), off), r: p.r }; return o; };
  const kF = R.react.findIndex(r => r && r.kind === "FALL"), fallTau = kF >= 0 ? kF + 1 : null;
  // whole-body inertia about the pelvis COM, standing pose, in world axes of the facing (B rotation gains, PI-1 §8)
  const Ipel = (() => { const c0 = comW(Z0, 0); let I = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (let i = 0; i < NB; i++) { const r = V.sub(comW(Z0, i), c0), m = B[i].mass, Ii = B[i].inertia; for (let a = 0; a < 3; a++) for (let b2 = 0; b2 < 3; b2++) I[a][b2] += Ii[a][b2] + m * ((a === b2 ? V.dot(r, r) : 0) - r[a] * r[b2]); }
    const f = rootAt(kp + 1).facing, c = Math.cos(f), s = Math.sin(f); return [c * c * I[2][2] + s * s * I[0][0], I[1][1], c * c * I[0][0] + s * s * I[2][2]]; })();
  const tEnd = dec ? dec.tick - 1 + dec.sub / 4 + 6 : kend + 12, steps = Math.ceil((tEnd - (kp + 1)) * 4), spec = pi1RunnerSpec();
  const sim = new SIM.PI1Sim(J, spec, { S: hS, vel: hV }, { tauP: kp + 1, rootAt, fallTau, samples, mT: R.mass[1] || 75, legFrac: 0.0145 + 0.061 + 0.161, isLeg: (n) => n === "LEG" || n === "THIGH" }, { seconds: steps / 240 + 0.05, Ipel });
  const si0 = sim.standIn.state(sim.tauP), S00 = hS.map((x, i) => ({ pos: V.add(x.pos, off), rot: x.rot, com: V.add(V.add(x.pos, Q.rot(x.rot, B[i].comLocal)), off), v: hV[i].v, w: hV[i].w }));   // PROBE: the promoted (pre-first-step) state
  res.promotionWrites = sim.promotionWrites; const snaps = []; let minSep = Infinity, sepPair = null;
  for (let s = 0; s < steps; s++) { if (!sim.tick()) break; const tau = sim.tauP + sim.n / 4, S = sim.st.map(b => ({ pos: V.add(b.pos, off), rot: b.rot.slice(), com: V.add(b.com, off), v: b.v.slice(), w: b.w.slice() }));
    snaps.push({ tau, S }); if (process.env.DBG) { const ph = sim.phys[sim.phys.length - 1]; console.log('dbg', tau.toFixed(2), 'trackErr', (ph.trackErr * 1000).toFixed(1), 'manifolds', ph.contacts.length, ph.contacts.map(c => c.seg + '>' + c.body + ':' + (c.depth * 1000).toFixed(1)).join(' '), 'J', JSON.stringify(ph.impulses.map(x => [x.name, +V.len(x.J).toFixed(4), +x.Jy.toFixed(4)])), JSON.stringify((sim.lastDrive || []).map(d => [d.name, +d.fitRes.toFixed(4), d.F.map(x => +x.toFixed(0))])), JSON.stringify(ph.standIn.map(x => [x.name, +x.yaw.toFixed(4), +x.yawAuth.toFixed(4), +(V.dist(x.com, x.comAuth) * 1000).toFixed(1)]))); } if (sim.n % 2 === 0) for (const [i, j] of SELF_PAIRS) { const d = bodySep(i, j, S).d; if (d < minSep) { minSep = d; sepPair = B[i].name + "↔" + B[j].name; } } }
  // A2: a physical contact = a step in which a stand-in segment receives a contact impulse (momentum balance) ≥ 1e-3, attributed to that segment's deepest
  // stand-in ↔ runner manifold of the step (speculative included)
  const phys = sim.phys, contactsAll = []; for (const p of phys) for (const im of p.impulses) { const Jn = V.len(im.J); if (Jn < 1e-3 && Math.abs(im.Jy) < 1e-3) continue;
    const ms = p.contacts.filter(c => c.seg === im.name).sort((a, b) => b.depth - a.depth); const m = ms[0]; contactsAll.push(m ? { ...m, tau: p.tau, J: +Jn.toFixed(4), Jy: +im.Jy.toFixed(4) } : { tau: p.tau, seg: im.name, body: null, depth: null, pts: null, normal: null, J: +Jn.toFixed(4), Jy: +im.Jy.toFixed(4) }); }
  const firstPhys = contactsAll[0] || null, snapAt = (tau) => snaps.reduce((b, s) => (Math.abs(s.tau - tau) < Math.abs(b.tau - tau) ? s : b), snaps[0]);
  const preTrack = phys.filter(p => !firstPhys || p.tau < firstPhys.tau).reduce((m, p) => Math.max(m, p.trackErr), 0);
  res.standIn = { trackErrBeforeContactMm: +(preTrack * 1000).toFixed(2), ASTC1: preTrack <= 0.010, segments: sim.standIn.segs.map(g => ({ name: g.name, prims: g.prims, massKg: +g.m.toFixed(2) })) };
  // the retained 10 mm discontinuity metric over the stand-in's existence [k_p, contact + 2 ticks]
  { const seq = []; const kLast = dec ? dec.tick + 1 : kend + 2; for (let k = Math.max(1, kp); k <= kLast; k++) for (let n = 1; n <= 4; n++) seq.push(R.prims[k][n - 1]); let jump = 0;
    for (let q = 2; q < seq.length; q++) for (const p of seq[q]) { const p1 = seq[q - 1].find(x => x.prim === p.prim), p0 = seq[q - 2].find(x => x.prim === p.prim); if (!p1 || !p0) continue;
      for (const e of ["a", "b"]) { const d1 = [0, 1, 2].map(i => p[e][i] - p1[e][i]), d0 = [0, 1, 2].map(i => p1[e][i] - p0[e][i]); { const jj = Math.hypot(d1[0] - d0[0], d1[1] - d0[1], d1[2] - d0[2]); if (jj > jump) { jump = jj; res.discAt = { q, tau: +(Math.max(1, kp) + (q + 1) / 4).toFixed(2), prim: p.prim, end: e, mm: +(jj * 1000).toFixed(1), d0mm: d0.map(x => +(x * 1000).toFixed(1)), d1mm: d1.map(x => +(x * 1000).toFixed(1)) }; } } } }
    res.standIn.discontinuityMm = +(jump * 1000).toFixed(1); res.standIn.discontinuityPass = jump <= 0.010; }
  res.CG8 = { minSepMm: +(minSep * 1000).toFixed(1), pair: sepPair, pass: minSep >= -0.010 };
  res.physical = { firstContact: firstPhys ? { tau: firstPhys.tau, body: firstPhys.body, seg: firstPhys.seg } : null, gameplayFirst: first ? { tau: first.tick - 1 + first.sub / 4, seg: first.seg, prim: first.prim } : null, fallTau, Breleased: sim.fallAt != null ? sim.fallAt : null };
  const crit = {};
  if (!dec) {   // NEAR MISS
    crit.NM = { physicalContacts: contactsAll.length, simContact: false, predictorFires: kt >= 0, pass: contactsAll.length === 0 && kt >= 0 };
  } else {
    const tDec = dec.tick - 1 + dec.sub / 4, cp = contactsAll.find(c => c.tau >= tDec - 1 - 1e-9 && c.body) || null, mapped = SEGMAP[dec.seg], mi = bi(mapped), simB = R.simBody[dec.tick - 1][dec.sub - 1], simSeg = simB.segs.find(g => g.name === dec.seg);
    res.decisive = { tSim: tDec, seg: dec.seg, prim: dec.prim, mapped, segPlanted: dec.segPlanted, J: dec.J, physical: cp ? { tau: cp.tau, body: cp.body, seg: cp.seg, depthMm: +(cp.depth * 1000).toFixed(1), impulseNs: cp.J } : null, physicalImpulseTotalNs: +contactsAll.filter(c => c.tau >= tDec - 1 - 1e-9).reduce((s, c) => s + c.J, 0).toFixed(3) };
    const sn = cp ? snapAt(cp.tau) : snapAt(tDec), S = sn.S, pPhys = cp ? cp.pts.reduce((s, p) => V.add(s, p), [0, 0, 0]).map(x => x / cp.pts.length) : null, pPhysR = pPhys ? V.add(pPhys, off) : null;
    // CG-1
    let adj = null; if (cp && cp.body !== mapped) for (const [b2, jn] of ADJ[mapped] || []) if (b2 === cp.body) { const jp = jn === "ankle" ? S[bi("foot_" + mapped.slice(-1))].pos : S[bi("shank_" + mapped.slice(-1))].pos; adj = { body: b2, joint: jn, distMm: +(V.dist(pPhysR, jp) * 1000).toFixed(1) }; }
    crit["CG-1"] = { mapped, physical: cp ? cp.body : null, adjacency: adj, pass: !!cp && (cp.body === mapped || (!!adj && adj.distMm <= 30)) };
    // CG-3
    crit["CG-3"] = { tSim: tDec, tPhys: cp ? cp.tau : null, dTicks: cp ? +(cp.tau - tDec).toFixed(2) : null, pass: !!cp && Math.abs(cp.tau - tDec) <= 1 + 1e-9 };
    // CG-4 (A2 axes on the physical body)
    { const simP = sim2r(dec.point); let pass = false, dist = null, sSim = null, sPh = null;
      if (cp) { dist = Math.hypot(pPhysR[0] - simP[0], pPhysR[2] - simP[2]); const sa = sim2r(simSeg.a), sb = sim2r(simSeg.b), proj = (p, a, b) => V.dot(V.sub(p, a), V.sub(b, a)) / V.dot(V.sub(b, a), V.sub(b, a)); sSim = proj(simP, sa, sb);
        const kind = dec.seg.replace(/_[LR]$/, ""), on = (l) => V.add(S[mi].pos, Q.rot(relRot(S, mi), l)); let A, Bp;
        if (kind === "foot" || kind === "toe") { A = on(AXES[kind][0]); Bp = on(AXES[kind][1]); } else if (mapped.startsWith("shank")) { A = S[mi].pos; Bp = S[bi(mapped.replace("shank", "foot"))].pos; } else if (mapped.startsWith("thigh")) { A = S[mi].pos; Bp = S[bi(mapped.replace("thigh", "shank"))].pos; } else { A = S[mi].pos; Bp = V.add(S[mi].pos, [0, 0.2, 0]); }
        sPh = proj(pPhysR, A, Bp); pass = dist <= 0.10 && Math.abs(sPh - sSim) <= 0.25; }
      crit["CG-4"] = { horizDistM: dist != null ? +dist.toFixed(3) : null, sSim: sSim != null ? +sSim.toFixed(3) : null, sPhys: sPh != null ? +sPh.toFixed(3) : null, pass }; }
    // CG-5: the physical pose held at the counterpart contact vs the simulation's primitives over [tDec, tDec + 0.10 s]
    { const pre = R.rows[dec.tick - 2], cPre = { char: "vinicius", p: { x: pre[8], y: pre[9], vx: pre[10], vy: pre[11], facing: pre[12], gaitPhase: pre[13], legLen: R.legLen[0] } }, tPre = dec.tick - 1;
      const region = [mapped].concat(crit["CG-1"].adjacency && crit["CG-1"].adjacency.distMm <= 30 ? [crit["CG-1"].adjacency.body] : []); let sMax = -1e9, dMax = -1e9;
      for (let k = dec.tick - 1; k <= Math.min(R.prims.length - 1, dec.tick + 5); k++) for (let n = 1; n <= 4; n++) { const t = k + n / 4; if (t < tDec - 1e-9 || t > tDec + 6 + 1e-9) continue; const pr = R.prims[k][n - 1].find(p => p.prim === dec.prim); if (!pr) continue;
        const sb = M0.SIMV.segs(M0.SIMV.body(cPre, (t - tPre) / 60, M0.SIMV.footLenV12)), sg = sb.find(g => g.name === dec.seg); if (sg) { const cc = M0.SIMV.segseg(pr.a, pr.b, sg.a, sg.b); sMax = Math.max(sMax, (pr.r + segR(sg, cc.t) - cc.d) * 1000); }
        const a = sim2r(pr.a), b = sim2r(pr.b); for (const nm of region) dMax = Math.max(dMax, capsulePen(a, b, pr.r, bi(nm), S, 160).pen * 1000); }
      const ratio = sMax > 0 ? dMax / sMax : null; crit["CG-5"] = { region, simMaxMm: +sMax.toFixed(1), physMaxMm: +dMax.toFixed(1), ratio: ratio != null ? +ratio.toFixed(3) : null, pass: ratio != null && ratio >= 1 / 3 && ratio <= 3 }; }
    // CG-6: normal + relative velocity (stand-in point − runner point), horizontal, simulation 2-D frame (x, y) = (render x, −render z)
    { const ang = (u, v) => Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1)))) * 180 / Math.PI, n = dec.normal, simN = [n[0], n[1]], tng = [-n[1], n[0]], simRel = [dec.vn * n[0] + (dec.vt || 0) * tng[0], dec.vn * n[1] + (dec.vt || 0) * tng[1]];
      let aN = null, aV = null, ph = null; if (cp) { const pN = [cp.normal[0], -cp.normal[2]], st = sim.standIn.segs.find(g => g.name === cp.seg); ph = phys.find(p => Math.abs(p.tau - cp.tau) < 1e-9); const sg = ph.standIn.find(x => x.name === cp.seg), sv = V.add(sg.v, V.cross(sg.w, V.sub(pPhys, sg.com))), rb = S[bi(cp.body)];   // stand-in point velocity (physics frame; velocities are frame-independent)
        const vR = V.add(rb.v, V.cross(rb.w, V.sub(pPhysR, rb.com))), rel = V.sub(sv, vR); aN = ang(simN, pN); aV = ang(simRel, [rel[0], -rel[2]]); }
      if (cp) { const i = phys.findIndex(p => Math.abs(p.tau - cp.tau) < 1e-9); if (Math.abs(snaps[i].tau - cp.tau) > 1e-9) throw new Error("snap/phys misaligned"); const ph0 = i > 0 ? phys[i - 1] : { tau: sim.tauP, standIn: si0.segs }, S0 = i > 0 ? snaps[i - 1].S : S00, sg0 = ph0.standIn.find(x => x.name === cp.seg), sv0 = V.add(sg0.v, V.cross(sg0.w, V.sub(pPhys, sg0.com))), rb0 = S0[bi(cp.body)], vR0 = V.add(rb0.v, V.cross(rb0.w, V.sub(pPhysR, rb0.com))), rel0 = V.sub(sv0, vR0), relPost = (() => { const sg = ph.standIn.find(x => x.name === cp.seg), rb = S[bi(cp.body)]; return V.sub(V.add(sg.v, V.cross(sg.w, V.sub(pPhys, sg.com))), V.add(rb.v, V.cross(rb.w, V.sub(pPhysR, rb.com)))); })();
        res.cg6pre = { tauPre: ph0.tau, simRel: simRel.map(x => +x.toFixed(3)), physRelPre: [+rel0[0].toFixed(3), +(-rel0[2]).toFixed(3)], physRelPost: [+relPost[0].toFixed(3), +(-relPost[2]).toFixed(3)], relVelAngleDegPre: +ang(simRel, [rel0[0], -rel0[2]]).toFixed(1), relVelAngleDegPost: +ang(simRel, [relPost[0], -relPost[2]]).toFixed(1), normalAngleDeg: +aN.toFixed(1) }; }
      crit["CG-6"] = { normalAngleDeg: aN != null ? +aN.toFixed(1) : null, relVelAngleDeg: aV != null ? +aV.toFixed(1) : null, pass: aN != null && aN <= 45 && aV != null && aV <= 45 }; }
    // CG-2: support at the decisive sub-step (simulation planted = presentation flag = physical boot state)
    { const Sd = snapAt(tDec).S, agree = {}; let ok = true; const row0 = dec.tick - 2, row1 = dec.tick - 1;
      for (const [n, sd] of [[0, "L"], [1, "R"]]) { const simPl = simB.legs[sd].planted, pres = [R.pres[row0].feet[n].contact, R.pres[row1].feet[n].contact], lo = bodyLowest(B[bi("foot_" + sd)], Sd[bi("foot_" + sd)]).y, d1 = lo <= 0.005 ? true : lo >= 0.015 ? false : "transitional", a = pres.includes(simPl) && d1 === simPl;
        agree[sd] = { sim: simPl, presentation: pres, physLowestMm: +(lo * 1000).toFixed(1), phys: d1, agree: a }; ok = ok && a; } crit["CG-2"] = { ...agree, pass: ok }; }
  }
  crit["CG-8"] = res.CG8; res.criteria = crit;
  for (const [nm, c] of Object.entries(crit)) if (!c.pass) res.reasons.push(nm);
  if (!res.standIn.ASTC1) res.reasons.push("AST-C1 (stand-in tracking " + res.standIn.trackErrBeforeContactMm + " mm)"); if (!res.standIn.discontinuityPass) res.reasons.push("tackler discontinuity " + res.standIn.discontinuityMm + " mm"); if (res.promotionWrites !== 28) res.reasons.push("promotion writes " + res.promotionWrites);
  res.pass = res.reasons.length === 0 && res.HGD; res.cpuMs = Date.now() - t0; sim.destroy && sim.destroy();
  out.cases[cs] = res; console.log(cs.padEnd(18), cat.padEnd(17), "kp", kp, "lead", res.leadTicks, "ticks", res.pass ? "PASS" : "fail: " + res.reasons.join(", ").slice(0, 170));
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

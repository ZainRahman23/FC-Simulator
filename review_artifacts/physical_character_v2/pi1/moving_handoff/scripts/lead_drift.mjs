// MOVING-RUNNER HANDOFF INVESTIGATION, item 4: long-lead drift (read-only; sources/2026-10-09_user_decision_adopt_hga_v2_investigate_moving_handoff.md).
// The runner is promoted at several leads before the (predicted) contact with the ADOPTED HG-A v2 initialization, WITHOUT the tackle: the REV2
// stand-in is still constructed but placed 500 m away, so world, controllers and integrator are exactly REV2's (posture tone at the promoted pose,
// B toward the authoritative root, physical-contact stance gains). fallTau = null (no tackle, no authoritative fall). Tackle records are evolved only
// to the would-be contact time or promotion + H ticks, whichever is first (afterwards the root carries the reaction); near-miss records to promotion + H.
// Init variants (diagnostic attribution only): v2 = adopted HG-A v2 (PI-1 §6.2 velocities + uniform horizontal shift); smooth = the same write with the
// velocities from a NON-CAUSAL centred difference over ±2 frames (evaluation only; not a proposal); vert0 = v2 plus a uniform vertical shift removing
// the COM vertical velocity. Nothing in V2 / F0 / V1.3 / Jolt / the presentation / any criterion is changed.
// usage (worktree root): V13_WT=<v1.3> V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node .../lead_drift.mjs <airDir> <out.json> <case>[,...] [leads e.g. 1,2,4,8,12,trig | sweep:a-b] [H] [variants]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url)), P2 = path.resolve(here, "../../../../../sandbox/visual/physchar2") + "/";
const M = await import(new URL("../../rev1/scripts/pcg_rev1.mjs", import.meta.url).href), M0 = await import(new URL("../../trackB/scripts/pcg_f0.mjs", import.meta.url).href);
const SIM = await import(new URL("../../rev2/scripts/pi1_rev2_sim.mjs", import.meta.url).href), { loadJolt } = await import(P2 + "core/v2_jolt.js"), { pi1RunnerSpec } = await import(P2 + "spec/v2_pi1_runner.js");
const { bootSole } = await import(P2 + "sim/v2_geom.js");
const { L, makeMapper, geomRowsRev1, rigGeom, angVel, relRot } = M; const { V, Q, B, NB, bi, loadAir, bodyLowest, Z0 } = L;
const [AIRDIR, OUT, CASES, LEADS = "1,2,4,8,12,trig", HZ = "30", VARS = "v2,smooth,vert0"] = process.argv.slice(2), J = await loadJolt(P2 + "vendor/jolt-physics.wasm-compat.js");
const sim2r = (p) => [p[0], p[2], -p[1]], comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal)), Mt = B.reduce((s, b) => s + b.mass, 0), comVel = (v) => V.sc(v.reduce((s, x, i) => V.add(s, V.sc(x, B[i].mass)), [0, 0, 0]), 1 / Mt);
const comOf = (S) => V.sc(S.reduce((s, x, i) => V.add(s, V.sc(comW(S, i), B[i].mass)), [0, 0, 0]), 1 / Mt), hl = (v) => Math.hypot(v[0], v[2]), f = (x, n = 4) => x == null ? null : +x.toFixed(n), D = 180 / Math.PI;
// PI-1 §6.2 velocities (identical to rev2/scripts/scan_rev2.mjs initVel) and the non-causal centred variant (evaluation only)
const propagate = (S, v0, w) => { const v = []; v[0] = v0; for (const j of L.spec.joints) { const p = j.parentIndex, c = j.childIndex, jp = S[c].pos, vj = V.add(v[p], V.cross(w[p], V.sub(jp, comW(S, p)))); v[c] = V.add(vj, V.cross(w[c], V.sub(comW(S, c), jp))); } return v; };
function initVel(mapper, k) { const S2 = mapper.poseAt(k).S, S1 = mapper.poseAt(k - 1).S, S0 = mapper.poseAt(k - 2).S, w = [];
  for (let i = 0; i < NB; i++) w[i] = V.sub(V.sc(angVel(S1[i].rot, S2[i].rot), 1.5), V.sc(angVel(S0[i].rot, S1[i].rot), 0.5));
  const v0 = V.sub(V.sc(V.sub(comW(S2, 0), comW(S1, 0)), 1.5 * 60), V.sc(V.sub(comW(S1, 0), comW(S0, 0)), 0.5 * 60)); return { v: propagate(S2, v0, w), w, S: S2 }; }
function initVelSmooth(mapper, k) { const S = mapper.poseAt(k).S, Sm = mapper.poseAt(k - 2).S, Sp = mapper.poseAt(k + 2).S, w = [];
  for (let i = 0; i < NB; i++) w[i] = V.sc(angVel(Sm[i].rot, Sp[i].rot), 1 / 4); const v0 = V.sc(V.sub(comW(Sp, 0), comW(Sm, 0)), 60 / 4); return { v: propagate(S, v0, w), w, S }; }
// REV2 handoff rows (identical to scan_rev2.mjs handoff) — reported for each promotion frame
function handoff(R, k, mapper, G) { const g = geomRowsRev1(R, k, k - 6, mapper, G), fails = g.fails.slice();
  const p5 = Math.max(g.foot.L.physVsPresDeg, g.foot.R.physVsPresDeg); if (p5 > 5) fails.push("P5_footDeg");
  const kin = M0.kinRows(R, k, mapper.poseAt); fails.push(...kin.fails);
  const iv = initVel(mapper, k), vc = comVel(iv.v), row = R.rows[k], va = [row[10], 0, -row[11]], dA = Math.hypot(vc[0] - va[0], vc[2] - va[2]);
  const d = R.def[k]; if (!(d && d.kind === "SLIDE" && d.launchT >= R.slide.extT - 1e-9)) fails.push("HGT_extension");
  return { fails, s: dA, iv }; }
const SOLE = { L: bootSole(B[bi("foot_L")]), R: bootSole(B[bi("foot_R")]) }, soleC = (sd) => V.sc(SOLE[sd].pts.reduce((s, p) => V.add(s, p), [0, 0, 0]), 1 / SOLE[sd].pts.length);
const SEGB = { thigh: "thigh", shin: "shank", foot: "foot" };
const legVsSim = (S, sb) => { let mx = 0, who = null; for (const g of sb.segs) { const bn = SEGB[g.seg]; if (!bn || !g.sd || g.name.startsWith("toe")) continue; const i = bi(bn + "_" + g.sd), a2 = sim2r(g.a), b2 = sim2r(g.b), p = comW(S, i), ab = V.sub(b2, a2), t = Math.max(0, Math.min(1, V.dot(V.sub(p, a2), ab) / V.dot(ab, ab))), d = hl(V.sub(p, V.add(a2, V.sc(ab, t)))); if (d > mx) { mx = d; who = B[i].name; } } return { d: mx, who }; };
const LEGB = ["thigh_L", "thigh_R", "shank_L", "shank_R", "foot_L", "foot_R"].map(bi), JPTS = [0].concat(L.spec.joints.map(j => j.childIndex)), JN = ["pelvis"].concat(L.spec.joints.map(j => j.name));
const up = (S, i) => Q.rot(relRot(S, i), [0, 1, 0]), fwd = (S, i) => Q.rot(relRot(S, i), [0, 0, 1]), ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, V.dot(a, b) / (V.len(a) * V.len(b) || 1)))) * D;
const yawOf = (v) => Math.atan2(v[0], v[2]), wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const CAP = { h: 274.95, up: 1161.2, down: 193.5, T: 81.80 };
const out = { note: "read-only long-lead drift; no tackle (stand-in 500 m away); fallTau null", leads: LEADS, H: +HZ, variants: VARS, cases: {} };
for (const cs of CASES.split(",")) {
  const R = loadAir(AIRDIR, `${cs}_LOCO.json.gz`), G = rigGeom(R), mapper = makeMapper(R, { knee: "RK", rf1: true });
  const ev = R.events.filter(e => e.kind === "PLAYER_CONTACT"), first = ev[0] || null, kt = R.pred.findIndex(x => x != null && x <= 0.25); let kend = null, tRef = null;
  if (first) { kend = first.tick - 2; tRef = first.tick - 1 + first.sub / 4; } else { let mn = Infinity, kc = null; for (let k = Math.max(1, kt); k < R.dnow.length; k++) if (R.dnow[k] != null && R.dnow[k] < mn) { mn = R.dnow[k]; kc = k; } kend = kc - 1; tRef = kc + 0.5; }
  const contactRec = !!first, kps = [];
  if (LEADS.startsWith("list:")) { for (const k of LEADS.slice(5).split(";").map(Number)) kps.push({ label: "k" + k, kp: k }); }
  else if (LEADS.startsWith("sweep:")) { const [a, b] = LEADS.slice(6).split("-").map(Number); for (let k = a; k <= b; k++) kps.push({ label: "k" + k, kp: k }); }
  else for (const l of LEADS.split(",")) { if (l === "trig") { if (kt >= 2) kps.push({ label: "trig", kp: kt }); } else kps.push({ label: "L" + l, kp: Math.round(tRef - 1 - +l) }); }
  const rootAt = (tau, off) => { const k = Math.max(1, Math.ceil(tau - 1e-9) - 1), w = tau - k, a = R.rows[k - 1], b = R.rows[Math.min(R.rows.length - 1, k)], lp = (i) => a[i] + (b[i] - a[i]) * w;
    return { pos: V.sub([lp(8), 0, -lp(9)], off), vel: [lp(10), 0, -lp(11)], facing: lp(12) }; };
  const primsAt = (k) => { for (let d = 0; d < R.prims.length; d++) for (const kk of [k - d, k + d]) if (R.prims[kk] && R.prims[kk].length) return R.prims[kk]; return null; };
  const res = { contactRec, trigger: kt, windowEnd: kend, tRef, runs: [] };
  for (const { label, kp } of kps) { if (kp < 3 || kp + 3 >= R.rows.length) continue;
    const H = handoff(R, kp, mapper, G), lead = +(tRef - (kp + 1)).toFixed(2);
    for (const variant of VARS.split(",")) { const t0 = Date.now();
      const base = variant === "smooth" ? initVelSmooth(mapper, kp) : H.iv, row = R.rows[kp], va = [row[10], 0, -row[11]], vc = comVel(base.v), shift = [va[0] - vc[0], variant === "vert0" ? -vc[1] : 0, va[2] - vc[2]];
      const off = [Math.round(base.S[0].pos[0]), 0, Math.round(base.S[0].pos[2])], hS = base.S.map(s => ({ pos: V.sub(s.pos, off), rot: s.rot.slice() })), hV = base.v.map((v, i) => ({ v: V.add(v, shift), w: base.w[i] }));
      const samples = (tau) => { const k = Math.min(R.prims.length - 1, Math.max(0, Math.ceil(tau - 1e-9) - 1)), n = Math.max(1, Math.min(4, Math.round((tau - k) * 4))), pk = primsAt(k), o = {};
        for (const p of pk[Math.min(n, pk.length) - 1]) o[p.prim] = { a: V.add(V.sub(sim2r(p.a), off), [0, 0, 500]), b: V.add(V.sub(sim2r(p.b), off), [0, 0, 500]), r: p.r }; return o; };
      const Ipel = (() => { const c0 = comW(Z0, 0); let I = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (let i = 0; i < NB; i++) { const r = V.sub(comW(Z0, i), c0), m = B[i].mass, Ii = B[i].inertia; for (let a = 0; a < 3; a++) for (let b2 = 0; b2 < 3; b2++) I[a][b2] += Ii[a][b2] + m * ((a === b2 ? V.dot(r, r) : 0) - r[a] * r[b2]); }
        const fc = rootAt(kp + 1, off).facing, c = Math.cos(fc), s = Math.sin(fc); return [c * c * I[2][2] + s * s * I[0][0], I[1][1], c * c * I[0][0] + s * s * I[2][2]]; })();
      const tEnd = contactRec ? Math.min(tRef, kp + 1 + +HZ) : kp + 1 + +HZ,   // horizon cap H ticks; tackle records stop at the would-be contact
      steps = Math.max(4, Math.ceil((tEnd - (kp + 1)) * 4)), spec = pi1RunnerSpec();
      const sim = new SIM.PI1Sim(J, spec, { S: hS, vel: hV }, { tauP: kp + 1, rootAt: (t) => rootAt(t, off), fallTau: null, samples, mT: R.mass[1] || 75, legFrac: 0.0145 + 0.061 + 0.161, isLeg: (n) => n === "LEG" || n === "THIGH" }, { seconds: steps / 240 + 0.05, Ipel });
      const S0 = base.S, c0 = comOf(S0), root0 = [R.rows[kp][8], 0, -R.rows[kp][9]], L0 = null; let Bsum = { h: 0, v: 0, T: 0 }, Bsat = 0, nSt = 0, slip = { L: 0, R: 0 }, firstFail = {}, series = [], pr2 = null;
      const fail = (key, t, info) => { if (!(key in firstFail)) firstFail[key] = { t: f(t, 2), ...(info || {}) }; };
      const physS = () => sim.st.map(b => ({ pos: V.add(b.pos, off), rot: b.rot.slice(), com: V.add(b.com, off), v: b.v.slice(), w: b.w.slice() }));
      const Spm = mapper.poseAt(kp - 1).S, Sp1 = mapper.poseAt(kp + 1).S;
      for (let s = 0; s < steps; s++) { if (!sim.tick()) break; nSt++; const tau = sim.tauP + sim.n / 4, t = tau - sim.tauP, S = physS();
        // B load and saturation (NM-2 / RC-4)
        const Bf = sim.Bon ? sim.sup.lambdas() : null; if (Bf) { const F = V.sc(Bf.lin, 1 / sim.dt), T = V.sc(Bf.rot, 1 / sim.dt), fh = Math.max(Math.abs(F[0]), Math.abs(F[2])) / CAP.h, fv = F[1] >= 0 ? F[1] / CAP.up : -F[1] / CAP.down, tq = Math.max(...T.map(Math.abs)) / CAP.T;
          Bsum.h += fh; Bsum.v += fv; Bsum.T += tq; if (fh >= 0.99 || fv >= 0.99 || tq >= 0.99) Bsat++; }
        // foot slip while physically planted (NM-2: planted-foot slip <= 10 mm)
        for (const [n, sd] of [[0, "L"], [1, "R"]]) { const i = bi("foot_" + sd), p = V.add(S[i].pos, Q.rot(S[i].rot, soleC(sd))), vp = V.add(S[i].v, V.cross(S[i].w, V.sub(p, S[i].com))); if (sim.contactFlags[n]) slip[sd] += hl(vp) * sim.dt; }
        if (sim.n === 4) { // PR-2 readings over the first rendered frame (k_p -> k_p + 1), V2 joint centres
          let rev2 = { d: 0 }, pi1 = { d: 0 }, own = 0; for (let q = 0; q < JPTS.length; q++) { const i = JPTS[q], dPh = V.sub(S[i].pos, S0[i].pos), dLast = V.sub(S0[i].pos, Spm[i].pos), dNext = V.sub(Sp1[i].pos, S0[i].pos);
            const a = V.dist(dPh, dLast), b = V.dist(dPh, dNext); if (a > rev2.d) rev2 = { d: a, joint: JN[q] }; if (b > pi1.d) pi1 = { d: b, joint: JN[q] }; own = Math.max(own, V.dist(dNext, dLast)); }
          pr2 = { rev2Mm: f(rev2.d * 1000, 1), rev2Joint: rev2.joint, pi1Mm: f(pi1.d * 1000, 1), pi1Joint: pi1.joint, presOwnMm: f(own * 1000, 1) }; }
        if (sim.n % 4 !== 0) continue;
        const r = Math.round(tau) - 1; if (r >= R.rows.length) break; const P = mapper.poseAt(r).S, rw = R.rows[r], vaT = [rw[10], 0, -rw[11]], root = [rw[8], 0, -rw[9]];
        const c = comOf(S), vcom = V.sc(S.reduce((a2, b2, i) => V.add(a2, V.sc(b2.v, B[i].mass)), [0, 0, 0]), 1 / Mt), cP = comOf(P), sp = hl(vaT) || 1, ef = [vaT[0] / sp, 0, vaT[2] / sp], el = [-ef[2], 0, ef[0]], dv = V.sub(vcom, vaT);
        const rootD = V.sub(V.sub(S[0].pos, root), V.sub(S0[0].pos, root0)), comD = V.sub(V.sub(c, root), V.sub(c0, root0));
        const tilt = ang(up(S, 0), up(P, 0)), yawE = wrap(yawOf(fwd(S, 0)) - yawOf(fwd(P, 0))) * D, trunkTilt = ang(up(S, bi("thorax")), up(P, bi("thorax")));
        let poseRel = 0, poseAbs = 0, legH = 0, legWho = null; for (const i of JPTS) { poseAbs = Math.max(poseAbs, V.dist(S[i].pos, P[i].pos)); poseRel = Math.max(poseRel, V.dist(V.sub(S[i].pos, S[0].pos), V.sub(P[i].pos, P[0].pos))); }
        for (const i of LEGB) { const d = hl(V.sub(comW(S, i), comW(P, i))); if (d > legH) { legH = d; legWho = B[i].name; } }
        const feet = {}; for (const [n, sd] of [[0, "L"], [1, "R"]]) { const i = bi("foot_" + sd), lo = bodyLowest(B[i], S[i]).y, st = lo <= 0.005 ? "planted" : lo >= 0.015 ? "air" : "trans", sb = R.simBody[r] && R.simBody[r][3] ? R.simBody[r][3].legs[sd].planted : null;
          feet[sd] = { lowMm: f(lo * 1000, 1), phys: st, contact: sim.contactFlags[n], pres: R.pres[r].feet[n].contact, sim: sb }; }
        // joint-limit margin (hard limits, as gates/v2_g1.js _measure)
        let mMin = Infinity, mWho = null; spec.joints.forEach((jj, k) => { const per = sim.up.ev.per[k]; if (!per) return; for (let i = 0; i < 3; i++) { if (!sim.A.axis[k] || !sim.A.axis[k][i]) continue; const th = per.th[i], hT = per.T[i] && per.T[i].hard, lo = hT ? hT[0] : jj.limits.hard.lo[i], hi = hT ? hT[1] : jj.limits.hard.hi[i], m = Math.min(th - lo, hi - th); if (m < mMin) { mMin = m; mWho = jj.name + "." + i; } } });
        const last = sim.last, pelH = S[0].pos[1], pelHP = P[0].pos[1], sbR = R.simBody[r] && R.simBody[r][3], lvs = sbR ? legVsSim(S, sbR) : null, lvp = sbR ? legVsSim(P, sbR) : null;
        const row = { t, r, rootDh: f(hl(rootD) * 1000, 1), rootDfwd: f(V.dot(rootD, ef) * 1000, 1), rootDlat: f(V.dot(rootD, el) * 1000, 1), pelDy: f((pelH - pelHP) * 1000, 1), comDh: f(hl(comD) * 1000, 1), comDy: f((c[1] - cP[1]) * 1000, 1),
          dvFwd: f(V.dot(dv, ef), 3), dvLat: f(V.dot(dv, el), 3), vY: f(vcom[1], 3), tiltDeg: f(tilt, 1), yawErrDeg: f(yawE, 1), trunkTiltDeg: f(trunkTilt, 1), pelHratio: f(pelH / pelHP, 3),
          legSimMm: lvs ? f(lvs.d * 1000, 1) : null, legSimWho: lvs ? lvs.who : null, legSimPresMm: lvp ? f(lvp.d * 1000, 1) : null, poseRelMm: f(poseRel * 1000, 1), poseAbsMm: f(poseAbs * 1000, 1), legHmm: f(legH * 1000, 1), legWho, feet, marginDeg: f(mMin * D, 2), marginWho: mWho, L: f(V.len(last.L), 2), KE: f(last.ke, 1), E: f(last.E, 1), slipMm: { L: f(slip.L * 1000, 1), R: f(slip.R * 1000, 1) } };
        series.push(row);
        // first violations of the frozen tolerances (see report §4 for the mapping to PI-1 / REV2 rows)
        if (pelH < 0.85 * pelHP) fail("RC4_pelvisHeight", t, { ratio: row.pelHratio }); if (tilt > 20) fail("RC4_pelvisTilt", t, { deg: row.tiltDeg });
        if (Math.max(slip.L, slip.R) > 0.010) fail("NM2_slip", t, { mm: Math.max(slip.L, slip.R) * 1000 }); if (Bsat / nSt > 0.05) fail("NM2_Bsat5pct", t); if (Math.max(Bsum.h, Bsum.v, Bsum.T) / nSt > 0.25) fail("NM2_Bmean25pct", t);
        if (legH > 0.10) fail("CG4_legSeg0p10m", t, { body: legWho, mm: row.legHmm }); if (lvs && lvs.d > 0.10) fail("CG4sim_legSeg0p10m", t, { body: lvs.who, mm: row.legSimMm }); if (mMin < 0) fail("P12_hardLimit", t, { who: mWho });
        for (const sd of ["L", "R"]) { const ft = feet[sd], ref = ft.sim != null ? ft.sim : ft.pres; if ((ft.phys === "planted") !== !!ref || ft.phys === "trans") fail("CG2_support_" + sd, t, { phys: ft.phys, ref }); }
        if (hl(V.sub(S[0].pos, P[0].pos)) > 0.010) fail("DG_pelvis10mm", t); if (Math.max(...JPTS.map(i => V.dist(S[i].pos, P[i].pos))) > 0.010) fail("DG_joints10mm", t); }
      const coh = ["RC4_pelvisHeight", "RC4_pelvisTilt", "NM2_slip", "NM2_Bsat5pct", "NM2_Bmean25pct", "CG4_legSeg0p10m", "P12_hardLimit", "CG2_support_L", "CG2_support_R"], fT = coh.map(k => firstFail[k] ? firstFail[k].t : Infinity), tCoh = Math.min(...fT);
      res.runs.push({ label, kp, lead, variant, hgFailsExHGA: H.fails, sHGA: f(H.s, 4), hgaV2ok: H.s <= 0.180, shift: shift.map(x => f(x, 3)), vcomY0: f(vc[1], 3), durTicks: f(nSt / 4, 2), pr2, firstFail,
        coherentTicks: tCoh === Infinity ? null : tCoh, coherentThroughEnd: tCoh === Infinity, firstToFail: tCoh === Infinity ? null : coh[fT.indexOf(tCoh)], BmeanFrac: { h: f(Bsum.h / nSt, 3), v: f(Bsum.v / nSt, 3), T: f(Bsum.T / nSt, 3) }, BsatFrac: f(Bsat / nSt, 3), cpuMs: Date.now() - t0, series });
      console.log(cs.padEnd(18), label.padEnd(6), "kp", kp, "lead", String(lead).padEnd(6), variant.padEnd(6), "s", H.s.toFixed(3), "vY0", vc[1].toFixed(2), "dur", (nSt / 4).toFixed(2), "coherent", tCoh === Infinity ? "through end" : tCoh + " (" + coh[fT.indexOf(tCoh)] + ")", "PR2 rev2/pi1", pr2 ? pr2.rev2Mm + "/" + pr2.pi1Mm : "-"); } }
  out.cases[cs] = res; }
fs.writeFileSync(OUT, JSON.stringify(out));

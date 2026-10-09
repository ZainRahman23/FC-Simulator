// PI-1 REV1 (PI1_REV1_PREREG.md §3 / §4): PM-2 minimum inertia-weighted displacement knee retarget (causal), RF-1 rigid-foot reconciliation
// (physical F0 foot pitched to the turf; rendered foot blends to physics over T_b), and the REV1 PCG rows. Builds on the Track B PCG-F0
// module (pcg_f0.mjs, unchanged) — same pelvis / arm / trunk mapping, same projection, same row definitions except where REV1 replaces them.
const M0 = await import(new URL("../../trackB/scripts/pcg_f0.mjs", import.meta.url).href);
export const { L, TOL, SEGMAP, ADJ, AXES, relRot, onBody, rigGeom, interp, anchorOf, angVel, Mtot, RANK, SIMV, PROF, segR } = M0;
export const { V, Q, B, NB, bi, loadAir, m2q, m2p, qang, slerp, rawRotations, project, bodySep, bodyLowest, SELF_PAIRS, swingTwist, Z0 } = L;
export const TB_TICKS = 6;                                           // T_b = 0.10 s at 60 Hz (the predictor horizon)
const D = 180 / Math.PI, R_ = Math.PI / 180;
const fromCols = (x, y, z) => { const m = new Array(16).fill(0); m[0] = x[0]; m[1] = x[1]; m[2] = x[2]; m[4] = y[0]; m[5] = y[1]; m[6] = y[2]; m[8] = z[0]; m[9] = z[1]; m[10] = z[2]; m[15] = 1; return m2q(m); };
const rotAxis = (axis, ang) => { const s = Math.sin(ang / 2); return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(ang / 2)]; };
const signedAngle = (a, b, axis) => Math.atan2(V.dot(V.cross(a, b), axis), V.dot(a, b));
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const inertiaWorld = (i, q) => { const I = B[i].inertia, Rm = [0, 1, 2].map(c => Q.rot(q, [c === 0 ? 1 : 0, c === 1 ? 1 : 0, c === 2 ? 1 : 0])); return (d) => { const dl = [0, 1, 2].map(c => V.dot(Rm[c], d)); return [0, 1, 2].reduce((s, r) => s + dl[r] * [0, 1, 2].reduce((t, c) => t + I[r][c] * dl[c], 0), 0); }; };
// ── per leg: the R-K geometry of a frame (exactly as compat_lib rawRotations computes it) ──
function legGeom(rr, world, sd) { const idx = rr.idx, H = m2p(world[idx["thigh_" + sd]]), K = m2p(world[idx["shin_" + sd]]), A = m2p(world[idx["foot_" + sd]]);
  const u = V.norm(V.sub(K, H)), w = V.norm(V.sub(A, K)), cr = V.cross(u, w), bend = Math.asin(Math.min(1, V.len(cr))) * D;
  const xr = Q.rot(rr.raw[bi("thigh_" + sd)], [1, 0, 0]), xrP = V.norm(V.sub(xr, V.sc(u, V.dot(xr, u))));
  let n = V.len(cr) > 1e-9 ? V.norm(cr) : xrP; if (V.dot(n, xrP) < 0) n = V.sc(n, -1); const k = smooth(5, 10, bend); n = V.norm(V.add(V.sc(n, k), V.sc(xrP, 1 - k)));
  const nt = V.norm(V.sub(n, V.sc(u, V.dot(n, u)))), delta = signedAngle(xrP, nt, u);
  return { H, K, A, u, w, xrP, delta, bend, Ls: V.dist(K, A) }; }
// PM-2 cost terms (§3): mass-weighted shank / foot COM displacement + inertia about the thigh axis × (x − x_prev)²
const cS = (sd) => V.len(B[bi("shank_" + sd)].comLocal) / Math.max(1e-6, V.dist(B[bi("shank_" + sd)].origin, B[bi("foot_" + sd)].origin));
function ieff(g, sd, rr) { const ax = g.u, at = g.H, line = (p) => { const d = V.sub(p, at); return V.len(V.sub(d, V.sc(ax, V.dot(d, ax)))); };
  let I = 0; for (const nm of ["thigh_", "shank_", "foot_"]) { const i = bi(nm + sd), q = Q.norm(Q.mul(rr.raw[i], Q.conj(Z0[i].rot))), com = nm === "thigh_" ? V.add(g.H, V.sc(g.u, V.len(B[i].comLocal))) : nm === "shank_" ? V.add(g.K, V.sc(g.w, cS(sd) * g.Ls)) : g.A;
    I += inertiaWorld(i, q)(ax) + B[i].mass * line(com) ** 2; } return I; }
function pm2Solve(g, sd, xPrev, Ieff) { const ms = B[bi("shank_" + sd)].mass, mf = B[bi("foot_" + sd)].mass, c = cS(sd), Ls = g.Ls;
  const C = (x) => { const h = Q.rot(rotAxis(g.u, x), g.xrP), hw = V.dot(h, g.w), d2 = 2 * (1 - Math.sqrt(Math.max(0, 1 - hw * hw))); return (ms * (c * Ls) ** 2 + mf * Ls * Ls) * d2 + Ieff * (x - xPrev) ** 2; };
  let a = g.delta - 45 * R_, b = g.delta + 45 * R_; const gr = (Math.sqrt(5) - 1) / 2; let x1 = b - gr * (b - a), x2 = a + gr * (b - a), f1 = C(x1), f2 = C(x2);
  for (let it = 0; it < 80; it++) { if (f1 < f2) { b = x2; x2 = x1; f2 = f1; x1 = b - gr * (b - a); f1 = C(x1); } else { a = x1; x1 = x2; f1 = f2; x2 = a + gr * (b - a); f2 = C(x2); } }
  return 0.5 * (a + b); }
// raw rotations with the PM-2 thigh / shank for relative thigh twists x = { L, R }
function rawPM2(R, k, x) { const pr = R.pres[k], rr = rawRotations(R.bones, R.bind, pr.world, {}), info = {};
  for (const sd of ["L", "R"]) { const g = legGeom(rr, pr.world, sd), h = Q.rot(rotAxis(g.u, x[sd]), g.xrP), wx = V.norm(V.sub(g.w, V.sc(h, V.dot(h, g.w))));
    rr.raw[bi("thigh_" + sd)] = fromCols(h, V.sc(g.u, -1), V.cross(h, V.sc(g.u, -1))); rr.raw[bi("shank_" + sd)] = fromCols(h, V.sc(wx, -1), V.cross(h, V.sc(wx, -1)));
    info[sd] = { bendDeg: g.bend, deltaDeg: g.delta * D, xDeg: x[sd] * D }; }
  return { rr, info }; }
// RF-1: minimal pitch about the foot's mediolateral axis at the ankle bringing the F0 boot's lowest point to y = 0 (contact) / ≥ 0 (no contact)
function reconcileFoot(rr, world, P, sd, contact) { const i = bi("foot_" + sd), lo0 = bodyLowest(B[i], P.S[i]).y; if (!contact && lo0 >= 0) return { P, pitchDeg: 0, lowest0: lo0, lowest: lo0, residual: 0 };
  const axis = Q.rot(relRot(P.S, i), [1, 0, 0]), raw0 = rr.raw[i], at = (th) => { const raw = rr.raw.slice(); raw[i] = Q.norm(Q.mul(rotAxis(axis, th), raw0)); const Pj = project(raw, world, rr.idx); return { Pj, lo: bodyLowest(B[i], Pj.S[i]).y, clamp: Pj.clamp["ankle_" + sd] }; };
  const f = (th) => at(th).lo; let best = null;
  for (let s = 0.5; s <= 60 && !best; s += 0.5) for (const sg of [1, -1]) { const t0 = sg * (s - 0.5) * R_, t1 = sg * s * R_, a0 = f(t0), a1 = f(t1); if ((a0 - 0) * (a1 - 0) <= 0) { let lo = t0, hi = t1, flo = a0; for (let it = 0; it < 50; it++) { const m = 0.5 * (lo + hi), fm = f(m); if ((flo) * (fm) <= 0) hi = m; else { lo = m; flo = fm; } } best = 0.5 * (lo + hi); break; } }
  if (best == null) return { P, pitchDeg: NaN, lowest0: lo0, lowest: lo0, residual: lo0 };
  const r = at(best); return { P: { ...P, S: r.Pj.S, clamp: { ...P.clamp, ["ankle_" + sd]: Math.max(P.clamp["ankle_" + sd] || 0, r.clamp || 0) } }, pitchDeg: best * D, lowest0: lo0, lowest: r.lo, residual: r.lo, ankleClampDeg: r.clamp || 0 }; }
// ── the causal mapper for one record: PM-2 (or R-K for comparison) + RF-1, memoised from row 0 ──
export function makeMapper(R, { knee = "PM2", rf1 = true } = {}) {
  const xs = [], poses = [];
  const xAt = (k) => { if (xs[k]) return xs[k]; for (let j = xs.length; j <= k; j++) { const pr = R.pres[j], rr = rawRotations(R.bones, R.bind, pr.world, {}), x = {};
      for (const sd of ["L", "R"]) { const g = legGeom(rr, pr.world, sd); x[sd] = knee === "RK" ? g.delta : j === 0 ? g.delta : pm2Solve(g, sd, xs[j - 1][sd], ieff(g, sd, rr)); } xs[j] = x; } return xs[k]; };
  // knee "RK": the ORIGINAL frozen R-K (compat_lib rawRotations rk: true), exactly as Track B used it; "PM2": the §3 retarget
  const rawOf = (k) => { if (knee === "RK") { const rr = rawRotations(R.bones, R.bind, R.pres[k].world, { rk: true }); return { rr, info: rr.info }; } return rawPM2(R, k, xAt(k)); };
  const poseAt = (k) => { if (poses[k]) return poses[k]; const { rr, info } = rawOf(k), pr = R.pres[k]; let P = { ...project(rr.raw, pr.world, rr.idx), idx: rr.idx, raw: rr.raw, info }, foot = {};
    if (rf1) for (const [n, sd] of [[0, "L"], [1, "R"]]) { const rc = reconcileFoot(rr, pr.world, P, sd, pr.feet[n].contact); P = rc.P; foot[sd] = { contact: pr.feet[n].contact, mode: pr.feet[n].mode, pitchDeg: rc.pitchDeg, lowest0Mm: rc.lowest0 * 1000, lowestMm: rc.lowest * 1000 }; }
    return (poses[k] = { ...P, foot }); };
  return { xAt, poseAt };
}
// rendered foot rotation at frame k for promotion at kp (relative-to-bind world rotations): slerp(stream A, physical, smoothstep)
export const blendW = (k, kp) => { const t = Math.max(0, Math.min(1, (k - kp) / TB_TICKS)); return t * t * (3 - 2 * t); };
const rigRotOf = (R, k, rb) => { const w = R.pres[k].world, idx = Object.fromEntries(R.bones.map((b, i) => [b.name, i])); return Q.norm(Q.mul(m2q(w[idx[rb]]), Q.conj(m2q(R.bind[idx[rb]])))); };
export function renderedFoot(R, k, kp, mapper, sd) { return slerp(rigRotOf(R, k, "foot_" + sd), relRot(mapper.poseAt(k).S, bi("foot_" + sd)), blendW(k, kp)); }
// REV1 geometric rows (P-1 … P-13 with P-5 replaced, P-9 / P-10 physical, P-11 rendered)
export function geomRowsRev1(R, k, kp, mapper, G) { const P = mapper.poseAt(k), pr = R.pres[k], w = pr.world, idx = P.idx, rigRot = (rb) => rigRotOf(R, k, rb), rend = (vb) => relRot(P.S, bi(vb)), out = { fails: [] }, chk = (n, v, lim) => { out[n] = +v.toFixed(4); if (v > lim) out.fails.push(n); };
  const hipMidRig = V.sc(V.add(m2p(w[idx.thigh_L]), m2p(w[idx.thigh_R])), 0.5), hipMidV2 = V.sc(V.add(P.S[bi("thigh_L")].pos, P.S[bi("thigh_R")].pos), 0.5);
  chk("P1_pelvisMm", V.dist(hipMidRig, hipMidV2) * 1000, TOL.pelvisMm); chk("P2_pelvisDeg", qang(rend("pelvis"), rigRot("pelvis")), TOL.pelvisDeg);
  chk("P3_trunkDeg", Math.max(qang(rend("abdomen"), rigRot("spine")), qang(rend("thorax"), rigRot("chest")), qang(rend("head"), rigRot("head"))), TOL.trunkDeg);
  let hp = 0, kn = 0, an = 0, ls = 0, tw = 0, arm = 0, bootPen = 0, footRel = {}; const inContact = new Set();
  for (const sd of ["L", "R"]) { hp = Math.max(hp, V.dist(m2p(w[idx["thigh_" + sd]]), P.S[bi("thigh_" + sd)].pos)); kn = Math.max(kn, V.dist(m2p(w[idx["shin_" + sd]]), P.S[bi("shank_" + sd)].pos)); an = Math.max(an, V.dist(m2p(w[idx["foot_" + sd]]), P.S[bi("foot_" + sd)].pos));
    for (const [rb, vb] of [["thigh_" + sd, "thigh_" + sd], ["shin_" + sd, "shank_" + sd]]) { const st = swingTwist(rigRot(rb), rend(vb), [0, -1, 0]); ls = Math.max(ls, st.swing); tw = Math.max(tw, Math.abs(st.twist)); }
    arm = Math.max(arm, qang(rend("upperArm_" + sd), rigRot("upperArm_" + sd)) * R_ * G.upperArmLen * 1000, qang(rend("forearm_" + sd), rigRot("foreArm_" + sd)) * R_ * (G.upperArmLen + G.foreArmLen) * 1000);
    const f = pr.feet[sd === "L" ? 0 : 1], lo = bodyLowest(B[bi("foot_" + sd)], P.S[bi("foot_" + sd)]).y; footRel[sd] = { physVsPresDeg: +qang(rend("foot_" + sd), rigRot("foot_" + sd)).toFixed(2), pitchDeg: P.foot[sd] ? +(+P.foot[sd].pitchDeg).toFixed(2) : 0, physLowestMm: +(lo * 1000).toFixed(1), contact: f.contact, mode: f.mode };
    if (f.contact) { inContact.add("foot_" + sd); if (lo < TOL.footContactLo || lo > TOL.footContactHi) out.fails.push("P9_footContact_" + sd); }
    // P-11: the RENDERED foot (blend) + toe (stream-A local rotation, raised to y = 0 if it would go below): penetration of the rendered boot
    const qR = renderedFoot(R, k, kp, mapper, sd), dq = Q.mul(qR, Q.conj(rigRot("foot_" + sd))), A = m2p(w[idx["foot_" + sd]]), T = m2p(w[idx["toe_" + sd]]), toeM = w[idx["toe_" + sd]];
    const heel = V.add(A, Q.rot(qR, [0, -0.088, -0.0808])), toeJ = V.add(A, Q.rot(dq, V.sub(T, A))), tipRaw = V.add(toeJ, Q.rot(Q.mul(dq, m2q(toeM)), [0, -0.031, G.toeLen[sd]])), tip = [tipRaw[0], Math.max(0, tipRaw[1]), tipRaw[2]];   // toe raised (presentation-only) when below y = 0
    bootPen = Math.max(bootPen, -Math.min(0, heel[1], toeJ[1] - 0.031, tip[1]) * 1000); }
  chk("P4_hipMm", hp * 1000, TOL.hipMm); chk("P4_kneeMm", kn * 1000, TOL.kneeMm); chk("P4_ankleMm", an * 1000, TOL.ankleMm); chk("P6_limbSwingDeg", ls, TOL.limbSwingDeg); chk("P7_twistDeg", tw, TOL.twistDeg); chk("P8_armMm", arm, TOL.armMm);
  let ncLow = Infinity, ncBody = null; for (let i = 0; i < NB; i++) { if (inContact.has(B[i].name)) continue; const lo = bodyLowest(B[i], P.S[i]).y; if (lo < ncLow) { ncLow = lo; ncBody = B[i].name; } }
  out.P10_nonContactLowestMm = +(ncLow * 1000).toFixed(1); out.P10_body = ncBody; if (ncLow < TOL.nonContactLo) out.fails.push("P10_nonContact");
  chk("P11_renderedBootPenMm", bootPen, TOL.bootPenMm); const clampMax = Math.max(...Object.values(P.clamp)); out.P12_clampMaxDeg = +clampMax.toFixed(6); if (clampMax > TOL.clampDeg) out.fails.push("P12_clamp");
  let sep = { d: Infinity }; for (const [i, j] of SELF_PAIRS) { const s = bodySep(i, j, P.S); if (s.d < sep.d) sep = { d: s.d, pair: B[i].name + "↔" + B[j].name }; } out.P13_minSelfSepMm = +(sep.d * 1000).toFixed(1); out.P13_pair = sep.pair; if (sep.d < -TOL.selfMm / 1000) out.fails.push("P13_self");
  out.foot = footRel; out.knee = P.info; return out; }
// REV1 kinematic rows: P-14 / P-15 for every non-foot body; P-16 / P-17 whole body incl. the physical (reconciled) feet; TR-1 rendered foot
export function kinRowsRev1(R, k, kp, mapper) { const out = { fails: [] }; if (k < 1) return out;
  const st = (kk) => { const pr = R.pres[kk], rr = rawRotations(R.bones, R.bind, pr.world, {}), P = mapper.poseAt(kk), refCom = [], v2Com = [], refRot = [], v2Rot = [];
    for (let i = 0; i < NB; i++) { const rb = anchorOf[B[i].name], org = rb ? m2p(pr.world[rr.idx[rb]]) : P.S[0].pos; refCom.push(V.add(org, Q.rot(rr.raw[i], B[i].comLocal))); v2Com.push(V.add(P.S[i].pos, Q.rot(P.S[i].rot, B[i].comLocal)));
      refRot.push(Q.norm(Q.mul(rr.raw[i], Q.conj(Z0[i].rot)))); v2Rot.push(relRot(P.S, i)); } return { refCom, v2Com, refRot, v2Rot }; };
  const a = st(k - 1), b = st(k); let lv = { d: 0 }, av = { d: 0, ax: 0, tr: 0 }; const vRef = [], vV2 = [], wRef = [], wV2 = [];
  for (let i = 0; i < NB; i++) { const u = V.sc(V.sub(b.refCom[i], a.refCom[i]), 60), v = V.sc(V.sub(b.v2Com[i], a.v2Com[i]), 60); vRef.push(u); vV2.push(v); const wr = angVel(a.refRot[i], b.refRot[i]), wv = angVel(a.v2Rot[i], b.v2Rot[i]); wRef.push(wr); wV2.push(wv);
    if (/^foot_/.test(B[i].name)) continue; const d = V.dist(u, v); if (d > lv.d) lv = { d, body: B[i].name };
    const dw = V.sub(wv, wr), axis = V.norm(Q.rot(b.v2Rot[i], [0, -1, 0])), axc = V.dot(dw, axis), trc = V.len(V.sub(dw, V.sc(axis, axc))), dd = V.len(dw); if (dd > av.d) av = { d: dd, body: B[i].name, ax: axc, tr: trc }; }
  out.P14_bodyVelMs = +lv.d.toFixed(3); out.P14_body = lv.body; if (lv.d > TOL.bodyVel) out.fails.push("P14_bodyVel");
  out.P15_angVelRadS = +av.d.toFixed(3); out.P15_body = av.body; out.P15_axial = +av.ax.toFixed(3); out.P15_transverse = +av.tr.toFixed(3); if (av.d > TOL.angVel) out.fails.push("P15_angVel");
  const comV = (vs) => V.sc(vs.reduce((s, v, i) => V.add(s, V.sc(v, B[i].mass)), [0, 0, 0]), 1 / Mtot), dCom = V.dist(comV(vRef), comV(vV2)); out.P16_comVelMs = +dCom.toFixed(4); if (dCom > TOL.comVel) out.fails.push("P16_comVel");
  const Lof = (coms, vs, rots, ws) => { const c = V.sc(coms.reduce((s, p, i) => V.add(s, V.sc(p, B[i].mass)), [0, 0, 0]), 1 / Mtot); let Lt = [0, 0, 0];
    for (let i = 0; i < NB; i++) { const I = B[i].inertia, wl = Q.rot(Q.conj(rots[i]), ws[i]), Iw = [0, 1, 2].map(r => I[r][0] * wl[0] + I[r][1] * wl[1] + I[r][2] * wl[2]); Lt = V.add(Lt, V.add(V.cross(V.sub(coms[i], c), V.sc(vs[i], B[i].mass)), Q.rot(rots[i], Iw))); } return Lt; };
  const Lr = Lof(b.refCom, vRef, b.refRot, wRef), Lv = Lof(b.v2Com, vV2, b.v2Rot, wV2), dL = V.dist(Lr, Lv), lim = TOL.Lrel * Math.max(V.len(Lr), TOL.Lfloor);
  out.P17_dL = +dL.toFixed(3); out.P17_limit = +lim.toFixed(3); if (dL > lim) out.fails.push("P17_angMom");
  // TR-1 (rendered foot): per-frame increment of the rendered-vs-stream-A relative rotation ≤ 5°, rendered angular velocity vs stream A ≤ 2 rad/s
  let inc = 0, rw = 0; for (const sd of ["L", "R"]) { const r0 = renderedFoot(R, k - 1, kp, mapper, sd), r1 = renderedFoot(R, k, kp, mapper, sd), p0 = rigRotOf(R, k - 1, "foot_" + sd), p1 = rigRotOf(R, k, "foot_" + sd);
    inc = Math.max(inc, qang(Q.norm(Q.mul(r1, Q.conj(p1))), Q.norm(Q.mul(r0, Q.conj(p0))))); rw = Math.max(rw, V.dist(angVel(r0, r1), angVel(p0, p1))); }
  out.TR1_footIncDeg = +inc.toFixed(2); out.TR1_footAngVelRadS = +rw.toFixed(3); if (inc > 5) out.fails.push("TR1_footInc"); if (rw > TOL.angVel) out.fails.push("TR1_footAngVel");
  return out; }

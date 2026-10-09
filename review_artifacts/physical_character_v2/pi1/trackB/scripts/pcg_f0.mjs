// PCG-F0 shared implementation (TRACKB_PREREG.md §3 + A2): PM-1-F0 posing, geometric rows P-1 … P-13, kinematic rows P-14 … P-17. Used by compat_gate_v13.mjs
// and pcg_scan.mjs (one implementation; moved here unchanged from compat_gate_v13.mjs).
import fs from "fs";
export const L = await import(new URL("../../scripts/compat_lib.mjs", import.meta.url).href);
const { loadSim } = await import(new URL("./charcollide_sim.mjs", import.meta.url).href);
export const { V, Q, B, NB, bi, loadAir, m2q, m2p, qang, slerp, rawRotations, project, gjk, supportOf, capsuleSupport, capsulePen, bodySep, sim2r, bodyLowest, SELF_PAIRS, swingTwist, Z0 } = L;
export const RANK = { NEGLIGIBLE: 0, CORRECTION: 1, STUMBLE: 2, FALL: 3 };
export const WT = process.env.V13_WT; if (!WT) throw new Error("V13_WT (v1.3 worktree) required");
export const SIMV = loadSim(WT); export const PROF = SIMV.g("PT_CHARCOLLIDE.profiles.vinicius"); export const segR = (sg, t) => (sg.ra != null ? sg.ra + (sg.rb - sg.ra) * Math.max(0, Math.min(1, t)) : sg.r);
export const TOL = { pelvisMm: 10, pelvisDeg: 2, trunkDeg: 3, hipMm: 10, kneeMm: 10, ankleMm: 10, footContactLo: -0.005, footContactHi: 0.002, nonContactLo: -0.005, footDeg: 5, bootPenMm: 10, limbSwingDeg: 2, twistDeg: 10, armMm: 15,
  clampDeg: 1e-6, selfMm: 10, bodyVel: 0.25, angVel: 2.0, comVel: 0.05, Lrel: 0.10, Lfloor: 1.0 };
export const SEGMAP = { foot_L: "foot_L", foot_R: "foot_R", toe_L: "foot_L", toe_R: "foot_R", shin_L: "shank_L", shin_R: "shank_R", thigh_L: "thigh_L", thigh_R: "thigh_R", pelvis: "pelvis", torso: "abdomen" };
export const ADJ = { foot_L: [["shank_L", "ankle"]], foot_R: [["shank_R", "ankle"]], shank_L: [["foot_L", "ankle"], ["thigh_L", "knee"]], shank_R: [["foot_R", "ankle"], ["thigh_R", "knee"]], thigh_L: [["shank_L", "knee"]], thigh_R: [["shank_R", "knee"]] };
export const toeBone = PROF.rig.bones.find(b => b.name === "toe_L"), toeAxisB = V.add(toeBone.offsetLocal, PROF.toe.bToe);
export const AXES = { foot: [PROF.foot.a, PROF.foot.b], toe: [PROF.toe.aFoot, toeAxisB] };   // A2: CG-4 axes on the F0 foot body (foot frame at bind)
export const relRot = (S, i) => Q.norm(Q.mul(S[i].rot, Q.conj(Z0[i].rot))), onBody = (S, i, l) => V.add(S[i].pos, Q.rot(relRot(S, i), l));
export function rigGeom(R) { const idx = Object.fromEntries(R.bones.map((b, i) => [b.name, i])), bo = (n) => m2p(R.bind[idx[n]]); return { idx, toeLen: { L: 0.0966, R: 0.0966 }, upperArmLen: V.dist(bo("upperArm_L"), bo("foreArm_L")), foreArmLen: V.dist(bo("foreArm_L"), bo("hand_L")) }; }
// pose a row: "F" = PM-1-F0 (R-K, projection; no R-B, no vertical shift); "A" = plain mapping (report only)
export function pose(R, k, mode) { const pr = R.pres[k], rr = rawRotations(R.bones, R.bind, pr.world, { rk: mode === "F" }), pj = project(rr.raw, pr.world, rr.idx); return { ...pj, raw: rr.raw, rk: rr.info, idx: rr.idx }; }
export const interp = (P0, P1, t) => P1.S.map((s, i) => ({ rot: slerp(P0.S[i].rot, s.rot, t), pos: V.lerp(P0.S[i].pos, s.pos, t) }));
export const F0BOOTTIP = (() => { const f = B[bi("foot_L")]; let m = -Infinity; for (const s of f.shapes) if (s.type === "hull") for (const p of s.points) m = Math.max(m, p[2] + s.pos[2]); return m; })();   // reported only
// geometric PCG rows on one frame (P-1 … P-13)
export function geomRows(R, k, P, G) { const pr = R.pres[k], w = pr.world, idx = P.idx, rot = (vb) => P.S[bi(vb)].rot, rigRot = (rb) => Q.norm(Q.mul(m2q(w[idx[rb]]), Q.conj(m2q(R.bind[idx[rb]]))));
  const rend = (vb) => relRot(P.S, bi(vb)), out = { fails: [] }, chk = (name, v, lim) => { out[name] = +v.toFixed(4); if (v > lim) out.fails.push(name); };
  const hipMidRig = V.sc(V.add(m2p(w[idx.thigh_L]), m2p(w[idx.thigh_R])), 0.5), hipMidV2 = V.sc(V.add(P.S[bi("thigh_L")].pos, P.S[bi("thigh_R")].pos), 0.5);
  chk("P1_pelvisMm", V.dist(hipMidRig, hipMidV2) * 1000, TOL.pelvisMm); chk("P2_pelvisDeg", qang(rend("pelvis"), rigRot("pelvis")), TOL.pelvisDeg);
  chk("P3_trunkDeg", Math.max(qang(rend("abdomen"), rigRot("spine")), qang(rend("thorax"), rigRot("chest")), qang(rend("head"), rigRot("head"))), TOL.trunkDeg);
  let hp = 0, kn = 0, an = 0, fd = 0, ls = 0, tw = 0, arm = 0, bootPen = 0, footContact = [], mtpFlex = {}, toeShort = {}; const inContact = new Set();
  for (const sd of ["L", "R"]) { hp = Math.max(hp, V.dist(m2p(w[idx["thigh_" + sd]]), P.S[bi("thigh_" + sd)].pos)); kn = Math.max(kn, V.dist(m2p(w[idx["shin_" + sd]]), P.S[bi("shank_" + sd)].pos)); an = Math.max(an, V.dist(m2p(w[idx["foot_" + sd]]), P.S[bi("foot_" + sd)].pos));
    fd = Math.max(fd, qang(rend("foot_" + sd), rigRot("foot_" + sd)));
    for (const [rb, vb] of [["thigh_" + sd, "thigh_" + sd], ["shin_" + sd, "shank_" + sd]]) { const st = swingTwist(rigRot(rb), rend(vb), [0, -1, 0]); ls = Math.max(ls, st.swing); tw = Math.max(tw, Math.abs(st.twist)); }
    arm = Math.max(arm, qang(rend("upperArm_" + sd), rigRot("upperArm_" + sd)) * Math.PI / 180 * G.upperArmLen * 1000, qang(rend("forearm_" + sd), rigRot("foreArm_" + sd)) * Math.PI / 180 * (G.upperArmLen + G.foreArmLen) * 1000);
    const f = pr.feet[sd === "L" ? 0 : 1], lo = bodyLowest(B[bi("foot_" + sd)], P.S[bi("foot_" + sd)]).y;
    if (f.contact) { inContact.add("foot_" + sd); footContact.push({ foot: sd, mode: f.mode, lowestMm: +(lo * 1000).toFixed(1) }); if (lo < TOL.footContactLo || lo > TOL.footContactHi) out.fails.push("P9_footContact_" + sd); }
    const qF = rend("foot_" + sd), qFr = rigRot("foot_" + sd), dq = Q.mul(qF, Q.conj(qFr)), A = m2p(w[idx["foot_" + sd]]), T = m2p(w[idx["toe_" + sd]]), toeM = w[idx["toe_" + sd]], tipLocal = [0, -0.031, G.toeLen[sd]];
    const tip = V.add(T, Q.rot(m2q(toeM), tipLocal)), tipR = V.add(A, Q.rot(dq, V.sub(tip, A))); bootPen = Math.max(bootPen, -Math.min(0, tipR[1]) * 1000 - Math.max(0, -tip[1]) * 1000);
    // reported only: the presentation's MTP flexion and the rendered toe tip vs the F0 boot tip
    mtpFlex[sd] = +qang(rigRot("toe_" + sd), rigRot("foot_" + sd)).toFixed(1); const rigTip = V.add(T, Q.rot(m2q(toeM), V.sc([0, -0.19672463281145933, 0.9804587797787301], toeBone.lengthM)));
    toeShort[sd] = +(V.dist(rigTip, onBody(P.S, bi("foot_" + sd), [0, -0.07, F0BOOTTIP])) * 1000).toFixed(1); }
  chk("P4_hipMm", hp * 1000, TOL.hipMm); chk("P4_kneeMm", kn * 1000, TOL.kneeMm); chk("P4_ankleMm", an * 1000, TOL.ankleMm); chk("P5_footDeg", fd, TOL.footDeg); chk("P6_limbSwingDeg", ls, TOL.limbSwingDeg); chk("P7_twistDeg", tw, TOL.twistDeg); chk("P8_armMm", arm, TOL.armMm);
  let ncLow = Infinity, ncBody = null; for (let i = 0; i < NB; i++) { if (inContact.has(B[i].name)) continue; const lo = bodyLowest(B[i], P.S[i]).y; if (lo < ncLow) { ncLow = lo; ncBody = B[i].name; } }
  out.P10_nonContactLowestMm = +(ncLow * 1000).toFixed(1); out.P10_body = ncBody; if (ncLow < TOL.nonContactLo) out.fails.push("P10_nonContact");
  chk("P11_bootPenAddedMm", bootPen, TOL.bootPenMm); const clampMax = Math.max(...Object.values(P.clamp)); out.P12_clampMaxDeg = +clampMax.toFixed(6); out.P12_clampJoint = Object.entries(P.clamp).sort((a, b) => b[1] - a[1])[0][0]; if (clampMax > TOL.clampDeg) out.fails.push("P12_clamp");
  let sep = { d: Infinity }; for (const [i, j] of SELF_PAIRS) { const s = bodySep(i, j, P.S); if (s.d < sep.d) sep = { d: s.d, pair: B[i].name + "↔" + B[j].name }; } out.P13_minSelfSepMm = +(sep.d * 1000).toFixed(1); out.P13_pair = sep.pair; if (sep.d < -TOL.selfMm / 1000) out.fails.push("P13_self");
  out.footContact = footContact; out.report = { mtpFlexDeg: mtpFlex, rigToeTipToF0BootTipMm: toeShort }; return out; }
// kinematic PCG rows on frame k (needs k − 1): P-14 … P-17
export const anchorOf = { pelvis: null, abdomen: "spine", thorax: "chest", head: "head", upperArm_L: "upperArm_L", upperArm_R: "upperArm_R", forearm_L: "foreArm_L", forearm_R: "foreArm_R", thigh_L: "thigh_L", thigh_R: "thigh_R", shank_L: "shin_L", shank_R: "shin_R", foot_L: "foot_L", foot_R: "foot_R" };
export const angVel = (q0, q1) => { let d = Q.norm(Q.mul(q1, Q.conj(q0))); if (d[3] < 0) d = d.map(x => -x); const s = Math.hypot(d[0], d[1], d[2]), ang = 2 * Math.atan2(s, d[3]); return s < 1e-12 ? [0, 0, 0] : V.sc([d[0] / s, d[1] / s, d[2] / s], ang * 60); };
export const Mtot = B.reduce((s, b) => s + b.mass, 0);
export function kinRows(R, k, getP) { const out = { fails: [] }; if (k < 1) return out;
  const st = (kk) => { const pr = R.pres[kk], rr = rawRotations(R.bones, R.bind, pr.world, {}), P = getP(kk), refCom = [], v2Com = [], refRot = [], v2Rot = [];
    for (let i = 0; i < NB; i++) { const rb = anchorOf[B[i].name], org = rb ? m2p(pr.world[rr.idx[rb]]) : P.S[0].pos; refCom.push(V.add(org, Q.rot(rr.raw[i], B[i].comLocal))); v2Com.push(V.add(P.S[i].pos, Q.rot(P.S[i].rot, B[i].comLocal)));
      refRot.push(Q.norm(Q.mul(rr.raw[i], Q.conj(Z0[i].rot)))); v2Rot.push(relRot(P.S, i)); } return { refCom, v2Com, refRot, v2Rot }; };
  const a = st(k - 1), b = st(k); let lv = { d: 0 }, av = { d: 0 }; const vRef = [], vV2 = [], wRef = [], wV2 = [];
  for (let i = 0; i < NB; i++) { const u = V.sc(V.sub(b.refCom[i], a.refCom[i]), 60), v = V.sc(V.sub(b.v2Com[i], a.v2Com[i]), 60); vRef.push(u); vV2.push(v); const d = V.dist(u, v); if (d > lv.d) lv = { d, body: B[i].name };
    const wr = angVel(a.refRot[i], b.refRot[i]), wv = angVel(a.v2Rot[i], b.v2Rot[i]); wRef.push(wr); wV2.push(wv); const dw = V.dist(wr, wv); if (dw > av.d) av = { d: dw, body: B[i].name }; }
  out.P14_bodyVelMs = +lv.d.toFixed(3); out.P14_body = lv.body; if (lv.d > TOL.bodyVel) out.fails.push("P14_bodyVel");
  out.P15_angVelRadS = +av.d.toFixed(3); out.P15_body = av.body; if (av.d > TOL.angVel) out.fails.push("P15_angVel");
  const comV = (vs) => V.sc(vs.reduce((s, v, i) => V.add(s, V.sc(v, B[i].mass)), [0, 0, 0]), 1 / Mtot), dCom = V.dist(comV(vRef), comV(vV2)); out.P16_comVelMs = +dCom.toFixed(4); if (dCom > TOL.comVel) out.fails.push("P16_comVel");
  const Lof = (coms, vs, rots, ws) => { const c = V.sc(coms.reduce((s, p, i) => V.add(s, V.sc(p, B[i].mass)), [0, 0, 0]), 1 / Mtot); let Lt = [0, 0, 0];
    for (let i = 0; i < NB; i++) { const I = B[i].inertia, wl = Q.rot(Q.conj(rots[i]), ws[i]), Iw = [0, 1, 2].map(r => I[r][0] * wl[0] + I[r][1] * wl[1] + I[r][2] * wl[2]); Lt = V.add(Lt, V.add(V.cross(V.sub(coms[i], c), V.sc(vs[i], B[i].mass)), Q.rot(rots[i], Iw))); } return Lt; };
  const Lr = Lof(b.refCom, vRef, b.refRot, wRef), Lv = Lof(b.v2Com, vV2, b.v2Rot, wV2), dL = V.dist(Lr, Lv), lim = TOL.Lrel * Math.max(V.len(Lr), TOL.Lfloor);
  out.P17_dL = +dL.toFixed(3); out.P17_Lref = +V.len(Lr).toFixed(3); out.P17_limit = +lim.toFixed(3); if (dL > lim) out.fails.push("P17_angMom"); return out; }

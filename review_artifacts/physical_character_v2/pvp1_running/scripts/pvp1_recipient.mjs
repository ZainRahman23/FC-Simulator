// PVP-1: the RUNNING RECIPIENT. A genuine RUN-1 runner, handed to the physical V2 body mid-stride.
// Source: the frozen Locomotion V2 straight-line baseline (tag locomotion-v2-straight-baseline-1 = 4a226b1f), read-only, through the run-in that
// sp2a_run1.mjs extracts (LV2_STATE.queryAt, PI-1 mapper). The frame is the SP2A mapping: travel +z, horizontal and vertical motion scaled by
// the leg ratio.
// Body: the tacklers' body (V1-matched V2, 1.90 m, 78.9 kg), canonical M1b muscles, canonical V2 contact. No TCF-1 and no friction scaling for
// the recipient.
//
// HANDOFF (the SP2A takeover, unchanged, applied to the recipient)
//   At one RUN-1 frame the physical body is created in RUN-1's own pose AND velocity (sp2a_author entryFromRunIn → sp_entry buildEntry: every
//   body velocity is joint-consistent with the animation's joint rates, its pelvis angular velocity and its root velocity; an airborne frame keeps
//   the animation's own height above the turf). Its muscle state starts at the whole-body inverse dynamics of the incoming run at that frame
//   (sp2a_wbid: the torques the muscles must be producing if the run continues). That is the one state write; afterwards only excitation.
//
// INTENT: the runner's own locomotion intent, never a reaction. RUN-1's own continuation (every joint angle, the run as it would have gone on)
// is tracked by the SP2 RegionalTracker on M1b (finite authority) with:
//   STANCE SUPPORT, one objective per RUN-1 stance (the sp_vf mapping: a support force realised ONLY as stance-leg joint torques against the
//   real contact; τ_j = −(c − p_j) × F):
//     vertical   RUN-1's COM height trajectory (its vertical acceleration as feed-forward, plus PD);
//     horizontal along the contact → COM line (spring-mass running), plus a regulator toward RUN-1's horizontal COM velocity, limited to the
//                friction cone;
//     pelvis     orientation toward RUN-1's, through the stance hip, net of the other hip and lumbar (SIMBICON's stance-hip rule);
//     tactile gate: active only while that leg's boot actually touches the turf. A foot that is swept away stops supporting.
//   SWING: RUN-1's swing (PD plus free-chain inverse-dynamics feed-forward). Optional SIMBICON foot placement (opts.place): the swing hip's
//   target moves with the COM velocity error.
//   Stance-leg tracking authority is reduced during its RUN-1 stance (SP2A's plant rule: a loaded leg yields through its support objective).
//   No regional failure, no whole-body fallback, no ragdoll, no tackle awareness. A touched region yields locally (the SP2 controllers' tactile
//   local yield); nothing else changes when it is touched.
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, S1 = RA + "slide_phys1/scripts/";
const L = await import(S1 + "sp_lib.mjs"), { V, Q, B, JN, M, G, bi, ji } = L;
const EN = await import(S1 + "sp_entry.mjs"), C = await import(S1 + "sp_chor.mjs"), VF = await import(S1 + "sp_vf.mjs");
const AA = await import(RA + "sp2a/scripts/sp2a_author.mjs"), WB = await import(RA + "sp2a/scripts/sp2a_wbid.mjs"), RT = await import(RA + "slide_phys2/scripts/sp2_ctrl.mjs");
const D2R = Math.PI / 180, smooth = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
export const GAINS = AA.GAINS;
export const DEFAULTS = { lead: 0.07, rateLead: 0.015, ffLead: 0.1, stanceAuth: 0.3, authRamp: 0.025, ffRamp: 0.02,
  support: { ky: 200, dy: 30, kv: 2.0, mu: 0.8, ko: 300, do: 40, ramp: 0.02, pre: 0.03, post: 0.03, gate: { clearM: 0.012, ramp: 0.015 }, capScale: true },
  place: null, regional: { DfailDeg: 1e9 }, muscle: "M1b", tauCbMs: undefined };
// ── the RUN-1 run-in and the handoff ──
// kH: the handoff frame. A frame inside a stance hands off a planted runner; a frame in flight hands off an airborne one (its height above the
// turf is the animation's own, measured against the next touchdown).
export function loadRun(file) { const d = JSON.parse(fs.readFileSync(file)), F = d.frames, h = F[1].t - F[0].t; return { d, F, h }; }
export function stanceAt(F, k) { return { L: !!F[k].stance.L, R: !!F[k].stance.R }; }
export function nextTouchdown(F, k) { for (let i = k + 1; i < F.length; i++) for (const s of ["L", "R"]) if (F[i].stance[s] && !F[i - 1].stance[s]) return { k: i, side: s }; return null; }
export function handoff(R, kH, window = 0.9) { const { d, F, h } = R, st = stanceAt(F, kH), air = !st.L && !st.R, td = air ? nextTouchdown(F, kH) : null;
  const RI = { d, F, k0: kH, kTD: air ? td.k : kH, kS: Math.max(0, kH - Math.round(window / h)) };
  const entry = AA.entryFromRunIn(RI), E = EN.buildEntry(entry), sup = air ? "none" : st.L && st.R ? "foot_L" : st.L ? "foot_L" : "foot_R";
  const SA = AA.statesAtFrame(RI, E.root), id = WB.wholeBodyID(SA, kH, h, sup);
  return { RI, entry, E, SA, initTau: id.tau, initGRF: id.grf, support: sup, airborne: air, tH: F[kH].t, stance: st }; }
// RUN-1's own continuation on the recipient body, from the handoff (t = 0) for tEnd: COM (y, velocity, vertical acceleration), pelvis
// orientation and angular velocity, both feet's stance flags, and the anatomical joint angles (the tracking choreography)
// qR (optional): the recipient's placement yaw in the scene; every world-frame quantity of the plan (horizontal COM velocity, pelvis orientation and
// angular velocity) is rotated with it (the joint angles and heights are frame-free)
export function continuation(H, tEnd = 3.2, tPre = 0.06, qR = [0, 0, 0, 1]) { const { RI } = H, F = RI.F, h = F[1].t - F[0].t, k0 = RI.k0, kA = Math.max(1, k0 - Math.round(tPre / h)), kB = Math.min(F.length - 2, k0 + Math.round(tEnd / h));
  const rows = []; for (let k = kA - 1; k <= kB + 1; k++) { const S = H.SA(k); rows.push({ k, t: F[k].t - F[k0].t, com: L.comOf(S), rot: S[0].rot, stance: F[k].stance, anat: F[k].anat, S }); }
  for (let i = 1; i < rows.length - 1; i++) { const a = rows[i - 1], b = rows[i + 1], r = rows[i]; r.v = V.sc(V.sub(b.com, a.com), 1 / (2 * h)); r.ay = (b.com[1] - 2 * r.com[1] + a.com[1]) / (h * h);
    const dq0 = Q.norm(Q.mul(b.rot, Q.conj(a.rot))), dq = dq0[3] < 0 ? dq0.map(x => -x) : dq0, s = Math.hypot(dq[0], dq[1], dq[2]); r.w = s < 1e-12 ? [0, 0, 0] : V.sc([dq[0] / s, dq[1] / s, dq[2] / s], 2 * Math.atan2(s, dq[3]) / (2 * h)); }
  // RUN-1's own whole-body inverse dynamics at every frame (sp2a_wbid, the support = the RUN-1 stance foot, none in flight): the joint torques the
  // run requires (its motor program; the recipient's muscles receive it with a lead, opts.idff)
  for (let i = 1; i < rows.length - 1; i++) { const r = rows[i], st = r.stance, sup = st.L ? "foot_L" : st.R ? "foot_R" : "none"; r.tau = WB.wholeBodyID(H.SA, r.k, h, sup).tau; r.sup = sup; }
  const R = rows.slice(1, -1), keys = Object.entries(R[0].anat).flatMap(([j, o]) => Object.keys(o).map(k => j + "." + k)), tracks = {};
  for (const name of keys) { const [j, key] = name.split("."); tracks[name] = []; for (let i = 0; i < R.length; i += 2) tracks[name].push([+R[i].t.toFixed(5), R[i].anat[j][key]]); }
  const at = (t) => { const u = (t - R[0].t) / h, i = Math.max(0, Math.min(R.length - 2, Math.floor(u))), f = Math.max(0, Math.min(1, u - i)), a = R[i], b = R[i + 1];
    const vh = Q.rot(qR, [a.v[0] + (b.v[0] - a.v[0]) * f, 0, a.v[2] + (b.v[2] - a.v[2]) * f]);
    return { y: a.com[1] + (b.com[1] - a.com[1]) * f, vy: a.v[1] + (b.v[1] - a.v[1]) * f, ay: a.ay + (b.ay - a.ay) * f, vx: vh[0], vz: vh[2],
      R: Q.norm(Q.mul(qR, L.slerp(a.rot, b.rot, f))), w: Q.rot(qR, V.add(V.sc(a.w, 1 - f), V.sc(b.w, f))) }; };
  const tauAt = (t) => { const u = (t - R[0].t) / h, i = Math.max(0, Math.min(R.length - 2, Math.floor(u))), f = Math.max(0, Math.min(1, u - i)), a = R[i].tau, b = R[i + 1].tau; return a.map((x, k) => x.map((y, q) => y + (b[k][q] - y) * f)); };
  // RUN-1 stance intervals per side (t from the handoff); a stance in progress at the handoff starts before 0
  const stances = []; for (const s of ["L", "R"]) { let a = null; for (let i = 0; i < R.length; i++) { const on = !!R[i].stance[s]; if (on && a == null) a = R[i].t; if (!on && a != null) { stances.push({ side: s, t0: a, t1: R[i - 1].t }); a = null; } } if (a != null) stances.push({ side: s, t0: a, t1: R[R.length - 1].t }); }
  stances.sort((x, y) => x.t0 - y.t0);
  const stR = R.filter(r => r.stance.L || r.stance.R), meanStanceY = stR.reduce((a, r) => a + r.com[1], 0) / Math.max(1, stR.length), mv = R.reduce((a, r) => V.add(a, r.v), [0, 0, 0]), meanV = Q.rot(qR, V.sc([mv[0], 0, mv[2]], 1 / R.length));
  return { rows: R, at, tauAt, meanStanceY, meanV, chor: { name: "RUN-1 continuation (recipient)", tracks }, stances, h, qR }; }
// ── the running support objective (one per stance; sp_vf's conventions) ──
export function makeRunSupport(plan) { const s = plan.side, jA = ji("ankle_" + s), jK = ji("knee_" + s), jH = ji("hip_" + s), jHo = ji("hip_" + (s === "L" ? "R" : "L")), jLu = ji("lumbar"), foot = bi("foot_" + s), g = plan.gains;
  const gs = { w: 0, n: -1 };
  const fn = (tr, t, st, ev) => { fn.lastW = 0; const t0 = plan.window[0], t1 = plan.window[1], ramp = g.ramp; if (t < t0 || t > t1) return null; let w = Math.min(1, (t - t0) / ramp, (t1 - t) / ramp); if (w <= 0) return null;
    // tactile gate: the boot's lowest point within clearM of the turf (ramped once per plant step, whatever the call count)
    const lo = L.PL.bodyLowest(B[foot], st[foot]).y, ok = lo < g.gate.clearM, n = tr._n ?? 0; if (gs.n !== n) { gs.w = Math.max(0, Math.min(1, gs.w + (ok ? 1 : -1) * (1 / 240) / g.gate.ramp)); gs.n = n; }
    w *= gs.w; if (w <= 0) return null;
    let com = [0, 0, 0], P = [0, 0, 0]; st.forEach((b, i) => { com = V.add(com, V.sc(b.com, B[i].mass)); P = V.add(P, V.sc(b.v, B[i].mass)); }); com = V.sc(com, 1 / M); const v = V.sc(P, 1 / M);
    const c = plan.com(t), cf = plan.lead ? plan.com(t + plan.lead) : c, fs = st[foot], cpt = V.add(fs.pos, Q.rot(fs.rot, [0, -0.09, 0.07])), d = V.sub(com, cpt);
    let F;
    // g.mode "fb" (with the inverse-dynamics feed-forward): the objective is FEEDBACK only (the run's own support force is already in the feed-forward)
    if (g.mode === "fb") F = [M * g.kv * (c.vx - v[0]) * w, M * (g.ky * (c.y - com[1]) + g.dy * (c.vy - v[1])) * w, M * g.kv * (c.vz - v[2]) * w];
    else { const ay = cf.ay + g.ky * (c.y - com[1]) + g.dy * (c.vy - v[1]); F = [0, M * (ay + G) * w, 0]; if (F[1] < 0) F[1] = 0;
      if (d[1] > 0.2) { F[0] = F[1] * d[0] / d[1]; F[2] = F[1] * d[2] / d[1]; }
      F[0] += M * g.kv * (c.vx - v[0]) * w; F[2] += M * g.kv * (c.vz - v[2]) * w;
      const fh = Math.hypot(F[0], F[2]), cap = g.mu * F[1]; if (fh > cap && fh > 0) { F[0] *= cap / fh; F[2] *= cap / fh; } }
    const chain = [jA, jK, jH], out = JN.map(() => [0, 0, 0]), add = (k, tw) => { const ax3 = VF.axesW(st, JN[k]); for (let i = 0; i < 3; i++) out[k][i] += V.dot(tw, ax3[i]); };
    // capScale (sp_vf's rule): scale the support force to what the stance chain can produce this step, keeping its direction
    if (g.capScale && tr.m) { let sc = 1; for (const k of chain) { const tw = V.sc(V.cross(V.sub(cpt, VF.jointPos(st, JN[k])), F), -1), ax3 = VF.axesW(st, JN[k]);
        for (let i = 0; i < 3; i++) { const mr = tr.m[k] && tr.m[k][i] && tr.m[k][i].row; if (!mr || !/flex|df|abd/.test(tr.m[k][i].d.key)) continue; const need = V.dot(tw, ax3[i]); if (Math.abs(need) < 15) continue;
          const own = tr.lastIntent && tr.lastIntent[k] ? tr.lastIntent[k][i] || 0 : 0, hiF = mr.capP + mr.tauP, loF = -mr.capM + mr.tauP;
          const avail = need > 0 ? hiF - Math.max(0, Math.min(hiF, own)) : loF - Math.min(0, Math.max(loF, own)); sc = Math.min(sc, Math.max(0, avail / need)); } }
      if (sc < 1) for (let q = 0; q < 3; q++) F[q] *= sc; }
    for (const k of chain) add(k, V.sc(V.cross(V.sub(cpt, VF.jointPos(st, JN[k])), F), -1));
    const pel = st[0], T = V.sc(V.add(V.sc(rotvec(c.R, pel.rot), g.ko), V.sc(V.sub(c.w, pel.w), g.do)), w);
    let other = [0, 0, 0]; for (const k of [jHo, jLu]) { const ax3 = VF.axesW(st, JN[k]), it = tr.lastIntent && tr.lastIntent[k]; if (!it) continue; for (let i = 0; i < 3; i++) { let x = it[i] || 0; const mr = tr.m && tr.m[k] && tr.m[k][i] && tr.m[k][i].row; if (mr) x = Math.max(mr.lo, Math.min(mr.hi, x)); other = V.sub(other, V.sc(ax3[i], x)); } }
    add(jH, V.sc(V.sub(T, other), -1)); out.info = { F, T, w, side: s }; fn.lastW = w; fn.lastInfo = out.info; return out; };
  fn.lastW = 0; return fn; }
const rotvec = (Rd, R) => { const dq = Q.mul(Rd, Q.conj(R)), d = dq[3] < 0 ? dq.map(x => -x) : dq, s = Math.hypot(d[0], d[1], d[2]); if (s < 1e-12) return [0, 0, 0]; const a = 2 * Math.atan2(s, d[3]); return [d[0] / s * a, d[1] / s * a, d[2] / s * a]; };
// ── the recipient controller (RegionalTracker on M1b; RunnerTracker adds the optional foot-placement feedback and per-step support logging) ──
export class RunnerTracker extends RT.RegionalTracker {
  step(n, st, ev) { if (this.o.contactState) { const cs = this.o.contactState; for (const sd of ["L", "R"]) { const f = bi("foot_" + sd), lo = L.PL.bodyLowest(B[f], st[f]).y; cs[sd] = Math.max(0, Math.min(1, cs[sd] + (lo < 0.012 ? 1 : -1) * (1 / 240) / 0.02)); } }
    if (this.o.place) { let P = [0, 0, 0]; st.forEach((b, i) => { P = V.add(P, V.sc(b.v, B[i].mass)); }); this.fb = V.sc(P, 1 / M); }
    const out = super.step(n, st, ev), row = this.log[this.log.length - 1]; if (row && this.o.debugJ) row.dbg = Object.fromEntries(this.o.debugJ.map(jn => { const k = JN.findIndex(j => j.name === jn); return [jn, { pd: this.lastIntent[k].map(x => +x.toFixed(1)), out: out[k].map(x => +x.toFixed(1)) }]; })); if (row && this._sup) { const a = this._sup.filter(f => f.lastW > 0); if (a.length) { row.sup = a.map(f => f.side).join(""); const I = a[0].lastInfo; if (I) row.vf = { F: I.F.map(x => +x.toFixed(1)), T: I.T.map(x => +x.toFixed(1)), w: +I.w.toFixed(3) }; } } return out; } }
export function makeRecipient(H, CO, opts = {}) { const O = { ...DEFAULTS, ...opts, support: { ...DEFAULTS.support, ...(opts.support || {}) } }, chor0 = C.compile(CO.chor), sup = [];
  // foot placement (optional): while a leg swings, its hip flexion / abduction targets move with the COM velocity error (SIMBICON's c_v)
  const ctl = { tr: null }, PLC = O.place, swingOf = (t, s) => !CO.stances.some(x => x.side === s && t >= x.t0 - 0.01 && t <= x.t1 + 0.01);
  const fwd = Q.rot(CO.qR, [0, 0, 1]), left = Q.rot(CO.qR, [1, 0, 0]);
  const chor = PLC ? { ...chor0, anatAt: (t) => { const a = chor0.anatAt(t), tr = ctl.tr; if (!tr || !tr.fb) return a; const c = CO.at(t), dv = [tr.fb[0] - c.vx, 0, tr.fb[2] - c.vz], ev = [V.dot(dv, left), V.dot(dv, fwd)];
      for (const s of ["L", "R"]) { if (!swingOf(t, s)) continue; const sg = s === "L" ? 1 : -1; a["hip_" + s].flex = (a["hip_" + s].flex ?? 0) + PLC.cvF * ev[1]; a["hip_" + s].abd = (a["hip_" + s].abd ?? 0) + sg * PLC.cvL * ev[0]; } return a; } } : chor0;
  // opts.catch (contact-driven support; inert when absent): ONE support objective per leg, active whenever that leg's boot actually touches the turf
  // (tactile gate), whatever RUN-1's clock says. Inside the leg's RUN-1 stance it follows RUN-1's plan; a touchdown outside it (early / late: the
  // body is lower or slower than the run) gets the CATCH plan: hold the COM at RUN-1's mean stance height (vy → 0) and keep RUN-1's mean
  // horizontal velocity. The stance-leg authority / free-chain feed-forward follow the same sensed contact.
  const contact = { L: 0, R: 0 }, inSt = (t, s) => CO.stances.some(x => x.side === s && t >= x.t0 - O.support.pre && t <= x.t1 + O.support.post);
  if (O.catch) { const yC = O.catch.y ?? CO.meanStanceY, catchAt = (t) => { const c = CO.at(t); return { ...c, y: yC, vy: 0, ay: 0, vx: CO.meanV[0], vz: CO.meanV[2] }; };
    for (const s of ["L", "R"]) { const f = makeRunSupport({ side: s, window: [-1e9, 1e9], com: (t) => inSt(t, s) ? CO.at(t) : catchAt(t), lead: O.lead, gains: O.support }); f.side = s; sup.push(f); } }
  else for (const s of CO.stances) { const f = makeRunSupport({ side: s.side, window: [s.t0 - O.support.pre, s.t1 + O.support.post], com: CO.at, lead: O.lead, gains: O.support }); f.side = s.side; sup.push(f); }
  const inStance = (t, s) => CO.stances.some(x => x.side === s && t >= x.t0 && t <= x.t1), legOf = { hip_L: "L", knee_L: "L", ankle_L: "L", hip_R: "R", knee_R: "R", ankle_R: "R" };
  const stanceW0 = (t, s) => { let w = 0; for (const x of CO.stances) if (x.side === s) w = Math.max(w, Math.min(smooth((t - x.t0 + O.authRamp) / O.authRamp), smooth((x.t1 + O.authRamp - t) / O.authRamp))); return w; };
  const stanceW = (t, s) => O.catch ? Math.max(stanceW0(t, s), contact[s]) : stanceW0(t, s);
  const authority = (t, j) => { const s = legOf[j]; if (!s) return 1; return 1 - (1 - O.stanceAuth) * stanceW(t, s); };
  const ff = O.idff ? [] : [{ chain: ["hip_L", "knee_L", "ankle_L"], weight: (t) => 1 - stanceW(t, "L") }, { chain: ["hip_R", "knee_R", "ankle_R"], weight: (t) => 1 - stanceW(t, "R") }, { chain: ["shoulder_L", "elbow_L"], weight: () => 1 }, { chain: ["shoulder_R", "elbow_R"], weight: () => 1 }];
  // opts.idff = { lead (s), w }: RUN-1's whole-body inverse dynamics at t + lead, every joint axis (the motor program; the lead covers M1b's
  // excitation → activation → developed-force lag, which also pre-activates the stance extensors before touchdown)
  if (O.idff) { const IF = O.idff; sup.unshift(Object.assign((tr, t) => { const tau = CO.tauAt(t + IF.lead), out = JN.map((_, k) => [0, 1, 2].map(i => (IF.w ?? 1) * (tau[k][i] || 0))); out.info = null; return out; }, { lastW: 0, side: "ff" })); }
  const make = () => { const tr = new RunnerTracker({ chor, lead: O.lead, ffLead: O.ffLead, rateLead: O.rateLead, gains: O.gains || GAINS, authority, vfs: sup, ff, couple: null, t0: O.t0 || 0,
    regional: { ...RT.DEFAULT_REG, ...O.regional }, contactAuth: null, initChor: chor0, initTau: H.initTau, initMix: O.initMix ?? 1, place: PLC, contactState: O.catch ? contact : null, debugJ: O.debugJ || null }); tr._sup = sup; ctl.tr = tr; return tr; };
  return { make, opts: O, inStance };
}

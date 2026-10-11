// IFM-1 GEOMETRY-ONLY FIXTURE GENERATOR (prereg §4, §5, §6.1–6.2, §6.4 precheck, §8 entry checks that need no physics). No Jolt object is
// created and nothing is stepped. Output: ifm1/fixture/IFM1_FIXTURE.json (frozen before any IFM-1 stepping, with the implementation hashes).
// usage (cwd = worktree root): LV2_ARCHIVE=<git archive of the RUN-1 tag> node review_artifacts/physical_character_v2/ifm1/scripts/ifm1_fixture.mjs
import fs from "fs"; import path from "path";
const L = await import(new URL("./ifm1_lib.mjs", import.meta.url).href), { V, Q, IFM1, ROLES, BODIES, MC, CL } = L;
const LV = L.loadLV2(), RG = L.rigOf(LV), { SK, bindW, RIG } = RG, D2R = Math.PI / 180, R2D = 180 / Math.PI;
const out = { fixture: "IFM1_FIXTURE", prereg: "ifm1/Touchline_IFM1_Claude_Preregistration.md", inputs: "ifm1/IFM1_INPUTS.json", params: IFM1, trajectory: L.TRAJ, notes: [] };
// ═══ §4.1 RUN-1 history: one actor, constant 3.000 m/s from t = 0 (the rendered replay path); three complete cycles, select in the fourth ═══
const { A } = L.makeActor(LV), E = LV.E, T = E.r1GaitAt(A.body, A.prm, IFM1.v).T;
const Qat = (t) => LV.LV.queryAt(E, A, L.simAt, t, L.vOf, null, { provenance: false });
const u0 = Qat(1e-9).gait.phase, rate = 1 / T;
// right-touchdown times (phase wraps to 0): the first at or after t = 0, then every T (constant speed: phase rate = 1 / stride time)
const firstWrap = u0 <= 1e-12 ? 0 : (1 - u0) * T, wraps = [0, 1, 2, 3, 4, 5].map(k => firstWrap + k * T);
const c4 = [wraps[3], wraps[4]]; E.r1Replay(A, L.vOf, null, c4[0])();   // commit the actor at the start of cycle 4 (queryAt reproduces the rendered path exactly either way)
out.history = { strideT: T, phaseAtStart: u0, phaseRate: rate, rightTouchdowns: wraps.slice(0, 5), cycle4: c4, note: "cycles are intervals between right touchdowns (gait phase u = 0); three complete cycles [w0, w3) precede cycle 4 [w3, w4); no articulated physics exists during the history" };
// fixed world → local transform: subtract the rounded root position at the start of cycle 4 (anim3d world: x = pitch x, y up, z = −pitch y)
const s4 = L.simAt(c4[0]), OFF = [Math.round(s4.x), 0, Math.round(-s4.y)]; out.worldToLocal = { subtract: OFF, frame: "anim3d world (x = pitch x, y up, z = −pitch y) minus this offset; one transform for both states and both bodies" };
const toLocal = (p) => V.sub(p, OFF);
// ═══ §4.2 stage predicates on the frozen state machine (LV2-STATE-1 legs.*.contact.subPhase) ═══
const PRED = { "S-FLAT": (q) => !!q.legs.L.stance && q.legs.L.contact.subPhase === "flat" && !q.legs.R.stance && q.legs.R.contact.subPhase === "swing",
  "S-TOE": (q) => !!q.legs.L.stance && /^toe pad/.test(q.legs.L.contact.subPhase) && !q.legs.R.stance && q.legs.R.contact.subPhase === "swing" };
const N = IFM1.gridN, tg = (i) => c4[0] + (i / N) * T;
const grid = []; for (let i = 0; i <= N; i++) { const q = Qat(tg(i)); grid.push({ i, t: tg(i), L: q.legs.L.contact.subPhase, R: q.legs.R.contact.subPhase, Ls: !!q.legs.L.stance, Rs: !!q.legs.R.stance }); }
const bis = (pred, tf, tt) => { let a = tf, b = tt; for (let k = 0; k < IFM1.bisect; k++) { const m = 0.5 * (a + b); if (pred(Qat(m))) b = m; else a = m; } return b; };   // returns the first-true boundary time between a false time tf and a true time tt
const states = {};
for (const [id, pred] of Object.entries(PRED)) {
  const val = grid.map(g => pred(Qat(g.t))), runs = []; let s = null;
  for (let i = 0; i <= N; i++) { if (val[i] && s == null) s = i; if ((!val[i] || i === N) && s != null) { const e = val[i] ? i : i - 1; runs.push([s, e]); s = null; } }
  const ivs = runs.map(([a, b]) => { const t0 = a === 0 ? tg(0) : bis(pred, tg(a - 1), tg(a)), t1 = b === N ? tg(N) : bis((q) => !pred(q), tg(b), tg(b + 1)); return { t0, t1, dur: t1 - t0, grid: [a, b], atCycleEdge: a === 0 || b === N }; });
  if (!ivs.length) { states[id] = { status: "STATE_UNAVAILABLE", intervals: [] }; continue; }
  const best = ivs.reduce((m, x) => (x.dur > m.dur + 1e-15 ? x : m), ivs[0]), tm = 0.5 * (best.t0 + best.t1), q = Qat(tm);
  states[id] = { status: "SELECTED", intervals: ivs, selected: best, tMid: tm, phase: q.gait.phase, support: q.gait.support, plantedFeet: q.gait.plantedFeet, stageL: q.legs.L.contact.subPhase, stageR: q.legs.R.contact.subPhase,
    toToeOffL: q.legs.L.toToeOff, sinceTouchdownL: q.legs.L.sinceTouchdown, stanceFractionL: q.legs.L.s, contactL: { pivot: q.legs.L.contact.pivot, pivotPoint: q.legs.L.contact.pivotPoint, plant: q.legs.L.contact.plant, footPitch: q.legs.L.contact.footPitch, mtpExtension: q.legs.L.contact.mtpExtension, soleGround: q.legs.L.contact.soleGround },
    root: { position: q.root.position, heading: q.root.heading, linearVelocity: q.root.linearVelocity, yawRate: q.root.yawRate },
    joints: q.joints.map(j => ({ name: j.name, position: j.world.position, rotation: j.world.rotation, linearVelocity: j.world.linearVelocity, angularVelocity: j.world.angularVelocity, tip: j.world.tip, tipVelocity: j.world.tipVelocity })) };
}
out.states = states; out.gridSummary = { N, samples: grid.length };
// ═══ §6 receiver entry per body × state (MC-1; one grounding translation; HG-A uniform horizontal shift) ═══
const PR2 = 0.18, DL = MC.MC1.delta;
const entries = {};
for (const bname of BODIES) for (const sid of Object.keys(states)) {
  const key = `${bname}/${sid}`, st = states[sid]; if (st.status !== "SELECTED") { entries[key] = { status: "STATE_UNAVAILABLE" }; continue; }
  const spec = L.SPECS[bname](), md = MC.model(spec), B = spec.bodies, M = B.reduce((s, b) => s + b.mass, 0), bi = (n) => B.findIndex(b => b.name === n);
  const qs = [Qat(st.tMid - DL), Qat(st.tMid), Qat(st.tMid + DL)], q = qs[1], m = MC.mapLV2toV2(spec, RIG, { m: qs[0], 0: qs[1], p: qs[2] });
  const rf = ["L", "R"].map(sd => [0, 1, 2].map(i => (m.lower.poses[i].foot && m.lower.poses[i].foot[sd] ? m.lower.poses[i].foot[sd].pitchDeg : 0)));
  const valid = rf.every(a => (a.every(Number.isFinite) && Math.abs(a[2] - a[0]) < 0.05) || a.every(x => !Number.isFinite(x)));
  const e = { status: "MAPPED", spec: L.specHash(spec), M, mapperValidRF1: valid, rf1PitchDeg: rf, fit: m.fit, vd: m.vd, lowerFoot: m.lower.poses[1].foot };
  // grounding: LEFT F0 sole lowest point → +0.0005 m (one uniform vertical translation)
  const fL = bi("foot_L"), low = CL.bodyLowest(B[fL], m.S[fL]).y, dy = IFM1.groundLift - low; e.grounding = { leftSoleLowestBeforeMm: low * 1000, dyMm: dy * 1000, exceeds10mm: Math.abs(dy) > IFM1.groundMax };
  const S = m.S.map(s => ({ pos: toLocal(V.add(s.pos, [0, dy, 0])), rot: Q.norm(s.rot.slice()) }));
  const vRaw = m.vel.map(x => x.v.slice()), w = m.vel.map(x => x.w.slice());
  // HG-A v2 shift with the physical mass: s_h = v_auth,h − P_raw,h / M (applied to every body; ω, positions and the vertical unchanged)
  const Praw = vRaw.reduce((s, v, i) => V.add(s, V.sc(v, B[i].mass)), [0, 0, 0]), vAuth = [L.simAt(st.tMid).vx, 0, -L.simAt(st.tMid).vy], sh = [vAuth[0] - Praw[0] / M, 0, vAuth[2] - Praw[2] / M];
  const vShift = vRaw.map(v => V.add(v, sh)), Psh = vShift.reduce((s, v, i) => V.add(s, V.sc(v, B[i].mass)), [0, 0, 0]);
  const comW = (i) => L.comWorld(spec, S, i), C = V.sc(B.reduce((s, b, i) => V.add(s, V.sc(comW(i), b.mass)), [0, 0, 0]), 1 / M);
  const Lc = (vv) => B.reduce((s, b, i) => { const Iw = MC.Iworld(S[i].rot, b.inertia); return V.add(s, V.add(V.cross(V.sub(comW(i), C), V.sc(vv[i], b.mass)), L.mat3vec(Iw, w[i]))); }, [0, 0, 0]);
  const vrel = (vv, i) => V.sub(vv[i], V.sc(vv.reduce((s, v, k) => V.add(s, V.sc(v, B[k].mass)), [0, 0, 0]), 1 / M));
  e.momentum = { Praw, Pshift: Psh, M_vAuth: V.sc(vAuth, M), sh, shNorm: Math.hypot(sh[0], sh[2]), vAuth, comVyRaw: Praw[1] / M, Lcom: Lc(vShift), LcomRaw: Lc(vRaw),
    HGA2_1: Math.hypot(Psh[0] - M * vAuth[0], Psh[2] - M * vAuth[2]) / M, HGA2_2: Math.max(V.dist(Lc(vShift), Lc(vRaw)), ...B.map((_, i) => V.dist(vrel(vShift, i), vrel(vRaw, i)))), HGA2_3pass: Math.hypot(sh[0], sh[2]) <= 0.180 };
  // entry kinematics: finite, masses / inertias, joint configuration (exact bound range semantics), anchors and anchor velocities (double precision)
  const finite = S.every(s => s.pos.concat(s.rot).every(Number.isFinite)) && vShift.concat(w).every(v => v.every(Number.isFinite));
  const posDef = B.every(b => { const I = b.inertia, d1 = I[0][0], d2 = I[0][0] * I[1][1] - I[0][1] * I[1][0], d3 = I[0][0] * (I[1][1] * I[2][2] - I[1][2] * I[2][1]) - I[0][1] * (I[1][0] * I[2][2] - I[1][2] * I[2][0]) + I[0][2] * (I[1][0] * I[2][1] - I[1][1] * I[2][0]); return b.mass > 0 && d1 > 0 && d2 > 0 && d3 > 0; });
  let romMin = Infinity, romWho = null; const romPer = {};
  for (const j of spec.joints) { const a = L.anatomicalAngles(j, S[j.parentIndex].rot, S[j.childIndex].rot); for (const kk of Object.keys(a)) { const hd = j.def.rom[kk] && j.def.rom[kk].hard; if (!hd) continue; const mm = Math.min(a[kk] - hd[0], hd[1] - a[kk]); romPer[j.name + "." + kk] = mm; if (mm < romMin) { romMin = mm; romWho = j.name + "." + kk; } } }
  let anc = 0, ancV = 0; for (const j of spec.joints) { const p = S[j.parentIndex], c = S[j.childIndex], pa = V.add(p.pos, Q.rot(p.rot, V.sub(j.at, B[j.parentIndex].origin))), ca = V.add(c.pos, Q.rot(c.rot, V.sub(j.at, B[j.childIndex].origin)));
    anc = Math.max(anc, V.dist(pa, ca)); ancV = Math.max(ancV, V.dist(L.velAt({ v: vShift[j.parentIndex], w: w[j.parentIndex] }, comW(j.parentIndex), pa), L.velAt({ v: vShift[j.childIndex], w: w[j.childIndex] }, comW(j.childIndex), ca))); }
  const lows = B.map((b, i) => ({ body: b.name, mm: CL.bodyLowest(b, S[i]).y * 1000 })), turfPenMm = Math.max(0, ...lows.map(x => -x.mm));
  const allowed = []; const dis = new Set(spec.disabledPairs.map(([a, b]) => Math.min(a, b) + "-" + Math.max(a, b))); for (let i = 0; i < B.length; i++) for (let k = i + 1; k < B.length; k++) if (!dis.has(i + "-" + k)) allowed.push([i, k]);
  let sep = { d: Infinity }; for (const [i, k] of allowed) { const s2 = L.bodySepGeneric(spec, S, i, k); if (s2.d < sep.d) sep = { d: s2.d, pair: B[i].name + "↔" + B[k].name }; }
  e.entryKinematics = { finite, massInertiaPositive: posDef, hardRangeMarginMinDeg: romMin, hardRangeWho: romWho, hardRangePer: romPer, anchorResidualM: anc, anchorVelResidualMs: ancV, lowestPointsMm: lows, turfPenMm, selfSepMinMm: sep.d * 1000, selfSepPair: sep.pair,
    selfPenMm: Math.max(0, -sep.d * 1000), note: "self-separation by GJK over allowed pairs (0 = touching, reported as 0 penetration); turf penetration from the lowest point of every body after grounding" };
  // ── handoff rows against the frozen definitions (HG-A v2 above; PR-2; P-14c … P-17c) on the state actually entered (post-shift) and pre-shift ──
  const ref = m.ref, mo = (vv) => MC.momenta(md, S.map(s => ({ pos: V.add(s.pos, OFF), rot: s.rot })), { v: vv, w });   // momenta in the world frame of the reference
  const kin = (vv) => { let p14 = 0, p15 = 0; for (let i = 0; i < B.length; i++) { if (/^foot_/.test(B[i].name)) continue; p14 = Math.max(p14, V.dist(vv[i], ref.v[i])); p15 = Math.max(p15, V.dist(w[i], ref.w[i])); }
    const M2 = mo(vv), mr = MC.momentaRef(md, ref), dL = V.dist(M2.L, mr.L), lim = 0.10 * Math.max(V.len(mr.L), 1.0); return { P14c: p14, P15c: p15, P16c: V.dist(M2.P, mr.P) / M, P17c: dL, P17lim: lim, P17relRef: dL / Math.max(V.len(mr.L), 1.0), P17fracOfLimit: dL / lim,
      pass: p14 <= 0.25 && p15 <= 2.0 && V.dist(M2.P, mr.P) / M <= 0.05 && dL <= lim }; };
  // PR-2 (rotation retarget, mapped bones take their V2 body's angular velocity, unmapped bones hold the entry local rotation) — every rig landmark vs the RUN-1 stream
  const RET = { pelvis: 0, spine: bi("abdomen"), chest: bi("thorax"), head: bi("head"), ...Object.fromEntries(["L", "R"].flatMap(sd => [["upperArm_" + sd, bi("upperArm_" + sd)], ["foreArm_" + sd, bi("forearm_" + sd)], ["thigh_" + sd, bi("thigh_" + sd)], ["shin_" + sd, bi("shank_" + sd)], ["foot_" + sd, bi("foot_" + sd)]])) };
  const pr2 = (vv) => { const byName = Object.fromEntries(q.joints.map(j => [j.name, j])), wv = {}, vj = {}, pel = byName.pelvis, comP = L.comWorld(spec, m.S, 0); let worst = 0, who = null;   // the ungrounded MC-1 state in the LV2 world frame
    for (const b of SK.bones) { if (b.name === "root") continue; const j = byName[b.name], vb = RET[b.name];
      if (b.name === "pelvis") { wv[b.name] = w[0]; vj[b.name] = V.add(vv[0], V.cross(w[0], V.sub(pel.world.position, comP))); }
      else { const pn = b.parent.name, pj = byName[pn]; vj[b.name] = V.add(vj[pn], V.cross(wv[pn], V.sub(j.world.position, pj.world.position))); wv[b.name] = vb != null ? w[vb] : wv[pn]; }
      const d = V.dist(vj[b.name], j.world.linearVelocity); if (d > worst) { worst = d; who = b.name; }
      const tipV = V.add(vj[b.name], V.cross(wv[b.name], V.sub(j.world.tip, j.world.position))), dt2 = V.dist(tipV, j.world.tipVelocity); if (dt2 > worst) { worst = dt2; who = b.name + ".tip"; } }
    // the audit's PR-2 landmark set (rh1_handoff_eval POINTS; gate = retOver over shoulder / elbowU / elbowF / wrist / handTip / head)
    const vAt = (bone, kind) => { const j = byName[bone]; return kind === "joint" ? vj[bone] : V.add(vj[bone], V.cross(wv[bone], V.sub(j.world.tip, j.world.position))); }, lv = (bone, kind) => { const j = byName[bone]; return kind === "joint" ? j.world.linearVelocity : j.world.tipVelocity; };
    const G = { shoulder: [["upperArm_L", "joint"], ["upperArm_R", "joint"]], elbowU: [["upperArm_L", "tip"], ["upperArm_R", "tip"]], elbowF: [["foreArm_L", "joint"], ["foreArm_R", "joint"]], wrist: [["hand_L", "joint"], ["hand_R", "joint"], ["foreArm_L", "tip"], ["foreArm_R", "tip"]], handTip: [["hand_L", "tip"], ["hand_R", "tip"]], head: [["head", "joint"], ["head", "tip"]], trunk: [["spine", "joint"], ["chest", "joint"], ["chest", "tip"]] };
    const groups = Object.fromEntries(Object.entries(G).map(([g, pts]) => [g, Math.max(...pts.map(([bone, kind]) => V.dist(vAt(bone, kind), lv(bone, kind))))])), gate = Math.max(groups.shoulder, groups.elbowU, groups.elbowF, groups.wrist, groups.handTip, groups.head);
    return { auditGroupsMs: groups, auditGateMs: gate, pass: gate <= PR2, everyRigJointWorstMs: worst, everyRigJointWho: who }; };
  e.handoff = { postShift: { kin: kin(vShift), PR2: pr2(vShift) }, preShift: { kin: kin(vRaw), PR2: pr2(vRaw) }, HGA2_3: { sNorm: Math.hypot(sh[0], sh[2]), pass: Math.hypot(sh[0], sh[2]) <= 0.180 },
    note: "HANDOFF_FAILED if HG-A2.3, PR-2 or P-14c…P-17c fails on the entered (post-shift) state; P-1…P-13 pose rows of the audit are reported by the eval" };
  // ── §6.4 SnapshotTone coordinates: a0 (pyramid twist / swing per joint), ȧ0 from the mapped relative twists; target domain precheck over 150 ms ──
  const tone = spec.joints.map((j, k) => { const R1 = S[j.parentIndex].rot, R2 = S[j.childIndex].rot, qc = L.qcs(j, R1, R2), a0 = L.coordsOf(qc), wcs = Q.rot(Q.conj(Q.mul(R2, j.F2)), V.sub(w[j.childIndex], w[j.parentIndex]));
    let ad = L.solve3(L.pyrJac(a0), wcs); const locked = ["x", "y", "z"].map(kx => (j.locked || []).includes(kx)), lockedRate = ad.filter((_, i) => locked[i]).map(Math.abs); ad = ad.map((x, i) => (locked[i] ? 0 : x));
    return { joint: j.name, a0, adot0: ad, locked, lockedRateResidual: lockedRate.length ? Math.max(...lockedRate) : 0 }; });
  const anat = (j, qc, key) => { const v = L.decompose(Q.norm(Q.mul(j.Cm, qc))), ax = ["x", "y", "z"].find(kx => j.def.axes[kx] && j.def.axes[kx].key === key), a = j.def.axes[ax]; return (ax === "x" ? v.tw : ax === "y" ? v.sy : v.sz) * a.s * R2D; };
  let firstCross = null; const domainMin = {};
  for (let n = 0; n <= IFM1.stepsTotal; n++) { const t = n * IFM1.h;
    spec.joints.forEach((j, k) => { const a = tone[k].a0.map((x, i) => x + tone[k].adot0[i] * t), qr = L.pyr(...a);
      for (const kk of Object.keys(j.def.rom)) { const hd = j.def.rom[kk].hard; if (!hd) continue; const ax = ["x", "y", "z"].find(kx => j.def.axes[kx] && j.def.axes[kx].key === kk); if (!ax || j.def.axes[ax].locked) continue;
        const val = anat(j, qr, kk), mm = Math.min(val - hd[0], hd[1] - val), id = j.name + "." + kk; domainMin[id] = Math.min(domainMin[id] ?? Infinity, mm); if (mm < 0 && !firstCross) firstCross = { t, step: n, joint: id, valueDeg: val, hard: hd }; }
      if (Math.max(Math.abs(a[1]), Math.abs(a[2])) >= Math.PI - 1e-6 && !firstCross) firstCross = { t, step: n, joint: j.name, singular: true }; }); }
  e.snapshotTone = { coords: tone, domain: "anatomical hard range on every unlocked axis (decompose(Cm·q_ref), the passive layer's anat) and |sy|, |sz| < π", firstCrossing: firstCross,
    status: firstCross && firstCross.t < 0.05 - 1e-12 ? "TARGET_DOMAIN_BLOCKED" : firstCross ? "SECONDARY_TRUNCATED_AT_CROSSING" : "IN_DOMAIN", minMarginDegPerAxis: domainMin };
  // initial support-role flags (RUN-1 kinematic intent) and the fixed angular-momentum origin O (entry COM, local frame)
  e.flags = { L: !!q.legs.L.stance, R: !!q.legs.R.stance, sourceSupport: q.gait.support }; e.O = C;
  // entry write set (the 28 receiver assignments) in the local frame
  e.write = { poses: S, vel: vShift.map((v, i) => ({ v, w: w[i] })), velRaw: vRaw.map((v, i) => ({ v, w: w[i] })) };
  // ── §8 entry gate (geometry part; read-back parts are measured by the run harness at t = 0) ──
  const gate = { finite, posDef, rangeOk: romMin >= -1e-9, anchorOk: anc <= IFM1.entry.anchorM, anchorVelOk: ancV <= IFM1.entry.anchorVelMs, groundingOk: !e.grounding.exceeds10mm, turfOk: turfPenMm <= IFM1.entry.turfPenMm, selfOk: e.entryKinematics.selfPenMm <= IFM1.entry.selfPenMm,
    momentumOk: e.momentum.HGA2_1 <= 1e-9, mapperValid: valid };
  e.entryGateGeometry = { ...gate, pass: Object.values(gate).every(Boolean) };
  e.status = !gate.groundingOk ? "INITIALIZATION_INVALID" : e.entryGateGeometry.pass ? "ENTRY_GEOMETRY_OK" : "INITIALIZATION_INVALID";
  entries[key] = e;
}
out.entries = entries;
// ═══ §5 impactor fixtures: geometric distance solve along the outward ray; overlap checks; v_impactor = v_receiver(p) − 3·n_out ═══
const travel = [Math.cos(L.TRAJ.heading), 0, -Math.sin(L.TRAJ.heading)], right = V.norm(V.cross([0, 1, 0], travel)), I = IFM1.impactor;   // anim3d world is mirror-handed (z = −pitch y): runner's right = up × travel (run1_viewer: (lx, ly) = (−uy, ux) in pitch)
const fixtures = {};
for (const role of ROLES) for (const bname of BODIES) {
  const key = `${role.id}/${bname}`, e = entries[`${bname}/${role.state}`]; if (!e || !e.write) { fixtures[key] = { status: e ? e.status : "STATE_UNAVAILABLE" }; continue; }
  const spec = L.SPECS[bname](), B = spec.bodies, bi = (n) => B.findIndex(b => b.name === n), S = e.write.poses, ti = bi(role.body), shape = B[ti].shapes[role.sub];
  if (role.kind === "deltoid" && !/deltoid sphere/.test(shape.note || "")) { fixtures[key] = { status: "FIXTURE_UNAVAILABLE", reason: "designated deltoid sub-shape not identified" }; continue; }
  const sideSign = role.side === "R" ? 1 : -1, nOut = V.sc(right, sideSign);
  const sideCheck = V.dot(V.sub(S[bi("shank_R")].pos, S[bi("shank_L")].pos), right) > 0; if (!sideCheck) throw new Error("fixture side convention inconsistent with the mapped body (right shank not on the runner's right)");
  const refP = role.kind === "shank" ? V.sc(V.add(S[ti].pos, S[bi("foot_" + role.side)].pos), 0.5) : L.shapeWorld(shape, S[ti]).p;   // knee centre = shank origin, ankle centre = foot origin
  const f = (s) => { const c = V.add(refP, V.sc(nOut, s)), r = L.closestOnSwept(shape, S[ti], c); return V.dot(V.sub(c, r.p), r.n) - I.r - I.gap; };
  let lo = null; const nb = Math.round(I.rayMax / I.bracketStep);
  if (f(I.rayMax) <= 0) { fixtures[key] = { status: "FIXTURE_GEOMETRY_BLOCKED", reason: "no exterior solution within 1 m" }; continue; }
  for (let k = nb - 1; k >= 0; k--) if (f(k * I.bracketStep) <= 0) { lo = k * I.bracketStep; break; }
  if (lo == null) { fixtures[key] = { status: "FIXTURE_GEOMETRY_BLOCKED", reason: "reference point outside the target collider (no interior bracket)" }; continue; }
  let a = lo, b = lo + I.bracketStep; for (let k = 0; k < I.bisect; k++) { const mm = 0.5 * (a + b); if (f(mm) <= 0) a = mm; else b = mm; }
  const sOut = b, c = V.add(refP, V.sc(nOut, sOut)), wp = L.closestOnSwept(shape, S[ti], c), dTarget = V.dot(V.sub(c, wp.p), wp.n) - I.r;
  // overlap with every OTHER receiver collider (exact for swept shapes, frozen GJK for box / hull) and the turf
  const others = []; B.forEach((bd, i) => bd.shapes.forEach((s, k) => { if (i === ti && k === role.sub) return; const d = (s.type === "sphere" || s.type === "tapered" || s.type === "capsule") ? (() => { const r = L.closestOnSwept(s, S[i], c); return V.dot(V.sub(c, r.p), r.n); })() : L.sdist(s, S[i], c);
    others.push({ body: bd.name, sub: k, type: s.type, clearanceMm: (d - I.r) * 1000 }); }));
  const minOther = others.reduce((m2, x) => (x.clearanceMm < m2.clearanceMm ? x : m2), others[0]), turfClearMm = (c[1] - I.r) * 1000;
  const comT = L.comWorld(spec, S, ti), vRec = L.velAt({ v: e.write.vel[ti].v, w: e.write.vel[ti].w }, comT, wp.p), vImp = V.sub(vRec, V.sc(wp.n, I.approach));
  const relN = V.dot(V.sub(vImp, vRec), wp.n), relT = V.len(V.sub(V.sub(vImp, vRec), V.sc(wp.n, relN)));
  const status = minOther.clearanceMm <= 0 || turfClearMm <= 0 ? "FIXTURE_GEOMETRY_BLOCKED" : "PLACED";
  fixtures[key] = { status, role: role.id, body: bname, target: { body: role.body, sub: role.sub, type: shape.type, note: shape.note }, referencePoint: refP, outwardRay: nOut, rightOfRunner: right, sideConsistency: sideCheck,
    rayDistance: sOut, centre: c, witness: wp.p, normalOut: wp.n, targetDistance: dTarget, rayVsNormalDeg: Math.acos(Math.max(-1, Math.min(1, V.dot(nOut, wp.n)))) * R2D,
    witnessLocal: Q.rot(Q.conj(S[ti].rot), V.sub(wp.p, S[ti].pos)), normalLocal: Q.rot(Q.conj(S[ti].rot), wp.n),
    vReceiverAtWitness: vRec, vImpactor: vImp, wImpactor: [0, 0, 0], relativeNormalSpeed: relN, relativeTangentialSpeed: relT, otherClearancesMm: others, minOtherClearance: minOther, turfClearanceMm: turfClearMm,
    impactor: { radius: I.r, mass: I.m, inertia: I.I } };
}
// R0 / RH1 placement differences per role
out.placementDifferences = Object.fromEntries(ROLES.map(r => { const a = fixtures[`${r.id}/R0`], b = fixtures[`${r.id}/RH1`]; return [r.id, a && b && a.centre && b.centre ? { centreDiffMm: V.dist(a.centre, b.centre) * 1000, witnessDiffMm: V.dist(a.witness, b.witness) * 1000, normalDiffDeg: Math.acos(Math.max(-1, Math.min(1, V.dot(a.normalOut, b.normalOut)))) * R2D, vImpactorDiffMs: V.dist(a.vImpactor, b.vImpactor) } : null]; }));
out.fixtures = fixtures;
out.toolFinding = "the frozen PCG sdShape approximates Jolt's tapered capsule (up to ≈ 0.5 mm vs the exact convex hull of the two end spheres); IFM-1 uses the exact closed form for sphere / tapered / capsule targets and clearances (closestOnSwept, verified against brute force to 4e-12 m) and the frozen GJK sdShape only for box / hull clearances";
fs.mkdirSync(path.join(L.RA, "ifm1/fixture"), { recursive: true });
fs.writeFileSync(path.join(L.RA, "ifm1/fixture/IFM1_FIXTURE.json"), JSON.stringify(out, null, 1));
for (const [k, s] of Object.entries(states)) console.log(`${k}: ${s.status}${s.tMid != null ? ` t ${s.tMid.toFixed(6)} s, phase ${s.phase.toFixed(5)}, L ${s.stageL} / R ${s.stageR}, interval ${(s.selected.dur * 1000).toFixed(3)} ms of ${s.intervals.length}, toToeOff ${s.toToeOffL != null ? (s.toToeOffL * 1000).toFixed(2) : "—"} ms` : ""}`);
for (const [k, e] of Object.entries(entries)) console.log(`${k}: ${e.status}${e.grounding ? ` · RF-1 valid ${e.mapperValidRF1} · grounding ${e.grounding.dyMm.toFixed(3)} mm · |s_h| ${e.momentum.shNorm.toFixed(4)} m/s · v_COM,y ${e.momentum.comVyRaw.toFixed(3)} · ROM min ${e.entryKinematics.hardRangeMarginMinDeg.toFixed(2)}° (${e.entryKinematics.hardRangeWho}) · anchor ${e.entryKinematics.anchorResidualM.toExponential(1)} m / ${e.entryKinematics.anchorVelResidualMs.toExponential(1)} m/s · turf pen ${e.entryKinematics.turfPenMm.toFixed(3)} mm · self ${e.entryKinematics.selfSepMinMm.toFixed(1)} mm (${e.entryKinematics.selfSepPair}) · PR-2 post ${e.handoff.postShift.PR2.auditGateMs.toFixed(3)} / pre ${e.handoff.preShift.PR2.auditGateMs.toFixed(3)} (every joint post ${e.handoff.postShift.PR2.everyRigJointWorstMs.toFixed(3)} ${e.handoff.postShift.PR2.everyRigJointWho}) · P14c ${e.handoff.postShift.kin.P14c.toFixed(3)} · tone ${e.snapshotTone.status}${e.snapshotTone.firstCrossing ? " @" + (e.snapshotTone.firstCrossing.t * 1000).toFixed(1) + " ms " + e.snapshotTone.firstCrossing.joint : ""}` : ""}`);
for (const [k, f] of Object.entries(fixtures)) console.log(`${k}: ${f.status}${f.centre ? ` · ray ${(f.rayDistance * 1000).toFixed(2)} mm · target gap ${(f.targetDistance * 1000).toFixed(4)} mm · ray↔normal ${f.rayVsNormalDeg.toFixed(2)}° · min other ${f.minOther ? f.minOther.clearanceMm : f.minOtherClearance.clearanceMm.toFixed(1)} mm (${f.minOtherClearance.body}.${f.minOtherClearance.sub}) · turf ${f.turfClearanceMm.toFixed(1)} mm · rel normal ${f.relativeNormalSpeed.toFixed(4)} tangential ${f.relativeTangentialSpeed.toExponential(1)} · side ok ${f.sideConsistency}` : f.reason ? " · " + f.reason : ""}`);

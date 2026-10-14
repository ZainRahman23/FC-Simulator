// SP2A — AUTHORED intent + rigid body. One continuous authored skeletal timeline:
//   RUN-1 run-in (the frozen Locomotion V2 gait, read-only: sp2a_run1.mjs) → the commitment touchdown (t = 0, the LEFT foot: the final running
//   stride becomes the commitment) → commit / launch (the free thigh, both hips, pelvis, trunk and arms reorganise DURING the final stance) →
//   short flight / scissor → the folded-leg 3D tuck (sp2a_tuck.mjs, geometric) → bent-leg-side ground entry → physical slide.
// Separation of concerns (the brief): the AUTHORED skeletal choreography (joint-space tracks; pelvis orientation only as an objective realised
// through supporting legs) vs the PHYSICAL whole-body trajectory (never written: the root / COM move only by gravity and contacts; the one state
// write is the activation at t = 0, and that state is the run-in animation's own pose AND velocity, so nothing is reset).
// Before t = 0 the character is the RUN-1 animation (kinematic presentation, as in production); from t = 0 the articulated body tracks the
// authored intent with finite authority (M1c tackler, TCF-1 boots, A6 tactile regional yielding + A7 contact-driven authority).
import fs from "fs";
const S1 = new URL("../../slide_phys1/scripts/", import.meta.url).href, L = await import(S1 + "sp_lib.mjs"), EN = await import(S1 + "sp_entry.mjs"), CD = await import(S1 + "sp_cand.mjs");
const AU = await import(S1 + "sp_authority.mjs"), C0 = await import(S1 + "sp_chor.mjs"), WB = await import(new URL("./sp2a_wbid.mjs", import.meta.url).href), RT = await import(new URL("../../slide_phys2/scripts/sp2_ctrl.mjs", import.meta.url).href), CN = await import(new URL("../../slide_phys2/scripts/sp2_cand.mjs", import.meta.url).href);
const { V, Q, B, JN, bi } = L, D2R = Math.PI / 180;
// ── RUN-1 run-in → our frame (RUN-1 travels +x; ours +z: yaw −90° about +y) ──
export const QMAP = Q.axis([0, 1, 0], -Math.PI / 2), mapP = (p) => Q.rot(QMAP, p), mapQ = (q) => Q.norm(Q.mul(QMAP, q));
// tTD null → the LEFT touchdown inside [1.9, 2.7] s of the extracted window (≥ 0.66 s of run-in before it, ≥ 0.3 s of RUN-1 after it)
// takeover (s): the physical body takes over this long AFTER the plant touchdown (default 25 ms = 6 steps): RUN-1's forefoot lands over the first
// ≈ 16 ms (an animation contact transient — a rigid physical contact would have to stop the falling boot in one step, an impulse no soft
// tissue spreads); by 25 ms the plant sole is planted (vertical ≈ 0) and the takeover state is the animation's own, mid-stance.
export function loadRunIn(file, tTD, window = 0.66, takeover = -0.075) { const d = JSON.parse(fs.readFileSync(file)), F = d.frames;
  if (tTD == null || Number.isNaN(tTD)) { const td = d.touchdowns.find(x => x.foot === "L" && x.t >= 1.9 && x.t <= 2.7); if (!td) throw new Error("no left touchdown in [1.9, 2.7]"); tTD = td.t; }
  const hF = F[1].t - F[0].t; takeover = Math.round(takeover / hF) * hF; const tPlant = tTD; tTD = tTD + takeover;   // takeover rounded to whole frames
  const k0 = F.findIndex(f => Math.abs(f.t - tTD) < 1e-4);
  if (k0 < 0) throw new Error("touchdown " + tTD + " not sampled"); const kS = F.findIndex(f => f.t >= tTD - window - 1e-9);
  const kTD = F.findIndex(f => Math.abs(f.t - tPlant) < 1e-4); return { d, F, k0, kS, kTD, frames: F.slice(kS, k0 + 2), tPlant, takeover }; }
// pelvis decomposition in the sp_entry convention (q = yaw·pitch·roll) — the inverse of EN.pelvisRot
export function pelvisAngles(q) { const f = Q.rot(q, [0, 0, 1]), yaw = Math.atan2(f[0], f[2]), pitch = Math.asin(Math.max(-1, Math.min(1, -f[1]))), qy = L.axisQ([0, 1, 0], yaw / D2R), qp = L.axisQ([1, 0, 0], pitch / D2R);
  const qr = Q.mul(Q.conj(Q.mul(qy, qp)), q), roll = 2 * Math.atan2(qr[2], qr[3]); return { pitchDeg: pitch / D2R, rollDeg: roll / D2R, yawDeg: yaw / D2R }; }
const angDiff = (a, b) => { const o = {}; for (const [j, v] of Object.entries(a)) { o[j] = {}; for (const [k, x] of Object.entries(v)) o[j][k] = x - (b[j] ? b[j][k] ?? x : x); } return o; };
// leg-length ratio tackler / RUN-1 runner (the mapped runner body is V2's runner spec); vertical pelvis motion is scaled by it
const legLen = (spec) => { const bb = spec.bodies, th = bb.find(b => b.name === "thigh_L"), sh = bb.find(b => b.name === "shank_L"); return th.length + sh.length; };
export const LEGR = legLen(L.PL.SPEC_T()) / legLen(L.PL.SPEC_R());
// the physical entry at t = 0 from the animation itself: pose angles, anatomical rates (central difference), pelvis orientation + angular velocity,
// root velocity (RUN-1 pelvis velocity mapped; vertical scaled by the leg ratio) — buildEntry makes every body velocity joint-consistent
export function entryFromRunIn(RI) { const F = RI.F, k = RI.k0, f = F[k], fm = F[k - 1], fp = F[k + 1], h = fp.t - fm.t;
  const rate = {}; for (const [j, v] of Object.entries(f.anat)) { rate[j] = {}; for (const key of Object.keys(v)) rate[j][key] = (fp.anat[j][key] - fm.anat[j][key]) / h; }
  const qm = mapQ(fm.pelvis.rot), qp = mapQ(fp.pelvis.rot), dq0 = Q.norm(Q.mul(qp, Q.conj(qm))), dq = dq0[3] < 0 ? dq0.map(x => -x) : dq0, s = Math.hypot(dq[0], dq[1], dq[2]), ang = 2 * Math.atan2(s, dq[3]);
  const pelvisW = s < 1e-12 ? [0, 0, 0] : V.sc([dq[0] / s, dq[1] / s, dq[2] / s], ang / h), pv = V.sc(V.sub(mapP(fp.pelvis.pos), mapP(fm.pelvis.pos)), 1 / h);
  // airborne takeover (frame before the planned touchdown): the entry keeps the animation's own height (its lowest point relative to the
  // touchdown frame, where the plant boot is on the turf) instead of being placed on the turf
  let lowestY; if (RI.kTD != null && RI.k0 < RI.kTD) { const SA = statesAtFrame(RI, [0, 1, 0]); lowestY = L.lowestOf(SA(RI.k0)).y - L.lowestOf(SA(RI.kTD)).y + 0.0005; }
  return { id: "E-RUN1@" + RI.d.speed, ...(lowestY != null ? { lowestY } : {}), note: "the RUN-1 animation's own state at the takeover (pose + velocity; pelvis motion scaled geometrically by the leg ratio — dynamic similarity, the tackler runs LEGR × the RUN-1 speed)",
    anat: f.anat, rate, pelvis: pelvisAngles(mapQ(f.pelvis.rot)), pelvisW, vRoot: [pv[0] * LEGR, pv[1] * LEGR, pv[2] * LEGR] }; }
// RUN-1's own continuation past the touchdown (what the run would have done; comparison only — never driven): anatomical angles and the
// mapped pelvis pose for t in [0, tEnd]
export function run1Cont(RI, tEnd = 0.12) { const F = RI.F, k0 = RI.k0, p0 = mapP(F[k0].pelvis.pos), out = [];
  for (let k = k0; k < F.length && F[k].t - F[k0].t <= tEnd + 1e-9; k++) { const f = F[k], dp = V.sub(mapP(f.pelvis.pos), p0); out.push({ t: +(f.t - F[k0].t).toFixed(5), anat: f.anat, pelvisRot: mapQ(f.pelvis.rot), pelvisDp: V.sc(dp, LEGR) }); }
  return out; }
// kinematic run-in body states (presentation): FK of the RUN-1 angles on the tackler, root = mapped pelvis rotation, position = the entry root
// back-propagated with the mapped pelvis motion (horizontal as RUN-1, vertical scaled by the leg ratio)
export function runInStates(RI, entryRoot) { const F = RI.F, f0 = F[RI.k0], p0 = mapP(f0.pelvis.pos), out = [];
  for (let k = RI.kS; k < RI.k0; k++) { const f = F[k], dp = V.sub(mapP(f.pelvis.pos), p0), pos = [entryRoot[0] + dp[0] * LEGR, entryRoot[1] + dp[1] * LEGR, entryRoot[2] + dp[2] * LEGR];
    out.push({ t: f.t - f0.t, S: L.fk({ pos, rot: mapQ(f.pelvis.rot) }, f.anat), stance: f.stance }); }
  return out; }
// ── the authored commitment → tuck choreography (t from the commitment touchdown). Each region is its own track with its own key times; the
//    first keys are the RUN-1 run-in itself (dense, t ≤ 0) so targets and target RATES are continuous with the incoming motion. ──
export const TUCK = { pitch: -14, roll: 27, hipFlex: 59, hipAbd: -23, hipRot: -39, knee: 130, ankDf: -18, ankInv: 22 };   // sp2a_tuck.mjs (geometric)
// authored clock: t = 0 at the PLANNED plant touchdown (kTD); the physical takeover is at tTO = RI.takeover (≤ 0: in the final flight; > 0: in the stance)
export function tracks(RI, A = {}) { const F = RI.F, k0 = RI.k0, kT = RI.kTD ?? k0, h0 = F[1].t - F[0].t, tTO = F[k0].t - F[kT].t, pre = [-0.05, -0.0375, -0.025, -0.0125, 0].map(dt => F[k0 + Math.round(dt / h0)]);
  const run = (j, key) => pre.map(f => [+(f.t - F[kT].t).toFixed(4), f.anat[j][key]]), T = (j, key, keys) => [...run(j, key), ...keys];
  const r1 = (j, key, tt) => { const tAbs = F[kT].t + tt, i = Math.max(0, Math.min(F.length - 2, Math.floor((tAbs - F[0].t) / h0))), u = (tAbs - F[i].t) / h0; return F[i].anat[j][key] + (F[i + 1].anat[j][key] - F[i].anat[j][key]) * u; };
  // the FINAL STEP (authored, before the touchdown): the plant leg reaches further forward than the run's own step (a braking plant)
  // final step = reach (the plant thigh further forward, the knee straighter, by −0.06 s) then PAW-BACK into the touchdown: the hip extends
  // (A.pawback deg over the last 0.06 s) so the boot meets the turf moving down and BACK — a stomp ahead of the COM (vertical impulse, little
  // braking: backward rotation), the athletic plant of a slide; a boot still swinging forward at contact brakes and trips the body forward
  const reachH = A.reachHip ?? 0, reachK = A.reachKnee ?? 0, paw = A.pawback ?? 0, reachT = -0.06;
  const reach = (j, key, d, dTD) => tTO < reachT - 0.01 ? [[reachT, r1(j, key, reachT) + d], [0, r1(j, key, 0) + dTD]] : [];
  const tk = { ...TUCK, ...(A.tuck || {}) }, kh = A.tackKneeHold ?? 45, hp = A.hipRPeak ?? 84, hpT = Math.max(0.3, A.hipRPeakT ?? 0.45), fs = (A.foldT ?? 0.45) / 0.45, rc = A.recline ?? 0, tl = A.trunkLat ?? 10, style = A.style || "fold", pe = A.plantEnd ?? (style === "push" ? 0.19 : 0.11);
  const tr = {
    // FREE / tackling leg (R): the thigh drive starts in the final stance (RUN-1's own swing continues into it); the knee stays folded until the
    // thigh is through (coupling below), then extends into the scissor during the flight
    // the SCISSOR (start reference): the lead thigh keeps rising through the flight (peak hp at hpT) and only lowers to the heel-skim after the
    // fold side has landed
    "hip_R.flex": T("hip_R", "flex", [[0.06, 22], [0.12, 42], [0.2, 64], [hpT - 0.06, hp - 5], [hpT, hp], [hpT + 0.2, hp - 8], [hpT + 0.45, hp - 18], [1.7, hp - 22]]),
    "hip_R.abd": T("hip_R", "abd", [[0.15, 6], [1.7, 6]]), "hip_R.rot": T("hip_R", "rot", [[0.2, 8], [1.7, 10]]),
    // (SP2's lesson: the tackling knee is HELD part-bent (≈ 45°) until the fold side has landed — an extended leg props the body on its heel
    //  like a strut — and only then extends; the boot stays clear by geometry)
    "knee_R.flex": T("knee_R", "flex", [[0.06, 116], [0.14, 112], [0.24, 90], [0.34, Math.max(kh, 50)], [0.46, kh], [Math.max(0.5, A.tackExt0 ?? 0.6), kh], [Math.max(0.5, A.tackExt0 ?? 0.6) + 0.25, Math.min(kh, 14)], [1.7, Math.min(kh, 10)]]),
    "ankle_R.df": T("ankle_R", "df", [[0.08, A.ankRpass ?? 15], [0.26, A.ankRpass ?? 15], [0.4, 8], [1.7, 8]]),
    // PLANT / trailing leg (L): a real stance — loads (knee 27 → 48, ankle dorsiflexes) while the body lowers and commits forward, then EXTENDS
    // (hip, knee, ankle plantarflexion) to push off at ≈ plantEnd (0.19 s); the stance hip stays ABDUCTED (the pelvis must not drop on the
    // free side); only after the push-off does the leg fold in 3D under / alongside the pelvis (hip flexion + adduction + external rotation, knee
    // flexion, ankle plantarflexion + inversion: the tuck)
    ...(style === "push" ? {
    "hip_L.flex": T("hip_L", "flex", [...reach("hip_L", "flex", reachH, reachH - paw), [0.06, 30], [0.12, 18], [pe, 2], [pe + 0.07, 12], [pe + 0.17, 35], [pe + 0.29, tk.hipFlex * 0.9], [pe + 0.43, tk.hipFlex], [1.7, tk.hipFlex - 4]]),
    "hip_L.abd": T("hip_L", "abd", [[0.08, 4], [pe, 3], [pe + 0.11, -6], [pe + 0.26, tk.hipAbd * 0.7], [pe + 0.43, tk.hipAbd], [1.7, tk.hipAbd + 3]]),
    "hip_L.rot": T("hip_L", "rot", [[0.1, -4], [pe, -8], [pe + 0.11, -20], [pe + 0.26, tk.hipRot * 0.85], [pe + 0.43, tk.hipRot], [1.7, tk.hipRot + 4]]),
    "knee_L.flex": T("knee_L", "flex", [...reach("knee_L", "flex", -reachK, -reachK * 0.5), [0.05, 44], [0.10, 48], [pe - 0.03, 34], [pe + 0.01, 26], [pe + 0.08, 60], [pe + 0.17, 100], [pe + 0.29, tk.knee - 4], [pe + 0.43, tk.knee], [1.7, tk.knee - 8]]),
    "ankle_L.df": T("ankle_L", "df", [[0.05, 20], [0.10, 24], [pe - 0.03, 0], [pe + 0.01, -22], [pe + 0.11, -28], [pe + 0.26, tk.ankDf], [1.7, tk.ankDf]]),
    "ankle_L.inv": T("ankle_L", "inv", [[pe - 0.01, 2], [pe + 0.13, tk.ankInv * 0.6], [pe + 0.29, tk.ankInv], [1.7, tk.ankInv]]) } : {
    // style "fold" (short braking plant, SP2's structure): the support ends while the plant boot is still under / ahead of the COM (the
    // ground reaction stays in front of the COM: backward rotation, braking), then the plant leg folds away without an extension push
    "hip_L.flex": T("hip_L", "flex", [...reach("hip_L", "flex", reachH, reachH - paw), [0.05, 31], [pe, 26], [pe + 0.08 * fs, 30], [pe + 0.18 * fs, 44], [pe + 0.3 * fs, tk.hipFlex * 0.95], [pe + 0.45 * fs, tk.hipFlex], [1.7, tk.hipFlex - 4]]),
    "hip_L.abd": T("hip_L", "abd", [[0.05, 4], [pe, 3], [pe + 0.1 * fs, -6], [pe + 0.25 * fs, tk.hipAbd * 0.7], [pe + 0.45 * fs, tk.hipAbd], [1.7, tk.hipAbd + 3]]),
    "hip_L.rot": T("hip_L", "rot", [[0.06, -4], [pe, -8], [pe + 0.1 * fs, -20], [pe + 0.25 * fs, tk.hipRot * 0.85], [pe + 0.45 * fs, tk.hipRot], [1.7, tk.hipRot + 4]]),
    "knee_L.flex": T("knee_L", "flex", [...reach("knee_L", "flex", -reachK, -reachK * 0.5), [0.05, 44], [pe, 50], [pe + 0.06 * fs, 75], [pe + 0.14 * fs, 104], [pe + 0.26 * fs, tk.knee - 4], [pe + 0.45 * fs, tk.knee], [1.7, tk.knee - 8]]),
    "ankle_L.df": T("ankle_L", "df", [[0.05, 20], [pe - 0.02, 22], [pe + 0.04 * fs, 0], [pe + 0.12 * fs, -25], [pe + 0.26 * fs, tk.ankDf], [1.7, tk.ankDf]]),
    "ankle_L.inv": T("ankle_L", "inv", [[pe, 2], [pe + 0.12 * fs, tk.ankInv * 0.6], [pe + 0.26 * fs, tk.ankInv], [1.7, tk.ankInv]]) }),
    // trunk: a forward commitment over the plant, then sit-back / lean to the fold side as the body lowers; head forward
    "lumbar.flex": T("lumbar", "flex", [[0.06, 8], [0.16, 2], [0.32, -8 + rc * 0.6], [0.6, -12 + rc], [1.2, -10 + rc * 0.8], [1.7, -8 + rc * 0.6]]),
    "lumbar.lat": T("lumbar", "lat", [[0.12, 4 * tl / 10], [0.3, tl], [0.6, tl * 1.2], [1.7, tl]]), "lumbar.rot": T("lumbar", "rot", [[0.15, -6], [0.4, 0], [1.7, 2]]),
    "thoracic.flex": T("thoracic", "flex", [[0.15, 0], [0.4, -4], [1.7, -2]]), "thoracic.lat": T("thoracic", "lat", [[0.3, 6], [1.7, 6]]),
    "neck.flex": T("neck", "flex", [[0.15, 0], [0.4, 18], [1.7, 25]]),
    // arms: the fold-side arm goes out (counterbalance) then back / down to post; the tackling-side arm swings forward / up (counterweight)
    "shoulder_L.flex": T("shoulder_L", "flex", [[0.08, -25], [0.2, -38], [0.38, -50], [1.7, -48]]), "shoulder_L.abd": T("shoulder_L", "abd", [[0.08, 35], [0.2, 50], [0.4, 45], [1.7, 42]]),
    "elbow_L.flex": T("elbow_L", "flex", [[0.12, 50], [0.3, 15], [1.7, 12]]),
    "shoulder_R.flex": T("shoulder_R", "flex", [[0.08, 10], [0.2, 60], [0.4, 85], [0.8, 70], [1.7, 55]]), "shoulder_R.abd": T("shoulder_R", "abd", [[0.15, 25], [0.4, 32], [1.7, 30]]),
    "elbow_R.flex": T("elbow_R", "flex", [[0.15, 60], [0.4, 40], [1.7, 40]]) };
  // CONTINUITY (pose AND velocity): every track is re-expressed as a blend from RUN-1's OWN continuation into the authored commitment,
  // target(t) = RUN1(t) + w(t)·(authored(t) − RUN1(t)), w = smoothstep(t / blendS): at the touchdown both the target and its rate equal the
  // incoming motion (no braking transient, no settle), and the commitment departs from the run over blendS. Sampled densely up to blendS + 0.04 s.
  const blendS = A.blendS ?? 0.08, dtS = 1 / 120, run1At = r1;
  const pchipAt = (keys, tt) => { const comp = (C0.compile({ name: "x", tracks: { "a.b": keys } })); return comp.anatAt(tt).a.b; };
  for (const [name, keys] of Object.entries(tr)) { const [j, key] = name.split("."), auth = [[tTO, run1At(j, key, tTO)], ...keys.filter(([tt]) => tt > tTO + 1e-6)], post = keys.filter(([tt]) => tt > tTO + blendS + 0.04);
    const pre = keys.filter(([tt]) => tt <= tTO + 1e-6), dense = []; for (let tt = tTO + dtS; tt <= tTO + blendS + 0.04 + 1e-9; tt += dtS) { const s = Math.min(1, (tt - tTO) / blendS), w = s * s * (3 - 2 * s), ra = run1At(j, key, tt), au = pchipAt(auth, tt); dense.push([+tt.toFixed(5), ra + w * (au - ra)]); }
    tr[name] = [...pre, ...dense, ...post]; }
  return tr; }
// the animation's body states at any extracted frame k (tackler FK, geometric scaling, the takeover frame at the entry root) — for the
// whole-body inverse dynamics of the incoming run at the takeover (sp2a_wbid.mjs)
export function statesAtFrame(RI, entryRoot) { const F = RI.F, p0 = mapP(F[RI.k0].pelvis.pos);
  return (k) => { const f = F[k], dp = V.sub(mapP(f.pelvis.pos), p0), pos = V.add(entryRoot, V.sc(dp, LEGR)); return L.fk({ pos, rot: mapQ(f.pelvis.rot) }, f.anat); }; }
// the incoming motion's continuation (RUN-1 itself past the touchdown, every authored key) — used only for the entry's activation initialisation
export function runChor(RI, keys, t1 = 0.3) { const F = RI.F, k0 = RI.k0, kT = RI.kTD ?? k0, tr = {};
  for (const name of keys) { const [j, key] = name.split("."); tr[name] = []; for (let k = k0 - 12; k <= k0 + Math.round(t1 / (F[1].t - F[0].t)); k += 2) tr[name].push([+(F[k].t - F[kT].t).toFixed(5), F[k].anat[j][key]]); }
  return { name: "RUN-1 continuation", tracks: tr }; }
// the SP2A candidate (the G23 controller structure: plant support objective while the plant foot is down, NO tackling-leg press, the seat
// objective through the fold hip while the fold leg is on the turf; RegionalTracker A6 + A7 contact-driven authority)
export const GAINS = { default: { f: 4.0, zeta: 0.9 }, hip: { f: 6.0, zeta: 0.9 }, knee: { f: 6.0, zeta: 0.9 }, ankle: { f: 4.0, zeta: 0.9 }, neck: { f: 3, zeta: 0.9 }, lumbar: { f: 4.5, zeta: 0.9 } };
// inverse-dynamics feed-forward only for chains WITHOUT ground contact (sp_id: a free-chain ID is meaningless for a supporting leg): the plant
// leg's chain is gated off through its authored stance and ramps in after the push-off
const smooth = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
export const ffOf = (plantEnd = 0.10) => [{ chain: ["hip_R", "knee_R", "ankle_R"], weight: () => 1 }, { chain: ["hip_L", "knee_L", "ankle_L"], weight: (t) => t < 0 ? smooth(-t / 0.015) : smooth((t - plantEnd - 0.01) / 0.04) },
  { chain: ["shoulder_L", "elbow_L"], weight: () => 1 }, { chain: ["shoulder_R", "elbow_R"], weight: () => 1 }];
export const FF = ffOf();
export const CONTACT_AUTH = { trigger: ["thigh_L", "shank_L", "pelvis"], delayS: 0.025, schedule: [[0, { tackLeg: 1, trailLeg: 1, trunk: 1, armL: 1, armR: 1 }],
  [0.06, { tackLeg: 0.8, trailLeg: 0.45, trunk: 0.75, armL: 0.7, armR: 0.7 }], [0.3, { tackLeg: 0.6, trailLeg: 0.35, trunk: 0.6, armL: 0.6, armR: 0.6 }]] };
export function makeSP2A(RI, A = {}) { const base = CN.base(5), tk = { ...TUCK, ...(A.tuck || {}) }, entry = entryFromRunIn(RI), pe = A.plantEnd ?? ((A.style || "fold") === "push" ? 0.19 : 0.11);
  const c = { ...base, id: A.id || "SP2A", entry, chor: { name: A.id || "SP2A", tracks: tracks(RI, A) }, gains: A.gains || GAINS, lead: A.lead ?? 0.07, rateLead: A.rateLead === undefined ? 0.015 : A.rateLead, ffLead: A.ffLead ?? 0.1, steps: A.steps || 480, ff: A.ff || ffOf(pe),
    // the free knee is coordinated to its OWN thigh (authored rule: it stays tucked until the thigh is through, then extends — the foot cannot scuff)
    couple: A.couple === null ? null : (A.couple || [{ joint: "knee_R", key: "flex", from: ["hip_R", "flex"], map: A.coupleMap || [[30, 118], [55, 108], [68, 75], [82, A.tackKneeHold ?? 45]], window: [A.blendS ?? 0.08, pe + 0.3], blend: 0.04, predict: 0.03 }]),
    // the launch: the support objective (a COM plan realised only through the plant leg's joint torques against the real contact) keeps
    // the incoming descent for the loading phase (κ ≈ 1), then pushes (κ ≈ 2 BW) so the COM leaves with a small upward velocity at plantEnd
    vfPlan: { ...base.vfPlan, window: [-0.05, pe], kappa: [[A.plantT1 ?? 0.07, A.plantK1 ?? 1.0], [pe, A.plantK2 ?? 1.6]], lateral: A.lateral ?? 3.0, forward: A.plantFwd ?? 0, driveRamp: [0, A.blendIn ?? 0.05], alongLeg: A.alongLeg === false ? undefined : A.aimZ != null || A.aimX != null ? { keep: true, aim: [A.aimX ?? 0, A.aimZ ?? 0] } : { from: 0, to: A.blendIn ?? 0.05 }, otherCap: true, capScale: A.capScale !== false,
      gains: { ...base.vfPlan.gains, ko: A.plantKo ?? 300, do: (A.plantKo ?? 300) * 0.13 } },
    pelvis: { pitch: [[0, entry.pelvis.pitchDeg], [pe, A.plantPitch ?? -8]], roll: [[0, entry.pelvis.rollDeg], [pe, A.plantRoll ?? 6]], yaw: [[0, entry.pelvis.yawDeg], [pe, 3]] },
    press: { ...base.press, window: [9, 9] },
    seat: A.seat === null ? null : { side: "L", window: [pe + 0.12, 1.7], ramp: 0.05, gains: { ko: A.seatKo ?? 200, do: (A.seatKo ?? 200) * 0.14 }, pelvis: { pitch: [[0, 0], [pe + 0.22, tk.pitch], [1.7, tk.pitch]], roll: [[0, 0], [pe + 0.22, tk.roll], [1.7, tk.roll + 2]], yaw: [[0, 0], [1.7, 0]] } } };
  c.initChor = A.initRun === false ? null : runChor(RI, Object.keys(c.chor.tracks));
  // the muscle state at the takeover = the whole-body inverse dynamics of the incoming run (A.initWBID false → the partial command above)
  const tTO = RI.F[RI.k0].t - RI.F[RI.kTD ?? RI.k0].t; c.tOffset = tTO;
  if (A.initWBID !== false) { const E = EN.buildEntry(entry), id = WB.wholeBodyID(statesAtFrame(RI, E.root), RI.k0, RI.F[1].t - RI.F[0].t, tTO < 0 ? "none" : "foot_L"); c.initTau = id.tau; c.initGRF = id.grf;
    // the airborne swing knee: no voluntary extensor drive in the initial state (quadriceps are near-silent in early swing; the run's small
    // flexion-decelerating torque is left to passive tissue) — an extensor activation would carry M1's full short-range damping on a group
    // lengthening at ≈ 10 rad/s and stall the swing (A.freeKneeInit "wbid" keeps the raw inverse dynamics)
    if (tTO < 0 && (A.freeKneeInit ?? "passive") === "passive") { const kR = JN.findIndex(j => j.name === "knee_R"); c.initTau[kR] = c.initTau[kR].map((x, i) => i === 1 ? Math.max(0, x) : x); } }
  if (tTO < 0) c.vfPlan = { ...c.vfPlan, gate: { clearM: 0.012, ramp: 0.015 } };
  // the stance leg's joint-space tracking is weak while it supports (a loaded knee flexes because its extensors yield, not because its flexors
  // pull — full PD on a flexing target fights the support objective); full authority returns over 30 ms after the push-off
  const trail = new Set(["hip_L", "knee_L", "ankle_L"]), pa = A.plantAuth ?? 0.3, authority = (t, j) => trail.has(j) ? (t < 0 ? pa + (1 - pa) * smooth(-t / 0.02) : pa + (1 - pa) * smooth((t - pe) / 0.03)) : 1;
  // the support plan's COM state starts at the planned touchdown (ballistic prediction from an airborne takeover)
  const mk = (cc, ch, E) => { if (!(tTO < 0)) return RT.makeCtrlRegional(cc, ch, E); const g = 9.81, dt = -tTO, y = E.com[1] + E.comVel[1] * dt - 0.5 * g * dt * dt, vy = E.comVel[1] - g * dt;
    return RT.makeCtrlRegional(cc, ch, { ...E, com: [E.com[0], y, E.com[2]], comVel: [E.comVel[0], vy, E.comVel[2]] }); };
  const fin = AU.apply(c, "A4"); return { ...fin, tOffset: tTO, initChor: c.initChor, initTau: c.initTau || null, initMix: A.initMix ?? 1, initGRF: c.initGRF || null, authority, yield: null, ragdoll: null, regional: RT.DEFAULT_REG, contactAuth: A.contactAuth === null ? null : (A.contactAuth || CONTACT_AUTH), makeCtrl: mk, authorityModel: "A6+A7" }; }

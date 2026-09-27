// ═══ anim3d/of_react.js — TACKLED-PLAYER REACTIONS V1 on the shared skeletal runtime (PRESENTATION ONLY) ═════════════════════════════
// The SIMULATION (pt_react.js) decides whether a hit player corrects a step, stumbles, or falls — and for a fall its direction, the
// moment he leaves his feet, when he meets the pitch, how far he slides, when he lies still, when he is up — and it moves his root.
// This file only makes the body explain those facts; it never writes the simulation. With OFPLAY.animOff it never runs.
//   • CORRECTION / STUMBLE — over the locomotion (which plays the sim's braked, redirected velocity): the trunk leans toward the balance
//     error and the arms go out in proportion to it, decaying step by step; a clipped swing leg is pulled the way it was struck; a body on
//     the pitch in his path makes the next step a raised one.
//   • FALL — a continuous directional blend: the fall's direction RELATIVE TO HIS BODY (it changes as he spins) weights a forward, a side
//     (mirrored left / right) and a backward basis, each a "mid-fall" and a "landed" key pose, advanced by the simulation's own topple
//     timeline. The body is lowered by its measured lowest point every tick, so hands / knees / hip / shoulder meet the pitch in the order
//     the rotating pose brings them down. Protective arms are part of each basis, so they reach where the body is going.
//   • GROUND and RECOVERY — the landed pose, then a recovery whose family is the landing's: face down → hands and knees → kneel → crouch;
//     on a side → roll to hands and knees → kneel → crouch; on the back → sit up → kneel → crouch; timed to the simulation's windows and
//     entered from wherever the body is (pose blending, never a snap).
// Key poses are SOLVED through the rig's own forward kinematics from target knee / ankle / hand / head positions (anatomical bounds).
const OF_RX = { enabled: true, leanK: 60, leanMax: 30, dipDeg: 16, armK: 60, armMax: 55, clipT: 0.28, clipDeg: 28, stepOverDeg: 26, clear: 0.012, midAt: 0.55 };
OF_RX.FWD_MID = { pelvis: [12.5, 8, -31], spine: [45, -24.3, 8], chest: [33.3, 30, 20], neck: [-30, -40, -1.3], head: [22.8, -30, 10], thigh_R: [-61, -50, 50], shin_R: [130.8, 0, 0], foot_R: [50, -25, -15], thigh_L: [12.8, 4.5, 38], shin_L: [76.5, 0, 0], foot_L: [0, 0, 0], upperArm_L: [-102.8, 6.3, 0], foreArm_L: [0, 0, 0], upperArm_R: [-91.3, 5.3, 0], foreArm_R: [-0.5, 0, 0] };
OF_RX.FWD_LAND = { pelvis: [79.5, 0, 0], spine: [-3.5, -15.5, 0], chest: [1.8, 16, 2], neck: [4.3, -18.3, -3], head: [6, 12.5, 0.3], thigh_R: [-10, -26.8, -3], shin_R: [28.8, 0, 0], foot_R: [48, 25, 10.5], thigh_L: [-10.3, 26.8, 3], shin_L: [33.5, 0, 0], foot_L: [45.5, -22, -4], upperArm_L: [-51.3, 9.8, -22], foreArm_L: [-120, 0, 0], upperArm_R: [-53.8, -11.5, 18], foreArm_R: [-118.5, 0, 0] };
OF_RX.SIDE_MID = { pelvis: [6.3, 110.3, 26.5], spine: [45, -35, 5.5], chest: [-8.3, -30, -20], neck: [-5.8, -18.5, 14.3], head: [-30, -0.8, 10], thigh_R: [-92, -26.3, -35.3], shin_R: [76, 0, 0], foot_R: [-25.3, 0.3, 0], thigh_L: [-80.5, 50, 47], shin_L: [103.3, 0, 0], foot_L: [0, 0, 0], upperArm_L: [55, -14, 8], foreArm_L: [-45.3, 0, 0], upperArm_R: [-79.3, -35.5, 33], foreArm_R: [0, 0, 0] };
OF_RX.SIDE_LAND = { pelvis: [51.5, -14.5, -54.5], spine: [45, 22.8, 25], chest: [-25, 14.3, 20], neck: [-30, -40, 8.5], head: [40, -30, 10], thigh_R: [4.3, -50, -16.3], shin_R: [82.8, 0, 0], foot_R: [16, -16, 0], thigh_L: [33.8, -50, -3], shin_L: [38.5, 0, 0], foot_L: [0, 0, 0], upperArm_L: [74.5, -58.5, -64.5], foreArm_L: [-120, 0, 0], upperArm_R: [-79.5, -6.8, -46], foreArm_R: [-113, 0, 0] };
OF_RX.BACK_MID = { pelvis: [-42, -33, 40.5], spine: [9.5, 35, -25], chest: [35, -9.3, 8.8], neck: [35, -25.8, -11.8], head: [40, -8, -10], thigh_R: [-7.3, 23, -16], shin_R: [97, 0, 0], foot_R: [-45, -20.3, -14.5], thigh_L: [-28.5, 37.5, -19.3], shin_L: [117.3, 0, 0], foot_L: [-42, -4, 0], upperArm_L: [16.3, 19, -0.8], foreArm_L: [-0.5, 0, 0], upperArm_R: [19, -14.3, -0.5], foreArm_R: [0, 0, 0] };
OF_RX.BACK_LAND = { pelvis: [-96.5, -22, 16.5], spine: [45, 31.3, 22.5], chest: [35, -13.5, 20], neck: [17, -40, -15], head: [-30, -30, -10], thigh_R: [-27.5, -7.8, 4], shin_R: [92.5, 0, 0], foot_R: [-16, 16, 0], thigh_L: [-21, 2.5, 7.5], shin_L: [76.3, 0, 0], foot_L: [-16, 0, 0], upperArm_L: [71.5, 13.5, -8.3], foreArm_L: [-94, 0, 0], upperArm_R: [51, 1.8, -7], foreArm_R: [-67, 0, 0] };
OF_RX.HANDS_KNEES = { pelvis: [57.3, 26, -0.8], spine: [45, -20.8, -1.3], chest: [-25, 13.5, 20], neck: [40, -40, 15], head: [40, -30, -6], thigh_R: [-56.5, -50, 38.5], shin_R: [105.5, 0, 0], foot_R: [50, 24, 14], thigh_L: [-42, -32.8, 31.8], shin_L: [86.8, 0, 0], foot_L: [50, 24, 12], upperArm_L: [-48.8, -5, 0.3], foreArm_L: [-59, 0, 0], upperArm_R: [-47.8, -13, 0], foreArm_R: [-52.8, 0, 0] };
const ofRxSide = (P, left) => left ? ofDefMirror(P) : P;
// the link: copy the simulation's facts for this player onto the actor
function ofRxLink(t, a, c) {
  if (!OF_RX.enabled || !c.react) { if (a.rx && !a.rx.done) a.rx.done = t.now; if (!c.react && a.rx && t.now - a.rx.done > 0.4) a.rx = null; return; }
  const r = c.react; if (!a.rx || a.rx.src !== r) a.rx = { src: r, born: t.now, from: null };
  const X = a.rx; X.kind = r.kind; X.rec = r.rec; X.p = c.p; X.done = null;
}
function ofRxApply(a, pose, plants, now, rootM) {
  const X = a.rx; if (!X) return pose; const r = X.src, O = OF_RX, legK = a.skel.legLen / OF_REF_LEG;
  if (X.done != null) { const w = 1 - smooth01(clamp01((now - X.done) / 0.35)); if (w <= 0) { a.rx = null; return pose; } return X.last ? ofDefLerpPose(pose, X.last, w) : pose; }
  if (r.kind === "CORRECTION" || r.kind === "STUMBLE") { const q = ofRxStumble(a, X, r, pose, now, 1); X.last = q; return q; }
  if (r.kind === "FALL") { const q = ofRxFall(a, X, r, pose, plants, now, rootM); X.last = q; return q; }
  return pose;
}
// STUMBLE / CORRECTION overlay (also the steps a fall takes before it fails)
function ofRxStumble(a, X, r, pose, now, w) {
  const O = OF_RX, rec = r.rec, dt = now - r.t0, q = Object.assign({}, pose), sev = Math.min(1.5, (rec.e0 || 0) / Math.max(0.05, rec.rc || 0.3));
  const Tst = r.Tstep || 0.25, decay = Math.exp(-dt / Math.max(0.15, (r.steps || 1) * Tst * 0.6)) * clamp01(dt / 0.06) * w;
  // the balance error in the body frame (sim facing): forward (+) / right (+)
  const err = r.err || [r.v ? r.v[0] : 0, r.v ? r.v[1] : 0], f = a.facing, fx = Math.cos(f), fy = Math.sin(f), eF = err[0] * fx + err[1] * fy, eR = -err[0] * fy + err[1] * fx, em = Math.hypot(eF, eR) || 1;
  const lean = Math.min(O.leanMax, O.leanK * Math.min(1, em)) * decay, arm = Math.min(O.armMax, O.armK * sev) * decay;
  const add = (k, v) => { const b = q[k] || [0, 0, 0]; q[k] = [b[0] + v[0], b[1] + v[1], b[2] + v[2]]; };
  add("spine", [lean * eF / em * 0.6, 0, -lean * eR / em * 0.6]); add("chest", [lean * eF / em * 0.4, 0, -lean * eR / em * 0.4]);
  add("thigh_R", [-O.dipDeg * 0.5 * decay * sev, 0, 0]); add("thigh_L", [-O.dipDeg * 0.5 * decay * sev, 0, 0]); add("shin_R", [O.dipDeg * decay * sev, 0, 0]); add("shin_L", [O.dipDeg * decay * sev, 0, 0]);   // the knees give: a lowered centre of mass for the corrective steps
  add("neck", [-lean * 0.3, 0, 0]);
  add("upperArm_R", [-arm * 0.3, 0, arm]); add("upperArm_L", [-arm * 0.3, 0, -arm]); add("foreArm_R", [-arm * 0.4, 0, 0]); add("foreArm_L", [-arm * 0.4, 0, 0]);
  // the struck SWING leg is pulled the way it was hit (hip ab/adduction + knee), for the contact's own short time
  if (rec.segPlanted === false && rec.seg && /_[RL]$/.test(rec.seg)) { const sd = rec.seg.slice(-1), n = rec.normal, nR = -n[0] * fy + n[1] * fx, k = Math.exp(-dt / O.clipT) * clamp01(dt / 0.03);
    add("thigh_" + sd, [-8 * k, 0, (sd === "R" ? 1 : -1) * nR * O.clipDeg * k]); add("shin_" + sd, [22 * k, 0, 0]); }
  // a body on the pitch in his path: the first step is a raised one (hip + knee flexion on the leg that swings next)
  if (rec.obstacle > 0 && dt < Tst * 1.2) { const sd = rec.support && rec.support.R ? "L" : "R", k = Math.sin(Math.PI * clamp01(dt / (Tst * 1.2)));
    add("thigh_" + sd, [-O.stepOverDeg * k, 0, 0]); add("shin_" + sd, [O.stepOverDeg * 1.6 * k, 0, 0]); }
  return q;
}
// the directional basis at relative fall angle rel (rad; + = toward his right) and progress u (0 standing … 1 landed)
function ofRxBasis(rel, u) {
  const c = Math.cos(rel), s = Math.sin(rel), wF = Math.max(0, c), wB = Math.max(0, -c), wS = Math.abs(s), W = wF + wB + wS || 1, left = s < 0;
  const mid = (k) => k === "F" ? OF_RX.FWD_MID : k === "B" ? OF_RX.BACK_MID : ofRxSide(OF_RX.SIDE_MID, left), land = (k) => k === "F" ? OF_RX.FWD_LAND : k === "B" ? OF_RX.BACK_LAND : ofRxSide(OF_RX.SIDE_LAND, left);
  const pick = (k) => u <= OF_RX.midAt ? { k, P: mid(k), w: smooth01(u / OF_RX.midAt) } : { k, P: ofDefLerpPose(mid(k), land(k), smooth01((u - OF_RX.midAt) / (1 - OF_RX.midAt))), w: 1 };
  let acc = null, tw = 0;
  for (const [k, wk] of [["F", wF / W], ["B", wB / W], ["S", wS / W]]) { if (wk < 1e-3) continue; const b = pick(k); acc = acc ? ofDefLerpPose(acc, b.P, wk / (tw + wk)) : b.P; tw += wk; }
  return { P: acc, w: u <= OF_RX.midAt ? smooth01(u / OF_RX.midAt) : 1 };
}
// SLIDE CONTACT GEOMETRY V1.2 — the slider who brought him down, as GROUND: his rendered seat / trunk / legs (capsules from his last solved
// pose). A falling body is lowered onto whichever is higher, the pitch or the top of those capsules — so a faller goes over the slider and a body
// that comes down on him lies on him (presentation of the simulation's LANDED_ON / OVER facts; never read by the simulation)
function ofRxTerrain(r) {
  if (r.byTackler == null || typeof OFSQ === "undefined" || !S.pt || !S.pt.squad) return null; const c = S.pt.squad.ctx[r.byTackler], ac = OFSQ.actors[r.byTackler];
  if (!c || !c.def || c.def.kind !== "SLIDE" || c.def.rule !== "far" || !ac || !ac.sol) return null;
  const fk = ac.sol.fk, sk = ac.skel, J = (n) => fk.joint[sk.byName[n].idx];
  return [[J("pelvis"), J("neck"), 0.15], [J("thigh_R"), J("shin_R"), 0.075], [J("shin_R"), J("foot_R"), 0.055], [J("thigh_L"), J("shin_L"), 0.075], [J("shin_L"), J("foot_L"), 0.055]];
}
function ofRxTerrainAt(TR, q) {                                                                        // the highest capsule top under the point (world: y up)
  let h = 0;
  for (const [A, B, rc] of TR) { const dx = B[0] - A[0], dz = B[2] - A[2], L = dx * dx + dz * dz, s = L > 1e-9 ? Math.max(0, Math.min(1, ((q[0] - A[0]) * dx + (q[2] - A[2]) * dz) / L)) : 0;
    const px = A[0] + dx * s, pz = A[2] + dz * s, py = A[1] + (B[1] - A[1]) * s, dh = Math.hypot(q[0] - px, q[2] - pz); if (dh < rc) h = Math.max(h, py + Math.sqrt(rc * rc - dh * dh)); }
  return h;
}
function ofRxFall(a, X, r, pose, plants, now, rootM) {
  const O = OF_RX, azH = r.azHead != null ? r.azHead : r.az, rel = Math.atan2(Math.sin(azH - a.facing), Math.cos(azH - a.facing));   // the way the BODY rotates (not where it travels)
  let target, w;
  if (now < r.tFall) return ofRxStumble(a, X, Object.assign({}, r, { err: [Math.cos(r.az), Math.sin(r.az)], steps: 1, Tstep: 0.2 }), pose, now, 1);   // the steps before it failed
  if (now < r.tGround) { const u = clamp01((now - r.tFall) / Math.max(1e-3, r.tGround - r.tFall)); const B = ofRxBasis(rel, u); target = B.P; w = B.w; X.relG = rel; }
  else if (now < r.tRec) { target = ofRxBasis(X.relG != null ? X.relG : rel, 1).P; w = 1; }
  else { const u = clamp01((now - r.tRec) / Math.max(1e-3, r.tUp - r.tRec)), land = ofRxBasis(X.relG != null ? X.relG : rel, 1).P;
    const K = r.family === "BACK" ? [[0, land], [0.35, OF_DEF.SIT], [0.7, OF_DEF.KNEEL], [1, OF_DEF.CROUCH]] : [[0, land], [0.38, OF_RX.HANDS_KNEES], [0.72, OF_DEF.KNEEL], [1, OF_DEF.CROUCH]];
    let k = 0; while (k < K.length - 2 && u > K[k + 1][0]) k++; target = ofDefLerpPose(K[k][1], K[k + 1][1], smooth01(clamp01((u - K[k][0]) / (K[k + 1][0] - K[k][0])))); w = u > 0.9 ? 1 - smooth01((u - 0.9) / 0.1) * 0.6 : 1; }
  // lower the body by its measured lowest point (staged contacts follow from the rotating pose)
  const P0 = Object.assign({}, target, { _pelvis: [0, 0, 0] }), fk = skelFK(a.skel, P0, rootM); let minY = 1e9;
  const TR = ofRxTerrain(r);                                                                            // V1.2: the slider's body under him is ground too (he goes OVER it / lies ON it)
  for (const b of a.skel.bones) { if (!b.part || b.name === "root" || b.name === "hair" || /^(hand|foreArm|upperArm|clavicle)_/.test(b.name)) continue; const rr = /^(foot|toe)_/.test(b.name) ? 0.01 : b.rad * 0.6;
    const J0 = fk.joint[b.idx], J1 = fk.tip[b.idx], ns = TR ? 4 : 1;
    for (let k = 0; k <= ns; k++) { const q = ns === 1 ? (k ? J1 : J0) : V3.add(J0, V3.scale(V3.sub(J1, J0), k / ns)); const v = q[1] - (TR ? ofRxTerrainAt(TR, q) : 0) - rr; if (v < minY) minY = v; } }
  P0._pelvis[1] = TR ? -(minY - O.clear) : -Math.max(0, minY - O.clear);                              // V1.2: a slider under him may RAISE him (over / onto the body)
  plants.R = { want: false }; plants.L = { want: false };
  return ofDefLerpPose(pose, P0, w);
}

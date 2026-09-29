// ═══ anim3d/of_rig.js — OUTFIELD PLAYER SKELETAL FOUNDATION: shared hierarchy, per-player morphology, true-proportion bind, validation ═══
// One skeleton HIERARCHY for every outfield player (the goalkeeper's SKEL_DEF: 23 joints, same names / order / parenting / bind conventions),
// with PER-PLAYER BONE DIMENSIONS (a morphology record) instead of one set of bone lengths. Conventions (unchanged from skeleton.js):
//   • character frame: +x = the player's RIGHT, +y = up, +z = forward; right-handed. 3D world: x = pitch x, y = height, z = −pitch y.
//   • bind pose = every bone euler [0,0,0]; every bone's local frame is WORLD-ALIGNED at bind (bind rotations are identity), so
//     a pose is rotation-only and applies to ANY morphology unchanged (the retarget is the morphology itself, not the clip);
//   • bind offsets / lengths are METRES for this player (fractions of H × H, then per-segment ratios); radii are the capsule / contact girth;
//   • inverse binds are the exact inverses of the bind world matrices (skinMatrix = boneWorld × inverseBind, identity at bind);
//   • the authoritative simulation root is separate from the presentation root (the graph / solver never writes simulation state).
// What is SHARED: hierarchy, joint names / order, bind conventions, the skinning rule (4 influences, straddled joints), the animation
// library (rotation-only poses + pelvis offsets in metres @ a reference body, rescaled by the player's LEG LENGTH, not by height), the
// procedural solver (plants, ground clamp, IK, joint limits). What is PER PLAYER: the morphology record (H, segment ratios, widths,
// girths) → bone dimensions + skin girth + contact heights; and (later) the appearance (kit / skin / hair / face) as configuration.
const OF_H_REF = 1.88;                                                                            // SKEL_DEF's fractions are exact at this height (the shared reference body)
const OF_SEG_REF = { thigh: 0.24, shin: 0.22, foot: 0.10, toe: 0.04, ankle: 0.045, pelvisUp: 0.06, spine: 0.12, chest: 0.14, neck: 0.05, head: 0.12, hair: 0.05, clavicle: 0.10, upperArm: 0.17, foreArm: 0.15, hand: 0.06, hipW: 0.095, clavX: 0.03, clavY: 0.12 };   // fractions of H
// morphology record: { id, H, seg: {…fractions of H, override any of OF_SEG_REF}, girth: { boneName: k | [kSide, kForeAft] } }
const OF_BODIES = {                                                                               // GENERIC DIAGNOSTIC BODIES (stress fixtures, not players): deliberate extremes of height, femur/tibia, arms, torso, shoulders, girth
  SHORT_COMPACT: { id: "SHORT_COMPACT", H: 1.66, seg: { thigh: 0.225, shin: 0.205, spine: 0.13, chest: 0.15, hipW: 0.105, clavicle: 0.105, upperArm: 0.165, foreArm: 0.145, neck: 0.045 }, girth: { pelvis: 1.18, thigh_R: 1.18, thigh_L: 1.18, shin_R: 1.12, shin_L: 1.12, spine: 1.15, chest: [1.12, 1.18], upperArm_R: 1.12, upperArm_L: 1.12, foreArm_R: 1.08, foreArm_L: 1.08, neck: 1.15, head: 1.03 } },
  SHORT_LEAN:    { id: "SHORT_LEAN", H: 1.70, seg: { thigh: 0.245, shin: 0.225, spine: 0.115, chest: 0.135, hipW: 0.088, clavicle: 0.095, upperArm: 0.172, foreArm: 0.152 }, girth: { pelvis: 0.9, thigh_R: 0.86, thigh_L: 0.86, shin_R: 0.88, shin_L: 0.88, spine: 0.88, chest: [0.9, 0.86], upperArm_R: 0.86, upperArm_L: 0.86, foreArm_R: 0.9, foreArm_L: 0.9, neck: 0.92, head: 0.98 } },
  AVG_LEAN:      { id: "AVG_LEAN", H: 1.80, seg: {}, girth: { pelvis: 0.94, thigh_R: 0.92, thigh_L: 0.92, shin_R: 0.94, shin_L: 0.94, spine: 0.94, chest: [0.95, 0.92], upperArm_R: 0.92, upperArm_L: 0.92, foreArm_R: 0.94, foreArm_L: 0.94 } },
  AVG_ATHLETIC:  { id: "AVG_ATHLETIC", H: 1.83, seg: { thigh: 0.25, shin: 0.23, clavicle: 0.11, clavX: 0.035, hipW: 0.098 }, girth: { pelvis: 1.08, thigh_R: 1.16, thigh_L: 1.16, shin_R: 1.1, shin_L: 1.1, chest: [1.12, 1.08], spine: 1.02, upperArm_R: 1.15, upperArm_L: 1.15, foreArm_R: 1.06, foreArm_L: 1.06, neck: 1.08 } },
  TALL_LEAN:     { id: "TALL_LEAN", H: 1.96, seg: { thigh: 0.26, shin: 0.245, upperArm: 0.18, foreArm: 0.16, spine: 0.115, chest: 0.135, hipW: 0.09, clavicle: 0.10 }, girth: { pelvis: 0.9, thigh_R: 0.88, thigh_L: 0.88, shin_R: 0.9, shin_L: 0.9, spine: 0.9, chest: [0.92, 0.88], upperArm_R: 0.88, upperArm_L: 0.88, foreArm_R: 0.9, foreArm_L: 0.9, neck: 0.95 } },
  TALL_POWER:    { id: "TALL_POWER", H: 2.00, seg: { thigh: 0.25, shin: 0.235, clavicle: 0.115, clavX: 0.035, hipW: 0.105, spine: 0.125, chest: 0.145 }, girth: { pelvis: 1.16, thigh_R: 1.2, thigh_L: 1.2, shin_R: 1.12, shin_L: 1.12, spine: 1.1, chest: [1.15, 1.15], upperArm_R: 1.2, upperArm_L: 1.2, foreArm_R: 1.1, foreArm_L: 1.1, neck: 1.15, head: 1.02 } },
};
const OF_BODY_ORDER = ["SHORT_COMPACT", "SHORT_LEAN", "AVG_LEAN", "AVG_ATHLETIC", "TALL_LEAN", "TALL_POWER"];
// bone dimensions (metres) for a morphology: same hierarchy and joint order as SKEL_DEF, offsets derived from the SEGMENT lengths
function ofDims(m) {
  const H = m.H, s = Object.assign({}, OF_SEG_REF, m.seg || {});
  const vert = s.thigh + s.shin + s.ankle + s.pelvisUp + s.spine + s.chest + s.neck + s.head;                 // the standing chain (crown ≈ head tip); the reference body sums to 1.0
  const kH = H / vert; const L = (k) => s[k] * kH;                                                              // ratios are the morphology; the stature is exact
  const hipY = L("thigh") + L("shin") + L("ankle");                                              // the feet touch the pitch at bind: hip height = leg + ankle height (foot flat)
  const D = {
    root: { off: [0, 0, 0], len: 0 }, pelvis: { off: [0, hipY, 0], len: L("pelvisUp") }, spine: { off: [0, L("pelvisUp"), 0], len: L("spine") }, chest: { off: [0, L("spine"), 0], len: L("chest") },
    neck: { off: [0, L("chest"), 0], len: L("neck") }, head: { off: [0, L("neck"), 0], len: L("head") }, hair: { off: [0, L("head") * 0.58, -0.005 * H], len: L("hair") },
    clavicle_R: { off: [L("clavX"), L("clavY"), 0], len: L("clavicle") }, upperArm_R: { off: [L("clavicle"), 0, 0], len: L("upperArm") }, foreArm_R: { off: [0, -L("upperArm"), 0], len: L("foreArm") }, hand_R: { off: [0, -L("foreArm"), 0], len: L("hand") },
    clavicle_L: { off: [-L("clavX"), L("clavY"), 0], len: L("clavicle") }, upperArm_L: { off: [-L("clavicle"), 0, 0], len: L("upperArm") }, foreArm_L: { off: [0, -L("upperArm"), 0], len: L("foreArm") }, hand_L: { off: [0, -L("foreArm"), 0], len: L("hand") },
    thigh_R: { off: [L("hipW"), 0, 0], len: L("thigh") }, shin_R: { off: [0, -L("thigh"), 0], len: L("shin") }, foot_R: { off: [0, -L("shin"), 0], len: L("foot") }, toe_R: { off: [0, -0.3 * L("foot"), 0.954 * L("foot")], len: L("toe") },
    thigh_L: { off: [-L("hipW"), 0, 0], len: L("thigh") }, shin_L: { off: [0, -L("thigh"), 0], len: L("shin") }, foot_L: { off: [0, -L("shin"), 0], len: L("foot") }, toe_L: { off: [0, -0.3 * L("foot"), 0.954 * L("foot")], len: L("toe") },
  };
  return { H, seg: s, hipY, legLen: L("thigh") + L("shin"), armLen: L("upperArm") + L("foreArm"), ankleH: L("ankle"), dims: D, stature: L("thigh") + L("shin") + L("ankle") + L("pelvisUp") + L("spine") + L("chest") + L("neck") + L("head") };
}
// build the runtime skeleton (the SAME object shape the goalkeeper solver / renderer consume: bones[idx/off/dir/len/rad/part/parent/children], byName, H, prop)
function ofBuildSkeleton(m) {
  const d = ofDims(m), bones = [], byName = {}, g = m.girth || {}; const gk = (n) => { const v = g[n]; return v == null ? 1 : Array.isArray(v) ? (v[0] + v[1]) / 2 : v; };
  for (const [name, parent, , dir, , rad, part] of SKEL_DEF) {
    const dd = d.dims[name]; const b = { name, parent: parent ? byName[parent] : null, idx: bones.length, off: dd.off.slice(), dir: V3.norm(dir), len: dd.len, rad: rad * (m.H / OF_H_REF) * gk(name), part, children: [] };
    bones.push(b); byName[name] = b; if (b.parent) b.parent.children.push(b);
  }
  const skel = { H: m.H, prop: { legs: 1, arms: 1, torso: 1, width: 1 }, bones, byName, bindWidthM: 2 * d.dims.thigh_R.off[0] + 2 * byName.thigh_R.rad, morph: m, dims: d, girth: g, legLen: d.legLen, armLen: d.armLen, hipY: d.hipY, ankleH: d.ankleH };
  skel.invBind = skelInverseBind(skel); skel.contact = { foot: { soleBelowAnkleM: d.ankleH } };
  return skel;
}
// ── RIG VALIDATION (pure, deterministic): bind facts every player must satisfy before any motion is authored on it ──
function ofValidateRig(skel) {
  const fk = skelFK(skel, {}, M4.ident()), B = skel.byName, r = { id: skel.morph.id, H: skel.H, checks: {}, ok: true };
  const chk = (k, ok, v) => { r.checks[k] = { ok: !!ok, v }; if (!ok) r.ok = false; };
  chk("bones23", skel.bones.length === 23 && skel.bones.every((b, i) => b.name === SKEL_DEF[i][0]), skel.bones.length);
  chk("finite", fk.joint.every(p => p.every(Number.isFinite)), true);
  const S = skelSkinMatrices(skel, fk, skel.invBind); let e = 0; for (const m of S) for (let i = 0; i < 16; i++) e = Math.max(e, Math.abs(m[i] - (i % 5 === 0 ? 1 : 0))); chk("inverseBindIdentity", e < 1e-9, e);
  const aR = fk.joint[B.foot_R.idx][1], aL = fk.joint[B.foot_L.idx][1]; chk("anklesAtAnkleHeight", Math.abs(aR - skel.ankleH) < 1e-6 && Math.abs(aL - skel.ankleH) < 1e-6, [aR, aL, skel.ankleH]);
  const toeR = fk.tip[B.toe_R.idx][1]; chk("toeNearGround", toeR >= -1e-9 && toeR < 0.06 * skel.H, toeR);
  const headTop = fk.tip[B.head.idx][1]; chk("heightMatches", Math.abs(headTop - skel.H) < 1e-6, headTop);   // the stature is exact by construction (ratios normalised to H)   // head tip + hair ≈ H (the head length is the last segment; a few cm of crown)
  let sym = 0; for (const b of skel.bones) if (b.name.endsWith("_R")) { const l = B[b.name.slice(0, -2) + "_L"]; const pr = fk.joint[b.idx], pl = fk.joint[l.idx]; sym = Math.max(sym, Math.abs(pr[0] + pl[0]), Math.abs(pr[1] - pl[1]), Math.abs(pr[2] - pl[2]), Math.abs(b.len - l.len)); } chk("leftRightSymmetry", sym < 1e-9, sym);
  chk("jointOrderShared", skel.bones.map(b => b.name).join() === SKEL_DEF.map(x => x[0]).join(), true);
  chk("legLengthPositive", skel.legLen > 0.3 * skel.H && skel.legLen < 0.6 * skel.H, skel.legLen / skel.H);
  const shoulderW = fk.joint[B.upperArm_R.idx][0] - fk.joint[B.upperArm_L.idx][0]; chk("shoulderWidth", shoulderW > 0.2 && shoulderW < 0.7, shoulderW);
  r.summary = { legLen: +skel.legLen.toFixed(3), armLen: +skel.armLen.toFixed(3), hipY: +skel.hipY.toFixed(3), shoulderW: +shoulderW.toFixed(3), femurTibia: +(B.thigh_R.len / B.shin_R.len).toFixed(3), torso: +((B.spine.len + B.chest.len)).toFixed(3), headTop: +headTop.toFixed(3) };
  return r;
}
// ── SKIN VALIDATION on a POSE: the skinned mesh must not tear (edge stretch), joints must not disconnect, morphology must be kept ──
function ofSkinCheck(skel, mesh, fk) {
  const S = skelSkinMatrices(skel, fk, skel.invBind), n = mesh.nVerts, P = new Float32Array(n * 3), bindP = mesh.pos;
  for (let i = 0; i < n; i++) { const p = [bindP[i * 3], bindP[i * 3 + 1], bindP[i * 3 + 2]]; let q = [0, 0, 0]; for (let k = 0; k < 4; k++) { const w = mesh.bw[i * 4 + k]; if (w <= 0) continue; const t = M4.transformPoint(S[mesh.bi[i * 4 + k]], p); q[0] += w * t[0]; q[1] += w * t[1]; q[2] += w * t[2]; } P[i * 3] = q[0]; P[i * 3 + 1] = q[1]; P[i * 3 + 2] = q[2]; }
  let maxStretch = 0, minY = 1e9, worst = -1; const idx = mesh.idx;
  for (let t = 0; t < idx.length; t += 3) for (let e = 0; e < 3; e++) { const a = idx[t + e], b = idx[t + (e + 1) % 3]; const l0 = Math.hypot(bindP[a * 3] - bindP[b * 3], bindP[a * 3 + 1] - bindP[b * 3 + 1], bindP[a * 3 + 2] - bindP[b * 3 + 2]); if (l0 < 1e-5) continue; const l1 = Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]); const s = l1 / l0; if (s > maxStretch) { maxStretch = s; worst = a; } }
  for (let i = 0; i < n; i++) minY = Math.min(minY, P[i * 3 + 1]);
  return { maxEdgeStretch: +maxStretch.toFixed(3), worstVertex: worst, meshMinY: +minY.toFixed(4), posed: P };
}
// a morphology signature measured on the SKINNED mesh (posed): girth of key rings and the limb lengths — animation must not normalise it
function ofMorphSignature(skel, fk) {
  const B = skel.byName, J = (n) => fk.joint[B[n].idx], T = (n) => fk.tip[B[n].idx];
  return { thigh: +V3.dist(J("thigh_R"), J("shin_R")).toFixed(4), shin: +V3.dist(J("shin_R"), J("foot_R")).toFixed(4), upperArm: +V3.dist(J("upperArm_R"), J("foreArm_R")).toFixed(4), foreArm: +V3.dist(J("foreArm_R"), J("hand_R")).toFixed(4), torso: +V3.dist(J("pelvis"), J("neck")).toFixed(4), shoulders: +V3.dist(J("upperArm_R"), J("upperArm_L")).toFixed(4), hips: +V3.dist(J("thigh_R"), J("thigh_L")).toFixed(4), pelvisY: +J("pelvis")[1].toFixed(4) };
}

// TRC-1 (tackler render correction, CXA-1 M1; PRESENTATION ONLY — reads physical body states, writes nothing back, changes no record):
// two render rules for drawing a frozen character rig from V2 body states.
//   MC-1 §2(4) (the rule every PVP-1A-DX / ABI-1 / CXA-1 visual used): bone rotation q_b = R_B · Z0_B⁻¹ from the carrier V2 body; bone positions by the
//      RIG's own forward kinematics from the V2 hip midpoint. Exact only when the rig and the V2 body share proportions (runner R0 ← vinicius).
//   MC-1P (new; for the tackler V1-matched ← gabriel): the same rotations; every mapped bone RIGIDLY ATTACHED to its carrier body at its physical anchor:
//      legs / arms — the V2 joint that connects the body to its parent (hip, knee, ankle, shoulder, elbow), so rendered joints = physical joints;
//      trunk (spine, chest, head) — the rig-bind position relative to the hip midpoint in the V2 reference pose (the same convention relation V2 uses
//      for R0 ← vinicius: both rigs sit 48–61 mm from their bodies' spinal hinges by the identical offset);
//      pelvis — rig hip midpoint on the V2 hip midpoint (as MC-1), with a LATERAL scale of the pelvis bone to the physical hip spacing;
//   and each bone stretched only along its own axis (bone-local S = I + (s − 1)·d·dᵀ, d = the bind direction to its child) so its tip meets the next
//   physical joint (thigh, shank, upper arm, forearm → V2 wrist = the forearm capsule's distal end). Unmapped bridging bones (neck, clavicles) are
//   re-aimed and stretched every frame from their parent to the next attached bone origin (no mesh tear); hand / toe / hair follow their parent (as MC-1).
//   Constant corrections are computed once in the V2 reference pose Z0 (posedBodies(spec, {}) — arms down, = the rig bind pose; bind rotations are identity).
const RA = new URL("../../", import.meta.url).href;
const PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { IL, MC, V, Q } = PL;
export { PL, IL, MC, V, Q };
export const OFFS = [50, 0, -34], toW = (p) => V.add(p, OFFS);
let _LV = null; export const LV = () => _LV || (_LV = IL.loadLV2());
export function rig(id) { const SK = Object.assign({}, LV().X.charSkel(id)); delete SK._r1body; return SK; }
const INV = Object.fromEntries(Object.entries(MC.CARRIER).map(([body, bone]) => [bone, body]));
export const qmat = (q, p) => { const [x, y, z, w] = q; return [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0, 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0, 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, p[0], p[1], p[2], 1]; };
const smat = (d, s) => { if (s === 1 || !d) return null; const k = s - 1, m = [1 + k * d[0] * d[0], k * d[1] * d[0], k * d[2] * d[0], 0, k * d[0] * d[1], 1 + k * d[1] * d[1], k * d[2] * d[1], 0, k * d[0] * d[2], k * d[1] * d[2], 1 + k * d[2] * d[2], 0, 0, 0, 0, 1]; return m; };   // column-major, symmetric
const qFromTo = (a, b) => { const u = V.norm(a), v = V.norm(b), c = V.dot(u, v); if (c > 1 - 1e-12) return [0, 0, 0, 1]; if (c < -1 + 1e-12) { const ax = Math.abs(u[0]) < 0.9 ? V.norm(V.cross(u, [1, 0, 0])) : V.norm(V.cross(u, [0, 1, 0])); return [ax[0], ax[1], ax[2], 0]; } const ax = V.cross(u, v); return Q.norm([ax[0], ax[1], ax[2], 1 + c]); };
// ── MC-1 §2(4), unchanged (returns world bone origins, rotations, skin matrices) ──
export function poseMC1(SK, md, Sloc, q0) { const M4 = LV().X.M4, Sw = Sloc.map(s => ({ pos: toW(s.pos), rot: s.rot })), q = [], p = [], bi = md.bi, offHip = V.sc(V.add(SK.byName.thigh_L.off, SK.byName.thigh_R.off), 0.5);
  for (const b of SK.bones) { const i = b.idx, vb = INV[b.name]; if (!b.parent) { const pel = Sw[0].pos; q[i] = q0 ? q0[i] : [0, 0, 0, 1]; p[i] = [pel[0], 0, pel[2]]; continue; }
    q[i] = vb != null ? Q.norm(Q.mul(Sw[bi(vb)].rot, Q.conj(md.Z0[bi(vb)].rot))) : q0 ? Q.norm(Q.mul(q[b.parent.idx], Q.mul(Q.conj(q0[b.parent.idx]), q0[i]))) : q[b.parent.idx];
    p[i] = b.name === "pelvis" ? V.sub(V.add(Sw[0].pos, Q.rot(Sw[0].rot, V.sub(md.hipMid0, md.B[0].origin))), Q.rot(q[i], offHip)) : V.add(p[b.parent.idx], Q.rot(q[b.parent.idx], b.off)); }
  const W = SK.bones.map(b => qmat(q[b.idx], p[b.idx])), skin = new Float64Array(SK.bones.length * 16); SK.bones.forEach((b, i) => skin.set(M4.mul(W[i], SK.invBind[i]), i * 16));
  return { p, q, W, skin, tip: SK.bones.map(b => V.add(p[b.idx], Q.rot(q[b.idx], V.sc(b.dir, b.len)))) }; }
// ── MC-1P: build the constant corrections in Z0 ──
const JOINT_OF = { thigh_L: "hip_L", shin_L: "knee_L", foot_L: "ankle_L", thigh_R: "hip_R", shin_R: "knee_R", foot_R: "ankle_R", upperArm_L: "shoulder_L", foreArm_L: "elbow_L", upperArm_R: "shoulder_R", foreArm_R: "elbow_R" };
const TRUNK = ["spine", "chest", "head"], BRIDGE = { neck: "head", clavicle_L: "upperArm_L", clavicle_R: "upperArm_R" };
export function buildPhys(SK, spec) { const M4 = LV().X.M4, md = MC.model(spec), Z0 = md.Z0, B = spec.bodies, bi = md.bi, W0 = LV().X.skelFK(SK, {}, M4.ident()).world, bp = (n) => { const m = W0[SK.byName[n].idx]; return [m[12], m[13], m[14]]; };
  const jZ = (n) => { const j = spec.joints.find(x => x.name === n), c = j.childIndex; return V.add(Z0[c].pos, Q.rot(Z0[c].rot, V.sub(j.at, B[c].origin))); };
  const rmid = V.sc(V.add(bp("thigh_L"), bp("thigh_R")), 0.5), zmid = V.sc(V.add(jZ("hip_L"), jZ("hip_R")), 0.5);
  const target = {}; for (const [b, j] of Object.entries(JOINT_OF)) target[b] = jZ(j); for (const b of TRUNK) target[b] = V.add(zmid, V.sub(bp(b), rmid));
  for (const sd of ["L", "R"]) { const fa = B[bi("forearm_" + sd)], tp = fa.shapes.find(s => s.type === "tapered"), a = V.add(tp.pos, Q.rot(tp.rot, [0, tp.half, 0])), b2 = V.add(tp.pos, Q.rot(tp.rot, [0, -tp.half, 0])), elb = V.sub(spec.joints.find(j => j.name === "elbow_" + sd).at, fa.origin);
    const far = V.dist(a, elb) > V.dist(b2, elb) ? a : b2, ci = bi("forearm_" + sd); target["hand_" + sd] = V.add(Z0[ci].pos, Q.rot(Z0[ci].rot, far)); }   // V2 wrist = distal end of the forearm's tapered capsule
  const R = { SK, spec, md, bone: {} };
  for (const b of SK.bones) { const e = { name: b.name, idx: b.idx, kind: "fk" };
    if (b.name === "pelvis") { const xl = V.dist(bp("thigh_L"), bp("thigh_R")), xv = V.dist(jZ("hip_L"), jZ("hip_R")), d = V.norm(V.sub(SK.byName.thigh_L.off, SK.byName.thigh_R.off)); Object.assign(e, { kind: "pelvis", carrier: bi("pelvis"), scaleDir: d, scale: xv / xl, hipSpacing: { rig: xl, v2: xv } }); }
    else if (INV[b.name] && (JOINT_OF[b.name] || TRUNK.includes(b.name))) { const c = bi(INV[b.name]), P = target[b.name]; Object.assign(e, { kind: "attached", carrier: c, anchor: Q.rot(Q.conj(Z0[c].rot), V.sub(P, Z0[c].pos)), joint: JOINT_OF[b.name] || null }); }
    else if (BRIDGE[b.name]) Object.assign(e, { kind: "bridge", to: BRIDGE[b.name] });
    // axial stretch to the child's target (constant, in Z0), for attached bones with a chain child
    const child = SK.bones.find(c => c.parent === b && (target[c.name] || (b.name === "foreArm_L" && c.name === "hand_L") || (b.name === "foreArm_R" && c.name === "hand_R")));
    if (e.kind === "attached" && child && target[child.name] && !TRUNK.includes(b.name)) { const dz = V.dist(target[child.name], target[b.name]), dr = V.len(child.off); e.scaleDir = V.norm(child.off); e.scale = dz / dr; e.swingDeg = Math.acos(Math.max(-1, Math.min(1, V.dot(V.norm(child.off), V.norm(V.sub(target[child.name], target[b.name])))))) * 180 / Math.PI; e.len = { rig: dr, v2: dz, child: child.name }; }
    R.bone[b.name] = e; }
  R.targetZ0 = target; return R; }
// ── MC-1P: pose ──
export function posePhys(R, Sloc) { const { SK, md } = R, M4 = LV().X.M4, Sw = Sloc.map(s => ({ pos: toW(s.pos), rot: s.rot })), q = [], p = [], Sc = [], Wm = [];
  const order = SK.bones.slice().sort((a, b) => (R.bone[a.name].kind === "bridge") - (R.bone[b.name].kind === "bridge"));   // bridges last: they aim at attached bones
  const rotOf = (c) => Q.norm(Q.mul(Sw[c].rot, Q.conj(md.Z0[c].rot)));
  for (const b of order) { const e = R.bone[b.name], i = b.idx;
    if (!b.parent) { const pel = Sw[0].pos; q[i] = [0, 0, 0, 1]; p[i] = [pel[0], 0, pel[2]]; Sc[i] = null; continue; }
    if (e.kind === "pelvis") { q[i] = rotOf(e.carrier); const offHip = V.sc(V.add(SK.byName.thigh_L.off, SK.byName.thigh_R.off), 0.5); p[i] = V.sub(V.add(Sw[0].pos, Q.rot(Sw[0].rot, V.sub(md.hipMid0, md.B[0].origin))), Q.rot(q[i], offHip)); Sc[i] = smat(e.scaleDir, e.scale); continue; }
    if (e.kind === "attached") { q[i] = rotOf(e.carrier); p[i] = V.add(Sw[e.carrier].pos, Q.rot(Sw[e.carrier].rot, e.anchor)); Sc[i] = e.scale ? smat(e.scaleDir, e.scale) : null; continue; }
    if (e.kind === "fk") { const pa = b.parent.idx; q[i] = q[pa]; const off = Sc[pa] ? applyS(Sc[pa], b.off) : b.off; p[i] = V.add(p[pa], Q.rot(q[pa], off)); Sc[i] = null; continue; } }
  for (const b of SK.bones) { const e = R.bone[b.name], i = b.idx; if (e.kind !== "bridge") continue;   // re-aim + stretch from the parent-attached origin to the target bone origin
    const pa = b.parent.idx, off = Sc[pa] ? applyS(Sc[pa], b.off) : b.off; p[i] = V.add(p[pa], Q.rot(q[pa], off)); const tgt = p[SK.byName[e.to].idx], child = SK.byName[e.to], dirRest = Q.rot(q[pa], child.off), want = V.sub(tgt, p[i]);
    q[i] = Q.norm(Q.mul(qFromTo(dirRest, want), q[pa])); Sc[i] = smat(V.norm(child.off), V.len(want) / V.len(child.off)); }
  // FK children of bridges / attached bones that were computed before their parent was final (hand, toe, hair are FK of attached bones: already final)
  for (let i = 0; i < SK.bones.length; i++) { const T = qmat(q[i], p[i]); Wm[i] = Sc[i] ? M4.mul(T, Sc[i]) : T; }
  const skin = new Float64Array(SK.bones.length * 16); SK.bones.forEach((b, i) => skin.set(M4.mul(Wm[i], SK.invBind[i]), i * 16));
  return { p, q, W: Wm, skin, tip: SK.bones.map(b => V.add(p[b.idx], Q.rot(q[b.idx], Sc[b.idx] ? applyS(Sc[b.idx], V.sc(b.dir, b.len)) : V.sc(b.dir, b.len)))) }; }
function applyS(S, v) { return [S[0] * v[0] + S[4] * v[1] + S[8] * v[2], S[1] * v[0] + S[5] * v[1] + S[9] * v[2], S[2] * v[0] + S[6] * v[1] + S[10] * v[2]]; }
// physical joint centre (world) from the child body, and from the parent body
export function physJoint(spec, Sloc, name, side = "child") { const j = spec.joints.find(x => x.name === name), b = side === "child" ? j.childIndex : j.parentIndex; return toW(V.add(Sloc[b].pos, Q.rot(Sloc[b].rot, V.sub(j.at, spec.bodies[b].origin)))); }
export function physWrist(R, Sloc, sd) { const c = R.md.bi("forearm_" + sd), Z0 = R.md.Z0[c], loc = Q.rot(Q.conj(Z0.rot), V.sub(R.targetZ0["hand_" + sd], Z0.pos)); return toW(V.add(Sloc[c].pos, Q.rot(Sloc[c].rot, loc))); }

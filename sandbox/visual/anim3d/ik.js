// ═══ anim3d/ik.js — procedural correction: 2-bone analytic IK on the FK result (glove → simulation hand, foot → plant point) ═══
// IK CORRECTS authored motion; it never manufactures the action. Bones are re-aimed by minimal rotations, never scaled.
// 2-bone analytic IK on world matrices (after FK): upper (shoulder→elbow), fore (elbow→wrist), reaching `target` (3D world) with weight w.
// The chain is re-aimed by minimal rotations from its current FK directions (twist-preserving); bones are never scaled.
// Returns { reached, residual (m), elbow, wrist, targetUsed }.
function skelIK2(skel, fk, upperName, foreName, handName, target, w, poleHint, endFrac) {
  const up = skel.byName[upperName], fo = skel.byName[foreName], hd = skel.byName[handName];
  const S = fk.joint[up.idx], E0 = fk.joint[fo.idx], W0 = fk.joint[hd.idx];
  const a = up.len, b = fo.len;
  // the end effector is a point `endFrac` of the hand bone beyond the wrist (glove centre); aim the wrist short of the target along S→T
  const ef = endFrac == null ? 0 : endFrac; const dST0 = V3.norm(V3.sub(target, S)); const targetW = V3.sub(target, V3.scale(dST0, ef * hd.len));
  const T = V3.lerp(W0, targetW, clamp01(w));
  let d = V3.dist(T, S); const maxR = a + b - 1e-4; const reached = d <= maxR; if (d > maxR) d = maxR; if (d < Math.abs(a - b) + 1e-4) d = Math.abs(a - b) + 1e-4;
  const dirST = V3.norm(V3.sub(T, S));
  // elbow bend plane: use the FK elbow's own offset from the S→T line as the pole (keeps the authored elbow direction), fall back to the hint
  let pole = V3.sub(E0, V3.add(S, V3.scale(dirST, V3.dot(V3.sub(E0, S), dirST))));
  if (V3.len(pole) < 0.02 && poleHint) pole = V3.sub(poleHint, V3.add(S, V3.scale(dirST, V3.dot(V3.sub(poleHint, S), dirST))));
  if (V3.len(pole) < 1e-4) pole = Math.abs(dirST[1]) < 0.9 ? [0, -1, 0] : [1, 0, 0];
  pole = V3.norm(pole);
  const cosA = clamp01((a * a + d * d - b * b) / (2 * a * d)); const alpha = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
  const E = V3.add(S, V3.add(V3.scale(dirST, a * Math.cos(alpha)), V3.scale(pole, a * Math.sin(alpha))));
  const Tw = V3.add(E, V3.scale(V3.norm(V3.sub(T, E)), b));
  // re-aim upper arm: rotate its world matrix so the FK elbow direction maps to the new one
  const rot = (bone, from, to) => { const m = fk.world[bone.idx]; const R = M4.fromTo(V3.norm(V3.sub(from, M4.origin(m))), V3.norm(V3.sub(to, M4.origin(m)))); const o = M4.origin(m); const m2 = M4.mul(M4.translate(o[0], o[1], o[2]), M4.mul(R, M4.mul(M4.translate(-o[0], -o[1], -o[2]), m))); return m2; };
  fk.world[up.idx] = rot(up, E0, E); fk.tip[up.idx] = E;
  // forearm: translate to the new elbow, then re-aim toward the new wrist
  const fm = fk.world[fo.idx]; const fo2 = M4.copy(fm); fo2[12] = E[0]; fo2[13] = E[1]; fo2[14] = E[2]; fk.world[fo.idx] = fo2; fk.joint[fo.idx] = E;
  const wr0 = M4.transformPoint(fo2, V3.scale(fo.dir, fo.len));
  fk.world[fo.idx] = rot(fo, wr0, Tw); fk.tip[fo.idx] = Tw;
  // hand follows the forearm (same rotation delta), positioned at the new wrist
  const hm = fk.world[hd.idx]; const hR = M4.copy(fk.world[fo.idx]); hR[12] = Tw[0]; hR[13] = Tw[1]; hR[14] = Tw[2];
  // keep the hand's own local rotation relative to the forearm: worldHand = worldFore' * inv(worldFore_old) * worldHand_old (rigid)
  const delta = M4.mul(fk.world[fo.idx], M4.invertRigid(fm));
  const hm2 = M4.mul(delta, hm); hm2[12] = Tw[0]; hm2[13] = Tw[1]; hm2[14] = Tw[2];
  fk.world[hd.idx] = hm2; fk.joint[hd.idx] = Tw; fk.tip[hd.idx] = M4.transformPoint(hm2, V3.scale(hd.dir, hd.len));
  // descendants of the end bone (e.g. the toe under a foot) follow rigidly: world' = (new_end × inv(old_end)) × world
  const dEnd = M4.mul(hm2, M4.invertRigid(hm)); const carry = (bone) => { for (const ch of bone.children) { fk.world[ch.idx] = M4.mul(dEnd, fk.world[ch.idx]); fk.joint[ch.idx] = M4.origin(fk.world[ch.idx]); fk.tip[ch.idx] = M4.transformPoint(fk.world[ch.idx], V3.scale(ch.dir, ch.len)); carry(ch); } }; carry(hd);
  const handCentre = M4.transformPoint(hm2, V3.scale(hd.dir, hd.len * (ef || 0.6)));
  return { reached, residual: V3.dist(ef ? handCentre : Tw, target), elbow: E, wrist: Tw, targetUsed: T, handCentre };
}

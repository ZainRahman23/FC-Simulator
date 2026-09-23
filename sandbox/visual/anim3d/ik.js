// ═══ anim3d/ik.js — procedural correction: 2-bone analytic IK on the FK result (glove → simulation hand, foot → plant point) ═══
// IK CORRECTS authored motion; it never manufactures the action. Bones are re-aimed by minimal rotations, never scaled.
// 2-bone analytic IK on world matrices (after FK): upper (shoulder→elbow), fore (elbow→wrist), reaching `target` (3D world) with weight w.
// The chain is re-aimed by minimal rotations from its current FK directions (twist-preserving); bones are never scaled.
// Returns { reached, residual (m), elbow, wrist, targetUsed }.
// `mem` (optional, per chain, persistent across frames): bend-plane memory. When the pole's perpendicular component is (nearly)
// degenerate, or would reverse the joint's side of the chain line within one frame, the plane used last frame is kept — a knee or
// elbow never flips sides between two frames.
let GK_IK_MIN_ELBOW_DEG = 30;   // (review tools may set 0 to reproduce the unbounded fold)                                                                  // minimum included elbow angle (anatomical fold limit of the arm chain)
function skelIK2(skel, fk, upperName, foreName, handName, target, w, poleHint, endFrac, mem) {
  const up = skel.byName[upperName], fo = skel.byName[foreName], hd = skel.byName[handName];
  const S = fk.joint[up.idx], E0 = fk.joint[fo.idx], W0 = fk.joint[hd.idx];
  const a = up.len, b = fo.len;
  // the end effector is a point `endFrac` of the hand bone beyond the wrist (glove centre); aim the wrist short of the target along S→T
  const ef = endFrac == null ? 0 : endFrac; const dST0 = V3.norm(V3.sub(target, S)); const targetW = V3.sub(target, V3.scale(dST0, ef * hd.len));
  // a target inside the chain's fold radius (closer to the root joint than a folded limb can bring its end effector) has no stable
  // direction from the root — the solve releases toward the authored limb as the target approaches the root (weight fade), and the
  // residual exposes the mismatch (the modeled arm / leg cannot fold onto a point at its own shoulder / hip)
  const dMin = Math.max(Math.abs(a - b) + 0.02, 0.12 * (a + b)), dRaw = V3.dist(targetW, S); if (mem) mem.dRaw = +dRaw.toFixed(3); if (dRaw < dMin) w = clamp01(w) * (dRaw / dMin);   // fold radius = the folded chain's own minimum (|a−b| + 2 cm), never less than 12 % of the chain
  const T = V3.lerp(W0, targetW, clamp01(w));
  let d = V3.dist(T, S); const maxR = a + b - 1e-4; const reached = d <= maxR; if (d > maxR) d = maxR; if (d < Math.abs(a - b) + 1e-4) d = Math.abs(a - b) + 1e-4;
  // ANATOMICAL FOLD LIMIT (arms): an elbow cannot close past its minimum included angle — a target nearer the shoulder than the folded chain's own
  // reach is met at that fold (the hand stops short of it; the residual exposes the miss) instead of the two bones collapsing onto each other
  let folded = false; if (/^upperArm_/.test(upperName)) { const dFold = Math.sqrt(Math.max(0, a * a + b * b - 2 * a * b * Math.cos(GK_IK_MIN_ELBOW_DEG * Math.PI / 180))); if (d < dFold) { d = dFold; folded = true; } }
  let dirST = V3.norm(V3.sub(T, S));
  // near the fold radius the root→target direction turns fast for a small target motion: it is blended with last frame's direction
  // (memory) by how deep inside the near-fold zone the target sits — continuous, deterministic, and exact again outside the zone
  if (mem && mem.dir && dRaw < 2 * dMin) { const k = Math.max(0.15, dRaw / (2 * dMin)); const m = V3.add(V3.scale(dirST, k), V3.scale(mem.dir, 1 - k)); if (V3.len(m) > 1e-3) dirST = V3.norm(m); else dirST = mem.dir.slice(); }
  if (mem) mem.dir = dirST.slice();
  // elbow bend plane: use the FK elbow's own offset from the S→T line as the pole (keeps the authored elbow direction), fall back to the hint
  // bend-plane pole: an explicit hint (e.g. knees forward-up for planted legs) wins; otherwise the FK joint's own offset from the S→T line
  let pole = poleHint ? V3.sub(poleHint, V3.add(S, V3.scale(dirST, V3.dot(V3.sub(poleHint, S), dirST)))) : V3.sub(E0, V3.add(S, V3.scale(dirST, V3.dot(V3.sub(E0, S), dirST))));
  if (V3.len(pole) < 0.02) pole = V3.sub(E0, V3.add(S, V3.scale(dirST, V3.dot(V3.sub(E0, S), dirST))));
  if (mem && mem.v) { const pl = V3.len(pole), mp = V3.sub(mem.v, V3.scale(dirST, V3.dot(mem.v, dirST))); if (V3.len(mp) > 1e-3 && pl < 0.04) pole = mp; }   // degenerate plane: keep last frame's
  if (V3.len(pole) < 1e-4) pole = Math.abs(dirST[1]) < 0.9 ? [0, -1, 0] : [1, 0, 0];
  pole = V3.norm(pole);
  if (mem && mem.v) {                                                                          // bounded plane rotation: the joint orbits the chain line toward the wanted plane at most maxStep per solve (a knee / elbow never flips sides in one frame)
    const mp0 = V3.sub(mem.v, V3.scale(dirST, V3.dot(mem.v, dirST))); if (V3.len(mp0) > 1e-3) { const mp = V3.norm(mp0), cr = V3.cross(mp, pole), ang = Math.atan2(V3.dot(cr, dirST), V3.dot(mp, pole)), maxStep = 1.05; if (Math.abs(ang) > maxStep) { const st = ang > 0 ? maxStep : -maxStep, q = V3.cross(dirST, mp); pole = V3.norm(V3.add(V3.scale(mp, Math.cos(st)), V3.scale(q, Math.sin(st)))); } } }
  if (mem) mem.v = pole;
  const cosA = clamp01((a * a + d * d - b * b) / (2 * a * d)); const alpha = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
  const E = V3.add(S, V3.add(V3.scale(dirST, a * Math.cos(alpha)), V3.scale(pole, a * Math.sin(alpha))));
  if (mem && mem.debug) mem.dbg = { S: S.map(v => +v.toFixed(3)), E0: E0.map(v => +v.toFixed(3)), W0: W0.map(v => +v.toFixed(3)), T: T.map(v => +v.toFixed(3)), d: +d.toFixed(3), alpha: +(alpha / DEG).toFixed(1), pole: pole.map(v => +v.toFixed(3)), E: E.map(v => +v.toFixed(3)), w: +w.toFixed(3), target: target.map(v => +v.toFixed(3)) };
  const Tf = folded ? V3.add(S, V3.scale(dirST, d)) : T;                                        // fold-limited: the forearm aims at the point the limited chain can reach on the shoulder→target line (never back past the fold toward the shoulder)
  const Tw = V3.add(E, V3.scale(V3.norm(V3.sub(Tf, E)), b));
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

// ── CRADLE SOLVE (catches): both arms as ONE coordinated basket around the ball, explicit anatomy — never two chains chasing points ──
// Re-aim a 3-bone chain (upper → fore → hand) to an EXPLICIT elbow E and wrist W (world), the hand curling toward aimPt (the ball).
function skelAimChain(skel, fk, upperName, foreName, handName, E, W, aimPt, curl, handDir) {   // handDir (optional, unit): an explicit hand direction (wrist → fingertips) instead of the curl blend — a palm-supported ball
  const up = skel.byName[upperName], fo = skel.byName[foreName], hd = skel.byName[handName];
  const S = fk.joint[up.idx], E0 = fk.joint[fo.idx];
  const rot = (bone, from, to) => { const m = fk.world[bone.idx]; const o = M4.origin(m); const R = M4.fromTo(V3.norm(V3.sub(from, o)), V3.norm(V3.sub(to, o))); return M4.mul(M4.translate(o[0], o[1], o[2]), M4.mul(R, M4.mul(M4.translate(-o[0], -o[1], -o[2]), m))); };
  fk.world[up.idx] = rot(up, E0, E); fk.tip[up.idx] = E;
  const fm = fk.world[fo.idx]; const fo2 = M4.copy(fm); fo2[12] = E[0]; fo2[13] = E[1]; fo2[14] = E[2]; fk.world[fo.idx] = fo2; fk.joint[fo.idx] = E;
  const wr0 = M4.transformPoint(fo2, V3.scale(fo.dir, fo.len)); fk.world[fo.idx] = rot(fo, wr0, W); fk.tip[fo.idx] = W;
  const hm = fk.world[hd.idx]; const delta = M4.mul(fk.world[fo.idx], M4.invertRigid(fm)); const hm2 = M4.mul(delta, hm); hm2[12] = W[0]; hm2[13] = W[1]; hm2[14] = W[2];
  fk.world[hd.idx] = hm2; fk.joint[hd.idx] = W;
  // wrist: the hand curls from the forearm line toward the ball (palm on the surface) — bounded by `curl` (0 = straight, 1 = fully at the ball)
  const tip0 = M4.transformPoint(hm2, V3.scale(hd.dir, hd.len)); const dF = V3.norm(V3.sub(W, E)), dB = V3.norm(V3.sub(aimPt, W)); let dH = handDir ? V3.norm(handDir) : V3.norm(V3.add(V3.scale(dF, 1 - curl), V3.scale(dB, curl))); if (V3.len(dH) < 1e-6) dH = dF;
  const tip1 = V3.add(W, V3.scale(dH, hd.len)); fk.world[hd.idx] = rot(hd, tip0, tip1); fk.tip[hd.idx] = tip1;
  const dEnd = M4.mul(fk.world[hd.idx], M4.invertRigid(hm)); const carry = (bone) => { for (const ch of bone.children) { fk.world[ch.idx] = M4.mul(dEnd, fk.world[ch.idx]); fk.joint[ch.idx] = M4.origin(fk.world[ch.idx]); fk.tip[ch.idx] = M4.transformPoint(fk.world[ch.idx], V3.scale(ch.dir, ch.len)); carry(ch); } }; carry(hd);
  return { elbow: E, wrist: W, handCentre: V3.lerp(W, tip1, 0.6) };
}
// Elbow position for a shoulder S and wrist target W with bone lengths a (upper) / b (fore): the elbow lies on a circle around the
// S→W line; the angle is CHOSEN (deterministically, 36 samples) to lie along the preferred direction `pref` while keeping the elbow,
// the upper-arm midpoint and the forearm midpoint OUTSIDE the torso volume (`inside(p)` → true if a point penetrates it). A memory
// `mem.theta` keeps the previous angle when its score is within 0.05 of the best (no side flips between frames). Returns
// { E, W (clamped to the reach), theta, valid, viol: {elbow, upper, fore} }.
function skelCradleElbow(S, W, a, b, pref, inside, mem, opts) {
  const o = opts || {}; let d = V3.dist(W, S); const maxR = a + b - 0.005, minR = Math.abs(a - b) + 0.005; let Wc = W;
  if (d > maxR) { Wc = V3.add(S, V3.scale(V3.norm(V3.sub(W, S)), maxR)); d = maxR; } if (d < minR) { Wc = V3.add(S, V3.scale(V3.norm(V3.sub(W, S)), minR)); d = minR; }
  const dir = V3.norm(V3.sub(Wc, S)), x = (a * a - b * b + d * d) / (2 * d), rho = Math.sqrt(Math.max(0, a * a - x * x)), C = V3.add(S, V3.scale(dir, x));
  let u = V3.sub(pref, V3.scale(dir, V3.dot(pref, dir))); if (V3.len(u) < 1e-4) u = V3.sub([0, -1, 0], V3.scale(dir, dir[1] * -1)); if (V3.len(u) < 1e-4) u = [1, 0, 0]; u = V3.norm(u); const v = V3.cross(dir, u); const pn = V3.norm(pref);
  let best = null, cand = [];
  for (let k = 0; k < 36; k++) {
    const th = -Math.PI + k * Math.PI / 18, E = V3.add(C, V3.add(V3.scale(u, rho * Math.cos(th)), V3.scale(v, rho * Math.sin(th))));
    const viol = { elbow: inside(E), upper: inside(V3.lerp(S, E, 0.5)), fore: inside(V3.lerp(E, Wc, 0.5)) };
    let sc = V3.dot(V3.norm(V3.sub(E, C)), pn) - (viol.elbow ? 2 : 0) - (viol.upper ? 2 : 0) - (viol.fore ? 2 : 0);
    if (o.maxUp != null && E[1] - S[1] > o.maxUp) sc -= 0.8;                                    // an elbow above the shoulder is not a catch
    if (o.backPlane && o.backPlane(E)) sc -= 1.5;                                               // an elbow behind the back plane is an inversion
    cand.push({ th, E, sc, viol }); if (!best || sc > best.sc) best = cand[cand.length - 1];
  }
  if (mem && mem.theta != null) { let near = null; for (const c of cand) { const dth = Math.abs(((c.th - mem.theta + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI); if (!near || dth < near.dth) near = { c, dth }; } if (near && near.c.sc >= best.sc - 0.05) best = near.c; }
  if (mem) mem.theta = best.th;
  return { E: best.E, W: Wc, theta: best.th, valid: !(best.viol.elbow || best.viol.upper || best.viol.fore), viol: best.viol, score: best.sc };
}

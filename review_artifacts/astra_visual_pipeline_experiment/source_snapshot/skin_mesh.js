// ═══ anim3d/skin_mesh.js — procedural SKINNED humanoid test character, lofted from the skeleton's bind pose ═══
// A representative production-style test body (not final art): elliptical cross-section tubes along every limb chain, the torso,
// the neck and the head, with linear-blend skin weights that straddle each joint (two bones per joint ring, single bone in the
// middle of a segment). Built in the character frame at the bind pose, so it retargets to ANY skelBuild(H, prop) — the skeleton
// is the single source of proportions. Material groups (parts) are per vertex: skin / hair / shirt / shorts / socks / boots / gloves.
const SKIN_PARTS = ["skin", "hair", "shirt", "shorts", "socks", "boots", "gloves"];
const SKIN_STYLE = { segments: 14 };
function skinBuildMesh(skel) {
  const fk = skelFK(skel, {}, M4.ident()), B = skel.byName, s = (skel.H / 1.88) * (skel.prop ? skel.prop.width : 1), N = SKIN_STYLE.segments;
  const PI = {}; SKIN_PARTS.forEach((n, i) => PI[n] = i);
  const pos = [], part = [], bid = [], bi = [], bw = [], idx = [];
  const J = (b) => fk.joint[b.idx], D = (b) => V3.norm(V3.sub(fk.tip[b.idx], fk.joint[b.idx]));
  const at = (b, t, off) => { const c = V3.add(J(b), V3.scale(D(b), t * b.len)); return off ? V3.add(c, off) : c; };
  // ring: centre c, axis a, radii (ru sideways, rv fore/aft) in metres @ H 1.88, part name, weights [[bone, w], …] (≤ 4)
  const ring = (c, a, ru, rv, pt, ws) => {
    const u0 = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1], v = V3.norm(V3.cross(u0, a)), u = V3.norm(V3.cross(a, v));
    const base = pos.length / 3, tot = ws.reduce((q, x) => q + x[1], 0), dom = ws.reduce((m, x) => x[1] > m[1] ? x : m, ws[0]);
    for (let i = 0; i <= N; i++) { const t = i / N * Math.PI * 2, cu = Math.cos(t), sv = Math.sin(t);
      pos.push(c[0] + (u[0] * cu * ru + v[0] * sv * rv) * s, c[1] + (u[1] * cu * ru + v[1] * sv * rv) * s, c[2] + (u[2] * cu * ru + v[2] * sv * rv) * s);
      part.push(PI[pt]); bid.push(dom[0].idx + 1);
      for (let k = 0; k < 4; k++) { const w = ws[k]; bi.push(w ? w[0].idx : 0); bw.push(w ? w[1] / tot : 0); } }
    return base;
  };
  // loft consecutive ring DEFINITIONS; where the material changes, the previous ring is duplicated with the new part so the seam is a
  // clean line (flat parts take the provoking vertex — a shared ring would give a sawtooth)
  const loft = (defs) => {
    const rings = []; let prev = null;
    for (const d of defs) { if (prev && prev[4] !== d[4]) rings.push(ring(prev[0], prev[1], prev[2], prev[3], d[4], prev[5])); rings.push(ring(...d)); prev = d; }
    for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < N; i++) { const a = rings[r] + i, b = rings[r + 1] + i; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  };
  const R = (c, a, ru, rv, pt, ws) => [c, a, ru, rv, pt, ws];
  const W = (...pairs) => pairs;                                                                       // [[bone, weight], …]
  // ── legs: hip → knee → ankle (shorts to mid-thigh, skin at the knee, socks, boots with a heel and a toe) ──
  for (const sd of ["R", "L"]) {
    const th = B["thigh_" + sd], sh = B["shin_" + sd], ft = B["foot_" + sd], toe = B["toe_" + sd], pel = B.pelvis, dT = D(th), dS = D(sh), dF = D(ft), dO = D(toe);
    loft([
      R(at(th, -0.02), dT, 0.001, 0.001, "shorts", W([th, 0.5], [pel, 0.5])),
      R(at(th, 0.0), dT, 0.088, 0.094, "shorts", W([th, 0.5], [pel, 0.5])),
      R(at(th, 0.2), dT, 0.084, 0.090, "shorts", W([th, 0.9], [pel, 0.1])),
      R(at(th, 0.5), dT, 0.076, 0.080, "shorts", W([th, 1])),
      R(at(th, 0.62), dT, 0.070, 0.074, "skin", W([th, 1])),
      R(at(th, 0.85), dT, 0.060, 0.064, "skin", W([th, 1])),
      R(at(th, 1.0), V3.norm(V3.add(dT, dS)), 0.056, 0.060, "skin", W([th, 0.5], [sh, 0.5])),
      R(at(sh, 0.12), dS, 0.056, 0.060, "socks", W([sh, 1])),
      R(at(sh, 0.35), dS, 0.060, 0.066, "socks", W([sh, 1])),
      R(at(sh, 0.7), dS, 0.048, 0.050, "socks", W([sh, 1])),
      R(at(sh, 1.0), dS, 0.040, 0.042, "socks", W([sh, 0.5], [ft, 0.5])),
      R(at(sh, 1.06), dS, 0.001, 0.001, "socks", W([sh, 0.5], [ft, 0.5])),
    ]);
    loft([                                                                                              // boot: heel behind the ankle → toe
      R(at(ft, -0.45), dF, 0.001, 0.001, "boots", W([ft, 1])),
      R(at(ft, -0.35), dF, 0.036, 0.032, "boots", W([ft, 1])),
      R(at(ft, 0.0), dF, 0.044, 0.040, "boots", W([ft, 0.85], [sh, 0.15])),
      R(at(ft, 0.55), dF, 0.050, 0.036, "boots", W([ft, 1])),
      R(at(ft, 1.0), V3.norm(V3.add(dF, dO)), 0.046, 0.031, "boots", W([ft, 0.6], [toe, 0.4])),
      R(at(toe, 0.75), dO, 0.038, 0.024, "boots", W([toe, 1])),
      R(at(toe, 1.15), dO, 0.001, 0.001, "boots", W([toe, 1])),
    ]);
  }
  // ── arms: shoulder → elbow → wrist (long sleeve to the wrist) → glove ──
  for (const sd of ["R", "L"]) {
    const ua = B["upperArm_" + sd], fa = B["foreArm_" + sd], hd = B["hand_" + sd], ch = B.chest, dU = D(ua), dA = D(fa), dH = D(hd);
    loft([
      R(at(ua, -0.22), dU, 0.001, 0.001, "shirt", W([ua, 0.5], [ch, 0.5])),
      R(at(ua, -0.12), dU, 0.060, 0.062, "shirt", W([ua, 0.5], [ch, 0.5])),
      R(at(ua, 0.15), dU, 0.052, 0.055, "shirt", W([ua, 0.85], [ch, 0.15])),
      R(at(ua, 0.5), dU, 0.046, 0.048, "shirt", W([ua, 1])),
      R(at(ua, 0.85), dU, 0.042, 0.044, "shirt", W([ua, 1])),
      R(at(ua, 1.0), V3.norm(V3.add(dU, dA)), 0.040, 0.043, "shirt", W([ua, 0.5], [fa, 0.5])),
      R(at(fa, 0.15), dA, 0.042, 0.044, "shirt", W([fa, 1])),
      R(at(fa, 0.5), dA, 0.040, 0.040, "shirt", W([fa, 1])),
      R(at(fa, 0.85), dA, 0.035, 0.036, "shirt", W([fa, 1])),
      R(at(fa, 1.0), dA, 0.034, 0.034, "gloves", W([fa, 0.5], [hd, 0.5])),
      R(at(hd, 0.2), dH, 0.046, 0.028, "gloves", W([hd, 1])),
      R(at(hd, 0.7), dH, 0.052, 0.028, "gloves", W([hd, 1])),
      R(at(hd, 1.15), dH, 0.042, 0.024, "gloves", W([hd, 1])),
      R(at(hd, 1.4), dH, 0.001, 0.001, "gloves", W([hd, 1])),
    ]);
  }
  // ── torso → neck → head (one loft; hair over the top-back rings) ──
  { const pel = B.pelvis, sp = B.spine, ch = B.chest, nk = B.neck, hd = B.head, up = [0, 1, 0], Y = (b, dy) => V3.add(J(b), [0, dy * skel.H / 1.88, 0]);
    loft([
      R(Y(pel, -0.14), up, 0.001, 0.001, "shorts", W([pel, 1])),
      R(Y(pel, -0.10), up, 0.120, 0.085, "shorts", W([pel, 1])),
      R(Y(pel, -0.03), up, 0.150, 0.100, "shorts", W([pel, 1])),
      R(Y(sp, 0.0), up, 0.145, 0.100, "shorts", W([pel, 0.6], [sp, 0.4])),
      R(Y(sp, 0.05), up, 0.140, 0.100, "shirt", W([sp, 0.8], [pel, 0.2])),
      R(Y(ch, 0.0), up, 0.150, 0.105, "shirt", W([sp, 0.5], [ch, 0.5])),
      R(Y(ch, 0.08), up, 0.170, 0.110, "shirt", W([ch, 1])),
      R(Y(ch, 0.14), up, 0.200, 0.112, "shirt", W([ch, 1])),
      R(Y(ch, 0.215), up, 0.205, 0.105, "shirt", W([ch, 1])),
      R(Y(ch, 0.255), up, 0.095, 0.082, "shirt", W([ch, 0.6], [nk, 0.4])),
      R(Y(nk, 0.03), up, 0.056, 0.058, "skin", W([nk, 1])),
      R(Y(hd, 0.0), up, 0.058, 0.062, "skin", W([nk, 0.5], [hd, 0.5])),
      R(Y(hd, 0.03), up, 0.070, 0.080, "skin", W([hd, 1])),
      R(Y(hd, 0.08), up, 0.082, 0.094, "skin", W([hd, 1])),
      R(Y(hd, 0.13), up, 0.084, 0.096, "skin", W([hd, 1])),
      R(Y(hd, 0.17), up, 0.080, 0.090, "hair", W([hd, 1])),
      R(Y(hd, 0.21), up, 0.058, 0.068, "hair", W([hd, 1])),
      R(Y(hd, 0.235), up, 0.001, 0.001, "hair", W([hd, 1])),
    ]);
  }
  // per-vertex normals from the faces (position-welded across the ring seam)
  const nv = pos.length / 3, nrm = new Float32Array(nv * 3), key = new Map(), rep = new Int32Array(nv);
  for (let i = 0; i < nv; i++) { const k = pos[i * 3].toFixed(4) + "," + pos[i * 3 + 1].toFixed(4) + "," + pos[i * 3 + 2].toFixed(4); if (!key.has(k)) key.set(k, i); rep[i] = key.get(k); }
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; const p0 = [pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2]], p1 = [pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]], p2 = [pos[c * 3], pos[c * 3 + 1], pos[c * 3 + 2]]; const n = V3.cross(V3.sub(p1, p0), V3.sub(p2, p0)); for (const v of [rep[a], rep[b], rep[c]]) { nrm[v * 3] += n[0]; nrm[v * 3 + 1] += n[1]; nrm[v * 3 + 2] += n[2]; } }
  for (let i = 0; i < nv; i++) { const r = rep[i]; const n = V3.norm([nrm[r * 3], nrm[r * 3 + 1], nrm[r * 3 + 2]]); nrm[i * 3] = n[0]; nrm[i * 3 + 1] = n[1]; nrm[i * 3 + 2] = n[2]; }
  return { pos: new Float32Array(pos), nrm, part: new Float32Array(part), bid: new Float32Array(bid), bi: new Float32Array(bi), bw: new Float32Array(bw), idx: new Uint16Array(idx), nVerts: nv, nTris: idx.length / 3 };
}

// D-1A (read-only investigation; user instruction 2026-10-09, sources/2026-10-09_user_instruction_d1a_investigation.md) — KINEMATIC part A + C.
// The exact D-1 runner body (spec/v2_pi1_runner.js, unchanged) posed from the RECORDED presentation trajectories (pi1/evidence/air, FULL and LOCO
// streams; nothing re-simulated, no physics) with the preregistered mapping (PI1_PREREGISTRATION.md §5: rig world rotation × bind correspondence
// → V2 body rotation, projected parent-first onto each joint's anatomical hard ROM, locked axes dropped; pelvis placed so the V2 hip-centre midpoint
// is at the rig thigh-origin midpoint). Poses are sampled at 240 Hz (4 per tick: per-body slerp / lerp between consecutive ticks).
// A: minimum separation (exact convex distance, GJK on the V2 collider support functions; overlap → V2 geometric penetration) for every allowed
//    self-collision pair, boot↔boot reported separately, with the relative velocity of the two closest points (finite differences at 240 Hz).
// C: the tackler's recorded primitives (pt_react capsules, linear between ticks = the simulation's own constant-velocity sub-steps) against the
//    posed D-1 colliders: first contact, struck body / piece, point, the foot's sole height / velocity, both feet's turf state at impact.
// usage (worktree root): node review_artifacts/physical_character_v2/pi1/scripts/d1a_kinematic.mjs <out.json>
import fs from "fs"; import zlib from "zlib"; import path from "path";
const W = process.cwd(), P = path.join(W, "sandbox/visual/physchar2/");
const { V, Q } = await import(P + "core/v2_math.js"); const { posedBodies } = await import(P + "spec/v2_pose.js");
const { anatomicalAngles, childRotation } = await import(P + "spec/v2_joints.js"); const { pi1RunnerSpec } = await import(P + "spec/v2_pi1_runner.js");
const { shapePenetration, bodyLowest } = await import(P + "sim/v2_geom.js");
const spec = pi1RunnerSpec(), B = spec.bodies, NB = B.length, bi = (n) => B.findIndex(b => b.name === n);
const AIR = path.join(W, "review_artifacts/physical_character_v2/pi1/evidence/air"), load = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(AIR, f))));
// ── quaternion / matrix helpers ──
const m2q = (m) => { const r = (i, j) => m[j * 4 + i]; const t = r(0, 0) + r(1, 1) + r(2, 2); let q;   // column-major 4×4 → [x, y, z, w]
  if (t > 0) { const s = Math.sqrt(t + 1) * 2; q = [(r(2, 1) - r(1, 2)) / s, (r(0, 2) - r(2, 0)) / s, (r(1, 0) - r(0, 1)) / s, 0.25 * s]; }
  else if (r(0, 0) > r(1, 1) && r(0, 0) > r(2, 2)) { const s = Math.sqrt(1 + r(0, 0) - r(1, 1) - r(2, 2)) * 2; q = [0.25 * s, (r(0, 1) + r(1, 0)) / s, (r(0, 2) + r(2, 0)) / s, (r(2, 1) - r(1, 2)) / s]; }
  else if (r(1, 1) > r(2, 2)) { const s = Math.sqrt(1 + r(1, 1) - r(0, 0) - r(2, 2)) * 2; q = [(r(0, 1) + r(1, 0)) / s, 0.25 * s, (r(1, 2) + r(2, 1)) / s, (r(0, 2) - r(2, 0)) / s]; }
  else { const s = Math.sqrt(1 + r(2, 2) - r(0, 0) - r(1, 1)) * 2; q = [(r(0, 2) + r(2, 0)) / s, (r(1, 2) + r(2, 1)) / s, 0.25 * s, (r(1, 0) - r(0, 1)) / s]; }
  return Q.norm(q); };
const m2p = (m) => [m[12], m[13], m[14]], qang = (a, b) => { const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]); return 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI; };
const slerp = (a, b, t) => { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], bb = b; if (d < 0) { d = -d; bb = b.map(x => -x); } if (d > 0.9995) return Q.norm(a.map((x, i) => x + t * (bb[i] - x)));
  const th = Math.acos(d), s = Math.sin(th); return a.map((x, i) => (Math.sin((1 - t) * th) * x + Math.sin(t * th) * bb[i]) / s); };
// ── §5 mapping ──
const MAP = { pelvis: "pelvis", spine: "abdomen", chest: "thorax", head: "head", upperArm_L: "upperArm_L", upperArm_R: "upperArm_R", foreArm_L: "forearm_L", foreArm_R: "forearm_R",
  thigh_L: "thigh_L", thigh_R: "thigh_R", shin_L: "shank_L", shin_R: "shank_R", foot_L: "foot_L", foot_R: "foot_R" };
const Z0 = posedBodies(spec, {}), hipL = spec.joints.find(j => j.name === "hip_L").at, hipR = spec.joints.find(j => j.name === "hip_R").at, hipMid0 = V.sc(V.add(hipL, hipR), 0.5);
function mapPose(bones, bind, world) {   // → { S: [{pos, rot}] per V2 body, residualDeg: {joint: deg}, clampDeg: {joint: deg} }
  const idx = Object.fromEntries(bones.map((b, i) => [b.name, i])), raw = new Array(NB);
  for (const [rb, vb] of Object.entries(MAP)) { const k = idx[rb], qr = m2q(world[k]), qb = m2q(bind[k]); raw[bi(vb)] = Q.norm(Q.mul(Q.mul(qr, Q.conj(qb)), Z0[bi(vb)].rot)); }
  const S = new Array(NB), res = {}, clamp = {}; S[0] = { rot: raw[0], pos: null };
  const hm = V.sc(V.add(m2p(world[idx.thigh_L]), m2p(world[idx.thigh_R])), 0.5); S[0].pos = V.sub(hm, Q.rot(raw[0], V.sub(hipMid0, B[0].origin)));
  for (const j of spec.joints) { const qp = S[j.parentIndex].rot, a = anatomicalAngles(j, qp, raw[j.childIndex]); let c = 0;
    for (const k of Object.keys(a)) { const h = j.def.rom[k] && j.def.rom[k].hard; if (h) { const v = Math.min(h[1], Math.max(h[0], a[k])); c = Math.max(c, Math.abs(v - a[k])); a[k] = v; } }
    const qc = childRotation(j, qp, a); res[j.name] = qang(qc, raw[j.childIndex]); clamp[j.name] = c;
    S[j.childIndex] = { rot: qc, pos: V.add(S[j.parentIndex].pos, Q.rot(qp, V.sub(B[j.childIndex].origin, B[j.parentIndex].origin))) }; }
  return { S, res, clamp }; }
// ── convex support functions (world) and GJK distance ──
const shapeXf = (s, st) => ({ p: V.add(st.pos, Q.rot(st.rot, s.pos)), q: Q.norm(Q.mul(st.rot, s.rot)) });
function supportOf(s, st) { const X = shapeXf(s, st), at = (l) => V.add(X.p, Q.rot(X.q, l)), nrm = (d) => { const l = V.len(d); return l > 1e-15 ? V.sc(d, 1 / l) : [1, 0, 0]; };
  if (s.type === "sphere") return (d) => V.add(X.p, V.sc(nrm(d), s.r));
  if (s.type === "capsule" || s.type === "tapered") { const a = at([0, s.half, 0]), b = at([0, -s.half, 0]), ra = s.type === "capsule" ? s.r : s.rTop, rb = s.type === "capsule" ? s.r : s.rBot;
    return (d) => { const n = nrm(d); return V.dot(a, n) + ra >= V.dot(b, n) + rb ? V.add(a, V.sc(n, ra)) : V.add(b, V.sc(n, rb)); }; }
  if (s.type === "box") { const he = s.he.map(h => h - s.cr); return (d) => { const n = nrm(d), l = Q.rot(Q.conj(X.q), n); return V.add(V.add(X.p, Q.rot(X.q, he.map((h, i) => (l[i] >= 0 ? h : -h)))), V.sc(n, s.cr)); }; }
  if (s.type === "hull") { const pts = s.points.map(at); return (d) => { let best = pts[0], bv = -Infinity; for (const p of pts) { const v = p[0] * d[0] + p[1] * d[1] + p[2] * d[2]; if (v > bv) { bv = v; best = p; } } return best; }; }
  throw new Error(s.type); }
// closest point of a simplex (≤ 4 Minkowski points) to the origin → { v, keep: [indices], lam: [weights] }
function closest(Wm) { const n = Wm.length, d = (a, b) => V.dot(a, b);
  if (n === 1) return { v: Wm[0], keep: [0], lam: [1] };
  if (n === 2) { const a = Wm[0], b = Wm[1], ab = V.sub(b, a), t = -d(a, ab) / Math.max(1e-30, d(ab, ab)); if (t <= 0) return { v: a, keep: [0], lam: [1] }; if (t >= 1) return { v: b, keep: [1], lam: [1] }; return { v: V.add(a, V.sc(ab, t)), keep: [0, 1], lam: [1 - t, t] }; }
  if (n === 3) { const [a, b, c] = Wm, ab = V.sub(b, a), ac = V.sub(c, a), ap = V.sc(a, -1), d1 = d(ab, ap), d2 = d(ac, ap);   // Ericson 5.1.5 with p = origin
    if (d1 <= 0 && d2 <= 0) return { v: a, keep: [0], lam: [1] };
    const bp = V.sc(b, -1), d3 = d(ab, bp), d4 = d(ac, bp); if (d3 >= 0 && d4 <= d3) return { v: b, keep: [1], lam: [1] };
    const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const t = d1 / (d1 - d3); return { v: V.add(a, V.sc(ab, t)), keep: [0, 1], lam: [1 - t, t] }; }
    const cp = V.sc(c, -1), d5 = d(ab, cp), d6 = d(ac, cp); if (d6 >= 0 && d5 <= d6) return { v: c, keep: [2], lam: [1] };
    const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const t = d2 / (d2 - d6); return { v: V.add(a, V.sc(ac, t)), keep: [0, 2], lam: [1 - t, t] }; }
    const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const t = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return { v: V.add(b, V.sc(V.sub(c, b), t)), keep: [1, 2], lam: [1 - t, t] }; }
    const den = 1 / (va + vb + vc), v_ = vb * den, w_ = vc * den; return { v: V.add(a, V.add(V.sc(ab, v_), V.sc(ac, w_))), keep: [0, 1, 2], lam: [1 - v_ - w_, v_, w_] }; }
  // tetrahedron: origin inside → intersection; else the best face the origin is outside of
  const F = [[0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 3, 1], [1, 2, 3, 0]]; let best = null, inside = true;
  for (const [i, j, k, o] of F) { const nrm = V.cross(V.sub(Wm[j], Wm[i]), V.sub(Wm[k], Wm[i])), sO = V.dot(nrm, V.sc(Wm[i], -1)), sP = V.dot(nrm, V.sub(Wm[o], Wm[i]));
    if (sO * sP < 0) { inside = false; const r = closest([Wm[i], Wm[j], Wm[k]]), dd = V.dot(r.v, r.v); if (!best || dd < best.dd) best = { v: r.v, keep: r.keep.map(x => [i, j, k][x]), lam: r.lam, dd }; } }
  if (inside) return { v: [0, 0, 0], keep: [0, 1, 2, 3], lam: null, inside: true }; return best; }
function gjk(sa, sb) {   // → { d (≥ 0), pA, pB } or { d: 0, overlap: true }
  let dir = V.sub(sa([1, 0, 0]), sb([-1, 0, 0])); if (V.len(dir) < 1e-12) dir = [1, 0, 0];
  let A = [], Bv = [], Wm = [], v = dir, last = null;
  for (let it = 0; it < 96; it++) { const a = sa(V.sc(v, -1)), b = sb(v), w = V.sub(a, b), vv = V.dot(v, v);
    if (Wm.length && vv - V.dot(v, w) <= 1e-12 * Math.max(1e-6, vv)) break;
    A.push(a); Bv.push(b); Wm.push(w); const r = closest(Wm); if (r.inside) return { d: 0, overlap: true };
    A = r.keep.map(i => A[i]); Bv = r.keep.map(i => Bv[i]); Wm = r.keep.map(i => Wm[i]); last = r; v = r.v; if (V.dot(v, v) < 1e-18) return { d: 0, overlap: true }; }
  const lam = last.lam, pA = A.reduce((s, a, i) => V.add(s, V.sc(a, lam[i])), [0, 0, 0]), pB = Bv.reduce((s, b, i) => V.add(s, V.sc(b, lam[i])), [0, 0, 0]);
  return { d: V.len(V.sub(pA, pB)), pA, pB }; }
// bounding sphere of a shape (world) for culling
function bsphere(s, st) { const X = shapeXf(s, st); if (s.type === "sphere") return [X.p, s.r]; if (s.type === "capsule") return [X.p, s.half + s.r]; if (s.type === "tapered") return [X.p, s.half + Math.max(s.rTop, s.rBot)];
  if (s.type === "box") return [X.p, V.len(s.he)]; const c = s.points.reduce((a, p) => V.add(a, p), [0, 0, 0]).map(x => x / s.points.length), r = Math.max(...s.points.map(p => V.dist(p, c))); return [V.add(X.p, Q.rot(X.q, c)), r]; }
// minimum separation of bodies i, j (negative = penetration) with witness points
function bodySep(i, j, S) { let best = { d: Infinity }; const si = B[i].shapes, sj = B[j].shapes;
  for (let a = 0; a < si.length; a++) { const [ca, ra] = bsphere(si[a], S[i]); for (let b = 0; b < sj.length; b++) { const [cb, rb] = bsphere(sj[b], S[j]); if (V.dist(ca, cb) - ra - rb > best.d) continue;
    const swept = (x) => x.type === "sphere" || x.type === "capsule" || x.type === "tapered";
    const g = gjk(supportOf(si[a], S[i]), supportOf(sj[b], S[j])); let d = g.d, pA = g.pA, pB = g.pB;
    if (swept(si[a]) && swept(sj[b])) { d = -shapePenetration(si[a], S[i], sj[b], S[j]); if (!pA) { pA = bsphere(si[a], S[i])[0]; pB = bsphere(sj[b], S[j])[0]; } }   // exact signed distance for swept-sphere pairs (V2 geometry); witness = GJK's, or the shape centres if overlapping
    else if (g.overlap) { d = -Math.max(0, shapePenetration(si[a], S[i], sj[b], S[j])); pA = bsphere(si[a], S[i])[0]; pB = bsphere(sj[b], S[j])[0]; }
    if (d < best.d) best = { d, pA, pB, sa: a, sb: b }; } }
  return best; }
const disabled = new Set(spec.disabledPairs.map(([a, b]) => Math.min(a, b) + "-" + Math.max(a, b))), PAIRS = [];
for (let i = 0; i < NB; i++) for (let j = i + 1; j < NB; j++) if (!disabled.has(i + "-" + j)) PAIRS.push([i, j]);
const FL = bi("foot_L"), FR = bi("foot_R");
const pointVel = (S0, S1, i, p, dt) => {   // velocity of the material point p of body i (at state S1), backward difference
  const v0 = V.sc(V.sub(S1[i].pos, S0[i].pos), 1 / dt), dq = Q.mul(S1[i].rot, Q.conj(S0[i].rot)), s = dq[3] < 0 ? -1 : 1, w = V.sc([dq[0] * s, dq[1] * s, dq[2] * s], 2 / dt);
  return V.add(v0, V.cross(w, V.sub(p, S1[i].pos))); };
// ── per case ──
const CASES = ["rx_miss", "rx_free_leg", "rx_planted_leg"], out = { body: "spec/v2_pi1_runner.js (D-1, unchanged)", mapping: "PI1_PREREGISTRATION.md §5", sampleHz: 240, cases: {} };
for (const cs of CASES) for (const stream of ["FULL", "LOCO"]) {
  const R = load(`${cs}_${stream}.json.gz`), N = R.pres.length, ev = R.events.find(e => e.kind === "PLAYER_CONTACT") || null;
  const predTick = R.pred.findIndex(x => x != null && x <= 0.25), cTick = ev ? ev.tick : null, react = ev ? R.react[ev.tick] : null;
  const recEnd = ev && ev.react === "CORRECTION" ? Math.min(N - 1, Math.ceil(ev.until * 60)) : null, upTick = react && react.kind === "FALL" ? Math.min(N - 1, Math.ceil(react.tUp * 60)) : null;
  const maps = R.pres.map(p => mapPose(R.bones, R.bind, p.world));
  const windows = cs === "rx_miss" ? { promotion: [predTick, predTick + 36] } : { promotion: [predTick, cTick - 1], contact: [cTick - 1, cTick + 1], ...(recEnd ? { recovery: [cTick + 1, recEnd] } : {}), ...(upTick ? { fall: [cTick + 1, upTick] } : {}) };
  const res = { stream, predTick, contactTick: cTick, react: ev ? ev.react : null, windows, perWindow: {}, projection: {}, feet: [], contactC: null };
  // projection residuals over the analysed span
  const span = [predTick, Math.min(N - 1, (upTick || recEnd || predTick + 36))];
  for (const j of spec.joints) { let mr = 0, mc = 0; for (let k = span[0]; k <= span[1]; k++) { mr = Math.max(mr, maps[k].res[j.name]); mc = Math.max(mc, maps[k].clamp[j.name]); } res.projection[j.name] = { maxResidualDeg: +mr.toFixed(3), maxClampDeg: +mc.toFixed(3) }; }
  const dt = 1 / 240; let prevS = null;
  const W = Object.fromEntries(Object.keys(windows).map(k => [k, { boot: { d: Infinity }, any: { d: Infinity } }]));
  const prim = (k, frac, which) => { const a = R.prims[k - 1], b = R.prims[k]; if (!a || !b || !a.length || !b.length) return null; const pa = a.find(x => x.prim === which), pb = b.find(x => x.prim === which); if (!pa || !pb) return null;
    const L = (u, w) => [u[0] + (w[0] - u[0]) * frac, u[1] + (w[1] - u[1]) * frac, u[2] + (w[2] - u[2]) * frac]; const A2 = L(pa.a, pb.a), B2 = L(pa.b, pb.b);
    return { a: [A2[0], A2[2], -A2[1]], b: [B2[0], B2[2], -B2[1]], r: pb.r }; };   // sim (x, y, height) → render (x, height, −y)
  let firstC = null; const sepSeries = [];
  for (let k = Math.max(1, span[0] - 2); k <= span[1]; k++) for (let n = 1; n <= 4; n++) {
    const t = n / 4, S = maps[k].S.map((s, i) => ({ rot: slerp(maps[k - 1].S[i].rot, s.rot, t), pos: V.lerp(maps[k - 1].S[i].pos, s.pos, t) }));
    const inW = Object.entries(windows).filter(([, w]) => k >= w[0] && k <= w[1]).map(([nm]) => nm);
    if (inW.length && prevS) { for (const [i, j] of PAIRS) { const s = bodySep(i, j, S); if (!isFinite(s.d)) continue; const vr = V.sub(pointVel(prevS, S, i, s.pA, dt), pointVel(prevS, S, j, s.pB, dt)), nv = s.d > 1e-9 ? V.sc(V.sub(s.pB, s.pA), 1 / Math.max(1e-9, V.dist(s.pA, s.pB))) : null;
        const rec = { d: s.d, pair: B[i].name + "↔" + B[j].name, tick: k, sub: n, relSpeed: V.len(vr), approach: nv ? V.dot(vr, nv) : null, pieces: [s.sa, s.sb] };
        for (const nm of inW) { if (s.d < W[nm].any.d) W[nm].any = rec; if (i === FL && j === FR && s.d < W[nm].boot.d) W[nm].boot = rec; } } }
    // C: tackler primitives vs the posed D-1 colliders (contact cases and the miss)
    const prs = ["LEG", "BODY"].map(w => prim(k, t, w)).filter(Boolean); let mC = { d: Infinity };
    for (const pr of prs) { const sp = (d) => { const L2 = V.len(d) > 1e-15 ? V.sc(d, 1 / V.len(d)) : [1, 0, 0]; return V.dot(pr.a, L2) >= V.dot(pr.b, L2) ? V.add(pr.a, V.sc(L2, pr.r)) : V.add(pr.b, V.sc(L2, pr.r)); };
      for (let i = 0; i < NB; i++) for (let a = 0; a < B[i].shapes.length; a++) { const g = gjk(sp, supportOf(B[i].shapes[a], S[i])); let d = g.d; if (g.overlap) { d = -Math.max(0, shapePenetration({ type: "capsule", pos: [0, 0, 0], rot: [0, 0, 0, 1], half: V.dist(pr.a, pr.b) / 2, r: pr.r }, { pos: V.sc(V.add(pr.a, pr.b), 0.5), rot: (() => { const ax = V.norm(V.sub(pr.a, pr.b)), c = ax[1], cr = V.cross([0, 1, 0], ax), s2 = V.len(cr); return s2 < 1e-9 ? [0, 0, 0, 1] : Q.axis(V.sc(cr, 1 / s2), Math.atan2(s2, c)); })() }, B[i].shapes[a], S[i])); }
        if (d < mC.d) mC = { d, prim: pr === prs[0] ? "LEG" : "BODY", body: B[i].name, piece: a, pA: g.pA || null, pB: g.pB || null }; } }
    if (isFinite(mC.d)) { sepSeries.push({ tick: k, sub: n, d: +mC.d.toFixed(4), body: mC.body, prim: mC.prim }); if (!firstC && mC.d <= 0) { firstC = { tick: k, sub: n, ...mC, d: +mC.d.toFixed(4) };
      const fs_ = ["foot_L", "foot_R"].map(f => { const i = bi(f), lo = bodyLowest(B[i], S[i]), v = prevS ? V.sc(V.sub(S[i].pos, prevS[i].pos), 1 / dt) : null; return { foot: f, soleLowestY: +lo.y.toFixed(4), ankleV: v ? v.map(x => +x.toFixed(3)) : null }; });
      firstC.feet = fs_; firstC.presentationFeet = R.pres[k].feet; } }
    // feet (D-1 body) per sample around contact for B / C
    if (k >= (cTick || predTick) - 6 && k <= (cTick || predTick) + 6 && n === 4) res.feet.push({ tick: k, feet: ["foot_L", "foot_R"].map(f => { const i = bi(f); return { foot: f, soleLowestY: +bodyLowest(B[i], S[i]).y.toFixed(4), anklePos: S[i].pos.map(x => +x.toFixed(4)), ankleV: prevS ? V.sc(V.sub(S[i].pos, prevS[i].pos), 1 / dt).map(x => +x.toFixed(3)) : null }; }), presentation: R.pres[k].feet });
    prevS = S; }
  for (const [nm, w] of Object.entries(W)) res.perWindow[nm] = { bootToBoot: { minSepMm: +(w.boot.d * 1000).toFixed(2), tick: w.boot.tick, sub: w.boot.sub, relSpeedMs: w.boot.relSpeed != null ? +w.boot.relSpeed.toFixed(3) : null, approachMs: w.boot.approach != null ? +w.boot.approach.toFixed(3) : null },
    anyAllowedPair: { minSepMm: +(w.any.d * 1000).toFixed(2), pair: w.any.pair, tick: w.any.tick, sub: w.any.sub, relSpeedMs: w.any.relSpeed != null ? +w.any.relSpeed.toFixed(3) : null, approachMs: w.any.approach != null ? +w.any.approach.toFixed(3) : null } };
  res.contactC = firstC; res.tacklerSepSeries = sepSeries.filter(x => x.tick >= (cTick || predTick) - 4 && x.tick <= (cTick || predTick) + 4);
  res.minTacklerSepM = sepSeries.length ? Math.min(...sepSeries.map(x => x.d)) : null;
  (out.cases[cs] || (out.cases[cs] = {}))[stream] = res;
  console.log(cs, stream, "pred", predTick, "contact", cTick, JSON.stringify(res.perWindow), "C first", firstC ? `${firstC.tick}.${firstC.sub} ${firstC.prim}→${firstC.body} pen ${firstC.d}` : "none", "minTacklerSep", res.minTacklerSepM);
}
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));

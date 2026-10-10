// V2 UPPER-BODY MAPPING / ANATOMY ALTERNATIVES — READ-ONLY measurement (source 2026-10-10_user_instruction_v2_upper_body_mapping_anatomy.md).
// The frozen Locomotion V2 runner (git archive of tag locomotion-v2-straight-baseline-1 = 4a226b1f, LV2_ARCHIVE; LV2_STATE.queryAt only) is mapped
// onto V2 by several alternatives; every alternative is evaluated against ONE reference: the rig's own material carried with V2's masses
// (each V2 body's bind COM / orientation attached to the rig bone that carries it; twists from LV2's exported joint velocities — no differencing).
// Nothing is stepped; the frozen V2 spec file is NOT modified (body-spec alternatives are in-memory hinge relocations, evaluated kinematically).
// Alternatives (lower body = pelvis + legs ALWAYS the frozen PI-1 mapping, untouched, so its exactness is a check, not an assumption):
//   A0  frozen PI-1 mapping (copy bone rotations; R-K legs; RF-1 feet)            — the R2 baseline
//   A1  existing anatomy, upper body FITTED to the rig's joint points (shoulder / elbow / wrist + head / trunk orientation), within V2's hard ROM
//   A2  existing anatomy, upper body FITTED in the kinetic-energy metric (mass-weighted COM + inertia-weighted orientation), within V2's hard ROM
//   B1  copy mapping, V2 lumbar / thoracic / neck HINGES moved to the rig's spine / chest / neck joints (mass, COM, inertia left in place)
//   B2  copy mapping, V2 elbow HINGE moved to the rig's elbow (+11.6 mm upper arm)
//   B12 copy mapping, B1 + B2
//   C   copy mapping, B12 + a kinematic CLAVICLE link (thorax → clavicle → shoulder at the rig's joints) — the articulation ceiling
//   D   A2 with B2 (KE fit on the anatomy with the rig's elbow)
// Velocities per alternative: (m) derivative of the alternative's own mapping (central ±0.1 ms); (k) V-d KKT projection of the reference twists onto the
// alternative's pose in the KE metric, pelvis and leg joint rates FIXED to the frozen mapping; (kPL) the same with total P and L about the COM
// preserved exactly (= the reference's).
// usage (cwd = physical-character-v2 worktree root): LV2_ARCHIVE=<dir> V13_WT=<dir> node .../v2_upper_alt_probe.mjs [--n 240] [--speeds 3.0,5.5,7.8,9.5] [--alts A0,...] [--json out]
import fs from "fs"; import vm from "vm"; import path from "path"; import { createRequire } from "module";
const require = createRequire(import.meta.url);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const ARCH = process.env.LV2_ARCHIVE; if (!ARCH) throw new Error("LV2_ARCHIVE required");
const { loadRun1 } = require(path.join(ARCH, "sandbox/visual/run1/tools/run1_load.cjs"));
const X = loadRun1({ extra: ["run1/lv2_state.js"] }), LV = vm.runInContext("LV2_STATE", X.ctx), E = X.RUN1_V13;
const M = await import(new URL("../../../../pi1/rev1/scripts/pcg_rev1.mjs", import.meta.url).href);
const { L, TOL, makeMapper, geomRowsRev1, rigGeom, anchorOf } = M;
const { V, Q, B, NB, bi, rawRotations, Z0, m2p, spec, SELF_PAIRS, bodySep } = L;
const J = await import(path.resolve("sandbox/visual/physchar2/spec/v2_joints.js")), { anatomicalAngles, childRotation } = J;
const HD = 0.3, DL = 1e-4, N = +arg("n", 240), SPEEDS = arg("speeds", "3.0,5.5,7.8,9.5").split(",").map(Number), PR2 = 0.180;
const ALTS = arg("alts", "A0,A1,A2,B1,B2,B12,C,D,D12,D12n,D12t,D12l,D1z,D1y").split(","), Mt = B.reduce((s, b) => s + b.mass, 0), E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const r4 = (x) => (x == null || !Number.isFinite(x) ? x : +x.toFixed(4)), D2R = Math.PI / 180;
const UPPER = ["abdomen", "thorax", "head", "upperArm_L", "forearm_L", "upperArm_R", "forearm_R"].map(bi), LOWER = [0, ...["thigh_L", "shank_L", "foot_L", "thigh_R", "shank_R", "foot_R"].map(bi)];
const UPJ = spec.joints.map((j, k) => k).filter(k => UPPER.includes(spec.joints[k].childIndex)), LOJ = spec.joints.map((j, k) => k).filter(k => !UPJ.includes(k));
// ── LV2 source, frozen mapping helpers (as lv2_handoff_probe.mjs) ──
const own = () => { const s = Object.assign({}, X.charSkel("vinicius")); delete s._r1body; return s; };
const SK = own(), bindW = X.skelFK(SK, {}, X.M4.ident()).world.map(m => Array.from(m)), BIDX = Object.fromEntries(SK.bones.map((b, i) => [b.name, i]));
const prof = (v) => ({ v, vOf: () => v, simAt: (t) => ({ x: 70 + v * t * Math.cos(HD), y: 30 + v * t * Math.sin(HD), heading: HD, v }) });
const mat = (j) => { const R = j.world.rotation, P = j.world.position; return [R[0], R[3], R[6], 0, R[1], R[4], R[7], 0, R[2], R[5], R[8], 0, P[0], P[1], P[2], 1]; };
const frameOf = (q) => ({ world: q.joints.map(mat), feet: ["L", "R"].map(sd => ({ contact: !!q.legs[sd].stance, mode: q.legs[sd].contact.pivot || "swing" })) });
const recOf = (qs) => ({ bones: qs[0].joints.map(j => ({ name: j.name, parent: j.parent })), bind: bindW, pres: qs.map(frameOf) });
const m3q = (R) => { const m = [R[0], R[3], R[6], 0, R[1], R[4], R[7], 0, R[2], R[5], R[8], 0, 0, 0, 0, 1]; return L.m2q(m); };
const mat3 = (q) => { const [x, y, z, w] = q; return [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]; };
const Iworld = (q, I) => { const R = mat3(q), RI = R.map(row => [0, 1, 2].map(j => row[0] * I[0][j] + row[1] * I[1][j] + row[2] * I[2][j])); return RI.map(row => [0, 1, 2].map(j => row[0] * R[j][0] + row[1] * R[j][1] + row[2] * R[j][2])); };
const mv = (A, x) => A.map(row => row.reduce((s, a, k) => s + a * x[k], 0));
const rotvec = (q) => { const s = q[3] < 0 ? -1 : 1, v = [q[0] * s, q[1] * s, q[2] * s], n = Math.hypot(...v); if (n < 1e-15) return [2 * v[0], 2 * v[1], 2 * v[2]]; return V.sc(v, 2 * Math.atan2(n, q[3] * s) / n); };
const angv = (q0, q1, h) => V.sc(rotvec(Q.norm(Q.mul(q1, Q.conj(q0)))), 1 / h);
// ── models: the body hinge points (canonical T-pose frame) per alternative; mass / COM / inertia / shapes ALWAYS the frozen ones at their bind place ──
const ORIG = B.map(b => b.origin.slice());
const rigBindP = (n) => m2p(bindW[BIDX[n]]);   // rig bind = V2 canonical frame for the trunk (hip midpoints coincide at (0, 0.922, 0); verified: gap 0.0 mm)
const modelOf = (alt) => { const o = ORIG.map(p => p.slice()), clav = alt === "C";
  if (["B1", "B12", "C", "D12"].includes(alt)) { o[bi("abdomen")] = rigBindP("spine"); o[bi("thorax")] = rigBindP("chest"); o[bi("head")] = rigBindP("neck"); }
  // partial trunk relocations (with the elbow and the KE fit): D1z = AP only (z → the rig's), heights kept; D1y = heights only, V2's AP kept
  if (alt === "D12t") o[bi("thorax")] = rigBindP("chest");   // thoracic hinge only
  if (alt === "D12l") o[bi("abdomen")] = rigBindP("spine");   // lumbar hinge only
  if (alt === "D12n") { o[bi("abdomen")] = rigBindP("spine"); o[bi("thorax")] = rigBindP("chest"); }   // D12 without the neck hinge move
  if (alt === "D1z") for (const [b, r] of [["abdomen", "spine"], ["thorax", "chest"], ["head", "neck"]]) o[bi(b)] = [o[bi(b)][0], o[bi(b)][1], rigBindP(r)[2]];
  if (alt === "D1y") for (const [b, r] of [["abdomen", "spine"], ["thorax", "chest"], ["head", "neck"]]) o[bi(b)] = [o[bi(b)][0], rigBindP(r)[1], o[bi(b)][2]];
  if (["B2", "B12", "C", "D", "D12", "D1z", "D1y", "D12n", "D12t", "D12l"].includes(alt)) for (const sd of ["L", "R"]) { const g = sd === "L" ? -1 : 1, ua = V.dist(rigBindP("upperArm_" + sd), rigBindP("foreArm_" + sd)); o[bi("forearm_" + sd)] = [g * (Math.abs(ORIG[bi("upperArm_" + sd)][0]) + ua), ORIG[bi("upperArm_" + sd)][1], 0]; }
  return { alt, origins: o, clav, comLocal: B.map((b, i) => V.sub(V.add(ORIG[i], b.comLocal), o[i])) }; };
// a model state S' (body frames at the model's hinge) → the frozen body frames (for mass, colliders, carried points)
// body rotations S.rot map the CANONICAL (T-pose) body frame to world (posedBodies); origins, comLocal and inertia are canonical-frame quantities
const toOrig = (md, Sp) => Sp.map((s, i) => ({ pos: V.add(s.pos, Q.rot(s.rot, V.sub(ORIG[i], md.origins[i]))), rot: s.rot }));
// forward kinematics of a model from a fixed pelvis state, given world rotations of all bodies (parent-first): positions chained through the model hinges
function chain(md, rots, pelvis) { const S = new Array(NB); S[0] = { pos: pelvis.pos.slice(), rot: rots[0] };
  for (const j of spec.joints) { const p = j.parentIndex, c = j.childIndex; S[c] = { pos: V.add(S[p].pos, Q.rot(S[p].rot, V.sub(md.origins[c], md.origins[p]))), rot: rots[c] }; } return S; }
// ── the reference: rig material carried with V2's masses ──
const CARRIER = { pelvis: "pelvis", abdomen: "spine", thorax: "chest", head: "head", upperArm_L: "upperArm_L", forearm_L: "foreArm_L", upperArm_R: "upperArm_R", forearm_R: "foreArm_R", thigh_L: "thigh_L", shank_L: "shin_L", foot_L: "foot_L", thigh_R: "thigh_R", shank_R: "shin_R", foot_R: "foot_R" };
const comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal));   // frozen frames
const REFL = B.map((b, i) => V.sub(comW(Z0, i), rigBindP(CARRIER[b.name])));   // rig bind rotations are identity (checked below)
const bindRotDev = Math.max(...bindW.map(m => Math.max(Math.abs(m[0] - 1), Math.abs(m[5] - 1), Math.abs(m[10] - 1))));
function reference(q) { const byName = Object.fromEntries(q.joints.map(j => [j.name, j])), c = [], R = [], v = [], w = [];
  B.forEach((b, i) => { const j = byName[CARRIER[b.name]], qb = m3q(j.world.rotation), d = Q.rot(qb, REFL[i]); c.push(V.add(j.world.position, d)); R.push(Q.norm(Q.mul(qb, Z0[i].rot)));
    v.push(V.add(j.world.linearVelocity, V.cross(j.world.angularVelocity, d))); w.push(j.world.angularVelocity.slice()); });
  return { c, R, v, w }; }
const momentaOf = (cs, Rs, vs, ws) => { const cc = V.sc(cs.reduce((s, x, i) => V.add(s, V.sc(x, B[i].mass)), [0, 0, 0]), 1 / Mt); let P = [0, 0, 0], Lc = [0, 0, 0];
  for (let i = 0; i < NB; i++) { P = V.add(P, V.sc(vs[i], B[i].mass)); Lc = V.add(Lc, V.add(V.cross(V.sub(cs[i], cc), V.sc(vs[i], B[i].mass)), mv(Iworld(Rs[i], B[i].inertia), ws[i]))); } return { P, L: Lc }; };   // inertia: canonical body frame
// ── fit (A1 / A2 / D): upper-body anatomical angles, projected Gauss-Newton / LM inside the hard ROM ──
const upJoints = UPJ.map(k => spec.joints[k]), keysOf = (j) => Object.keys(anatomicalAngles(j, [0, 0, 0, 1], [0, 0, 0, 1]));
const PKEYS = upJoints.map(j => keysOf(j)), NP = PKEYS.reduce((s, k) => s + k.length, 0);
const hardOf = (j, key) => j.def.rom[key] && j.def.rom[key].hard;
const activeOf = (j, key) => j.def.rom[key] && j.def.rom[key].active;
function anglesFrom(S) { const th = []; upJoints.forEach((j, n) => { const a = anatomicalAngles(j, S[j.parentIndex].rot, S[j.childIndex].rot); for (const k of PKEYS[n]) th.push(a[k]); }); return th; }
function rotsFrom(th, S0) { const rots = S0.map(s => s.rot); let p = 0; for (const j of spec.joints) { const n = UPJ.indexOf(spec.joints.indexOf(j)); if (n < 0) continue; const a = {}; for (const k of PKEYS[n]) a[k] = th[p++]; rots[j.childIndex] = childRotation(j, rots[j.parentIndex], a); } return rots; }
function clampTh(th) { let p = 0; const o = th.slice(); upJoints.forEach((j, n) => { for (const k of PKEYS[n]) { const h = hardOf(j, k); if (h) o[p] = Math.min(h[1], Math.max(h[0], o[p])); p++; } }); return o; }
const chol3 = (A) => { const l00 = Math.sqrt(A[0][0]), l10 = A[1][0] / l00, l20 = A[2][0] / l00, l11 = Math.sqrt(A[1][1] - l10 * l10), l21 = (A[2][1] - l20 * l10) / l11, l22 = Math.sqrt(A[2][2] - l20 * l20 - l21 * l21); return [[l00, 0, 0], [l10, l11, 0], [l20, l21, l22]]; };
const CHOL = B.map(b => chol3(b.inertia));
function residual(md, th, S0, ref, mode, pts) { const S = chain(md, rotsFrom(th, S0), S0[0]), So = toOrig(md, S), r = [];
  if (mode === "KE") for (const i of UPPER) { const sm = Math.sqrt(B[i].mass); r.push(...V.sc(V.sub(comW(So, i), ref.c[i]), sm));
    const thW = rotvec(Q.norm(Q.mul(So[i].rot, Q.conj(ref.R[i])))), thB = Q.rot(Q.conj(So[i].rot), thW), Lt = CHOL[i]; r.push(Lt[0][0] * thB[0] + Lt[1][0] * thB[1] + Lt[2][0] * thB[2], Lt[1][1] * thB[1] + Lt[2][1] * thB[2], Lt[2][2] * thB[2]); }
  else { for (const pt of pts) r.push(...V.sub(carriedPt(So, pt), pt.target)); for (const [i, wgt] of [[bi("head"), 0.15], [bi("thorax"), 0.15], [bi("abdomen"), 0.15], [bi("upperArm_L"), 0.05], [bi("upperArm_R"), 0.05], [bi("forearm_L"), 0.05], [bi("forearm_R"), 0.05]]) r.push(...V.sc(rotvec(Q.norm(Q.mul(So[i].rot, Q.conj(ref.R[i])))), wgt)); }
  return r; }
function fit(md, S0, ref, mode, pts, th0) { let th = clampTh(th0 || anglesFrom(S0)), r = residual(md, th, S0, ref, mode, pts), f = r.reduce((s, x) => s + x * x, 0), lam = 1e-3, it = 0;
  for (; it < 60; it++) { const Jc = []; for (let p = 0; p < NP; p++) { const t2 = th.slice(); t2[p] += 1e-6; const r2 = residual(md, t2, S0, ref, mode, pts); Jc.push(r2.map((x, i) => (x - r[i]) / 1e-6)); }
    const JtJ = Array.from({ length: NP }, (_, a) => Array.from({ length: NP }, (_, b) => Jc[a].reduce((s, x, i) => s + x * Jc[b][i], 0))), Jtr = Jc.map(col => col.reduce((s, x, i) => s + x * r[i], 0));
    let improved = false; for (let tries = 0; tries < 8; tries++) { const A = JtJ.map((row, a) => row.map((x, b) => x + (a === b ? lam * (1 + JtJ[a][a]) : 0))), step = solveDense(A, Jtr.map(x => -x)), t2 = clampTh(th.map((x, p) => x + step[p])), r2 = residual(md, t2, S0, ref, mode, pts), f2 = r2.reduce((s, x) => s + x * x, 0);
      if (f2 < f) { th = t2; r = r2; const df = f - f2; f = f2; lam = Math.max(1e-9, lam / 4); improved = true; if (df < 1e-16 * Math.max(1, f)) it = 999; break; } lam *= 8; }
    if (!improved) break; }
  return { th, f, it }; }
function solveDense(A, b) { const n = b.length, Mx = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(Mx[r][c]) > Math.abs(Mx[p][c])) p = r; if (Math.abs(Mx[p][c]) < 1e-18) throw new Error("singular at " + c);
    if (p !== c) { const t = Mx[p]; Mx[p] = Mx[c]; Mx[c] = t; } for (let r = 0; r < n; r++) { if (r === c) continue; const f = Mx[r][c] / Mx[c][c]; if (f === 0) continue; for (let k = c; k <= n; k++) Mx[r][k] -= f * Mx[c][k]; } }
  return Mx.map((r, i) => r[n] / r[i]); }
// ── rig points carried rigidly by their V2 body from the bind (frozen frames; as lv2_handoff_probe.mjs) ──
const PT_CARRIER = { upperArm: "upperArm", foreArm: "forearm", hand: "forearm", clavicle: "thorax", thigh: "thigh", shin: "shank", foot: "foot", toe: "foot", spine: "abdomen", chest: "thorax", neck: "head", head: "head", hair: "head", pelvis: "pelvis" };
const ptDef = (bone, kind) => { const b = SK.byName[bone], base = bone.replace(/_[LR]$/, ""), sd = bone.match(/_([LR])$/), body = bi(PT_CARRIER[base] + (sd && PT_CARRIER[base] !== "thorax" && PT_CARRIER[base] !== "head" && PT_CARRIER[base] !== "abdomen" && PT_CARRIER[base] !== "pelvis" ? "_" + sd[1] : ""));
  const p = kind === "joint" ? rigBindP(bone) : V.add(rigBindP(bone), V.sc(b.dir, b.len)); return { bone, kind, body, l: Q.rot(Q.conj(Z0[body].rot), V.sub(p, Z0[body].pos)) }; };
const carriedPt = (So, pt) => V.add(So[pt.body].pos, Q.rot(So[pt.body].rot, pt.l));
const POINTS = { shoulder: ["upperArm_L", "upperArm_R"].map(b => ptDef(b, "joint")), elbowU: ["upperArm_L", "upperArm_R"].map(b => ptDef(b, "tip")), elbowF: ["foreArm_L", "foreArm_R"].map(b => ptDef(b, "joint")),
  wrist: ["hand_L", "hand_R"].map(b => ptDef(b, "joint")).concat(["foreArm_L", "foreArm_R"].map(b => ptDef(b, "tip"))), handTip: ["hand_L", "hand_R"].map(b => ptDef(b, "tip")),
  head: [ptDef("head", "joint"), ptDef("head", "tip")], trunk: [ptDef("spine", "joint"), ptDef("chest", "joint"), ptDef("chest", "tip")],
  hipKneeAnkle: ["thigh_L", "thigh_R", "shin_L", "shin_R", "foot_L", "foot_R"].map(b => ptDef(b, "joint")) };
const RET_MAP = { pelvis: 0, spine: bi("abdomen"), chest: bi("thorax"), head: bi("head"), ...Object.fromEntries(["L", "R"].flatMap(sd => [["upperArm_" + sd, bi("upperArm_" + sd)], ["foreArm_" + sd, bi("forearm_" + sd)], ["thigh_" + sd, bi("thigh_" + sd)], ["shin_" + sd, bi("shank_" + sd)], ["foot_" + sd, bi("foot_" + sd)]])) };
const lv2Pt = (q, pt) => { const j = q.joints.find(x => x.name === pt.bone); return pt.kind === "joint" ? { p: j.world.position, v: j.world.linearVelocity } : { p: j.world.tip, v: j.world.tipVelocity }; };
// ── KKT (V-d) on a model state: reference twists → joint-consistent twists; pelvis + leg joints fixed; optional P / L targets ──
function kktModel(md, Sp, refTw, fixedU, PL) {
  const nj = spec.joints.length, NU = 6 + 3 * nj, zeros = () => [0, 1, 2].map(() => new Array(NU).fill(0)), skew = (r) => [[0, -r[2], r[1]], [r[2], 0, -r[0]], [-r[1], r[0], 0]];
  const mm = (A, Bm) => A.map(row => Bm[0].map((_, j) => row.reduce((s, x, k) => s + x * Bm[k][j], 0))), madd = (A, Bm, s = 1) => A.map((row, i) => row.map((x, j) => x + s * Bm[i][j])), tr = (A) => A[0].map((_, j) => A.map(row => row[j]));
  const So = toOrig(md, Sp), c = So.map((_, i) => comW(So, i)), Av = [], Aw = []; Av[0] = zeros(); Aw[0] = zeros(); for (let k = 0; k < 3; k++) { Av[0][k][k] = 1; Aw[0][k][3 + k] = 1; }
  // u = [v_COM(pelvis) 3, ω_pelvis 3, ω_rel per joint 3]; joint positions = model hinges
  spec.joints.forEach((j, k) => { const p = j.parentIndex, ch = j.childIndex, jp = Sp[ch].pos; Aw[ch] = Aw[p].map(r => r.slice()); for (let a = 0; a < 3; a++) Aw[ch][a][6 + 3 * k + a] += 1;
    Av[ch] = madd(madd(Av[p], mm(skew(V.sub(jp, c[p])), Aw[p]), -1), mm(skew(V.sub(c[ch], jp)), Aw[ch]), -1); });
  const Iw = So.map((s, i) => Iworld(s.rot, B[i].inertia)); let Hm = Array.from({ length: NU }, () => new Array(NU).fill(0)); const g = new Array(NU).fill(0);
  for (let i = 0; i < NB; i++) { const m = B[i].mass, AvT = tr(Av[i]), AwT = tr(Aw[i]); Hm = madd(Hm, mm(AvT, Av[i]), m); Hm = madd(Hm, mm(AwT, mm(Iw[i], Aw[i])));
    const gv = mv(AvT, refTw.v[i]), gw = mv(AwT, mv(Iw[i], refTw.w[i])); for (let a = 0; a < NU; a++) g[a] += m * gv[a] + gw[a]; }
  const C = [], d = [];
  for (const [idx, val] of fixedU) { const r = new Array(NU).fill(0); r[idx] = 1; C.push(r); d.push(val); }
  spec.joints.forEach((j, k) => { if (LOJ.includes(k)) return; for (const key of j.locked) { const a = { x: 0, y: 1, z: 2 }[key], ax = Q.rot(Q.mul(Sp[j.childIndex].rot, j.F2), E3[a]), r = new Array(NU).fill(0); for (let q = 0; q < 3; q++) r[6 + 3 * k + q] = ax[q]; C.push(r); d.push(0); } });   // leg joints are fixed (their rates are the frozen mapping's)
  if (PL) { const cc = V.sc(c.reduce((s, x, i) => V.add(s, V.sc(x, B[i].mass)), [0, 0, 0]), 1 / Mt); for (let a = 0; a < 3; a++) { const r = new Array(NU).fill(0); for (let i = 0; i < NB; i++) for (let k = 0; k < NU; k++) r[k] += B[i].mass * Av[i][a][k]; C.push(r); d.push(PL.P[a]); }
    let Mr = zeros(); for (let i = 0; i < NB; i++) { Mr = madd(Mr, mm(skew(V.sub(c[i], cc)), Av[i]), B[i].mass); Mr = madd(Mr, mm(Iw[i], Aw[i])); } for (let a = 0; a < 3; a++) { C.push(Mr[a]); d.push(PL.L[a]); } }
  const nc = C.length, K = Array.from({ length: NU + nc }, () => new Array(NU + nc).fill(0)), rhs = new Array(NU + nc).fill(0);
  for (let a = 0; a < NU; a++) { for (let b = 0; b < NU; b++) K[a][b] = Hm[a][b]; rhs[a] = g[a]; } for (let r = 0; r < nc; r++) { for (let a = 0; a < NU; a++) { K[NU + r][a] = C[r][a]; K[a][NU + r] = C[r][a]; } rhs[NU + r] = d[r]; }
  const u = solveDense(K, rhs).slice(0, NU); return { v: Av.map(A => mv(A, u)), w: Aw.map(A => mv(A, u)), u };
}
// generalized coordinates of a (frozen-frame) twist field for the fixed lower body: pelvis v_COM / ω and leg joint relative rates
const fixedLower = (tw) => { const f = []; for (let a = 0; a < 3; a++) f.push([a, tw.v[0][a]]); for (let a = 0; a < 3; a++) f.push([3 + a, tw.w[0][a]]);
  for (const k of LOJ) { const j = spec.joints[k], wr = V.sub(tw.w[j.childIndex], tw.w[j.parentIndex]); for (let a = 0; a < 3; a++) f.push([6 + 3 * k + a, wr[a]]); } return f; };
// ROM margins (deg) of a pose: min over joints / axes of the distance to the hard limit (negative = beyond), and active-range exceedances
function romOf(md, Sp, clav) { let minHard = Infinity, who = null, actExc = 0, actWho = null; for (const j of spec.joints) { if (!UPPER.includes(j.childIndex)) continue; const pr = clav && /^shoulder_/.test(j.name) ? Q.norm(Q.mul(clav[j.side].Rth, clav[j.side].qLoc)) : Sp[j.parentIndex].rot, a = anatomicalAngles(j, pr, Sp[j.childIndex].rot);
    for (const k of Object.keys(a)) { const h = hardOf(j, k), ac = activeOf(j, k); if (h) { const m = Math.min(a[k] - h[0], h[1] - a[k]); if (m < minHard) { minHard = m; who = j.name + "." + k; } } if (ac) { const e = Math.max(0, ac[0] - a[k], a[k] - ac[1]); if (e > actExc) { actExc = e; actWho = j.name + "." + k; } } } }
  return { minHardDeg: minHard, minHardWho: who, activeExcDeg: actExc, activeExcWho: actWho }; }
// ── one alternative at one instant: pose + velocities + metrics ──
function evalAlt(alt, md, A0, R3, q, ref, refPrev) {
  const t0 = process.hrtime.bigint(); let Sp, extra = {};
  const A0S = A0.poses[1].S, pelvis = A0S[0];
  const copyRots = (P) => P.S.map(s => s.rot);
  const poseAt = (k, th0) => { const PA = A0.poses[k], refk = ref.at[k];
    if (alt === "A0") return { S: PA.S };
    if (["B1", "B2", "B12", "C"].includes(alt)) { let S = chain(md, copyRots(PA), PA.S[0]);
      if (alt === "C") { const byName = Object.fromEntries(A0.qs[k].joints.map(j => [j.name, j])), raw = rawRotations(R3.bones, R3.bind, R3.pres[k].world, {}).raw; extra.clavLocal = {};
        for (const sd of ["L", "R"]) {   // kinematic clavicle: thorax → clavicle (rig sternoclavicular joint) → shoulder (rig GH); clavicle LOCAL rotation from the rig
          const th = bi("thorax"), ua = bi("upperArm_" + sd), fa = bi("forearm_" + sd), sc = rigBindP("clavicle_" + sd), sh = rigBindP("upperArm_" + sd);
          const qLoc = Q.norm(Q.mul(Q.conj(m3q(byName.chest.world.rotation)), m3q(byName["clavicle_" + sd].world.rotation))), Rth = S[th].rot;   // thorax canonical frame = rig chest bind frame (identity bind rotations)
          const scW = V.add(S[th].pos, Q.rot(Rth, V.sub(sc, md.origins[th]))), shW = V.add(scW, Q.rot(Q.norm(Q.mul(Rth, qLoc)), V.sub(sh, sc)));
          S[ua] = { pos: shW, rot: raw[ua] }; S[fa] = { pos: V.add(shW, Q.rot(raw[ua], V.sub(md.origins[fa], md.origins[ua]))), rot: raw[fa] }; extra.clavLocal[sd] = { qLoc, Rth }; } }
      return { S, clav: extra.clavLocal }; }
    // fits (A1 / A2 / D) on the model, from the frozen pose
    const mode = alt === "A1" ? "PT" : "KE", pts = mode === "PT" ? [...POINTS.shoulder, ...POINTS.elbowF, ...POINTS.wrist.slice(0, 2)].map(pt => ({ ...pt, target: lv2Pt(A0.qs[k], pt).p })) : null;
    const S0 = chain(md, copyRots(PA), PA.S[0]), F = fit(md, S0, refk, mode, pts, th0); return { S: chain(md, rotsFrom(F.th, S0), PA.S[0]), th: F.th, f: F.f, it: F.it }; };
  const P1 = poseAt(1); Sp = P1.S; const tFit = Number(process.hrtime.bigint() - t0) / 1e6;
  const Pm = poseAt(0, P1.th), Pp = poseAt(2, P1.th);   // warm-started neighbours: the mapping derivative
  const So = toOrig(md, Sp), Som = toOrig(md, Pm.S), Sop = toOrig(md, Pp.S), twM = { v: So.map((_, i) => V.sc(V.sub(comW(Sop, i), comW(Som, i)), 1 / (2 * DL))), w: So.map((_, i) => angv(Som[i].rot, Sop[i].rot, 2 * DL)) };
  const A0tw = A0.twM, fixedU = fixedLower(A0tw), refTw = { v: ref.at[1].v, w: ref.at[1].w }, refMom = momentaOf(ref.at[1].c, ref.at[1].R, ref.at[1].v, ref.at[1].w);
  const tk0 = process.hrtime.bigint(), kk = alt === "C" ? null : kktModel(md, Sp, refTw, fixedU, null), tKkt = Number(process.hrtime.bigint() - tk0) / 1e6, kPL = alt === "C" ? null : kktModel(md, Sp, refTw, fixedU, refMom);
  const out = { tFitMs: r4(tFit), tKktMs: r4(tKkt), fit: P1.f != null ? { f: r4(P1.f), it: P1.it } : null, rom: (() => { const r = romOf(md, Sp, P1.clav); return { minHardDeg: r4(r.minHardDeg), minHardWho: r.minHardWho, activeExcDeg: r4(r.activeExcDeg), activeExcWho: r.activeExcWho }; })() };
  // pose errors at rig points (mm) and body COM / orientation errors vs the reference
  out.posMm = {}; for (const [g, pts] of Object.entries(POINTS)) out.posMm[g] = r4(Math.max(...pts.map(pt => V.dist(carriedPt(So, pt), lv2Pt(q, pt).p))) * 1000);
  out.bodyComMm = r4(Math.max(...UPPER.map(i => V.dist(comW(So, i), ref.at[1].c[i]))) * 1000); out.bodyRotDeg = r4(Math.max(...UPPER.map(i => V.len(rotvec(Q.norm(Q.mul(So[i].rot, Q.conj(ref.at[1].R[i]))))))) / D2R);
  // velocities: per-body (upper) COM / angular, per rig point, momentum — for each velocity field
  const fields = { m: twM }; if (kk) { fields.k = kk; fields.kPL = kPL; }
  out.vel = {}; for (const [fn, tw] of Object.entries(fields)) { const o = {};
    o.bodyV = r4(Math.max(...UPPER.map(i => V.dist(tw.v[i], refTw.v[i])))); o.bodyVWho = B[UPPER.reduce((a, i) => (V.dist(tw.v[i], refTw.v[i]) > V.dist(tw.v[a], refTw.v[a]) ? i : a), UPPER[0])].name;
    o.bodyW = r4(Math.max(...UPPER.map(i => V.dist(tw.w[i], refTw.w[i])))); o.lowerBodyV = r4(Math.max(...LOWER.map(i => Math.max(V.dist(tw.v[i], A0tw.v[i]), V.dist(tw.w[i], A0tw.w[i])))));
    o.pt = {}; for (const [g, pts] of Object.entries(POINTS)) o.pt[g] = r4(Math.max(...pts.map(pt => { const p = carriedPt(So, pt), vv = V.add(tw.v[pt.body], V.cross(tw.w[pt.body], V.sub(p, comW(So, pt.body)))); return V.dist(vv, lv2Pt(q, pt).v); })));
    // VISIBLE velocity under the skinning-absorption contract: each rig point keeps its τ0 offset from its carrying V2 body (held render offset, so the
    // visible position is continuous by construction); its velocity is then the carrying body's velocity at the point's own τ0 position
    // VISIBLE velocity under ROTATION RETARGET (the render drives the rig by forward kinematics with the rig's own bone lengths: mapped bones take
    // their V2 body's angular velocity, unmapped bones (neck, hair, clavicles, hands, toes) keep their τ0 LOCAL rotation — skinning-absorbed — so
    // they inherit the parent's); positions are continuous by construction; the velocity pop at each rig point is then pure angular-velocity error × lever
    // two render rules for the UNMAPPED bones: ret = their τ0 local rotation is HELD (local angular velocity 0 after τ0); ret2 = the render CONTINUES
    // their local motion at its τ0 local angular velocity and blends it out (velocity-continuous skinning absorption). Variant C maps its clavicle.
    for (const [key, cont] of [["ret", false], ["ret2", true]]) { const byName = Object.fromEntries(q.joints.map(j => [j.name, j])), wv = {}, vj = {}, pel = byName.pelvis;
      for (const b of SK.bones) { if (b.name === "root") continue; const j = byName[b.name], vb = RET_MAP[b.name];
        if (b.name === "pelvis") { wv[b.name] = tw.w[0]; vj[b.name] = V.add(tw.v[0], V.cross(tw.w[0], V.sub(pel.world.position, comW(So, 0)))); continue; }
        const pn = b.parent.name, pj = byName[pn]; vj[b.name] = V.add(vj[pn], V.cross(wv[pn], V.sub(j.world.position, pj.world.position)));
        const local = V.sub(j.world.angularVelocity, pj.world.angularVelocity);
        wv[b.name] = vb != null ? tw.w[vb] : (alt === "C" && /^clavicle_/.test(b.name)) ? V.add(wv[pn], local) : cont ? V.add(wv[pn], local) : wv[pn]; }
      const vAt = (pt) => { const j = byName[pt.bone]; return pt.kind === "joint" ? vj[pt.bone] : V.add(vj[pt.bone], V.cross(wv[pt.bone], V.sub(j.world.tip, j.world.position))); };
      o[key] = {}; for (const [g, pts] of Object.entries(POINTS)) o[key][g] = r4(Math.max(...pts.map(pt => V.dist(vAt(pt), lv2Pt(q, pt).v)))); }
    o.vis = {}; for (const [g, pts] of Object.entries(POINTS)) o.vis[g] = r4(Math.max(...pts.map(pt => { const L2 = lv2Pt(q, pt), vv = V.add(tw.v[pt.body], V.cross(tw.w[pt.body], V.sub(L2.p, comW(So, pt.body)))); return V.dist(vv, L2.v); })));
    const mo = momentaOf(So.map((_, i) => comW(So, i)), So.map(s => s.rot), tw.v, tw.w); o.dP = r4(V.dist(mo.P, refMom.P)); o.dL = r4(V.dist(mo.L, refMom.L)); o.Lref = r4(V.len(refMom.L));
    o.keRef = r4(0.5 * B.reduce((s, b, i) => s + b.mass * V.dot(refTw.v[i], refTw.v[i]), 0)); out.vel[fn] = o; }
  // frozen PCG kinematic rows P-14…P-17 (pcg_f0 kinRows definitions: rig-joint-anchored reference, raw rotations) on each velocity field
  { const rs = (kk) => { const pr = R3.pres[kk], rr = rawRotations(R3.bones, R3.bind, pr.world, {}), com = [], rot = []; for (let i = 0; i < NB; i++) { const rb = anchorOf[B[i].name], org = rb ? m2p(pr.world[rr.idx[rb]]) : A0.poses[kk].S[0].pos; com.push(V.add(org, Q.rot(rr.raw[i], B[i].comLocal))); rot.push(rr.raw[i]); } return { com, rot }; };
    const a = rs(0), b = rs(1), c2 = rs(2), refP = { v: b.com.map((_, i) => V.sc(V.sub(c2.com[i], a.com[i]), 1 / (2 * DL))), w: b.com.map((_, i) => angv(a.rot[i], c2.rot[i], 2 * DL)) };
    const Lof = (coms, rots, f) => { const cc = V.sc(coms.reduce((s2, p2, i) => V.add(s2, V.sc(p2, B[i].mass)), [0, 0, 0]), 1 / Mt); let Lt = [0, 0, 0]; for (let i = 0; i < NB; i++) Lt = V.add(Lt, V.add(V.cross(V.sub(coms[i], cc), V.sc(f.v[i], B[i].mass)), mv(Iworld(rots[i], B[i].inertia), f.w[i]))); return Lt; };
    const Lr = Lof(b.com, b.rot, refP); out.pcgKin = {}; for (const [fn, tw] of Object.entries(fields)) { let p14 = 0, p15 = 0; for (let i = 0; i < NB; i++) { if (/^foot_/.test(B[i].name)) continue; p14 = Math.max(p14, V.dist(tw.v[i], refP.v[i])); p15 = Math.max(p15, V.dist(tw.w[i], refP.w[i])); }
      const vc = (f) => V.sc(f.v.reduce((s2, x, i) => V.add(s2, V.sc(x, B[i].mass)), [0, 0, 0]), 1 / Mt), p16 = V.dist(vc(refP), vc(tw)), p17 = V.dist(Lr, Lof(So.map((_, i) => comW(So, i)), So.map(s2 => s2.rot), tw)), lim = TOL.Lrel * Math.max(V.len(Lr), TOL.Lfloor);
      out.pcgKin[fn] = { P14: r4(p14), P15: r4(p15), P16: r4(p16), P17: r4(p17 / lim), fails: [p14 > TOL.bodyVel && "P14", p15 > TOL.angVel && "P15", p16 > TOL.comVel && fn !== "kPL" && "P16", p17 > lim && "P17"].filter(Boolean) }; } }
  for (const [fn, tw] of Object.entries(fields)) { let ke = 0; for (let i = 0; i < NB; i++) { const dv = V.sub(tw.v[i], refTw.v[i]), dw = V.sub(tw.w[i], refTw.w[i]); ke += 0.5 * B[i].mass * V.dot(dv, dv) + 0.5 * V.dot(dw, mv(Iworld(So[i].rot, B[i].inertia), dw)); } out.vel[fn].keResidualJ = r4(ke); }
  if (alt === "A0") { const raw = rawRotations(R3.bones, R3.bind, R3.pres[1].world, {}).raw; let worst = -Infinity; for (const sd of ["L", "R"]) { const j = spec.joints.find(x => x.name === "shoulder_" + sd), a = anatomicalAngles(j, Sp[j.parentIndex].rot, raw[j.childIndex]);
      for (const k of Object.keys(a)) { const h = hardOf(j, k); if (h) worst = Math.max(worst, h[0] - a[k], a[k] - h[1]); } } out.rawShoulderBeyondHardDeg = r4(worst); }
  // self-collision (frozen colliders, frozen frames)
  let sep = { d: Infinity }; for (const [i, j] of SELF_PAIRS) { const s = bodySep(i, j, So); if (s.d < sep.d) sep = { d: s.d, pair: B[i].name + "↔" + B[j].name }; } out.selfMm = r4(sep.d * 1000); out.selfPair = sep.pair;
  // frozen PCG geometric rows (P-1…P-13) on the alternative's body (frozen frames), through a stand-in mapper
  const pz = { ...A0.poses[1], S: So }, mapper = { poseAt: () => pz }, geo = geomRowsRev1(R3, 1, 1, mapper, rigGeom(R3)); out.pcgGeomFails = geo.fails.filter(f => !/^P12/.test(f) || alt === "A0" || alt.startsWith("B") || alt === "C");
  return out; }
// ── run ──
const out = { tool: "v2_upper_alt_probe.mjs", note: "read-only; nothing stepped; frozen V2 spec untouched (alternatives in memory)", bindRotDev, alts: ALTS, models: {}, speeds: {} };
for (const a of ALTS) { const md = modelOf(a); out.models[a] = { hingeMovesMm: Object.fromEntries(B.map((b, i) => [b.name, r4(V.dist(md.origins[i], ORIG[i]) * 1000)]).filter(([, x]) => x > 0)), clavicle: md.clav }; }
for (const v of SPEEDS) {
  const P = prof(v), A = E.r1Make(own()); E.r1Replay(A, P.vOf, null, 1.9)();
  const T = E.r1GaitAt(A.body, A.prm, v).T, Qat = (t) => LV.queryAt(E, A, P.simAt, t, P.vOf, null, { provenance: false }), rows = [];
  for (let k = 0; k < N; k++) {
    const tt = 2.0 + (k + 0.5) / N * T, qs = [Qat(tt - DL), Qat(tt), Qat(tt + DL)], q = qs[1], R3 = recOf(qs), mRF = makeMapper(R3, { knee: "RK", rf1: true }), poses = [0, 1, 2].map(i => mRF.poseAt(i));
    const rfOK = ["L", "R"].every(sd => { const a = [0, 1, 2].map(i => (poses[i].foot[sd] ? poses[i].foot[sd].pitchDeg : 0)); return (a.every(Number.isFinite) && Math.abs(a[2] - a[0]) < 0.05) || a.every(x => !Number.isFinite(x)); });
    const twM = { v: poses[1].S.map((_, i) => V.sc(V.sub(comW(poses[2].S, i), comW(poses[0].S, i)), 1 / (2 * DL))), w: poses[1].S.map((_, i) => angv(poses[0].S[i].rot, poses[2].S[i].rot, 2 * DL)) };
    const A0 = { poses, qs, twM }, ref = { at: qs.map(reference) }, row = { k, u: r4(q.gait.phase), support: q.gait.support, rfOK, alts: {} };
    if (!rfOK) { rows.push(row); continue; }   // the frozen RF-1 rule is discontinuous inside ±δ (late toe pad): excluded, as in R2
    for (const a of ALTS) row.alts[a] = evalAlt(a, modelOf(a), A0, R3, q, ref);
    rows.push(row);
  }
  out.speeds[v] = { strideTime: T, rows }; process.stderr.write(`speed ${v}: done\n`);
}
// ── aggregate ──
const qtl = (a, p) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : null; };
const st = (a) => ({ p50: r4(qtl(a, 0.5)), p90: r4(qtl(a, 0.9)), max: r4(qtl(a, 1)), min: r4(qtl(a, 0)) });
const lines = [];
for (const [v, S] of Object.entries(out.speeds)) { const R = S.rows.filter(r => r.rfOK); S.aggregate = {}; lines.push(`\n=== ${v} m/s (${R.length} instants; ${S.rows.length - R.length} excluded: frozen RF-1 discontinuous) ===`);
  for (const a of ALTS) { const X = R.map(r => r.alts[a]), g = (f) => st(X.map(f));
    const agg = { pos: Object.fromEntries(Object.keys(POINTS).map(k => [k, g(x => x.posMm[k])])), bodyComMm: g(x => x.bodyComMm), bodyRotDeg: g(x => x.bodyRotDeg), rom: { minHard: g(x => x.rom.minHardDeg), beyondHard: X.filter(x => x.rom.minHardDeg < -1e-6).length, activeExc: g(x => x.rom.activeExcDeg),
        minHardWho: (X.slice().sort((p, q2) => p.rom.minHardDeg - q2.rom.minHardDeg)[0] || {}).rom ? X.slice().sort((p, q2) => p.rom.minHardDeg - q2.rom.minHardDeg)[0].rom.minHardWho : null }, self: g(x => x.selfMm), fitMs: g(x => x.tFitMs), kktMs: g(x => x.tKktMs), pcgGeomFailCounts: X.reduce((o2, x) => (x.pcgGeomFails.forEach(f2 => (o2[f2] = (o2[f2] || 0) + 1)), o2), {}), pcgGeomFail: X.filter(x => x.pcgGeomFails.length).length, vel: {} };
    agg.rawShoulderBeyondHard = a === "A0" ? g(x => x.rawShoulderBeyondHardDeg) : null; agg.pcgKin = {}; for (const fn of ["m", "k", "kPL"]) { if (!X[0].pcgKin[fn]) continue; const fc = {}; X.forEach(x => x.pcgKin[fn].fails.forEach(f2 => (fc[f2] = (fc[f2] || 0) + 1))); agg.pcgKin[fn] = { P14: g(x => x.pcgKin[fn].P14), P15: g(x => x.pcgKin[fn].P15), P16: g(x => x.pcgKin[fn].P16), P17overLim: g(x => x.pcgKin[fn].P17), fails: fc, passShare: r4(X.filter(x => !x.pcgKin[fn].fails.length && !x.pcgGeomFails.length).length / X.length) }; }
    for (const fn of ["m", "k", "kPL"]) { if (!X[0].vel[fn]) continue; agg.vel[fn] = { keResidualJ: g(x => x.vel[fn].keResidualJ), bodyV: g(x => x.vel[fn].bodyV), bodyW: g(x => x.vel[fn].bodyW), lowerBodyV: g(x => x.vel[fn].lowerBodyV), dP: g(x => x.vel[fn].dP), dL: g(x => x.vel[fn].dL), dLrel: g(x => x.vel[fn].dL / Math.max(1, x.vel[fn].Lref)),
      pt: Object.fromEntries(Object.keys(POINTS).map(k => [k, g(x => x.vel[fn].pt[k])])), vis: Object.fromEntries(Object.keys(POINTS).map(k => [k, g(x => x.vel[fn].vis[k])])), ret: Object.fromEntries(Object.keys(POINTS).map(k => [k, g(x => x.vel[fn].ret[k])])), retOverPR2: X.filter(x => Math.max(...['shoulder', 'elbowU', 'elbowF', 'wrist', 'handTip', 'head'].map(k2 => x.vel[fn].ret[k2])) > PR2).length, ret2: Object.fromEntries(Object.keys(POINTS).map(k => [k, g(x => x.vel[fn].ret2[k])])), ret2OverPR2: X.filter(x => Math.max(...['shoulder', 'elbowU', 'elbowF', 'wrist', 'handTip', 'head'].map(k2 => x.vel[fn].ret2[k2])) > PR2).length, visOverPR2: X.filter(x => Math.max(...['shoulder', 'elbowU', 'elbowF', 'wrist', 'handTip', 'head'].map(k2 => x.vel[fn].vis[k2])) > PR2).length, ptOverPR2: X.filter(x => Math.max(x.vel[fn].pt.shoulder, x.vel[fn].pt.elbowU, x.vel[fn].pt.wrist) > PR2).length, ptOverPR2F: X.filter(x => Math.max(x.vel[fn].pt.shoulder, x.vel[fn].pt.elbowF, x.vel[fn].pt.wrist) > PR2).length }; }
    S.aggregate[a] = agg; const f = (o) => `${o.p50}/${o.max}`, vk = agg.vel.kPL || agg.vel.m;
    lines.push(`${a.padEnd(4)} pos mm p50/max: shoulder ${f(agg.pos.shoulder)} elbowU ${f(agg.pos.elbowU)} elbowF ${f(agg.pos.elbowF)} wrist ${f(agg.pos.wrist)} hand ${f(agg.pos.handTip)} head ${f(agg.pos.head)} trunk ${f(agg.pos.trunk)} legs ${agg.pos.hipKneeAnkle.max} | body COM ${f(agg.bodyComMm)} mm rot ${f(agg.bodyRotDeg)}° | ROM min-hard ${agg.rom.minHard.min}° (${agg.rom.minHardWho}; beyond ${agg.rom.beyondHard}) | self ${agg.self.min} mm | fit ${agg.fitMs.p50} ms`);
    for (const fn of Object.keys(agg.vel)) { const o = agg.vel[fn]; lines.push(`      vel[${fn}] body v ${f(o.bodyV)} m/s ω ${f(o.bodyW)} rad/s · KE resid ${f(o.keResidualJ)} J · pts shoulder ${f(o.pt.shoulder)} elbowU ${f(o.pt.elbowU)} elbowF ${f(o.pt.elbowF)} wrist ${f(o.pt.wrist)} hand ${f(o.pt.handTip)} legs ${o.pt.hipKneeAnkle.max} · RETARGET shoulder ${f(o.ret.shoulder)} elbow ${f(o.ret.elbowF)} wrist ${f(o.ret.wrist)} hand ${f(o.ret.handTip)} head ${f(o.ret.head)} legs ${o.ret.hipKneeAnkle.max} (> 0.18: ${o.retOverPR2}) · HELD-RIGID shoulder ${f(o.vis.shoulder)} elbowU ${f(o.vis.elbowU)} elbowF ${f(o.vis.elbowF)} wrist ${f(o.vis.wrist)} hand ${f(o.vis.handTip)} head ${f(o.vis.head)} (> 0.18: ${o.visOverPR2}) · lower-body twist Δ ${o.lowerBodyV.max} · |ΔP| ${f(o.dP)} N·s |ΔL| ${f(o.dL)} (rel ${f(o.dLrel)}) · joint-pt > 0.18 m/s (elbow on upper arm / on forearm): ${o.ptOverPR2} / ${o.ptOverPR2F} of ${X.length} · PCG P-14..17 pass ${agg.pcgKin[fn] ? agg.pcgKin[fn].passShare : '-'} ${agg.pcgKin[fn] ? JSON.stringify(agg.pcgKin[fn].fails) : ''}`); } if (agg.rawShoulderBeyondHard) lines.push(`      raw shoulder beyond V2 hard range (clamped by the frozen projection): p50/max ${f(agg.rawShoulderBeyondHard)}°`); } }
console.log(`rig bind rotation deviation ${bindRotDev}; models: ${JSON.stringify(out.models)}`); console.log(lines.join("\n"));
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out));

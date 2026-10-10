// LV2-STATE-1 → V2: READ-ONLY measurement of the INSTANTANEOUS state transfer (RUN1_TO_V2_HANDOFF_CONTRACT_DRAFT_R2.md §4).
// Source: the FROZEN Locomotion V2 baseline (tag locomotion-v2-straight-baseline-1 = 4a226b1f) loaded from a `git archive` of the tag (LV2_ARCHIVE),
// queried only through its contract (LV2_STATE.queryAt, replay path, float64). Target: the PI-1 runner body (pi1RunnerSpec) through the frozen PI-1
// mapping (pcg_rev1 makeMapper, R-K + RF-1), V2's own mass model (B), the frozen PCG tolerances (pcg_f0 TOL) and HG-A v2's 0.180 m/s.
// Nothing is stepped: no Jolt world, no controller, no simulation call. Nothing in RUN-1 / LV2 / V2 / the simulation is modified.
// Per sample τ (half-steps of one stride, N per stride, constant speed, straight line):
//   pose     : PCG geometric rows P-1…P-13 (REV1 set) on the mapped body; the F0 boot's grounding (RF-1 pitch, or ITS-1's E-2 whole-body shift)
//   velocity : PCG kinematic rows P-14…P-17 with velocities from the continuous pose function (central, δ = 0.1 ms) AND as frozen (60 Hz backward);
//              HG-A v2 uniform shift |s| = |v_auth,h − v_COM,h(V2)|; the V-d KKT construction (KE metric) under the draft's default constraints and
//              single-constraint variants, with the resulting per-body / per-joint velocity changes
//   physics  : (diagnostic, old-blocker comparison) the V2-mass COM acceleration and dL/dt implied by the source motion, in flight and stance
// usage (cwd = the physical-character-v2 worktree root: compat_lib resolves physchar2 from cwd; pcg_f0 needs V13_WT = an archive of 5042230):
//   LV2_ARCHIVE=<dir> V13_WT=<dir> node review_artifacts/physical_character_v2/interaction_time/run1_handoff/lv2/probe/lv2_handoff_probe.mjs [--n 240] [--speeds 3.0,5.5,7.8,9.5] [--json out.json]
import fs from "fs"; import vm from "vm"; import path from "path"; import { createRequire } from "module";
const require = createRequire(import.meta.url);
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const ARCH = process.env.LV2_ARCHIVE; if (!ARCH) throw new Error("LV2_ARCHIVE (git archive of locomotion-v2-straight-baseline-1) required");
const { loadRun1 } = require(path.join(ARCH, "sandbox/visual/run1/tools/run1_load.cjs"));
const X = loadRun1({ extra: ["run1/lv2_state.js"] }), LV = vm.runInContext("LV2_STATE", X.ctx), E = X.RUN1_V13;
const M = await import(new URL("../../../../pi1/rev1/scripts/pcg_rev1.mjs", import.meta.url).href);
const { L, TOL, makeMapper, geomRowsRev1, kinRowsRev1, rigGeom, anchorOf } = M;
const { V, Q, B, NB, bi, rawRotations, bodyLowest, Z0, m2p, qang, supportOf, spec } = L;
const HD = 0.3, DL = 1e-4, D2 = 1e-3, N = +arg("n", 240), SPEEDS = arg("speeds", "3.0,5.5,7.8,9.5").split(",").map(Number), G = 9.81, HGA = 0.180, PR2 = 0.180;
const Mt = B.reduce((s, b) => s + b.mass, 0), E3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], FEET = new Set(["foot_L", "foot_R"]);
const own = () => { const s = Object.assign({}, X.charSkel("vinicius")); delete s._r1body; return s; };
const bindW = X.skelFK(own(), {}, X.M4.ident()).world.map(m => Array.from(m));
const bindRotDev = Math.max(...bindW.map(m => Math.max(Math.abs(m[0] - 1), Math.abs(m[5] - 1), Math.abs(m[10] - 1), Math.abs(m[1]), Math.abs(m[2]), Math.abs(m[4]), Math.abs(m[6]), Math.abs(m[8]), Math.abs(m[9]))));
const prof = (v) => ({ v, vOf: () => v, simAt: (t) => ({ x: 70 + v * t * Math.cos(HD), y: 30 + v * t * Math.sin(HD), heading: HD, v }) });
// LV2 query → an AIR-like frame (anim3d world matrices, column-major; feet[0] = L, feet[1] = R as the PI-1 mapper reads them)
const mat = (j) => { const R = j.world.rotation, P = j.world.position; return [R[0], R[3], R[6], 0, R[1], R[4], R[7], 0, R[2], R[5], R[8], 0, P[0], P[1], P[2], 1]; };
const frameOf = (q) => ({ world: q.joints.map(mat), feet: ["L", "R"].map(sd => ({ contact: !!q.legs[sd].stance, mode: q.legs[sd].contact.pivot || "swing" })) });
const recOf = (qs) => ({ bones: qs[0].joints.map(j => ({ name: j.name, parent: j.parent })), bind: bindW, pres: qs.map(frameOf) });
const comW = (S, i) => V.add(S[i].pos, Q.rot(S[i].rot, B[i].comLocal));
const angv = (q0, q1, h) => { let d = Q.norm(Q.mul(q1, Q.conj(q0))); if (d[3] < 0) d = d.map(x => -x); const s = Math.hypot(d[0], d[1], d[2]), a = 2 * Math.atan2(s, d[3]); return s < 1e-15 ? [0, 0, 0] : V.sc([d[0] / s, d[1] / s, d[2] / s], a / h); };
const twists = (Sm, Sp, h) => Sm.map((_, i) => ({ v: V.sc(V.sub(comW(Sp, i), comW(Sm, i)), 1 / h), w: angv(Sm[i].rot, Sp[i].rot, h) }));
const mat3 = (q) => { const [x, y, z, w] = q; return [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]; };
const Iworld = (q, I) => { const R = mat3(q), RI = R.map(row => [0, 1, 2].map(j => row[0] * I[0][j] + row[1] * I[1][j] + row[2] * I[2][j])); return RI.map(row => [0, 1, 2].map(j => row[0] * R[j][0] + row[1] * R[j][1] + row[2] * R[j][2])); };
const mv = (A, x) => A.map(row => row.reduce((s, a, k) => s + a * x[k], 0));
const momenta = (S, tw) => { const c = S.map((_, i) => comW(S, i)), cc = V.sc(c.reduce((s, x, i) => V.add(s, V.sc(x, B[i].mass)), [0, 0, 0]), 1 / Mt); let P = [0, 0, 0], Lc = [0, 0, 0];
  for (let i = 0; i < NB; i++) { P = V.add(P, V.sc(tw[i].v, B[i].mass)); Lc = V.add(Lc, V.add(V.cross(V.sub(c[i], cc), V.sc(tw[i].v, B[i].mass)), mv(Iworld(S[i].rot, B[i].inertia), tw[i].w))); } return { P, L: Lc, com: cc, vcom: V.sc(P, 1 / Mt) }; };
// the lowest point of a body (support in −y over its shapes) — the V2 boot's actual contact point once grounded
const lowestPt = (i, st) => { let best = null; for (const s of B[i].shapes) { const p = supportOf(s, st)([0, -1, 0]); if (!best || p[1] < best[1]) best = p; } return best; };
// ── V-d: the E-3 KKT construction (ITS-1 its_init.mjs buildInit, ported read-only) with a selectable constraint set; reference = the mapped field ──
function solve(A, b) { const n = b.length, Mx = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(Mx[r][c]) > Math.abs(Mx[p][c])) p = r; if (Math.abs(Mx[p][c]) < 1e-14) throw new Error("singular KKT at column " + c);
    if (p !== c) { const t = Mx[p]; Mx[p] = Mx[c]; Mx[c] = t; } for (let r = 0; r < n; r++) { if (r === c) continue; const f = Mx[r][c] / Mx[c][c]; if (f === 0) continue; for (let k = c; k <= n; k++) Mx[r][k] -= f * Mx[c][k]; } }
  return Mx.map((r, i) => r[n] / r[i]); }
const skew = (r) => [[0, -r[2], r[1]], [r[2], 0, -r[0]], [-r[1], r[0], 0]], mm = (A, Bm) => A.map(row => Bm[0].map((_, j) => row.reduce((s, x, k) => s + x * Bm[k][j], 0)));
const madd = (A, Bm, s = 1) => A.map((row, i) => row.map((x, j) => x + s * Bm[i][j])), tr = (A) => A[0].map((_, j) => A.map(row => row[j]));
function kkt(S, ref, cons) {   // cons: { pivots: [{ fi, point|null (null = whole-foot twist 0) }], P: vAuth|null, Lyaw: psiDot|null, locks: true }
  const nj = spec.joints.length, NU = 6 + 3 * nj, zeros = () => [0, 1, 2].map(() => new Array(NU).fill(0)), c = S.map((_, i) => comW(S, i)), Av = [], Aw = [];
  Av[0] = zeros(); Aw[0] = zeros(); for (let k = 0; k < 3; k++) { Av[0][k][k] = 1; Aw[0][k][3 + k] = 1; }
  spec.joints.forEach((j, k) => { const p = j.parentIndex, ch = j.childIndex, jp = S[ch].pos; Aw[ch] = Aw[p].map(r => r.slice()); for (let a = 0; a < 3; a++) Aw[ch][a][6 + 3 * k + a] += 1;
    Av[ch] = madd(madd(Av[p], mm(skew(V.sub(jp, c[p])), Aw[p]), -1), mm(skew(V.sub(c[ch], jp)), Aw[ch]), -1); });
  const Iw = S.map((s, i) => Iworld(s.rot, B[i].inertia)); let Hm = Array.from({ length: NU }, () => new Array(NU).fill(0)); const g = new Array(NU).fill(0);
  for (let i = 0; i < NB; i++) { const m = B[i].mass, AvT = tr(Av[i]), AwT = tr(Aw[i]); Hm = madd(Hm, mm(AvT, Av[i]), m); Hm = madd(Hm, mm(AwT, mm(Iw[i], Aw[i])));
    const gv = mv(AvT, ref[i].v), gw = mv(AwT, mv(Iw[i], ref[i].w)); for (let a = 0; a < NU; a++) g[a] += m * gv[a] + gw[a]; }
  const C = [], d = [], labels = [];
  for (const pv of cons.pivots || []) { const fi = pv.fi;
    if (pv.point == null) { for (let a = 0; a < 3; a++) { C.push(Av[fi][a]); d.push(0); labels.push("pivot whole-foot v"); } for (let a = 0; a < 3; a++) { C.push(Aw[fi][a]); d.push(0); labels.push("pivot whole-foot w"); } }
    else { const Ap = madd(Av[fi], mm(skew(V.sub(pv.point, c[fi])), Aw[fi]), -1); for (let a = 0; a < 3; a++) { C.push(Ap[a]); d.push(0); labels.push("pivot point v"); } } }
  if (cons.P) { const rowMom = (a) => { const r = new Array(NU).fill(0); for (let i = 0; i < NB; i++) for (let k = 0; k < NU; k++) r[k] += B[i].mass * Av[i][a][k]; return r; };
    C.push(rowMom(0)); d.push(Mt * cons.P[0]); labels.push("P_x = M v_auth"); C.push(rowMom(2)); d.push(Mt * cons.P[2]); labels.push("P_z = M v_auth"); }
  const cc = V.sc(c.reduce((s, x, i) => V.add(s, V.sc(x, B[i].mass)), [0, 0, 0]), 1 / Mt);
  if (cons.Lyaw != null) { let Iyaw = 0; for (let i = 0; i < NB; i++) { const r = V.sub(c[i], cc); Iyaw += Iw[i][1][1] + B[i].mass * (r[0] * r[0] + r[2] * r[2]); }
    let Mr = zeros(); for (let i = 0; i < NB; i++) { Mr = madd(Mr, mm(skew(V.sub(c[i], cc)), Av[i]), B[i].mass); Mr = madd(Mr, mm(Iw[i], Aw[i])); } C.push(Mr[1]); d.push(Iyaw * cons.Lyaw); labels.push("L_yaw = I_yaw ψ̇_auth"); }
  if (cons.locks !== false) spec.joints.forEach((j, k) => { for (const key of j.locked) { const a = { x: 0, y: 1, z: 2 }[key], ax = Q.rot(Q.mul(S[j.childIndex].rot, j.F2), E3[a]), r = new Array(NU).fill(0); for (let q = 0; q < 3; q++) r[6 + 3 * k + q] = ax[q]; C.push(r); d.push(0); labels.push("lock " + j.name + "." + key); } });
  const nc = C.length, K = Array.from({ length: NU + nc }, () => new Array(NU + nc).fill(0)), rhs = new Array(NU + nc).fill(0);
  for (let a = 0; a < NU; a++) { for (let b = 0; b < NU; b++) K[a][b] = Hm[a][b]; rhs[a] = g[a]; } for (let r = 0; r < nc; r++) { for (let a = 0; a < NU; a++) { K[NU + r][a] = C[r][a]; K[a][NU + r] = C[r][a]; } rhs[NU + r] = d[r]; }
  const u = solve(K, rhs).slice(0, NU), resid = Math.max(0, ...C.map((row, r) => Math.abs(row.reduce((s, x, k) => s + x * u[k], 0) - d[r])));
  const tw = Av.map((A, i) => ({ v: mv(A, u), w: mv(Aw[i], u) }));
  const keD = tw.reduce((s, t, i) => s + 0.5 * B[i].mass * V.dot(V.sub(t.v, ref[i].v), V.sub(t.v, ref[i].v)) + 0.5 * V.dot(V.sub(t.w, ref[i].w), mv(Iw[i], V.sub(t.w, ref[i].w))), 0);
  return { tw, resid, keD, labels };
}
// velocity of a body-fixed point (body i, world point p) under twist t
const ptVel = (S, i, t, p) => V.add(t.v, V.cross(t.w, V.sub(p, comW(S, i))));
// the rig-attached reference of PCG P-14 … P-17 (pcg_f0 kinRows, verbatim definitions): COM point carried by the rig anchor bone + raw rotation
const refState = (R, k, P) => { const pr = R.pres[k], rr = rawRotations(R.bones, R.bind, pr.world, {}), com = [], rot = [];
  for (let i = 0; i < NB; i++) { const rb = anchorOf[B[i].name], org = rb ? m2p(pr.world[rr.idx[rb]]) : P.S[0].pos; com.push(V.add(org, Q.rot(rr.raw[i], B[i].comLocal))); rot.push(Q.norm(Q.mul(rr.raw[i], Q.conj(Z0[i].rot)))); } return { com, rot }; };
const refTwists = (a, b, h) => a.com.map((_, i) => ({ v: V.sc(V.sub(b.com[i], a.com[i]), 1 / h), w: angv(a.rot[i], b.rot[i], h) }));
// P-14 … P-17 between a reference field and a V2 field on pose S (values; pass/fail with frozen TOL)
function kinRowsOf(S, refR, ref, tw) { let lv = { d: 0 }, av = { d: 0 }, lvF = { d: 0 }, avF = { d: 0 };
  for (let i = 0; i < NB; i++) { const d = V.dist(ref[i].v, tw[i].v), dw = V.dist(ref[i].w, tw[i].w), foot = FEET.has(B[i].name);
    if (foot) { if (d > lvF.d) lvF = { d, body: B[i].name }; if (dw > avF.d) avF = { d: dw, body: B[i].name }; } else { if (d > lv.d) lv = { d, body: B[i].name }; if (dw > av.d) av = { d: dw, body: B[i].name }; } }
  const vc = (f) => V.sc(f.reduce((s, t, i) => V.add(s, V.sc(t.v, B[i].mass)), [0, 0, 0]), 1 / Mt), dCom = V.dist(vc(ref), vc(tw));
  const Lof = (coms, rots, f) => { const c = V.sc(coms.reduce((s, p, i) => V.add(s, V.sc(p, B[i].mass)), [0, 0, 0]), 1 / Mt); let Lt = [0, 0, 0];
    for (let i = 0; i < NB; i++) { const I = B[i].inertia, wl = Q.rot(Q.conj(rots[i]), f[i].w), Iw = [0, 1, 2].map(r => I[r][0] * wl[0] + I[r][1] * wl[1] + I[r][2] * wl[2]); Lt = V.add(Lt, V.add(V.cross(V.sub(coms[i], c), V.sc(f[i].v, B[i].mass)), Q.rot(rots[i], Iw))); } return Lt; };
  const Lr = Lof(refR.com, refR.rot, ref), Lv = Lof(S.map((_, i) => comW(S, i)), S.map((s, i) => Q.norm(Q.mul(s.rot, Q.conj(Z0[i].rot)))), tw), dL = V.dist(Lr, Lv), lim = TOL.Lrel * Math.max(V.len(Lr), TOL.Lfloor);
  return { P14: lv.d, P14body: lv.body, P15: av.d, P15body: av.body, P14feet: lvF.d, P15feet: avF.d, P16: dCom, P17: dL, P17lim: lim, Lref: V.len(Lr),
    fails: [lv.d > TOL.bodyVel && "P14", av.d > TOL.angVel && "P15", dCom > TOL.comVel && "P16", dL > lim && "P17"].filter(Boolean) }; }
// per-joint velocity (V2 body origins = the mapped rig joints) vs the LV2-exported joint velocity: the PR-2 "visible pop" scale (3 mm / frame = 0.18 m/s)
const JOINTB = { pelvis: "pelvis", abdomen: "spine", thorax: "chest", head: "head", upperArm_L: "upperArm_L", upperArm_R: "upperArm_R", forearm_L: "foreArm_L", forearm_R: "foreArm_R", thigh_L: "thigh_L", thigh_R: "thigh_R", shank_L: "shin_L", shank_R: "shin_R", foot_L: "foot_L", foot_R: "foot_R" };
function jointVel(S, tw, q) { let mx = { d: 0 }, mxNF = { d: 0 }; const byName = Object.fromEntries(q.joints.map(j => [j.name, j]));
  for (let i = 1; i < NB; i++) { const j = byName[JOINTB[B[i].name]], v2 = ptVel(S, i, tw[i], S[i].pos), d = V.dist(v2, j.world.linearVelocity); if (d > mx.d) mx = { d, joint: j.name }; if (!FEET.has(B[i].name) && d > mxNF.d) mxNF = { d, joint: j.name }; }
  return { all: mx, nonFoot: mxNF }; }
// every rig joint and tip carried RIGIDLY by its V2 body from the bind pose (rig bind aligned to V2's bind at the hip midpoint, as project() places the
// pelvis): the pose / velocity the V2 body actually represents for that rig point. Covers what P-1…P-13 do not (shoulder girdle, neck, hands, toes)
const CARRIER = { pelvis: "pelvis", spine: "abdomen", chest: "thorax", neck: "head", head: "head", hair: "head", clavicle_R: "thorax", clavicle_L: "thorax", upperArm_R: "upperArm_R", upperArm_L: "upperArm_L",
  foreArm_R: "forearm_R", foreArm_L: "forearm_L", hand_R: "forearm_R", hand_L: "forearm_L", thigh_R: "thigh_R", thigh_L: "thigh_L", shin_R: "shank_R", shin_L: "shank_L", foot_R: "foot_R", foot_L: "foot_L", toe_R: "foot_R", toe_L: "foot_L" };
const CARRY = (() => { const sk = own(), idx = Object.fromEntries(sk.bones.map((b, i) => [b.name, i])), hj = (n) => spec.joints.find(j => j.name === n).at, hip0 = V.sc(V.add(hj("hip_L"), hj("hip_R")), 0.5);
  const bp = (n) => m2p(bindW[idx[n]]), hm = V.sc(V.add(bp("thigh_L"), bp("thigh_R")), 0.5), tipB = (b) => V.add(bp(b.name), V.sc(b.dir, b.len)), pts = [];
  for (const b of sk.bones) { const c = CARRIER[b.name]; if (!c) continue; const ci = bi(c);
    for (const [kind, p] of [["joint", bp(b.name)], ["tip", tipB(b)]]) { const pv = V.add(V.sub(p, hm), hip0); pts.push({ bone: b.name, kind, body: ci, l: Q.rot(Q.conj(Z0[ci].rot), V.sub(pv, Z0[ci].pos)) }); } }
  return pts; })();
// groups by the rig POINT: a joint belongs to its bone (upperArm.joint = shoulder, foreArm.joint = elbow, hand.joint = wrist); tips of the last bones separately
const GROUP = (n, kind) => /clavicle/.test(n) ? "clavicle" : /upperArm/.test(n) ? (kind === "joint" ? "shoulder" : "elbow") : /foreArm/.test(n) ? (kind === "joint" ? "elbow" : "wrist") : /hand/.test(n) ? (kind === "joint" ? "wrist" : "handTip")
  : /toe/.test(n) ? (kind === "joint" ? "mtp" : "toeTip") : /neck|head|hair/.test(n) ? "head" : /foot/.test(n) ? (kind === "joint" ? "ankle" : "footTip") : /thigh|shin/.test(n) ? "leg" : "trunk";
const GROUPS = ["trunk", "head", "clavicle", "shoulder", "elbow", "wrist", "handTip", "leg", "ankle", "footTip", "mtp", "toeTip"];
function carried(S, tws, q) { const byName = Object.fromEntries(q.joints.map(j => [j.name, j])), res = {};
  for (const c of CARRY) { const j = byName[c.bone], p = V.add(S[c.body].pos, Q.rot(S[c.body].rot, c.l)), lp = c.kind === "joint" ? j.world.position : j.world.tip, lv = c.kind === "joint" ? j.world.linearVelocity : j.world.tipVelocity, g = GROUP(c.bone, c.kind);
    const e = res[g] || (res[g] = { posMm: 0, posWho: null, vel: {} }), dp = V.dist(p, lp) * 1000; if (dp > e.posMm) { e.posMm = dp; e.posWho = c.bone + "." + c.kind; }
    if (tws) for (const [nm, tw] of Object.entries(tws)) { const dv = V.dist(ptVel(S, c.body, tw[c.body], p), lv), ev = e.vel[nm] || (e.vel[nm] = { d: 0, who: null }); if (dv > ev.d) { ev.d = dv; ev.who = c.bone + "." + c.kind; } } }
  for (const g in res) { res[g].posMm = r4(res[g].posMm); for (const nm in res[g].vel) res[g].vel[nm].d = r4(res[g].vel[nm].d); } return res; }
const sig = (z) => z.gait.support + ["R", "L"].map(sd => z.legs[sd].contact.subPhase === "flat" ? "F" : z.legs[sd].contact.subPhase === "swing" ? "S" : "P").join("");
const short = { "forefoot landing (heel lowering about the MTP joint)": "forefoot landing", "flat": "flat", "heel-up (rolling about the MTP joint, toe segment flat)": "heel-up", "toe pad (toe segment rolling about the pad)": "toe pad", swing: "swing" };
const r4 = (x) => x == null || !isFinite(x) ? x : +x.toFixed(4);
// static: V2 joint centres vs the rig joints at bind (aligned at the hip midpoint) — where the two skeletons articulate differently
const BINDGAP = (() => { const sk = own(), idx = Object.fromEntries(sk.bones.map((b, i) => [b.name, i])), hj = (n) => spec.joints.find(j => j.name === n).at, hip0 = V.sc(V.add(hj("hip_L"), hj("hip_R")), 0.5), bp = (n) => m2p(bindW[idx[n]]), hm = V.sc(V.add(bp("thigh_L"), bp("thigh_R")), 0.5);
  const o = {}; for (const j of spec.joints) { const rb = JOINTB[B[j.childIndex].name], p = V.add(V.sub(bp(rb), hm), hip0), z = Z0[j.childIndex].pos; o[j.name] = { rigJoint: rb, gapMm: r4(V.dist(p, z) * 1000), v2Bind: z.map(r4), rigBind: p.map(r4) }; } return o; })();
const out = { tool: "lv2_handoff_probe.mjs", note: "read-only; no physics stepped", provenance: null, bindRotDev, bindGap: BINDGAP, tol: { ...TOL, hgaV2: HGA, pr2: PR2 }, speeds: {} };
for (const v of SPEEDS) {
  const P = prof(v), A = E.r1Make(own()); E.r1Replay(A, P.vOf, null, 1.9)();
  const T = E.r1GaitAt(A.body, A.prm, v).T, Qat = (t) => LV.queryAt(E, A, P.simAt, t, P.vOf, null, { provenance: false }), rows = [];
  if (!out.provenance) out.provenance = LV.queryAt(E, A, P.simAt, 2.0, P.vOf).provenance;
  for (let k = 0; k < N; k++) {
    const tt = 2.0 + (k + 0.5) / N * T, offs = [-D2 - DL, -D2 + DL, -DL, 0, DL, D2 - DL, D2 + DL], qs = offs.map(o => Qat(tt + o)), q = qs[3], sg = qs.map(sig);
    const okInst0 = sg[2] === sg[3] && sg[4] === sg[3] && q.method.velocities.indexOf("central") === 0, okCons = sg.every(s => s === sg[3]);
    const row = { k, t: r4(tt), u: r4(q.gait.phase), support: q.gait.support, legs: {}, okInst: okInst0, okCons };
    for (const sd of ["R", "L"]) { const lg = q.legs[sd], c = lg.contact; row.legs[sd] = { sub: short[c.subPhase] || c.subPhase, pivot: c.pivot || null, mtpDeg: r4(lg.mtpExtension * 180 / Math.PI), s: lg.s != null ? r4(lg.s) : null }; }
    // ── pose: mapped body at τ (R-K + RF-1, the promoted body) and without RF-1 (the F0 boot following the LV2 foot) ──
    const R3 = recOf([qs[2], qs[3], qs[4]]), mRF = makeMapper(R3, { knee: "RK", rf1: true }), mF0 = makeMapper(R3, { knee: "RK", rf1: false }), PRF = [0, 1, 2].map(i => mRF.poseAt(i)), P0 = mF0.poseAt(1);
    const rfp = (Pz, sd) => (Pz.foot[sd] ? Pz.foot[sd].pitchDeg : 0), rfState = ["L", "R"].map(sd => [0, 1, 2].map(i => rfp(PRF[i], sd)));
    row.rf1Consistent = rfState.every(a => (a.every(Number.isFinite) && Math.abs(a[2] - a[0]) < 0.05) || a.every(x => !Number.isFinite(x)));
    const geo = geomRowsRev1(R3, 1, 1, mRF, rigGeom(R3)); row.geom = { fails: geo.fails, P1: geo.P1_pelvisMm, P2: geo.P2_pelvisDeg, P3: geo.P3_trunkDeg, P4hip: geo.P4_hipMm, P4knee: geo.P4_kneeMm, P4ankle: geo.P4_ankleMm, P6: geo.P6_limbSwingDeg, P7: geo.P7_twistDeg, P8: geo.P8_armMm, P10: geo.P10_nonContactLowestMm, P10body: geo.P10_body, P11: geo.P11_renderedBootPenMm, P12: geo.P12_clampMaxDeg, P13: geo.P13_minSelfSepMm, foot: geo.foot };
    row.carry = carried(PRF[1].S, null, q);
    { const cl = Object.entries(PRF[1].clamp).sort((a, b) => b[1] - a[1])[0]; row.clamp = { joint: cl[0], deg: r4(cl[1]) }; }
    row.rigLocalDeg = Object.fromEntries(["clavicle_L", "clavicle_R", "hand_L", "hand_R", "neck", "toe_L", "toe_R"].map(n => { const R = q.joints.find(j => j.name === n).localRotation; return [n, r4(Math.acos(Math.max(-1, Math.min(1, (R[0] + R[4] + R[8] - 1) / 2))) * 180 / Math.PI)]; }));
    row.ground = {}; for (const sd of ["L", "R"]) { const fi = bi("foot_" + sd), lo0 = bodyLowest(B[fi], P0.S[fi]).y, pf = PRF[1].foot[sd];
      row.ground[sd] = { contact: !!q.legs[sd].stance, F0lowestMm: r4(lo0 * 1000), RF1pitchDeg: pf ? r4(pf.pitchDeg) : 0, RF1lowestMm: pf ? r4(pf.lowestMm) : null, physVsLV2FootDeg: geo.foot[sd].physVsPresDeg, E2wholeBodyShiftMm: q.legs[sd].stance ? r4((0.0005 - lo0) * 1000) : null }; }
    // ── velocities (continuous: central δ on the pose function; skipped if a declared event lies inside ±δ, or the frozen RF-1 rule is inconsistent across ±δ) ──
    const okInst = okInst0 && row.rf1Consistent; row.okInst = okInst;
    if (okInst) {
      const S = PRF[1].S, tw = twists(PRF[0].S, PRF[2].S, 2 * DL), rA = refState(R3, 0, PRF[0]), rB = refState(R3, 1, PRF[1]), rC = refState(R3, 2, PRF[2]), ref = refTwists(rA, rC, 2 * DL);
      row.kin = kinRowsOf(S, rB, ref, tw); for (const kk of ["P14", "P15", "P14feet", "P15feet", "P16", "P17", "P17lim", "Lref"]) row.kin[kk] = r4(row.kin[kk]);
      const mo = momenta(S, tw), vAuth = q.root.linearVelocity, s = [vAuth[0] - mo.vcom[0], 0, vAuth[2] - mo.vcom[2]];
      row.mom = { hgaS: r4(V.len(s)), comVelV2: mo.vcom.map(r4), comVelLV2diag: q.com.world.linearVelocity.map(r4), vAuth: vAuth.map(r4), L: mo.L.map(r4), pelvisVy: r4(q.pelvis.springMass.verticalVelocity), modelForceBW: r4(q.pelvis.springMass.verticalForceBW) };
      row.jointVel = (() => { const jv = jointVel(S, tw, q); return { all: r4(jv.all.d), allJoint: jv.all.joint, nonFoot: r4(jv.nonFoot.d), nonFootJoint: jv.nonFoot.joint }; })();
      // pivots: the LV2 pivot's material velocity ON THE V2 FOOT (pre-construction) and the V2 boot's own contact point (post-RF-1 lowest point)
      const piv = []; row.pivot = {};
      for (const sd of ["L", "R"]) { if (!q.legs[sd].stance) continue; const fi = bi("foot_" + sd), c = q.legs[sd].contact, lp = lowestPt(fi, S[fi]), whole = c.pivot === "sole";
        row.pivot[sd] = { lv2Pivot: c.pivot, lv2PivotOnV2FootMs: c.pivotPoint ? r4(V.len(ptVel(S, fi, tw[fi], c.pivotPoint))) : null, v2ContactPtMs: r4(V.len(ptVel(S, fi, tw[fi], lp))), v2ContactPtYmm: r4(lp[1] * 1000),
          v2ContactVsLv2PivotMm: c.pivotPoint ? r4(V.dist(lp, c.pivotPoint) * 1000) : null }; piv.push({ fi, point: whole ? null : lp }); }
      // V-d variants (the reference is the mapped field; corrections = the handoff's own velocity change)
      const variants = { draft: { pivots: piv, P: vAuth, Lyaw: 0 }, pivotP: { pivots: piv, P: vAuth }, pivotOnly: { pivots: piv }, POnly: { P: vAuth }, LyawOnly: { Lyaw: 0 }, locksOnly: {} };
      row.vd = {}; for (const [name, cons] of Object.entries(variants)) { const r = kkt(S, tw, cons); let dv = { d: 0 }, dw = { d: 0 };
        r.tw.forEach((t, i) => { const a = V.dist(t.v, tw[i].v), b = V.dist(t.w, tw[i].w); if (a > dv.d) dv = { d: a, body: B[i].name }; if (b > dw.d) dw = { d: b, body: B[i].name }; });
        const kr = kinRowsOf(S, rB, ref, r.tw), jv = jointVel(S, r.tw, q);
        if (name === "draft" || name === "locksOnly") row.carryVel = Object.assign(row.carryVel || {}, { [name]: carried(S, { v: r.tw }, q) });
        row.vd[name] = { resid: r.resid, keDistJ: r4(r.keD), maxDvBody: r4(dv.d), dvBody: dv.body, maxDwBody: r4(dw.d), dwBody: dw.body, jointVsLV2: r4(jv.all.d), jointVsLV2Who: jv.all.joint, jointVsLV2NonFoot: r4(jv.nonFoot.d), P14: r4(kr.P14), P15: r4(kr.P15), P16: r4(kr.P16), P17: r4(kr.P17), kinFails: kr.fails }; }
    }
    // frozen kinematic rows as defined (60 Hz backward difference across the frame before τ)
    { const qb = Qat(tt - 1 / 60), R2 = recOf([qb, q]), kr = kinRowsRev1(R2, 1, 1, makeMapper(R2, { knee: "RK", rf1: true })); row.kin60 = { fails: kr.fails, P14: kr.P14_bodyVelMs, P15: kr.P15_angVelRadS, P16: kr.P16_comVelMs, P17: kr.P17_dL, P17lim: kr.P17_limit }; }
    // ── diagnostic: the V2-mass COM acceleration and dL/dt the source motion implies (central, ±1 ms, each velocity central ±0.1 ms) ──
    if (okCons) { const Rm = recOf([qs[0], qs[1]]), Rp = recOf([qs[5], qs[6]]), mm_ = makeMapper(Rm, { knee: "RK", rf1: true }), mp_ = makeMapper(Rp, { knee: "RK", rf1: true });
      const Sm0 = mm_.poseAt(0).S, Sm1 = mm_.poseAt(1).S, Sp0 = mp_.poseAt(0).S, Sp1 = mp_.poseAt(1).S, Smid = (a, b) => a.map((s, i) => ({ pos: V.sc(V.add(s.pos, b[i].pos), 0.5), rot: Q.norm(s.rot.map((x, c) => x + b[i].rot[c] * Math.sign(V.dot([s.rot[0], s.rot[1], s.rot[2]], [b[i].rot[0], b[i].rot[1], b[i].rot[2]]) + s.rot[3] * b[i].rot[3] || 1))) }));
      const moM = momenta(Smid(Sm0, Sm1), twists(Sm0, Sm1, 2 * DL)), moP = momenta(Smid(Sp0, Sp1), twists(Sp0, Sp1, 2 * DL)), aC = V.sc(V.sub(moP.vcom, moM.vcom), 1 / (2 * D2)), tau = V.sc(V.sub(moP.L, moM.L), 1 / (2 * D2));
      const aD = V.sc(V.sub(qs[5].com.world.linearVelocity, qs[1].com.world.linearVelocity), 1 / (2 * (D2 - DL)));
      row.phys = { lv2DiagAComH_BW: r4(Math.hypot(aD[0], aD[2]) / G), lv2DiagAComYplusG_BW: r4((aD[1] + G) / G), aComH_BW: r4(Math.hypot(aC[0], aC[2]) / G), aComYplusG_BW: r4((aC[1] + G) / G), torqueNm: r4(V.len(tau)), torque: tau.map(r4) }; }
    rows.push(row);
  }
  out.speeds[v] = { strideTime: T, n: N, rows };
  process.stderr.write(`speed ${v}: ${rows.length} samples\n`);
}
// ── aggregation ──
const q = (a, p) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; };
const statRaw = (a) => (a.length ? { n: a.length, p50: r4(q(a, 0.5)), p90: r4(q(a, 0.9)), max: r4(Math.max(...a)), min: r4(Math.min(...a)) } : { n: 0 });
const stat = (a) => { const f = a.filter(x => x != null && Number.isFinite(x)); const o = statRaw(f); if (f.length < a.length) o.nonFinite = a.length - f.length; return o; };
const classOf = (r) => r.support === "flight" ? "flight" : "stance:" + r.legs[r.support.slice(-1)].sub;
const lines = [];
for (const [v, S] of Object.entries(out.speeds)) {
  const R = S.rows, cls = [...new Set(R.map(classOf))].sort(), agg = { classes: {} };
  for (const c of ["all", ...cls]) { const rs = R.filter(r => c === "all" || classOf(r) === c), ri = rs.filter(r => r.okInst);
    const failsGeom = {}; rs.forEach(r => r.geom.fails.forEach(f => (failsGeom[f] = (failsGeom[f] || 0) + 1)));
    const failsKin = {}; ri.forEach(r => r.kin.fails.forEach(f => (failsKin[f] = (failsKin[f] || 0) + 1)));
    const failsKin60 = {}; rs.forEach(r => r.kin60.fails.forEach(f => (failsKin60[f] = (failsKin60[f] || 0) + 1)));
    const failsVd = {}; ri.forEach(r => r.vd.draft.kinFails.forEach(f => (failsVd[f] = (failsVd[f] || 0) + 1)));
    const stanceLegs = rs.flatMap(r => ["L", "R"].filter(sd => r.ground[sd].contact).map(sd => ({ r, sd })));
    const G_ = (r) => !r.geom.fails.length, K_ = (r) => !r.kin.fails.length;
    // composites (frozen tolerances only). P-16 is not applied to a field that ENFORCES P = M·v_auth: that COM change is the authority correction,
    // judged by HG-A v2 |s| ≤ 0.180 m/s (HGA_V2_ADOPTED.md: v1's 0.05 m/s P-16 tolerance was a fidelity number used as a visibility number)
    const kOK = (fails, enforcesP) => !fails.filter(f => !(enforcesP && f === "P16")).length;
    const cleanNoHGA = ri.filter(r => G_(r) && K_(r));                                                              // C1 mapping only (V-a + V-c)
    const cleanPivot = ri.filter(r => G_(r) && kOK(r.vd.pivotOnly.kinFails, false));                               // C2 + V-d pivot constraint
    const cleanR2 = ri.filter(r => G_(r) && kOK(r.vd.pivotP.kinFails, true) && r.mom.hgaS <= HGA);                 // C3 + pivot + P = M·v_auth (L free)
    const clean = ri.filter(r => G_(r) && kOK(r.vd.draft.kinFails, true) && r.mom.hgaS <= HGA);                    // C4 the draft's literal default (+ L_yaw = I·ψ̇_auth)
    agg.classes[c] = { samples: rs.length, share: r4(rs.length / R.length), velocitySamples: ri.length,
      geomFailCounts: failsGeom, geomPassShare: r4(rs.filter(r => !r.geom.fails.length).length / rs.length),
      kinContFailCounts: failsKin, kin60FailCounts: failsKin60,
      P4ankleMm: stat(rs.map(r => r.geom.P4ankle)), P4kneeMm: stat(rs.map(r => r.geom.P4knee)), P6deg: stat(rs.map(r => r.geom.P6)), P7deg: stat(rs.map(r => r.geom.P7)), P8mm: stat(rs.map(r => r.geom.P8)), P10mm: stat(rs.map(r => r.geom.P10)), P11mm: stat(rs.map(r => r.geom.P11)), P13mm: stat(rs.map(r => r.geom.P13)),
      F0lowestMm: stat(stanceLegs.map(x => x.r.ground[x.sd].F0lowestMm)), RF1pitchDeg: stat(stanceLegs.map(x => Math.abs(x.r.ground[x.sd].RF1pitchDeg))), physVsLV2FootDeg: stat(stanceLegs.map(x => x.r.ground[x.sd].physVsLV2FootDeg)),
      E2shiftMm: stat(stanceLegs.map(x => x.r.ground[x.sd].E2wholeBodyShiftMm)),
      P14: stat(ri.map(r => r.kin.P14)), P15: stat(ri.map(r => r.kin.P15)), P14feet: stat(ri.map(r => r.kin.P14feet)), P15feet: stat(ri.map(r => r.kin.P15feet)), P16: stat(ri.map(r => r.kin.P16)), P17overLim: stat(ri.map(r => r.kin.P17 / r.kin.P17lim)),
      P14_60: stat(rs.map(r => r.kin60.P14)), P15_60: stat(rs.map(r => r.kin60.P15)),
      hgaS: stat(ri.map(r => r.mom.hgaS)), hgaPassShare: r4(ri.filter(r => r.mom.hgaS <= HGA).length / Math.max(1, ri.length)),
      jointVelMapNonFoot: stat(ri.map(r => r.jointVel.nonFoot)), jointVelMapAll: stat(ri.map(r => r.jointVel.all)),
      v2ContactPtMs: stat(ri.flatMap(r => Object.values(r.pivot).map(p => p.v2ContactPtMs))), lv2PivotOnV2FootMs: stat(ri.flatMap(r => Object.values(r.pivot).filter(p => p.lv2PivotOnV2FootMs != null).map(p => p.lv2PivotOnV2FootMs))),
      v2ContactVsLv2PivotMm: stat(ri.flatMap(r => Object.values(r.pivot).filter(p => p.v2ContactVsLv2PivotMm != null).map(p => p.v2ContactVsLv2PivotMm))),
      vd: Object.fromEntries(["draft", "pivotP", "pivotOnly", "POnly", "LyawOnly", "locksOnly"].map(n => [n, { maxDvBody: stat(ri.map(r => r.vd[n].maxDvBody)), maxDwBody: stat(ri.map(r => r.vd[n].maxDwBody)), jointVsLV2NonFoot: stat(ri.map(r => r.vd[n].jointVsLV2NonFoot)), jointVsLV2: stat(ri.map(r => r.vd[n].jointVsLV2)), keDistJ: stat(ri.map(r => r.vd[n].keDistJ)), resid: stat(ri.map(r => r.vd[n].resid)) }])),
      vdDraftKinFailCounts: failsVd,
      clampJoints: rs.filter(r => r.clamp.deg > TOL.clampDeg).reduce((o, r) => (o[r.clamp.joint] = Math.max(o[r.clamp.joint] || 0, r.clamp.deg), o), {}),
      rigLocalDeg: Object.fromEntries(["clavicle_L", "clavicle_R", "hand_L", "hand_R", "neck"].map(n => [n, stat(rs.map(r => r.rigLocalDeg[n]))])),
      carryPosMm: Object.fromEntries(GROUPS.map(g => [g, stat(rs.map(r => r.carry[g] ? r.carry[g].posMm : 0))])),
      carryPosWorst: Object.fromEntries(GROUPS.map(g => { const w = rs.slice().sort((a, b) => (b.carry[g] ? b.carry[g].posMm : 0) - (a.carry[g] ? a.carry[g].posMm : 0))[0]; return [g, w && w.carry[g] ? w.carry[g].posWho : null]; })),
      carryVelMapped: Object.fromEntries(GROUPS.map(g => [g, stat(ri.map(r => r.carryVel.locksOnly[g] ? r.carryVel.locksOnly[g].vel.v.d : 0))])),
      carryVelDraft: Object.fromEntries(GROUPS.map(g => [g, stat(ri.map(r => r.carryVel.draft[g] ? r.carryVel.draft[g].vel.v.d : 0))])),
      cleanShare: r4(clean.length / Math.max(1, ri.length)), cleanShareWithoutHgaAndVd: r4(cleanNoHGA.length / Math.max(1, ri.length)), cleanSharePivotOnly: r4(cleanPivot.length / Math.max(1, ri.length)), cleanShareR2: r4(cleanR2.length / Math.max(1, ri.length)),
      rf1Inconsistent: rs.filter(r => !r.rf1Consistent).length, eventSkipped: rs.filter(r => !r.okInst && r.rf1Consistent).length,
      vdFailCounts: Object.fromEntries(["draft", "pivotP", "pivotOnly", "POnly", "LyawOnly", "locksOnly"].map(n => [n, ri.reduce((o, r) => (r.vd[n].kinFails.forEach(f => (o[f] = (o[f] || 0) + 1)), o), {})])),
      phys: { lv2DiagAComH_BW: stat(rs.filter(r => r.phys).map(r => r.phys.lv2DiagAComH_BW)), lv2DiagAComYplusG_BW: stat(rs.filter(r => r.phys).map(r => r.phys.lv2DiagAComYplusG_BW)), aComH_BW: stat(rs.filter(r => r.phys).map(r => r.phys.aComH_BW)), aComYplusG_BW: stat(rs.filter(r => r.phys).map(r => r.phys.aComYplusG_BW)), torqueNm: stat(rs.filter(r => r.phys).map(r => r.phys.torqueNm)) } };
  }
  S.aggregate = agg;
  const a = agg.classes.all; lines.push(`v ${v} m/s: samples ${a.samples} (velocity ${a.velocitySamples}) · geom pass ${a.geomPassShare} ${JSON.stringify(a.geomFailCounts)} · kin(cont) fails ${JSON.stringify(a.kinContFailCounts)} · kin(60Hz) fails ${JSON.stringify(a.kin60FailCounts)} · HG-A |s| ${JSON.stringify(a.hgaS)} pass ${a.hgaPassShare} · V-d draft joint Δv (non-foot) ${JSON.stringify(a.vd.draft.jointVsLV2NonFoot)} · clean: mapping only ${a.cleanShareWithoutHgaAndVd} · C2 +pivot ${a.cleanSharePivotOnly} · C3 +pivot+P ${a.cleanShareR2} · C4 draft literal (+L_yaw) ${a.cleanShare} · RF-1 inconsistent ${a.rf1Inconsistent}, event-skipped ${a.eventSkipped}`);
  for (const c of cls) { const b = agg.classes[c]; lines.push(`   ${c.padEnd(26)} share ${b.share} · geom pass ${b.geomPassShare} ${JSON.stringify(b.geomFailCounts)} · RF1 pitch ${JSON.stringify(b.RF1pitchDeg)} · F0 lowest ${JSON.stringify(b.F0lowestMm)} · E2 shift ${JSON.stringify(b.E2shiftMm)} · |s| p50/max ${b.hgaS.p50}/${b.hgaS.max} · V-d draft dv ${b.vd.draft.maxDvBody.max} dw ${b.vd.draft.maxDwBody.max} · C1 ${b.cleanShareWithoutHgaAndVd} / C2 ${b.cleanSharePivotOnly} / C3 ${b.cleanShareR2} / C4 ${b.cleanShare} · RF-1 inc ${b.rf1Inconsistent} · flight-phys aH ${JSON.stringify(b.phys.aComH_BW)} aY+g ${JSON.stringify(b.phys.aComYplusG_BW)} τ ${JSON.stringify(b.phys.torqueNm)}`); }
}
console.log(lines.join("\n"));
if (arg("json")) fs.writeFileSync(arg("json"), JSON.stringify(out, null, 1));

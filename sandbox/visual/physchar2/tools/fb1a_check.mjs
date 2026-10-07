// ═══ physchar2/tools/fb1a_check.mjs — 1A-0 CORRECTNESS of the floating-base swing-foot task conversion (e2/FB1A_TR1B_PREREG.md §4, criterion 1A-0; written with the
// prereg's freeze, before any battery run). For 8 bodies × 2 legs × 25 seeded random cases (leg coordinates around the quiet-stance pose, pelvis motion, analytic reference):
//   (a) with ω_p = α_p = 0 the 1A wrench / rates equal the original D1 exactly;
//   cases: leg coordinates = the quiet-stance solution with hip flexion / knee flexion / ankle offsets of a swing-like range, kept only where the conversion is defined as used in
//   the swing (σmin of the 6×6 foot Jacobian ≥ 0.03, the measured airborne range; e2/VFF_RATE_CORRECTION.md); derivatives by 5-point (O(h⁴)) stencils, h = 2e-4 s
//   (b) moving-frame kinematics: the pelvis frame moves rigidly (COM c + v t + ½ A t², orientation exp((ω t + ½ α t²)×)·R0 — angular velocity ω and angular acceleration α at t = 0),
//       the leg coordinates follow x + ẋ t + ½ ẍ t² (ẋ, ẍ from the conversion); finite differences of the chain's forward kinematics give the foot task point's world velocity /
//       acceleration and the foot's world angular velocity / acceleration, which must equal the reference (relative error ≤ 1e-4 of max(|ref|, 1e-3));
//   (c) each joint wrench equals the finite-difference rate of change of the distal subtree's angular momentum about the joint point at t = 0, minus the common-acceleration part
//       Σ (c_b − p_k) × m_b A (relative error ≤ 1e-4 of max(|T|, 1e-3)).
// usage: V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/fb1a_check.mjs [--json=<out>]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { e2Spec, CFG } from "../gates/v2_e2.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { V, Q, unitStates, unitEv } from "../core/v2_math.js"; import { _eigMinSym } from "../ctrl/v2_stand.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("E1a configuration env required");
const BODIES = ["V2-REF", "V2-165-62", "V2-198-92", "V2-175-70", "V2-190-85", "V2-short-legs", "V2-long-legs", "V1-matched"], NCASE = 25, TOL = 1e-4;
let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; }, rv = (s) => [0, 1, 2].map(() => (2 * rnd() - 1) * s);
const angVel = (Ra, Rb, h) => { let q = Q.mul(Ra, Q.conj(Rb)); if (q[3] < 0) q = q.map(v => -v); return [2 * q[0] / h, 2 * q[1] / h, 2 * q[2] / h]; };
const qexpv = (th) => { const a = Math.hypot(...th); if (a < 1e-15) return [th[0] / 2, th[1] / 2, th[2] / 2, 1]; const s = Math.sin(a / 2) / a; return [th[0] * s, th[1] * s, th[2] * s, Math.cos(a / 2)]; };
const relErr = (x, ref) => Math.hypot(...V.sub(x, ref)) / Math.max(Math.hypot(...ref), 1e-3);
const out = { generated: "tools/fb1a_check.mjs", prereg: "e2/FB1A_TR1B_PREREG.md 1A-0", tol: TOL, cases: 0, a_exact_fail: 0, b_max: 0, c_max: 0, b_fail: 0, c_fail: 0, worst: [] };
for (const human of BODIES) {
  const spec = e2Spec(human), def = { ...g3Def("U:R"), key: "FB1A", title: "1A check", lam: () => 0.5, supervise: {}, holds: [], seconds: 2, push: null, torque: null };
  const s = new G3Sim(J, spec, def, { stand: { ikRefTwist: true, lifecycle: true, ...CFG.PSTAR5CHABF }, passiveOpts: { kneeModel: "v2k" } }), C = s.ctrl; let cap = null;
  const oc = C.compute.bind(C); C.compute = (st, ev, dtt) => { if (C.n === 120) cap = { st: unitStates(st), ev: unitEv(ev) }; return oc(st, ev, dtt); };
  while (!cap) { if (!s.tick()) break; } if (!cap) throw new Error("no state " + human);
  const { st, ev } = cap, ps = st[C.pelvis], B = spec.bodies;
  for (const n of [0, 1]) for (let ic = 0, tries = 0; ic < NCASE && tries < 2000; tries++) {
    const fr0 = { pos: ps.pos.slice(), rot: ps.rot.slice() }, x0 = C.legChain(st, ev, n, fr0.pos, fr0.rot, null).x0, x = x0.slice(); x[1] += (2 * rnd() - 1) * 0.6; x[3] += (2 * rnd() - 1) * 1.2; x[4] += (2 * rnd() - 1) * 0.3; x[5] += (2 * rnd() - 1) * 0.2;
    const ks = C.legK[n], bodies = ks.map(k => spec.joints[k].childIndex), cOff = bodies.map(b => Q.rot(Q.conj(st[b].rot), V.sub(st[b].com, st[b].pos)));
    { const ch0 = C.legChain(st, ev, n, fr0.pos, fr0.rot, null), e = 1e-6, P0 = ch0.pose(x), cols = [0, 1, 2, 3, 4, 5].map(j => { const xp = x.slice(), xm = x.slice(); xp[j] += e; xm[j] -= e; const a = ch0.pose(xp), b = ch0.pose(xm); return [...V.sc(V.sub(a.p[2], b.p[2]), 1 / (2 * e)), ...angVel(a.R[2], b.R[2], 2 * e)]; });
      const JtJ = cols.map(ci => cols.map(cj => ci.reduce((s2, v, i) => s2 + v * cj[i], 0))); if (!(_eigMinSym(JtJ) >= 0.03 * 0.03)) continue; }
    ic++;
    const pel = { c: ps.com.slice(), v: rv(0.3), w: rv(1.0), al: rv(15) }, A = [(2 * rnd() - 1) * 3, 0, (2 * rnd() - 1) * 3], ref = { vel: rv(1.0), acc: rv(5), w: rv(1.0), al: rv(10), vPel: pel.v };
    const D0 = C.swingAccWrench(st, ev, n, fr0, x, ref, A, null), Dz = C.swingAccWrench(st, ev, n, fr0, x, ref, A, { c: pel.c, v: pel.v, w: [0, 0, 0], al: [0, 0, 0] }), D = C.swingAccWrench(st, ev, n, fr0, x, ref, A, pel);
    if (!D0 || !Dz || !D) throw new Error("conversion failed");
    out.cases++; const exact = Object.keys(D0.T).every(k => D0.T[k].every((v, i) => v === Dz.T[k][i])) && D0.xd.every((v, i) => v === Dz.xd[i]) && D0.xdd.every((v, i) => v === Dz.xdd[i]); if (!exact) out.a_exact_fail++;
    // (b) moving frame + coordinate trajectory → forward kinematics at t = j·h, j = −4 … 4
    const frameAt = (t) => { const R = Q.norm(Q.mul(qexpv(V.add(V.sc(pel.w, t), V.sc(pel.al, 0.5 * t * t))), fr0.rot)), c = V.add(V.add(pel.c, V.sc(pel.v, t)), V.sc(A, 0.5 * t * t)), o = V.add(c, Q.rot(Q.mul(R, Q.conj(fr0.rot)), V.sub(fr0.pos, pel.c))); return { pos: o, rot: R }; };
    const kinAt = (t) => { const f = frameAt(t), ch = C.legChain(st, ev, n, f.pos, f.rot, null), y = x.map((v, i) => v + D.xd[i] * t + 0.5 * D.xdd[i] * t * t), P = ch.pose(y); return { R: P.R, p: P.p, c: P.R.map((R, i) => V.add(P.p[i], Q.rot(R, cOff[i]))) }; };
    const h = 2e-4, K = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map(j => kinAt(j * h)), I0 = 4;   // K[I0 + j] at t = j·h
    const d1 = (f) => V.sc(V.add(V.sub(f(-2), f(2)), V.sc(V.sub(f(1), f(-1)), 8)), 1 / (12 * h)), d2 = (f) => V.sc(V.add(V.add(V.sc(V.add(f(-1), f(1)), 16), V.sc(f(0), -30)), V.sc(V.add(f(-2), f(2)), -1)), 1 / (12 * h * h));
    const logv = (q) => { if (q[3] < 0) q = q.map(v => -v); const s2 = Math.hypot(q[0], q[1], q[2]); if (s2 < 1e-300) return [0, 0, 0]; const a = 2 * Math.atan2(s2, q[3]); return [q[0] * a / s2, q[1] * a / s2, q[2] * a / s2]; };
    const omegaAt = (b, j) => d1((m) => logv(Q.mul(K[I0 + j + m].R[b], Q.conj(K[I0 + j].R[b]))));   // world angular velocity of segment b at t = j·h (j ∈ −2 … 2)
    const vF = d1((m) => K[I0 + m].p[2]), aF = d2((m) => K[I0 + m].p[2]), wF = omegaAt(2, 0), alF = d1((m) => omegaAt(2, m));
    // CONTROL (amendment A1, e2/FB1A_TR1B_PREREG.md §7): the ORIGINAL D1 with the pelvis at rest, given the relative reference computed here independently — v_rel = v − v_p − ω_p × r_f,
    // ω_rel = ω − ω_p, a_rel = a − α_p × r_f − ω_p × (ω_p × r_f) − 2ω_p × v_rel,f, α_rel = α − α_p − ω_p × ω_rel,f — so it resolves the same joint motion with the same discretisation of
    // J̇ẋ (step 1 mm); its static-frame finite-difference error is the D1's own. 1A's added error = (1A error in the moving frame) − (control error), per component, absolute
    const rfC = V.sub(K[I0].p[2], pel.c), vRelC = V.sub(V.sub(ref.vel, pel.v), V.cross(pel.w, rfC)), wRelC = V.sub(ref.w, pel.w);
    const accC = V.sub(V.sub(V.sub(ref.acc, V.cross(pel.al, rfC)), V.cross(pel.w, V.cross(pel.w, rfC))), V.sc(V.cross(pel.w, vRelC), 2)), alC = V.sub(V.sub(ref.al, pel.al), V.cross(pel.w, wRelC));
    const DC = C.swingAccWrench(st, ev, n, fr0, x, { vel: vRelC, w: wRelC, acc: accC, al: alC, vPel: [0, 0, 0] }, A, null); if (!DC) throw new Error("control failed");
    const kinC = (t) => { const ch = C.legChain(st, ev, n, fr0.pos, fr0.rot, null), y = x.map((v, i) => v + DC.xd[i] * t + 0.5 * DC.xdd[i] * t * t), P = ch.pose(y); return { R: P.R, p: P.p, c: P.R.map((R, i) => V.add(P.p[i], Q.rot(R, cOff[i]))) }; };
    const KC = [-4, -3, -2, -1, 0, 1, 2, 3, 4].map(j => kinC(j * h)), oC = (b, j) => d1((m) => logv(Q.mul(KC[I0 + j + m].R[b], Q.conj(KC[I0 + j].R[b]))));
    const errC = { v: V.sub(d1((m) => KC[I0 + m].p[2]), vRelC), a: V.sub(d2((m) => KC[I0 + m].p[2]), V.sub(accC, A)), w: V.sub(oC(2, 0), wRelC), al: V.sub(d1((m) => oC(2, m)), alC) };
    const err1 = { v: V.sub(vF, ref.vel), a: V.sub(aF, ref.acc), w: V.sub(wF, ref.w), al: V.sub(alF, ref.al) }, scl = { v: ref.vel, a: ref.acc, w: ref.w, al: ref.al };
    const eRaw = Math.max(relErr(vF, ref.vel), relErr(aF, ref.acc), relErr(wF, ref.w), relErr(alF, ref.al)), eCtl = Math.max(...["v", "a", "w", "al"].map(f => Math.hypot(...errC[f]) / Math.max(Math.hypot(...scl[f]), 1e-3)));
    const eb = Math.max(...["v", "a", "w", "al"].map(f => Math.hypot(...V.sub(err1[f], errC[f])) / Math.max(Math.hypot(...scl[f]), 1e-3))); out.b_max = Math.max(out.b_max, eb); if (eb > TOL) out.b_fail++;
    out.b_raw_max = Math.max(out.b_raw_max || 0, eRaw); out.b_ctl_max = Math.max(out.b_ctl_max || 0, eCtl);
    // (c) angular momentum of the distal subtree about the joint point at t = 0 (a fixed point), differentiated
    const Iw = (R, I, v) => { const l = Q.rot(Q.conj(R), v); return Q.rot(R, [0, 1, 2].map(i => I[i][0] * l[0] + I[i][1] * l[1] + I[i][2] * l[2])); };
    const Hk = (idx, j) => { let H = [0, 0, 0]; for (let b = idx; b < 3; b++) { const m = B[bodies[b]].mass, I = B[bodies[b]].inertia, cd = d1((q) => K[I0 + j + q].c[b]), w = omegaAt(b, j);
      H = V.add(H, V.add(V.cross(V.sub(K[I0 + j].c[b], K[I0].p[idx]), V.sc(cd, m)), Iw(K[I0 + j].R[b], I, w))); } return H; };
    let ec = 0; ks.forEach((k, idx) => { const dH = d1((j) => Hk(idx, j)); let comm = [0, 0, 0]; for (let b = idx; b < 3; b++) comm = V.add(comm, V.cross(V.sub(K[I0].c[b], K[I0].p[idx]), V.sc(A, B[bodies[b]].mass)));
      const Tfd = V.sub(dH, comm), e = Math.hypot(...V.sub(D.T[k], Tfd)) / Math.max(Math.hypot(...D.T[k]), 1e-3); ec = Math.max(ec, e); });
    // control for (c): the same momentum check of the control D1 in its static frame (frame at rest: its wrench is the full rate of change of the angular momentum; its residual = the
    // D1 discretisation of the segment accelerations along the same joint motion)
    const HkC = (idx, j) => { let H = [0, 0, 0]; for (let b = idx; b < 3; b++) { const m = B[bodies[b]].mass, I = B[bodies[b]].inertia, cd = d1((q) => KC[I0 + j + q].c[b]), w = oC(b, j);
      H = V.add(H, V.add(V.cross(V.sub(KC[I0 + j].c[b], KC[I0].p[idx]), V.sc(cd, m)), Iw(KC[I0 + j].R[b], I, w))); } return H; };
    let ec2 = 0, ecRaw = 0; ks.forEach((k, idx) => { const dH = d1((j) => Hk(idx, j)), dHC = d1((j) => HkC(idx, j)); let comm = [0, 0, 0];
      for (let b = idx; b < 3; b++) { comm = V.add(comm, V.cross(V.sub(K[I0].c[b], K[I0].p[idx]), V.sc(A, B[bodies[b]].mass))); }
      const r1 = V.sub(D.T[k], V.sub(dH, comm)), rC = V.sub(DC.T[k], dHC), sc = Math.max(Math.hypot(...D.T[k]), 1e-3); ecRaw = Math.max(ecRaw, Math.hypot(...r1) / sc); ec2 = Math.max(ec2, Math.hypot(...V.sub(r1, rC)) / sc); });
    out.c_raw_max = Math.max(out.c_raw_max || 0, ecRaw); ec = ec2;
    out.c_max = Math.max(out.c_max, ec); if (ec > TOL) out.c_fail++;
    if (eb > TOL || ec > TOL || !exact) out.worst.push({ human, n, ic, exact, eb, ec }); }
  s.destroy(); console.log(`${human}: cases ${out.cases} | (a) exact failures ${out.a_exact_fail} | (b) max ${out.b_max.toExponential(2)} | (c) max ${out.c_max.toExponential(2)}`); }
out.pass = out.a_exact_fail === 0 && out.b_fail === 0 && out.c_fail === 0;
console.log(`1A-0: ${out.pass ? "PASS" : "FAIL"} — ${out.cases} cases; (a) exact ${out.cases - out.a_exact_fail}/${out.cases}; (b) 1A's added error max ${out.b_max.toExponential(2)} (tol ${TOL}; raw ${out.b_raw_max.toExponential(2)}, control = the original D1's own ${out.b_ctl_max.toExponential(2)}); (c) 1A's added error max ${out.c_max.toExponential(2)} (tol ${TOL}; raw ${out.c_raw_max.toExponential(2)})`);
if (arg("json", "")) fs.writeFileSync(arg("json", ""), JSON.stringify(out, null, 1));

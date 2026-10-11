// IFM-1 shared library (Touchline_IFM1_Claude_Preregistration.md; inputs bound in IFM1_INPUTS.json at 7c4f4eaa). Read-only imports of the
// bound implementations; nothing in RUN-1 / V2 / R0 / RH1 / the simulation is modified. Every experiment parameter below is the preregistration's.
import fs from "fs"; import path from "path"; import vm from "vm"; import crypto from "crypto"; import { createRequire } from "module"; import { fileURLToPath } from "url";
const require = createRequire(import.meta.url);
export const HERE = path.dirname(fileURLToPath(import.meta.url)), RA = path.resolve(HERE, "../.."), ROOT = path.resolve(RA, "../.."), P2 = path.join(ROOT, "sandbox/visual/physchar2") + "/";
// ── frozen experiment parameters (prereg §4–§10) ──
export const IFM1 = Object.freeze({
  id: "IFM-1", h: 1 / 240, stepsPrimary: 12, stepsTotal: 36, v: 3.0, cyclesBefore: 3, gridN: 4096, bisect: 40,
  impactor: Object.freeze({ r: 0.060, m: 10.0, I: 0.0144, gap: 0.0005, approach: 3.0, rayMax: 1.0, bracketStep: 0.001, bisect: 60 }),
  groundLift: 0.0005, groundMax: 0.010,
  entry: Object.freeze({ anchorM: 1e-6, anchorVelMs: 1e-6, turfPenMm: 1, selfPenMm: 10, momentumReadbackNs: 0.01 }),
  c0Flat: Object.freeze({ minLoadedSteps: 6, minImpulseFracMgT: 0.25, maxSlipMm: 10, minPelvisFrac: 0.85 }),
  ledger: Object.freeze({ linStepNs: 0.01, linPrimaryNs: 0.05, angStepNms: 0.01, angPrimaryNms: 0.05, energyPrimaryJ: 0.5, energySecondaryJ: 5 }),
  integrity: Object.freeze({ anchorSepMm: 1, selfPenMm: 10, turfPenMm: 10 }),
  fidelity: Object.freeze({ posMm: 1, rotDeg: 0.5, velMs: 0.05, angVelRadS: 0.5, PNs: 0.05, LNms: 0.05 }),
  contact: Object.freeze({ minImpulseNs: 1e-3, witnessMm: 10, normalDeg: 15, adjacencyMm: 30 }),
  response: Object.freeze({ pointMm: 1, rotDeg: 0.1, oldVelMs: 0.2, oldDispMm: 30 }),
  equivalence: Object.freeze({ landmarkMm: 10, orientDeg: 3 }), weakChallengeFrac: 0.05,
  screenPx: 2, screenFrames: 2, render: Object.freeze({ leadInMs: 250, fps: 60, zoom: 1 }),
  record: Object.freeze({ timesMs: [1000 / 240, 25, 50, 100, 150] }) });
export const ROLES = Object.freeze([
  Object.freeze({ id: "SW", state: "S-FLAT", body: "shank_R", sub: 0, side: "R", kind: "shank", note: "RIGHT shank, halfway from knee to ankle" }),
  Object.freeze({ id: "PL", state: "S-FLAT", body: "shank_L", sub: 0, side: "L", kind: "shank", note: "LEFT shank, halfway from knee to ankle" }),
  Object.freeze({ id: "SH", state: "S-FLAT", body: "upperArm_L", sub: 0, side: "L", kind: "deltoid", note: "LEFT deltoid sphere (upperArm_L sub-shape 0, 'deltoid sphere')" }),
  Object.freeze({ id: "TP", state: "S-TOE", body: "shank_L", sub: 0, side: "L", kind: "shank", note: "LEFT shank, halfway from knee to ankle" })]);
export const BODIES = Object.freeze(["R0", "RH1"]);
export const sha256 = (x) => crypto.createHash("sha256").update(typeof x === "string" ? x : Buffer.from(x)).digest("hex");
export const hashNums = (arr) => { const f = new Float64Array(arr.length); arr.forEach((x, i) => { f[i] = x; }); return sha256(new Uint8Array(f.buffer)).slice(0, 16); };
// ── bound V2 / mapper modules (read-only) ──
export const { V, Q } = await import(P2 + "core/v2_math.js");
export const { generateSpec, specHash } = await import(P2 + "spec/v2_spec.js");
export const { pi1RunnerSpec } = await import(P2 + "spec/v2_pi1_runner.js");
export const { pi1RunnerRH1Spec } = await import(P2 + "spec/v2_pi1_runner_rh.js");
export const { decompose, pyr, anatomicalAngles } = await import(P2 + "spec/v2_joints.js");
export const MC = await import(P2 + "map/v2_lv2_map.js");
export const CL = await import(path.join(RA, "pi1/scripts/compat_lib.mjs"));   // frozen PCG geometry: sdShape, supportOf, gjk, bodyLowest
export const SPECS = { R0: () => pi1RunnerSpec(), RH1: () => pi1RunnerRH1Spec() };
// ── RUN-1 (frozen tag archive) ──
export function loadLV2(arch = process.env.LV2_ARCHIVE) {
  if (!arch) throw new Error("LV2_ARCHIVE (git archive of locomotion-v2-straight-baseline-1) required");
  const { loadRun1 } = require(path.join(arch, "sandbox/visual/run1/tools/run1_load.cjs")), X = loadRun1({ extra: ["run1/lv2_state.js"] });
  return { X, LV: vm.runInContext("LV2_STATE", X.ctx), E: X.RUN1_V13, arch };
}
// the frozen viewer's single-lane "across" mover (run1_viewer.js rv1Path / rv1Sim with lane offset 0, constant speed): heading 0, y 36 m, x0 = 52.5 − v·9/2
export const TRAJ = Object.freeze({ heading: 0, y: 36, x0: 52.5 - IFM1.v * 9.0 / 2, v: IFM1.v, source: "run1_viewer.js rv1Path / rv1Sim (dir across, single lane, RV1_LOOP 9 s), constant speed" });
export const simAt = (t) => ({ x: TRAJ.x0 + TRAJ.v * t, y: TRAJ.y, heading: TRAJ.heading, v: TRAJ.v, vx: TRAJ.v, vy: 0, a: 0, yawRate: 0 });
export const vOf = () => IFM1.v;
export function makeActor(L) { const sk = Object.assign({}, L.X.charSkel("vinicius")); delete sk._r1body; return { sk, A: L.E.r1Make(sk) }; }
export function rigOf(L) { const SK = Object.assign({}, L.X.charSkel("vinicius")); delete SK._r1body; const bindW = L.X.skelFK(SK, {}, L.X.M4.ident()).world.map(m => Array.from(m));
  return { SK, bindW, RIG: { bones: SK.bones.map(b => ({ name: b.name, parent: b.parent ? b.parent.name : null })), bind: bindW } }; }
// ── geometry ──
export const shapeWorld = (s, st) => ({ p: V.add(st.pos, Q.rot(st.rot, s.pos)), q: Q.norm(Q.mul(st.rot, s.rot)) });
// exact closest point / outward normal on a sphere or a Jolt tapered capsule (convex hull of top sphere rTop at +half, bottom sphere rBot at −half, local y)
export function closestOnSwept(s, st, c) {
  const X = shapeWorld(s, st), l = Q.rot(Q.conj(X.q), V.sub(c, X.p));
  let pl, nl;
  if (s.type === "sphere") { const n = V.len(l); nl = n > 1e-15 ? V.sc(l, 1 / n) : [1, 0, 0]; pl = V.sc(nl, s.r); }
  else if (s.type === "tapered" || s.type === "capsule") {
    const rT = s.type === "capsule" ? s.r : s.rTop, rB = s.type === "capsule" ? s.r : s.rBot, h = 2 * s.half, rr = Math.hypot(l[0], l[2]), y = l[1] + s.half;   // round cone: bottom (rB) at y' = 0, top (rT) at y' = h
    const er = rr > 1e-15 ? [l[0] / rr, 0, l[2] / rr] : [1, 0, 0], b = (rB - rT) / h, a = Math.sqrt(1 - b * b), k = -b * rr + a * y;
    const toSphere = (cy, R) => { const d = [l[0], l[1] - cy, l[2]], n = V.len(d); const u = n > 1e-15 ? V.sc(d, 1 / n) : [0, 1, 0]; return { n: u, p: V.add([0, cy, 0], V.sc(u, R)) }; };
    if (k < 0) ({ n: nl, p: pl } = toSphere(-s.half, rB));
    else if (k > a * h) ({ n: nl, p: pl } = toSphere(s.half, rT));
    else { const nr = a, ny = b; nl = V.add(V.sc(er, nr), [0, ny, 0]); const dist = rr * a + y * b - rB; pl = V.sub(l, V.sc(nl, dist)); }
  } else throw new Error("closestOnSwept: " + s.type);
  return { p: V.add(X.p, Q.rot(X.q, pl)), n: Q.rot(X.q, nl) };
}
// signed distance from point c to a receiver shape (the frozen PCG sdShape: exact for swept shapes, GJK for box / hull)
export const sdist = (s, st, c) => CL.sdShape(s, st, c);
// generic body–body separation over allowed pairs (compat_lib.bodySep logic with the given spec's bodies)
export function bodySepGeneric(spec, S, i, j) { let best = { d: Infinity };
  for (let a = 0; a < spec.bodies[i].shapes.length; a++) for (let b = 0; b < spec.bodies[j].shapes.length; b++) { const g = CL.gjk(CL.supportOf(spec.bodies[i].shapes[a], S[i]), CL.supportOf(spec.bodies[j].shapes[b], S[j]));
    let d = g.overlap ? 0 : g.d; if (d < best.d) best = { d, a, b }; } return best; }
export const comWorld = (spec, S, i) => V.add(S[i].pos, Q.rot(S[i].rot, spec.bodies[i].comLocal));
export const velAt = (st, com, p) => V.add(st.v, V.cross(st.w, V.sub(p, com)));
// ── joint coordinates (spec/v2_joints.js pyramid parameterisation; passive layer q = F1⁻¹·R1⁻¹·R2·F2) ──
export const qcs = (j, R1, R2) => Q.norm(Q.mul(Q.conj(j.F1), Q.mul(Q.conj(R1), Q.mul(R2, j.F2))));
export const coordsOf = (q) => { const d = decompose(q); return [d.tw, d.sy, d.sz]; };
// body-frame angular velocity Jacobian of pyr(tw, sy, sz) = qs(sy, sz) ⊗ qt(tw): ω_body = M · ȧ (exact, analytic)
export function pyrJac(a) {
  const [tw, sy, sz] = a, qt = Q.axis([1, 0, 0], tw), Ty = Math.tan(sy / 2), Tz = Math.tan(sz / 2), n = [0, Ty, Tz, 1], nn = Math.hypot(...n), qs = n.map(x => x / nn);
  const col = (dn) => { const dot = qs[0] * dn[0] + qs[1] * dn[1] + qs[2] * dn[2] + qs[3] * dn[3], dqs = dn.map((x, i) => (x - qs[i] * dot) / nn), wq = Q.mul(Q.conj(qs), dqs); return Q.rot(Q.conj(qt), [2 * wq[0], 2 * wq[1], 2 * wq[2]]); };
  const cy = col([0, 0.5 / (Math.cos(sy / 2) ** 2), 0, 0]), cz = col([0, 0, 0.5 / (Math.cos(sz / 2) ** 2), 0]);
  return [[1, cy[0], cz[0]], [0, cy[1], cz[1]], [0, cy[2], cz[2]]];   // columns: ∂ω/∂(tw), ∂ω/∂(sy), ∂ω/∂(sz)
}
export const mat3vec = (M, x) => [0, 1, 2].map(i => M[i][0] * x[0] + M[i][1] * x[1] + M[i][2] * x[2]);
export function solve3(M, b) { const d = (A) => A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
  const D = d(M); if (Math.abs(D) < 1e-14) throw new Error("singular pyramid Jacobian"); return [0, 1, 2].map(c => d(M.map((r, i) => r.map((x, k) => (k === c ? b[i] : x)))) / D); }
// ── contact impulse reconstruction from the Jolt 5.6.0 manifold cache (IFM1_INPUTS.json instrumentation.joltSource.reconstruction) ──
// pre: per Jolt body-id value → { com, rot } at constraint setup (pre-step centre-of-mass transform); returns per-manifold impulses (body2 +, body1 −)
export function normalizedPerpendicular(n) { return Math.abs(n[0]) > Math.abs(n[1]) ? (() => { const l = Math.hypot(n[0], n[2]); return [n[2] / l, 0, -n[0] / l]; })() : (() => { const l = Math.hypot(n[1], n[2]); return [0, n[2] / l, -n[1] / l]; })(); }
export function manifoldImpulses(dec, pre) {
  const out = [];
  for (const pr of dec.pairs) for (const m of pr.manifolds) {
    const b1 = pre[m.key.body1], b2 = pre[m.key.body2]; if (!b1 || !b2) throw new Error(`unknown body id in contact cache ${m.key.body1} / ${m.key.body2}`);
    const n = V.norm(Q.rot(b2.rot, m.normal));
    const pts = m.points.map(p => { const p1 = V.add(b1.com, Q.rot(b1.rot, p.p1)), p2 = V.add(b2.com, Q.rot(b2.rot, p.p2)); return { p1, p2, p: V.sc(V.add(p1, p2), 0.5), lam: p.lambda }; });
    const f = pts.length ? V.sc(pts.reduce((s, x) => V.add(s, x.p), [0, 0, 0]), 1 / pts.length) : null, t1 = normalizedPerpendicular(n), t2 = V.cross(n, t1);
    const Jf = V.add(V.sc(t1, m.friction[0]), V.sc(t2, m.friction[1])), Jn = pts.reduce((s, x) => V.add(s, V.sc(n, x.lam)), [0, 0, 0]);
    out.push({ key: m.key, n, t1, t2, points: pts, frictionPoint: f, Jn, Jf, J2: V.add(Jn, Jf), angFriction: pts.length > 1 ? m.angFriction : 0, couple2: V.sc(n, pts.length > 1 ? m.angFriction : 0),
      // moments of the impulse on body 2 about a point O: Σ (p_k − O) × λ_k n + (f − O) × Jf + couple
      momentAbout: (O) => V.add(V.add(pts.reduce((s, x) => V.add(s, V.cross(V.sub(x.p, O), V.sc(n, x.lam))), [0, 0, 0]), f ? V.cross(V.sub(f, O), Jf) : [0, 0, 0]), V.sc(n, pts.length > 1 ? m.angFriction : 0)) });
  }
  return out;
}
// geodesic angle between two orientations, stable for small angles (correction C1/C2: 2·acos(|dot|) loses ~1e-4 rad near identity for float32-rounded quaternions)
export const qangRad = (a, b) => { const d = Q.mul(Q.conj(Q.norm(a)), Q.norm(b)), v = Math.hypot(d[0], d[1], d[2]); return 2 * Math.atan2(v, Math.abs(d[3])); };
export const r6 = (x) => (x == null || !Number.isFinite(x) ? x : +x.toFixed(6)), rv6 = (v) => v.map(r6);

// occupy3b/tools/l3_unit.mjs — §3 / §18 THE INVARIANTS of the limb layer (occupy3b/l3_limb.js, the pure mechanics), and its drawing:
//   ROTATION: a contact configuration (the canonical body's real leg geometry, recorded) and the same configuration rotated 37° / 90° / 180° about
//     the vertical — every impulse λ equal, every impulse vector rotated, the limbs' DOF responses equal (they live in the body's own frame)
//   MIRROR: the configuration reflected (y → −y, the left and right legs exchanged) — λ equal, the impulses and the limbs' point velocities mirrored
//   ENERGY: N random configurations — no contact application ends with more relative normal kinetic energy than it began with
//   BOUND: no λ above its closing's (−v_n / (w_A + w_B)) · PAIRING: every application's two impulses sum to zero
//   DETERMINISM: the same configuration solved twice — bit-identical
//   THE DRAWING: in a recorded encounter, every perturbed leg as the canonical forward kinematics drew it (LimbBody) against the limb layer's own
//     model of it (legPose on the authored leg) — the joints agree (Float32 precision of the skinning matrices)
//   node l3_unit.mjs [--n 2000]
import { ENV, runO3, arg, setOf } from "./l3_common.mjs";
import * as LM from "../l3_limb.js";
const N = +arg("n", 2000), X = Object.assign({}, LM.RES3B); X.limRad = X.lim.map((d) => d * Math.PI / 180);
const MF = ENV.body.massFrac, m = 73, masses = { thigh: MF.thigh_R * m, shin: MF.shin_R * m, foot: MF.foot_R * m };
// (a pool of REAL authored legs: the flagship and a Croqueta, every 5th tick, both players, both legs, with each pose's facing)
const pool = []; for (const id of ["side", "croq-leg", "headon-jog"]) { const R = runO3(ENV, setOf("l3").find((x) => x.id === id), "S3B", { record: true }); for (const [k, F] of R.W.frames) { if (k % 5) continue; for (const P of [F.a, F.d]) for (const Xs of ["R", "L"]) { const J = P.J; pool.push({ psi: P.psi, auth: { H: J["thigh_" + Xs].j, K: J["shin_" + Xs].j, A: J["foot_" + Xs].j, B: J["toe_" + Xs].j, T: J["toe_" + Xs].t }, X: Xs }); } } }
let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const legOf = (s, who, q, qd) => { const leg = { who, X: s.X, q: q.slice(), qd: qd.slice(), auth: s.auth, fr: LM.frameOf(s.psi) }; leg.P = LM.legPose(leg.auth, leg.q, leg.fr); leg.MM = LM.massOf(leg.P, masses); return leg; };
// one configuration: two legs (A's limb against B's limb or B's body), a contact point between their shins, a horizontal normal, velocities
function config() { const a = pool[Math.floor(rnd() * pool.length)], b = pool[Math.floor(rnd() * pool.length)], q = () => [0, 1, 2].map((i) => (rnd() - 0.5) * X.limRad[i] * 1.2), qd = () => [0, 1, 2].map(() => (rnd() - 0.5) * 6);
  const ang = rnd() * 2 * Math.PI, n = [Math.cos(ang), Math.sin(ang), 0], seg = ["THIGH", "SHIN", "FOOT"][Math.floor(rnd() * 3)], u = 0.2 + 0.6 * rnd(), bodyB = rnd() < 0.4;
  return { a: { s: a, q: q(), qd: qd() }, b: { s: b, q: q(), qd: qd() }, n, seg, u, bodyB, vA: [(rnd() - 0.5) * 8, (rnd() - 0.5) * 8, 0], vB: [(rnd() - 0.5) * 8, (rnd() - 0.5) * 8, 0], wb: 1 / (30 + 40 * rnd()), wh: 1 / (40 + 40 * rnd()), held: rnd() < 0.3 }; }
function solve(cf) { const LA = legOf(cf.a.s, "ATT", cf.a.q, cf.a.qd), LB = legOf(cf.b.s, "DEF", cf.b.q, cf.b.qd), xA = LM.pointOf(LA.P, cf.seg, cf.u);
  const wh = X.artMass ? cf.wh : 0, A = { kind: "LIMB", who: "ATT", leg: LA, seg: cf.seg, x: xA, vBase: cf.vA, vBody: cf.vA, wBody: cf.wb, wHip: wh }, B = cf.bodyB ? { kind: "BODY", who: "DEF", x: xA, w: cf.wb, vBase: cf.vB, vBody: cf.vB } : { kind: "LIMB", who: "DEF", leg: LB, seg: cf.seg, x: xA, vBase: cf.vB, vBody: cf.vB, wBody: cf.wb, wHip: wh };
  const C = [{ key: "k", n: cf.n, pen: 0.03, A, B, held: cf.held }], out = LM.solveContacts(C, X); return { out, LA, LB }; }
// the transforms: a rotation about the vertical through the origin, the mirror y → −y (the legs' sides exchanged)
const rotP = (p, th) => [p[0] * Math.cos(th) - p[1] * Math.sin(th), p[0] * Math.sin(th) + p[1] * Math.cos(th), p[2]], mirP = (p) => [p[0], -p[1], p[2]];
const tfLeg = (s, f, dpsi, flip) => ({ psi: flip ? -s.psi : s.psi + dpsi, X: flip ? (s.X === "R" ? "L" : "R") : s.X, auth: Object.fromEntries(Object.entries(s.auth).map(([k, v]) => [k, f(v)])) });
function transformed(cf, f, dpsi, flip) { const qf = (q) => (flip ? [-q[0], q[1], -q[2]] : q.slice()); return Object.assign({}, cf, { a: { s: tfLeg(cf.a.s, f, dpsi, flip), q: qf(cf.a.q), qd: qf(cf.a.qd) }, b: { s: tfLeg(cf.b.s, f, dpsi, flip), q: qf(cf.b.q), qd: qf(cf.b.qd) }, n: f(cf.n), vA: f(cf.vA), vB: f(cf.vB) }); }
for (const art of [false, true]) { X.artMass = art; seed = 12345; globalThis._rx = 0; globalThis._mx = 0;
let maxE = -Infinity, maxB = -Infinity, maxP = 0, nApp = 0, rot = 0, mir = 0, det = 0, nCheck = 0, tan = 0, tanMax = 0;
for (let i = 0; i < N; i++) { const cf = config(), r0 = solve(cf), r1 = solve(cf);
  // (THE TANGENTIAL TEST: both sides' velocities given a purely tangential addition — horizontal across the normal and vertical, up to 5 m/s —
  // the impulses and the limbs' responses must not change)
  { const sA = (rnd() - 0.5) * 10, sB = (rnd() - 0.5) * 10, tA = [-cf.n[1] * sA, cf.n[0] * sA, (rnd() - 0.5) * 10], tB = [-cf.n[1] * sB, cf.n[0] * sB, (rnd() - 0.5) * 10];
    const rt = solve(Object.assign({}, cf, { vA: LM.add(cf.vA, tA), vB: LM.add(cf.vB, tB) })), dl = Math.abs(rt.out.apps.reduce((a, x) => a + x.lam, 0) - r0.out.apps.reduce((a, x) => a + x.lam, 0)), dq = Math.max(...rt.LA.qd.map((v, j) => Math.abs(v - r0.LA.qd[j])));
    tanMax = Math.max(tanMax, dl, dq); if (dl > 1e-9 || dq > 1e-9) tan++; }
  if (JSON.stringify(r0.out.apps) !== JSON.stringify(r1.out.apps) || JSON.stringify(r0.LA.qd) !== JSON.stringify(r1.LA.qd)) det++;
  for (const a of r0.out.apps) { nApp++; maxE = Math.max(maxE, a.keAfter - a.keBefore); maxB = Math.max(maxB, a.lam - a.src); maxP = Math.max(maxP, LM.len(LM.add(a.JA, a.JB))); }
  const lam0 = r0.out.apps.map((a) => a.lam), J0 = r0.out.body.map((b) => b.J), sumL = (o) => o.apps.reduce((a, x) => a + x.lam, 0), sumJ = (o, who) => o.body.filter((b) => b.who === who).reduce((g, b) => LM.add(g, b.J), [0, 0, 0]);
  for (const th of [37, 90, 180].map((d) => d * Math.PI / 180)) { const r = solve(transformed(cf, (p) => rotP(p, th), th, false)); nCheck++;
    const dl = Math.abs(sumL(r.out) - sumL(r0.out)), dJ = Math.max(LM.len(LM.sub(sumJ(r.out, "ATT"), rotP(sumJ(r0.out, "ATT"), th))), LM.len(LM.sub(sumJ(r.out, "DEF"), rotP(sumJ(r0.out, "DEF"), th)))), dq = Math.max(...r.LA.qd.map((v, j) => Math.abs(v - r0.LA.qd[j])));
    if (dl > 1e-9 || dJ > 1e-9 || dq > 1e-9) { rot++; if (!globalThis._rx) { globalThis._rx = 1; console.log("  (first rotation difference: λ", dl, "J", dJ, "q̇", dq, ")"); } } }
  { const r = solve(transformed(cf, mirP, 0, true)); nCheck++; const dl = Math.abs(sumL(r.out) - sumL(r0.out)), dJ = Math.max(LM.len(LM.sub(sumJ(r.out, "ATT"), mirP(sumJ(r0.out, "ATT")))), LM.len(LM.sub(sumJ(r.out, "DEF"), mirP(sumJ(r0.out, "DEF")))));
    const pv = (L) => LM.vOf(LM.jacOf(L.P, cf.seg, LM.pointOf(L.P, cf.seg, cf.u)), L.qd), dv = LM.len(LM.sub(pv(r.LA), mirP(pv(r0.LA))));
    if (dl > 1e-9 || dJ > 1e-9 || dv > 1e-9) { mir++; if (!globalThis._mx) { globalThis._mx = 1; console.log("  (first mirror difference: λ", dl, "J", dJ, "v", dv, ")"); } } } }
console.log(`\n§3 / §18 THE LIMB LAYER's INVARIANTS — ${art ? "WITH THE ARTICULATED EFFECTIVE MASS (artMass: the limb's own + its body's at the hip)" : "the limb's own effective mass (hip held)"} — ${N} random configurations from ${pool.length} recorded authored legs (the canonical body), ${nApp} contact applications`);
console.log(`  ENERGY: the largest change of the pair's relative normal kinetic energy by an application ${maxE.toExponential(2)} J (≤ 0: no passive energy gain)`);
console.log(`  BOUND: the largest λ above its closing's bound ${maxB.toExponential(2)} N·s · PAIRING: the largest sum of an application's two impulses ${maxP.toExponential(2)} N·s`);
console.log(`  ROTATION (37° / 90° / 180°): configurations whose total λ, each player's impulse (rotated) or DOF responses differ by > 1e-9: ${rot} / ${3 * N}`);
console.log(`  MIRROR (y → −y, the legs' sides exchanged): configurations whose total λ, each player's impulse or the limb's point velocity (mirrored) differ by > 1e-9: ${mir} / ${N}`);
console.log(`  DETERMINISM: configurations solved twice that differ at all: ${det} / ${N}`);
console.log(`  TANGENTIAL: configurations whose total λ or limb response changes when both sides gain a purely tangential velocity (≤ 5 m/s each axis): ${tan} / ${N} (largest change ${tanMax.toExponential(1)})`); }
// ── THE DRAWING: the canonical FK's perturbed legs against the limb layer's own model ──
{ let n = 0, worst = 0; for (const id of ["side", "headon-jog", "croq-leg", "in-croq", "oblique-firm"]) { const R = runO3(ENV, setOf("l3").find((x) => x.id === id), "S3B", { record: true });
    for (const [k, F] of R.W.frames) for (const P of [F.a, F.d]) { if (!P.legAuth || !P.limbQ) continue; for (const Xs of ["R", "L"]) { const q = P.limbQ[Xs]; if (!q || !q.some((v) => v)) continue; n++;
      const M = LM.legPose(P.legAuth[Xs], q, LM.frameOf(P.psi)), J = P.J; for (const [a, b] of [[M.K, J["shin_" + Xs].j], [M.A, J["foot_" + Xs].j], [M.B, J["toe_" + Xs].j], [M.T, J["toe_" + Xs].t]]) worst = Math.max(worst, LM.len(LM.sub(a, b))); } } }
  console.log(`  THE DRAWING: ${n} perturbed legs drawn by the canonical forward kinematics (knee, ankle, ball of the foot, toe) against the limb layer's model: largest difference ${(worst * 1000).toFixed(4)} mm`); }

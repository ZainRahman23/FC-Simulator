// ═══ physchar2/tools/v2_component_regressions.mjs — PERMANENT component regressions for the three controller-symmetry corrections
// (user decision 2026-10-04, sources/2026-10-04_user_decision_option1_controller_symmetry.md). Never remove; run before any G2 / G3 / G4 validation.
//   R1 usable foot regions (§1): the boot geometry is mirror-identical; the canonical hull / inset region of the right boot is the exact mirror of
//      the left one (every body variant); the region area is preserved vs the former construction (no CoP-area loss); construction is deterministic.
//   R2 quaternion handling (§3): every Jolt-sourced orientation is unit length (‖q‖² − 1 ≤ 1e-15: a correctly rounded 4-term norm); normalisation removes only numerical error (no material orientation
//      change); mirrored states give exactly corresponding L/R joint axes; no NaN / degenerate behaviour near identity or 180°; deterministic.
//   R3 leg-IK mirror-equivariance (§2): the production legIK, on real and reach-boundary problems of several morphologies, and on their exact mirror
//      images (other leg): identical reachability classification, mirrored solutions (reachable ≤ 1e-12 m, unreachable ≤ 1e-6 m), reachable
//      targets solved to ≤ 1e-12, unreachable ones reported (residual > 1e-6), the target never moved.
//   R4 opt-in BOUNDED leg IK (overnight Phase C; o.ikBounds, NOT adopted): off by default; every solution inside the anatomical hard limits;
//      identical to the unconstrained IK wherever that one's solution is anatomically valid; anatomically invalid targets either solved on a valid
//      branch or reported unreachable; L/R mirror-equivariant (with the σ coordinate correspondence); the target never moved; the unreached
//      fallback is the box-constrained optimum (Newton refinement; KKT gated).
//   R5 posture-IK twist semantics (pre-G4 runway; DIAGNOSTIC options, none adopted): the options are off by default; ikTwistBlend 0 ≡ the validated
//      "current" form and 1 ≡ ikRefTwist bit for bit; the defining mechanism measurement — under "current" the hip-rotation IK target FOLLOWS
//      the leg twist (slope ≈ −1: the twist direction has zero restoring stiffness, the root of the actuator-powered twist limit cycle), under
//      a reference target it does not (≈ 0). Static (no simulation step).
//   R6 reachability-certificate soundness (pre-G4 runway; research instrumentation tools/ik_cert_core.mjs, no controller dependency): the
//      Lipschitz rate claims hold on random box points (hip / knee position rate ≤ lever, ankle coordinates do not move the ankle centre,
//      orientation rate ≤ 1); no cell containing a known anatomical solution is ever pruned; a known invalid target is certified
//      PROVEN-INFEASIBLE, and the same target made feasible by moving the held knee axial twist is NOT; the 8-D (twist-free) chain equals the
//      production legChain bit for bit at the held twist values; the opt-in TIGHT twist levers (8-D) also satisfy their rate claims.
//      Static (no simulation step after the state capture).
//   R7 G3 → G4 support / contact lifecycle (final pre-E1a stage; ctrl/v2_support.js, EXPERIMENTAL option lifecycle, default OFF): synthetic
//      sensor sequences (no simulation) — contact flicker never confirms AIRBORNE and leaves the control weights untouched; liftoff is debounced
//      and the weights move continuously (bounded per-tick change); a touchdown impact without intent is not support, intent + contact is;
//      a load reading contaminated by self-contact is ignored; the contact anchor is captured on the turf, frozen in the air and re-captured
//      flat at touchdown; low load does not release a wanted foot; deterministic with an exact getState / setState round trip; a commanded
//      swing target replaces the anchor; the option is off by default and leaves the default controller state without a key.
// usage: node tools/v2_component_regressions.mjs [--json=<out>]     exit code 1 on any failure
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt, unitQ } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G2Sim } from "../gates/v2_g2.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { G1Sim } from "../gates/v2_g1.js"; import { STAND, insetPoly, insidePoly, clampPoly, usableRegion, IK } from "../ctrl/v2_stand.js";
import { bootSole, hull2, hull2Canonical } from "../sim/v2_geom.js"; import { pyr, decompose, ankleNeutralKPerDeg, setAnkleNeutralKOverride, PASSIVE as PASSIVE_SPEC } from "../spec/v2_joints.js"; import { V, Q, unitStates, unitEv, dnorm as dn } from "../core/v2_math.js"; import { certLevers, branchAndBound, knownSolutionPath, chain8 } from "./ik_cert_core.mjs"; import { SupportLifecycle, LIFECYCLE } from "../ctrl/v2_support.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), results = [];
const check = (id, name, pass, value) => { results.push({ id, name, pass: !!pass, value }); console.log(`${pass ? "PASS" : "FAIL"} ${id.padEnd(6)} ${name}: ${value}`); };
const m3 = (p) => [-p[0], p[1], p[2]], mq = (q) => [q[0], -q[1], -q[2], q[3]], mw = (w) => [w[0], -w[1], -w[2]], e = (x) => (+x).toExponential(2);
const lr = (n) => (n.endsWith("_L") ? n.slice(0, -2) + "_R" : n.endsWith("_R") ? n.slice(0, -2) + "_L" : n);
const area = (P) => { let A = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; A += p[0] * q[1] - q[0] * p[1]; } return A / 2; };
const cen = (P) => { let A = 0, x = 0, z = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length], c = p[0] * q[1] - q[0] * p[1]; A += c; x += (p[0] + q[0]) * c; z += (p[1] + q[1]) * c; } return [x / (3 * A), z / (3 * A)]; };
const segD = (p, a, b) => { const ex = b[0] - a[0], ez = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ez) / (ex * ex + ez * ez))); return Math.hypot(p[0] - a[0] - t * ex, p[1] - a[1] - t * ez); };
const haus = (P, R) => Math.max(...P.map(p => Math.min(...R.map((a, i) => segD(p, a, R[(i + 1) % R.length])))), ...R.map(p => Math.min(...P.map((a, i) => segD(p, a, P[(i + 1) % P.length])))));
// ── R1 usable foot regions (final construction: usableRegion = canonical hull → radial inset → canonical convex hull) ──
{ let ptMis = 0, vtxMis = 0, cntMis = 0, regH = 0, regA = 0, regC = 0, areaMin = Infinity, areaMax = 0, outside = 0, legacyH = 0, det = true, reflexN = 0, wrongIn = 0, lip = 0, inv = 0;
  const reflex = (P) => P.filter((p, i) => { const a = P[(i - 1 + P.length) % P.length], b = P[(i + 1) % P.length]; return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) < -1e-15; }).length;
  const winding = (P, q) => { let w = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; if (a[1] <= q[1]) { if (b[1] > q[1] && (b[0] - a[0]) * (q[1] - a[1]) - (q[0] - a[0]) * (b[1] - a[1]) > 0) w++; } else if (b[1] <= q[1] && (b[0] - a[0]) * (q[1] - a[1]) - (q[0] - a[0]) * (b[1] - a[1]) < 0) w--; } return w !== 0; };
  for (const h of VARIATION_SET) { const spec = generateSpec(h), B = spec.bodies, fL = B.find(b => b.name === "foot_L"), fR = B.find(b => b.name === "foot_R"), sL = bootSole(fL), sR = bootSole(fR);
    for (const p of sL.pts) ptMis = Math.max(ptMis, Math.min(...sR.pts.map(q => Math.hypot(p[0] + q[0], p[1] - q[1], p[2] - q[2]))));
    const rL = usableRegion(sL.pts, STAND.footInset), rR = usableRegion(sR.pts, STAND.footInset), rRm = rR.map(([x, z]) => [-x, z]).reverse(); if (rL.length !== rR.length) cntMis++;
    for (const p of rL) vtxMis = Math.max(vtxMis, Math.min(...rRm.map(q => Math.hypot(p[0] - q[0], p[1] - q[1]))));
    regH = Math.max(regH, haus(rL, rRm)); regA = Math.max(regA, Math.abs(area(rL) - area(rRm)) / area(rL)); const a = cen(rL), b = cen(rRm); regC = Math.max(regC, Math.hypot(a[0] - b[0], a[1] - b[1]));
    for (const [s, r] of [[sL, rL], [sR, rR]]) { const old = insetPoly(hull2(s.pts), STAND.footInset), dA = (area(r) - area(old)) / area(old); areaMin = Math.min(areaMin, dA); areaMax = Math.max(areaMax, dA);
      outside = Math.max(outside, ...old.map(p => (insidePoly(r, p) ? 0 : Math.min(...r.map((q, i) => segD(p, q, r[(i + 1) % r.length]))))));   // the former region lies inside the corrected one
      reflexN += reflex(r); let xmin = Infinity, xmax = -Infinity, zmin = Infinity, zmax = -Infinity; for (const [x, z] of r) { xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); }
      for (let x = xmin - 0.003; x <= xmax + 0.003; x += 0.001) for (let z = zmin - 0.003; z <= zmax + 0.003; z += 0.001) if (insidePoly(r, [x, z]) !== winding(r, [x, z])) wrongIn++;
      const c = [(xmin + xmax) / 2, (zmin + zmax) / 2]; for (const R of [0.07, 0.15]) { let prev = null, prevT = null; const N = Math.round(2 * Math.PI * R / 0.0001); for (let k = 0; k <= N; k++) { const ang = 2 * Math.PI * k / N, t = [c[0] + R * Math.cos(ang), c[1] + R * Math.sin(ang)], q = clampPoly(r, t); if (prev) lip = Math.max(lip, Math.hypot(q[0] - prev[0], q[1] - prev[1]) / Math.hypot(t[0] - prevT[0], t[1] - prevT[1])); prev = q; prevT = t; } }
      const C = hull2Canonical(s.pts), extra = C.flatMap((p, i) => { const q = C[(i + 1) % C.length]; return [0.25, 0.5, 0.75].map(tt => [p[0] + tt * (q[0] - p[0]), s.y0, p[1] + tt * (q[1] - p[1])]); });
      for (const pts of [[...s.pts, ...extra], s.pts.slice().reverse(), s.pts.map(p => p.map(v => v * (1 + 2e-16)))]) inv = Math.max(inv, haus(usableRegion(pts, STAND.footInset), r)); }
    legacyH = Math.max(legacyH, haus(insetPoly(hull2(sL.pts), STAND.footInset), insetPoly(hull2(sR.pts), STAND.footInset).map(([x, z]) => [-x, z]).reverse()));
    if (JSON.stringify(usableRegion(sL.pts, STAND.footInset)) !== JSON.stringify(rL)) det = false; }
  check("R1.a", "boot sole geometry mirror-identical L vs R (all 8 bodies)", ptMis === 0, `max point mismatch ${e(ptMis)} m`);
  check("R1.b", "usable regions are mirror images (vertex count, vertices)", cntMis === 0 && vtxMis <= 1e-15, `count mismatches ${cntMis}, max vertex mismatch ${e(vtxMis)} m`);
  check("R1.c", "usable regions are mirror images (boundary, area, centroid)", regH <= 1e-12 && regA <= 1e-12 && regC <= 1e-12, `Hausdorff ${e(regH)} m, area ${e(regA)} rel, centroid ${e(regC)} m  (former construction: Hausdorff ${e(legacyH)} m)`);
  check("R1.d", "no CoP-area loss: the corrected region contains the former one", outside <= 1e-12 && areaMin >= 0, `former region outside the corrected one by ≤ ${e(outside)} m; area change +${(areaMin * 100).toFixed(2)} … +${(areaMax * 100).toFixed(2)} %`);
  check("R1.e", "deterministic construction", det, det ? "bit-identical" : "differs");
  check("R1.f", "strictly convex: no reflex vertex; insidePoly exact (winding) on a 1 mm grid", reflexN === 0 && wrongIn === 0, `reflex vertices ${reflexN}, inside-test disagreements ${wrongIn}`);
  check("R1.g", "CoP projection onto the region is 1-Lipschitz (continuous boundary behaviour)", lip <= 1 + 1e-6, `max |Δ projection| / |Δ target| ${lip.toFixed(6)}`);
  check("R1.h", "invariant to the sampling of the same outline (extra collinear points, order, 1e-15 perturbation)", inv <= 1e-12, `max region change ${e(inv)} m`); }
// ── R2 quaternion handling (final scope: normalisation at the controller-side boundary only; the passive plant is untouched) ──
{ let maxN = 0, maxDir = 0, nan = 0; const special = [[0, 0, 0, 1], [1e-12, 0, 0, 1], [0, 0, 0, -1], [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 1e-12], [0.70710678, 0, 0, 0.70710678], [0.5, 0.5, 0.5, 0.5]];
  let s = 12345; const rnd = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
  const sample = []; for (let i = 0; i < 20000; i++) { let q = [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]; const l = Math.hypot(...q); q = q.map(v => v / l); const d = 1 + (rnd() - 0.5) * 6e-7; sample.push(q.map(v => v * Math.sqrt(d))); }
  for (const q of [...special.map(q => { const l = Math.hypot(...q); return q.map(v => v / l * (1 + 1e-7)); }), ...sample]) { const u = Q.norm(q); if (u.some(v => !Number.isFinite(v))) nan++;
    maxN = Math.max(maxN, Math.abs(u[0] * u[0] + u[1] * u[1] + u[2] * u[2] + u[3] * u[3] - 1)); const l = Math.hypot(...q), r = q.map(v => v / l); maxDir = Math.max(maxDir, Math.max(...r.map((v, i) => Math.abs(v - u[i])))); }
  let threw = false; try { unitQ(0, 0, 0, 0); } catch (err) { threw = true; }
  check("R2.a", "unit normalisation: unit length, direction unchanged, no NaN (identity / 180° / 90°); degenerate Jolt input throws", maxN <= 1e-15 && maxDir <= 4.5e-16 && nan === 0 && threw, `‖u‖² − 1 ≤ ${e(maxN)}, direction change ≤ ${e(maxDir)}, NaN ${nan}, unitQ(0) throws: ${threw}`);
  const spec = generateSpec(VARIATION_SET.find(h => h.id === "V2-REF")), sim = new G3Sim(J, spec, g3Def("T5"), {}), map = spec.bodies.map(b => spec.bodies.findIndex(x => x.name === lr(b.name)));
  let ctrlN = 0, evN = 0, rawN = 0, rotChange = 0, sigma = 0, ticks = 0, again = true;
  for (let t = 0; t < 720 && sim.tick(); t++) { if (t % 30) continue; ticks++; const U = unitStates(sim.st), E = unitEv(sim.up.ev);
    for (let i = 0; i < sim.st.length; i++) { const q = U[i].rot; ctrlN = Math.max(ctrlN, Math.abs(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3] - 1)); const raw = sim.st[i].rot; rawN = Math.max(rawN, Math.abs(raw.reduce((a, v) => a + v * v, 0) - 1));
      for (const v of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) rotChange = Math.max(rotChange, V.len(V.sub(Q.rot(raw, v), Q.rot(q, v)))); }
    for (const q of E.qs) evN = Math.max(evN, Math.abs(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3] - 1));
    const stM = unitStates(map.map(i => ({ ...sim.st[i], rot: mq(sim.st[i].rot) })));
    for (const d of sim.P.jd) { const k2 = sim.P.jd.find(x => x.k === spec.joints.findIndex(j => j.name === lr(spec.joints[d.k].name))); const aA = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(v => Q.rot(Q.mul(U[d.child].rot, d.F2), v)), aB = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(v => Q.rot(Q.mul(stM[k2.child].rot, k2.F2), v));
      for (let i = 0; i < 3; i++) sigma = Math.max(sigma, Math.abs(Math.abs(V.dot(mw(aA[i]), aB[i])) - 1)); }
    if (JSON.stringify(unitStates(sim.read()).map(b => b.rot)) !== JSON.stringify(U.map(b => b.rot))) again = false; }
  sim.destroy();
  check("R2.b", "controller-side inputs are unit (body orientations, joint quaternions)", ctrlN <= 1e-15 && evN <= 1e-15, `‖q‖² − 1 ≤ ${e(ctrlN)} (orientations), ${e(evN)} (joint quaternions) over ${ticks} states (raw Jolt: ${e(rawN)})`);
  check("R2.c", "no material orientation change (numerical error only)", rotChange <= 1e-6, `max |Q.rot(raw) − Q.rot(unit)| ${e(rotChange)}`);
  check("R2.d", "mirrored states: exact L/R joint-axis correspondence on the controller side", sigma <= 1e-14, `max ||σ| − 1| ${e(sigma)}`);
  check("R2.e", "deterministic (re-reading the same state)", again, again ? "bit-identical" : "differs");
  // the passive physical plant is untouched by the quaternion correction: G1 runs reproduce the historical (accepted flat-plane G1) hashes exactly
  const plant = [["V2-REF", "upright", "271f9e58"], ["V1-matched", "leanR", "c3600c78"], ["V2-REF", "drop1m", "2581f5a3"]].map(([h, k, ref]) => { const g = new G1Sim(J, generateSpec(VARIATION_SET.find(x => x.id === h)), k, {}); while (g.tick()); const hh = g.summary().hash; g.destroy(); return { h, k, ref, hh }; });
  check("R2.f", "passive plant bit-identical to the historical G1 (normalisation does not reach it)", plant.every(p => p.hh === p.ref), plant.map(p => `${p.h} ${p.k} ${p.hh}${p.hh === p.ref ? "" : " ≠ " + p.ref}`).join(", ")); }
// reference implementation of the ADOPTED leg IK with plain (unstaged) forward kinematics — the production staged version must equal it bit for bit
function refLegIK(ctrl, st, ev, n, pP, qP, footPose) { const P = ctrl.P, ks = ctrl.legK[n], d = ks.map(k => P.jd[k]), a = ks.map(k => ctrl.anchor[k]), cur = ks.map(k => { const v = decompose(ev.qs[k]); return [v.tw, v.sy, v.sz]; });
  const ft = footPose || st[ctrl.feet[n]], fk = (x) => { const qh = pyr(x[0], x[1], x[2]), qk = pyr(cur[1][0], x[3], cur[1][2]), qa = pyr(cur[2][0], x[4], x[5]);
    const Rt = Q.mul(Q.mul(Q.mul(qP, d[0].F1), qh), Q.conj(d[0].F2)), pt = V.add(pP, Q.rot(qP, a[0])), Rs = Q.mul(Q.mul(Q.mul(Rt, d[1].F1), qk), Q.conj(d[1].F2)), ps = V.add(pt, Q.rot(Rt, a[1]));
    const Rf = Q.mul(Q.mul(Q.mul(Rs, d[2].F1), qa), Q.conj(d[2].F2)), pf = V.add(ps, Q.rot(Rs, a[2])); let qe = Q.mul(ft.rot, Q.conj(Rf)); if (qe[3] < 0) qe = qe.map(v => -v);
    return [pf[0] - ft.pos[0], pf[1] - ft.pos[1], pf[2] - ft.pos[2], -2 * qe[0], -2 * qe[1], -2 * qe[2]]; };
  const nrm = (v) => { let m = 0; for (const x of v) m = Math.max(m, Math.abs(x)); if (m === 0) return 0; let s2 = 0; for (const x of v) { const y = x / m; s2 += y * y; } return m * Math.sqrt(s2); };
  const solve = (M, y) => { const nn = y.length, A = M.map((r, i) => [...r, y[i]]); for (let c = 0; c < nn; c++) { let p = c; for (let r = c + 1; r < nn; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; if (Math.abs(A[p][c]) < 1e-14) return null; [A[c], A[p]] = [A[p], A[c]]; for (let r = 0; r < nn; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k <= nn; k++) A[r][k] -= f * A[c][k]; } } return A.map((r, i) => r[nn] / r[i]); };
  let x = [cur[0][0], cur[0][1], cur[0][2], cur[1][1], cur[2][1], cur[2][2]], r = fk(x), err = dn(...r), it = 0, mu = IK.mu0, lastJ = null, lastH = null;
  for (; it < IK.maxIt && err > IK.tol; it++) { const Jm = [0, 1, 2, 3, 4, 5].map(c => { const xp = x.slice(), xm = x.slice(); xp[c] += IK.h; xm[c] -= IK.h; const rp = fk(xp), rm = fk(xm); return rp.map((v, i) => (v - rm[i]) / (2 * IK.h)); });
    const g = Jm.map(col => col[0] * r[0] + col[1] * r[1] + col[2] * r[2] + col[3] * r[3] + col[4] * r[4] + col[5] * r[5]); if (dn(...g) < IK.gradTol) break;
    const H = Jm.map(ci => Jm.map(cj => ci[0] * cj[0] + ci[1] * cj[1] + ci[2] * cj[2] + ci[3] * cj[3] + ci[4] * cj[4] + ci[5] * cj[5])); lastJ = Jm; lastH = H; let ok = false;
    for (let tries = 0; tries < 8; tries++) { const A = H.map((row, i) => row.map((v, c) => (i === c ? v + mu * (1 + v) : v))), dx = solve(A, g.map(v => -v)); if (!dx) { mu *= 10; continue; } const xn = x.map((v, i) => v + dx[i]), rn = fk(xn), en = dn(...rn); if (en < err) { x = xn; r = rn; err = en; mu = Math.max(IK.muMin, mu / 10); ok = true; break; } mu *= 10; }
    if (!ok) break; }
  if (err <= IK.tol && err > 0 && lastH) { const g = lastJ.map(col => col[0] * r[0] + col[1] * r[1] + col[2] * r[2] + col[3] * r[3] + col[4] * r[4] + col[5] * r[5]), A = lastH.map((row, i) => row.map((v, c) => (i === c ? v + mu * (1 + v) : v))), dx = solve(A, g.map(v => -v)); if (dx) { const xn = x.map((v, i) => v + dx[i]), rn = fk(xn), en = dn(...rn); if (en <= err) { x = xn; err = en; } } }
  return { x, err, it }; }
// ── R3 leg-IK mirror-equivariance ──
{ let n = 0, reach = 0, unre = 0, clsMis = 0, mirR = 0, mirU = 0, errR = 0, unreachReported = true, moved = 0, refMis = 0;
  for (const id of ["V2-REF", "V2-short-legs", "V2-198-92"]) { const spec = generateSpec(VARIATION_SET.find(h => h.id === id)), map = spec.bodies.map(b => spec.bodies.findIndex(x => x.name === lr(b.name)));
    const probs = []; for (const [key, T] of [[null, 1.0], ["T5", 6.0], ["U:R", 8.0]]) { const s = key ? new G3Sim(J, spec, g3Def(key), {}) : new G2Sim(J, spec, { title: "quiet", seconds: 1.2 }, {}); const orig = s.ctrl.legIK.bind(s.ctrl); let want = false;
      s.ctrl.legIK = (st, ev, nn, pP, qP, fp) => { if (want) probs.push({ st: st.map(b => ({ ...b })), n: nn, pP: pP.slice(), qP: qP.slice(), foot: fp ? { pos: fp.pos.slice(), rot: fp.rot.slice() } : null }); return orig(st, ev, nn, pP, qP, fp); };
      while (s.n * s.dt < T - 1e-9 && s.tick()); want = true; s.tick(); want = false; probs.sim = probs.sim || s; if (probs.sim !== s) s.destroy(); }
    const sim = probs.sim, ctrl = sim.ctrl, chain = (P, x, prob, ev) => { const ks = ctrl.legK[prob.n], d = ks.map(k => P.jd[k]), a = ks.map(k => ctrl.anchor[k]), cur = ks.map(k => { const v = decompose(ev.qs[k]); return [v.tw, v.sy, v.sz]; });
        const Rt = Q.mul(Q.mul(Q.mul(prob.qP, d[0].F1), pyr(x[0], x[1], x[2])), Q.conj(d[0].F2)), pt = V.add(prob.pP, Q.rot(prob.qP, a[0])), Rs = Q.mul(Q.mul(Q.mul(Rt, d[1].F1), pyr(cur[1][0], x[3], cur[1][2])), Q.conj(d[1].F2)), ps = V.add(pt, Q.rot(Rt, a[1]));
        return { ps, pf: V.add(ps, Q.rot(Rs, a[2])) }; };
    const L = [0, 1].map(k => V.len(ctrl.anchor[ctrl.legK[k][1]]) + V.len(ctrl.anchor[ctrl.legK[k][2]]));
    for (const b of probs) { const ev = sim.P.compute(b.st, sim.dt).ev, stM = map.map(i => b.st[i]).map(q => ({ pos: m3(q.pos), rot: mq(q.rot), com: m3(q.com), v: m3(q.v), w: mw(q.w) })), evM = sim.P.compute(stM, sim.dt).ev;
      const hip = V.add(b.pP, Q.rot(b.qP, ctrl.anchor[ctrl.legK[b.n][0]])), ft = b.foot || b.st[ctrl.feet[b.n]], u0 = V.sc(V.sub(ft.pos, hip), 1 / V.len(V.sub(ft.pos, hip)));
      const tg = [{ s: null, foot: { pos: ft.pos.slice(), rot: ft.rot.slice() } }]; for (const [ax, az] of [[0, 0], [20, 0], [-20, 0], [0, 20], [0, -20]]) for (const sv of [0.9, 0.99, 0.999, 1.001, 1.01, 1.05]) { const u = Q.rot(Q.mul(Q.axis([1, 0, 0], ax * Math.PI / 180), Q.axis([0, 0, 1], az * Math.PI / 180)), u0); tg.push({ s: sv, foot: { pos: V.add(hip, V.sc(u, sv * L[b.n])), rot: ft.rot.slice() } }); }
      for (const t of tg) { const footA = { pos: t.foot.pos.slice(), rot: t.foot.rot.slice() }, footB = { pos: m3(t.foot.pos), rot: mq(t.foot.rot) }, A = ctrl.legIK(b.st, ev, b.n, b.pP, b.qP, footA), B = ctrl.legIK(stM, evM, 1 - b.n, m3(b.pP), mq(b.qP), footB);
        if (footA.pos.some((v, i) => v !== t.foot.pos[i]) || footB.pos.some((v, i) => v !== m3(t.foot.pos)[i])) moved++;   // the target is never modified
        const Rf = refLegIK(ctrl, b.st, ev, b.n, b.pP, b.qP, footA); if (Rf.err !== A.err || Rf.it !== A.it || Rf.x.some((v, i) => v !== A.x[i])) refMis++;
        const cA = chain(sim.P, A.x, { ...b, foot: footA }, ev), cB = chain(sim.P, B.x, { n: 1 - b.n, pP: m3(b.pP), qP: mq(b.qP) }, evM), d = Math.max(V.len(V.sub(cA.ps, m3(cB.ps))), V.len(V.sub(cA.pf, m3(cB.pf))));
        n++; const rA = A.err <= 1e-6, rB = B.err <= 1e-6; if (rA !== rB) clsMis++;
        if (t.s == null || t.s <= 0.999) { reach++; mirR = Math.max(mirR, d); errR = Math.max(errR, A.err, B.err); } else { unre++; mirU = Math.max(mirU, d); if (rA || rB) unreachReported = false; } } }
    sim.destroy(); }
  check("R3.a", "IK: identical reachability classification for every mirrored problem pair", clsMis === 0, `${clsMis} mismatches over ${n} pairs (3 bodies)`);
  check("R3.b", "IK: reachable targets solved to the rounding floor (polished, ≤ 1e-14) and mirrored (≤ 1e-12 m)", errR <= 1e-14 && mirR <= 1e-12, `${reach} pairs: residual ≤ ${e(errR)}, mirror Δ ≤ ${e(mirR)} m`);
  check("R3.c", "IK: unreachable targets reported unreachable, optima mirrored (≤ 1e-6 m)", unreachReported && mirU <= 1e-6, `${unre} pairs: all reported (residual > 1e-6): ${unreachReported}; mirror Δ ≤ ${e(mirU)} m`);
  check("R3.d", "IK: the target is never modified", moved === 0, `${moved} modified`);
  check("R3.e", "IK: production (staged FK) equals the plain reference implementation bit for bit", refMis === 0, `${refMis} of ${n} solves differ`); }
// ── R4 opt-in bounded leg IK: real swing-ready / near-single-support states, G4-style targets (forward, outward, crossing, lifted, foot yaw ±45°) ──
{ let n = 0, nUnr = 0, inBox = true, same = 0, sameMis = 0, inval = 0, invalAlt = 0, invalRep = 0, kkt = 0, clsMis = 0, mirR = 0, mirU = 0, moved = 0, routed = true; const D = Math.PI / 180;
  const SIG = [-1, 1, -1, 1, 1, -1];   // mirror correspondence of the solved coordinates (hip twist, flexion, abduction; knee flexion; ankle DF, inversion): L x_i ↔ R σ_i·x_i (the hard-limit boxes map onto each other)
  for (const id of ["V2-REF", "V2-short-legs", "V2-198-92"]) { const spec = generateSpec(VARIATION_SET.find(h => h.id === id)), map = spec.bodies.map(b => spec.bodies.findIndex(x => x.name === lr(b.name)));
    for (const [key, T, leg] of [["U:R", 8.0, 0], ["T5", 6.0, 0]]) { const s = new G3Sim(J, spec, g3Def(key), {}), orig = s.ctrl.legIK.bind(s.ctrl); let want = false, cap = null;
      s.ctrl.legIK = (st, ev, nn, pP, qP, fp) => { if (want && nn === leg && !cap) cap = { st: st.map(b => ({ ...b })), pP: pP.slice(), qP: qP.slice(), foot: fp ? { pos: fp.pos.slice(), rot: fp.rot.slice() } : null }; return orig(st, ev, nn, pP, qP, fp); };
      while (s.n * s.dt < T - 1e-9 && s.tick()); want = true; s.tick(); s.ctrl.legIK = orig; const ctrl = s.ctrl;
      if (n === 0) { const sb = new G3Sim(J, spec, g3Def(key), { stand: { ikBounds: true } }); routed = STAND.ikBounds === false && ctrl.o.ikBounds === false && sb.ctrl.o.ikBounds === true; sb.destroy(); }
      const lim = ctrl.legK[leg].map(k => spec.joints[k].limits.hard), lo = [lim[0].lo[0], lim[0].lo[1], lim[0].lo[2], lim[1].lo[1], lim[2].lo[1], lim[2].lo[2]], hi = [lim[0].hi[0], lim[0].hi[1], lim[0].hi[2], lim[1].hi[1], lim[2].hi[1], lim[2].hi[2]];
      const inside = (x) => x.every((v, i) => v >= lo[i] && v <= hi[i]), ev = s.P.compute(cap.st, s.dt).ev, stM = map.map(i => cap.st[i]).map(q => ({ pos: m3(q.pos), rot: mq(q.rot), com: m3(q.com), v: m3(q.v), w: mw(q.w) })), evM = s.P.compute(stM, s.dt).ev;
      const ft0 = cap.foot || cap.st[ctrl.feet[leg]], fw = Q.rot(cap.st[ctrl.feet[1 - leg]].rot, [0, 0, 1]), hd = V.norm([fw[0], 0, fw[2]]), out = V.sc([hd[2], 0, -hd[0]], leg === 0 ? -1 : 1);
      for (const hgt of [0, 0.05]) for (const [f, l] of [[0.15, 0], [0.30, 0], [0.45, 0], [0, 0.10], [0, 0.20], [0, -0.08], [0.30, 0.10]]) for (const yaw of [0, 30, -30, 45, -45]) {
        const pos = V.add(V.add(V.add(ft0.pos, V.sc(hd, f)), V.sc(out, l)), [0, hgt, 0]), rot = Q.norm(Q.mul(Q.axis([0, 1, 0], (leg === 0 ? -1 : 1) * yaw * D), ft0.rot)), footA = { pos: pos.slice(), rot: rot.slice() }, footB = { pos: m3(pos), rot: mq(rot) };
        const U = ctrl.legIK(cap.st, ev, leg, cap.pP, cap.qP, footA), B = ctrl.legIKBounded(cap.st, ev, leg, cap.pP, cap.qP, footA), BM = ctrl.legIKBounded(stM, evM, 1 - leg, m3(cap.pP), mq(cap.qP), footB); n++;
        if (footA.pos.some((v, i) => v !== pos[i]) || footB.pos.some((v, i) => v !== m3(pos)[i])) moved++;
        if (!inside(B.x)) inBox = false;
        if (U.err <= 1e-6 && inside(U.x)) { same++; if (!(B.err <= 1e-12 && Math.max(...B.x.map((v, i) => Math.abs(v - U.x[i]))) <= 1e-9)) sameMis++; }
        else if (U.err <= 1e-6) { inval++; if (B.err <= 1e-12) invalAlt++; else if (B.err > 1e-6) invalRep++; }
        if (B.err > 1e-6) { nUnr++; const F = ctrl.legChain(cap.st, ev, leg, cap.pP, cap.qP, footA), r = F.fk(B.x), Jm = F.jac(B.x), g = Jm.map(col => col.reduce((a, v, i) => a + v * r[i], 0));   // KKT of ½‖r‖² on the box
          kkt = Math.max(kkt, ...g.map((gi, i) => (B.x[i] <= lo[i] ? Math.max(0, -gi) : B.x[i] >= hi[i] ? Math.max(0, gi) : Math.abs(gi)))); }
        if ((B.err <= 1e-6) !== (BM.err <= 1e-6)) clsMis++; else { const d = Math.max(...B.x.map((v, i) => Math.abs(v - SIG[i] * BM.x[i]))); if (B.err <= 1e-6) mirR = Math.max(mirR, d); else mirU = Math.max(mirU, d); } }
      s.destroy(); } }
  check("R4.a", "bounded IK: opt-in (STAND.ikBounds false by default; the option routes legIK to legIKBounded)", routed, `default off, option honoured: ${routed}`);
  check("R4.b", "bounded IK: every returned solution inside the anatomical hard limits", inBox, `${n} solves`);
  check("R4.c", "bounded IK: equals the unconstrained IK wherever that solution is anatomically valid (≤ 1e-9 rad, solved ≤ 1e-12)", sameMis === 0, `${sameMis} of ${same} differ`);
  // overnight Phase C: the LM iterate alone stopped short of the box optimum on unreached targets (KKT up to 7.5e-4; reported then). Since the Newton
  // fallback refinement (user decision 2026-10-04, Decision 2) the returned fallback pose IS the box-constrained optimum: KKT gated at 1e-7
  // (study max 4.4e-9 over 5,368 unreached targets)
  check("R4.d", "bounded IK: an anatomically invalid unconstrained solution is never accepted — solved on a valid branch (≤ 1e-12) or reported unreachable (> 1e-6)", invalAlt + invalRep === inval, `${inval} invalid: ${invalAlt} valid branch, ${invalRep} reported`);
  check("R4.g", "bounded IK fallback: every unreached target returns the box-constrained least-squares optimum (KKT ≤ 1e-7)", kkt <= 1e-7 && nUnr > 0, `${nUnr} unreached solves: KKT max ${e(kkt)}`);
  check("R4.e", "bounded IK: L/R mirror-equivariant (classification; solution reached ≤ 1e-12 rad, unreached ≤ 1e-6 rad)", clsMis === 0 && mirR <= 1e-12 && mirU <= 1e-6, `${clsMis} classification mismatches; Δ reached ≤ ${e(mirR)}, unreached ≤ ${e(mirU)} rad`);
  check("R4.f", "bounded IK: the target is never modified", moved === 0, `${moved} modified`); }
// ── R5 posture-IK twist semantics (static, on a captured U:R swing-ready state of V2-REF, left = stance-side probe of both legs) ──
{ const spec = generateSpec(VARIATION_SET.find(h => h.id === "V2-REF")), sim = new G3Sim(J, spec, g3Def("U:R"), {}), orig = sim.ctrl.legIK.bind(sim.ctrl); let cap = null, want = false;
  sim.ctrl.legIK = (st, ev, nn, pP, qP, fp) => { if (want && nn === 1 && !cap) cap = { st: st.map(b => ({ ...b })), ev: { ...ev, qs: ev.qs.map(q => q.slice()) }, pP: pP.slice(), qP: qP.slice() }; return orig(st, ev, nn, pP, qP, fp); };
  while (sim.n * sim.dt < 8 - 1e-9 && sim.tick()); want = true; sim.tick(); sim.ctrl.legIK = orig; const c = sim.ctrl, n = 1, ks = c.legK[n], o0 = { ...c.o };
  const solve = (opts, ev) => { c.o = { ...o0, ...opts }; const r = c.legIK(cap.st, ev, n, cap.pP, cap.qP, null); c.o = { ...o0 }; return r; };
  const defOff = STAND.ikTwistBlend == null && !STAND.ikTwistTau && STAND.yawCmd == null && c.o.ikTwistBlend == null;
  const eq = (a, b) => a.x.every((v, i) => v === b.x[i]) && a.err === b.err, b0 = eq(solve({ ikTwistBlend: 0 }, cap.ev), solve({}, cap.ev)), b1 = eq(solve({ ikTwistBlend: 1 }, cap.ev), solve({ ikRefTwist: true }, cap.ev));
  // twist the knee axial DOF of the probed leg by ±δ in the controller input, re-solve, slope of the hip-rotation solution vs the twist
  const twistBy = (d) => { const qs = cap.ev.qs.map(q => q.slice()), k = ks[1], v = decompose(qs[k]); qs[k] = pyr(v.tw + d, v.sy, v.sz); return { ...cap.ev, qs }; }, dl = 0.02;
  const slope = (opts) => (solve(opts, twistBy(dl)).x[0] - solve(opts, twistBy(-dl)).x[0]) / (2 * dl), sCur = slope({}), sRef = slope({ ikRefTwist: true });
  check("R5.a", "twist-policy diagnostic options off by default (ikTwistBlend null, ikTwistTau 0, yawCmd null)", defOff, `default off: ${defOff}`);
  check("R5.b", "ikTwistBlend 0 ≡ validated 'current' and 1 ≡ ikRefTwist (bit-identical IK solutions)", b0 && b1, `blend 0 ≡ current: ${b0}; blend 1 ≡ reference: ${b1}`);
  check("R5.c", "mechanism: hip-rotation IK target follows the leg twist under 'current' (slope ≈ −1) and not under reference (≈ 0)", Math.abs(sCur + 1) < 0.1 && Math.abs(sRef) < 0.1, `slope current ${sCur.toFixed(3)}, reference ${sRef.toFixed(3)}`);
  sim.destroy();
  // R5.d (bug found by the runway's G3 row-N run): the drifting-reference filter state is controller state → it must be in getState (snapshot /
  // restore), and the DEFAULT controller state must not gain a key
  const sd = new G3Sim(J, spec, g3Def("T5"), { stand: { ikTwistBlend: 1, ikTwistTau: 2 } }), s0 = new G3Sim(J, spec, g3Def("T5"), {}); for (let i = 0; i < 24; i++) { sd.tick(); s0.tick(); }
  const hasF = Array.isArray(sd.ctrl.getState().twFilt), noKey = !("twFilt" in s0.ctrl.getState()); sd.destroy(); s0.destroy();
  check("R5.d", "drifting-reference filter state is saved by getState; the default controller state is unchanged (no new key)", hasF && noKey, `filter state saved: ${hasF}; default state has no twFilt key: ${noKey}`); }
// ── R6 reachability-certificate soundness (V2-REF, G3 U:R swing-ready capture of the left leg with its held foot target, as tools/ik_certificate.mjs) ──
{ const spec = generateSpec(VARIATION_SET.find(h => h.id === "V2-REF")), sim = new G3Sim(J, spec, g3Def("U:R"), {}), orig = sim.ctrl.legIK.bind(sim.ctrl), n = 0; let cap = null, want = false;
  sim.ctrl.legIK = (st, ev, nn, pP, qP, fp) => { if (want && nn === n && !cap) cap = { st: unitStates(st), ev: unitEv(ev), pP: pP.slice(), qP: qP.slice(), foot: fp ? { pos: fp.pos.slice(), rot: Q.norm(fp.rot) } : null }; return orig(st, ev, nn, pP, qP, fp); };
  while (sim.n * sim.dt < 8 - 1e-9 && sim.tick()); want = true; sim.tick(); sim.ctrl.legIK = orig; const c = sim.ctrl, D = 180 / Math.PI, TOL = 1e-6;
  const st = cap.st, ft0 = cap.foot || st[c.feet[n]], fw = Q.rot(st[c.feet[1 - n]].rot, [0, 0, 1]), hd = V.norm([fw[0], 0, fw[2]]), latOut = V.sc([hd[2], 0, -hd[0]], -1), sg = -1;
  const Lh = c.legK[n].map(k => spec.joints[k].limits.hard), lo = [Lh[0].lo[0], Lh[0].lo[1], Lh[0].lo[2], Lh[1].lo[1], Lh[2].lo[1], Lh[2].lo[2]], hi = [Lh[0].hi[0], Lh[0].hi[1], Lh[0].hi[2], Lh[1].hi[1], Lh[2].hi[1], Lh[2].hi[2]], { lever, LIP } = certLevers(c, n, 6);
  const tgt = (fwd, lat, hgt, yaw, drop) => ({ pP: [cap.pP[0], cap.pP[1] - drop, cap.pP[2]], foot: { pos: V.add(V.add(V.add(ft0.pos, V.sc(hd, fwd)), V.sc(latOut, lat)), [0, hgt, 0]), rot: Q.norm(Q.mul(Q.axis([0, 1, 0], sg * yaw / D), ft0.rot)) } });
  // R6.a rate claims on 2,000 seeded random box points (central differences, h = 1e-6; tolerance 1e-6 relative for rounding)
  let seed = 12345; const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296, C0 = c.legChain(st, cap.ev, n, cap.pP, cap.qP, ft0); let posR = 0, ankPos = 0, oriR = 0;
  for (let k = 0; k < 2000; k++) { const x = lo.map((l, i) => l + (hi[i] - l) * rnd()); for (let i = 0; i < 6; i++) { const xp = x.slice(), xm = x.slice(); xp[i] += 1e-6; xm[i] -= 1e-6; const rp = C0.fk(xp), rm = C0.fk(xm), d = rp.map((v, j) => (v - rm[j]) / 2e-6), dp = Math.hypot(d[0], d[1], d[2]);
      if (lever[i] > 0) posR = Math.max(posR, dp / lever[i]); else ankPos = Math.max(ankPos, dp); oriR = Math.max(oriR, Math.hypot(d[3], d[4], d[5])); } }
  check("R6.a", "certificate bound: Lipschitz rate claims hold (position rate ≤ lever for hip / knee, 0 for ankle; orientation rate ≤ 1)", posR <= 1 + 1e-6 && ankPos === 0 && oriR <= 1 + 1e-6, `2000 points × 6: max pos rate / lever ${posR.toFixed(9)}, ankle position rate ${ankPos}, max orientation rate ${oriR.toFixed(9)}`);
  // R6.b known-solution path on the anatomically valid targets of a ground / raised set; R6.d chain8 ≡ legChain at the held twists on the same set
  let nv = 0, pruned = 0, chainDiff = 0;
  for (const [fwd, lat] of [[0.15, 0], [0.30, 0], [-0.10, 0], [0, -0.08], [0, 0.10], [0.30, 0.10], [0.15, 0.05]]) for (const hgt of [0, 0.05]) for (const yaw of [0, 30, -30]) for (const drop of [0.05, 0.10]) {
    const { pP, foot } = tgt(fwd, lat, hgt, yaw, drop), C = c.legChain(st, cap.ev, n, pP, cap.qP, foot), C8 = chain8(c, st, cap.ev, n, pP, cap.qP, foot);
    for (const x of [C.x0, lo.map((l, i) => (l + hi[i]) / 2)]) { const a = C.fk(x), b = C8.fk(C8.embed(x)); chainDiff = Math.max(chainDiff, ...a.map((v, j) => Math.abs(v - b[j]))); }
    const B = c.legIKBounded(st, cap.ev, n, pP, cap.qP, foot); if (!(B.err <= TOL)) continue; nv++; if (knownSolutionPath(C.fk, lo, hi, LIP, B.x, TOL).pruned) pruned++; }
  check("R6.b", "certificate bound: no cell containing a known anatomical solution is pruned (bisection path to Σ LIP·h < 1e-9)", nv > 20 && pruned === 0, `${nv} valid targets: ${pruned} pruned`);
  // R6.c far outward, foot yaw −45°, raised 5 cm, no pelvis drop: certified infeasible as defined; moving the held knee axial twist makes it feasible
  { const { pP, foot } = tgt(0, 0.20, 0.05, -45, 0), C = c.legChain(st, cap.ev, n, pP, cap.qP, foot), B = c.legIKBounded(st, cap.ev, n, pP, cap.qP, foot), R = branchAndBound(C.fk, lo, hi, LIP, 2e7, TOL);
    let feasD = null, R2 = null; for (const d of [-3, -5, -7.5]) { const qs = cap.ev.qs.map(q => q.slice()), k = c.legK[n][1], v = decompose(qs[k]); qs[k] = pyr(v.tw + d / D, v.sy, v.sz); const ev2 = { ...cap.ev, qs };
      if (c.legIKBounded(st, ev2, n, pP, cap.qP, foot).err <= TOL) { feasD = d; R2 = branchAndBound(c.legChain(st, ev2, n, pP, cap.qP, foot).fk, lo, hi, LIP, 2e6, TOL); break; } }
    check("R6.c", "certificate decides: a known invalid target → PROVEN-INFEASIBLE; the same target with the held knee axial twist moved (now solvable) → not certified", B.err > TOL && R.verdict === "PROVEN-INFEASIBLE" && feasD != null && R2.verdict !== "PROVEN-INFEASIBLE",
      `as defined: warm residual ${e(B.err)} → ${R.verdict} (${R.evals} cells); knee axial ${feasD}°: solvable, certificate ${R2 && R2.verdict}`); }
  check("R6.d", "the 8-D (twist-free) chain equals the production legChain bit for bit at the held twist values", chainDiff === 0, `max |Δr| ${chainDiff}`);
  // R6.e the opt-in tight levers on the 8-D chain (knee axial lever = the ankle's distance from the shank twist axis + 1 nm; hip twist = the knee's
  // distance from the thigh twist axis + shank + 1 nm): 1,000 seeded random points of the 8-D hard box
  { const T8 = certLevers(c, n, 8, true), C8 = chain8(c, st, cap.ev, n, cap.pP, cap.qP, ft0), Lh8 = c.legK[n].map(k => spec.joints[k].limits.hard);
    const lo8 = [Lh8[0].lo[0], Lh8[0].lo[1], Lh8[0].lo[2], Lh8[1].lo[0], Lh8[1].lo[1], Lh8[2].lo[0], Lh8[2].lo[1], Lh8[2].lo[2]], hi8 = [Lh8[0].hi[0], Lh8[0].hi[1], Lh8[0].hi[2], Lh8[1].hi[0], Lh8[1].hi[1], Lh8[2].hi[0], Lh8[2].hi[1], Lh8[2].hi[2]]; let pr = 0, zr = 0, orr = 0;
    for (let k = 0; k < 1000; k++) { const x = lo8.map((l, i) => l + (hi8[i] - l) * rnd()); for (let i = 0; i < 8; i++) { const xp = x.slice(), xm = x.slice(); xp[i] += 1e-6; xm[i] -= 1e-6; const rp = C8.fk(xp), rm = C8.fk(xm), d = rp.map((v, j) => (v - rm[j]) / 2e-6), dp = Math.hypot(d[0], d[1], d[2]);
        if (T8.lever[i] > 0) pr = Math.max(pr, dp / T8.lever[i]); else zr = Math.max(zr, dp); orr = Math.max(orr, Math.hypot(d[3], d[4], d[5])); } }
    check("R6.e", "tight twist levers (opt-in): 8-D rate claims hold (position rate ≤ lever incl. knee axial ≈ 0; ankle coordinates 0; orientation ≤ 1)", pr <= 1 + 1e-6 && zr === 0 && orr <= 1 + 1e-6,
      `knee-axial lever ${e(T8.lever[3])} m, hip-twist ${T8.lever[0].toFixed(4)} m (generic ${(T8.L1 + T8.L2).toFixed(4)}); max pos rate / lever ${pr.toFixed(9)}, ankle ${zr}, orientation ${orr.toFixed(9)}`); }
  sim.destroy(); }
// ── R7 support / contact lifecycle (synthetic sequences; W = 700 N, dt = 1/240 s) ──
{ const W = 700, dt = 1 / 240, pose = (y = 0, yaw = 0, tilt = 0) => ({ pos: [0.1, y, 0.2], rot: Q.norm(Q.mul(Q.axis([0, 1, 0], yaw), Q.axis([1, 0, 0], tilt))) });
  const run = (L, seq) => { const tr = []; for (const x of seq) { const f = L.update({ Fz: [x.Fz, 600], touch: [x.touch, 8], other: [!!x.other, false] }, () => x.pose || pose(), dt, [x.req ?? null, null]); tr.push({ st: f[0].state, s: f[0].s, a: f[0].a }); } return tr; };
  const rep = (n, x) => Array.from({ length: n }, () => ({ ...x }));
  const toTouching = () => { const L = new SupportLifecycle(W); run(L, [...rep(10, { Fz: 300, touch: 8 }), ...rep(60, { Fz: 2, touch: 8, req: 0 })]); return L; };
  // R7.a flicker: from TOUCHING, touch alternates 8 / 0 every tick for 0.2 s → never AIRBORNE; s and a stay 0
  { const L = toTouching(), st0 = L.feet[0].state, tr = run(L, Array.from({ length: 48 }, (_, i) => ({ Fz: 0, touch: i % 2 ? 0 : 8, req: 0 })));
    check("R7.a", "lifecycle: contact flicker (8/0 pieces every tick, 0.2 s) never confirms AIRBORNE; the control weights s, a stay 0", st0 === "TOUCHING" && tr.every(x => x.st !== "AIRBORNE" && x.s === 0 && x.a === 0), `start ${st0}; states ${[...new Set(tr.map(x => x.st))].join("/")}`); }
  // R7.b liftoff: touch 0 sustained → AIRBORNE after the debounce; a rises continuously (per-tick Δa ≤ 1.5·dt/release)
  { const L = toTouching(), tr = run(L, rep(80, { Fz: 0, touch: 0, req: 0 })), iA = tr.findIndex(x => x.st === "AIRBORNE"), dA = Math.max(...tr.slice(1).map((x, i) => Math.abs(x.a - tr[i].a)));
    check("R7.b", "lifecycle: liftoff confirmed after the debounce; airborne weight continuous (Δa per tick ≤ 1.5·dt/release)", iA >= Math.round(LIFECYCLE.debounce / dt) - 1 && tr[tr.length - 1].a === 1 && dA <= 1.5 * dt / LIFECYCLE.release, `AIRBORNE at tick ${iA}, max Δa ${dA.toFixed(4)}`); }
  // R7.c touchdown: an impact 60 N for 40 ms with no intent → no LOAD_ACCEPT; then intent (requested share 0.5) + contact → LOAD_ACCEPT → SUPPORT with continuous s
  { const L = toTouching(); run(L, rep(40, { Fz: 0, touch: 0, req: 0 })); const t1 = run(L, [...rep(10, { Fz: 60, touch: 8, req: 0 }), ...rep(30, { Fz: 3, touch: 8, req: 0 })]), noAcc = t1.every(x => x.st !== "LOAD_ACCEPT" && x.st !== "SUPPORT");
    const t2 = run(L, rep(60, { Fz: 5, touch: 8, req: 0.5 })), iLA = t2.findIndex(x => x.st === "LOAD_ACCEPT"), dS = Math.max(...t2.slice(1).map((x, i) => Math.abs(x.s - t2[i].s)));
    check("R7.c", "lifecycle: a touchdown impact without intent is not support; intent + contact starts load acceptance after acceptDebounce; s continuous to SUPPORT", noAcc && t1.slice(0, 2).some(x => x.st === "TOUCHDOWN") && iLA >= Math.round(LIFECYCLE.acceptDebounce / dt) - 1 && t2[t2.length - 1].st === "SUPPORT" && dS <= 1.5 * 1.5 * dt / LIFECYCLE.accept,
      `impact phase: ${[...new Set(t1.map(x => x.st))].join("/")}; LOAD_ACCEPT at tick ${iLA}; end ${t2[t2.length - 1].st}; max Δs ${dS.toFixed(4)}`); }
  // R7.d self-contact guard: 200 N read while a non-turf contact touches the foot (no request) → not support; the same load without it → LOAD_ACCEPT
  { const L = toTouching(); L.feet[0].state === "TOUCHING"; const t1 = run(L, rep(40, { Fz: 200, touch: 8, other: true })), t2 = run(L, rep(40, { Fz: 200, touch: 8 }));
    check("R7.d", "lifecycle: a load reading taken during self-contact is ignored (no support); the same load from the turf alone is accepted", t1.every(x => x.st === "TOUCHING") && t2.some(x => x.st === "LOAD_ACCEPT"), `with self-contact: ${[...new Set(t1.map(x => x.st))].join("/")}; without: ${[...new Set(t2.map(x => x.st))].join("/")}`); }
  // R7.e anchor: captured on the turf at release; frozen while AIRBORNE (foot pose changes); re-captured at TOUCHDOWN with the landing's position / yaw but the previous height and tilt
  { const L = new SupportLifecycle(W); run(L, [...rep(10, { Fz: 300, touch: 8, pose: pose(0) }), ...rep(60, { Fz: 2, touch: 8, req: 0, pose: pose(0) })]); const h0 = JSON.stringify(L.feet[0].hold);
    run(L, rep(40, { Fz: 0, touch: 0, req: 0, pose: pose(0.02, 0.05, 0.03) })); const frozen = JSON.stringify(L.feet[0].hold) === h0, wasAir = L.feet[0].state === "AIRBORNE";
    run(L, rep(2, { Fz: 0, touch: 2, req: 0, pose: { pos: [0.11, 0.004, 0.21], rot: Q.norm(Q.mul(Q.axis([0, 1, 0], 0.05), Q.axis([1, 0, 0], 0.08))) } })); const h = L.feet[0].hold, yawOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]); };
    const ok = h.pos[0] === 0.11 && h.pos[2] === 0.21 && h.pos[1] === 0 && Math.abs(yawOf(h.rot) - 0.05) < 1e-12 && Math.abs(Q.rot(h.rot, [0, 1, 0])[1] - 1) < 1e-12;
    check("R7.e", "lifecycle: contact anchor captured on the turf, frozen while airborne, re-captured flat (landing x/z/yaw, previous height and tilt) at touchdown", frozen && wasAir && L.feet[0].state === "TOUCHDOWN" && ok, `frozen ${frozen}; touchdown anchor x/z ${h.pos[0]}/${h.pos[2]}, y ${h.pos[1]}, flat ${ok}`); }
  // R7.f low load does not release a foot the plan wants loaded; without intent it does
  { const L = new SupportLifecycle(W), t1 = run(L, rep(60, { Fz: 2, touch: 8, req: 0.5 })), L2 = new SupportLifecycle(W), t2 = run(L2, rep(60, { Fz: 2, touch: 8, req: 0 }));
    check("R7.f", "lifecycle: low load releases support only when the plan does not want load on that foot", t1.every(x => x.st === "SUPPORT") && t2.some(x => x.st === "UNLOADING"), `wanted: ${[...new Set(t1.map(x => x.st))].join("/")}; not wanted: ${[...new Set(t2.map(x => x.st))].join("/")}`); }
  // R7.g determinism + exact getState / setState round trip mid-sequence
  { const seq = [...rep(10, { Fz: 300, touch: 8 }), ...rep(40, { Fz: 2, touch: 8, req: 0 }), ...rep(30, { Fz: 0, touch: 0, req: 0 }), ...rep(5, { Fz: 50, touch: 8, req: 0.3 }), ...rep(40, { Fz: 80, touch: 8, req: 0.3 })];
    const A = new SupportLifecycle(W), tA = run(A, seq), B = new SupportLifecycle(W), tB1 = run(B, seq.slice(0, 55)), snap = JSON.parse(JSON.stringify(B.getState())), C = new SupportLifecycle(W); C.setState(snap); const tC = run(C, seq.slice(55));
    const same = JSON.stringify(tA) === JSON.stringify([...tB1, ...tC]) && JSON.stringify(A.getState()) === JSON.stringify(C.getState());
    check("R7.g", "lifecycle: deterministic; getState / setState round trip mid-sequence continues bit-identically", same, `identical ${same}`); }
  // R7.h a commanded swing target replaces the anchor (also in contact); null hands back to the anchor
  { const L = toTouching(), a0 = JSON.stringify(L.target(0)), sw = pose(0.005); L.setSwingTarget(0, sw); const t1 = JSON.stringify(L.target(0)) === JSON.stringify({ pos: sw.pos, rot: sw.rot }); L.setSwingTarget(0, null);
    check("R7.h", "lifecycle: a commanded swing target is the leg's target in a contact state; clearing it returns to the contact anchor", t1 && JSON.stringify(L.target(0)) === a0, `commanded used ${t1}; back to anchor ${JSON.stringify(L.target(0)) === a0}`); }
  // R7.i default off, default controller state without the key
  { const spec = generateSpec(VARIATION_SET.find(h => h.id === "V2-REF")), s0 = new G3Sim(J, spec, g3Def("T5"), {}); for (let i = 0; i < 12; i++) s0.tick(); const off = STAND.lifecycle == null && !s0.ctrl.lc && !("lc" in s0.ctrl.getState()) && !("lc" in s0.ctrl.info); s0.destroy();
    check("R7.i", "lifecycle option off by default; the default controller state / info carry no lifecycle key", off, `off ${off}`); } }
// ── R8 corrected knee axial model v2k (spec/v2_knee.js; knee_correction/KNEE_PARAMETERIZATION.md; EXPERIMENTAL, default off) ──
{ const K = await import("../spec/v2_knee.js"), { PassiveLayer } = await import("../sim/v2_passive.js"), { V2JoltWorld } = await import("../core/v2_jolt.js"), { posedBodies } = await import("../spec/v2_pose.js"), { pyr } = await import("../spec/v2_joints.js");
  const spec = generateSpec(VARIATION_SET.find(h => h.id === "V2-REF")), mkP = (o) => { const w = new V2JoltWorld(J, spec, spec.contact, { gravity: 0 }); return { w, P: new PassiveLayer(spec, w, o) }; };
  // R8.a default off (no env, no option): the accepted knee — no v2k term, the diagnostic envelope absent
  { const envSet = typeof process !== "undefined" && process.env.V2_KNEE_MODEL; const { w, P } = mkP({}); const kR = spec.joints.findIndex(j => j.name === "knee_R"), a = P.jd[kR].axes.find(x => x && x.key === "rot");
    check("R8.a", "corrected knee off by default: no v2k term, the old knee axial law", envSet ? true : !P.kneeIsV2K && !a.v2k && !P.kneeEnv, envSet ? `skipped: V2_KNEE_MODEL=${envSet} set` : `v2k ${P.kneeIsV2K}`); w.destroy(); }
  // R8.b envelope anchor values (KNEE_PARAMETERIZATION.md §4–6)
  { const e0 = K.kneeEnvelopeV2K(0), e30 = K.kneeEnvelopeV2K(30), e90 = K.kneeEnvelopeV2K(90), near = (a, b, t = 1e-9) => Math.abs(a - b) <= t, poly = (f) => 0.3695 * f - 2.958e-3 * f * f + 7.666e-6 * f ** 3;
    const ok = near(e0.theta0, 0) && near(e0.soft[0], -0.5) && near(e0.soft[1], 1) && near(e0.hard[0], -12.5) && near(e0.hard[1], 14) && near(e30.theta0, poly(30)) && near(e30.hard[1], poly(30) + 14) && near(e90.hard[0], poly(90) - 25)
      && near(K.kneeTheta0(150), poly(150)) && near(K.kneeWidthFactor(150, "IR"), 1) && near(K.kneeWidthFactor(150, "ER"), 1);
    check("R8.b", "v2k envelope: θ0 = Walker polynomial, slack / calibrated bounds at 0 / 30 / 90°, deep-flexion defaults (no extra shift, no narrowing)", ok, `θ0(30) ${e30.theta0.toFixed(4)}, bounds(0) [${e0.hard}], (90) [${e90.hard.map(x => x.toFixed(3))}]`); }
  // R8.c the passive layer's knee axial torque = the independent spec law (both knees, inside / IR / ER / end-stop)
  { const { w, P } = mkP({ kneeModel: "v2k" }); let worst = 0;
    for (const sd of ["R", "L"]) { const k = spec.joints.findIndex(j => j.name === "knee_" + sd), i = P.kneeRot[k], a = P.jd[k].axes[i], cap = a.v2k.cap;
      for (const [f, d] of [[10, 0.5], [10, 6], [20, -8], [30, 16], [5, -15], [90, 27]]) { const th = K.kneeTheta0(f) + d, up = P.compute(posedBodies(spec, { hip_L: { abd: 8 }, hip_R: { abd: 8 }, ["knee_" + sd]: { flex: f, rot: th } }).map(x => ({ ...x, v: [0, 0, 0], w: [0, 0, 0] })), 1 / 240);
        const lay = a.s * up.joints[k].tau[i], spc = K.kneeAxialTorque(f, th, a.s > 0 ? cap[1] : cap[0], a.s > 0 ? cap[0] : cap[1]).tau; worst = Math.max(worst, Math.abs(lay - spc) - 1e-3 * Math.abs(spc)); } }
    check("R8.c", "v2k: the passive layer's knee axial generalised torque equals the specification law (both knees, slack / law / end-stop)", worst <= 1e-4, `worst excess ${e(worst)} N·m`); w.destroy(); }
  // R8.d controller: under v2k + the reference policy the posture-IK knee twist is θ0 at the solved flexion; otherwise the current / reference value
  { const mk = (model) => { const s0 = new G3Sim(J, spec, g3Def("T0"), { stand: { ikRefTwist: true }, passiveOpts: { kneeModel: model } }); for (let i = 0; i < 6; i++) s0.tick(); return s0; };
    const a = mk("v2k"), ch = a.ctrl.legChain(a.st, a.up.ev, 0, a.st[0].pos, a.st[0].rot), kk = ch.ks[1], d = a.P.jd[kk]; let err = 0;
    for (const sy of [-1.2, -1.0, -0.6, 0]) { const x = [0, 0, 0, sy, 0, 0], q = pyr(ch.kTw(x), sy, 0), fl = a.P.anat(d, q, "flex"); err = Math.max(err, Math.abs(a.P.anat(d, q, "rot") - K.kneeTheta0(fl))); }
    const b = mk(null), chb = b.ctrl.legChain(b.st, b.up.ev, 0, b.st[0].pos, b.st[0].rot), same = chb.kTw([0, 0, 0, -1, 0, 0]) === chb.cur[1][0];
    check("R8.d", "v2k + reference policy: the knee twist in the posture-IK chain is θ0(solved flexion); old knee: the unchanged twist value", err <= 1e-9 && same, `max |rot − θ0| ${e(err)}°; old knee unchanged ${same}`); a.destroy(); b.destroy(); }
  // R8.e conservative: a closed flexion–axial loop does no net work (the flexion reaction is part of −∇U)
  { const { w, P } = mkP({ kneeModel: "v2k" }), k = spec.joints.findIndex(j => j.name === "knee_R"), at = (f, th) => P.compute(posedBodies(spec, { hip_L: { abd: 8 }, hip_R: { abd: 8 }, knee_R: { flex: f, rot: th } }).map(x => ({ ...x, v: [0, 0, 0], w: [0, 0, 0] })), 1 / 240);
    let W = 0, Wabs = 0, u0 = at(5, K.kneeTheta0(5) + 18), q0 = u0.ev.qs[k], t0 = u0.joints[k].tau; const N = 800;
    for (let n = 1; n <= N; n++) { const tt = 2 * Math.PI * n / N, f = 20 - 15 * Math.cos(tt), u1 = at(f, K.kneeTheta0(f) + 18 * Math.cos(tt) + 4 * Math.sin(tt)), q1 = u1.ev.qs[k], t1 = u1.joints[k].tau;
      let dq = Q.mul(Q.conj(q0), q1); if (dq[3] < 0) dq = dq.map(x => -x); const sv = Math.hypot(dq[0], dq[1], dq[2]), ang = 2 * Math.atan2(sv, dq[3]); for (let i = 0; i < 3; i++) { const dw = 0.5 * (t0[i] + t1[i]) * (sv > 0 ? dq[i] / sv * ang : 0); W += dw; Wabs += Math.abs(dw); } q0 = q1; t0 = t1; }
    check("R8.e", "v2k: closed flexion–axial loop through the end range does no net passive work", Math.abs(W) <= 1e-3 + 5e-3 * Wabs, `∮τ·dq ${e(W)} J (∮|τ·dq| ${Wabs.toFixed(3)} J)`); w.destroy(); }
  // R8.f sensitivity overrides are local: an override changes only its own parameter; the frozen central set is untouched
  { const o = K.kneeV2KParams({ deep: { delta150: 5 } }), d = K.kneeTheta0(150, o) - K.kneeTheta0(150), d120 = K.kneeTheta0(120, o) - K.kneeTheta0(120);
    check("R8.f", "v2k sensitivity override (deep δ150 = +5°) shifts θ0(150°) by 5° and nothing below 120°; the frozen set is unchanged", Math.abs(d - 5) < 1e-12 && Math.abs(d120) < 1e-12 && K.KNEE_V2K.deep.delta150 === 0 && Object.isFrozen(K.KNEE_V2K), `Δθ0(150) ${d}, Δθ0(120) ${d120}`); } }
// R9 close-decisions stage: the ankle-stiffness override used by the browser equivalence checks is inert by default and fully reversible
{ const envK = process.env.V2_ANKLE_NEUTRAL_K, base = ankleNeutralKPerDeg();
  check("R9.a", "ankle-stiffness override absent by default: k = the env value, else the spec default", envK != null && envK !== "" ? base === +envK : base === PASSIVE_SPEC.ankleAxialNeutralKPerDeg, `k ${base}`);
  setAnkleNeutralKOverride(0.13); const kOn = ankleNeutralKPerDeg(); setAnkleNeutralKOverride(null); const kOff = ankleNeutralKPerDeg();
  check("R9.b", "the override sets k exactly and clearing it restores the previous value", kOn === 0.13 && kOff === base, `on ${kOn}, cleared ${kOff}`); }
const fail = results.filter(r => !r.pass).length; console.log(`\ncomponent regressions: ${results.length - fail}/${results.length} pass`);
const jo = process.argv.find(a => a.startsWith("--json=")); if (jo) fs.writeFileSync(jo.slice(7), JSON.stringify({ generated: "tools/v2_component_regressions.mjs", date: new Date().toISOString().slice(0, 10), results }, null, 1));
process.exit(fail ? 1 : 0);

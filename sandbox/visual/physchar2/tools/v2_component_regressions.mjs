// ═══ physchar2/tools/v2_component_regressions.mjs — PERMANENT component regressions for the three controller-symmetry corrections
// (user decision 2026-10-04, sources/2026-10-04_user_decision_option1_controller_symmetry.md). Never remove; run before any G2 / G3 / G4 validation.
//   R1 usable foot regions (§1): the boot geometry is mirror-identical; the canonical hull / inset region of the right boot is the exact mirror of
//      the left one (every body variant); the region area is preserved vs the former construction (no CoP-area loss); construction is deterministic.
//   R2 quaternion handling (§3): every Jolt-sourced orientation is unit length (‖q‖² − 1 ≤ 1e-15: a correctly rounded 4-term norm); normalisation removes only numerical error (no material orientation
//      change); mirrored states give exactly corresponding L/R joint axes; no NaN / degenerate behaviour near identity or 180°; deterministic.
//   R3 leg-IK mirror-equivariance (§2): the production legIK, on real and reach-boundary problems of several morphologies, and on their exact mirror
//      images (other leg): identical reachability classification, mirrored solutions (reachable ≤ 1e-12 m, unreachable ≤ 1e-6 m), reachable
//      targets solved to ≤ 1e-12, unreachable ones reported (residual > 1e-6), the target never moved.
// usage: node tools/v2_component_regressions.mjs [--json=<out>]     exit code 1 on any failure
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt, unitQ } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G2Sim } from "../gates/v2_g2.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { STAND, insetPoly } from "../ctrl/v2_stand.js";
import { bootSole, hull2, hull2Canonical } from "../sim/v2_geom.js"; import { pyr, decompose } from "../spec/v2_joints.js"; import { V, Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), results = [];
const check = (id, name, pass, value) => { results.push({ id, name, pass: !!pass, value }); console.log(`${pass ? "PASS" : "FAIL"} ${id.padEnd(6)} ${name}: ${value}`); };
const m3 = (p) => [-p[0], p[1], p[2]], mq = (q) => [q[0], -q[1], -q[2], q[3]], mw = (w) => [w[0], -w[1], -w[2]], e = (x) => (+x).toExponential(2);
const lr = (n) => (n.endsWith("_L") ? n.slice(0, -2) + "_R" : n.endsWith("_R") ? n.slice(0, -2) + "_L" : n);
const area = (P) => { let A = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; A += p[0] * q[1] - q[0] * p[1]; } return A / 2; };
const cen = (P) => { let A = 0, x = 0, z = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length], c = p[0] * q[1] - q[0] * p[1]; A += c; x += (p[0] + q[0]) * c; z += (p[1] + q[1]) * c; } return [x / (3 * A), z / (3 * A)]; };
const segD = (p, a, b) => { const ex = b[0] - a[0], ez = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ez) / (ex * ex + ez * ez))); return Math.hypot(p[0] - a[0] - t * ex, p[1] - a[1] - t * ez); };
const haus = (P, R) => Math.max(...P.map(p => Math.min(...R.map((a, i) => segD(p, a, R[(i + 1) % R.length])))), ...R.map(p => Math.min(...P.map((a, i) => segD(p, a, P[(i + 1) % P.length])))));
// ── R1 usable foot regions ──
{ let ptMis = 0, vtxMis = 0, cntMis = 0, regH = 0, regA = 0, regC = 0, areaChange = Infinity, areaGain = 0, notch = 0, outside = 0, legacyH = 0, det = true;
  for (const h of VARIATION_SET) { const spec = generateSpec(h), B = spec.bodies, fL = B.find(b => b.name === "foot_L"), fR = B.find(b => b.name === "foot_R"), sL = bootSole(fL), sR = bootSole(fR);
    for (const p of sL.pts) ptMis = Math.max(ptMis, Math.min(...sR.pts.map(q => Math.hypot(p[0] + q[0], p[1] - q[1], p[2] - q[2]))));
    const cL = hull2Canonical(sL.pts), cR = hull2Canonical(sR.pts), cRm = cR.map(([x, z]) => [-x, z]); if (cL.length !== cR.length) cntMis++;
    for (const p of cL) vtxMis = Math.max(vtxMis, Math.min(...cRm.map(q => Math.hypot(p[0] - q[0], p[1] - q[1]))));
    const rL = insetPoly(cL, STAND.footInset), rRm = insetPoly(cR, STAND.footInset).map(([x, z]) => [-x, z]).reverse();
    regH = Math.max(regH, haus(rL, rRm)); regA = Math.max(regA, Math.abs(area(rL) - area(rRm)) / area(rL)); const a = cen(rL), b = cen(rRm); regC = Math.max(regC, Math.hypot(a[0] - b[0], a[1] - b[1]));
    for (const s of [sL, sR]) { const old = insetPoly(hull2(s.pts), STAND.footInset), nw = insetPoly(hull2Canonical(s.pts), STAND.footInset); areaChange = Math.min(areaChange, (area(nw) - area(old)) / area(old)); areaGain = Math.max(areaGain, (area(nw) - area(old)) / area(old));
      const dir = (A, Bp) => Math.max(...A.map(p => Math.min(...Bp.map((a, i) => segD(p, a, Bp[(i + 1) % Bp.length]))))); notch = Math.max(notch, dir(old, nw)); outside = Math.max(outside, dir(nw, old)); }
    legacyH = Math.max(legacyH, haus(insetPoly(hull2(sL.pts), STAND.footInset), insetPoly(hull2(sR.pts), STAND.footInset).map(([x, z]) => [-x, z]).reverse()));
    if (JSON.stringify(hull2Canonical(sL.pts)) !== JSON.stringify(cL)) det = false; }
  check("R1.a", "boot sole geometry mirror-identical L vs R (all 8 bodies)", ptMis === 0, `max point mismatch ${e(ptMis)} m`);
  check("R1.b", "canonical hulls are mirror images (vertex count, vertices)", cntMis === 0 && vtxMis <= 1e-15, `count mismatches ${cntMis}, max vertex mismatch ${e(vtxMis)} m`);
  check("R1.c", "usable regions are mirror images (boundary, area, centroid)", regH <= 1e-12 && regA <= 1e-12 && regC <= 1e-12, `Hausdorff ${e(regH)} m, area ${e(regA)} rel, centroid ${e(regC)} m  (former construction: Hausdorff ${e(legacyH)} m)`);
  // the former regions carried radial-inset notches at exactly collinear sole points (kept by hull2 depending on rounding); the canonical region is
  // the same convex footprint inset without them, so it CONTAINS the former region (every canonical vertex lies on the former boundary)
  check("R1.d", "no CoP-area loss: the corrected region contains the former one", areaChange >= -1e-12 && outside <= 1e-12, `area change ${(areaChange * 100).toFixed(3)} … +${(areaGain * 100).toFixed(3)} %; former notches filled ≤ ${(notch * 1000).toFixed(3)} mm; corrected boundary outside the former by ≤ ${e(outside)} m`);
  check("R1.e", "deterministic construction", det, det ? "bit-identical" : "differs"); }
// ── R2 quaternion handling ──
{ let maxN = 0, maxDir = 0, nan = 0; const special = [[0, 0, 0, 1], [1e-12, 0, 0, 1], [0, 0, 0, -1], [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 1e-12], [0.70710678, 0, 0, 0.70710678], [0.5, 0.5, 0.5, 0.5]];
  let s = 12345; const rnd = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 4294967296; };
  const sample = []; for (let i = 0; i < 20000; i++) { let q = [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]; const l = Math.hypot(...q); q = q.map(v => v / l); const d = 1 + (rnd() - 0.5) * 6e-7; sample.push(q.map(v => v * Math.sqrt(d))); }
  for (const q of [...special.map(q => { const l = Math.hypot(...q); return q.map(v => v / l * (1 + 1e-7)); }), ...sample]) { const u = unitQ(...q); if (u.some(v => !Number.isFinite(v))) nan++;
    maxN = Math.max(maxN, Math.abs(u[0] * u[0] + u[1] * u[1] + u[2] * u[2] + u[3] * u[3] - 1)); const l = Math.hypot(...q), r = q.map(v => v / l); maxDir = Math.max(maxDir, Math.max(...r.map((v, i) => Math.abs(v - u[i])))); }
  let threw = false; try { unitQ(0, 0, 0, 0); } catch (err) { threw = true; }
  check("R2.a", "unitQ: unit length, direction unchanged, no NaN (incl. identity / 180° / 90°)", maxN <= 1e-15 && maxDir <= 4.5e-16 && nan === 0 && threw, `‖u‖² − 1 ≤ ${e(maxN)}, direction change ≤ ${e(maxDir)}, NaN ${nan}, degenerate input throws: ${threw}`);
  // a real run: every orientation read from Jolt is unit; the orientation change is numerical only; mirrored states give exactly corresponding axes
  const spec = generateSpec(VARIATION_SET.find(h => h.id === "V2-REF")), sim = new G3Sim(J, spec, g3Def("T5"), {}), map = spec.bodies.map(b => spec.bodies.findIndex(x => x.name === lr(b.name)));
  let readN = 0, rawN = 0, rotChange = 0, sigma = 0, ticks = 0, again = true;
  for (let t = 0; t < 720 && sim.tick(); t++) { if (t % 30) continue; ticks++;
    for (let i = 0; i < sim.st.length; i++) { const q = sim.st[i].rot; readN = Math.max(readN, Math.abs(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3] - 1));
      const r = sim.w.bodies[i].GetRotation(), raw = [r.GetX(), r.GetY(), r.GetZ(), r.GetW()]; rawN = Math.max(rawN, Math.abs(raw.reduce((a, v) => a + v * v, 0) - 1));
      for (const v of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) rotChange = Math.max(rotChange, V.len(V.sub(Q.rot(raw, v), Q.rot(q, v)))); }
    const stM = map.map(i => ({ ...sim.st[i], rot: mq(sim.st[i].rot) }));
    for (const d of sim.P.jd) { const k2 = sim.P.jd.find(x => x.k === spec.joints.findIndex(j => j.name === lr(spec.joints[d.k].name))); const aA = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(v => Q.rot(Q.mul(sim.st[d.child].rot, d.F2), v)), aB = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(v => Q.rot(Q.mul(stM[k2.child].rot, k2.F2), v));
      for (let i = 0; i < 3; i++) sigma = Math.max(sigma, Math.abs(Math.abs(V.dot(mw(aA[i]), aB[i])) - 1)); }
    const st2 = sim.read(); if (JSON.stringify(st2.map(b => b.rot)) !== JSON.stringify(sim.st.map(b => b.rot))) again = false; }
  sim.destroy();
  check("R2.b", "every Jolt-sourced orientation is unit after the boundary normalisation", readN <= 1e-15, `‖q‖² − 1 ≤ ${e(readN)} over ${ticks} states (raw Jolt: ${e(rawN)})`);
  check("R2.c", "no material orientation change (numerical error only)", rotChange <= 1e-6, `max |Q.rot(raw) − Q.rot(normalised)| ${e(rotChange)} (unit-length basis vectors)`);
  check("R2.d", "mirrored states: exact L/R joint-axis correspondence", sigma <= 1e-14, `max ||σ| − 1| ${e(sigma)}`);
  check("R2.e", "deterministic (re-reading the same state)", again, again ? "bit-identical" : "differs"); }
// ── R3 leg-IK mirror-equivariance ──
{ let n = 0, reach = 0, unre = 0, clsMis = 0, mirR = 0, mirU = 0, errR = 0, unreachReported = true, moved = 0;
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
        const cA = chain(sim.P, A.x, { ...b, foot: footA }, ev), cB = chain(sim.P, B.x, { n: 1 - b.n, pP: m3(b.pP), qP: mq(b.qP) }, evM), d = Math.max(V.len(V.sub(cA.ps, m3(cB.ps))), V.len(V.sub(cA.pf, m3(cB.pf))));
        n++; const rA = A.err <= 1e-6, rB = B.err <= 1e-6; if (rA !== rB) clsMis++;
        if (t.s == null || t.s <= 0.999) { reach++; mirR = Math.max(mirR, d); errR = Math.max(errR, A.err, B.err); } else { unre++; mirU = Math.max(mirU, d); if (rA || rB) unreachReported = false; } } }
    sim.destroy(); }
  check("R3.a", "IK: identical reachability classification for every mirrored problem pair", clsMis === 0, `${clsMis} mismatches over ${n} pairs (3 bodies)`);
  check("R3.b", "IK: reachable targets solved and mirrored (≤ 1e-12 residual, ≤ 1e-12 m)", errR <= 1e-12 && mirR <= 1e-12, `${reach} pairs: residual ≤ ${e(errR)}, mirror Δ ≤ ${e(mirR)} m`);
  check("R3.c", "IK: unreachable targets reported unreachable, optima mirrored (≤ 1e-6 m)", unreachReported && mirU <= 1e-6, `${unre} pairs: all reported (residual > 1e-6): ${unreachReported}; mirror Δ ≤ ${e(mirU)} m`);
  check("R3.d", "IK: the target is never modified", moved === 0, `${moved} modified`); }
const fail = results.filter(r => !r.pass).length; console.log(`\ncomponent regressions: ${results.length - fail}/${results.length} pass`);
const jo = process.argv.find(a => a.startsWith("--json=")); if (jo) fs.writeFileSync(jo.slice(7), JSON.stringify({ generated: "tools/v2_component_regressions.mjs", date: new Date().toISOString().slice(0, 10), results }, null, 1));
process.exit(fail ? 1 : 0);

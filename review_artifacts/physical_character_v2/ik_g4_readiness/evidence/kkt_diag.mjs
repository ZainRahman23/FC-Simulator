import path from "path"; import { loadJolt } from "./core/v2_jolt.js"; import { generateSpec } from "./spec/v2_spec.js"; import { VARIATION_SET } from "./spec/v2_human.js";
import { G3Sim, g3Def } from "./gates/v2_g3.js"; import { IK } from "./ctrl/v2_stand.js"; import { V, Q } from "./core/v2_math.js";
const J = await loadJolt(path.resolve("vendor/jolt-physics.wasm-compat.js")), D = Math.PI / 180;
for (const id of ["V2-REF", "V2-short-legs", "V2-198-92"]) { const spec = generateSpec(VARIATION_SET.find(h => h.id === id));
  for (const [key, T, leg] of [["U:R", 8.0, 0], ["T5", 6.0, 0]]) { const s = new G3Sim(J, spec, g3Def(key), {}), orig = s.ctrl.legIK.bind(s.ctrl); let want = false, cap = null;
    s.ctrl.legIK = (st, ev, nn, pP, qP, fp) => { if (want && nn === leg && !cap) cap = { st: st.map(b => ({ ...b })), pP: pP.slice(), qP: qP.slice(), foot: fp }; return orig(st, ev, nn, pP, qP, fp); };
    while (s.n * s.dt < T - 1e-9 && s.tick()); want = true; s.tick(); s.ctrl.legIK = orig; const ctrl = s.ctrl;
    const lim = ctrl.legK[leg].map(k => spec.joints[k].limits.hard), lo = [lim[0].lo[0], lim[0].lo[1], lim[0].lo[2], lim[1].lo[1], lim[2].lo[1], lim[2].lo[2]], hi = [lim[0].hi[0], lim[0].hi[1], lim[0].hi[2], lim[1].hi[1], lim[2].hi[1], lim[2].hi[2]];
    const inside = (x) => x.every((v, i) => v >= lo[i] && v <= hi[i]), ev = s.P.compute(cap.st, s.dt).ev;
    const ft0 = cap.foot || cap.st[ctrl.feet[leg]], fw = Q.rot(cap.st[ctrl.feet[1 - leg]].rot, [0, 0, 1]), hd = V.norm([fw[0], 0, fw[2]]), out = V.sc([hd[2], 0, -hd[0]], leg === 0 ? -1 : 1);
    const kktOf = (foot, x) => { const F = ctrl.legChain(cap.st, ev, leg, cap.pP, cap.qP, foot), r = F.fk(x), g = F.jac(x).map(col => col.reduce((a, v, i) => a + v * r[i], 0)); return Math.max(...g.map((gi, i) => (x[i] <= lo[i] ? Math.max(0, -gi) : x[i] >= hi[i] ? Math.max(0, gi) : Math.abs(gi)))); };
    for (const hgt of [0, 0.05]) for (const [f, l] of [[0.15, 0], [0.30, 0], [0.45, 0], [0, 0.10], [0, 0.20], [0, -0.08], [0.30, 0.10]]) for (const yaw of [0, 30, -30, 45, -45]) {
      const pos = V.add(V.add(V.add(ft0.pos, V.sc(hd, f)), V.sc(out, l)), [0, hgt, 0]), rot = Q.norm(Q.mul(Q.axis([0, 1, 0], (leg === 0 ? -1 : 1) * yaw * D), ft0.rot)), foot = { pos, rot };
      const B = ctrl.legIKBounded(cap.st, ev, leg, cap.pP, cap.qP, foot); if (B.err <= 1e-6) continue;
      IK.maxItBounded = 500; const B2 = ctrl.legIKBounded(cap.st, ev, leg, cap.pP, cap.qP, foot); IK.maxItBounded = 30;
      console.log(`${id} ${key} h${hgt} f${f} l${l} y${yaw}: it ${B.it} err ${B.err.toExponential(4)} kkt ${kktOf(foot, B.x).toExponential(2)} atB ${B.atBound.map(b => +b).join("")} | it500: ${B2.it} err ${B2.err.toExponential(4)} kkt ${kktOf(foot, B2.x).toExponential(2)} atB ${B2.atBound.map(b => +b).join("")} Δx ${Math.max(...B.x.map((v, i) => Math.abs(v - B2.x[i]))).toExponential(2)}`); }
    s.destroy(); } }

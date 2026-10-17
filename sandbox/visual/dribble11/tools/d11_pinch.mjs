// dribble11/tools/d11_pinch.mjs — PINCHED-BALL STRESS: random wedges of the real boot / toe hulls and the shin capsule against a ball on the turf
// (positions, orientations, closing velocities, spins far beyond dribbling), stepped (a) by the bare BALL-FEEL-1.3 kernel (it fails closed: throws)
// and (b) through DRIBBLE-1.1's kernelStep (restore the exact prior state, the wedging leg yields). Reports throws, recoveries (hold / clear),
// unrecovered steps, non-finite states, and the ball's lowest centre height.  usage: node d11_pinch.mjs [samples 3000] [out.json]
import fs from "fs"; import { makeSim } from "./d11_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js"; import { fromTurn1Frame } from "../../ballphys1/adapter.js";
const [nArg = "3000", outFile] = process.argv.slice(2), R = 0.11; let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648, rr = (a, b) => a + (b - a) * rnd();
const qn = (q) => { const l = Math.hypot(...q); return q.map((x) => x / l); };
const host = makeSim(get("STRAIGHT_RUN"), { seed: 1, opts: { record: false } }), J = host.J, B = host.ballCfg, pid = host.pid;
const mk = (id, shapes, mat) => fromTurn1Frame({ id, time: 0, position: [0, 1, 0], rotation: [0, 0, 0, 1], linearVelocity: [0, 0, 0], angularVelocity: [0, 0, 0], shapes, material: mat });
const cols = () => [mk(pid + ":boot_R", [{ type: "hull", points: J.sides.R.boot.points }], "boot"), mk(pid + ":toe_R", [{ type: "hull", points: J.sides.R.toe.points }], "boot"), mk(pid + ":shin_R", [{ type: "capsule", r: J.sides.R.shin.r, half: J.sides.R.shin.half, pos: J.sides.R.shin.pos }], "body")];
const res = { bare: { samples: 0, threw: 0, messages: {} }, recovered: { samples: 0, unrecoveredSteps: 0, hold: 0, clear: 0, nonFinite: 0, minBallHeight: Infinity } };
for (const mode of ["bare", "recovered"]) { seed = 12345;
  for (let s = 0; s < +nArg; s++) {
    const W = new B.World(Object.assign({}, B.options, { p: [0, R, 0], v: [rr(-3, 3), 0, rr(-3, 3)], dt: 1 / 240, substeps: 1, parameters: B.parameters, colliders: cols() }));
    const p0 = [rr(-0.25, 0.25), rr(0.05, 0.35), rr(-0.25, 0.25)], v = [rr(-6, 6), rr(-6, 1), rr(-6, 6)], q = qn([rr(-1, 1), rr(-1, 1), rr(-1, 1), rr(-1, 1)]), w = [rr(-20, 20), rr(-20, 20), rr(-20, 20)];
    const sim = { W, pid, yields: [], fault: null }; Object.setPrototypeOf(sim, Object.getPrototypeOf(host)); res[mode].samples++;
    try { for (let i = 0; i < 40; i++) { const p = [p0[0] + v[0] * i / 240, Math.max(0.0, p0[1] + v[1] * i / 240), p0[2] + v[2] * i / 240];
        for (const id of [pid + ":boot_R", pid + ":toe_R"]) W.setColliderFrame(id, { p, q, v, w }); W.setColliderFrame(pid + ":shin_R", { p: [p[0], p[1] + 0.25, p[2]], q, v, w });
        if (mode === "bare") W.step(); else if (!sim.kernelStep(i)) { res.recovered.unrecoveredSteps++; break; }
        if (mode === "recovered") res.recovered.minBallHeight = Math.min(res.recovered.minBallHeight, W.ball.p[1]); }
      if (mode === "recovered" && ![...W.ball.p, ...W.ball.v, ...W.ball.w].every(Number.isFinite)) res.recovered.nonFinite++; }
    catch (e) { if (mode === "bare") { res.bare.threw++; const m = String(e.message).replace(/: \S+$/, ""); res.bare.messages[m] = (res.bare.messages[m] || 0) + 1; } else throw e; }
    if (mode === "recovered") for (const y of sim.yields) res.recovered[y.how]++; } }
console.log(JSON.stringify(res)); if (outFile) fs.writeFileSync(outFile, JSON.stringify(res, null, 1));

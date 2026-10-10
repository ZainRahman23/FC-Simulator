// read-only diagnostic: the REV2 AST-1 stand-in drive vs its authoritative path (rx_miss, k47, stand-in far: no contact), per step
import path from "path";
const W = process.env.PCV2, ROOT = W + "/review_artifacts/physical_character_v2", P2 = W + "/sandbox/visual/physchar2/";
const M = await import(ROOT + "/pi1/rev1/scripts/pcg_rev1.mjs"); const { V, Q, loadAir, NB, B, Z0 } = M.L; const SIM = await import(ROOT + "/pi1/rev2/scripts/pi1_rev2_sim.mjs"), { loadJolt } = await import(P2 + "core/v2_jolt.js"), { pi1RunnerSpec } = await import(P2 + "spec/v2_pi1_runner.js");
const J = await loadJolt(P2 + "vendor/jolt-physics.wasm-compat.js"); const R = loadAir(ROOT + "/promotion_carrier/evidence/records/on_rx", "rx_miss_LOCO.json.gz"); const sim2r = (p) => [p[0], p[2], -p[1]];
const kp = 47, mapper = M.makeMapper(R, { knee: "RK", rf1: true }), S0 = mapper.poseAt(kp).S, off = [Math.round(S0[0].pos[0]), 0, Math.round(S0[0].pos[2])], FAR = [0, 0, 500];
const samples = (tau) => { const k = Math.min(R.prims.length - 1, Math.max(0, Math.ceil(tau - 1e-9) - 1)), n = Math.max(1, Math.min(4, Math.round((tau - k) * 4))), o = {}; for (const p of R.prims[k][n - 1]) o[p.prim] = { a: V.add(V.sub(sim2r(p.a), off), FAR), b: V.add(V.sub(sim2r(p.b), off), FAR), r: p.r }; return o; };
const rootAt = (tau) => { const k = Math.max(1, Math.ceil(tau - 1e-9) - 1), w = tau - k, a = R.rows[k - 1], b = R.rows[Math.min(R.rows.length - 1, k)], lp = (i) => a[i] + (b[i] - a[i]) * w; return { pos: V.sub([lp(8), 0, -lp(9)], off), vel: [lp(10), 0, -lp(11)], facing: lp(12) }; };
const hS = S0.map(s => ({ pos: V.sub(s.pos, off), rot: s.rot.slice() })), hV = S0.map(() => ({ v: [0, 0, 0], w: [0, 0, 0] }));
const sim = new SIM.PI1Sim(J, pi1RunnerSpec(), { S: hS, vel: hV }, { tauP: kp + 1, rootAt, fallTau: null, samples, mT: 78, legFrac: 0.2365, isLeg: (n) => n === "LEG" || n === "THIGH" }, { seconds: 0.3, Ipel: [8, 2, 8] });
const si = sim.standIn; for (let s = 0; s < 24; s++) { const tau = sim.tauP + sim.n / 4; sim.tick(); const t1 = tau + 0.25, row = [];
  for (const g of si.segs) { const b = g.body, c = b.GetCenterOfMassPosition(), v = b.GetLinearVelocity(), au = si.poseAt(g, t1), aum = si.poseAt(g, t1 - 0.25), vau = V.sc(V.sub(au.com, aum.com), 240), lt = g.con.GetTotalLambdaMotorTranslation();
    row.push(g.name + " Δcom_z " + ((c.GetZ() - au.com[2]) * 1000).toFixed(3) + "mm Δv_z " + ((v.GetZ() - vau[2]) * 1000).toFixed(2) + "mm/s F_ff_z " + g.pre.F[2].toFixed(1) + " tether_z " + (lt.GetZ() * 240).toFixed(1) + "N"); }
  console.log(t1.toFixed(2), row.join(" | ")); }

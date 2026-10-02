import { J, body, G2 } from "./lib.mjs"; import fs from "fs";
const JDM = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/";
const models = Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fs.readFileSync(JDM + "mU1_tau" + t + ".json", "utf8"))]));
const B = { kind: "U", vd: 0.5, from: 1, ramp: { a: 0.3 }, place: "maps", uRefSim: false, lat: { rho: 0.4 }, adapt: null, reachIter: false, models };
const out = {};
for (const [first, at, k] of [["L", 0.6, 12], ["R", 0.5, 5]]) { const n = Math.max(16, k + 4), steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  const { spec, poses } = body("F0"); let LOCO = null; const base = G2.TESTS_G2W.G2W_A8.loco.rhythm.walk;
  const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at, walk: { swingBase: { w: "model", learn: { rate: 0.05 }, pure: [0] }, ctrl: { ...base.ctrl, ...B } } }, onLoco: l => { LOCO = l; } });
  const P = LOCO.planner, D = P.exec.done.filter(d => d.kind === "rhythmic"), h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], d = D.find(e => e.stepIndex === k), prev = D.find(e => e.stepIndex === k - 1);
  const ps = d.pSt, rel = (p) => (p[0] - ps[0]) * hd[0] + (p[1] - ps[1]) * hd[1], t0 = prev.td.t, t1 = d.td.t, st = d.sw === "R" ? "L" : "R";
  const rows = r.recs.filter(q => q.t >= t0 && q.t <= t1).map(q => { const cs = q.copSmooth, F = q.feet[st]; return [q.t - t0, rel(q.xi), rel([q.com[0], q.com[2]]), cs ? rel(cs.length === 3 ? [cs[0], cs[2]] : cs) : null, q.vcom[0] * hd[0] + q.vcom[2] * hd[1], F.sole && F.sole.length ? Math.min(...F.sole.map(p => rel([p[0], p[2]]))) : null, F.sole && F.sole.length ? Math.max(...F.sole.map(p => rel([p[0], p[2]]))) : null]; });
  out[`${first}${at}_k${k}`] = { rows, tStart: d.tSw0 - t0, tLift: d.liftoff.t - t0, tTd: t1 - t0 }; }
fs.writeFileSync(process.argv[2], JSON.stringify(out)); console.log("ok");

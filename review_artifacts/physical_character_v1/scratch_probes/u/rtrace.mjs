import { J, body, G2, M } from "../fg/lib.mjs"; import fsM from "fs";
const JDM = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/"; const withModels = (c) => c.modelsPrefix ? { ...c, models: Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fsM.readFileSync(JDM + c.modelsPrefix + t + ".json", "utf8"))])) } : c;
const ctrl = JSON.parse(process.argv[2]), walkX = JSON.parse(process.argv[3] || "{}"), K = +(process.argv[4] || 3);
const { spec, poses } = body("F0"), bi = (n) => spec.bodies.findIndex(b => b.name === n), first = "R", at = 0.5, n = 10, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
let LOCO = null; const base = G2.TESTS_G2W.G2W_A8.loco.rhythm.walk, TR = [];
const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at, walk: { ...walkX, ctrl: withModels({ ...base.ctrl, ...ctrl }) } },
  onLoco: l => { LOCO = l; const f = l.planner.exec.refSwing; l.planner.exec.refSwing = (R, t, o, nv) => { const out = f(R, t, o, nv); if (!nv && R.stepIndex === K) TR.push({ n: l.nStep, t, tgt: R.proj.target.slice(), landC: R.landC ? R.landC.slice() : null, pos: out.pos, u: out.u, reach: out.reach }); return out; }; } });
const P = LOCO.planner, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], d = P.exec.done.find(e => e.stepIndex === K), ps = d.pSt, F = (p) => (p[0] - ps[0]) * hd[0] + (p[p.length === 3 ? 2 : 1] - ps[1]) * hd[1];
console.log(`step ${K}: tSw0 ${d.tSw0.toFixed(3)} td ${d.td.t.toFixed(3)} uAt ${d.td.uAt.toFixed(2)} achieved ${F(d.td.center).toFixed(3)} final target ${F(d.proj.target).toFixed(3)}`);
const cm = new Map(TR.map(e => [e.n, e]));
for (const q of r.recs.filter(q => q.t >= d.tSw0 && q.t <= d.td.t + 0.02 && q.n % 6 === 0)) { const e = cm.get(q.n); if (!e) continue; const fp = q.states[bi("foot_" + d.sw)].pos;
  console.log(`  ${(q.t - d.tSw0).toFixed(3)} u ${e.u.toFixed(2)} | target ${F(e.tgt).toFixed(3)} landC ${e.landC ? F(e.landC).toFixed(3) : "-"} landing-pose ${F(e.reach).toFixed(3)} | cmd foot ${F(e.pos).toFixed(3)} actual ${F(fp).toFixed(3)} y ${(fp[1] * 100).toFixed(1)}`); }

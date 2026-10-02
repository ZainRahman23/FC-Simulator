import { J, body, G2, M } from "../fg/lib.mjs"; import fsM from "fs";
const JDM = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/"; const withModels = (c) => c.modelsPrefix ? { ...c, models: Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fsM.readFileSync(JDM + c.modelsPrefix + t + ".json", "utf8"))])) } : c; const { Q } = M;
const ctrl = JSON.parse(process.argv[2]), walkX = JSON.parse(process.argv[3] || "{}");
const { spec, poses } = body("F0"), first = "R", at = 0.5, n = 10, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
let LOCO = null; const base = G2.TESTS_G2W.G2W_A8.loco.rhythm.walk;
const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at, walk: { ...walkX, ctrl: withModels({ ...base.ctrl, ...ctrl }) } }, onLoco: l => { LOCO = l; } });
const P = LOCO.planner, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], rt = [hd[1], -hd[0]], D = P.exec.done.filter(d => d.kind === "rhythmic"), tF = (r.recs.find(q => q.com[1] < 0.75) || { t: 1e9 }).t;
const yaw = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]) * 57.3; };
console.log("h0", (h0 * 57.3).toFixed(1), "deg | per step at its start: stance centre (fwd, lat), ξ (fwd, lat), COM lat, pelvis yaw − h0, target dl (signed lat of the target rel stance)");
for (const d of D) { if (d.tSw0 > tF) break; const q = r.recs.find(q2 => q2.t >= d.tSw0 - 1e-9), F = (p) => [p[0] * hd[0] + p[1] * hd[1], p[0] * rt[0] + p[1] * rt[1]];
  const ps = F(d.pSt), xi = F(q.xi), c = F([q.com[0], q.com[2]]), tg = d.proj && d.proj.target ? F(d.proj.target) : null, ach = d.td ? F(d.td.center) : null;
  console.log(`k${d.stepIndex} ${d.sw} t ${d.tSw0.toFixed(2)} | stance ${ps[0].toFixed(3)} ${ps[1].toFixed(3)} | ξ ${xi[0].toFixed(3)} ${xi[1].toFixed(3)} (rel ${(xi[1] - ps[1]).toFixed(3)}) | com lat ${(c[1] - ps[1]).toFixed(3)} | yaw ${(yaw(q.states[0].rot) - h0 * 57.3).toFixed(1)} | target lat rel ${tg ? (tg[1] - ps[1]).toFixed(3) : "-"} achieved ${ach ? (ach[1] - ps[1]).toFixed(3) : "-"}`); }

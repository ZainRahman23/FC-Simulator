// per step under a configuration: touchdown capture point (view at the executor's touchdown), achieved foothold, e, the following double support
// (duration, why it ended), next start x' — and the trailing-leg extension at touchdown
import { J, body, G2, M } from "../fg/lib.mjs"; import fsM from "fs";
const JDM = "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/"; const withModels = (c) => c.modelsPrefix ? { ...c, models: Object.fromEntries([0, 0.1, 0.15, 0.2, 0.25].map(t => [t, JSON.parse(fsM.readFileSync(JDM + c.modelsPrefix + t + ".json", "utf8"))])) } : c; import fs from "fs";
const ctrl = JSON.parse(process.argv[2] || '{"kind":"U","vd":0.5}'), walkX = JSON.parse(process.argv[3] || "{}"), out = process.argv[4];
const { spec, poses } = body("F0"), bi = (n) => spec.bodies.findIndex(b => b.name === n), rows = [];
for (const [first, at] of [["R", 0.5], ["R", 0.55], ["R", 0.6], ["L", 0.5], ["L", 0.55], ["L", 0.6]]) {
  const n = 16, steps = Array.from({ length: n }, (_, i) => ({ sw: (i % 2 === 0) === (first === "R") ? "R" : "L", ...(i === 0 ? { fwdK: 0.7 } : i === 1 ? { fwdK: 0.9 } : {}) }));
  let LOCO = null; const base = G2.TESTS_G2W.G2W_A8.loco.rhythm.walk;
  const r = G2.runG2a(J, spec, "G2W_A8", { poses, keepStates: true, seconds: 1.6 + n * 0.6, rhythmOver: { steps, at, walk: { ...walkX, ctrl: withModels({ ...base.ctrl, ...ctrl }) } }, onLoco: l => { LOCO = l; } });
  const P = LOCO.planner, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], tF = (r.recs.find(q => q.com[1] < 0.75) || { t: 1e9 }).t, D = P.exec.done.filter(d => d.kind === "rhythmic");
  const at_ = (t) => r.recs.find(q => q.t >= t - 1e-9), fw = (a, b) => (a[0] - b[0]) * hd[0] + (a[1] - b[1]) * hd[1];
  for (let j = 0; j + 1 < D.length; j++) { const d = D[j], nx = D[j + 1]; if (!d.td || !nx.tSw0 || nx.tSw0 > tF - 0.1) continue;
    const q = at_(d.td.t), qn = at_(nx.tSw0), ext = (qq, s) => { const h = qq.states[bi("thigh_" + s)].pos, f = qq.states[bi("foot_" + s)].pos; return Math.hypot(h[0] - f[0], h[1] - f[1], h[2] - f[2]) / 0.9243; };
    rows.push({ start: first + at, k: d.stepIndex, xiTd: fw(d.td.xi, d.pSt), u: fw(d.td.center, d.pSt), e: fw(d.td.xi, d.td.center), Tds: nx.tSw0 - d.td.t, xN: fw(qn.xi, nx.pSt), vTd: q.vcom[0] * hd[0] + q.vcom[2] * hd[1], vN: qn.vcom[0] * hd[0] + qn.vcom[2] * hd[1], trailTd: ext(q, d.st), trailN: ext(qn, d.st), T: d.walkK.Tss, Tact: d.td.t - d.tSw0 }); } }
fs.writeFileSync(out, JSON.stringify(rows)); console.log("rows", rows.length);

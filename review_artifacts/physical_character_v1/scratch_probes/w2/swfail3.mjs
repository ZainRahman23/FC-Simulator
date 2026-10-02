import fs from "fs"; import { f3, W, spec, M, bi, C, J, poses } from "./lib.mjs";
const { Q, V } = M; const D = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), run = D.runs.find(r => r.i === +process.argv[3]), K = +process.argv[4], box = spec.bodies[bi("foot_R")].shapes[0];
const INNER = { kXiAlong: -1, kXiAcross: -1, kXiDS: -1, dsLead: true, dsFlat: false, ...(D.walk || {}), ...JSON.parse(process.argv[5] || '{}') }; let LOCO = null;
const G2 = await import(process.env.PC + "/pc_gateg2.js").catch(() => null);
const res = C.runChar(J, spec, poses, { speed: 0.6, n: 5, walkOver: INNER, humanOver: D.human || {}, steps: run.steps, push: run.push, seconds: 1.6 + 5 * 0.6, series: false });
// rerun through runG2a for the full recs (runChar returns the analysis only): replicate its options
const { CHAR_BASE } = C; const base = CHAR_BASE(0.6, INNER), steps = []; for (let i = 0; i < 5; i++) { const sw = i % 2 === 0 ? "R" : "L"; steps.push(i === 0 ? { sw, fwdK: 0.7 } : i === 1 ? { sw, fwdK: 0.9 } : { sw }); }
const GG = await import("/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/sandbox/visual/physchar/pc_gateg2.js");
const r = GG.runG2a(J, spec, "G2b_walk08", { poses, keepStates: true, seconds: 1.6 + 5 * 0.6, rhythmOver: { walk: { ...base.walk, char: run.steps }, steps, at: 0.5 }, humanOver: { ...base.human, ...(D.human || {}) }, onLoco: (l) => { LOCO = l; } });
console.log("hash", r.hash === run.hash ? "same" : "DIFF", "extEnded", LOCO.planner.rhythm.extEnded || 0);
const d = LOCO.planner.exec.done.find(x => x.kind === "rhythmic" && x.stepIndex === K) || LOCO.planner.exec.R, s = d.sw, st = s === "R" ? "L" : "R", fb = bi("foot_" + s), tb = bi("thigh_" + s);
console.log("step", K, s, "status", d.status, d.fail || "", "tSw0", f3(d.tSw0), "lift", d.liftoff && f3(d.liftoff.t), "td", d.td && f3(d.td.t));
for (const q of r.recs.filter(q => q.t >= d.tSw0 - 0.1 && q.t <= d.tSw0 + 0.45 && Math.round(q.t * 240) % 6 === 0)) { const S = q.states, F = q.feet[s];
  const pts = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) pts.push(V.add(S[fb].pos, Q.rot(S[fb].rot, [box.pos[0] + sx * box.he[0], box.pos[1] - box.he[1], box.pos[2] + sz * box.he[2]])));
  const toe = Math.min(pts[1][1], pts[3][1]), heel = Math.min(pts[0][1], pts[2][1]), th = S[tb].pos, an = S[fb].pos, ext = Math.hypot(th[0] - an[0], th[1] - an[1], th[2] - an[2]) / 0.927;
  console.log(`t ${f3(q.t, 3)} ${q.rhythm.stage}/${q.exec ? q.exec.stage : "-"} swing-foot load ${f3(F.load / W, 2)} touching ${F.touching} heel ${f3(heel * 100, 1)} toe ${f3(toe * 100, 1)} cm | leg ext ${f3(ext, 3)} | stance load ${f3(q.feet[st].load / W, 2)} trailExt(plan) ${f3(LOCO.planner.rhythm.trailExt, 3)} | COM vF ${f3(q.vcom[2], 2)} y ${f3(q.com[1], 3)}`); }

// dribble15/tools/d15_chrome_node.mjs — the Node half of d15_chrome.cjs: one scenario (HIGH, B, seed 1, as the lab page) → the compact record on stdout
import { makeSim } from "./d15_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js";
const [id, ver = "d15"] = process.argv.slice(2), S = makeSim(get(id), { ver, seed: 1, opts: { record: true, recViewer: false } }); S.run(); const r = S.rec;
process.stdout.write(JSON.stringify({ dec: { touches: S.touches.map((t) => [t.k, t.F, t.reg, !!t.launched, t.cancelled || null]), turn: (S.turnLog || []).map((e) => [e.k, e.kind, e.by || null]), ctrl: S.ctrl.changes.map((c) => [c.k, c.to]) },
  state: r.map((q) => [q.ball.p[0], q.ball.p[1], q.ball.p[2], q.ball.v[0], q.ball.v[1], q.ball.v[2], q.P[0], q.P[1], q.psi]), fault: S.fault || null }));

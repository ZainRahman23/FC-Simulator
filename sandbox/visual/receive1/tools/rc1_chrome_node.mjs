// receive1/tools/rc1_chrome_node.mjs — the Node side of rc1_chrome.cjs: one receive case, the same compact record the lab page returns
import { makeReceive } from "./rc1_env.mjs"; import { parseCase } from "../rc1_cases.js";
const [id, seed = "1"] = process.argv.slice(2), cs = parseCase(id), S = makeReceive(cs.scenario, { seed: +seed, opts: { record: true, recViewer: true } }); S.run();
const r = S.rec; process.stdout.write(JSON.stringify({ dec: { touches: S.touches.map((t) => [t.k, t.F, t.reg, !!t.launched, t.cancelled || null]), turn: (S.turnLog || []).map((e) => [e.k, e.kind, e.by || null]), ctrl: S.ctrl.changes.map((c) => [c.k, c.to]), first: S.rc.first ? [S.rc.first.k, S.rc.first.F, S.rc.first.reg] : null },
  state: r.map((q) => [q.ball.p[0], q.ball.p[1], q.ball.p[2], q.ball.v[0], q.ball.v[1], q.ball.v[2], q.P[0], q.P[1], q.psi]) }));

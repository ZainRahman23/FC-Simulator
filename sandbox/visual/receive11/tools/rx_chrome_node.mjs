// receive11/tools/rx_chrome_node.mjs — the Node side of rx_chrome.cjs: one receive case (animation on, as the page), the same compact record
import { makeReceive } from "./rx_env.mjs"; import { parseCase, seedCase } from "../rx_cases.js";
const [id, seed = "1"] = process.argv.slice(2), cs = seedCase(parseCase(id), +seed), S = makeReceive(cs, { seed: +seed, anim: true, opts: { record: true, recViewer: true } }); S.run();
const r = S.rec, a = S.rx.act, c = S.rx.contact; process.stdout.write(JSON.stringify({ dec: { touches: S.touches.map((t) => [t.k, t.F, t.reg, !!t.launched, t.cancelled || null]), ctrl: S.ctrl.changes.map((x) => [x.k, x.to]), action: a ? [a.fam.id, a.F, a.sg, a.surface, a.kc, a.kh] : null, exec: c ? [c.ex.dirErrDeg, c.ex.speedErr] : null, handoff: S.rx.handoff ? S.rx.handoff.k : null },
  state: r.map((q) => [q.ball.p[0], q.ball.p[1], q.ball.p[2], q.ball.v[0], q.ball.v[1], q.ball.v[2], q.P[0], q.P[1], q.psi]) }));

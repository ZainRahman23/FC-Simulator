// receive_control2/tools/rc2_mirror.mjs — LEFT / RIGHT MIRROR of the integrated pipeline: a two-footed receiver (weak foot 5) at RECEIVE-KILL's stance,
// the same frontal pass, exit +θ and −θ: the resolver's family, the mirrored contact foot, the receive and rejoin launches, the TURN-1.2 switch and
// the DRIBBLE-V1 run that follows must be mirror images about the pass line (pitch y = 34): ball and receiver every tick.   node rc2_mirror.mjs <out.json>
import fs from "fs"; import { makeReceive2, DT, PROFILES } from "./rc2_env.mjs"; import { makeCase, CASES } from "../rc2_cases.js";
const out = { pairs: 0, sameAction: 0, mirrorFoot: 0, exactToHandoff: 0, exactAll: 0, maxDevToHandoff: 0, maxDevAll: 0, rows: [] }, Y0 = 34;
const player = Object.assign({}, PROFILES.HIGH, { weak_foot: 5 });
for (const th of [30, 60, 90, 120, 135, 150, 180]) for (const bc of [50, 99]) for (const sd of [1, 2]) {
  const base = CASES.find((c) => c.id === "D"), mk = (t) => { const c = makeCase(Object.assign({}, base, { exit: { turn: t, v: 5.5, intent: "go" } }), { bc }); c.scenario.dur = 4.5; return c; };
  const a = makeReceive2(mk(th), { seed: sd, player }), b = makeReceive2(mk(-th), { seed: sd, player }); a.run(4.5); b.run(4.5); out.pairs++;
  const sa = a.summary2(), sb = b.summary2(); if (sa.cls.action === sb.cls.action) out.sameAction++; if (sa.foot && sb.foot && sa.foot !== sb.foot) out.mirrorFoot++;
  const kH = a.rx.handoff && a.rx.handoff.kDribble != null ? a.rx.handoff.kDribble : a.rec.length - 1; let dH = 0, dA = 0;
  for (let k = 0; k < Math.min(a.rec.length, b.rec.length); k++) { const ra = a.rec[k], rb = b.rec[k], d = Math.max(Math.abs(ra.ball.p[0] - rb.ball.p[0]), Math.abs((ra.ball.p[2] - Y0) + (rb.ball.p[2] - Y0)), Math.abs(ra.P[0] - rb.P[0]), Math.abs((ra.P[1] - Y0) + (rb.P[1] - Y0)));
    dA = Math.max(dA, d); if (k <= kH) dH = Math.max(dH, d); }
  out.maxDevToHandoff = Math.max(out.maxDevToHandoff, dH); out.maxDevAll = Math.max(out.maxDevAll, dA); if (dH < 1e-9) out.exactToHandoff++; if (dA < 1e-9) out.exactAll++;
  out.rows.push({ th, bc, sd, action: sa.cls.action, feet: [sa.foot, sb.foot], devToHandoff: dH, devAll: dA, outcomes: [a.ctrl.state, b.ctrl.state] }); }
fs.writeFileSync(process.argv[2] || "rc2_mirror.json", JSON.stringify(out, null, 1)); const { rows, ...sum } = out; console.log(JSON.stringify(sum));

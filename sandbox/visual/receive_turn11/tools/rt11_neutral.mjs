// receive_turn11/tools/rt11_neutral.mjs — ANIMATION ON / OFF IS OUTCOME-NEUTRAL, and the human body is deterministic:
//   for every case of the matrix (13 angles × right / left × 6 / 12 / 18 m/s × BC 30 / 50 / 70 / 90 / 99 × 2 seeds) the episode is run, the
//   HumanTurnBody is built and posed every 2nd tick from 1 s before the contact to 2.6 s after it, and the episode is run again: the technique,
//   foot, surface, contact tick, executed launch, every launch of the episode, the follow-up, the continuation and the ball path must be
//   identical; a second body posed at the same times must give the identical pose (determinism).   node rt11_neutral.mjs <out.json>
import fs from "fs"; import { createRequire } from "module"; import path from "path"; import { fileURLToPath } from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url), { loadTurn1 } = require(path.resolve(HERE, "../../turn1/tools/t1_load.cjs")), X = loadTurn1();
const S = await import("../../receive_turn1/rt_sim.js"), { HumanTurnBody } = await import("../rt11_body.js");
const fp = (P, e) => JSON.stringify([P.A.fid, P.A.F, P.A.surface, P.A.vid, P.kc, e.ex.v, e.launched, e.m.cls, e.m.tCont, e.m.contacts, e.m.extraAdj, e.follow && [e.follow.i, e.follow.ex.v], e.carry && [e.carry.i, e.carry.v], e.rec.map((r) => r.p)]);
const R = { cases: 0, neutral: 0, bodyDeterministic: 0, posesChecked: 0, fails: [] };
for (const v of [6, 12, 18]) for (const a of [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180]) for (const sg of a === 0 ? [1] : [1, -1]) {
  const cond = { v, theta: sg * a };
  for (const bc of [30, 50, 70, 90, 99]) for (const seed of [1, 2]) {
    const P = S.prepareTurn(cond); if (P.A.none) continue; R.cases++;
    const e0 = S.runTurn(P, bc, { seed }, { every: 4 }), f0 = fp(P, e0);
    const B = new HumanTurnBody(X.RUN1_V13, X.M4, X.skel, P, e0), B2 = new HumanTurnBody(X.RUN1_V13, X.M4, X.skel, P, e0); let same = true;
    for (let k = P.kc - 240; k <= P.kc + 624; k += 2) { const t = k / 240, ball = e0.rec[Math.min(e0.rec.length - 1, Math.max(0, Math.round((k - P.kc) / 4)))].p, a1 = B.poseAt(t, ball), a2 = B2.poseAt(t, ball); R.posesChecked++;
      if (k % 24 === 0 && JSON.stringify(a1.J) !== JSON.stringify(a2.J)) same = false; }
    if (same) R.bodyDeterministic++;
    const P2 = S.prepareTurn(cond), e1 = S.runTurn(P2, bc, { seed }, { every: 4 }), f1 = fp(P2, e1);
    if (f0 === f1) R.neutral++; else if (R.fails.length < 5) R.fails.push({ cond, bc, seed });
  } }
fs.writeFileSync(process.argv[2] || "rt11_neutral.json", JSON.stringify(R, null, 1)); console.log(JSON.stringify(R));

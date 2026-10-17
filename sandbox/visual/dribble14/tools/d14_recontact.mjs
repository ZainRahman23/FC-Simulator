// dribble14/tools/d14_recontact.mjs — SAME-FOOT RE-CONTACT DIAGNOSIS: for every launched touch, the follow-through the planner modelled at the commit
// (the touching foot's boot / toe hulls per tick, the free ball after the executed launch) against what happened: the actual boot / toe colliders
// (their kernel frames) and the actual ball, tick by tick for 60 ticks — the model / actual gaps, the hull position errors, the ball error, and, for
// touches followed by a same-foot contact within 250 ms, where the model and reality part. usage: node d14_recontact.mjs SCENARIO seeds [ver d12]
import { makeSim, DT, CORES } from "./d14_env.mjs"; import { get } from "../../dribble1/d1_scenarios.js"; import { distance } from "../../ballphys1/geometry.js";
const [id = "CUT60L_RUN", nA = "8", ver = "d14"] = process.argv.slice(2), K = (a) => [a[0], a[1], -a[2]], R = 0.11;
for (let sd = 1; sd <= +nA; sd++) {
  const S = makeSim(get(id), { ver, seed: sd, opts: { record: false, diagFT: true } }), act = new Map();
  const step0 = S.step.bind(S);
  S.step = function () { step0(); const k = S.k, W = S.W;
    for (const T of S.touches) { if (!T.launched || !T.ftDiag || k - T.k < 1 || k - T.k > 60) continue; const F = T.F, cB = W.colliders.find((c) => c.id === `${S.pid}:boot_${F}`), cT = W.colliders.find((c) => c.id === `${S.pid}:toe_${F}`);
      (T.act = T.act || []).push({ k, ball: K(W.ball.p), gB: distance(cB, W.ball.p, W.time).d - R, gT: distance(cT, W.ball.p, W.time).d - R, pB: K(cB.p), pT: K(cT.p) }); } };
  S.run();
  for (const T of S.touches) { if (!T.launched || !T.ftDiag || !T.act) continue;
    const same = S.contacts.filter((c) => c.own && c.k > T.k && c.k - T.k <= 60 && (c.part === "boot_" + T.F || c.part === "toe_" + T.F));
    if (!same.length) continue;
    const tr = S.simLaunch(T.ftDiag.ball, T.ftDiag.vL, 61), rows = new Map(T.ftDiag.rows.map((r) => [r.k, r]));
    console.log(`seed ${sd} touch ${T.t.toFixed(3)} ${T.F} ${T.reg} hull ${T.hull} executed ${T.executed.speed.toFixed(2)} · same-foot contacts at +${same.map((c) => ((c.k - T.k) * 1000 * DT).toFixed(0) + "ms " + c.part).join(", ")}`);
    for (const a of T.act.slice(0, 14)) { const r = rows.get(a.k - 1), dt = a.k - T.k, bm = tr[dt - 1] ? tr[dt - 1].p : null;   // (the collider frame read after step k is the pose of tick k − 1, swept to tick k)
      const eB = r ? Math.hypot(...[0, 1, 2].map((i) => a.pB[i] - r.ank[i])) : null, eBall = bm ? Math.hypot(...[0, 1, 2].map((i) => a.ball[i] - bm[i])) : null;
      console.log(`   +${dt} actual gap boot ${(a.gB * 1000).toFixed(1)} toe ${(a.gT * 1000).toFixed(1)} mm · model foot err ${eB != null ? (eB * 1000).toFixed(1) : "-"} mm · ball err ${eBall != null ? (eBall * 1000).toFixed(1) : "-"} mm`); } }
}
